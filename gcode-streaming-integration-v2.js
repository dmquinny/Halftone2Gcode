/**
 * G-code Streaming Integration v2
 * Uses the separate streaming function for Tauri desktop app
 */

async function generateGcodeWithStreaming() {
    if (!currentHalftoneData) {
        alert('Please generate a halftone preview first.');
        return false;
    }

    // Debug: Check what's available
    console.log('=== Tauri Debug Info ===');
    console.log('window.__TAURI__:', typeof window.__TAURI__, window.__TAURI__);
    console.log('window.__TAURI_INTERNALS__:', typeof window.__TAURI_INTERNALS__);
    console.log('generateGcodeStreaming:', typeof generateGcodeStreaming);

    // Check if Tauri is available
    if (!window.__TAURI__) {
        const msg = 'Streaming is only available in the desktop app.\n\n' +
                    'Debug Info:\n' +
                    '- window.__TAURI__: ' + (typeof window.__TAURI__) + '\n' +
                    '- This appears to be running in a browser\n\n' +
                    'Please run the built .exe file from:\n' +
                    'src-tauri\\target\\release\\halftone-converter.exe';
        alert(msg);
        console.error('Tauri not detected');
        return false;
    }

    // Check if streaming function is loaded
    if (typeof generateGcodeStreaming !== 'function') {
        alert('Streaming function not loaded. Please refresh the app.');
        return false;
    }

    try {
        // Get file save location from user
        const defaultFilename = (filenameInput?.value || 'halftone') + (fileTypeSelect?.value || '.nc');

        const filePath = await window.__TAURI__.dialog.save({
            defaultPath: defaultFilename,
            filters: [{
                name: 'G-code Files',
                extensions: ['nc', 'gcode', 'tap', 'txt']
            }]
        });

        if (!filePath) {
            return true; // User cancelled
        }

        // Update UI
        gcodeOutput.value = 'Generating G-code (streaming to file)...';
        gcodeInfo.textContent = 'Writing...';
        gcodeInfo.style.color = '#5B9BD5';
        gcodeProgress.textContent = '0';
        gcodeProgress.style.display = 'inline';
        timeEstimate.textContent = '';
        generateGcodeButton.disabled = true;

        // Gather all parameters
        const maxDepth = parseFloat(maxDepthInput.value);
        const safeHeight = parseFloat(safeHeightInput.value);
        const cuttingFeedRate = parseFloat(cuttingFeedRateInput.value);
        const plungeFeedRate = parseFloat(plungeFeedRateInput.value);
        const vbitAngle = parseFloat(vbitAngleSelect.value);
        const workZero = workZeroSelect.value;
        const spindleSpeed = parseFloat(spindleSpeedInput.value);
        const toolChange = toolChangeToggle.checked;
        const vbitToolNumber = parseInt(vbitToolNumberInput.value);
        const boundaryToolNumber = parseInt(boundaryToolNumberInput.value);
        const boundaryToolSize = parseFloat(boundaryToolSizeInput.value);
        const materialThickness = parseFloat(materialThicknessInput.value);
        const boundaryPassDepth = parseFloat(boundaryPassDepthInput.value);
        const multiPassCount = parseInt(multiPassCountInput.value);
        const ramping = rampingToggle.checked;
        const rampDistance = parseFloat(rampDistanceInput.value);
        const boundary = boundaryToggle.checked;
        const includeBoundaryInGcode = includeBoundaryInGcodeToggle.checked;
        const includeLineNumbers = lineNumbersToggle.checked;
        const optimizeToolpathEnabled = optimizeToolpathToggle.checked;
        const bidirectional = bidirectionalToggle.checked;
        const borderCuttingFeedRate = parseFloat(borderCuttingFeedRateInput.value) || cuttingFeedRate;
        const plotterMode = plotterModeToggle.checked;
        const plotterLineWidthMethodValue = document.getElementById('plotterLineWidthMethod')?.value || 'pressure';
        const plotterPressureMin = parseFloat(plotterPressureMinInput.value);
        const plotterPressureMax = parseFloat(plotterPressureMaxInput.value);
        const plotterPenWidth = parseFloat(plotterPenWidthInput.value);
        const plotterLineWidthLight = parseFloat(plotterLineWidthLightInput.value);
        const plotterLineWidthHeavy = parseFloat(plotterLineWidthHeavyInput.value);

        // Create streamer
        const streamer = new GcodeStreamer();
        await streamer.start(filePath);

        // Call streaming G-code generator
        const result = await generateGcodeStreaming(
            currentHalftoneData,
            maxDepth,
            safeHeight,
            cuttingFeedRate,
            plungeFeedRate,
            vbitAngle,
            workZero,
            spindleSpeed,
            toolChange,
            vbitToolNumber,
            boundaryToolNumber,
            boundaryToolSize,
            materialThickness,
            boundaryPassDepth,
            multiPassCount,
            ramping,
            rampDistance,
            boundary,
            includeBoundaryInGcode,
            includeLineNumbers,
            optimizeToolpathEnabled,
            bidirectional,
            borderCuttingFeedRate,
            plotterMode,
            plotterLineWidthMethodValue,
            plotterPressureMin,
            plotterPressureMax,
            plotterPenWidth,
            plotterLineWidthLight,
            plotterLineWidthHeavy,
            streamer  // Pass streamer as last parameter
        );

        // Finish streaming
        await streamer.finish();

        // Show summary and preview controls
        const gcodeOut = document.getElementById('gcodeOutput');
        const summary = `✅ G-code successfully saved to:\n${filePath}\n\n` +
                       `${result.lineCount.toLocaleString()} lines generated\n` +
                       `${result.totalDistance.toFixed(1)}mm total distance\n` +
                       `File size: ${(result.lineCount * 43 / 1024 / 1024).toFixed(1)}MB\n\n` +
                       `Use the controls below to preview specific lines.`;

        if (gcodeOut) gcodeOut.value = summary;

        // Store file info globally for preview
        window.currentGcodeFile = {
            path: filePath,
            totalLines: result.lineCount
        };

        // Create preview controls
        const gcodeScrollContent = document.getElementById('gcodeScrollContent');
        if (gcodeScrollContent) {
            gcodeScrollContent.innerHTML = `
                <div style="padding: 20px;">
                    <div style="margin-bottom: 15px; color: #28a745; font-weight: bold;">
                        ✅ File saved successfully
                    </div>
                    <div style="margin-bottom: 15px; color: #666;">
                        Total lines: ${result.lineCount.toLocaleString()}
                    </div>
                    <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 15px;">
                        <label>Start line:</label>
                        <input type="number" id="previewStartLine" value="0" min="0" max="${result.lineCount - 1}"
                               style="width: 100px; padding: 5px;">
                        <label>Lines to show:</label>
                        <input type="number" id="previewLineCount" value="1000" min="1" max="10000"
                               style="width: 100px; padding: 5px;">
                        <button id="loadPreviewBtn" style="padding: 5px 15px; cursor: pointer;">
                            Load Preview
                        </button>
                    </div>
                    <div style="margin-bottom: 10px; color: #666; font-size: 0.9em;">
                        Quick jump:
                        <button onclick="document.getElementById('previewStartLine').value = 0; document.getElementById('loadPreviewBtn').click();"
                                style="padding: 3px 10px; margin: 0 5px; cursor: pointer;">Start</button>
                        <button onclick="document.getElementById('previewStartLine').value = Math.floor(${result.lineCount} / 2); document.getElementById('loadPreviewBtn').click();"
                                style="padding: 3px 10px; margin: 0 5px; cursor: pointer;">Middle</button>
                        <button onclick="document.getElementById('previewStartLine').value = Math.max(0, ${result.lineCount} - 1000); document.getElementById('loadPreviewBtn').click();"
                                style="padding: 3px 10px; margin: 0 5px; cursor: pointer;">End</button>
                    </div>
                    <div id="previewStatus" style="margin-bottom: 10px; color: #666; font-size: 0.9em;"></div>
                    <div id="previewContent" style="font-family: monospace; white-space: pre; overflow: auto; max-height: 400px; background: #f5f5f5; padding: 10px; border: 1px solid #ddd;">
                        Click "Load Preview" to view G-code lines
                    </div>
                </div>
            `;

            // Add event listener for load button
            const loadBtn = document.getElementById('loadPreviewBtn');
            if (loadBtn) {
                loadBtn.addEventListener('click', loadGcodePreview);
            }
        }

        gcodeInfo.textContent = `${result.totalDistance.toFixed(1)}mm distance • ${result.lineCount} lines • ${result.rapidMoveCount || 0} rapid moves`;
        gcodeInfo.style.color = '#28a745';
        gcodeProgress.style.display = 'none';

        if (result.estimatedTime) {
            const minutes = Math.floor(result.estimatedTime / 60);
            const seconds = Math.round(result.estimatedTime % 60);
            timeEstimate.textContent = `Est. time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
        }

        // Don't enable download button - file is already saved
        const downloadBtn = document.getElementById('downloadButton');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.title = 'File already saved to disk';
        }

        const clearBtn = document.getElementById('clearGcodeButton');
        if (clearBtn) clearBtn.disabled = false;

        const genBtn = document.getElementById('generateGcodeButton');
        if (genBtn) genBtn.disabled = false;

        alert(`✅ Success!\n\nG-code saved to:\n${filePath}\n\n${result.lineCount} lines generated`);

        return true;

    } catch (error) {
        console.error('Streaming G-code error:', error);

        const gcodeOut = document.getElementById('gcodeOutput');
        if (gcodeOut) gcodeOut.value = 'Error generating G-code: ' + error.message;

        const gcodeInf = document.getElementById('gcodeInfo');
        if (gcodeInf) {
            gcodeInf.textContent = 'Error';
            gcodeInf.style.color = '#dc3545';
        }

        const gcodeProg = document.getElementById('gcodeProgress');
        if (gcodeProg) gcodeProg.style.display = 'none';

        const genBtn = document.getElementById('generateGcodeButton');
        if (genBtn) genBtn.disabled = false;

        alert('Error generating G-code:\n' + error.message);
        return true;
    }
}

// Function to load preview of specific line range
async function loadGcodePreview() {
    if (!window.currentGcodeFile) {
        alert('No G-code file loaded');
        return;
    }

    const startLineInput = document.getElementById('previewStartLine');
    const lineCountInput = document.getElementById('previewLineCount');
    const statusDiv = document.getElementById('previewStatus');
    const contentDiv = document.getElementById('previewContent');

    if (!startLineInput || !lineCountInput || !contentDiv) return;

    const startLine = parseInt(startLineInput.value);
    const lineCount = parseInt(lineCountInput.value);

    // Validate inputs
    if (isNaN(startLine) || startLine < 0 || startLine >= window.currentGcodeFile.totalLines) {
        alert(`Start line must be between 0 and ${window.currentGcodeFile.totalLines - 1}`);
        return;
    }

    if (isNaN(lineCount) || lineCount < 1 || lineCount > 10000) {
        alert('Line count must be between 1 and 10000');
        return;
    }

    try {
        if (statusDiv) statusDiv.textContent = 'Loading...';
        contentDiv.textContent = 'Loading...';

        const invoke = window.__TAURI_INTERNALS__.invoke;
        const lines = await invoke('read_gcode_lines', {
            filePath: window.currentGcodeFile.path,
            startLine: startLine,
            lineCount: lineCount
        });

        // Add line numbers to display
        const linesArray = lines.split('\n');
        const numberedLines = linesArray.map((line, idx) => {
            const lineNum = startLine + idx;
            return `${lineNum.toString().padStart(6, ' ')}: ${line}`;
        }).join('\n');

        contentDiv.textContent = numberedLines;

        const actualLines = linesArray.length;
        const endLine = startLine + actualLines - 1;
        if (statusDiv) {
            statusDiv.textContent = `Showing lines ${startLine.toLocaleString()} - ${endLine.toLocaleString()} (${actualLines.toLocaleString()} lines)`;
        }

    } catch (error) {
        console.error('Failed to load preview:', error);
        contentDiv.textContent = 'Error loading preview: ' + error;
        if (statusDiv) statusDiv.textContent = 'Error';
    }
}

// Export for use
window.generateGcodeWithStreaming = generateGcodeWithStreaming;
window.loadGcodePreview = loadGcodePreview;
