// DOM Elements
const imageInput = document.getElementById('imageInput');
const originalCanvas = document.getElementById('originalCanvas');
const halftoneCanvas = document.getElementById('halftoneCanvas');
const generatePreviewButton = document.getElementById('generatePreviewButton');
const generateGcodeButton = document.getElementById('generateGcodeButton');
const downloadButton = document.getElementById('downloadButton');
const gcodeOutput = document.getElementById('gcodeOutput');
const previewInfo = document.getElementById('previewInfo');
const gcodeInfo = document.getElementById('gcodeInfo');
const timeEstimate = document.getElementById('timeEstimate');
const previewProgress = document.getElementById('previewProgress');
const gcodeProgress = document.getElementById('gcodeProgress');
const themeToggle = document.getElementById('themeToggle');
const saveImagePresetButton = document.getElementById('saveImagePresetButton');
const loadImagePresetButton = document.getElementById('loadImagePresetButton');
const saveCncPresetButton = document.getElementById('saveCncPresetButton');
const loadCncPresetButton = document.getElementById('loadCncPresetButton');
const exportPresetButton = document.getElementById('exportPresetButton');
const importPresetButton = document.getElementById('importPresetButton');
const setDefaultPresetsButton = document.getElementById('setDefaultPresetsButton');
const imageToggle = document.getElementById('imageToggle');
// const previewTitle = document.getElementById('previewTitle'); // Removed
const plotterModeToggle = document.getElementById('plotterModeToggle');

// Controls
const patternTypeSelect = document.getElementById('patternType');
const spacingLabel = document.getElementById('spacingLabel');
const angleInput = document.getElementById('angle');
const angleControl = document.getElementById('angleControl');
const crosshatchAngle2Input = document.getElementById('crosshatchAngle2');
const crosshatchAngle2Group = document.getElementById('crosshatchAngle2-group');
const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const gammaInput = document.getElementById('gamma');
const shadowsInput = document.getElementById('shadows');
const midtonesInput = document.getElementById('midtones');
const highlightsInput = document.getElementById('highlights');
const maxDepthInput = document.getElementById('maxDepth');
const materialThicknessInput = document.getElementById('materialThickness');
const safeHeightInput = document.getElementById('safeHeight');
const spindleSpeedInput = document.getElementById('spindleSpeed');
const cuttingFeedRateInput = document.getElementById('cuttingFeedRate');
const borderCuttingFeedRateInput = document.getElementById('borderCuttingFeedRate');
const plungeFeedRateInput = document.getElementById('plungeFeedRate');
const imageWidthInput = document.getElementById('imageWidth');
const imageHeightInput = document.getElementById('imageHeight');
const lockAspectToggle = document.getElementById('lockAspectToggle');
const borderInput = document.getElementById('border');
const spacingInput = document.getElementById('spacing');
const minSizeInput = document.getElementById('minSize');
const maxSizeInput = document.getElementById('maxSize');
const preBlurInput = document.getElementById('preBlur');
const wavelengthInput = document.getElementById('wavelength');
const amplitudeInput = document.getElementById('amplitude');
const centerOffsetXInput = document.getElementById('centerOffsetX');
const centerOffsetYInput = document.getElementById('centerOffsetY');
const offsetOddLinesToggle = document.getElementById('offsetOddLinesToggle');
const darkBoostToggle = document.getElementById('darkBoostToggle');
const fixedSizesToggle = document.getElementById('fixedSizesToggle');
const outputUnitsSelect = document.getElementById('outputUnits');
const vbitAngleSelect = document.getElementById('vbitAngle');
const livePreviewToggle = document.getElementById('livePreviewToggle');
const workZeroSelect = document.getElementById('workZeroPosition');
const invertToggle = document.getElementById('invertToggle');
const upscaleToggle = document.getElementById('upscaleToggle');
const autoAdjustButton = document.getElementById('autoAdjustButton');
const lineNumbersToggle = document.getElementById('lineNumbersToggle');
const optimizeToolpathToggle = document.getElementById('optimizeToolpathToggle');
const bidirectionalToggle = document.getElementById('bidirectionalToggle');
const splitFilesToggle = document.getElementById('splitFilesToggle');
const maxLinesPerFileInput = document.getElementById('maxLinesPerFile');
const toolChangeToggle = document.getElementById('toolChangeToggle');
const vbitToolNumberInput = document.getElementById('vbitToolNumber');
const vbitToolNumberGroup = document.getElementById('vbitToolNumber-group');
const boundaryToolNumberInput = document.getElementById('boundaryToolNumber');
const boundaryToolNumberGroup = document.getElementById('boundaryToolNumber-group');
const boundaryToolSizeInput = document.getElementById('boundaryToolSize');
const boundaryToolSizeGroup = document.getElementById('boundaryToolSize-group');
const boundaryPassDepthInput = document.getElementById('boundaryPassDepth');
const boundaryPassDepthGroup = document.getElementById('boundaryPassDepth-group');
const rampingToggle = document.getElementById('rampingToggle');
const rampDistanceInput = document.getElementById('rampDistance');
const rampDistanceGroup = document.getElementById('rampDistance-group');
const multiPassCountInput = document.getElementById('multiPassCount');
const depthPerPassInput = document.getElementById('depthPerPass');
const depthPerPassGroup = document.getElementById('depthPerPass-group');
const boundaryToggle = document.getElementById('boundaryToggle');
const includeBoundaryInGcodeToggle = document.getElementById('includeBoundaryInGcodeToggle');
const includeBoundaryInGcodeGroup = document.getElementById('includeBoundaryInGcode-group');
const downloadBoundaryButton = document.getElementById('downloadBoundaryButton');
const filenameInput = document.getElementById('filenameInput');
const fileTypeSelect = document.getElementById('fileTypeSelect');
const endPositionSelect = document.getElementById('endPositionSelect');
const plotterLineWidthMethod = document.getElementById('plotterLineWidthMethod');
const plotterPressureMinInput = document.getElementById('plotterPressureMin');
const plotterPressureMaxInput = document.getElementById('plotterPressureMax');
const plotterPenWidthInput = document.getElementById('plotterPenWidth');
const plotterPenSizeInput = document.getElementById('plotterPenSize');
const plotterLineWidthLightInput = document.getElementById('plotterLineWidthLight');
const plotterLineWidthHeavyInput = document.getElementById('plotterLineWidthHeavy');

let currentImage = null;
let currentBoundaryGcode = null;
let currentHalftoneData = null;
let lastGeneratedHalftoneState = null; // Track halftone state when G-code was generated
let autoUpdateEnabled = false;
let halftoneWorker = null;
let gcodeWorker = null;
let progressiveLines = [];
let progressiveElements = [];
let startTime = 0;

// Worker function definitions (will be stringified and injected into Blob worker)
const resampleImageWorkerCode = function resampleImage(imageData, srcWidth, srcHeight, destWidth, destHeight) {
    const result = new Uint8ClampedArray(destWidth * destHeight * 4);
    const xRatio = srcWidth / destWidth;
    const yRatio = srcHeight / destHeight;
    for (let y = 0; y < destHeight; y++) {
        for (let x = 0; x < destWidth; x++) {
            const srcX = Math.floor(x * xRatio);
            const srcY = Math.floor(y * yRatio);
            const srcIndex = (srcY * srcWidth + srcX) * 4;
            const destIndex = (y * destWidth + x) * 4;
            result[destIndex] = imageData[srcIndex];
            result[destIndex + 1] = imageData[srcIndex + 1];
            result[destIndex + 2] = imageData[srcIndex + 2];
            result[destIndex + 3] = imageData[srcIndex + 3];
        }
    }
    return result;
};

const adjustBrightnessContrastWorkerCode = function adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, darkBoost, shadowsLevel = 0, midtonesLevel = 1.0, highlightsLevel = 255) {
    const result = new Uint8Array(grayscale.length);
    for (let i = 0; i < grayscale.length; i++) {
        let value = grayscale[i];
        if (invert) value = 255 - value;
        // Apply levels adjustment (shadows/midtones/highlights)
        value = ((value - shadowsLevel) / (highlightsLevel - shadowsLevel)) * 255;
        if (midtonesLevel !== 1.0) {
            const normalized = Math.max(0, Math.min(1, value / 255));
            value = Math.pow(normalized, 1 / midtonesLevel) * 255;
        }
        if (gamma !== 1.0) value = Math.pow(value / 255, 1 / gamma) * 255;
        if (brightness !== 0) value = value + brightness;
        if (contrast !== 0) {
            const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
            value = factor * (value - 128) + 128;
        }
        if (darkBoost && value < 128) {
            const boost = (128 - value) / 128;
            value = value * (1 - boost * 0.3);
        }
        result[i] = Math.max(0, Math.min(255, value));
    }
    return result;
};

const generateLineWorkerCode = function generateLine(grayscale, width, height, startX, startY, dirX, dirY, resolution, wavelength, amplitude) {
    const points = [];
    const diagonal = Math.sqrt(width * width + height * height);
    const step = Math.max(0.2 * resolution, 0.2);
    const perpDirX = -dirY;
    const perpDirY = dirX;
    for (let t = -diagonal; t < diagonal; t += step) {
        let x = startX + dirX * t;
        let y = startY + dirY * t;
        if (wavelength > 0 && amplitude > 0) {
            const wavelengthPx = wavelength * resolution;
            const amplitudePx = amplitude * resolution;
            const waveOffset = Math.sin((t / wavelengthPx) * 2 * Math.PI) * amplitudePx;
            x += perpDirX * waveOffset;
            y += perpDirY * waveOffset;
        }
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const px = Math.floor(x);
            const py = Math.floor(y);
            const index = py * width + px;
            const brightness = grayscale[index];
            const depth = 1 - (brightness / 255);
            points.push({ x: x, y: y, depth: depth });
        }
    }
    return points;
};

const generateLinesProgressiveWorkerCode = function generateLinesProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
    const angleRad = (angle * Math.PI) / 180;
    const spacingPx = spacing * resolution;
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);
    const paraX = Math.cos(angleRad);
    const paraY = Math.sin(angleRad);
    const diagonal = Math.sqrt(pixelWidth * pixelWidth + pixelHeight * pixelHeight);
    const numLines = Math.ceil(diagonal / spacingPx) + 2;
    const centerX = pixelWidth / 2;
    const centerY = pixelHeight / 2;
    const lines = [];
    const batchSize = 5;
    let processedCount = 0;
    for (let i = -numLines / 2; i < numLines / 2; i++) {
        const line = generateLine(grayscale, pixelWidth, pixelHeight, centerX + perpX * i * spacingPx, centerY + perpY * i * spacingPx, paraX, paraY, resolution, options.wavelength || 0, options.amplitude || 0);
        if (line.length > 1) {
            const offsetLine = line.map(point => ({ x: point.x + borderPx, y: point.y + borderPx, depth: point.depth }));
            lines.push(offsetLine);
        }
        processedCount++;
        if (processedCount % batchSize === 0) {
            self.postMessage({ type: 'progress', progress: (i + numLines / 2) / numLines, partialLines: lines.slice(Math.max(0, lines.length - batchSize)) });
        }
    }
    self.postMessage({ type: 'complete', data: { lines: lines, width: totalWidthMM, height: totalHeightMM, pixelWidth: totalPixelWidth, pixelHeight: totalPixelHeight, resolution: resolution, spacing: spacing, minSize: options.minSize || 0, maxSize: options.maxSize || spacing, border: options.border || 0, patternType: 'lines' } });
};

const generateLinesForCrosshatchWorkerCode = function generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, borderPx, options, outputLines) {
    const angleRad = (angle * Math.PI) / 180;
    const spacingPx = spacing * resolution;
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);
    const paraX = Math.cos(angleRad);
    const paraY = Math.sin(angleRad);
    const diagonal = Math.sqrt(pixelWidth * pixelWidth + pixelHeight * pixelHeight);
    const numLines = Math.ceil(diagonal / spacingPx) + 2;
    const centerX = pixelWidth / 2;
    const centerY = pixelHeight / 2;
    for (let i = -numLines / 2; i < numLines / 2; i++) {
        const line = generateLine(grayscale, pixelWidth, pixelHeight, centerX + perpX * i * spacingPx, centerY + perpY * i * spacingPx, paraX, paraY, resolution, options.wavelength || 0, options.amplitude || 0);
        if (line.length > 1) {
            const offsetLine = line.map(point => ({ x: point.x + borderPx, y: point.y + borderPx, depth: point.depth }));
            outputLines.push(offsetLine);
        }
    }
};

const generateCrosshatchProgressiveWorkerCode = function generateCrosshatchProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle1, angle2, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
    const lines1 = [];
    generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle1, resolution, borderPx, options, lines1);
    self.postMessage({ type: 'progress', progress: 0.5, partialLines: lines1 });
    const lines2 = [];
    generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle2, resolution, borderPx, options, lines2);
    const allLines = [...lines1, ...lines2];
    self.postMessage({ type: 'complete', data: { lines: allLines, width: totalWidthMM, height: totalHeightMM, pixelWidth: totalPixelWidth, pixelHeight: totalPixelHeight, resolution: resolution, spacing: spacing, minSize: options.minSize || 0, maxSize: options.maxSize || spacing, border: options.border || 0, patternType: 'crosshatch' } });
};

const generateElementsProgressiveWorkerCode = function generateElementsProgressive(grayscale, pixelWidth, pixelHeight, spacing, patternType, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
    const spacingPx = spacing * resolution;
    const elements = [];
    const batchSize = 25;
    const totalCols = Math.ceil(pixelWidth / spacingPx);
    const totalRows = Math.ceil(pixelHeight / spacingPx);
    const totalElements = totalCols * totalRows;
    let processed = 0;

    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;
    const PI = Math.PI;

    for (let y = spacingPx / 2; y < pixelHeight; y += spacingPx) {
        for (let x = spacingPx / 2; x < pixelWidth; x += spacingPx) {
            const px = Math.floor(x);
            const py = Math.floor(y);
            if (px >= pixelWidth || py >= pixelHeight) {
                processed++;
                continue;
            }
            const index = py * pixelWidth + px;
            const brightness = grayscale[index];
            const bright = brightness / 255;

            let elementWidth;
            if (patternType === 'dots') {
                // Area-based calculation like halftoner app
                // NOTE: halftoner uses bright (not 1-bright), so bright pixels = large dots
                const maxArea = PI * (maxSize * 0.5) * (maxSize * 0.5);
                const dotArea = bright * maxArea;
                const dotRadius = Math.sqrt(dotArea / PI);
                elementWidth = dotRadius * 2;
            } else {
                // Linear calculation for circles and squares
                // NOTE: halftoner uses bright (not 1-bright), so bright pixels = large elements
                elementWidth = bright * maxSize;
            }

            if (elementWidth > minSize) {
                // Store coordinates in mm like halftoner app, not pixels
                const xMM = (x + borderPx) / resolution;
                const yMM = (y + borderPx) / resolution;
                elements.push({ x: xMM, y: yMM, size: elementWidth, type: patternType });
            }
            processed++;
            if (processed % batchSize === 0) {
                self.postMessage({ type: 'progress', progress: processed / totalElements, partialElements: elements.slice(Math.max(0, elements.length - batchSize)) });
            }
        }
    }
    self.postMessage({ type: 'complete', data: { elements: elements, width: totalWidthMM, height: totalHeightMM, pixelWidth: totalPixelWidth, pixelHeight: totalPixelHeight, resolution: resolution, spacing: spacing, minSize: minSize, maxSize: maxSize, patternType: patternType, border: options.border || 0 } });
};

const generateHalftoneWithProgressWorkerCode = function generateHalftoneWithProgress(params) {
    const { imageData, width, height, spacing, angle, outputWidthMM, patternType, brightness, contrast, invert, gamma, angle2, upscale, options, shadows, midtones, highlights } = params;

    // Use dynamic resolution like halftoner app: 2.5 samples per spacing unit
    // This ensures smooth gradients regardless of spacing value
    const samplesPerSpacing = 2.5;
    const resolution = Math.ceil(samplesPerSpacing / spacing);

    const aspectRatio = height / width;
    const outputHeightMM = options.lockAspect !== false ? (outputWidthMM * aspectRatio) : (options.outputHeight || outputWidthMM * aspectRatio);
    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);
    const borderMM = options.border || 0;
    const totalWidthMM = outputWidthMM + (borderMM * 2);
    const totalHeightMM = outputHeightMM + (borderMM * 2);
    const totalPixelWidth = Math.floor(totalWidthMM * resolution);
    const totalPixelHeight = Math.floor(totalHeightMM * resolution);
    const borderPx = borderMM * resolution;
    const resampledData = resampleImage(imageData, width, height, pixelWidth, pixelHeight);
    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < resampledData.length; i += 4) {
        const gray = 0.299 * resampledData[i] + 0.587 * resampledData[i + 1] + 0.114 * resampledData[i + 2];
        grayscale[i / 4] = gray;
    }
    const shadowsLevel = shadows !== undefined ? shadows : 0;
    const midtonesLevel = midtones !== undefined ? midtones : 1.0;
    const highlightsLevel = highlights !== undefined ? highlights : 255;
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.darkBoost || shadowsLevel !== 0 || midtonesLevel !== 1.0 || highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, options.darkBoost || false, shadowsLevel, midtonesLevel, highlightsLevel);
    }
    if (patternType === 'lines') {
        generateLinesProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    } else if (patternType === 'crosshatch') {
        generateCrosshatchProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, angle2, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    } else {
        generateElementsProgressive(grayscale, pixelWidth, pixelHeight, spacing, patternType, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    }
};

// Initialize Web Worker using Blob (works with file:// protocol)
function initWorker() {
    if (halftoneWorker) {
        halftoneWorker.terminate();
    }
    
    try {
        // Create worker from inline code using Blob URL
        const workerCode = `
            ${resampleImageWorkerCode.toString()}
            ${adjustBrightnessContrastWorkerCode.toString()}
            ${generateLineWorkerCode.toString()}
            ${generateLinesProgressiveWorkerCode.toString()}
            ${generateLinesForCrosshatchWorkerCode.toString()}
            ${generateCrosshatchProgressiveWorkerCode.toString()}
            ${generateElementsProgressiveWorkerCode.toString()}
            ${generateHalftoneWithProgressWorkerCode.toString()}
            
            // G-code generation with progress
            function generateGcodeWithProgress(params) {
                const { halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero, spindleSpeed, toolChange, vbitToolNumber, boundaryToolNumber, boundaryToolSize, materialThickness, boundaryPassDepth, multiPassCount, ramping, rampDistance, boundary, includeBoundaryInGcode, includeLineNumbers, optimizeToolpathEnabled, bidirectional, borderCuttingFeedRate, plotterMode, plotterLineWidthMethod, plotterPressureMin, plotterPressureMax, plotterPenWidth, plotterLineWidthLight, plotterLineWidthHeavy } = params;
                const boundaryDepth = materialThickness; // Alias for compatibility
                
                const gcode = [];
                let totalTime = 0;
                let totalCuttingDistance = 0;
                let lastX = 0, lastY = 0, lastZ = safeHeight;
                const pixelsToMM = halftoneData.width / halftoneData.pixelWidth;
                const minDepth = 0.05;
                const rapidRate = 5000;
                const patternType = halftoneData.patternType || 'lines';
                let xOffset = 0, yOffset = 0;
                
                // Calculate work zero offset
                if (workZero === 'bottom-center') { xOffset = -(halftoneData.width / 2); yOffset = 0; }
                else if (workZero === 'center') { xOffset = -(halftoneData.width / 2); yOffset = -(halftoneData.height / 2); }
                else if (workZero === 'top-left') { xOffset = 0; yOffset = -halftoneData.height; }
                else if (workZero === 'top-center') { xOffset = -(halftoneData.width / 2); yOffset = -halftoneData.height; }
                
                let lineNumber = 10;
                const addLine = (line) => { gcode.push(includeLineNumbers ? ${'`'}N${'$'}{lineNumber} ${'$'}{line}${'`'} : line); lineNumber += 10; };
                
                addLine('(Generated by Halftone CNC)');
                addLine('G21 ; Set units to mm');
                addLine('G90 ; Absolute positioning');
                addLine(${'`'}M3 S${'$'}{spindleSpeed} ; Start spindle${'`'});
                addLine(${'`'}G0 Z${'$'}{safeHeight.toFixed(3)} ; Move to safe height${'`'});
                if (toolChange) addLine(${'`'}T${'$'}{vbitToolNumber} M6 ; Load V-bit${'`'});
                
                const linesToProcess = halftoneData.lines || [];
                const totalLines = linesToProcess.length;
                let processedLines = 0;
                let rapidMoveCount = 0;
                
                // Process lines with progress updates
                linesToProcess.forEach((line, idx) => {
                    if (line.length < 2) return;
                    
                    // Reverse line direction for bidirectional engraving (even lines)
                    const processLine = (bidirectional && idx % 2 === 1) ? line.slice().reverse() : line;
                    
                    // Do multiple passes on this line if enabled
                    for (let pass = 1; pass <= multiPassCount; pass++) {
                        if (multiPassCount > 1 && pass > 1) {
                            addLine(${'`'}(  Pass ${'$'}{pass}/${'$'}{multiPassCount})${'`'});
                        }
                        
                        let inCut = false;
                        
                        for (let i = 0; i < processLine.length; i++) {
                        const point = processLine[i];
                        const x = (point.x * pixelsToMM) + xOffset;
                        const y = (point.y * pixelsToMM) + yOffset;
                        
                        // Check if point should be processed
                        let shouldProcess = false;
                        if (plotterMode) {
                            // Plotter mode with pressure control: process even very light areas
                            shouldProcess = point.depth > 0.001; // Almost everything except pure white
                        } else {
                            // Cutting mode: calculate depth from V-bit angle
                            const targetWidth = point.depth * maxDepth * 2;
                            const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                            const depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
                            shouldProcess = depth > minDepth;
                        }
                        if (!shouldProcess) {
                            // Area too bright, lift out
                            if (inCut) {
                                if (plotterMode) {
                                    addLine('M5 ; Pen up');
                                    inCut = false;
                                } else {
                                    const rapidUpDist = Math.abs(safeHeight - lastZ);
                                    totalTime += rapidUpDist / rapidRate;
                                    addLine(${'`'}G0 Z${'$'}{safeHeight.toFixed(1)}${'`'});
                                    lastZ = safeHeight;
                                    inCut = false;
                                }
                            }
                        } else {
                            // Process the point
                            if (plotterMode) {
                                // Plotter mode: pen up/down with optional line width method
                                if (plotterLineWidthMethod === 'parallel') {
                                    // Parallel offset method: draw multiple passes for thickness
                                    const penWidth = plotterPenWidth;
                                    const numPasses = Math.max(1, Math.round(point.depth * 5));
                                    
                                    for (let offsetPass = 0; offsetPass < numPasses; offsetPass++) {
                                        const offsetDist = (offsetPass - (numPasses - 1) / 2) * (penWidth / 3);
                                        
                                        // Calculate perpendicular offset
                                        let offsetX = x;
                                        let offsetY = y;
                                        if (i > 0) {
                                            const prevPoint = processLine[i - 1];
                                            const prevX = prevPoint.x * pixelsToMM + xOffset;
                                            const prevY = prevPoint.y * pixelsToMM + yOffset;
                                            const dx = x - prevX;
                                            const dy = y - prevY;
                                            const dist = Math.sqrt(dx * dx + dy * dy);
                                            if (dist > 0.01) {
                                                const perpX = -dy / dist;
                                                const perpY = dx / dist;
                                                offsetX += perpX * offsetDist;
                                                offsetY += perpY * offsetDist;
                                            }
                                        }
                                        
                                        if (offsetPass === 0 && !inCut) {
                                            // First pass, pen down at start
                                            addLine(${'`'}G0 X${'$'}{offsetX.toFixed(3)} Y${'$'}{offsetY.toFixed(3)}${'`'});
                                            addLine('M3 ; Pen down');
                                            inCut = true;
                                        } else if (offsetPass > 0) {
                                            // New pass: pen up, move, pen down
                                            addLine('M5 ; Pen up');
                                            addLine(${'`'}G0 X${'$'}{offsetX.toFixed(3)} Y${'$'}{offsetY.toFixed(3)}${'`'});
                                            addLine('M3 ; Pen down');
                                        } else {
                                            // Continue drawing on same pass
                                            addLine(${'`'}G1 X${'$'}{offsetX.toFixed(3)} Y${'$'}{offsetY.toFixed(3)} F${'$'}{cuttingFeedRate.toFixed(0)}${'`'});
                                        }
                                        
                                        const drawDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                        totalTime += drawDist / cuttingFeedRate;
                                        totalCuttingDistance += drawDist;
                                    }
                                    lastX = x;
                                    lastY = y;
                                } else {
                                    // Pressure-based method: calculate required pressure based on desired line width
                                    const lineSpacing = halftoneData.spacing || 1.0;
                                    const minLineWidth = halftoneData.minSize || 0;
                                    const maxLineWidth = halftoneData.maxSize || lineSpacing;

                                    // For plotter mode, limit maximum line width to spacing to prevent overlap
                                    // (In V-carve mode this limitation wouldn't apply since overlaps are fine)
                                    const effectiveMaxWidth = Math.min(maxLineWidth, lineSpacing);

                                    // Calculate desired line width based on image darkness (0=light, 1=dark)
                                    // Scale from minSize to effectiveMaxWidth
                                    const desiredLineWidth = minLineWidth + (point.depth * (effectiveMaxWidth - minLineWidth));

                                    // Now map the desired line width to the required pressure using calibration data
                                    // We know: plotterPressureMin produces plotterLineWidthLight
                                    //          plotterPressureMax produces plotterLineWidthHeavy
                                    // Linear interpolation to find what pressure produces desiredLineWidth
                                    const widthRange = plotterLineWidthHeavy - plotterLineWidthLight;
                                    const widthRatio = widthRange > 0 ? (desiredLineWidth - plotterLineWidthLight) / widthRange : 0;
                                    const pressureZ = plotterPressureMin + (widthRatio * (plotterPressureMax - plotterPressureMin));
                                    if (!inCut) {
                                        // Pen down
                                        addLine(${'`'}G0 Z${'$'}{pressureZ.toFixed(3)} ; Set pressure${'`'});
                                        lastZ = pressureZ;
                                        
                                        addLine(${'`'}G1 X${'$'}{x.toFixed(3)} Y${'$'}{y.toFixed(3)} F${'$'}{cuttingFeedRate.toFixed(0)}${'`'});
                                        addLine('M3 ; Pen down');
                                        
                                        const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                        totalTime += rapidDist / cuttingFeedRate;
                                        totalCuttingDistance += rapidDist;
                                        
                                        lastX = x;
                                        lastY = y;
                                        inCut = true;
                                    } else {
                                        // Continue drawing with dynamic pressure
                                        addLine(${'`'}G1 X${'$'}{x.toFixed(3)} Y${'$'}{y.toFixed(3)} Z${'$'}{pressureZ.toFixed(3)} F${'$'}{cuttingFeedRate.toFixed(0)}${'`'});
                                        lastZ = pressureZ;
                                        
                                        const drawDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                        totalTime += drawDist / cuttingFeedRate;
                                        totalCuttingDistance += drawDist;
                                        
                                        lastX = x;
                                        lastY = y;
                                    }
                                }
                            } else {
                                // Normal cutting mode
                                const targetWidth = point.depth * maxDepth * 2;
                                const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                                const depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
                                const z = -depth;
                                
                                if (i === 0) {
                                    // Rapid move
                                    const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                    totalTime += rapidDist / 5000;
                                    addLine(${'`'}G0 X${'$'}{x.toFixed(3)} Y${'$'}{y.toFixed(3)}${'`'});
                                    rapidMoveCount++;
                                    
                                    // Plunge
                                    const plungeDist = Math.abs(z - lastZ);
                                    totalTime += plungeDist / plungeFeedRate;
                                    totalCuttingDistance += plungeDist;
                                    addLine(${'`'}G1 Z${'$'}{z.toFixed(3)} F${'$'}{plungeFeedRate}${'`'});
                                } else {
                                    // Cutting move
                                    const cutDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (z - lastZ) ** 2);
                                    totalTime += cutDist / cuttingFeedRate;
                                    totalCuttingDistance += cutDist;
                                    addLine(${'`'}G1 X${'$'}{x.toFixed(3)} Y${'$'}{y.toFixed(3)} Z${'$'}{z.toFixed(3)} F${'$'}{cuttingFeedRate}${'`'});
                                }
                                
                                lastX = x;
                                lastY = y;
                                lastZ = z;
                            }
                        }
                    }
                    
                    } // End pass loop
                    
                    // Lift to safe height after all passes
                    if (plotterMode) {
                        // Pen up in plotter mode
                        addLine('M5 ; Pen up');
                    } else {
                        const liftDist = Math.abs(safeHeight - lastZ);
                        totalTime += liftDist / 5000;
                        addLine(${'`'}G0 Z${'$'}{safeHeight.toFixed(3)}${'`'});
                        lastZ = safeHeight;
                    }
                    
                    processedLines++;
                    if (processedLines % 50 === 0) {
                        self.postMessage({ type: 'progress', action: 'gcode', progress: processedLines / totalLines });
                    }
                });
                
                if (!plotterMode) {
                    addLine(${'`'}G0 Z${'$'}{safeHeight.toFixed(3)}${'`'});
                }
                
                // Generate boundary frame if enabled
                let boundaryGcode = null;
                if (boundary) {
                    const borderMM = 0;
                    const imageWidthMM = halftoneData.width - (borderMM * 2);
                    const imageHeightMM = halftoneData.height - (borderMM * 2);
                    const frameX1 = xOffset + borderMM;
                    const frameY1 = yOffset + borderMM;
                    const frameX2 = xOffset + borderMM + imageWidthMM;
                    const frameY2 = yOffset + borderMM + imageHeightMM;
                    const toolRadius = boundaryToolSize / 2;
                    const borderFeedRate = borderCuttingFeedRate !== null && borderCuttingFeedRate > 0 ? borderCuttingFeedRate : cuttingFeedRate;
                    const numPasses = Math.ceil(boundaryDepth / boundaryPassDepth);
                    const actualPassDepth = boundaryDepth / numPasses;
                    
                    const boundaryCode = [
                        '(Boundary Frame)',
                        ${'`'}(Total depth: ${'$'}{boundaryDepth.toFixed(2)}mm in ${'$'}{numPasses} pass${'$'}{numPasses > 1 ? 'es' : ''})${'`'},
                        toolChange ? ${'`'}T${'$'}{boundaryToolNumber} M6 (Load boundary frame tool - ${'$'}{boundaryToolSize}mm)${'`'} : '',
                        toolChange ? 'G43 H2 (Tool length offset)' : '',
                        toolChange ? ${'`'}M3 S${'$'}{spindleSpeed} (Start spindle)${'`'} : '',
                        toolChange ? 'G4 P2 (Wait for spindle)' : '',
                    ].filter(line => line !== '');
                    
                    boundaryCode.push(${'`'}G0 X${'$'}{(frameX1 - toolRadius).toFixed(3)} Y${'$'}{(frameY1 - toolRadius).toFixed(3)}${'`'});
                    boundaryCode.push(${'`'}G0 Z${'$'}{safeHeight.toFixed(1)}${'`'});
                    
                    for (let pass = 1; pass <= numPasses; pass++) {
                        const currentDepth = actualPassDepth * pass;
                        boundaryCode.push('');
                        boundaryCode.push(${'`'}(Pass ${'$'}{pass} of ${'$'}{numPasses} - depth ${'$'}{currentDepth.toFixed(2)}mm)${'`'});
                        boundaryCode.push(${'`'}G1 Z${'$'}{(-currentDepth).toFixed(3)} F${'$'}{plungeFeedRate}${'`'});
                        boundaryCode.push(${'`'}G1 X${'$'}{(frameX2 + toolRadius).toFixed(3)} Y${'$'}{(frameY1 - toolRadius).toFixed(3)} F${'$'}{borderFeedRate}${'`'});
                        boundaryCode.push(${'`'}G1 X${'$'}{(frameX2 + toolRadius).toFixed(3)} Y${'$'}{(frameY2 + toolRadius).toFixed(3)}${'`'});
                        boundaryCode.push(${'`'}G1 X${'$'}{(frameX1 - toolRadius).toFixed(3)} Y${'$'}{(frameY2 + toolRadius).toFixed(3)}${'`'});
                        boundaryCode.push(${'`'}G1 X${'$'}{(frameX1 - toolRadius).toFixed(3)} Y${'$'}{(frameY1 - toolRadius).toFixed(3)}${'`'});
                        if (pass < numPasses) {
                            boundaryCode.push(${'`'}G0 Z${'$'}{safeHeight.toFixed(1)}${'`'});
                        }
                    }
                    
                    boundaryCode.push(${'`'}G0 Z${'$'}{safeHeight.toFixed(1)}${'`'});
                    
                    const frameDist = 2 * (imageWidthMM + imageHeightMM + 4 * toolRadius) * numPasses;
                    totalTime += frameDist / borderFeedRate;
                    
                    if (includeBoundaryInGcode) {
                        gcode.push('', ...boundaryCode);
                    } else {
                        const boundaryHeader = [
                            '(Boundary Frame G-code)',
                            ${'`'}(Image size: ${'$'}{imageWidthMM.toFixed(2)}mm x ${'$'}{imageHeightMM.toFixed(2)}mm)${'`'},
                            borderMM > 0 ? ${'`'}(Border: ${'$'}{borderMM.toFixed(2)}mm)${'`'} : '',
                            ${'`'}(Frame depth: ${'$'}{boundaryDepth.toFixed(2)}mm in ${'$'}{numPasses} pass${'$'}{numPasses > 1 ? 'es' : ''})${'`'},
                            ${'`'}(Pass depth: ${'$'}{actualPassDepth.toFixed(2)}mm)${'`'},
                            ${'`'}(Tool: ${'$'}{boundaryToolSize}mm diameter)${'`'},
                            toolChange ? ${'`'}(Tool number: T${'$'}{boundaryToolNumber})${'`'} : '',
                            '(Generated for grblHAL)',
                            '',
                            'G21 (Metric units)',
                            'G90 (Absolute positioning)',
                            'G17 (XY plane)',
                            'G94 (Feed per minute)',
                            'G54 (Work coordinate system)',
                            '',
                            toolChange ? '' : ${'`'}M3 S${'$'}{spindleSpeed} (Start spindle)${'`'},
                            toolChange ? '' : 'G4 P2 (Wait 2 seconds)',
                            ${'`'}F${'$'}{borderFeedRate} (Set feed rate)${'`'},
                            ${'`'}G0 Z${'$'}{safeHeight.toFixed(1)} (Safe height)${'`'},
                            'G0 X0.000 Y0.000 (Move to origin)',
                            ''
                        ].filter(line => line !== '');
                        
                        const boundaryFooter = [
                            '',
                            ${'`'}G0 Z${'$'}{safeHeight.toFixed(1)} (Safe height)${'`'},
                            'M5 (Stop spindle)',
                            'M2 (End program)'
                        ];
                        
                        boundaryGcode = [...boundaryHeader, ...boundaryCode, ...boundaryFooter].join('\\n');
                    }
                }
                
                if (plotterMode) {
                    addLine('M5 ; Pen up');
                } else {
                    addLine('M5 ; Stop spindle');
                }
                addLine('M2 ; End program');
                
                const gcodeString = gcode.join('\\n');
                const actualLineCount = gcodeString.split('\\n').length;
                
                self.postMessage({ 
                    type: 'complete', 
                    action: 'gcode',
                    data: { 
                        gcode: gcodeString, 
                        estimatedTime: totalTime,
                        totalDistance: totalCuttingDistance,
                        lineCount: actualLineCount,
                        rapidMoveCount: rapidMoveCount,
                        boundaryGcode: boundaryGcode
                    } 
                });
            }
            
            self.onmessage = function(e) {
                const { action, data } = e.data;
                if (action === 'generateHalftone') {
                    try {
                        generateHalftoneWithProgress(data);
                    } catch (error) {
                        self.postMessage({ type: 'error', error: error.message, action: 'halftone' });
                    }
                } else if (action === 'generateGcode') {
                    try {
                        generateGcodeWithProgress(data);
                    } catch (error) {
                        self.postMessage({ type: 'error', error: error.message, action: 'gcode' });
                    }
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const blobURL = URL.createObjectURL(blob);
        halftoneWorker = new Worker(blobURL);
    } catch (error) {
        console.error('Failed to initialize worker:', error);
        return false;
    }
    
    halftoneWorker.onmessage = function(e) {
        const { type, data, progress, partialLines, partialElements, error, action } = e.data;
        
        // Route to appropriate handler based on action
        if (action === 'gcode') {
            handleGcodeWorkerMessage(type, data, progress, error);
        } else {
            handleHalftoneWorkerMessage(type, data, progress, partialLines, partialElements, error);
        }
    };
    
    function handleHalftoneWorkerMessage(type, data, progress, partialLines, partialElements, error) {
        if (type === 'progress') {
            // Store progressive data but don't render until complete (avoids visual glitches)
            if (partialLines) {
                progressiveLines.push(...partialLines);
            }
            if (partialElements) {
                progressiveElements.push(...partialElements);
            }
            
            // Update progress in UI
            const percent = Math.round(progress * 100);
            previewInfo.textContent = `Generating preview... ${percent}%`;
            previewInfo.style.color = '#5B9BD5';
            previewProgress.textContent = `${percent}%`;
            previewProgress.style.display = 'inline';
            
        } else if (type === 'complete') {
            // Final rendering with complete data
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            currentHalftoneData = data;
            displayHalftone(currentHalftoneData);

            // Auto-set plotter line width heavy to match max line width
            if (data.maxSize) {
                const plotterLineWidthHeavyInput = document.getElementById('plotterLineWidthHeavy');
                if (plotterLineWidthHeavyInput) {
                    // Set the value to max line width
                    plotterLineWidthHeavyInput.value = data.maxSize.toFixed(1);
                    // Set the minimum to max line width so user can't go smaller
                    plotterLineWidthHeavyInput.min = data.maxSize.toFixed(1);
                }
            }

            // Enable G-code generation
            generateGcodeButton.disabled = false;
            
            // Show completion info
            const elementCount = (data.patternType === 'lines' || data.patternType === 'crosshatch') ? 
                data.lines.length : data.elements?.length || 0;
            const patternNames = {
                'lines': 'lines',
                'circles': 'circles',
                'squares': 'squares',
                'dots': 'dots',
                'stipple': 'stipple points',
                'crosshatch': 'lines'
            };
            const elementName = patternNames[data.patternType] || 'elements';
            previewInfo.textContent = `${elementCount} ${elementName} • ${data.width.toFixed(0)}×${data.height.toFixed(0)}mm`;
            previewInfo.style.color = '#28a745';
            previewProgress.style.display = 'none';

            // Show the halftone info button - Removed
            // if (showHalftoneInfoButton) {
            //     showHalftoneInfoButton.style.display = 'block';
            // }

            // Reset progressive arrays
            progressiveLines = [];
            progressiveElements = [];
            
            // Terminate worker to free memory
            if (halftoneWorker) {
                halftoneWorker.terminate();
                halftoneWorker = null;
            }
            
        } else if (type === 'error') {
            previewInfo.textContent = 'Error generating preview: ' + error;
            previewInfo.style.color = '#dc3545';
            console.error(error);
            
            // Terminate worker on error too
            if (halftoneWorker) {
                halftoneWorker.terminate();
                halftoneWorker = null;
            }
        }
    }
    
    function handleGcodeWorkerMessage(type, data, progress, error) {
        const gcodeProgress = document.getElementById('gcodeProgress');
        const gcodeInfo = document.getElementById('gcodeInfo');
        const timeEstimate = document.getElementById('timeEstimate');
        const downloadButton = document.getElementById('downloadButton');
        const downloadBoundaryButton = document.getElementById('downloadBoundaryButton');
        
        if (type === 'progress') {
            // Update progress in UI
            const percent = Math.round(progress * 100);
            gcodeInfo.textContent = `Generating G-code... ${percent}%`;
            gcodeInfo.style.color = '#5B9BD5';
            gcodeProgress.textContent = `${percent}%`;
            gcodeProgress.style.display = 'inline';
            
        } else if (type === 'complete') {
            // Final rendering with complete data
            const endTime = performance.now();
            const duration = ((endTime - startTime) / 1000).toFixed(2);
            
            // Store G-code for download (in memory, not textarea)
            window.currentGcodeContent = data.gcode;
            downloadButton.disabled = false;

            // Display with Monaco Editor (virtual scrolling built-in)
            console.log('Attempting to display G-code...');
            console.log('window.monacoGcode exists:', !!window.monacoGcode);
            console.log('Monaco loaded:', window.monacoGcode ? window.monacoGcode.isLoaded() : false);

            if (window.monacoGcode && window.monacoGcode.isLoaded()) {
                console.log('Using Monaco Editor to display G-code');
                window.monacoGcode.display(data.gcode);
            } else {
                console.warn('Monaco Editor not loaded yet, waiting and retrying...');
                // Retry after a short delay
                setTimeout(() => {
                    if (window.monacoGcode && window.monacoGcode.isLoaded()) {
                        console.log('Monaco now loaded, displaying G-code');
                        window.monacoGcode.display(data.gcode);
                    } else {
                        console.error('Monaco Editor failed to load - G-code stored in memory only');
                    }
                }, 1000);
            }
            
            // Handle boundary G-code if present
            if (data.boundaryGcode) {
                currentBoundaryGcode = data.boundaryGcode;
                downloadBoundaryButton.disabled = false;
                downloadBoundaryButton.style.display = 'block';
            } else {
                currentBoundaryGcode = null;
                downloadBoundaryButton.disabled = true;
                downloadBoundaryButton.style.display = 'none';
            }
            
            // Update info display
            gcodeInfo.textContent = `${data.lineCount.toLocaleString()} lines of G-code • ${data.totalDistance.toFixed(2)}mm distance • ${data.rapidMoveCount || 0} rapid moves`;
            gcodeInfo.style.color = '#28a745';
            gcodeProgress.style.display = 'none';
            
            // Update time estimate (data.estimatedTime is in minutes)
            const totalMinutes = data.estimatedTime;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = Math.floor(totalMinutes % 60);
            const seconds = Math.round((totalMinutes % 1) * 60);
            
            let timeString = '';
            if (hours > 0) {
                timeString = `${hours}h ${minutes}m`;
            } else if (minutes > 0) {
                timeString = `${minutes}m ${seconds}s`;
            } else {
                timeString = `${seconds}s`;
            }
            
            timeEstimate.textContent = `Est. time: ${timeString}`;
            
            // Terminate worker to free memory
            if (halftoneWorker) {
                halftoneWorker.terminate();
                halftoneWorker = null;
            }
            
        } else if (type === 'error') {
            gcodeInfo.textContent = 'Error generating G-code: ' + error;
            gcodeInfo.style.color = '#dc3545';
            gcodeProgress.style.display = 'none';
            console.error(error);
            
            // Terminate worker on error too
            if (halftoneWorker) {
                halftoneWorker.terminate();
                halftoneWorker = null;
            }
        }
    }
    
    halftoneWorker.onerror = function(error) {
        previewInfo.textContent = 'Worker error: ' + error.message;
        previewInfo.style.color = '#dc3545';
        console.error('Worker error:', error);
    };
    
    return true;
}

// Virtual scrolling for G-code display
let gcodeLines = [];
let gcodeScrollContainer = null;
let gcodeScrollContent = null;
const LINE_HEIGHT = 16;
const BUFFER_LINES = 20;

function displayGcodeVirtual(gcode) {
    gcodeLines = gcode.split('\n');
    gcodeScrollContainer = document.getElementById('gcodeVirtualScroll');
    gcodeScrollContent = document.getElementById('gcodeScrollContent');
    
    // Set content height based on total lines
    const totalHeight = gcodeLines.length * LINE_HEIGHT;
    gcodeScrollContent.style.height = `${totalHeight}px`;
    
    // Initial render
    renderVisibleLines();
    
    // Update on scroll
    gcodeScrollContainer.onscroll = renderVisibleLines;
}

function renderVisibleLines() {
    if (!gcodeScrollContainer || gcodeLines.length === 0) return;
    
    const scrollTop = gcodeScrollContainer.scrollTop;
    const containerHeight = gcodeScrollContainer.clientHeight;
    
    // Calculate visible range with buffer
    const startLine = Math.max(0, Math.floor(scrollTop / LINE_HEIGHT) - BUFFER_LINES);
    const endLine = Math.min(gcodeLines.length, Math.ceil((scrollTop + containerHeight) / LINE_HEIGHT) + BUFFER_LINES);
    
    // Render only visible lines
    const visibleContent = gcodeLines.slice(startLine, endLine).map((line, idx) => {
        const lineNumber = startLine + idx;
        return `<div style="position: absolute; top: ${lineNumber * LINE_HEIGHT}px; left: 0; right: 0; height: ${LINE_HEIGHT}px; padding: 0 8px; line-height: ${LINE_HEIGHT}px;">${escapeHtml(line)}</div>`;
    }).join('');
    
    gcodeScrollContent.innerHTML = visibleContent;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Theme handling
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
};

themeToggle.addEventListener('change', () => {
    const newTheme = themeToggle.checked ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
});

// Initialize theme on page load
initTheme();

// Web Worker will be initialized on first preview generation
// This avoids blocking page load if worker has issues

// Remove increment/decrement buttons from tab order
document.querySelectorAll('.increment-btn, .decrement-btn').forEach(btn => {
    btn.setAttribute('tabindex', '-1');
});

// Removed collapse/expand functionality - now using toggle switch instead

// Live Preview Toggle
livePreviewToggle.addEventListener('change', (e) => {
    autoUpdateEnabled = e.target.checked;

    // Update button state based on toggle
    if (autoUpdateEnabled) {
        generatePreviewButton.textContent = 'Live Preview Active';
        if (currentImage) {
            // Immediately generate preview when toggled on
            updateHalftonePreview();
        }
    } else {
        generatePreviewButton.textContent = 'Generate Halftone Preview';
    }
});

// Increment/Decrement button handlers
const incrementDecrementButtons = document.querySelectorAll('.increment-btn, .decrement-btn');
incrementDecrementButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('data-target');
        const input = document.getElementById(targetId);

        if (!input) {
            console.error('Input not found for target:', targetId);
            return;
        }

        const step = parseFloat(input.step) || 1;
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const isIncrement = e.target.classList.contains('increment-btn');

        let currentValue = parseFloat(input.value) || 0;
        let newValue = isIncrement ? currentValue + step : currentValue - step;

        // Clamp to min/max
        if (!isNaN(min)) newValue = Math.max(min, newValue);
        if (!isNaN(max)) newValue = Math.min(max, newValue);

        // Round to step precision
        const decimals = (step.toString().split('.')[1] || '').length;
        newValue = parseFloat(newValue.toFixed(decimals));

        // Set the value - for number inputs, we need to ensure the display updates
        input.value = newValue;

        // Force browser to update the display by triggering a reflow
        void input.offsetHeight;

        // Trigger input and change events so other listeners are notified
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));

        // Trigger update
        if (autoUpdateEnabled && currentImage) {
            debounceUpdatePreview();
        }
    });
});

// Listen to input changes
angleInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

brightnessInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

contrastInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

imageWidthInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

invertToggle.addEventListener('change', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

upscaleToggle.addEventListener('change', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

// Lock aspect ratio and width/height handlers
imageWidthInput.addEventListener('input', () => {
    if (lockAspectToggle.checked && currentImage) {
        const aspectRatio = currentImage.height / currentImage.width;
        const width = parseFloat(imageWidthInput.value);
        if (!isNaN(width) && width > 0) {
            imageHeightInput.value = (width * aspectRatio).toFixed(2);
        }
    }
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

imageHeightInput.addEventListener('input', () => {
    if (lockAspectToggle.checked && currentImage) {
        const aspectRatio = currentImage.width / currentImage.height;
        const height = parseFloat(imageHeightInput.value);
        if (!isNaN(height) && height > 0) {
            imageWidthInput.value = (height * aspectRatio).toFixed(2);
        }
    }
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

// New control event listeners
borderInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

spacingInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

minSizeInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

maxSizeInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

preBlurInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

wavelengthInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

amplitudeInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

centerOffsetXInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

centerOffsetYInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

offsetOddLinesToggle.addEventListener('change', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

darkBoostToggle.addEventListener('change', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

fixedSizesToggle.addEventListener('change', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

gammaInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

shadowsInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

midtonesInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

highlightsInput.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

crosshatchAngle2Input.addEventListener('input', () => {
    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

// Toggle visibility based on pattern type
function updatePatternVisibility() {
    const patternType = patternTypeSelect.value;

    // Get control groups
    const minSizeGroup = document.getElementById('minSize-group');
    const maxSizeGroup = document.getElementById('maxSize-group');
    const wavelengthGroup = document.getElementById('wavelength-group');
    const amplitudeGroup = document.getElementById('amplitude-group');

    // Show/hide crosshatch angle 2
    if (patternType === 'crosshatch') {
        crosshatchAngle2Group.style.display = 'flex';
    } else {
        crosshatchAngle2Group.style.display = 'none';
    }

    // Show/hide angle control for patterns that use it
    if (patternType === 'lines' || patternType === 'crosshatch') {
        angleControl.style.display = 'flex';
    } else {
        angleControl.style.display = 'none';
    }

    // Show/hide wavelength and amplitude for line-based patterns
    if (patternType === 'lines' || patternType === 'crosshatch') {
        if (wavelengthGroup) wavelengthGroup.style.display = 'flex';
        if (amplitudeGroup) amplitudeGroup.style.display = 'flex';
    } else {
        if (wavelengthGroup) wavelengthGroup.style.display = 'none';
        if (amplitudeGroup) amplitudeGroup.style.display = 'none';
    }

    // Show/hide min/max size for element-based patterns and lines (for plotter mode)
    if (patternType === 'circles' || patternType === 'squares' || patternType === 'dots' || patternType === 'lines') {
        if (minSizeGroup) minSizeGroup.style.display = 'flex';
        if (maxSizeGroup) maxSizeGroup.style.display = 'flex';
    } else {
        if (minSizeGroup) minSizeGroup.style.display = 'none';
        if (maxSizeGroup) maxSizeGroup.style.display = 'none';
    }
}

// Toggle visibility handlers
patternTypeSelect.addEventListener('change', updatePatternVisibility);

// Initialize visibility on page load
updatePatternVisibility();

toolChangeToggle.addEventListener('change', () => {
    const isChecked = toolChangeToggle.checked;
    vbitToolNumberGroup.style.display = isChecked ? 'flex' : 'none';

    // Only show boundary tool NUMBER if both boundary and tool changer are checked
    if (isChecked && boundaryToggle.checked) {
        boundaryToolNumberGroup.style.display = 'flex';
    } else {
        boundaryToolNumberGroup.style.display = 'none';
    }
});

rampingToggle.addEventListener('change', () => {
    rampDistanceGroup.style.display = rampingToggle.checked ? 'flex' : 'none';
});

// Show/hide depth per pass setting based on multi-pass count
function updateDepthPerPassVisibility() {
    const multiPassCount = parseInt(multiPassCountInput.value);
    depthPerPassGroup.style.display = multiPassCount > 1 ? 'flex' : 'none';
}

multiPassCountInput.addEventListener('input', updateDepthPerPassVisibility);
multiPassCountInput.addEventListener('change', updateDepthPerPassVisibility);

boundaryToggle.addEventListener('change', () => {
    const isChecked = boundaryToggle.checked;
    boundaryToolSizeGroup.style.display = isChecked ? 'flex' : 'none';
    boundaryPassDepthGroup.style.display = isChecked ? 'flex' : 'none';
    includeBoundaryInGcodeGroup.style.display = isChecked ? 'flex' : 'none';
    borderCuttingFeedRateInput.parentElement.parentElement.style.display = isChecked ? 'flex' : 'none';

    // Show boundary tool NUMBER only if both boundary and tool changer are enabled
    if (toolChangeToggle.checked) {
        boundaryToolNumberGroup.style.display = isChecked ? 'flex' : 'none';
    }
});

splitFilesToggle.addEventListener('change', () => {
    const maxLinesPerFileGroup = document.getElementById('maxLinesPerFile-group');
    if (maxLinesPerFileGroup) {
        maxLinesPerFileGroup.style.display = splitFilesToggle.checked ? 'flex' : 'none';
    }
});

// Auto adjust button
autoAdjustButton.addEventListener('click', () => {
    if (!currentImage) {
        alert('Please load an image first!');
        return;
    }

    // Calculate histogram to find optimal brightness/contrast
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = currentImage.width;
    tempCanvas.height = currentImage.height;
    tempCtx.drawImage(currentImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

    // Convert to grayscale and find min/max
    let min = 255;
    let max = 0;
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        if (gray < min) min = gray;
        if (gray > max) max = gray;
    }

    // Calculate optimal adjustments
    const range = max - min;
    const targetRange = 255;

    // Adjust contrast to use full range
    const contrastAdjust = range < targetRange ? Math.min(100, ((targetRange / range) - 1) * 100) : 0;

    // Adjust brightness to center the range
    const midpoint = (min + max) / 2;
    const targetMid = 127.5;
    const brightnessAdjust = Math.max(-100, Math.min(100, (targetMid - midpoint) / 2.55));

    // Apply adjustments
    contrastInput.value = Math.round(contrastAdjust);
    brightnessInput.value = Math.round(brightnessAdjust);

    // Trigger preview update if live preview is enabled
    if (autoUpdateEnabled) {
        debounceUpdatePreview();
    }

    alert(`Auto Adjust Complete!\nBrightness: ${Math.round(brightnessAdjust)}\nContrast: ${Math.round(contrastAdjust)}`);
});

// Calibration Modal
const calibrationModal = document.getElementById('calibrationModal');
const calibratePressureButton = document.getElementById('calibratePressureButton');
const closeCalibrationModal = document.getElementById('closeCalibrationModal');

if (calibratePressureButton) {
    calibratePressureButton.addEventListener('click', () => {
        calibrationModal.style.display = 'flex';
    });
}

if (closeCalibrationModal) {
    closeCalibrationModal.addEventListener('click', () => {
        calibrationModal.style.display = 'none';
    });
}

// Close modal when clicking outside of it
calibrationModal.addEventListener('click', (e) => {
    if (e.target === calibrationModal) {
        calibrationModal.style.display = 'none';
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && calibrationModal.style.display === 'flex') {
        calibrationModal.style.display = 'none';
    }
    if (e.key === 'Escape' && halftoneInfoModal.style.display === 'flex') {
        halftoneInfoModal.style.display = 'none';
    }
});

// Halftone Info Modal
const halftoneInfoModal = document.getElementById('halftoneInfoModal');
// const showHalftoneInfoButton = document.getElementById('showHalftoneInfoButton'); // Removed
const closeHalftoneInfoModal = document.getElementById('closeHalftoneInfoModal');

// Removed showHalftoneInfoButton event listener

if (closeHalftoneInfoModal) {
    closeHalftoneInfoModal.addEventListener('click', () => {
        halftoneInfoModal.style.display = 'none';
    });
}

halftoneInfoModal.addEventListener('click', (e) => {
    if (e.target === halftoneInfoModal) {
        halftoneInfoModal.style.display = 'none';
    }
});

function displayHalftoneInfo(halftoneData) {
    // Image dimensions
    document.getElementById('infoImageSize').textContent = `Output Size: ${halftoneData.width.toFixed(1)}mm × ${halftoneData.height.toFixed(1)}mm`;
    document.getElementById('infoPixelSize').textContent = `Resolution: ${halftoneData.pixelWidth} × ${halftoneData.pixelHeight} pixels`;

    // Pattern settings
    const patternNames = {
        'lines': 'Lines',
        'circles': 'Circles',
        'squares': 'Squares',
        'dots': 'Dots',
        'stipple': 'Stipple (Random)',
        'crosshatch': 'Cross-Hatch'
    };
    document.getElementById('infoPatternType').textContent = `Pattern Type: ${patternNames[halftoneData.patternType] || halftoneData.patternType}`;

    // Show spacing with explanation if it was adjusted for plotter mode
    const spacingDisplay = halftoneData.spacing || 1.0;
    const currentInputSpacing = parseFloat(spacingInput.value);
    const plotterModeActive = plotterModeToggle.checked;

    if (plotterModeActive && Math.abs(spacingDisplay - currentInputSpacing) > 0.01) {
        const penWidth = parseFloat(plotterPenWidthInput?.value || 0.5);
        document.getElementById('infoSpacing').innerHTML = `Spacing: ${spacingDisplay.toFixed(2)}mm<br><span style="font-size: 0.9em; color: #666;">(Input: ${currentInputSpacing.toFixed(2)}mm, adjusted by pen width ${penWidth.toFixed(2)}mm)</span>`;
    } else {
        document.getElementById('infoSpacing').textContent = `Spacing: ${spacingDisplay.toFixed(2)}mm`;
    }

    if (halftoneData.patternType === 'lines' || halftoneData.patternType === 'crosshatch') {
        document.getElementById('infoAngle').style.display = 'block';
        document.getElementById('infoAngle').textContent = `Angle: ${angleInput.value}°`;
    } else {
        document.getElementById('infoAngle').style.display = 'none';
    }

    const elementCount = halftoneData.lines ? halftoneData.lines.length : (halftoneData.elements ? halftoneData.elements.length : 0);
    const elementName = halftoneData.patternType === 'lines' || halftoneData.patternType === 'crosshatch' ? 'lines' : 'elements';
    document.getElementById('infoElementCount').textContent = `Total ${elementName}: ${elementCount.toLocaleString()}`;

    // Line width information
    const spacingFromHalftone = halftoneData.spacing || 1.0;
    const currentSpacingInput = parseFloat(spacingInput.value);
    const spacing = spacingFromHalftone; // Use the spacing that was actually used to generate the halftone
    const plotterMode = plotterModeToggle.checked;

    if (plotterMode) {
        const plotterLineWidthLight = parseFloat(plotterLineWidthLightInput?.value || 0.3);
        const plotterLineWidthHeavy = parseFloat(plotterLineWidthHeavyInput?.value || 1.0);

        document.getElementById('infoMinLineWidth').textContent = `Minimum Line Width: ${plotterLineWidthLight.toFixed(2)}mm (lightest areas)`;
        document.getElementById('infoMaxLineWidth').textContent = `Maximum Line Width: ${plotterLineWidthHeavy.toFixed(2)}mm (darkest areas)`;

        // Show if spacing has changed since halftone was generated
        if (Math.abs(currentSpacingInput - spacingFromHalftone) > 0.01) {
            document.getElementById('infoActualMaxWidth').innerHTML = `Line Spacing: ${spacing.toFixed(2)}mm<br><span style="color: #ff9800;">⚠️ Current spacing input (${currentSpacingInput.toFixed(2)}mm) differs - regenerate preview to update</span>`;
        } else {
            document.getElementById('infoActualMaxWidth').textContent = `Line Spacing: ${spacing.toFixed(2)}mm`;
        }

        // Like halftoner, lines can be wider than spacing for overlap in dark areas
        if (plotterLineWidthHeavy > spacing) {
            document.getElementById('infoWidthNote').textContent = `ℹ️ Note: Maximum line width (${plotterLineWidthHeavy.toFixed(2)}mm) is larger than spacing (${spacing.toFixed(2)}mm). Lines will overlap in darker areas, creating denser coverage.`;
        } else {
            document.getElementById('infoWidthNote').textContent = `✓ Maximum line width fits within spacing - no overlap.`;
        }

        // Show pressure details
        document.getElementById('infoPressureSection').style.display = 'block';
        document.getElementById('infoPressureDetails').style.display = 'block';

        const plotterLineWidthMethod = document.getElementById('plotterLineWidthMethod')?.value || 'pressure';
        document.getElementById('infoPressureMethod').textContent = `Method: ${plotterLineWidthMethod === 'pressure' ? 'Pressure-Based (Z-axis)' : 'Parallel Offset (Multiple Passes)'}`;

        if (plotterLineWidthMethod === 'pressure') {
            const plotterPressureMin = parseFloat(plotterPressureMinInput?.value || 0);
            const plotterPressureMax = parseFloat(plotterPressureMaxInput?.value || -0.5);

            document.getElementById('infoPressureMin').textContent = `Lightest Pressure: Z=${plotterPressureMin.toFixed(2)}mm → ${plotterLineWidthLight.toFixed(2)}mm line`;
            document.getElementById('infoPressureMax').textContent = `Heaviest Pressure: Z=${plotterPressureMax.toFixed(2)}mm → ${plotterLineWidthHeavy.toFixed(2)}mm line`;
            document.getElementById('infoLineWidthLight').textContent = `Light Line Width: ${plotterLineWidthLight.toFixed(2)}mm`;
            document.getElementById('infoLineWidthHeavy').textContent = `Heavy Line Width: ${plotterLineWidthHeavy.toFixed(2)}mm`;

            // Show full pressure range - always uses the complete calibrated range
            document.getElementById('infoPressureWarning').style.display = 'block';
            document.getElementById('infoPressureWarning').textContent = `✓ Full pressure range: Z=${plotterPressureMin.toFixed(2)}mm to Z=${plotterPressureMax.toFixed(2)}mm will be used for brightness range 0-100%`;
        }
    } else {
        document.getElementById('infoMinLineWidth').textContent = `Minimum Line Width: Variable (based on brightness)`;
        document.getElementById('infoMaxLineWidth').textContent = `Maximum Line Width: ~${spacing.toFixed(2)}mm (limited by spacing)`;
        document.getElementById('infoActualMaxWidth').style.display = 'none';
        document.getElementById('infoWidthNote').textContent = `Line widths vary based on image brightness and V-bit depth.`;

        document.getElementById('infoPressureSection').style.display = 'none';
        document.getElementById('infoPressureDetails').style.display = 'none';
    }
}

// Material thickness validation
maxDepthInput.addEventListener('input', validateMaterialDepth);
materialThicknessInput.addEventListener('input', validateMaterialDepth);

function validateMaterialDepth() {
    const maxDepth = parseFloat(maxDepthInput.value) || 0;
    const thickness = parseFloat(materialThicknessInput.value) || 0;

    if (maxDepth > thickness) {
        maxDepthInput.style.borderColor = '#ff4444';
        maxDepthInput.style.borderWidth = '2px';
        alert(`Warning: Max depth (${maxDepth}mm) exceeds material thickness (${thickness}mm)!`);
    } else {
        maxDepthInput.style.borderColor = '';
        maxDepthInput.style.borderWidth = '';
    }
}

// Drag & Drop functionality removed - now using compact header with file input button

// Image Preset Save/Load with modal interface
saveImagePresetButton.addEventListener('click', () => {
    showPresetModal('save', 'image');
});

loadImagePresetButton.addEventListener('click', () => {
    showPresetModal('load', 'image');
});

// CNC Preset Save/Load with modal interface
saveCncPresetButton.addEventListener('click', () => {
    showPresetModal('save', 'cnc');
});

loadCncPresetButton.addEventListener('click', () => {
    showPresetModal('load', 'cnc');
});

// Export/Import Preset functionality
exportPresetButton.addEventListener('click', () => {
    showExportModal();
});

importPresetButton.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate and determine preset type
            if (!data.type || !data.presetName || !data.preset) {
                alert('Invalid preset file format.');
                return;
            }

            const presetType = data.type;
            const presetName = data.presetName;
            const preset = data.preset;

            // Load into appropriate localStorage
            if (presetType === 'imagePreset') {
                const presets = JSON.parse(localStorage.getItem('imagePresets') || '{}');
                presets[presetName] = preset;
                localStorage.setItem('imagePresets', JSON.stringify(presets));
                alert(`Image preset "${presetName}" imported successfully!`);
            } else if (presetType === 'cncPreset') {
                const presets = JSON.parse(localStorage.getItem('cncPresets') || '{}');
                presets[presetName] = preset;
                localStorage.setItem('cncPresets', JSON.stringify(presets));
                alert(`CNC preset "${presetName}" imported successfully!`);
            } else {
                alert('Unknown preset type: ' + presetType);
            }
        } catch (err) {
            console.error('Error importing preset:', err);
            alert('Error importing preset file. Make sure it\'s a valid preset file.');
        }
    };
    input.click();
});

function showPresetModal(mode, type) {
    const storageKey = type === 'image' ? 'imagePresets' : 'cncPresets';
    const presets = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const presetNames = Object.keys(presets);
    const title = type === 'image' ? 'Image Preset' : 'CNC Preset';

    const overlay = document.createElement('div');
    overlay.className = 'preset-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'preset-modal';

    if (mode === 'save') {
        const presetList = presetNames.length > 0 
            ? presetNames.map(name =>
                `<div class="preset-item" data-preset="${name}">
                    <span class="preset-name">${name}</span>
                </div>`
            ).join('')
            : '<p style="color: #999; text-align: center; padding: 20px;">No existing presets</p>';

        modal.innerHTML = `
            <h3>Save ${title}</h3>
            <input type="text" id="presetNameInput" class="preset-input" placeholder="Enter preset name...">
            ${presetNames.length > 0 ? '<p style="font-size: 12px; color: #666; margin-top: 10px;">Click to overwrite existing:</p>' : ''}
            <div class="preset-list" id="existingPresetList">${presetList}</div>
            <div class="preset-buttons">
                <button class="preset-modal-btn cancel">Cancel</button>
                <button class="preset-modal-btn save">Save</button>
            </div>
        `;
    } else {
        if (presetNames.length === 0) {
            alert(`No ${type} presets saved yet!`);
            return;
        }

        const presetList = presetNames.map(name =>
            `<div class="preset-item">
                <span class="preset-name">${name}</span>
                <button class="preset-delete-btn" data-preset="${name}">Delete</button>
            </div>`
        ).join('');

        modal.innerHTML = `
            <h3>Load ${title}</h3>
            <div class="preset-list">${presetList}</div>
            <div class="preset-buttons">
                <button class="preset-modal-btn cancel">Cancel</button>
            </div>
        `;
    }

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    if (mode === 'save') {
        setTimeout(() => document.getElementById('presetNameInput').focus(), 100);
        
        // Add click handlers for existing presets in save mode
        const existingPresetList = document.getElementById('existingPresetList');
        if (existingPresetList) {
            existingPresetList.addEventListener('click', (e) => {
                const presetItem = e.target.closest('.preset-item');
                if (presetItem) {
                    const presetName = presetItem.getAttribute('data-preset');
                    const nameInput = document.getElementById('presetNameInput');
                    nameInput.value = presetName;
                    nameInput.focus();
                    
                    // Highlight the selected preset
                    document.querySelectorAll('.preset-item').forEach(item => {
                        item.style.opacity = '0.5';
                    });
                    presetItem.style.opacity = '1';
                }
            });
        }
    }

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('cancel')) {
            document.body.removeChild(overlay);
            return;
        }

        if (e.target.classList.contains('save')) {
            const nameInput = document.getElementById('presetNameInput');
            const presetName = nameInput.value.trim();
            const saveButton = e.target;

            if (!presetName) {
                alert('Please enter a preset name');
                return;
            }

            let preset;
            if (type === 'image') {
                preset = {
                    patternType: patternTypeSelect.value,
                    spacing: spacingInput.value,
                    angle: angleInput.value,
                    crosshatchAngle2: crosshatchAngle2Input.value,
                    maxDepth: maxDepthInput.value,
                    brightness: brightnessInput.value,
                    contrast: contrastInput.value,
                    gamma: gammaInput.value,
                    shadows: shadowsInput.value,
                    midtones: midtonesInput.value,
                    highlights: highlightsInput.value,
                    invert: invertToggle.checked,
                    upscale: upscaleToggle.checked,
                    imageWidth: imageWidthInput.value,
                    imageHeight: imageHeightInput.value,
                    lockAspect: lockAspectToggle.checked,
                    border: borderInput.value,
                    minSize: minSizeInput.value,
                    maxSize: maxSizeInput.value,
                    preBlur: parseFloat(preBlurInput.value) || 0,
                    wavelength: wavelengthInput.value,
                    amplitude: amplitudeInput.value,
                    centerOffsetX: centerOffsetXInput.value,
                    centerOffsetY: centerOffsetYInput.value,
                    offsetOddLines: offsetOddLinesToggle.checked,
                    darkBoost: darkBoostToggle.checked,
                    fixedSizes: fixedSizesToggle.checked
                };
            } else {
                preset = {
                    materialThickness: materialThicknessInput.value,
                    safeHeight: safeHeightInput.value,
                    spindleSpeed: spindleSpeedInput.value,
                    cuttingFeedRate: cuttingFeedRateInput.value,
                    borderCuttingFeedRate: borderCuttingFeedRateInput.value,
                    plungeFeedRate: plungeFeedRateInput.value,
                    vbitAngle: vbitAngleSelect.value,
                    workZeroPosition: workZeroSelect.value,
                    endPosition: endPositionSelect.value,
                    toolChange: toolChangeToggle.checked,
                    vbitToolNumber: vbitToolNumberInput.value,
                    boundaryToolNumber: boundaryToolNumberInput.value,
                    ramping: rampingToggle.checked,
                    rampDistance: rampDistanceInput.value,
                    boundary: boundaryToggle.checked,
                    boundaryToolSize: boundaryToolSizeInput.value,
                    boundaryPassDepth: boundaryPassDepthInput.value,
                    includeBoundaryInGcode: includeBoundaryInGcodeToggle.checked,
                    multiPassCount: multiPassCountInput.value,
                    depthPerPass: depthPerPassInput.value,
                    lineNumbers: lineNumbersToggle.checked,
                    optimizeToolpath: optimizeToolpathToggle.checked,
                    filename: filenameInput.value,
                    fileType: fileTypeSelect.value,
                    plotterMode: plotterModeToggle.checked,
                    plotterLineWidthMethod: plotterLineWidthMethod?.value || 'pressure',
                    plotterPressureMin: plotterPressureMinInput?.value || 0,
                    plotterPressureMax: plotterPressureMaxInput?.value || -0.5,
                    plotterLineWidthLight: plotterLineWidthLightInput?.value || 0.3,
                    plotterLineWidthHeavy: plotterLineWidthHeavyInput?.value || 1.0,
                    plotterPenWidth: plotterPenWidthInput?.value || 0.5,
                    plotterPenSize: plotterPenSizeInput?.value || 0.5
                };
            }

            const presets = JSON.parse(localStorage.getItem(storageKey) || '{}');
            presets[presetName] = preset;
            localStorage.setItem(storageKey, JSON.stringify(presets));

            // Change button to green "Saved" state
            saveButton.textContent = 'Saved!';
            saveButton.style.background = '#28a745';
            saveButton.style.pointerEvents = 'none';

            // Disable input
            nameInput.disabled = true;

            // Close modal after 1.2 seconds
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 1200);
            return;
        }

        if (e.target.classList.contains('preset-name') || e.target.classList.contains('preset-item')) {
            // Only load presets in load mode, not in save mode
            if (mode === 'load') {
                let presetName;
                if (e.target.classList.contains('preset-name')) {
                    presetName = e.target.textContent;
                } else {
                    presetName = e.target.querySelector('.preset-name').textContent;
                }

                const preset = presets[presetName];
                if (!preset) return;

                if (type === 'image') {
                    patternTypeSelect.value = preset.patternType;
                    spacingInput.value = preset.spacing || preset.lineSpacing || 1;
                    angleInput.value = preset.angle;
                    crosshatchAngle2Input.value = preset.crosshatchAngle2;
                    maxDepthInput.value = preset.maxDepth;
                    brightnessInput.value = preset.brightness;
                    contrastInput.value = preset.contrast;
                    gammaInput.value = preset.gamma;
                    shadowsInput.value = preset.shadows !== undefined ? preset.shadows : 0;
                    midtonesInput.value = preset.midtones !== undefined ? preset.midtones : 1.0;
                    highlightsInput.value = preset.highlights !== undefined ? preset.highlights : 255;
                    invertToggle.checked = preset.invert;
                    upscaleToggle.checked = preset.upscale || false;
                    imageWidthInput.value = preset.imageWidth;
                    imageHeightInput.value = preset.imageHeight || preset.imageWidth;
                    lockAspectToggle.checked = preset.lockAspect !== undefined ? preset.lockAspect : true;
                    borderInput.value = preset.border || 0.25;
                    minSizeInput.value = preset.minSize !== undefined ? preset.minSize : 0;
                    maxSizeInput.value = preset.maxSize !== undefined ? preset.maxSize : 1;
                    wavelengthInput.value = preset.wavelength || 5;
                    amplitudeInput.value = preset.amplitude || 0.5;
                    centerOffsetXInput.value = preset.centerOffsetX || 0;
                    centerOffsetYInput.value = preset.centerOffsetY || 0;
                    offsetOddLinesToggle.checked = preset.offsetOddLines || false;
                    darkBoostToggle.checked = preset.darkBoost || false;
                    fixedSizesToggle.checked = preset.fixedSizes || false;
                    patternTypeSelect.dispatchEvent(new Event('change'));
                } else {
                    materialThicknessInput.value = preset.materialThickness;
                    safeHeightInput.value = preset.safeHeight;
                    spindleSpeedInput.value = preset.spindleSpeed;
                    cuttingFeedRateInput.value = preset.cuttingFeedRate;
                    borderCuttingFeedRateInput.value = preset.borderCuttingFeedRate || preset.cuttingFeedRate;
                    plungeFeedRateInput.value = preset.plungeFeedRate;
                    vbitAngleSelect.value = preset.vbitAngle;
                    workZeroSelect.value = preset.workZeroPosition;
                    endPositionSelect.value = preset.endPosition;
                    toolChangeToggle.checked = preset.toolChange;
                    vbitToolNumberInput.value = preset.vbitToolNumber || 1;
                    boundaryToolNumberInput.value = preset.boundaryToolNumber || 2;
                    rampingToggle.checked = preset.ramping;
                    rampDistanceInput.value = preset.rampDistance;
                    boundaryToggle.checked = preset.boundary;
                    boundaryToolSizeInput.value = preset.boundaryToolSize || 3.175;
                    boundaryPassDepthInput.value = preset.boundaryPassDepth || 0.5;
                    includeBoundaryInGcodeToggle.checked = preset.includeBoundaryInGcode !== undefined ? preset.includeBoundaryInGcode : true;
                    multiPassCountInput.value = preset.multiPassCount || 1;
                    depthPerPassInput.value = preset.depthPerPass !== undefined ? preset.depthPerPass : 0.1;
                    lineNumbersToggle.checked = preset.lineNumbers || false;
                    optimizeToolpathToggle.checked = preset.optimizeToolpath !== undefined ? preset.optimizeToolpath : true;
                    if (preset.filename) filenameInput.value = preset.filename;
                    if (preset.fileType) fileTypeSelect.value = preset.fileType;
                    plotterModeToggle.checked = preset.plotterMode || false;
                    if (plotterLineWidthMethod) plotterLineWidthMethod.value = preset.plotterLineWidthMethod || 'pressure';
                    if (plotterPressureMinInput) plotterPressureMinInput.value = preset.plotterPressureMin || 0;
                    if (plotterPressureMaxInput) plotterPressureMaxInput.value = preset.plotterPressureMax || -0.5;
                    if (plotterLineWidthLightInput) plotterLineWidthLightInput.value = preset.plotterLineWidthLight || 0.3;
                    if (plotterLineWidthHeavyInput) plotterLineWidthHeavyInput.value = preset.plotterLineWidthHeavy || 1.0;
                    if (plotterPenWidthInput) plotterPenWidthInput.value = preset.plotterPenWidth || 0.5;
                    if (plotterPenSizeInput) plotterPenSizeInput.value = preset.plotterPenSize || 0.5;
                    toolChangeToggle.dispatchEvent(new Event('change'));
                    rampingToggle.dispatchEvent(new Event('change'));
                    boundaryToggle.dispatchEvent(new Event('change'));
                    plotterModeToggle.dispatchEvent(new Event('change'));
                }

                if (autoUpdateEnabled && currentImage) {
                    updateHalftonePreview();
                }

                // Update modal to show "Loaded" confirmation
                modal.innerHTML = `
                    <h3 style="color: #28a745;">Loaded!</h3>
                    <p style="margin: 10px 0; color: var(--text-color); font-size: 1.1em;">"${presetName}"</p>
                `;

                // Close modal after 1.2 seconds
                setTimeout(() => {
                    document.body.removeChild(overlay);
                }, 1200);
                return;
            }
        }

        if (e.target.classList.contains('preset-delete-btn')) {
            e.stopPropagation();
            const deleteButton = e.target;
            const presetName = deleteButton.getAttribute('data-preset');

            // Check if button is already in confirm state
            if (deleteButton.textContent === 'Confirm?') {
                // User confirmed - delete the preset
                const presets = JSON.parse(localStorage.getItem(storageKey) || '{}');
                delete presets[presetName];
                localStorage.setItem(storageKey, JSON.stringify(presets));

                // Clear default if this was the default preset
                const defaultPresetKey = type === 'image' ? 'defaultImagePreset' : 'defaultCncPreset';
                const currentDefault = localStorage.getItem(defaultPresetKey);
                if (currentDefault === presetName) {
                    localStorage.removeItem(defaultPresetKey);
                }

                document.body.removeChild(overlay);
                showPresetModal('load', type);
            } else {
                // First click - change to confirm state
                deleteButton.textContent = 'Confirm?';
                deleteButton.style.background = '#28a745';

                // Reset after 3 seconds if not confirmed
                setTimeout(() => {
                    if (deleteButton.textContent === 'Confirm?') {
                        deleteButton.textContent = 'Delete';
                        deleteButton.style.background = '#dc3545';
                    }
                }, 3000);
            }
        }
    });

    if (mode === 'save') {
        document.getElementById('presetNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                modal.querySelector('.save').click();
            }
        });
    }
}

function showDefaultPresetsModal() {
    const imagePresets = JSON.parse(localStorage.getItem('imagePresets') || '{}');
    const cncPresets = JSON.parse(localStorage.getItem('cncPresets') || '{}');
    const imagePresetNames = Object.keys(imagePresets);
    const cncPresetNames = Object.keys(cncPresets);

    const currentImageDefault = localStorage.getItem('defaultImagePreset');
    const currentCncDefault = localStorage.getItem('defaultCncPreset');

    const overlay = document.createElement('div');
    overlay.className = 'preset-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'preset-modal';

    // Build Image preset dropdown
    let imageOptions = '<option value="">None</option>';
    imagePresetNames.forEach(name => {
        const selected = name === currentImageDefault ? 'selected' : '';
        imageOptions += `<option value="${name}" ${selected}>${name}</option>`;
    });

    // Build CNC preset dropdown
    let cncOptions = '<option value="">None</option>';
    cncPresetNames.forEach(name => {
        const selected = name === currentCncDefault ? 'selected' : '';
        cncOptions += `<option value="${name}" ${selected}>${name}</option>`;
    });

    modal.innerHTML = `
        <h3>Set Default Presets</h3>
        <p style="margin: 10px 0; color: var(--text-secondary); font-size: 0.9em;">Select presets to automatically load when you open the app:</p>
        <div style="margin: 20px 0;">
            <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-color);">Image Preset:</label>
            <select id="defaultImagePresetDropdown" class="preset-dropdown">
                ${imageOptions}
            </select>
        </div>
        <div style="margin: 20px 0;">
            <label style="display: block; font-weight: 600; margin-bottom: 8px; color: var(--text-color);">CNC Preset:</label>
            <select id="defaultCncPresetDropdown" class="preset-dropdown">
                ${cncOptions}
            </select>
        </div>
        <div class="preset-buttons">
            <button class="preset-modal-btn cancel">Cancel</button>
            <button class="preset-modal-btn save">Save</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('cancel')) {
            document.body.removeChild(overlay);
            return;
        }

        if (e.target.classList.contains('save')) {
            const imageSelect = document.getElementById('defaultImagePresetDropdown');
            const cncSelect = document.getElementById('defaultCncPresetDropdown');
            const saveButton = e.target;

            const selectedImage = imageSelect.value;
            const selectedCnc = cncSelect.value;

            // Save Image default
            if (selectedImage) {
                localStorage.setItem('defaultImagePreset', selectedImage);
            } else {
                localStorage.removeItem('defaultImagePreset');
            }

            // Save CNC default
            if (selectedCnc) {
                localStorage.setItem('defaultCncPreset', selectedCnc);
            } else {
                localStorage.removeItem('defaultCncPreset');
            }

            // Change button to green "Saved" state
            saveButton.textContent = 'Saved!';
            saveButton.style.background = '#28a745';
            saveButton.style.pointerEvents = 'none';

            // Close modal after 1.2 seconds
            setTimeout(() => {
                document.body.removeChild(overlay);
            }, 1200);
        }
    });
}

function showExportModal() {
    const imagePresets = JSON.parse(localStorage.getItem('imagePresets') || '{}');
    const cncPresets = JSON.parse(localStorage.getItem('cncPresets') || '{}');
    const imagePresetNames = Object.keys(imagePresets);
    const cncPresetNames = Object.keys(cncPresets);

    if (imagePresetNames.length === 0 && cncPresetNames.length === 0) {
        alert('No presets to export. Save some presets first!');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'preset-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'preset-modal';

    let presetList = '';

    if (imagePresetNames.length > 0) {
        presetList += '<h4 style="margin: 10px 0; color: var(--text-secondary);">Image Presets:</h4>';
        presetList += imagePresetNames.map(name =>
            `<div class="preset-item export-item" data-type="image" data-name="${name}">
                <span class="preset-name">${name}</span>
            </div>`
        ).join('');
    }

    if (cncPresetNames.length > 0) {
        presetList += '<h4 style="margin: 10px 0; color: var(--text-secondary);">CNC Presets:</h4>';
        presetList += cncPresetNames.map(name =>
            `<div class="preset-item export-item" data-type="cnc" data-name="${name}">
                <span class="preset-name">${name}</span>
            </div>`
        ).join('');
    }

    modal.innerHTML = `
        <h3>Export Preset</h3>
        <p style="margin: 10px 0; color: var(--text-secondary); font-size: 0.9em;">Select a preset to export:</p>
        <div class="preset-list">${presetList}</div>
        <div class="preset-buttons">
            <button class="preset-modal-btn cancel">Cancel</button>
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', async (e) => {
        if (e.target === overlay || e.target.classList.contains('cancel')) {
            document.body.removeChild(overlay);
            return;
        }

        const exportItem = e.target.closest('.export-item');
        if (exportItem) {
            const type = exportItem.getAttribute('data-type');
            const presetName = exportItem.getAttribute('data-name');
            const storageKey = type === 'image' ? 'imagePresets' : 'cncPresets';
            const presets = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const preset = presets[presetName];

            const exportData = {
                type: type === 'image' ? 'imagePreset' : 'cncPreset',
                presetName: presetName,
                preset: preset,
                exportedAt: new Date().toISOString()
            };

            const presetJson = JSON.stringify(exportData, null, 2);
            const filename = `${presetName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${type}_preset.json`;

            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [{
                            description: 'Preset Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    const writable = await fileHandle.createWritable();
                    await writable.write(presetJson);
                    await writable.close();
                    document.body.removeChild(overlay);
                    alert(`Preset "${presetName}" exported successfully!`);
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        console.error('Error exporting preset:', err);
                        alert('Error exporting preset.');
                    }
                }
            } else {
                const blob = new Blob([presetJson], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                a.click();
                URL.revokeObjectURL(url);
                document.body.removeChild(overlay);
                alert(`Preset "${presetName}" downloaded!`);
            }
        }
    });
}

// Update the duplicate pattern type change handler
patternTypeSelect.addEventListener('change', () => {
    const patternType = patternTypeSelect.value;

    // Update label based on pattern type (if label element exists)
    if (spacingLabel) {
        if (patternType === 'lines') {
            spacingLabel.textContent = 'Line Spacing (mm):';
        } else if (patternType === 'circles') {
            spacingLabel.textContent = 'Circle Spacing (mm):';
        } else if (patternType === 'squares') {
            spacingLabel.textContent = 'Square Spacing (mm):';
        } else if (patternType === 'dots') {
            spacingLabel.textContent = 'Dot Spacing (mm):';
        } else if (patternType === 'stipple') {
            spacingLabel.textContent = 'Stipple Density (mm):';
        } else if (patternType === 'crosshatch') {
            spacingLabel.textContent = 'Line Spacing (mm):';
        }
    }

    if (autoUpdateEnabled && currentImage) {
        debounceUpdatePreview();
    }
});

// Debounce function to avoid updating too frequently
let updateTimeout;
function debounceUpdatePreview() {
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updateHalftonePreview();
    }, 300); // Wait 300ms after user stops adjusting
}

// Refactored image file handler
function handleImageFile(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            currentImage = img;

            // Set height based on aspect ratio
            const aspectRatio = img.height / img.width;
            const currentWidth = parseFloat(imageWidthInput.value);
            imageHeightInput.value = (currentWidth * aspectRatio).toFixed(2);

            displayOriginalImage(img);
            
            // Keep halftone preview visible by default
            originalCanvas.style.display = 'none';
            halftoneCanvas.style.display = 'block';
            imageToggle.checked = false;
            // previewTitle.textContent = 'Halftone Preview'; // Removed
            previewInfo.textContent = `Image loaded: ${img.width}×${img.height}px`;
            previewInfo.style.color = '#28a745';
            
            generatePreviewButton.disabled = false;
            generateGcodeButton.disabled = true;
            currentHalftoneData = null;

            // Clear previous halftone preview and gcode
            const ctx = halftoneCanvas.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, halftoneCanvas.width, halftoneCanvas.height);

            // Clear Monaco Editor
            if (window.monacoGcode) {
                window.monacoGcode.clear();
            }
            window.currentGcodeContent = '';

            downloadButton.disabled = true;
            gcodeInfo.textContent = '';
            timeEstimate.textContent = '';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// Image upload handler
imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
});

// Display original image
function displayOriginalImage(img) {
    const ctx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const maxSize = 400;
    let width = img.width;
    let height = img.height;

    if (width > height) {
        if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
        }
    } else {
        if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
        }
    }

    originalCanvas.width = width;
    originalCanvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);
}

// Generate halftone preview
generatePreviewButton.addEventListener('click', () => {
    updateHalftonePreview();
});

// Monitor halftone parameter changes to show warning
[
    spacingInput, angleInput, crosshatchAngle2Input, imageWidthInput, imageHeightInput,
    borderInput, brightnessInput, contrastInput, gammaInput, minSizeInput, maxSizeInput,
    wavelengthInput, amplitudeInput, centerOffsetXInput, centerOffsetYInput,
    invertToggle, upscaleToggle, lockAspectToggle, offsetOddLinesToggle, darkBoostToggle,
    fixedSizesToggle, plotterModeToggle, plotterPenWidthInput, patternTypeSelect
].forEach(element => {
    if (element) {
        const eventType = element.tagName === 'INPUT' && element.type === 'checkbox' ? 'change' : 'input';
        element.addEventListener(eventType, updateHalftoneWarning);
    }
});

// Capture halftone state for comparison
function captureHalftoneState() {
    return {
        spacing: parseFloat(spacingInput.value),
        angle: parseFloat(angleInput.value),
        angle2: parseFloat(crosshatchAngle2Input.value),
        imageWidth: parseFloat(imageWidthInput.value),
        imageHeight: parseFloat(imageHeightInput.value),
        border: parseFloat(borderInput.value),
        brightness: parseFloat(brightnessInput.value),
        contrast: parseFloat(contrastInput.value),
        gamma: parseFloat(gammaInput.value),
        shadows: parseFloat(shadowsInput.value),
        midtones: parseFloat(midtonesInput.value),
        highlights: parseFloat(highlightsInput.value),
        minSize: parseFloat(minSizeInput.value),
        maxSize: parseFloat(maxSizeInput.value),
        wavelength: parseFloat(wavelengthInput.value),
        amplitude: parseFloat(amplitudeInput.value),
        centerOffsetX: parseFloat(centerOffsetXInput.value),
        centerOffsetY: parseFloat(centerOffsetYInput.value),
        patternType: patternTypeSelect.value,
        invert: invertToggle.checked,
        upscale: upscaleToggle.checked,
        lockAspect: lockAspectToggle.checked,
        offsetOddLines: offsetOddLinesToggle.checked,
        darkBoost: darkBoostToggle.checked,
        fixedSizes: fixedSizesToggle.checked,
        penWidth: parseFloat(plotterPenWidthInput?.value || 0.5),
        plotterMode: plotterModeToggle.checked
    };
}

// Check if halftone has changed since G-code generation
function halftoneHasChanged() {
    if (!lastGeneratedHalftoneState) return false;
    const currentState = captureHalftoneState();
    return JSON.stringify(currentState) !== JSON.stringify(lastGeneratedHalftoneState);
}

// Show/hide halftone change warning
function updateHalftoneWarning() {
    const gcodeOutputSection = document.querySelector('.output-section');
    let warningElement = document.getElementById('halftoneChangedWarning');
    
    if (halftoneHasChanged()) {
        if (!warningElement) {
            warningElement = document.createElement('div');
            warningElement.id = 'halftoneChangedWarning';
            warningElement.className = 'warning-banner';
            warningElement.innerHTML = '⚠️ Halftone parameters have changed since G-code was generated. Generate new G-code to reflect the changes.';
            warningElement.style.cssText = 'background-color: #fff3cd; color: #856404; padding: 12px; border-left: 4px solid #ffc107; margin-bottom: 15px; border-radius: 4px; font-size: 14px;';
            gcodeOutputSection?.insertBefore(warningElement, gcodeOutputSection.firstChild);
        }
        
        // Auto-update preview if auto-update is enabled
        if (autoUpdateEnabled && currentImage) {
            updateHalftonePreview();
        }
    } else {
        warningElement?.remove();
    }
}

// High-quality image upscaling using Pica library
async function upscaleImageWithPica(imageData, width, height, scale) {
    // Check if Pica is available
    if (!window.pica) {
        console.warn('Pica library not loaded, using fallback');
        // Fallback: return original data and let worker handle it
        return { data: imageData, width: width, height: height };
    }

    try {
        // Create source canvas
        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = width;
        srcCanvas.height = height;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.putImageData(new ImageData(imageData, width, height), 0, 0);

        // Create destination canvas
        const destCanvas = document.createElement('canvas');
        destCanvas.width = Math.floor(width * scale);
        destCanvas.height = Math.floor(height * scale);

        // Use Pica for high-quality resize with Lanczos3 filtering
        const pica = window.pica();
        await pica.resize(srcCanvas, destCanvas, {
            quality: 3,         // 0-3, 3 is highest quality (Lanczos3)
            alpha: true,        // Preserve alpha channel
            unsharpAmount: 80,  // Slight sharpening (0-500)
            unsharpRadius: 0.6, // Sharpening radius
            unsharpThreshold: 2 // Sharpening threshold
        });

        // Get upscaled ImageData
        const destCtx = destCanvas.getContext('2d');
        const upscaledImageData = destCtx.getImageData(0, 0, destCanvas.width, destCanvas.height);

        return {
            data: upscaledImageData.data,
            width: destCanvas.width,
            height: destCanvas.height
        };
    } catch (error) {
        console.error('Pica upscaling failed:', error);
        // Fallback to original data
        return { data: imageData, width: width, height: height };
    }
}

// Update halftone preview function
async function updateHalftonePreview() {
    if (!currentImage) return;

    let spacing = parseFloat(spacingInput.value);
    const angle = parseFloat(angleInput.value);
    const angle2 = parseFloat(crosshatchAngle2Input.value);
    const outputWidth = parseFloat(imageWidthInput.value);
    const outputHeight = parseFloat(imageHeightInput.value);
    const border = parseFloat(borderInput.value);
    const brightness = parseFloat(brightnessInput.value);
    const contrast = parseFloat(contrastInput.value);
    const gamma = parseFloat(gammaInput.value);
    const minSize = parseFloat(minSizeInput.value);
    const maxSize = parseFloat(maxSizeInput.value);
    const wavelength = parseFloat(wavelengthInput.value);
    const amplitude = parseFloat(amplitudeInput.value);
    const centerOffsetX = parseFloat(centerOffsetXInput.value);
    const centerOffsetY = parseFloat(centerOffsetYInput.value);
    const patternType = patternTypeSelect.value;
    const invert = invertToggle.checked;
    const upscale = upscaleToggle.checked;
    const lockAspect = lockAspectToggle.checked;
    const offsetOddLines = offsetOddLinesToggle.checked;
    const darkBoost = darkBoostToggle.checked;
    const fixedSizes = fixedSizesToggle.checked;
    
    // Adjust spacing for plotter mode based on pen size (only for Set Pen Size method)
    if (plotterModeToggle.checked) {
        const plotterMethod = plotterLineWidthMethod?.value || 'pressure';
        if (plotterMethod === 'setPenSize') {
            const penSize = parseFloat(plotterPenSizeInput?.value || 0.5);
            // Pen size should influence minimum line spacing - larger pens need coarser halftones
            // Scale spacing proportionally to pen size (1.0mm pen = 1x spacing, 0.5mm pen = 0.5x spacing)
            spacing = spacing * (penSize / 0.5);
        }
        // For pressure-based method, don't adjust spacing since pen width varies with pressure
    }

    // Show loading message
    previewInfo.textContent = 'Generating preview... 0%';
    previewInfo.style.color = '#5B9BD5';
    previewProgress.textContent = '0%';
    previewProgress.style.display = 'inline';
    
    // Reset progressive arrays
    progressiveLines = [];
    progressiveElements = [];

    startTime = performance.now();

    // Initialize worker if not already done
    if (!halftoneWorker) {
        const workerReady = initWorker();
        if (workerReady === false) {
            // Fallback to synchronous generation
            useSynchronousGeneration();
            return;
        }
    }

    // Clear old data to free memory
    if (currentHalftoneData) {
        currentHalftoneData = null;
    }
    progressiveLines = [];
    progressiveElements = [];

    // Get image data
    const ctx = originalCanvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, originalCanvas.width, originalCanvas.height);

    // Prepare image data for worker
    let processedImageData = imageData.data;
    let processedWidth = originalCanvas.width;
    let processedHeight = originalCanvas.height;

    // Use Pica for high-quality upscaling if enabled
    if (upscale) {
        previewInfo.textContent = 'Upscaling image with Pica (Lanczos3)...';
        previewInfo.style.color = '#5B9BD5';

        const upscaled = await upscaleImageWithPica(imageData.data, originalCanvas.width, originalCanvas.height, 4);
        processedImageData = upscaled.data;
        processedWidth = upscaled.width;
        processedHeight = upscaled.height;

        previewInfo.textContent = 'Generating preview... 0%';
    }

    // Create transferable copy of image data buffer
    const imageBuffer = processedImageData.buffer.slice(0);

    // Send work to Web Worker using transferable objects (zero-copy transfer)
    try {
        const shadows = parseFloat(shadowsInput.value);
        const midtones = parseFloat(midtonesInput.value);
        const highlights = parseFloat(highlightsInput.value);
        halftoneWorker.postMessage({
        action: 'generateHalftone',
        data: {
            imageData: new Uint8ClampedArray(imageBuffer),
            width: processedWidth,
            height: processedHeight,
            spacing: spacing,
            angle: angle,
            angle2: angle2,
            outputWidthMM: outputWidth,
            patternType: patternType,
            brightness: brightness,
            contrast: contrast,
            invert: invert,
            gamma: gamma,
            shadows: shadows,
            midtones: midtones,
            highlights: highlights,
            upscale: false,  // Already upscaled with Pica if needed, worker doesn't need to upscale
            options: {
                border, minSize, maxSize, wavelength, amplitude, 
                centerOffsetX, centerOffsetY, offsetOddLines, 
                darkBoost, fixedSizes, outputHeight, lockAspect
            }
        }
    }, [imageBuffer]);
    } catch (error) {
        console.error('Worker communication failed:', error);
        // Fallback to synchronous generation
        useSynchronousGeneration();
    }
    
    // Synchronous fallback function with simulated progress
    function useSynchronousGeneration() {
        const fallbackStart = performance.now();
        
        previewInfo.textContent = 'Generating preview... 0%';
        previewInfo.style.color = '#5B9BD5';
        previewProgress.textContent = '0%';
        previewProgress.style.display = 'inline';
        
        // Simulate progress updates
        let progressPercent = 0;
        const progressInterval = setInterval(() => {
            progressPercent = Math.min(progressPercent + 8, 95);
            previewInfo.textContent = `Generating preview... ${progressPercent}%`;
            previewProgress.textContent = `${progressPercent}%`;
        }, 50);
        
        setTimeout(() => {
            try {
                currentHalftoneData = generateHalftone(currentImage, spacing, angle, outputWidth, patternType, brightness, contrast, invert, gamma, angle2, upscale, {
                    border, minSize, maxSize, wavelength, amplitude, centerOffsetX, centerOffsetY, offsetOddLines, darkBoost, fixedSizes, outputHeight, lockAspect, shadowsLevel: parseFloat(shadowsInput.value), midtonesLevel: parseFloat(midtonesInput.value), highlightsLevel: parseFloat(highlightsInput.value)
                });
                
                clearInterval(progressInterval);
                previewInfo.textContent = 'Generating preview... 100%';
                previewProgress.textContent = '100%';
                
                // Small delay to show 100%
                setTimeout(() => {
                    displayHalftone(currentHalftoneData);

                    // Auto-set plotter line width heavy to match max line width
                    if (currentHalftoneData.maxSize) {
                        const plotterLineWidthHeavyInput = document.getElementById('plotterLineWidthHeavy');
                        if (plotterLineWidthHeavyInput) {
                            // Set the value to max line width
                            plotterLineWidthHeavyInput.value = currentHalftoneData.maxSize.toFixed(1);
                            // Set the minimum to max line width so user can't go smaller
                            plotterLineWidthHeavyInput.min = currentHalftoneData.maxSize.toFixed(1);
                        }
                    }

                    generateGcodeButton.disabled = false;
                    
                    const fallbackEnd = performance.now();
                    const duration = ((fallbackEnd - fallbackStart) / 1000).toFixed(2);
                    
                    const elementCount = (patternType === 'lines' || patternType === 'crosshatch') ? currentHalftoneData.lines.length : currentHalftoneData.elements?.length || 0;
                    const patternNames = {
                        'lines': 'lines',
                        'circles': 'circles',
                        'squares': 'squares',
                        'dots': 'dots',
                        'stipple': 'stipple points',
                        'crosshatch': 'lines'
                    };
                    const elementName = patternNames[patternType] || 'elements';
                    previewInfo.textContent = `${elementCount} ${elementName} • ${currentHalftoneData.width.toFixed(0)}×${currentHalftoneData.height.toFixed(0)}mm`;
                    previewInfo.style.color = '#28a745';
                    previewProgress.style.display = 'none';

                    // Show the halftone info button - Removed
                    // if (showHalftoneInfoButton) {
                    //     showHalftoneInfoButton.style.display = 'block';
                    // }
                }, 100);
            } catch (error) {
                clearInterval(progressInterval);
                previewInfo.textContent = 'Error generating preview';
                previewInfo.style.color = '#dc3545';
                previewProgress.style.display = 'none';
                console.error(error);
            }
        }, 10);
    }
}

// Generate G-code
generateGcodeButton.addEventListener('click', () => {
    if (!currentHalftoneData) return;

    const maxDepth = parseFloat(maxDepthInput.value);
    const materialThickness = parseFloat(materialThicknessInput.value);
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
    const boundaryPassDepth = parseFloat(boundaryPassDepthInput.value);
    const multiPassCount = parseInt(multiPassCountInput.value);
    const depthPerPass = parseFloat(depthPerPassInput.value);
    const ramping = rampingToggle.checked;
    const rampDistance = parseFloat(rampDistanceInput.value);
    const boundary = boundaryToggle.checked;
    const includeBoundaryInGcode = includeBoundaryInGcodeToggle.checked;
    const includeLineNumbers = lineNumbersToggle.checked;
    const optimizeToolpathEnabled = optimizeToolpathToggle.checked;
    const bidirectional = bidirectionalToggle.checked;
    const plotterMode = plotterModeToggle.checked;

    gcodeOutput.value = 'Generating G-code...';
    gcodeInfo.textContent = 'Calculating...';
    gcodeInfo.style.color = '#5B9BD5';
    gcodeProgress.textContent = '0%';
    gcodeProgress.style.display = 'inline';
    timeEstimate.textContent = '';

    // Initialize worker if needed
    if (!halftoneWorker && !initWorker()) {
        // Fallback to synchronous generation
        setTimeout(() => {
            try {
                const borderCuttingFeedRate = parseFloat(borderCuttingFeedRateInput.value) || cuttingFeedRate;
                const result = generateGcode(currentHalftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero, spindleSpeed, toolChange, vbitToolNumber, boundaryToolNumber, boundaryToolSize, materialThickness, boundaryPassDepth, multiPassCount, ramping, rampDistance, boundary, includeBoundaryInGcode, includeLineNumbers, optimizeToolpathEnabled, bidirectional, borderCuttingFeedRate, plotterMode);
                
                gcodeProgress.textContent = '100%';
                gcodeOutput.value = result.gcode;
                downloadButton.disabled = false;
                
                // Capture halftone state after successful G-code generation
                lastGeneratedHalftoneState = captureHalftoneState();
                updateHalftoneWarning();

                // Store boundary G-code if it was generated separately
                if (boundary && !includeBoundaryInGcode && result.boundaryGcode) {
                    currentBoundaryGcode = result.boundaryGcode;
                    downloadBoundaryButton.disabled = false;
                    downloadBoundaryButton.style.display = 'block';
                } else {
                    currentBoundaryGcode = null;
                    downloadBoundaryButton.disabled = true;
                    downloadBoundaryButton.style.display = 'none';
                }

                const minutes = Math.floor(result.estimatedTime / 60);
                const seconds = Math.round(result.estimatedTime % 60);
                timeEstimate.textContent = `Est. time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
                gcodeInfo.textContent = `${result.totalDistance.toFixed(1)}mm distance • ${result.lineCount} lines • ${result.rapidMoveCount || 0} rapid moves`;
                gcodeInfo.style.color = '#28a745';
                gcodeProgress.style.display = 'none';
            } catch (error) {
                gcodeProgress.style.display = 'none';
                gcodeOutput.value = 'Error generating G-code: ' + error.message;
                gcodeInfo.textContent = 'Error calculating estimate';
                gcodeInfo.style.color = '#dc3545';
                console.error(error);
            }
        }, 10);
        return;
    }

    // Use worker for G-code generation
    startTime = performance.now();
    
    const borderCuttingFeedRate = parseFloat(borderCuttingFeedRateInput.value) || cuttingFeedRate;
    
    halftoneWorker.postMessage({
        action: 'generateGcode',
        data: {
            halftoneData: currentHalftoneData,
            maxDepth: plotterMode ? 0 : maxDepth,
            safeHeight,
            cuttingFeedRate: cuttingFeedRate, // Always use feed rate, even for plotter
            plungeFeedRate: plotterMode ? 0 : plungeFeedRate,
            vbitAngle: plotterMode ? 90 : vbitAngle,
            workZero,
            spindleSpeed: plotterMode ? 0 : spindleSpeed,
            toolChange: plotterMode ? false : toolChange,
            vbitToolNumber: plotterMode ? 1 : vbitToolNumber,
            boundaryToolNumber,
            boundaryToolSize,
            materialThickness: plotterMode ? 0 : materialThickness,
            boundaryPassDepth: plotterMode ? 0 : boundaryPassDepth,
            multiPassCount: plotterMode ? 1 : multiPassCount,
            depthPerPass: plotterMode ? 0.1 : depthPerPass,
            ramping: plotterMode ? false : ramping,
            rampDistance: plotterMode ? 0 : rampDistance,
            boundary: plotterMode ? false : boundary,
            includeBoundaryInGcode,
            includeLineNumbers,
            optimizeToolpathEnabled,
            bidirectional,
            borderCuttingFeedRate,
            plotterMode,
            plotterLineWidthMethod: plotterMode ? (plotterLineWidthMethod?.value || 'pressure') : 'pressure',
            plotterPressureMin: plotterMode ? parseFloat(plotterPressureMinInput?.value || 0) : 0,
            plotterPressureMax: plotterMode ? parseFloat(plotterPressureMaxInput?.value || -0.5) : -0.5,
            plotterPenWidth: plotterMode ? parseFloat(plotterPenWidthInput?.value || 0.5) : 0.5,
            plotterPenSize: plotterMode ? parseFloat(plotterPenSizeInput?.value || 0.5) : 0.5,
            plotterLineWidthLight: plotterMode ? parseFloat(plotterLineWidthLightInput?.value || 0.3) : 0.3,
            plotterLineWidthHeavy: plotterMode ? parseFloat(plotterLineWidthHeavyInput?.value || 1.0) : 1.0
        }
    });
});

// Apply brightness, contrast, gamma, and levels adjustments to grayscale data
function adjustBrightnessContrast(grayscale, brightness, contrast, invert = false, gamma = 1.0, darkBoost = false, shadowsLevel = 0, midtonesLevel = 1.0, highlightsLevel = 255) {
    // Convert brightness and contrast from -100 to +100 range
    const brightnessValue = (brightness / 100) * 255;
    const contrastFactor = (contrast + 100) / 100;

    const adjusted = new Uint8Array(grayscale.length);

    for (let i = 0; i < grayscale.length; i++) {
        let value = grayscale[i];

        // Apply invert first if enabled
        if (invert) {
            value = 255 - value;
        }

        // Apply levels adjustment (shadows/midtones/highlights)
        // Maps input range [shadowsLevel, highlightsLevel] to output [0, 255]
        value = ((value - shadowsLevel) / (highlightsLevel - shadowsLevel)) * 255;
        
        // Apply midtones adjustment (like gamma but specific to levels)
        if (midtonesLevel !== 1.0) {
            const normalized = Math.max(0, Math.min(1, value / 255));
            value = Math.pow(normalized, 1 / midtonesLevel) * 255;
        }

        // Apply dark boost - enhances contrast in darker areas
        if (darkBoost) {
            // Apply a power curve that boosts darker values more
            const normalized = value / 255;
            value = Math.pow(normalized, 0.7) * 255; // 0.7 power raises darker values
        }

        // Apply gamma correction (affects midtones)
        if (gamma !== 1.0) {
            const normalized = Math.max(0, Math.min(1, value / 255));
            value = Math.pow(normalized, 1 / gamma) * 255;
        }

        // Apply contrast (multiply from middle point)
        value = ((value - 128) * contrastFactor) + 128;

        // Apply brightness
        value = value + brightnessValue;

        // Clamp to 0-255
        adjusted[i] = Math.max(0, Math.min(255, value));
    }

    return adjusted;
}

// Apply Gaussian blur to prevent aliasing artifacts
function applyGaussianBlur(grayscale, width, height, radius) {
    if (radius <= 0) return grayscale;

    // Create kernel
    const kernelSize = Math.ceil(radius * 3) * 2 + 1;
    const kernel = new Float32Array(kernelSize);
    const sigma = radius / 2;
    const twoSigmaSquare = 2 * sigma * sigma;
    let sum = 0;

    const center = Math.floor(kernelSize / 2);
    for (let i = 0; i < kernelSize; i++) {
        const x = i - center;
        kernel[i] = Math.exp(-(x * x) / twoSigmaSquare);
        sum += kernel[i];
    }

    // Normalize kernel
    for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= sum;
    }

    // Horizontal pass
    const temp = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = 0; k < kernelSize; k++) {
                const sx = x + k - center;
                if (sx >= 0 && sx < width) {
                    value += grayscale[y * width + sx] * kernel[k];
                }
            }
            temp[y * width + x] = Math.round(value);
        }
    }

    // Vertical pass
    const blurred = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let value = 0;
            for (let k = 0; k < kernelSize; k++) {
                const sy = y + k - center;
                if (sy >= 0 && sy < height) {
                    value += temp[sy * width + x] * kernel[k];
                }
            }
            blurred[y * width + x] = Math.round(value);
        }
    }

    return blurred;
}

// Generate halftone pattern with different types
function generateHalftone(img, spacing, angle, outputWidthMM, patternType = 'lines', brightness = 0, contrast = 0, invert = false, gamma = 1.0, angle2 = 135, upscale = false, options = {}) {
    // Merge default options
    const opts = {
        border: 0.25,
        minSize: 0,
        maxSize: 2,
        wavelength: 0,
        amplitude: 0,
        centerOffsetX: 0,
        centerOffsetY: 0,
        offsetOddLines: false,
        darkBoost: false,
        fixedSizes: false,
        outputHeight: null,
        lockAspect: true,
        ...options
    };

    if (patternType === 'lines') {
        return generateLinePattern(img, spacing, angle, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    } else if (patternType === 'circles') {
        return generateCirclePattern(img, spacing, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    } else if (patternType === 'squares') {
        return generateSquarePattern(img, spacing, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    } else if (patternType === 'dots') {
        return generateDotPattern(img, spacing, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    } else if (patternType === 'stipple') {
        return generateStipplePattern(img, spacing, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    } else if (patternType === 'crosshatch') {
        return generateCrosshatchPattern(img, spacing, angle, angle2, outputWidthMM, brightness, contrast, invert, gamma, upscale, opts);
    }
}

// Generate halftone pattern with lines
function generateLinePattern(img, lineSpacing, angle, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    // Create temporary canvas for processing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    // Calculate dimensions maintaining aspect ratio or use custom height
    const aspectRatio = img.height / img.width;
    const outputHeightMM = options.lockAspect !== false ? (outputWidthMM * aspectRatio) : (options.outputHeight || outputWidthMM * aspectRatio);

    // Add border to total dimensions (border is added on all sides)
    const borderMM = options.border || 0;
    const totalWidthMM = outputWidthMM + (borderMM * 2);
    const totalHeightMM = outputHeightMM + (borderMM * 2);

    // Use dynamic resolution like halftoner app: 2.5 samples per spacing unit
    const samplesPerSpacing = 2.5;
    const resolution = Math.ceil(samplesPerSpacing / lineSpacing);

    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);
    const totalPixelWidth = Math.floor(totalWidthMM * resolution);
    const totalPixelHeight = Math.floor(totalHeightMM * resolution);
    const borderPx = borderMM * resolution;

    tempCanvas.width = pixelWidth;
    tempCanvas.height = pixelHeight;

    // Draw and convert to grayscale
    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const imageData = tempCtx.getImageData(0, 0, pixelWidth, pixelHeight);

    // Create grayscale array
    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply brightness, contrast, gamma, invert, and dark boost adjustments
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.darkBoost || options.shadowsLevel !== 0 || options.midtonesLevel !== 1.0 || options.highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, options.darkBoost || false, options.shadowsLevel || 0, options.midtonesLevel || 1.0, options.highlightsLevel || 255);
    }

    // Generate line pattern
    const angleRad = (angle * Math.PI) / 180;
    const lines = [];

    // Calculate spacing in pixels
    const spacingPx = lineSpacing * resolution;

    // Calculate perpendicular direction for line spacing
    const perpX = -Math.sin(angleRad);
    const perpY = Math.cos(angleRad);

    // Calculate parallel direction for line drawing
    const paraX = Math.cos(angleRad);
    const paraY = Math.sin(angleRad);

    // Calculate number of lines needed
    const diagonal = Math.sqrt(pixelWidth * pixelWidth + pixelHeight * pixelHeight);
    const numLines = Math.ceil(diagonal / spacingPx) + 2;

    // Center point
    const centerX = pixelWidth / 2;
    const centerY = pixelHeight / 2;

    // Generate lines - sample more sparsely to reduce memory
    // Offset lines by border amount so they're positioned correctly in the total area
    for (let i = -numLines / 2; i < numLines / 2; i++) {
        const line = generateLine(
            grayscale, pixelWidth, pixelHeight,
            centerX + perpX * i * spacingPx,
            centerY + perpY * i * spacingPx,
            paraX, paraY,
            resolution,
            options.wavelength || 0,
            options.amplitude || 0
        );

        if (line.length > 1) { // Only add lines with at least 2 points
            // Offset each point by the border amount
            const offsetLine = line.map(point => ({
                x: point.x + borderPx,
                y: point.y + borderPx,
                depth: point.depth
            }));
            lines.push(offsetLine);
        }
    }

    return {
        lines: lines,
        width: totalWidthMM,
        height: totalHeightMM,
        pixelWidth: totalPixelWidth,
        pixelHeight: totalPixelHeight,
        resolution: resolution,
        spacing: lineSpacing,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || lineSpacing,
        patternType: 'lines',
        border: borderMM
    };
}

// Generate concentric circles pattern (like halftoner app)
function generateCirclePattern(img, spacing, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const aspectRatio = img.height / img.width;
    const outputHeightMM = outputWidthMM * aspectRatio;

    // Add border to total dimensions
    const borderMM = options.border || 0;
    const totalWidthMM = outputWidthMM + (borderMM * 2);
    const totalHeightMM = outputHeightMM + (borderMM * 2);

    // Use dynamic resolution like halftoner app: 2.5 samples per spacing unit
    const samplesPerSpacing = 2.5;
    const resolution = Math.ceil(samplesPerSpacing / spacing);

    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);
    const totalPixelWidth = Math.floor(totalWidthMM * resolution);
    const totalPixelHeight = Math.floor(totalHeightMM * resolution);
    const borderPx = borderMM * resolution;

    tempCanvas.width = pixelWidth;
    tempCanvas.height = pixelHeight;

    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const imageData = tempCtx.getImageData(0, 0, pixelWidth, pixelHeight);

    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply brightness, contrast, gamma, and invert adjustments
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.shadowsLevel !== 0 || options.midtonesLevel !== 1.0 || options.highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, false, options.shadowsLevel || 0, options.midtonesLevel || 1.0, options.highlightsLevel || 255);
    }

    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;

    // Generate concentric circles from center (like halftoner app)
    const centerX = (outputWidthMM * 0.5) + (options.centerOffsetX || 0);
    const centerY = (outputHeightMM * 0.5) + (options.centerOffsetY || 0);
    const maxRadius = Math.sqrt(outputWidthMM ** 2 + outputHeightMM ** 2) * 0.5 +
                     Math.max(Math.abs(options.centerOffsetX || 0), Math.abs(options.centerOffsetY || 0)) * 1.42;
    // High quality mode like halftoner: 0.25 * 0.25 = 0.0625 for very dense sampling
    const pointSpacing = spacing * 0.0625; // Very fine sampling for crisp rendering

    const lines = [];

    for (let radius = 0; radius < maxRadius; radius += spacing) {
        let currentLine = [];
        let lastStep = -2;

        if (radius === 0) {
            // Center point - single dot
            const centerPx = {
                x: Math.floor(centerX * resolution),
                y: Math.floor(centerY * resolution)
            };

            if (centerPx.x >= 0 && centerPx.x < pixelWidth && centerPx.y >= 0 && centerPx.y < pixelHeight) {
                const index = centerPx.y * pixelWidth + centerPx.x;
                const bright = grayscale[index] / 255;
                const width = bright * maxSize;

                if (width > minSize) {
                    currentLine.push({
                        x: centerX + borderMM,
                        y: centerY + borderMM,
                        width: width
                    });
                }
            }
        } else {
            // Match halftoner: sample at each point individually
            const totalSteps = Math.max(8, Math.round((radius * 2 * Math.PI) / pointSpacing));
            const stepAngle = (totalSteps * pointSpacing) / radius / totalSteps;

            for (let step = 0, circleAngle = 0; circleAngle < 2 * Math.PI; circleAngle += stepAngle, step++) {
                const xMM = centerX + Math.sin(circleAngle) * radius;
                const yMM = centerY + Math.cos(circleAngle) * radius;

                // Check if within output area
                if (xMM >= 0 && xMM < outputWidthMM && yMM >= 0 && yMM < outputHeightMM) {
                    // Sample image at this point
                    const xPx = Math.floor(xMM * resolution);
                    const yPx = Math.floor(yMM * resolution);

                    if (xPx >= 0 && xPx < pixelWidth && yPx >= 0 && yPx < pixelHeight) {
                        const index = yPx * pixelWidth + xPx;
                        const bright = grayscale[index] / 255;
                        const width = bright * maxSize;

                        if (width > minSize) {
                            // If points were skipped, start new line segment
                            if (lastStep != step - 1 && currentLine.length > 0) {
                                lines.push(currentLine);
                                currentLine = [];
                            }

                            currentLine.push({
                                x: xMM + borderMM,
                                y: yMM + borderMM,
                                width: width
                            });
                            lastStep = step;
                        }
                    }
                }
            }
        }

        // Save the final line segment
        if (currentLine.length > 0) {
            lines.push(currentLine);
        }
    }

    return {
        lines: lines,
        width: totalWidthMM,
        height: totalHeightMM,
        pixelWidth: totalPixelWidth,
        pixelHeight: totalPixelHeight,
        resolution: resolution,
        spacing: spacing,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || spacing,
        patternType: 'circles',
        border: borderMM
    };
}

// Generate pattern with squares
function generateSquarePattern(img, spacing, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const aspectRatio = img.height / img.width;
    const outputHeightMM = outputWidthMM * aspectRatio;

    // Use dynamic resolution like halftoner app: 2.5 samples per spacing unit
    const samplesPerSpacing = 2.5;
    const resolution = Math.ceil(samplesPerSpacing / spacing);
    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);

    tempCanvas.width = pixelWidth;
    tempCanvas.height = pixelHeight;

    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const imageData = tempCtx.getImageData(0, 0, pixelWidth, pixelHeight);

    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply brightness, contrast, gamma, and invert adjustments
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.shadowsLevel !== 0 || options.midtonesLevel !== 1.0 || options.highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, false, options.shadowsLevel || 0, options.midtonesLevel || 1.0, options.highlightsLevel || 255);
    }

    const borderMM = options.border || 0;
    const borderPx = borderMM * resolution;
    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;

    const totalWidthMM = outputWidthMM + (2 * borderMM);
    const totalHeightMM = outputHeightMM + (2 * borderMM);
    const totalPixelWidth = pixelWidth + (2 * borderPx);
    const totalPixelHeight = pixelHeight + (2 * borderPx);

    // Generate concentric squares from center (like halftoner app)
    const centerX = (outputWidthMM * 0.5) + (options.centerOffsetX || 0);
    const centerY = (outputHeightMM * 0.5) + (options.centerOffsetY || 0);
    const maxRadius = Math.sqrt(outputWidthMM ** 2 + outputHeightMM ** 2) * 0.5 +
                     Math.max(Math.abs(options.centerOffsetX || 0), Math.abs(options.centerOffsetY || 0)) * 1.42;
    // High quality mode like halftoner: 0.25 * 0.25 = 0.0625 for very dense sampling
    const pointSpacing = spacing * 0.0625; // Very fine sampling for crisp rendering

    const lines = [];

    for (let size = 0; size < maxRadius * 2; size += spacing) {
        // For each square, walk around its perimeter
        const halfSize = size / 2;

        if (size === 0) {
            // Center point - single dot
            const centerPx = {x: Math.floor(centerX * resolution), y: Math.floor(centerY * resolution)};
            if (centerPx.x >= 0 && centerPx.x < pixelWidth && centerPx.y >= 0 && centerPx.y < pixelHeight) {
                const index = centerPx.y * pixelWidth + centerPx.x;
                const bright = grayscale[index] / 255;
                const width = bright * maxSize;
                if (width > minSize) {
                    lines.push([{x: centerX + borderMM, y: centerY + borderMM, width: width}]);
                }
            }
        } else {
            // Walk around the square perimeter
            // Top, Right, Bottom, Left edges
            const numPointsPerSide = Math.max(2, Math.round(size / pointSpacing));
            const stepSize = size / numPointsPerSide;

            let currentLine = [];

            // Top edge: left to right
            for (let i = 0; i <= numPointsPerSide; i++) {
                const xMM = centerX - halfSize + (i * stepSize);
                const yMM = centerY - halfSize;

                if (xMM >= 0 && xMM < outputWidthMM && yMM >= 0 && yMM < outputHeightMM) {
                    const xPx = Math.floor(xMM * resolution);
                    const yPx = Math.floor(yMM * resolution);

                    if (xPx >= 0 && xPx < pixelWidth && yPx >= 0 && yPx < pixelHeight) {
                        const index = yPx * pixelWidth + xPx;
                        const bright = grayscale[index] / 255;
                        const width = bright * maxSize;

                        if (width > minSize) {
                            currentLine.push({x: xMM + borderMM, y: yMM + borderMM, width: width});
                        } else if (currentLine.length > 1) {
                            lines.push(currentLine);
                            currentLine = [];
                        }
                    }
                }
            }

            // Right edge: top to bottom
            for (let i = 1; i <= numPointsPerSide; i++) {
                const xMM = centerX + halfSize;
                const yMM = centerY - halfSize + (i * stepSize);

                if (xMM >= 0 && xMM < outputWidthMM && yMM >= 0 && yMM < outputHeightMM) {
                    const xPx = Math.floor(xMM * resolution);
                    const yPx = Math.floor(yMM * resolution);

                    if (xPx >= 0 && xPx < pixelWidth && yPx >= 0 && yPx < pixelHeight) {
                        const index = yPx * pixelWidth + xPx;
                        const bright = grayscale[index] / 255;
                        const width = bright * maxSize;

                        if (width > minSize) {
                            currentLine.push({x: xMM + borderMM, y: yMM + borderMM, width: width});
                        } else if (currentLine.length > 1) {
                            lines.push(currentLine);
                            currentLine = [];
                        }
                    }
                }
            }

            // Bottom edge: right to left
            for (let i = 1; i <= numPointsPerSide; i++) {
                const xMM = centerX + halfSize - (i * stepSize);
                const yMM = centerY + halfSize;

                if (xMM >= 0 && xMM < outputWidthMM && yMM >= 0 && yMM < outputHeightMM) {
                    const xPx = Math.floor(xMM * resolution);
                    const yPx = Math.floor(yMM * resolution);

                    if (xPx >= 0 && xPx < pixelWidth && yPx >= 0 && yPx < pixelHeight) {
                        const index = yPx * pixelWidth + xPx;
                        const bright = grayscale[index] / 255;
                        const width = bright * maxSize;

                        if (width > minSize) {
                            currentLine.push({x: xMM + borderMM, y: yMM + borderMM, width: width});
                        } else if (currentLine.length > 1) {
                            lines.push(currentLine);
                            currentLine = [];
                        }
                    }
                }
            }

            // Left edge: bottom to top
            for (let i = 1; i < numPointsPerSide; i++) {
                const xMM = centerX - halfSize;
                const yMM = centerY + halfSize - (i * stepSize);

                if (xMM >= 0 && xMM < outputWidthMM && yMM >= 0 && yMM < outputHeightMM) {
                    const xPx = Math.floor(xMM * resolution);
                    const yPx = Math.floor(yMM * resolution);

                    if (xPx >= 0 && xPx < pixelWidth && yPx >= 0 && yPx < pixelHeight) {
                        const index = yPx * pixelWidth + xPx;
                        const bright = grayscale[index] / 255;
                        const width = bright * maxSize;

                        if (width > minSize) {
                            currentLine.push({x: xMM + borderMM, y: yMM + borderMM, width: width});
                        } else if (currentLine.length > 1) {
                            lines.push(currentLine);
                            currentLine = [];
                        }
                    }
                }
            }

            // Save final line if it has points
            if (currentLine.length > 1) {
                lines.push(currentLine);
            }
        }
    }

    return {
        lines: lines,
        width: totalWidthMM,
        height: totalHeightMM,
        pixelWidth: totalPixelWidth,
        pixelHeight: totalPixelHeight,
        resolution: resolution,
        spacing: spacing,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || spacing,
        patternType: 'squares',
        border: borderMM
    };
}

// Generate pattern with dots
function generateDotPattern(img, spacing, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const aspectRatio = img.height / img.width;
    const outputHeightMM = outputWidthMM * aspectRatio;

    // Use dynamic resolution like halftoner app: 2.5 samples per spacing unit
    const samplesPerSpacing = 2.5;
    const resolution = Math.ceil(samplesPerSpacing / spacing);
    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);

    tempCanvas.width = pixelWidth;
    tempCanvas.height = pixelHeight;
    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const imageData = tempCtx.getImageData(0, 0, pixelWidth, pixelHeight);

    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply brightness, contrast, gamma, and invert adjustments
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.shadowsLevel !== 0 || options.midtonesLevel !== 1.0 || options.highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, false, options.shadowsLevel || 0, options.midtonesLevel || 1.0, options.highlightsLevel || 255);
    }

    const borderMM = options.border || 0;
    const borderPx = borderMM * resolution;
    const elements = [];
    const spacingPx = spacing * resolution;
    const offsetOddLines = options.offsetOddLines || false;
    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;

    // Grid of dots
    let rowIndex = 0;
    for (let y = spacingPx / 2; y < pixelHeight; y += spacingPx) {
        const xOffset = (offsetOddLines && rowIndex % 2 === 1) ? spacingPx / 2 : 0;
        for (let x = spacingPx / 2 + xOffset; x < pixelWidth; x += spacingPx) {
            const px = Math.floor(x);
            const py = Math.floor(y);
            if (px >= 0 && px < pixelWidth && py >= 0 && py < pixelHeight) {
                const brightness = grayscale[py * pixelWidth + px];
                const bright = brightness / 255;

                // Area-based calculation for dots like halftoner app
                // NOTE: halftoner uses bright (not 1-bright), so bright pixels = large dots
                const maxArea = Math.PI * (maxSize * 0.5) * (maxSize * 0.5);
                const dotArea = bright * maxArea;
                const dotRadius = Math.sqrt(dotArea / Math.PI);
                const elementWidth = dotRadius * 2;

                if (elementWidth > minSize) {
                    // Store coordinates in mm like halftoner app, not pixels
                    const xMM = (x + borderPx) / resolution;
                    const yMM = (y + borderPx) / resolution;
                    elements.push({
                        type: 'circle',
                        x: xMM,
                        y: yMM,
                        size: elementWidth
                    });
                }
            }
        }
        rowIndex++;
    }

    const totalWidthMM = outputWidthMM + (2 * borderMM);
    const totalHeightMM = outputHeightMM + (2 * borderMM);
    const totalPixelWidth = pixelWidth + (2 * borderPx);
    const totalPixelHeight = pixelHeight + (2 * borderPx);

    return {
        elements: elements,
        width: totalWidthMM,
        height: totalHeightMM,
        pixelWidth: totalPixelWidth,
        pixelHeight: totalPixelHeight,
        resolution: resolution,
        spacing: spacing,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || spacing,
        patternType: 'dots',
        border: borderMM
    };
}

// Generate random stipple pattern
function generateStipplePattern(img, density, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    const aspectRatio = img.height / img.width;
    const outputHeightMM = outputWidthMM * aspectRatio;

    // For stipple, use a reasonable resolution based on density
    const resolution = Math.max(2, Math.ceil(density / 100));
    const pixelWidth = Math.floor(outputWidthMM * resolution);
    const pixelHeight = Math.floor(outputHeightMM * resolution);

    tempCanvas.width = pixelWidth;
    tempCanvas.height = pixelHeight;
    tempCtx.drawImage(img, 0, 0, pixelWidth, pixelHeight);
    const imageData = tempCtx.getImageData(0, 0, pixelWidth, pixelHeight);

    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < imageData.data.length; i += 4) {
        const gray = 0.299 * imageData.data[i] + 0.587 * imageData.data[i + 1] + 0.114 * imageData.data[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply brightness, contrast, gamma, and invert adjustments
    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.shadowsLevel !== 0 || options.midtonesLevel !== 1.0 || options.highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, false, options.shadowsLevel || 0, options.midtonesLevel || 1.0, options.highlightsLevel || 255);
    }

    const elements = [];
    // Number of stipple points based on density (smaller density = more points)
    const numPoints = Math.floor((pixelWidth * pixelHeight) / (density * density * 2));

    for (let i = 0; i < numPoints; i++) {
        const x = Math.random() * pixelWidth;
        const y = Math.random() * pixelHeight;
        const px = Math.floor(x);
        const py = Math.floor(y);

        if (px >= 0 && px < pixelWidth && py >= 0 && py < pixelHeight) {
            const value = grayscale[py * pixelWidth + px] / 255;
            // Probabilistic stippling - darker areas get more points
            if (Math.random() < value) {
                elements.push({
                    type: 'point',
                    x: x,
                    y: y,
                    depth: value
                });
            }
        }
    }

    return {
        elements: elements,
        width: outputWidthMM,
        height: outputHeightMM,
        pixelWidth: pixelWidth,
        pixelHeight: pixelHeight,
        resolution: resolution,
        spacing: density,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || density,
        patternType: 'stipple',
        border: options.border || 0
    };
}

// Generate cross-hatched pattern with two angles
function generateCrosshatchPattern(img, spacing, angle1, angle2, outputWidthMM, brightness = 0, contrast = 0, invert = false, gamma = 1.0, upscale = false, options = {}) {
    // Generate two separate line patterns
    const pattern1 = generateLinePattern(img, spacing, angle1, outputWidthMM, brightness, contrast, invert, gamma, upscale, options);
    const pattern2 = generateLinePattern(img, spacing, angle2, outputWidthMM, brightness, contrast, invert, gamma, upscale, options);

    // Combine the lines from both patterns
    const combinedLines = [...pattern1.lines, ...pattern2.lines];

    return {
        lines: combinedLines,
        width: pattern1.width,
        height: pattern1.height,
        pixelWidth: pattern1.pixelWidth,
        pixelHeight: pattern1.pixelHeight,
        resolution: pattern1.resolution,
        spacing: spacing,
        minSize: options.minSize || 0,
        maxSize: options.maxSize || spacing,
        patternType: 'crosshatch',
        border: pattern1.border || options.border || 0
    };
}

// Generate a single line across the image
function generateLine(grayscale, width, height, startX, startY, dirX, dirY, resolution, wavelength = 0, amplitude = 0) {
    const points = [];
    const diagonal = Math.sqrt(width * width + height * height);

    // Use much finer sampling (0.05mm) for crisp waves - matches Halftoner app approach
    // Halftoner uses pointSpacing = lineSpacing * 0.25 for better wave definition
    const step = 0.05;

    // Calculate perpendicular direction for wave offset
    const perpDirX = -dirY;
    const perpDirY = dirX;

    // Pre-calculate wave step for efficiency
    let waveAngle = 0;
    const waveStep = wavelength > 0 ? (Math.PI * 2) / (wavelength / step) : 0;

    // Scan along the line in both directions
    for (let t = -diagonal; t < diagonal; t += step) {
        let x = startX + dirX * t;
        let y = startY + dirY * t;

        // Apply wave pattern if wavelength and amplitude are set
        if (wavelength > 0 && amplitude > 0) {
            const amplitudePx = amplitude * resolution;
            // Use sine of wave angle for smooth oscillation
            const waveOffset = Math.sin(waveAngle) * amplitudePx;
            x += perpDirX * waveOffset;
            y += perpDirY * waveOffset;
        }

        // Check if point is within image bounds
        if (x >= 0 && x < width && y >= 0 && y < height) {
            const px = Math.floor(x);
            const py = Math.floor(y);
            const index = py * width + px;
            const brightness = grayscale[index];

            // Invert brightness so darker areas = higher depth value
            const depth = 1 - (brightness / 255);

            points.push({
                x: x,
                y: y,
                depth: depth
            });
        }

        // Increment wave angle for next iteration
        if (wavelength > 0) {
            waveAngle += waveStep;
        }
    }

    // Optimize points: remove collinear points to reduce file size
    return optimizeLinePoints(points);
}

// Optimize line points by removing redundant collinear points
function optimizeLinePoints(points) {
    if (points.length <= 2) return points;
    
    const optimized = [points[0]];
    const xyThresh = 0.01;  // Coordinate threshold in mm
    const depthThresh = 0.001; // Depth threshold
    
    for (let i = 1; i < points.length - 1; i++) {
        const p0 = optimized[optimized.length - 1];
        const p1 = points[i];
        const p2 = points[i + 1];
        
        // Check if p1 is approximately linear between p0 and p2
        const dx = p2.x - p0.x;
        const dy = p2.y - p0.y;
        const dd = p2.depth - p0.depth;
        
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 0.001) {
            const ratio = Math.sqrt((p1.x - p0.x) ** 2 + (p1.y - p0.y) ** 2) / dist;
            
            // Interpolated point if p1 was on the line
            const interpX = p0.x + dx * ratio;
            const interpY = p0.y + dy * ratio;
            const interpDepth = p0.depth + dd * ratio;
            
            // Check if p1 deviates significantly from the line
            const deltaX = Math.abs(p1.x - interpX);
            const deltaY = Math.abs(p1.y - interpY);
            const deltaDepth = Math.abs(p1.depth - interpDepth);
            
            if (deltaX >= xyThresh || deltaY >= xyThresh || deltaDepth >= depthThresh) {
                optimized.push(p1);
            }
        } else {
            optimized.push(p1);
        }
    }
    
    optimized.push(points[points.length - 1]);
    return optimized;
}

// Display halftone preview
// Display partial halftone as it generates (progressive rendering)
function displayHalftoneProgressive(partialData, metadata, patternType) {
    // Set up canvas on first call or if not properly sized
    const maxSize = 1600; // Match final rendering quality
    const pixelWidth = metadata?.pixelWidth || 1000;
    const pixelHeight = metadata?.pixelHeight || 1000;
    const scale = Math.min(maxSize / pixelWidth, maxSize / pixelHeight);

    if (!halftoneCanvas.width || halftoneCanvas.width < 100) {
        halftoneCanvas.width = pixelWidth * scale;
        halftoneCanvas.height = pixelHeight * scale;

        const ctx = halftoneCanvas.getContext('2d', {
            alpha: false,
            desynchronized: true, // Better performance, allows GPU to work asynchronously
            willReadFrequently: false // Optimize for GPU write operations
        });
        // High quality rendering settings - GPU antialiasing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Set background based on pattern type
        if (patternType === 'circles' || patternType === 'squares') {
            ctx.fillStyle = 'rgb(0, 0, 0)'; // Black background for circles/squares
        } else {
            ctx.fillStyle = 'white';
        }
        ctx.fillRect(0, 0, halftoneCanvas.width, halftoneCanvas.height);
    }

    const resolution = metadata?.resolution || 1;
    const ctx = halftoneCanvas.getContext('2d', { alpha: false });
    
    if (!ctx) return; // Safety check
    
    // Draw only the new data (incremental rendering)
    if (patternType === 'lines' || patternType === 'crosshatch' || patternType === 'circles' || patternType === 'squares') {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // For circles/squares, use white on black like halftoner app
        if (patternType === 'circles' || patternType === 'squares') {
            ctx.fillStyle = 'rgb(255, 255, 255)';
        }

        // Draw only the last batch of lines
        const startIndex = Math.max(0, partialData.length - 10);
        for (let lineIdx = startIndex; lineIdx < partialData.length; lineIdx++) {
            const line = partialData[lineIdx];

            // For circles/squares, draw filled circles at each point (exactly like halftoner)
            if (patternType === 'circles' || patternType === 'squares') {
                ctx.fillStyle = 'rgb(255, 255, 255)';

                // Draw each point as a filled circle
                for (let i = 0; i < line.length; i++) {
                    const point = line[i];
                    const x = point.x * scale;
                    const y = point.y * scale;
                    const w = (point.width || 0) * scale;

                    // Draw filled circle: center at (x,y), diameter = w, radius = w/2
                    if (w > 0) {
                        ctx.beginPath();
                        ctx.arc(x, y, w / 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            } else {
                // Traditional lines rendering for lines/crosshatch
                for (let i = 0; i < line.length - 1; i++) {
                    const point1 = line[i];
                    const point2 = line[i + 1];
                    const avgDepth = (point1.depth + point2.depth) / 2;

                    if (avgDepth < 0.001) continue;

                    ctx.beginPath();
                    ctx.moveTo(point1.x * scale, point1.y * scale);
                    ctx.lineTo(point2.x * scale, point2.y * scale);

                    // Subtle width variation (0.4-1.0px) to keep waves crisp while showing brightness
                    const minWidth = 0.4 * scale;
                    const maxWidth = 1.0 * scale;
                    ctx.lineWidth = minWidth + (avgDepth * (maxWidth - minWidth));

                    const minAlpha = 0.2;
                    const maxAlpha = 1.0;
                    const alpha = minAlpha + (avgDepth * (maxAlpha - minAlpha));
                    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;

                    ctx.stroke();
                }
            }
        }
    } else {
        // Draw elements (circles, squares, dots, stipple) - solid black like halftoner app
        const minSize = (metadata?.minSize || 0) * resolution;
        const maxSize = (metadata?.maxSize || metadata?.spacing || 1) * resolution;

        // Solid black fill like halftoner app
        ctx.fillStyle = 'rgb(0, 0, 0)';

        // Draw only the last batch of elements
        const startIndex = Math.max(0, partialData.length - 50);
        for (let i = startIndex; i < partialData.length; i++) {
            const element = partialData[i];
            // element.x, element.y, and element.size are all in mm - scale directly to canvas
            const x = element.x * scale;
            const y = element.y * scale;

            // Use element.size if available (new format), otherwise calculate from depth (old format)
            const elementWidth = element.size !== undefined ? element.size :
                                (minSize + ((element.depth || 0) * (maxSize - minSize)));

            if (element.type === 'circles' || element.type === 'circle' || element.type === 'dots') {
                const w = elementWidth * scale;
                const radius = w / 2;
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (element.type === 'squares' || element.type === 'square') {
                const size = elementWidth * scale;
                ctx.fillRect(x - size/2, y - size/2, size, size);
            } else if (element.type === 'stipple' || element.type === 'point') {
                ctx.beginPath();
                ctx.arc(x, y, 1 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}

function displayHalftone(halftoneData) {
    // Use high resolution for crisp rendering like halftoner app
    const maxSize = 1600; // Doubled from 800 for better quality

    // For elements (dots, circles, squares), scale from physical dimensions (mm) like halftoner app
    // For lines, scale from pixel dimensions
    let scale, canvasWidth, canvasHeight;
    if (halftoneData.elements) {
        // Scale from work dimensions (mm) - like halftoner DrawPreviewCircles
        scale = Math.min(maxSize / halftoneData.width, maxSize / halftoneData.height);
        canvasWidth = halftoneData.width * scale;
        canvasHeight = halftoneData.height * scale;
    } else {
        // Scale from pixel dimensions for lines
        scale = Math.min(maxSize / halftoneData.pixelWidth, maxSize / halftoneData.pixelHeight);
        canvasWidth = halftoneData.pixelWidth * scale;
        canvasHeight = halftoneData.pixelHeight * scale;
    }

    halftoneCanvas.width = canvasWidth;
    halftoneCanvas.height = canvasHeight;

    const ctx = halftoneCanvas.getContext('2d', {
        alpha: false,
        desynchronized: true, // Better performance, allows GPU to work asynchronously
        willReadFrequently: false // Optimize for GPU write operations
    });

    // High quality rendering settings - GPU antialiasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Set background color based on pattern type
    // Circles/squares use black background like halftoner app
    // Lines/crosshatch use white background
    if (halftoneData.elements || halftoneData.patternType === 'circles' || halftoneData.patternType === 'squares') {
        ctx.fillStyle = 'rgb(0, 0, 0)';
    } else {
        ctx.fillStyle = 'white';
    }
    ctx.fillRect(0, 0, halftoneCanvas.width, halftoneCanvas.height);

    // Draw border if present - shows the boundary between border and image area
    if (halftoneData.border && halftoneData.border > 0) {
        const borderPx = halftoneData.border * halftoneData.resolution * scale;
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        // Draw rectangle at the border boundary (where image starts, not the outer edge)
        ctx.strokeRect(borderPx, borderPx, halftoneCanvas.width - (borderPx * 2), halftoneCanvas.height - (borderPx * 2));
    }

    // Check pattern type
    if (halftoneData.lines) {
        // Display line pattern
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // For circles/squares, draw filled circles at each point (exactly like halftoner)
        if (halftoneData.patternType === 'circles' || halftoneData.patternType === 'squares') {
            ctx.fillStyle = 'rgb(255, 255, 255)';

            halftoneData.lines.forEach(line => {
                // Draw each point as a filled circle
                for (let i = 0; i < line.length; i++) {
                    const point = line[i];
                    const x = point.x * scale;
                    const y = point.y * scale;
                    const w = (point.width || 0) * halftoneData.resolution * scale;

                    // Draw filled circle: center at (x,y), diameter = w, radius = w/2
                    if (w > 0) {
                        ctx.beginPath();
                        ctx.arc(x, y, w / 2, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            });
        } else {
            // Traditional lines/crosshatch rendering
            // Get minSize/maxSize for line width (in pixels for rendering)
            const minSizeMM = halftoneData.minSize || 0;
            const maxSizeMM = halftoneData.maxSize || halftoneData.spacing || 1;
            const minWidth = Math.max(0.4, minSizeMM * halftoneData.resolution) * scale;
            const maxWidth = Math.max(minWidth, maxSizeMM * halftoneData.resolution) * scale;

            halftoneData.lines.forEach(line => {
                if (line.length < 2) return;

                // Draw line segments with width variation based on depth
                for (let i = 0; i < line.length - 1; i++) {
                    const point1 = line[i];
                    const point2 = line[i + 1];
                    const avgDepth = (point1.depth + point2.depth) / 2;
                    if (avgDepth < 0.001) continue;

                    ctx.beginPath();
                    ctx.moveTo(point1.x * scale, point1.y * scale);
                    ctx.lineTo(point2.x * scale, point2.y * scale);

                    // Use minSize/maxSize for line width
                    ctx.lineWidth = minWidth + (avgDepth * (maxWidth - minWidth));

                    const minAlpha = 0.2;
                    const maxAlpha = 1.0;
                    const alpha = minAlpha + (avgDepth * (maxAlpha - minAlpha));
                    ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;

                    ctx.stroke();
                }
            });
        }
    } else if (halftoneData.elements) {
        // Display circle, square, dot, or stipple pattern - solid black like halftoner app
        const minSize = (halftoneData.minSize || 0) * halftoneData.resolution;
        const maxSize = (halftoneData.maxSize || halftoneData.spacing) * halftoneData.resolution;

        // White circles/squares on black background like halftoner app (background already set above)
        ctx.fillStyle = 'rgb(255, 255, 255)';

        halftoneData.elements.forEach((element) => {
            // element.x, element.y, and element.size are all in mm - scale directly to canvas like halftoner
            const x = element.x * scale;
            const y = element.y * scale;

            // Use element.size if available (new format), otherwise calculate from depth (old format)
            const elementWidth = element.size !== undefined ? element.size :
                                (minSize + ((element.depth || 0) * (maxSize - minSize)));

            if (element.type === 'circles' || element.type === 'circle' || element.type === 'dots') {
                // Draw white circle on black background - like halftoner app
                // Scale width (in mm) directly to canvas pixels like halftoner: w = pt.w * Scale
                const w = elementWidth * scale;
                const radius = w / 2;

                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2);
                ctx.fill();
            } else if (element.type === 'squares' || element.type === 'square') {
                // Draw white square on black background - centered like halftoner
                const size = elementWidth * scale;
                ctx.fillRect(x - size/2, y - size/2, size, size);
            } else if (element.type === 'stipple' || element.type === 'point') {
                // Draw stipple point
                ctx.beginPath();
                ctx.arc(x, y, 1 * scale, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}

// Optimize toolpath using nearest neighbor algorithm
function optimizeToolpath(lines) {
    if (lines.length <= 1) return lines;

    // Use RBush for spatial indexing if available (much faster for large datasets)
    // Only use RBush for 500+ lines as it has setup overhead
    if (typeof RBush !== 'undefined' && lines.length > 500) {
        return optimizeToolpathWithRBush(lines);
    }

    // Fallback to linear search for small datasets or if RBush not loaded
    const optimized = [];
    const remaining = [...lines];

    // Start with first line
    optimized.push(remaining.shift());

    // Nearest neighbor algorithm
    while (remaining.length > 0) {
        const lastLine = optimized[optimized.length - 1];
        const lastPoint = lastLine[lastLine.length - 1];

        let nearestIndex = 0;
        let nearestDist = Infinity;
        let reverseNearest = false;

        // Find nearest line
        for (let i = 0; i < remaining.length; i++) {
            const line = remaining[i];
            if (line.length === 0) continue;

            // Check distance to start of line
            const distToStart = Math.sqrt(
                Math.pow(line[0].x - lastPoint.x, 2) +
                Math.pow(line[0].y - lastPoint.y, 2)
            );

            // Check distance to end of line
            const distToEnd = Math.sqrt(
                Math.pow(line[line.length - 1].x - lastPoint.x, 2) +
                Math.pow(line[line.length - 1].y - lastPoint.y, 2)
            );

            if (distToStart < nearestDist) {
                nearestDist = distToStart;
                nearestIndex = i;
                reverseNearest = false;
            }

            if (distToEnd < nearestDist) {
                nearestDist = distToEnd;
                nearestIndex = i;
                reverseNearest = true;
            }
        }

        let nextLine = remaining.splice(nearestIndex, 1)[0];

        // Reverse line if end is closer
        if (reverseNearest) {
            nextLine = nextLine.reverse();
        }

        optimized.push(nextLine);
    }

    return optimized;
}

// RBush-accelerated toolpath optimization (O(n log n) instead of O(n²))
function optimizeToolpathWithRBush(lines) {
    const optimized = [];
    const tree = new RBush();

    // Build spatial index with both start and end points of each line
    const items = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.length === 0) continue;

        const start = line[0];
        const end = line[line.length - 1];

        // Add start point to spatial index
        items.push({
            minX: start.x,
            minY: start.y,
            maxX: start.x,
            maxY: start.y,
            lineIndex: i,
            isEnd: false,
            line: line
        });

        // Add end point to spatial index
        items.push({
            minX: end.x,
            minY: end.y,
            maxX: end.x,
            maxY: end.y,
            lineIndex: i,
            isEnd: true,
            line: line
        });
    }

    tree.load(items);

    // Start with first line
    const visited = new Set();
    let currentLine = lines[0];
    optimized.push(currentLine);
    visited.add(0);

    // Nearest neighbor using spatial queries
    while (visited.size < lines.length) {
        const lastPoint = currentLine[currentLine.length - 1];

        // Start with larger radius for better performance (fewer iterations)
        let searchRadius = 50;
        let found = null;
        let bestDist = Infinity;
        let bestCandidate = null;

        // Search once with large radius, then filter to find nearest
        while (!found && searchRadius < 10000) {
            const candidates = tree.search({
                minX: lastPoint.x - searchRadius,
                minY: lastPoint.y - searchRadius,
                maxX: lastPoint.x + searchRadius,
                maxY: lastPoint.y + searchRadius
            });

            // Find nearest unvisited candidate
            for (const candidate of candidates) {
                if (visited.has(candidate.lineIndex)) continue;

                const dx = candidate.minX - lastPoint.x;
                const dy = candidate.minY - lastPoint.y;
                const dist = dx * dx + dy * dy; // Skip sqrt for speed

                if (dist < bestDist) {
                    bestDist = dist;
                    bestCandidate = candidate;
                }
            }

            if (bestCandidate) {
                found = bestCandidate;
                break;
            }

            // Only expand if nothing found
            searchRadius *= 3; // Faster expansion
        }

        if (!found) break; // No more lines found

        // Add the found line
        let nextLine = found.line;

        // Reverse if end point was closer
        if (found.isEnd) {
            nextLine = [...nextLine].reverse();
        }

        optimized.push(nextLine);
        visited.add(found.lineIndex);
        currentLine = nextLine;

        // Remove all items for this line from tree
        tree.remove(items.find(item => item.lineIndex === found.lineIndex && !item.isEnd));
        tree.remove(items.find(item => item.lineIndex === found.lineIndex && item.isEnd));
    }

    return optimized;
}

// Optimize element toolpath (for circles, squares, dots, stipple)
function optimizeElements(elements) {
    if (elements.length <= 1) return elements;

    // Use RBush for spatial indexing if available (much faster for large datasets)
    // Only use RBush for 1000+ elements as it has setup overhead
    if (typeof RBush !== 'undefined' && elements.length > 1000) {
        return optimizeElementsWithRBush(elements);
    }

    // Fallback to linear search for small datasets or if RBush not loaded
    const optimized = [];
    const remaining = [...elements];

    // Start with first element
    optimized.push(remaining.shift());

    // Nearest neighbor algorithm
    while (remaining.length > 0) {
        const lastEl = optimized[optimized.length - 1];

        let nearestIndex = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const el = remaining[i];
            const dist = Math.sqrt(
                Math.pow(el.x - lastEl.x, 2) +
                Math.pow(el.y - lastEl.y, 2)
            );

            if (dist < nearestDist) {
                nearestDist = dist;
                nearestIndex = i;
            }
        }

        optimized.push(remaining.splice(nearestIndex, 1)[0]);
    }

    return optimized;
}

// RBush-accelerated element optimization (O(n log n) instead of O(n²))
function optimizeElementsWithRBush(elements) {
    const optimized = [];
    const tree = new RBush();

    // Build spatial index
    const items = elements.map((el, i) => ({
        minX: el.x,
        minY: el.y,
        maxX: el.x,
        maxY: el.y,
        index: i,
        element: el
    }));

    tree.load(items);

    // Start with first element
    const visited = new Set();
    let currentEl = elements[0];
    optimized.push(currentEl);
    visited.add(0);

    // Nearest neighbor using spatial queries
    while (visited.size < elements.length) {
        // Start with larger radius for better performance
        let searchRadius = 20;
        let found = null;
        let bestDist = Infinity;
        let bestCandidate = null;

        // Search once with large radius, then filter to find nearest
        while (!found && searchRadius < 10000) {
            const candidates = tree.search({
                minX: currentEl.x - searchRadius,
                minY: currentEl.y - searchRadius,
                maxX: currentEl.x + searchRadius,
                maxY: currentEl.y + searchRadius
            });

            // Find nearest unvisited candidate
            for (const candidate of candidates) {
                if (visited.has(candidate.index)) continue;

                const dx = candidate.minX - currentEl.x;
                const dy = candidate.minY - currentEl.y;
                const dist = dx * dx + dy * dy; // Skip sqrt for speed

                if (dist < bestDist) {
                    bestDist = dist;
                    bestCandidate = candidate;
                }
            }

            if (bestCandidate) {
                found = bestCandidate;
                break;
            }

            // Only expand if nothing found
            searchRadius *= 3; // Faster expansion
        }

        if (!found) break; // No more elements found

        optimized.push(found.element);
        visited.add(found.index);
        currentEl = found.element;

        // Remove from tree
        tree.remove(found);
    }

    return optimized;
}

// Generate G-code for CNC
function generateGcode(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero = 'bottom-left', spindleSpeed = 12000, toolChange = false, vbitToolNumber = 1, boundaryToolNumber = 2, boundaryToolSize = 3.175, boundaryDepth = 1, boundaryPassDepth = 0.5, multiPassCount = 1, ramping = false, rampDistance = 2, boundary = false, includeBoundaryInGcode = true, includeLineNumbers = false, optimizeToolpathEnabled = true, bidirectional = true, borderCuttingFeedRate = null, plotterMode = false, plotterLineWidthMethod = 'pressure', plotterPressureMin = 0, plotterPressureMax = -0.5, plotterPenWidth = 0.5, plotterLineWidthLight = 0.3, plotterLineWidthHeavy = 1.0) {
    // Use array and join at end for better memory efficiency
    const gcode = [];

    // Time estimation variables
    let totalTime = 0; // in minutes
    let totalCuttingDistance = 0; // in mm
    let rapidMoveCount = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = safeHeight;

    const pixelsToMM = halftoneData.width / halftoneData.pixelWidth;
    const minDepth = 0.05; // Minimum depth threshold in mm
    const rapidRate = 5000; // Assumed rapid traverse rate in mm/min

    // Determine pattern type
    const patternType = halftoneData.patternType || 'lines';
    const elementCount = halftoneData.lines ? halftoneData.lines.length : halftoneData.elements.length;

    // Calculate offset based on work zero position
    let xOffset = 0;
    let yOffset = 0;

    switch(workZero) {
        case 'bottom-left':
            xOffset = 0;
            yOffset = 0;
            break;
        case 'bottom-center':
            xOffset = -halftoneData.width / 2;
            yOffset = 0;
            break;
        case 'bottom-right':
            xOffset = -halftoneData.width;
            yOffset = 0;
            break;
        case 'center-left':
            xOffset = 0;
            yOffset = -halftoneData.height / 2;
            break;
        case 'center':
            xOffset = -halftoneData.width / 2;
            yOffset = -halftoneData.height / 2;
            break;
        case 'center-right':
            xOffset = -halftoneData.width;
            yOffset = -halftoneData.height / 2;
            break;
        case 'top-left':
            xOffset = 0;
            yOffset = -halftoneData.height;
            break;
        case 'top-center':
            xOffset = -halftoneData.width / 2;
            yOffset = -halftoneData.height;
            break;
        case 'top-right':
            xOffset = -halftoneData.width;
            yOffset = -halftoneData.height;
            break;
    }

    // Header - grblHAL compatible
    const workZeroLabel = workZero.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');
    const headerLines = [
        `(Halftone ${patternType.charAt(0).toUpperCase() + patternType.slice(1)} Pattern G-code)`,
        plotterMode ? '(PLOTTER MODE - Pen Up/Down control)' : '(CUTTING MODE - Z-axis engraving)',
        `(Image size: ${halftoneData.width.toFixed(2)}mm x ${halftoneData.height.toFixed(2)}mm)`,
        plotterMode ? '' : `(Max depth: ${maxDepth}mm)`,
        `(Safe Z height: ${safeHeight}mm)`,
        plotterMode ? '' : `(Spindle speed: ${spindleSpeed} RPM)`,
        plotterMode ? '' : `(V-bit angle: ${vbitAngle}°)`,
        toolChange && !plotterMode ? `(V-bit tool: T${vbitToolNumber})` : '',
        boundary && toolChange ? `(Boundary frame tool: T${boundaryToolNumber}, ${boundaryToolSize}mm diameter)` : '',
        plotterMode ? '' : `(Cutting feed rate: ${cuttingFeedRate}mm/min)`,
        plotterMode ? '' : `(Plunge feed rate: ${plungeFeedRate}mm/min)`,
        `(Work zero position: ${workZeroLabel})`,
        `(Total elements: ${elementCount})`,
        multiPassCount > 1 && !plotterMode ? `(Halftone passes: ${multiPassCount})` : '',
        ramping && !plotterMode ? `(Z-ramping enabled: ${rampDistance}mm)` : '',
        boundary ? `(Boundary frame enabled at border edge)` : '',
        `(Generated for grblHAL)`,
        '',
        'G21 (Metric units)',
        'G90 (Absolute positioning)',
        'G17 (XY plane)',
        'G94 (Feed per minute)',
        'G54 (Work coordinate system)',
        '',
        toolChange ? `T${vbitToolNumber} M6 (Load V-bit tool)` : '',
        toolChange ? 'G43 H1 (Tool length offset)' : '',
        `M3 S${spindleSpeed} (Start spindle)`,
        'G4 P2 (Wait 2 seconds for spindle to reach speed)',
        `F${cuttingFeedRate} (Set initial feed rate)`,
        `G0 Z${safeHeight.toFixed(1)} (Safe height)`,
        'G0 X0.000 Y0.000 (Move to origin)',
        ''
    ].filter(line => line !== ''); // Remove empty comment lines

    gcode.push(...headerLines);

    // Multi-pass support - Note: passes are done per-element, not per-pattern
    const passes = multiPassCount;

    // Optimize toolpath if enabled
    let linesToProcess = halftoneData.lines;
    let elementsToProcess = halftoneData.elements;

    if (optimizeToolpathEnabled) {
        if (halftoneData.lines) {
            linesToProcess = optimizeToolpath(halftoneData.lines);
        }
        if (halftoneData.elements) {
            elementsToProcess = optimizeElements(halftoneData.elements);
        }
    }

    if (passes > 1) {
        gcode.push('', `(Multiple passes enabled: ${passes} passes per element)`);
    }

    if (patternType === 'lines' || patternType === 'crosshatch' || patternType === 'circles' || patternType === 'squares') {
        // Process each line
        linesToProcess.forEach((line, lineIndex) => {
            if (line.length < 2) return;

            gcode.push(`(Line ${lineIndex + 1}/${halftoneData.lines.length})`);

            // Reverse line direction for bidirectional engraving (even lines)
            const processLine = (bidirectional && lineIndex % 2 === 1) ? [...line].reverse() : line;

            // Do multiple passes on this line if enabled
            for (let pass = 1; pass <= passes; pass++) {
                if (passes > 1 && pass > 1) {
                    gcode.push(`(  Pass ${pass}/${passes})`);
                }

                let inCut = false;

                // Process each point in the line
                for (let i = 0; i < processLine.length; i++) {
                    const point = processLine[i];
                    const x = point.x * pixelsToMM + xOffset;
                    const y = point.y * pixelsToMM + yOffset;

                    // For circles/squares, points have 'width' property instead of 'depth'
                    // For lines/crosshatch, points have 'depth' property
                    const pointDepth = point.width !== undefined ?
                        (point.width / (halftoneData.maxSize || halftoneData.spacing || 1)) :
                        (point.depth || 0);

                    // Check if point should be processed
                    let shouldProcess = false;
                    if (plotterMode) {
                        // Plotter mode with pressure control: process even very light areas (they get light pen pressure)
                        // For pressure-based width, we want to include all non-blank areas
                        // pointDepth is 0-1 where 0=light, 1=dark
                        // Use a very low threshold to include even light grays
                        shouldProcess = pointDepth > 0.001; // Almost everything except pure white
                    } else {
                        // Cutting mode: calculate depth from V-bit angle
                        const targetWidth = pointDepth * maxDepth * 2;
                        const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                        const depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
                        shouldProcess = depth > minDepth;
                    }
                    
                    if (!shouldProcess) {
                        // Area too bright, lift out
                        if (inCut) {
                            if (plotterMode) {
                                // Pen up in plotter mode
                                gcode.push('M5 ; Pen up');
                                inCut = false;
                            } else {
                                const rapidUpDist = Math.abs(safeHeight - lastZ);
                                totalTime += rapidUpDist / rapidRate;

                                gcode.push(`G0 Z${safeHeight.toFixed(1)}`);
                                lastZ = safeHeight;
                                inCut = false;
                            }
                        }
                    } else {
                        // Process the point
                        if (plotterMode) {
                            // Plotter mode: pen up/down with optional line width method
                            if (plotterLineWidthMethod === 'parallel') {
                                // Parallel offset method: draw multiple passes for thickness
                                // Calculate number of passes based on point depth
                                const penWidth = plotterPenWidth;
                                const numPasses = Math.max(1, Math.round(pointDepth * 5)); // 1-5 passes based on darkness
                                
                                for (let offsetPass = 0; offsetPass < numPasses; offsetPass++) {
                                    const offsetDist = (offsetPass - (numPasses - 1) / 2) * (penWidth / 3);
                                    
                                    // Calculate perpendicular offset direction (rotate 90 degrees from drawing direction)
                                    let offsetX = x;
                                    let offsetY = y;
                                    if (i > 0) {
                                        const prevPoint = processLine[i - 1];
                                        const prevX = prevPoint.x * pixelsToMM + xOffset;
                                        const prevY = prevPoint.y * pixelsToMM + yOffset;
                                        const dx = x - prevX;
                                        const dy = y - prevY;
                                        const dist = Math.sqrt(dx * dx + dy * dy);
                                        if (dist > 0.01) {
                                            const perpX = -dy / dist;
                                            const perpY = dx / dist;
                                            offsetX += perpX * offsetDist;
                                            offsetY += perpY * offsetDist;
                                        }
                                    }
                                    
                                    if (offsetPass === 0 && !inCut) {
                                        // First pass, pen down at start
                                        gcode.push(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                        gcode.push('M3 ; Pen down');
                                        inCut = true;
                                    } else if (offsetPass > 0) {
                                        // New pass: pen up, move, pen down
                                        gcode.push('M5 ; Pen up');
                                        gcode.push(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                        gcode.push('M3 ; Pen down');
                                    } else {
                                        // Continue drawing on same pass
                                        gcode.push(`G1 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)} F${cuttingFeedRate.toFixed(0)}`);
                                    }
                                    
                                    const drawDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalTime += drawDist / cuttingFeedRate;
                                    totalCuttingDistance += drawDist;
                                }
                                lastX = x;
                                lastY = y;
                            } else {
                                // Pressure-based method: calculate required pressure based on desired line width
                                const lineSpacing = halftoneData.spacing || 1.0;
                                const minLineWidth = halftoneData.minSize || 0;
                                const maxLineWidth = halftoneData.maxSize || lineSpacing;

                                // For plotter mode, limit maximum line width to spacing to prevent overlap
                                // (In V-carve mode this limitation wouldn't apply since overlaps are fine)
                                const effectiveMaxWidth = Math.min(maxLineWidth, lineSpacing);

                                // Calculate desired line width based on image darkness (0=light, 1=dark)
                                // Scale from minSize to effectiveMaxWidth
                                const desiredLineWidth = minLineWidth + (pointDepth * (effectiveMaxWidth - minLineWidth));

                                // Now map the desired line width to the required pressure using calibration data
                                // We know: plotterPressureMin produces plotterLineWidthLight
                                //          plotterPressureMax produces plotterLineWidthHeavy
                                // Linear interpolation to find what pressure produces desiredLineWidth
                                const widthRange = plotterLineWidthHeavy - plotterLineWidthLight;
                                const widthRatio = widthRange > 0 ? (desiredLineWidth - plotterLineWidthLight) / widthRange : 0;
                                const pressureZ = plotterPressureMin + (widthRatio * (plotterPressureMax - plotterPressureMin));
                                if (!inCut) {
                                    // Pen down
                                    // Set pressure (Z) before moving to position
                                    gcode.push(`G0 Z${pressureZ.toFixed(3)} ; Set pressure`);
                                    lastZ = pressureZ;
                                    
                                    // Move to position with proper feed rate for drawing
                                    gcode.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} F${cuttingFeedRate.toFixed(0)}`);
                                    gcode.push('M3 ; Pen down');
                                    
                                    const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                    totalTime += rapidDist / cuttingFeedRate;
                                    totalCuttingDistance += rapidDist;
                                    
                                    lastX = x;
                                    lastY = y;
                                    inCut = true;
                                } else {
                                    // Continue drawing with dynamic pressure
                                    // Calculate target pressure for this point based on line width
                                    // Use G1 with Z component to move and adjust pressure simultaneously
                                    gcode.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${pressureZ.toFixed(3)} F${cuttingFeedRate.toFixed(0)}`);
                                    lastZ = pressureZ;
                                    
                                    const drawDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                    totalTime += drawDist / cuttingFeedRate;
                                    totalCuttingDistance += drawDist;
                                    
                                    lastX = x;
                                    lastY = y;
                                }
                            }
                        } else {
                            // Normal cutting mode
                            const targetWidth = pointDepth * maxDepth * 2;
                            const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                            const depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
                            const z = -depth;

                            if (!inCut) {
                                // Rapid move to position
                                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (safeHeight - lastZ) ** 2);
                                totalTime += rapidDist / rapidRate;
                                rapidMoveCount++;

                                if (ramping && i < processLine.length - 1) {
                                    // Calculate ramp entry - move horizontally while descending
                                    const nextPoint = processLine[i + 1];
                                    const nextX = nextPoint.x * pixelsToMM + xOffset;
                                    const nextY = nextPoint.y * pixelsToMM + yOffset;
                                    const dx = nextX - x;
                                    const dy = nextY - y;
                                    const dist = Math.sqrt(dx * dx + dy * dy);

                                    if (dist >= rampDistance) {
                                        // Ramp entry
                                        const rampX = x + (dx / dist) * rampDistance;
                                        const rampY = y + (dy / dist) * rampDistance;

                                        gcode.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                                        gcode.push(`F${plungeFeedRate}`);
                                        gcode.push(`G1 X${rampX.toFixed(3)} Y${rampY.toFixed(3)} Z${z.toFixed(3)}`);
                                        gcode.push(`F${cuttingFeedRate}`);

                                        const rampDist3D = Math.sqrt(rampDistance * rampDistance + Math.abs(z - lastZ) ** 2);
                                        totalTime += rampDist3D / plungeFeedRate;
                                        totalCuttingDistance += rampDist3D;

                                        lastX = rampX;
                                        lastY = rampY;
                                        lastZ = z;
                                    } else {
                                        // Not enough distance for ramping, use normal plunge
                                        gcode.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                                        gcode.push(`F${plungeFeedRate}`);
                                        gcode.push(`G1 Z${z.toFixed(3)}`);
                                        gcode.push(`F${cuttingFeedRate}`);

                                        const plungeDist = Math.abs(z - lastZ);
                                        totalTime += plungeDist / plungeFeedRate;
                                        totalCuttingDistance += plungeDist;

                                        lastX = x;
                                        lastY = y;
                                        lastZ = z;
                                    }
                                } else {
                                    // Normal plunge at plunge feed rate
                                    gcode.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                                    lastX = x;
                                    lastY = y;

                                    const plungeDist = Math.abs(z - lastZ);
                                    totalTime += plungeDist / plungeFeedRate;
                                    totalCuttingDistance += plungeDist;

                                    gcode.push(`F${plungeFeedRate}`);
                                    gcode.push(`G1 Z${z.toFixed(3)}`);
                                    gcode.push(`F${cuttingFeedRate}`);

                                    lastZ = z;
                                }

                                inCut = true;
                            } else {
                                // Continue cutting at cutting feed rate
                                const cutDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (z - lastZ) ** 2);
                                totalTime += cutDist / cuttingFeedRate;
                                totalCuttingDistance += cutDist;

                                gcode.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)}`);

                                lastX = x;
                                lastY = y;
                                lastZ = z;
                            }
                        }
                    }
                } // End for each point in line

                // Lift at end of line if still cutting
                if (inCut) {
                    if (plotterMode) {
                        // Pen up
                        gcode.push('M5 ; Pen up');
                    } else {
                        const rapidUpDist = Math.abs(safeHeight - lastZ);
                        totalTime += rapidUpDist / rapidRate;

                        gcode.push(`G0 Z${safeHeight.toFixed(1)}`);
                        lastZ = safeHeight;
                    }
                    inCut = false;
                }
            } // End pass loop

            gcode.push('');
        });
    } else if (patternType === 'circles' || patternType === 'squares' || patternType === 'dots' || patternType === 'stipple') {
        // Process each element (circle or square)
        elementsToProcess.forEach((element, elementIndex) => {
            // element.x and element.y are already in mm (not pixels)
            const x = element.x + xOffset;
            const y = element.y + yOffset;

            // Use element.size if available (new format), otherwise calculate from depth (old format)
            const minSize = halftoneData.minSize || 0;
            const maxSize = halftoneData.maxSize || halftoneData.spacing || 1;
            const targetWidth = element.size !== undefined ? element.size :
                               (minSize + ((element.depth || 0) * (maxSize - minSize)));

            // V-bit angle compensation: calculate depth from target width
            const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
            const compensatedDepth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
            const depth = compensatedDepth;

            if (depth < minDepth) return;

            const z = -compensatedDepth;
            const widthAtDepth = targetWidth;

            // Do multiple passes on this element if enabled
            for (let multiPass = 1; multiPass <= passes; multiPass++) {
                if (patternType === 'circles' || patternType === 'dots') {
                    // Generate circular pocket toolpath
                    const numPasses = Math.max(1, Math.ceil(widthAtDepth / 0.5)); // 0.5mm stepover

                    for (let pass = 0; pass <= numPasses; pass++) {
                        const radius = (widthAtDepth / 2) * (pass / numPasses);
                        if (radius < 0.1) continue; // Skip very small radii

                        // Move to start of circle
                        const startX = x + radius;
                        const startY = y;

                        // Rapid to position
                        const rapidDist = Math.sqrt((startX - lastX) ** 2 + (startY - lastY) ** 2 + (lastZ - safeHeight) ** 2);
                        totalTime += rapidDist / rapidRate;

                        gcode.push(`G0 X${startX.toFixed(3)} Y${startY.toFixed(3)}`);
                        lastX = startX;
                        lastY = startY;

                        // Plunge
                        const plungeDist = Math.abs(z - lastZ);
                        totalTime += plungeDist / plungeFeedRate;
                        totalCuttingDistance += plungeDist;

                        gcode.push(`F${plungeFeedRate}`);
                        gcode.push(`G1 Z${z.toFixed(3)}`);
                        lastZ = z;

                        // Cut circle using arc
                        gcode.push(`F${cuttingFeedRate}`);
                        gcode.push(`G2 X${startX.toFixed(3)} Y${startY.toFixed(3)} I${(-radius).toFixed(3)} J0`);

                        const circumference = 2 * Math.PI * radius;
                        totalTime += circumference / cuttingFeedRate;
                        totalCuttingDistance += circumference;
                    }

                    // Retract
                    const rapidUpDist = Math.abs(safeHeight - lastZ);
                    totalTime += rapidUpDist / rapidRate;

                    gcode.push(`G0 Z${safeHeight.toFixed(1)}`);
                    lastZ = safeHeight;

                } else if (patternType === 'squares') {
                // Generate square pocket toolpath
                const halfWidth = widthAtDepth / 2;
                const numPasses = Math.max(1, Math.ceil(widthAtDepth / 0.5)); // 0.5mm stepover

                for (let pass = 0; pass <= numPasses; pass++) {
                    const offset = halfWidth * (pass / numPasses);
                    if (offset < 0.05) continue;

                    // Calculate square corners
                    const x1 = x - offset;
                    const y1 = y - offset;
                    const x2 = x + offset;
                    const y2 = y + offset;

                    // Move to start corner
                    const rapidDist = Math.sqrt((x1 - lastX) ** 2 + (y1 - lastY) ** 2 + (lastZ - safeHeight) ** 2);
                    totalTime += rapidDist / rapidRate;

                    gcode.push(`G0 X${x1.toFixed(3)} Y${y1.toFixed(3)}`);
                    lastX = x1;
                    lastY = y1;

                    // Plunge
                    const plungeDist = Math.abs(z - lastZ);
                    totalTime += plungeDist / plungeFeedRate;
                    totalCuttingDistance += plungeDist;

                    gcode.push(`F${plungeFeedRate}`);
                    gcode.push(`G1 Z${z.toFixed(3)}`);
                    lastZ = z;

                    // Cut square perimeter
                    gcode.push(`F${cuttingFeedRate}`);

                    // Side 1
                    let cutDist = Math.abs(x2 - x1);
                    totalTime += cutDist / cuttingFeedRate;
                    totalCuttingDistance += cutDist;
                    gcode.push(`G1 X${x2.toFixed(3)} Y${y1.toFixed(3)}`);

                    // Side 2
                    cutDist = Math.abs(y2 - y1);
                    totalTime += cutDist / cuttingFeedRate;
                    totalCuttingDistance += cutDist;
                    gcode.push(`G1 X${x2.toFixed(3)} Y${y2.toFixed(3)}`);

                    // Side 3
                    cutDist = Math.abs(x2 - x1);
                    totalTime += cutDist / cuttingFeedRate;
                    totalCuttingDistance += cutDist;
                    gcode.push(`G1 X${x1.toFixed(3)} Y${y2.toFixed(3)}`);

                    // Side 4 (back to start)
                    cutDist = Math.abs(y2 - y1);
                    totalTime += cutDist / cuttingFeedRate;
                    totalCuttingDistance += cutDist;
                    gcode.push(`G1 X${x1.toFixed(3)} Y${y1.toFixed(3)}`);

                    lastX = x1;
                    lastY = y1;
                }

                // Retract
                const rapidUpDist = Math.abs(safeHeight - lastZ);
                totalTime += rapidUpDist / rapidRate;

                gcode.push(`G0 Z${safeHeight.toFixed(1)}`);
                lastZ = safeHeight;
            } else if (patternType === 'stipple' && element.type === 'point') {
                // Simple point - just plunge and retract
                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + (lastZ - safeHeight) ** 2);
                totalTime += rapidDist / rapidRate;

                gcode.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                lastX = x;
                lastY = y;

                // Plunge
                const plungeDist = Math.abs(z - lastZ);
                totalTime += plungeDist / plungeFeedRate;
                totalCuttingDistance += plungeDist;

                gcode.push(`F${plungeFeedRate}`);
                gcode.push(`G1 Z${z.toFixed(3)}`);
                lastZ = z;

                // Retract immediately
                const rapidUpDist = Math.abs(safeHeight - lastZ);
                totalTime += rapidUpDist / rapidRate;

                gcode.push(`G0 Z${safeHeight.toFixed(1)}`);
                lastZ = safeHeight;
            }

            } // End multi-pass loop

            gcode.push('');
        });
    }

    // Footer - return to origin
    // Generate boundary frame G-code
    let boundaryGcode = null;

    if (boundary) {
        // Boundary frame cuts at the border edge (around image content)
        const borderMM = halftoneData.border || 0;
        const imageWidthMM = halftoneData.width - (borderMM * 2);
        const imageHeightMM = halftoneData.height - (borderMM * 2);

        // Frame is positioned at the border edge
        const frameX1 = xOffset + borderMM;
        const frameY1 = yOffset + borderMM;
        const frameX2 = xOffset + borderMM + imageWidthMM;
        const frameY2 = yOffset + borderMM + imageHeightMM;
        const toolRadius = boundaryToolSize / 2;
        
        // Use border cutting feed rate if specified, otherwise use main cutting feed rate
        const borderFeedRate = borderCuttingFeedRate !== null && borderCuttingFeedRate > 0 ? borderCuttingFeedRate : cuttingFeedRate;

        // Calculate number of passes needed
        const numPasses = Math.ceil(boundaryDepth / boundaryPassDepth);
        const actualPassDepth = boundaryDepth / numPasses;

        const boundaryCode = [
            '(Boundary Frame)',
            `(Total depth: ${boundaryDepth.toFixed(2)}mm in ${numPasses} pass${numPasses > 1 ? 'es' : ''})`,
            toolChange ? `T${boundaryToolNumber} M6 (Load boundary frame tool - ${boundaryToolSize}mm)` : '',
            toolChange ? 'G43 H2 (Tool length offset)' : '',
            toolChange ? `M3 S${spindleSpeed} (Start spindle)` : '',
            toolChange ? 'G4 P2 (Wait for spindle)' : '',
        ].filter(line => line !== '');

        // Move to start position
        boundaryCode.push(`G0 X${(frameX1 - toolRadius).toFixed(3)} Y${(frameY1 - toolRadius).toFixed(3)}`);
        boundaryCode.push(`G0 Z${safeHeight.toFixed(1)}`);

        // Execute multiple passes
        for (let pass = 1; pass <= numPasses; pass++) {
            const currentDepth = actualPassDepth * pass;
            boundaryCode.push('');
            boundaryCode.push(`(Pass ${pass} of ${numPasses} - depth ${currentDepth.toFixed(2)}mm)`);
            boundaryCode.push(`G1 Z${(-currentDepth).toFixed(3)} F${plungeFeedRate}`);
            boundaryCode.push(`G1 X${(frameX2 + toolRadius).toFixed(3)} Y${(frameY1 - toolRadius).toFixed(3)} F${borderFeedRate}`);
            boundaryCode.push(`G1 X${(frameX2 + toolRadius).toFixed(3)} Y${(frameY2 + toolRadius).toFixed(3)}`);
            boundaryCode.push(`G1 X${(frameX1 - toolRadius).toFixed(3)} Y${(frameY2 + toolRadius).toFixed(3)}`);
            boundaryCode.push(`G1 X${(frameX1 - toolRadius).toFixed(3)} Y${(frameY1 - toolRadius).toFixed(3)}`);

            // Return to safe height after each pass
            if (pass < numPasses) {
                boundaryCode.push(`G0 Z${safeHeight.toFixed(1)}`);
            }
        }

        boundaryCode.push(`G0 Z${safeHeight.toFixed(1)}`);

        // Update time estimation for boundary (account for all passes)
        const frameDist = 2 * (imageWidthMM + imageHeightMM + 4 * toolRadius) * numPasses;
        totalTime += frameDist / borderFeedRate;

        if (includeBoundaryInGcode) {
            // Include boundary in main G-code
            gcode.push('', ...boundaryCode);
        } else {
            // Generate separate boundary G-code file
            const boundaryHeader = [
                '(Boundary Frame G-code)',
                `(Image size: ${imageWidthMM.toFixed(2)}mm x ${imageHeightMM.toFixed(2)}mm)`,
                borderMM > 0 ? `(Border: ${borderMM.toFixed(2)}mm)` : '',
                `(Frame depth: ${boundaryDepth.toFixed(2)}mm in ${numPasses} pass${numPasses > 1 ? 'es' : ''})`,
                `(Pass depth: ${actualPassDepth.toFixed(2)}mm)`,
                `(Tool: ${boundaryToolSize}mm diameter)`,
                toolChange ? `(Tool number: T${boundaryToolNumber})` : '',
                `(Generated for grblHAL)`,
                '',
                'G21 (Metric units)',
                'G90 (Absolute positioning)',
                'G17 (XY plane)',
                'G94 (Feed per minute)',
                'G54 (Work coordinate system)',
                '',
                toolChange ? '' : `M3 S${spindleSpeed} (Start spindle)`,
                toolChange ? '' : 'G4 P2 (Wait 2 seconds)',
                `F${borderFeedRate} (Set feed rate)`,
                `G0 Z${safeHeight.toFixed(1)} (Safe height)`,
                'G0 X0.000 Y0.000 (Move to origin)',
                ''
            ].filter(line => line !== '');

            const endPosition = endPositionSelect.value;
            const endPositionCommand = endPosition === 'home'
                ? 'G28 G91 Z0'
                : 'G90';

            const boundaryFooter = [
                '',
                'G1 Z15.0',
                'G17',
                'G28 G91 Z0',
                endPositionCommand,
                'M5',
                'M30'
            ];

            boundaryGcode = [...boundaryHeader, ...boundaryCode, ...boundaryFooter].join('\n');
        }
    }

    const returnDist = Math.sqrt(lastX ** 2 + lastY ** 2);
    totalTime += returnDist / rapidRate;

    const endPosition = endPositionSelect.value;
    const endPositionCommand = endPosition === 'home'
        ? 'G28 G91 Z0'
        : 'G90';

    if (plotterMode) {
        gcode.push(
            '',
            'M5 (Pen up)',
            'G28 G91 Z0',
            endPositionCommand,
            'M2 (End program)'
        );
    } else {
        gcode.push(
            '',
            'G1 Z15.0',
            'G17',
            'G28 G91 Z0',
            endPositionCommand,
            'M5',
            'M30'
        );
    }

    // Add estimated time to header as comment
    const hours = Math.floor(totalTime / 60);
    const minutes = Math.floor(totalTime % 60);
    let estimateComment = '(Estimated time: ';
    if (hours > 0) {
        estimateComment += `${hours}h ${minutes}m)`;
    } else {
        estimateComment += `${minutes}m)`;
    }
    gcode.splice(10, 0, estimateComment);

    // Add line numbers if requested
    let finalGcode = gcode;
    if (includeLineNumbers) {
        finalGcode = gcode.map((line, index) => {
            // Skip empty lines and comment-only lines for line numbers
            if (line.trim() === '' || line.trim().startsWith('(')) {
                return line;
            }
            return `N${(index + 1) * 5} ${line}`;
        });
    }

    return {
        gcode: finalGcode.join('\n'),
        boundaryGcode: boundaryGcode,
        estimatedTime: totalTime,
        totalDistance: totalCuttingDistance,
        lineCount: gcode.length,
        rapidMoveCount: rapidMoveCount
    };
}

// Download G-code
downloadButton.addEventListener('click', async () => {
    // Get G-code from Monaco Editor or fallback to memory
    const gcode = window.currentGcodeContent || (window.monacoGcode ? window.monacoGcode.getContent() : '');

    // Get filename and extension from UI
    let filename = filenameInput.value.trim() || 'halftone';
    const extension = fileTypeSelect.value;

    // Use native Windows file save dialog if available
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename + extension,
                types: [{
                    description: 'G-code Files',
                    accept: { 'text/plain': ['.nc', '.gcode', '.tap', '.txt'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(gcode);
            await writable.close();

            showSuccessModal(fileHandle.name, false);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err);
                alert('Error saving file.');
            }
        }
    } else {
        // Fallback for browsers without File System Access API
        downloadFallback(gcode, filename + extension);
    }
});

// Fallback download function
function downloadFallback(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Show success modal
function showSuccessModal(filename, isBoundary = false) {
    const overlay = document.createElement('div');
    overlay.className = 'success-modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'success-modal';

    const fileType = isBoundary ? 'Boundary Frame' : 'G-code';

    modal.innerHTML = `
        <div class="success-modal-icon">✓</div>
        <h3>File Saved Successfully!</h3>
        <div class="success-modal-details">
            <div class="success-modal-detail-row">
                <span class="success-modal-detail-label">File Type:</span>
                <span class="success-modal-detail-value">${fileType}</span>
            </div>
            <div class="success-modal-detail-row">
                <span class="success-modal-detail-label">Filename:</span>
                <span class="success-modal-detail-value">${filename}</span>
            </div>
        </div>
        <button class="success-modal-button">OK</button>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Close on button click or overlay click
    const closeModal = () => {
        document.body.removeChild(overlay);
    };

    modal.querySelector('.success-modal-button').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
        }
    });

    // Auto-close after 3 seconds
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            closeModal();
        }
    }, 3000);
}

// Download Boundary Frame G-code
downloadBoundaryButton.addEventListener('click', async () => {
    if (!currentBoundaryGcode) return;

    // Get filename and extension from UI
    let filename = filenameInput.value.trim() || 'halftone';
    const extension = fileTypeSelect.value;

    // Use native Windows file save dialog if available
    if ('showSaveFilePicker' in window) {
        try {
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename + '-boundary' + extension,
                types: [{
                    description: 'G-code Files',
                    accept: { 'text/plain': ['.nc', '.gcode', '.tap', '.txt'] }
                }]
            });

            const writable = await fileHandle.createWritable();
            await writable.write(currentBoundaryGcode);
            await writable.close();

            showSuccessModal(fileHandle.name, true);
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err);
                alert('Error saving file.');
            }
        }
    } else {
        // Fallback for browsers without File System Access API
        downloadFallback(currentBoundaryGcode, filename + '-boundary' + extension);
    }
});

// Tab Switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.getAttribute('data-tab');

        // Remove active class from all buttons and contents
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));

        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    });
});

// View Toggle (Image Preview vs G-code Output)
const viewToggleBtns = document.querySelectorAll('.view-toggle-btn');
const viewContainers = document.querySelectorAll('.view-container');

viewToggleBtns.forEach(button => {
    button.addEventListener('click', () => {
        const viewName = button.getAttribute('data-view');

        // Remove active class from all buttons and containers
        viewToggleBtns.forEach(btn => btn.classList.remove('active'));
        viewContainers.forEach(container => container.classList.remove('active'));

        // Add active class to clicked button and corresponding view
        button.classList.add('active');
        document.getElementById(`${viewName}-view`).classList.add('active');
    });
});

// Image Toggle (Original vs Halftone)
imageToggle.addEventListener('change', () => {
    if (imageToggle.checked) {
        // Show original
        originalCanvas.style.display = 'block';
        halftoneCanvas.style.display = 'none';
        // previewTitle.textContent = 'Original Image'; // Removed
    } else {
        // Show halftone
        originalCanvas.style.display = 'none';
        halftoneCanvas.style.display = 'block';
        // previewTitle.textContent = 'Halftone Preview'; // Removed
    }
});

// Plotter Mode - Hide/Show cutting-specific settings
plotterModeToggle.addEventListener('change', () => {
    const isPlotter = plotterModeToggle.checked;
    
    // CNC settings that are only for cutting
    const cuttingOnlyGroups = [
        document.getElementById('maxDepth-group'),
        document.getElementById('spindleSpeed-group'),
        document.getElementById('vbitAngle-group'),
        document.getElementById('materialThickness-group'),
        document.getElementById('borderCuttingFeedRate-group'),
        document.getElementById('ramping-group'),
        document.getElementById('rampDistance-group'),
        document.getElementById('multiPass-group'),
        document.getElementById('toolChange-group'),
        document.getElementById('vbitToolNumber-group'),
        document.getElementById('boundary-group'),
        document.getElementById('boundaryToolSize-group'),
        document.getElementById('boundaryPassDepth-group'),
        document.getElementById('boundaryToolNumber-group'),
        document.getElementById('includeBoundaryInGcode-group')
    ];
    
    cuttingOnlyGroups.forEach(group => {
        if (group) {
            group.style.display = isPlotter ? 'none' : 'flex';
        }
    });
    
    // Show plotter-specific settings
    const plotterLineWidthGroup = document.getElementById('plotterLineWidthMethod-group');
    if (plotterLineWidthGroup) {
        plotterLineWidthGroup.style.display = isPlotter ? 'flex' : 'none';
    }
    
    // Update sub-option visibility based on method selection
    updatePlotterMethodOptions();
});

// Handle plotter line width method selection
if (plotterLineWidthMethod) {
    plotterLineWidthMethod.addEventListener('change', updatePlotterMethodOptions);
}

// Enforce minimum value for plotterLineWidthHeavy
if (plotterLineWidthHeavyInput) {
    plotterLineWidthHeavyInput.addEventListener('input', function() {
        const min = parseFloat(this.min);
        const value = parseFloat(this.value);

        if (!isNaN(min) && !isNaN(value) && value < min) {
            this.value = min.toFixed(1);
            // Show visual feedback
            this.style.borderColor = '#ff4444';
            setTimeout(() => {
                this.style.borderColor = '';
            }, 500);
        }
    });

    plotterLineWidthHeavyInput.addEventListener('blur', function() {
        const min = parseFloat(this.min);
        const value = parseFloat(this.value);

        if (!isNaN(min) && !isNaN(value) && value < min) {
            this.value = min.toFixed(1);
        }
    });
}

function updatePlotterMethodOptions() {
    const isPlotterMode = plotterModeToggle?.checked || false;
    const method = plotterLineWidthMethod?.value || 'pressure';
    const isPressure = method === 'pressure';
    const isSetPenSize = method === 'setPenSize';

    const pressureGroups = [
        document.getElementById('plotterPressureCalibration-group'),
        document.getElementById('plotterPressureMin-group'),
        document.getElementById('plotterLineWidthLight-group'),
        document.getElementById('plotterPressureMax-group'),
        document.getElementById('plotterLineWidthHeavy-group')
    ];

    const penSizeGroup = document.getElementById('plotterPenSize-group');

    // Only show plotter controls if plotter mode is enabled
    pressureGroups.forEach(group => {
        if (group) group.style.display = (isPlotterMode && isPressure) ? 'flex' : 'none';
    });

    if (penSizeGroup) {
        penSizeGroup.style.display = (isPlotterMode && isSetPenSize) ? 'flex' : 'none';
    }
}

// Function to load a preset programmatically
function loadPreset(type, presetName, silent = false) {
    const storageKey = type === 'image' ? 'imagePresets' : 'cncPresets';
    const presets = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const preset = presets[presetName];

    if (!preset) {
        if (!silent) {
            alert(`Preset "${presetName}" not found!`);
        }
        return false;
    }

    if (type === 'image') {
        patternTypeSelect.value = preset.patternType;
        spacingInput.value = preset.spacing || preset.lineSpacing || 1;
        angleInput.value = preset.angle;
        crosshatchAngle2Input.value = preset.crosshatchAngle2;
        maxDepthInput.value = preset.maxDepth;
        brightnessInput.value = preset.brightness;
        contrastInput.value = preset.contrast;
        gammaInput.value = preset.gamma;
        shadowsInput.value = preset.shadows !== undefined ? preset.shadows : 0;
        midtonesInput.value = preset.midtones !== undefined ? preset.midtones : 1.0;
        highlightsInput.value = preset.highlights !== undefined ? preset.highlights : 255;
        invertToggle.checked = preset.invert;
        upscaleToggle.checked = preset.upscale || false;
        imageWidthInput.value = preset.imageWidth;
        imageHeightInput.value = preset.imageHeight || preset.imageWidth;
        lockAspectToggle.checked = preset.lockAspect !== undefined ? preset.lockAspect : true;
        borderInput.value = preset.border || 0.25;
        minSizeInput.value = preset.minSize !== undefined ? preset.minSize : 0;
        maxSizeInput.value = preset.maxSize !== undefined ? preset.maxSize : 1;
        wavelengthInput.value = preset.wavelength || 5;
        amplitudeInput.value = preset.amplitude || 0.5;
        centerOffsetXInput.value = preset.centerOffsetX || 0;
        centerOffsetYInput.value = preset.centerOffsetY || 0;
        offsetOddLinesToggle.checked = preset.offsetOddLines || false;
        darkBoostToggle.checked = preset.darkBoost || false;
        fixedSizesToggle.checked = preset.fixedSizes || false;
        patternTypeSelect.dispatchEvent(new Event('change'));
    } else {
        materialThicknessInput.value = preset.materialThickness;
        safeHeightInput.value = preset.safeHeight;
        spindleSpeedInput.value = preset.spindleSpeed;
        cuttingFeedRateInput.value = preset.cuttingFeedRate;
        borderCuttingFeedRateInput.value = preset.borderCuttingFeedRate || preset.cuttingFeedRate;
        plungeFeedRateInput.value = preset.plungeFeedRate;
        vbitAngleSelect.value = preset.vbitAngle;
        workZeroSelect.value = preset.workZeroPosition;
        endPositionSelect.value = preset.endPosition;
        toolChangeToggle.checked = preset.toolChange;
        vbitToolNumberInput.value = preset.vbitToolNumber || 1;
        boundaryToolNumberInput.value = preset.boundaryToolNumber || 2;
        rampingToggle.checked = preset.ramping;
        rampDistanceInput.value = preset.rampDistance;
        boundaryToggle.checked = preset.boundary;
        boundaryToolSizeInput.value = preset.boundaryToolSize || 3.175;
        boundaryPassDepthInput.value = preset.boundaryPassDepth || 0.5;
        includeBoundaryInGcodeToggle.checked = preset.includeBoundaryInGcode !== undefined ? preset.includeBoundaryInGcode : true;
        multiPassCountInput.value = preset.multiPassCount || 1;
        depthPerPassInput.value = preset.depthPerPass !== undefined ? preset.depthPerPass : 0.1;
        lineNumbersToggle.checked = preset.lineNumbers || false;
        optimizeToolpathToggle.checked = preset.optimizeToolpath !== undefined ? preset.optimizeToolpath : true;
        if (preset.filename) filenameInput.value = preset.filename;
        if (preset.fileType) fileTypeSelect.value = preset.fileType;

        const savedPlotterMode = preset.plotterMode || false;
        plotterModeToggle.checked = savedPlotterMode;

        if (plotterLineWidthMethod) plotterLineWidthMethod.value = preset.plotterLineWidthMethod || 'pressure';
        if (plotterPressureMinInput) plotterPressureMinInput.value = preset.plotterPressureMin || 0;
        if (plotterPressureMaxInput) plotterPressureMaxInput.value = preset.plotterPressureMax || -0.5;
        if (plotterLineWidthLightInput) plotterLineWidthLightInput.value = preset.plotterLineWidthLight || 0.3;
        if (plotterLineWidthHeavyInput) plotterLineWidthHeavyInput.value = preset.plotterLineWidthHeavy || 1.0;
        if (plotterPenWidthInput) plotterPenWidthInput.value = preset.plotterPenWidth || 0.5;
        if (plotterPenSizeInput) plotterPenSizeInput.value = preset.plotterPenSize || 0.5;
        toolChangeToggle.dispatchEvent(new Event('change'));
        rampingToggle.dispatchEvent(new Event('change'));
        boundaryToggle.dispatchEvent(new Event('change'));
        plotterModeToggle.dispatchEvent(new Event('change'));
        if (plotterLineWidthMethod) plotterLineWidthMethod.dispatchEvent(new Event('change'));
        updateDepthPerPassVisibility();
    }

    return true;
}

// Auto-load default presets on page load
function loadDefaultPresets() {
    const defaultImagePreset = localStorage.getItem('defaultImagePreset');
    const defaultCncPreset = localStorage.getItem('defaultCncPreset');

    if (defaultImagePreset) {
        const success = loadPreset('image', defaultImagePreset, true);
        if (!success) {
            // Preset was deleted, clear the default
            localStorage.removeItem('defaultImagePreset');
        }
    }

    if (defaultCncPreset) {
        const success = loadPreset('cnc', defaultCncPreset, true);
        if (!success) {
            // Preset was deleted, clear the default
            localStorage.removeItem('defaultCncPreset');
        }
    }
}

// Load default presets on initialization
loadDefaultPresets();

// Initialize plotter mode visibility after presets are loaded
plotterModeToggle.dispatchEvent(new Event('change'));
updatePlotterMethodOptions();

// Event listener for Set Default Presets button
setDefaultPresetsButton.addEventListener('click', () => {
    showDefaultPresetsModal();
});

// Initialize theme on page load
initTheme();

// Initialize all toggle-dependent visibility on page load
// These must be called after all event listeners are attached
updateDepthPerPassVisibility();
toolChangeToggle.dispatchEvent(new Event('change'));
rampingToggle.dispatchEvent(new Event('change'));
boundaryToggle.dispatchEvent(new Event('change'));
splitFilesToggle.dispatchEvent(new Event('change'));
