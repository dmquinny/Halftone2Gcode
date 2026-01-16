// G-code Visualizer Controls
// Wire up UI controls to the visualizer

let visualizerLoaded = false;
let pendingGCodeData = null; // Store G-code data if user loads it before initializing visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Don't auto-initialize - wait for user to click load button

    // Add load button handler
    const loadVisualizerButton = document.getElementById('loadVisualizerButton');
    if (loadVisualizerButton) {
        loadVisualizerButton.addEventListener('click', async function() {
            if (!visualizerLoaded) {
                // Show loading state
                const vizLoadPrompt = document.getElementById('vizLoadPrompt');
                vizLoadPrompt.innerHTML = `
                    <div style="text-align: center; color: #999;">
                        <div style="margin-bottom: 20px;">
                            <div style="border: 4px solid #444; border-top: 4px solid #5B9BD5; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                            <style>
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            </style>
                        </div>
                        <h3 style="margin: 15px 0 5px 0; font-size: 1.2em; color: #ccc;">Loading 3D Visualizer...</h3>
                        <p style="margin: 0; font-size: 0.9em;">Initializing Three.js scene</p>
                    </div>
                `;

                // Initialize visualizer with a small delay to allow UI to update
                await new Promise(resolve => setTimeout(resolve, 50));

                if (typeof initGCodeVisualizer === 'function') {
                    initGCodeVisualizer();
                    visualizerLoaded = true;

                    // Wait a bit for Three.js to initialize
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // If there's pending G-code data, show processing message
                    if (pendingGCodeData) {
                        // Update loading message for G-code processing
                        vizLoadPrompt.innerHTML = `
                            <div style="text-align: center; color: #999;">
                                <div style="margin-bottom: 20px;">
                                    <div style="border: 4px solid #444; border-top: 4px solid #5B9BD5; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                                    <style>
                                        @keyframes spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                    </style>
                                </div>
                                <h3 style="margin: 15px 0 5px 0; font-size: 1.2em; color: #ccc;">Processing G-code...</h3>
                                <p style="margin: 0; font-size: 0.9em;">Parsing and rendering toolpath</p>
                            </div>
                        `;

                        // Configure plotter mode if stored in pending data
                        if (pendingGCodeData.plotterMode) {
                            window.gcodeVisualizer.setPlotterMode(
                                true,
                                pendingGCodeData.pressureMin,
                                pendingGCodeData.pressureMax
                            );
                        } else {
                            window.gcodeVisualizer.setPlotterMode(false);
                        }

                        // Load the G-code (Three.js canvas is already in the container)
                        if (pendingGCodeData.filePath) {
                            await window.gcodeVisualizer.loadGCodeFromFile(
                                pendingGCodeData.filePath,
                                pendingGCodeData.imageWidth,
                                pendingGCodeData.imageHeight,
                                pendingGCodeData.materialThickness
                            );
                        } else if (pendingGCodeData.gcodeText) {
                            await window.gcodeVisualizer.loadGCode(
                                pendingGCodeData.gcodeText,
                                pendingGCodeData.imageWidth,
                                pendingGCodeData.imageHeight,
                                pendingGCodeData.materialThickness
                            );
                        }

                        pendingGCodeData = null;

                        // Trigger a resize to ensure proper rendering
                        if (window.gcodeVisualizer && window.gcodeVisualizer.onWindowResize) {
                            setTimeout(() => window.gcodeVisualizer.onWindowResize(), 100);
                        }
                    }

                    // Hide load prompt, show controls (after G-code is loaded)
                    vizLoadPrompt.style.display = 'none';
                    document.getElementById('vizControls').style.display = 'block';

                    // Update pressure legend visibility
                    if (typeof updatePressureLegendVisibility === 'function') {
                        updatePressureLegendVisibility();
                    }
                }
            }
        });
    }

    // Tab switching
    const gcodeTextTab = document.getElementById('gcodeTextTab');
    const visualizerTab = document.getElementById('visualizerTab');
    const gcodeTextContent = document.getElementById('gcodeTextContent');
    const visualizerContent = document.getElementById('visualizerContent');

    if (gcodeTextTab && visualizerTab && gcodeTextContent && visualizerContent) {
        gcodeTextTab.addEventListener('click', () => {
            // Update tab button styles
            gcodeTextTab.style.background = '#2d2d2d';
            gcodeTextTab.style.borderBottom = '3px solid #5B9BD5';
            gcodeTextTab.style.color = 'white';
            visualizerTab.style.background = '#1e1e1e';
            visualizerTab.style.borderBottom = '3px solid transparent';
            visualizerTab.style.color = '#999';

            // Show/hide content
            gcodeTextContent.style.display = 'block';
            visualizerContent.style.display = 'none';
        });

        visualizerTab.addEventListener('click', () => {
            // Update tab button styles
            visualizerTab.style.background = '#2d2d2d';
            visualizerTab.style.borderBottom = '3px solid #5B9BD5';
            visualizerTab.style.color = 'white';
            gcodeTextTab.style.background = '#1e1e1e';
            gcodeTextTab.style.borderBottom = '3px solid transparent';
            gcodeTextTab.style.color = '#999';

            // Show/hide content
            visualizerContent.style.display = 'block';
            gcodeTextContent.style.display = 'none';

            // Resize visualizer when tab becomes visible
            if (window.gcodeVisualizer && window.gcodeVisualizer.onWindowResize) {
                setTimeout(() => window.gcodeVisualizer.onWindowResize(), 100);
            }
        });
    }

    // Play button
    const playBtn = document.getElementById('vizPlayButton');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.play();
            }
        });
    }

    // Pause button
    const pauseBtn = document.getElementById('vizPauseButton');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.pause();
            }
        });
    }

    // Reset button
    const resetBtn = document.getElementById('vizResetButton');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.reset();
            }
        });
    }

    // Speed slider
    const speedSlider = document.getElementById('vizSpeedSlider');
    const speedDisplay = document.getElementById('vizSpeedDisplay');
    if (speedSlider && speedDisplay) {
        speedSlider.addEventListener('input', (e) => {
            const speed = parseFloat(e.target.value);
            speedDisplay.textContent = speed.toFixed(1) + 'x';
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.setSpeed(speed);
            }
        });
    }

    // Toggle material block button
    const toggleBlockBtn = document.getElementById('vizToggleBlockButton');
    if (toggleBlockBtn) {
        toggleBlockBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.toggleMaterialBlock();
                // Update button text based on visibility
                if (window.gcodeVisualizer.materialBlock) {
                    const isVisible = window.gcodeVisualizer.materialBlock.visible;
                    toggleBlockBtn.textContent = isVisible ? '🧱 Hide Block' : '🧱 Show Block';
                }
            }
        });
    }

    // Camera view preset buttons
    const cameraTopBtn = document.getElementById('vizCameraTopButton');
    if (cameraTopBtn) {
        cameraTopBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.setCameraTop();
            }
        });
    }

    const cameraFrontBtn = document.getElementById('vizCameraFrontButton');
    if (cameraFrontBtn) {
        cameraFrontBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.setCameraFront();
            }
        });
    }

    const cameraSideBtn = document.getElementById('vizCameraSideButton');
    if (cameraSideBtn) {
        cameraSideBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.setCameraSide();
            }
        });
    }

    const cameraIsoBtn = document.getElementById('vizCameraIsoButton');
    if (cameraIsoBtn) {
        cameraIsoBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.setCameraIsometric();
            }
        });
    }

    // Zoom buttons
    const zoomInBtn = document.getElementById('vizZoomInButton');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.zoomIn();
            }
        });
    }

    const zoomOutBtn = document.getElementById('vizZoomOutButton');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            if (window.gcodeVisualizer) {
                window.gcodeVisualizer.zoomOut();
            }
        });
    }
});

// Function to load G-code into visualizer
function loadGCodeIntoVisualizer(gcodeText = null, filePath = null) {
    // Get image dimensions and material thickness from the UI
    const widthInput = document.getElementById('imageWidth');
    const heightInput = document.getElementById('imageHeight');
    const thicknessInput = document.getElementById('materialThickness');

    const imageWidth = widthInput ? parseFloat(widthInput.value) : null;
    const imageHeight = heightInput ? parseFloat(heightInput.value) : null;
    const materialThickness = thicknessInput ? parseFloat(thicknessInput.value) : null;

    // Get plotter mode settings for pressure visualization
    const plotterModeToggle = document.getElementById('plotterModeToggle');
    const plotterMethod = document.getElementById('plotterLineWidthMethod');
    const isPlotterMode = plotterModeToggle?.checked || false;
    const isPressureMethod = plotterMethod?.value === 'pressure';

    // Get pressure range for visualization
    const pressureMinInput = document.getElementById('plotterPressureMin');
    const pressureMaxInput = document.getElementById('plotterPressureMax');
    const pressureMin = parseFloat(pressureMinInput?.value || 0);
    const pressureMax = parseFloat(pressureMaxInput?.value || -0.5);

    // Check if visualizer is loaded
    if (window.gcodeVisualizer && visualizerLoaded) {
        // Configure plotter mode before loading G-code
        if (isPlotterMode && isPressureMethod) {
            window.gcodeVisualizer.setPlotterMode(true, pressureMin, pressureMax);
        } else {
            window.gcodeVisualizer.setPlotterMode(false);
        }

        // Use file path if provided (streaming mode), otherwise use text content
        if (filePath) {
            window.gcodeVisualizer.loadGCodeFromFile(filePath, imageWidth, imageHeight, materialThickness);
        } else if (gcodeText) {
            window.gcodeVisualizer.loadGCode(gcodeText, imageWidth, imageHeight, materialThickness);
        }

        // Update pressure legend visibility
        if (typeof updatePressureLegendVisibility === 'function') {
            updatePressureLegendVisibility();
        }
    } else {
        // Visualizer not loaded yet - store data for later
        pendingGCodeData = {
            gcodeText: gcodeText,
            filePath: filePath,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            materialThickness: materialThickness,
            plotterMode: isPlotterMode && isPressureMethod,
            pressureMin: pressureMin,
            pressureMax: pressureMax
        };
    }
}

// Export for use in other scripts
window.loadGCodeIntoVisualizer = loadGCodeIntoVisualizer;

// Show/hide pressure legend based on plotter mode
function updatePressureLegendVisibility() {
    const legend = document.getElementById('vizPressureLegend');
    if (!legend) return;

    const plotterModeToggle = document.getElementById('plotterModeToggle');
    const plotterMethod = document.getElementById('plotterLineWidthMethod');
    const isPlotterMode = plotterModeToggle?.checked || false;
    const isPressureMethod = plotterMethod?.value === 'pressure';

    legend.style.display = (isPlotterMode && isPressureMethod && visualizerLoaded) ? 'block' : 'none';
}

// Wire up pressure legend toggle button
document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('vizTogglePressureColors');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            if (window.gcodeVisualizer && typeof window.gcodeVisualizer.togglePressureColors === 'function') {
                const enabled = window.gcodeVisualizer.togglePressureColors();
                toggleBtn.textContent = enabled ? 'Hide Colors' : 'Show Colors';
                toggleBtn.style.background = enabled ? '#607D8B' : '#455A64';
            }
        });
    }

    // Update legend visibility when plotter settings change
    const plotterModeToggle = document.getElementById('plotterModeToggle');
    const plotterMethod = document.getElementById('plotterLineWidthMethod');

    if (plotterModeToggle) {
        plotterModeToggle.addEventListener('change', updatePressureLegendVisibility);
    }
    if (plotterMethod) {
        plotterMethod.addEventListener('change', updatePressureLegendVisibility);
    }
});

// Export for dynamic updates
window.updatePressureLegendVisibility = updatePressureLegendVisibility;
