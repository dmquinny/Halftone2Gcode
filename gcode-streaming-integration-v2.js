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

        // Show summary in output
        const gcodeOut = document.getElementById('gcodeOutput');
        const summary = `File saved successfully!\n\n` +
                       `Lines: ${result.lineCount.toLocaleString()}\n` +
                       `Distance: ${result.totalDistance.toFixed(1)}mm\n` +
                       `File size: ${(result.lineCount * 43 / 1024 / 1024).toFixed(1)}MB\n\n` +
                       `Use controls above to load preview lines.`;

        if (gcodeOut) gcodeOut.value = summary;

        // Store file info globally for preview
        window.currentGcodeFile = {
            path: filePath,
            totalLines: result.lineCount
        };

        // Add preview controls to the G-code info area
        const gcodeInfo = document.getElementById('gcodeInfo');
        if (gcodeInfo) {
            gcodeInfo.innerHTML = `
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <span>${result.totalDistance.toFixed(1)}mm • ${result.lineCount.toLocaleString()} lines</span>
                    <span style="margin: 0 8px;">|</span>
                    <label style="font-size: 0.9em;">Line:</label>
                    <input type="number" id="previewStartLine" value="1" min="1" max="${result.lineCount}"
                           style="width: 80px; padding: 2px 5px; font-size: 0.9em;">
                    <label style="font-size: 0.9em;">Count:</label>
                    <input type="number" id="previewLineCount" value="1000" min="1" max="10000"
                           style="width: 70px; padding: 2px 5px; font-size: 0.9em;">
                    <button id="loadPreviewBtn" style="padding: 3px 10px; font-size: 0.9em; cursor: pointer;">
                        Load
                    </button>
                    <button onclick="document.getElementById('previewStartLine').value = 1; document.getElementById('loadPreviewBtn').click();"
                            style="padding: 2px 8px; font-size: 0.85em; cursor: pointer;">Start</button>
                    <button onclick="document.getElementById('previewStartLine').value = Math.floor(${result.lineCount} / 2); document.getElementById('loadPreviewBtn').click();"
                            style="padding: 2px 8px; font-size: 0.85em; cursor: pointer;">Mid</button>
                    <button onclick="document.getElementById('previewStartLine').value = Math.max(1, ${result.lineCount} - 999); document.getElementById('loadPreviewBtn').click();"
                            style="padding: 2px 8px; font-size: 0.85em; cursor: pointer;">End</button>
                </div>
            `;

            // Add event listener for load button
            const loadBtn = document.getElementById('loadPreviewBtn');
            if (loadBtn) {
                loadBtn.addEventListener('click', loadGcodePreview);
            }
        }

        const gcodeProgress = document.getElementById('gcodeProgress');
        if (gcodeProgress) gcodeProgress.style.display = 'none';

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
    const gcodeOutput = document.getElementById('gcodeOutput');

    if (!startLineInput || !lineCountInput || !gcodeOutput) return;

    const startLine = parseInt(startLineInput.value);
    const lineCount = parseInt(lineCountInput.value);

    // Validate inputs (user sees 1-based, we need 0-based for file reading)
    if (isNaN(startLine) || startLine < 1 || startLine > window.currentGcodeFile.totalLines) {
        alert(`Start line must be between 1 and ${window.currentGcodeFile.totalLines}`);
        return;
    }

    if (isNaN(lineCount) || lineCount < 1 || lineCount > 10000) {
        alert('Line count must be between 1 and 10000');
        return;
    }

    try {
        gcodeOutput.value = 'Loading preview...';

        const invoke = window.__TAURI_INTERNALS__.invoke;
        // Convert from 1-based display to 0-based file reading
        const lines = await invoke('read_gcode_lines', {
            filePath: window.currentGcodeFile.path,
            startLine: startLine - 1,
            lineCount: lineCount
        });

        // Add line numbers to display (show user-friendly 1-based line numbers)
        const linesArray = lines.split('\n');
        const numberedLines = linesArray.map((line, idx) => {
            const lineNum = startLine + idx;
            return `${lineNum.toString().padStart(6, ' ')}: ${line}`;
        }).join('\n');

        const actualLines = linesArray.length;
        const endLine = startLine + actualLines - 1;
        const header = `Showing lines ${startLine.toLocaleString()} - ${endLine.toLocaleString()} (${actualLines.toLocaleString()} lines)\n` +
                      `File: ${window.currentGcodeFile.path}\n` +
                      `${'='.repeat(80)}\n\n`;

        gcodeOutput.value = header + numberedLines;

    } catch (error) {
        console.error('Failed to load preview:', error);
        gcodeOutput.value = 'Error loading preview:\n' + error;
        alert('Failed to load preview: ' + error);
    }
}

// Export for use
window.generateGcodeWithStreaming = generateGcodeWithStreaming;
window.loadGcodePreview = loadGcodePreview;
