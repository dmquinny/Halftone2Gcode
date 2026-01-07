// G-code Visualizer Controls
// Wire up UI controls to the visualizer

let visualizerLoaded = false;
let pendingGCodeData = null; // Store G-code data if user loads it before initializing visualizer

document.addEventListener('DOMContentLoaded', function() {
    // Don't auto-initialize - wait for user to click load button

    // Add load button handler
    const loadVisualizerButton = document.getElementById('loadVisualizerButton');
    if (loadVisualizerButton) {
        loadVisualizerButton.addEventListener('click', function() {
            if (!visualizerLoaded) {
                loadVisualizerButton.textContent = '⏳ Loading...';
                loadVisualizerButton.disabled = true;

                // Initialize visualizer
                setTimeout(() => {
                    if (typeof initGCodeVisualizer === 'function') {
                        console.log('🎬 Initializing visualizer on demand...');
                        initGCodeVisualizer();
                        visualizerLoaded = true;

                        // Hide load prompt, show controls
                        document.getElementById('vizLoadPrompt').style.display = 'none';
                        document.getElementById('vizControls').style.display = 'block';

                        // If there's pending G-code data, load it now
                        if (pendingGCodeData) {
                            console.log('📊 Loading pending G-code data into visualizer...');
                            if (pendingGCodeData.filePath) {
                                window.gcodeVisualizer.loadGCodeFromFile(
                                    pendingGCodeData.filePath,
                                    pendingGCodeData.imageWidth,
                                    pendingGCodeData.imageHeight,
                                    pendingGCodeData.materialThickness
                                );
                            } else if (pendingGCodeData.gcodeText) {
                                window.gcodeVisualizer.loadGCode(
                                    pendingGCodeData.gcodeText,
                                    pendingGCodeData.imageWidth,
                                    pendingGCodeData.imageHeight,
                                    pendingGCodeData.materialThickness
                                );
                            }
                            pendingGCodeData = null;
                        }
                    }
                }, 100);
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

    if (imageWidth && imageHeight) {
        console.log(`📐 Dimensions: ${imageWidth}mm x ${imageHeight}mm, thickness: ${materialThickness}mm`);
    }

    // Check if visualizer is loaded
    if (window.gcodeVisualizer && visualizerLoaded) {
        console.log('📊 Loading G-code into visualizer...');

        // Use file path if provided (streaming mode), otherwise use text content
        if (filePath) {
            console.log('🗂️ Loading G-code from file path (streaming mode):', filePath);
            window.gcodeVisualizer.loadGCodeFromFile(filePath, imageWidth, imageHeight, materialThickness);
        } else if (gcodeText) {
            console.log('💾 Loading G-code from text content (RAM mode)');
            window.gcodeVisualizer.loadGCode(gcodeText, imageWidth, imageHeight, materialThickness);
        }
    } else {
        // Visualizer not loaded yet - store data for later
        console.log('⏳ Visualizer not loaded yet - storing G-code data for when user loads it');
        pendingGCodeData = {
            gcodeText: gcodeText,
            filePath: filePath,
            imageWidth: imageWidth,
            imageHeight: imageHeight,
            materialThickness: materialThickness
        };
    }
}

// Export for use in other scripts
window.loadGCodeIntoVisualizer = loadGCodeIntoVisualizer;
