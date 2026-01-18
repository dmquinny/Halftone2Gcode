/**
 * G-code Streaming Integration v2
 * Uses the separate streaming function for Tauri desktop app
 */

async function generateGcodeWithStreaming() {
    if (!currentHalftoneData) {
        alert('Please generate a halftone preview first.');
        return false;
    }

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

        // Get UI elements
        const gcodeOutput = document.getElementById('gcodeOutput');
        const gcodeInfo = document.getElementById('gcodeInfo');
        const gcodeProgress = document.getElementById('gcodeProgress');
        const timeEstimate = document.getElementById('timeEstimate');
        const generateGcodeButton = document.getElementById('generateGcodeButton');

        // Update UI - hide textarea completely and hide separate progress counter
        if (gcodeOutput) {
            gcodeOutput.value = 'Generating G-code (streaming to file)...';
            gcodeOutput.style.display = 'none';
        }

        // Extract just the filename from the full path for display
        const filename = filePath.split(/[\\/]/).pop();

        // Store filename globally for progress updates
        window.currentGcodeFilename = filename;

        if (gcodeInfo) {
            gcodeInfo.textContent = `Writing 0 lines of G-code to file "${filename}"`;
            gcodeInfo.style.color = '#5B9BD5';
        }
        if (gcodeProgress) {
            gcodeProgress.style.display = 'none'; // Hide the separate progress counter
        }
        if (timeEstimate) timeEstimate.textContent = '';
        if (generateGcodeButton) generateGcodeButton.disabled = true;

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
        const plotterMode = plotterModeToggle.checked;
        // Multi-pass only applies to cutting mode, not plotter mode
        const multiPassCount = plotterMode ? 1 : parseInt(multiPassCountInput.value);
        const depthPerPass = parseFloat(depthPerPassInput.value);
        const ramping = rampingToggle.checked;
        const rampDistance = parseFloat(rampDistanceInput.value);
        const boundary = boundaryToggle.checked;
        const includeBoundaryInGcode = includeBoundaryInGcodeToggle.checked;
        const includeLineNumbers = lineNumbersToggle.checked;
        const optimizeToolpathEnabled = optimizeToolpathToggle.checked;
        const bidirectional = bidirectionalToggle.checked;
        const borderCuttingFeedRate = parseFloat(borderCuttingFeedRateInput.value) || cuttingFeedRate;
        const plotterLineWidthMethodValue = document.getElementById('plotterLineWidthMethod')?.value || 'pressure';
        const plotterPressureMin = parseFloat(plotterPressureMinInput?.value || 0);
        const plotterPressureMax = parseFloat(plotterPressureMaxInput?.value || -0.5);
        const plotterPenWidth = parseFloat(plotterPenWidthInput?.value || 0.5); // Legacy parameter, not used anymore
        const plotterPenSize = parseFloat(plotterPenSizeInput?.value || 0.5);
        const plotterLineWidthLight = parseFloat(plotterLineWidthLightInput?.value || 0.3);
        const plotterLineWidthHeavy = parseFloat(plotterLineWidthHeavyInput?.value || 1.0);
        const plotterPenLift = parseFloat(document.getElementById('plotterPenLift')?.value || 2);

        // Get advanced plotter calibration settings
        const plotterCalibration = window.getPlotterCalibrationSettings ? window.getPlotterCalibrationSettings() : {
            useMidpoint: false,
            pressureMid: -0.25,
            widthMid: 0.6,
            useRamping: false,
            rampDistance: 2
        };

        // Get file splitting parameters
        const splitFiles = splitFilesToggle?.checked || false;
        const maxLinesPerFile = splitFiles ? parseInt(maxLinesPerFileInput?.value || 50000) : 0;

        // Get output units
        const outputUnits = outputUnitsSelect?.value || 'mm';

        // Get acceleration for time estimation (mm/s²)
        const accelerationInput = document.getElementById('acceleration');
        const acceleration = parseFloat(accelerationInput?.value || 500);

        // Generate header and footer arrays for file splitting
        const headerLines = generateGcodeHeader(
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
            multiPassCount,
            ramping,
            rampDistance,
            boundary,
            plotterMode,
            includeLineNumbers,
            outputUnits
        );

        const footerLines = generateGcodeFooter(safeHeight, plotterMode, outputUnits);

        // Create streamer with splitting support
        const streamer = new GcodeStreamer();
        await streamer.start(filePath, maxLinesPerFile, headerLines, footerLines);

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
            depthPerPass,
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
            plotterPenSize,
            plotterLineWidthLight,
            plotterLineWidthHeavy,
            plotterPenLift,
            plotterCalibration,
            outputUnits,
            acceleration,
            streamer  // Pass streamer as last parameter
        );

        // Finish streaming
        await streamer.finish();

        // Keep textarea hidden
        if (gcodeOutput) {
            gcodeOutput.style.display = 'none';
        }

        // Store file path for Open File button
        window.currentGcodeFile = {
            path: filePath,
            totalLines: result.lineCount
        };

        // Clear any large data structures that might be lingering
        if (window.gcodeData) {
            delete window.gcodeData;
        }

        // Load entire G-code file into Monaco Editor
        // Monaco uses virtual scrolling, so it can handle millions of lines efficiently
        try {
            // Use custom Tauri command to read the file
            const fileContent = await window.__TAURI__.core.invoke('read_gcode_file', {
                filePath: filePath
            });

            if (window.monacoGcode && window.monacoGcode.isLoaded()) {
                window.monacoGcode.display(fileContent);
            }

            // Also load into 3D visualizer using file path (streaming)
            if (typeof window.loadGCodeIntoVisualizer === 'function') {
                window.loadGCodeIntoVisualizer(null, filePath);
            }
        } catch (error) {
            console.error('Failed to load G-code into editor:', error);
        }

        // Add Open File button to the G-code info area
        if (gcodeInfo) {
            gcodeInfo.innerHTML = `
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                    <span>${result.totalDistance.toFixed(1)}mm • ${result.lineCount.toLocaleString()} lines</span>
                    <span style="margin: 0 8px;">|</span>
                    <button id="openFileBtn" style="padding: 5px 15px; font-size: 0.95em; cursor: pointer; background-color: #5B9BD5; color: white; border: none; border-radius: 4px;">
                        Open File
                    </button>
                </div>
            `;

            // Add event listener for Open File button
            const openFileBtn = document.getElementById('openFileBtn');
            if (openFileBtn) {
                openFileBtn.addEventListener('click', async () => {
                    try {
                        const invoke = window.__TAURI_INTERNALS__.invoke;
                        await invoke('open_file_in_editor', {
                            filePath: filePath
                        });
                    } catch (error) {
                        console.error('Failed to open file:', error);
                        alert('Failed to open file: ' + error);
                    }
                });
            }
        }

        if (gcodeProgress) gcodeProgress.style.display = 'none';

        if (result.estimatedTime && timeEstimate) {
            const totalSeconds = Math.round(result.estimatedTime);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            let timeStr = 'Est. time: ';
            if (hours > 0) {
                timeStr += `${hours}hr ${minutes}min`;
            } else if (minutes > 0) {
                timeStr += `${minutes}min ${seconds}s`;
            } else {
                timeStr += `${seconds}s`;
            }
            timeEstimate.textContent = timeStr;
        }

        // Don't enable download button - file is already saved
        const downloadBtn = document.getElementById('downloadButton');
        if (downloadBtn) {
            downloadBtn.disabled = true;
            downloadBtn.title = 'File already saved to disk';
        }

        const clearBtn = document.getElementById('clearGcodeButton');
        if (clearBtn) clearBtn.disabled = false;

        if (generateGcodeButton) generateGcodeButton.disabled = false;

        // Check for depth warning
        if (typeof checkDepthWarning === 'function') {
            checkDepthWarning();
        }

        // Create success message with file information
        let successMessage = '✅ Success!\n\n';

        if (result.fileCount > 1) {
            successMessage += `Generated ${result.fileCount} files:\n`;
            for (let i = 0; i < result.files.length; i++) {
                const fileName = result.files[i].split(/[\\/]/).pop();
                successMessage += `- ${fileName}\n`;
            }
            successMessage += `\nTotal: ${result.lineCount.toLocaleString()} lines`;
        } else {
            successMessage += `G-code saved to:\n${filePath}\n\n${result.lineCount.toLocaleString()} lines generated`;
        }

        alert(successMessage);

        return true;

    } catch (error) {
        console.error('Streaming G-code error:', error);

        if (gcodeOutput) gcodeOutput.value = 'Error generating G-code: ' + error.message;

        if (gcodeInfo) {
            gcodeInfo.textContent = 'Error';
            gcodeInfo.style.color = '#dc3545';
        }

        if (gcodeProgress) gcodeProgress.style.display = 'none';

        if (generateGcodeButton) generateGcodeButton.disabled = false;

        alert('Error generating G-code:\n' + error.message);
        return true;
    }
}

// Export for use
window.generateGcodeWithStreaming = generateGcodeWithStreaming;
