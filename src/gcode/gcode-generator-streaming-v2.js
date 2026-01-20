/**
 * Streaming G-code Generator v2
 * Completely separate from the original generateGcode function
 * This version writes directly to disk via Tauri streaming API
 * Memory usage: ~50-100MB regardless of output size
 */

/**
 * Generate G-code header lines (without writing to file)
 * Returns array of header lines
 */
function generateGcodeHeader(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero, spindleSpeed, toolChange, vbitToolNumber, boundaryToolNumber, boundaryToolSize, multiPassCount, ramping, rampDistance, boundary, plotterMode, includeLineNumbers, outputUnits = 'mm') {
    const headerLines = [];
    const patternType = halftoneData.patternType || 'lines';
    const elementCount = halftoneData.lines ? halftoneData.lines.length : halftoneData.elements.length;
    const workZeroLabel = workZero.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

    // Unit conversion
    const isInchMode = outputUnits === 'inch';
    const unitScale = isInchMode ? 1/25.4 : 1;
    const unitLabel = isInchMode ? 'inches' : 'mm';
    const feedScale = unitScale;
    const precision = isInchMode ? 4 : 2;

    // Helper to format numbers based on units
    const fmt = (num) => (num * unitScale).toFixed(precision);

    // Build header
    headerLines.push(`(Halftone ${patternType.charAt(0).toUpperCase() + patternType.slice(1)} Pattern G-code)`);
    headerLines.push(plotterMode ? '(PLOTTER MODE - Pen Up/Down control)' : '(CUTTING MODE - Z-axis engraving)');
    headerLines.push(`(Image size: ${fmt(halftoneData.width)} x ${fmt(halftoneData.height)} ${unitLabel})`);
    if (!plotterMode) headerLines.push(`(Max depth: ${fmt(maxDepth)} ${unitLabel})`);
    headerLines.push(`(Safe Z height: ${fmt(safeHeight)} ${unitLabel})`);
    if (!plotterMode) headerLines.push(`(Spindle speed: ${spindleSpeed} RPM)`);
    if (!plotterMode) headerLines.push(`(V-bit angle: ${vbitAngle}°)`);
    if (toolChange && !plotterMode) headerLines.push(`(V-bit tool: T${vbitToolNumber})`);
    if (boundary && toolChange) headerLines.push(`(Boundary frame tool: T${boundaryToolNumber}, ${fmt(boundaryToolSize)} ${unitLabel} diameter)`);
    headerLines.push(plotterMode
        ? `(Drawing feed rate: ${Math.round(cuttingFeedRate * feedScale)} ${unitLabel}/min)`
        : `(Cutting feed rate: ${Math.round(cuttingFeedRate * feedScale)} ${unitLabel}/min)`);
    headerLines.push(plotterMode
        ? `(Pen up/down rate: ${Math.round(plungeFeedRate * feedScale)} ${unitLabel}/min)`
        : `(Plunge feed rate: ${Math.round(plungeFeedRate * feedScale)} ${unitLabel}/min)`);
    headerLines.push(`(Work zero position: ${workZeroLabel})`);
    headerLines.push(`(Total elements: ${elementCount})`);
    if (multiPassCount > 1 && !plotterMode) headerLines.push(`(Halftone passes: ${multiPassCount})`);
    if (ramping && !plotterMode) headerLines.push(`(Z-ramping enabled: ${fmt(rampDistance)} ${unitLabel})`);
    if (boundary) headerLines.push(`(Boundary frame enabled at border edge)`);
    headerLines.push(`(Generated for grblHAL)`);
    headerLines.push('');
    headerLines.push(isInchMode ? 'G20 (Imperial units)' : 'G21 (Metric units)');
    headerLines.push('G90 (Absolute positioning)');
    headerLines.push('G17 (XY plane)');
    headerLines.push('G94 (Feed per minute)');
    headerLines.push('G54 (Work coordinate system)');
    headerLines.push('');

    if (!plotterMode) {
        if (toolChange) {
            headerLines.push(`T${vbitToolNumber} M6 (Load V-bit tool)`);
            headerLines.push('G43 H1 (Tool length offset)');
        }

        headerLines.push(`M3 S${spindleSpeed} (Start spindle)`);
        headerLines.push('G4 P2 (Wait 2 seconds for spindle to reach speed)');
    }

    headerLines.push(`F${Math.round(cuttingFeedRate * feedScale)} (Set initial feed rate)`);
    headerLines.push(`G0 Z${fmt(safeHeight)} (Safe height)`);
    headerLines.push(`G0 X${fmt(0)} Y${fmt(0)} (Move to origin)`);
    headerLines.push('');

    return headerLines;
}

/**
 * Generate G-code footer lines (without writing to file)
 * Returns array of footer lines
 */
function generateGcodeFooter(safeHeight, plotterMode, outputUnits = 'mm') {
    const footerLines = [];

    // Unit conversion
    const isInchMode = outputUnits === 'inch';
    const unitScale = isInchMode ? 1/25.4 : 1;
    const precision = isInchMode ? 4 : 2;
    const fmt = (num) => (num * unitScale).toFixed(precision);

    if (!plotterMode) {
        footerLines.push('M5 (Stop spindle)');
    }
    footerLines.push(`G0 Z${fmt(safeHeight)} (Return to safe height)`);
    footerLines.push(`G0 X${fmt(0)} Y${fmt(0)} (Return to origin)`);
    footerLines.push('M30 (Program end)');

    return footerLines;
}

async function generateGcodeStreaming(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero = 'bottom-left', spindleSpeed = 12000, toolChange = false, vbitToolNumber = 1, boundaryToolNumber = 2, boundaryToolSize = 3.175, boundaryDepth = 1, boundaryPassDepth = 0.5, multiPassCount = 1, depthPerPass = 0.1, ramping = false, rampDistance = 2, boundary = false, includeBoundaryInGcode = true, includeLineNumbers = false, optimizeToolpathEnabled = true, bidirectional = true, borderCuttingFeedRate = null, plotterMode = false, plotterLineWidthMethod = 'pressure', plotterPressureMin = 0, plotterPressureMax = -0.5, plotterPenWidth = 0.5, plotterPenSize = 0.5, plotterLineWidthLight = 0.3, plotterLineWidthHeavy = 1.0, plotterPenLift = 2, plotterCalibration = null, outputUnits = 'mm', acceleration = 500, streamer) {

    // Extract advanced calibration settings
    const useMidpointCalibration = plotterCalibration?.useMidpoint || false;
    const plotterPressureMid = plotterCalibration?.pressureMid || -0.25;
    const plotterLineWidthMid = plotterCalibration?.widthMid || 0.6;
    const usePressureRamping = plotterCalibration?.useRamping || false;
    const plotterRampDistance = plotterCalibration?.rampDistance || 2;

    // Pressure interpolation function (supports 2-point linear or 3-point quadratic)
    const interpolatePressure = (targetWidth) => {
        // Clamp target width to calibrated range
        const clampedWidth = Math.max(plotterLineWidthLight, Math.min(plotterLineWidthHeavy, targetWidth));

        if (useMidpointCalibration) {
            // 3-point Lagrange interpolation for quadratic curve
            const w0 = plotterLineWidthLight, p0 = plotterPressureMin;
            const w1 = plotterLineWidthMid, p1 = plotterPressureMid;
            const w2 = plotterLineWidthHeavy, p2 = plotterPressureMax;
            const w = clampedWidth;

            const L0 = ((w - w1) * (w - w2)) / ((w0 - w1) * (w0 - w2));
            const L1 = ((w - w0) * (w - w2)) / ((w1 - w0) * (w1 - w2));
            const L2 = ((w - w0) * (w - w1)) / ((w2 - w0) * (w2 - w1));

            return L0 * p0 + L1 * p1 + L2 * p2;
        } else {
            // 2-point linear interpolation
            const widthRange = plotterLineWidthHeavy - plotterLineWidthLight;
            const pressureRange = plotterPressureMax - plotterPressureMin;
            const widthRatio = widthRange > 0 ? (clampedWidth - plotterLineWidthLight) / widthRange : 0;
            return plotterPressureMin + (widthRatio * pressureRange);
        }
    };

    // Unit conversion setup
    const isInchMode = outputUnits === 'inch';
    const unitScale = isInchMode ? 1/25.4 : 1;
    const feedScale = unitScale;
    const precision = isInchMode ? 4 : 2;
    const unitLabel = isInchMode ? 'inches' : 'mm';

    // Time estimation variables
    let totalTime = 0;
    let totalCuttingDistance = 0;
    let rapidMoveCount = 0;
    let lastX = 0;
    let lastY = 0;
    let lastZ = safeHeight;

    const pixelsToMM = halftoneData.width / halftoneData.pixelWidth;
    const minDepth = 0.05;
    const rapidRate = 5000;

    // Acceleration-aware time calculation
    // acceleration is in mm/s², feedRate is in mm/min
    // Returns time in seconds
    //
    // CNC machines can't instantly change direction - they must slow down at corners.
    // For small segments (wave patterns), the machine often can't reach full speed
    // before needing to slow for the next direction change.

    const calculateMoveTime = (distance, feedRate, isDirectionChange = false) => {
        if (distance <= 0) return 0;

        // Convert feed rate from mm/min to mm/s
        const maxVelocity = feedRate / 60;

        // If acceleration is 0 or disabled, use simple calculation
        if (!acceleration || acceleration <= 0) {
            return distance / maxVelocity;
        }

        // Calculate the distance needed to accelerate to full speed
        // d = v² / (2a)
        const accelDistance = (maxVelocity * maxVelocity) / (2 * acceleration);

        // For major direction changes (rapids, plunges, retracts), use full trapezoidal profile
        if (isDirectionChange) {
            if (distance < 2 * accelDistance) {
                // Triangular profile - never reaches full speed
                // t = 2 * sqrt(d / a)
                return 2 * Math.sqrt(distance / acceleration);
            } else {
                // Trapezoidal profile
                const accelTime = maxVelocity / acceleration;
                const cruiseDistance = distance - 2 * accelDistance;
                const cruiseTime = cruiseDistance / maxVelocity;
                return 2 * accelTime + cruiseTime;
            }
        }

        // For continuous cutting moves (G1 segments), the machine uses look-ahead
        // but still must slow for corners. Use a junction speed model:
        // - Very short segments (<1mm) can't reach full speed
        // - Longer segments approach full speed

        // Effective speed reduction factor based on segment length
        // Short segments = lower effective speed due to corner slowdowns
        const effectiveSpeedRatio = Math.min(1, Math.sqrt(distance / (2 * accelDistance)));
        const effectiveVelocity = maxVelocity * Math.max(0.3, effectiveSpeedRatio);  // Min 30% speed

        return distance / effectiveVelocity;
    };

    // Determine pattern type
    const patternType = halftoneData.patternType || 'lines';
    const elementCount = halftoneData.lines ? halftoneData.lines.length : halftoneData.elements.length;

    // Calculate offset based on work zero position
    let xOffset = 0;
    let yOffset = 0;

    switch(workZero) {
        case 'bottom-left': xOffset = 0; yOffset = 0; break;
        case 'bottom-center': xOffset = -halftoneData.width / 2; yOffset = 0; break;
        case 'bottom-right': xOffset = -halftoneData.width; yOffset = 0; break;
        case 'center-left': xOffset = 0; yOffset = -halftoneData.height / 2; break;
        case 'center': xOffset = -halftoneData.width / 2; yOffset = -halftoneData.height / 2; break;
        case 'center-right': xOffset = -halftoneData.width; yOffset = -halftoneData.height / 2; break;
        case 'top-left': xOffset = 0; yOffset = -halftoneData.height; break;
        case 'top-center': xOffset = -halftoneData.width / 2; yOffset = -halftoneData.height; break;
        case 'top-right': xOffset = -halftoneData.width; yOffset = -halftoneData.height; break;
    }

    // Line numbering
    let lineNumber = 10;

    // Modal state tracking for optimization
    const modalState = {
        currentG: null,     // Current G command (G0, G1, G2, G3)
        currentF: null,     // Current feed rate
        lastOutputX: null,  // Last X coordinate output
        lastOutputY: null,  // Last Y coordinate output
        lastOutputZ: null   // Last Z coordinate output
    };

    // Format number with unit conversion (0.01mm or 0.0001" precision)
    const fmt = (num) => (num * unitScale).toFixed(precision);

    // Helper to write a line
    const writeLine = async (line) => {
        const finalLine = includeLineNumbers ? `N${lineNumber} ${line}` : line;
        await streamer.writeLine(finalLine);

        if (includeLineNumbers) {
            lineNumber += 10;
        }

        // Update progress every 1000 lines
        if (streamer.getLineCount() % 1000 === 0) {
            const gcodeInfo = document.getElementById('gcodeInfo');
            if (gcodeInfo && window.currentGcodeFilename) {
                const lineCount = streamer.getLineCount().toLocaleString();
                gcodeInfo.textContent = `Writing ${lineCount} lines of G-code to file "${window.currentGcodeFilename}"`;
            }
        }
    };

    // Optimized movement command builder
    const buildMove = (gCode, x, y, z, f) => {
        let cmd = '';

        // Only output G command if it changed
        if (gCode !== modalState.currentG) {
            cmd += gCode;
            modalState.currentG = gCode;
        }

        // Only output coordinates that changed
        if (x !== null && x !== undefined && x !== modalState.lastOutputX) {
            cmd += ` X${fmt(x)}`;
            modalState.lastOutputX = x;
        }
        if (y !== null && y !== undefined && y !== modalState.lastOutputY) {
            cmd += ` Y${fmt(y)}`;
            modalState.lastOutputY = y;
        }
        if (z !== null && z !== undefined && z !== modalState.lastOutputZ) {
            cmd += ` Z${fmt(z)}`;
            modalState.lastOutputZ = z;
        }

        // Only output feed rate if it changed and is specified (with unit conversion)
        if (f !== null && f !== undefined && f !== modalState.currentF) {
            cmd += ` F${Math.round(f * feedScale)}`;
            modalState.currentF = f;
        }

        return cmd.trim();
    };

    // Arc command builder (G2/G3)
    const buildArc = (gCode, x, y, z, i, j, f) => {
        let cmd = '';

        // Only output G command if it changed
        if (gCode !== modalState.currentG) {
            cmd += gCode;
            modalState.currentG = gCode;
        }

        // Output coordinates (always include for arcs)
        if (x !== null && x !== undefined) {
            cmd += ` X${fmt(x)}`;
            modalState.lastOutputX = x;
        }
        if (y !== null && y !== undefined) {
            cmd += ` Y${fmt(y)}`;
            modalState.lastOutputY = y;
        }
        if (z !== null && z !== undefined) {
            cmd += ` Z${fmt(z)}`;
            modalState.lastOutputZ = z;
        }

        // I and J offsets (always required for arcs)
        if (i !== null && i !== undefined) {
            cmd += ` I${fmt(i)}`;
        }
        if (j !== null && j !== undefined) {
            cmd += ` J${fmt(j)}`;
        }

        // Only output feed rate if it changed (with unit conversion)
        if (f !== null && f !== undefined && f !== modalState.currentF) {
            cmd += ` F${Math.round(f * feedScale)}`;
            modalState.currentF = f;
        }

        return cmd.trim();
    };

    // === HEADER ===
    // NOTE: Header is now written by the GcodeStreamer via start() method
    // This ensures each file part gets a proper header

    // Account for header time in estimation
    if (!plotterMode) {
        totalTime += 2; // Spindle startup wait time
    }
    // Add time for initial positioning (assume machine starts at 0,0,0)
    totalTime += calculateMoveTime(safeHeight, rapidRate, true);

    // === MAIN PATTERN GENERATION ===
    await writeLine('(Begin halftone pattern)');

    if (patternType === 'lines' && halftoneData.lines) {
        // Process line pattern
        const lines = halftoneData.lines;

        for (let pass = 0; pass < multiPassCount; pass++) {
            if (multiPassCount > 1 && !plotterMode) {
                await writeLine(`(Pass ${pass + 1} of ${multiPassCount})`);
            }

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];

                // Determine if we should reverse this line for bidirectional engraving
                const shouldReverse = bidirectional && (lineIndex % 2 === 1);
                const processedLine = shouldReverse ? [...line].reverse() : line;

                // Process each point in the line
                for (let i = 0; i < processedLine.length; i++) {
                    const point = processedLine[i];
                    const x = (point.x * pixelsToMM) + xOffset;
                    // Flip Y coordinate: image Y increases down, CNC Y increases up
                    const y = (halftoneData.height - (point.y * pixelsToMM)) + yOffset;

                    let depth, lineWidth;

                    if (plotterMode) {
                        // Plotter mode
                        if (plotterLineWidthMethod === 'pressure') {
                            // point.depth is 0-1 representing brightness in the halftone
                            // point.width contains the actual line width in mm from the halftone
                            // Use point.width if available, otherwise calculate from point.depth and halftone maxSize
                            const actualLineWidth = point.width !== undefined ? point.width :
                                (point.depth * (halftoneData.maxSize || maxDepth * 2));

                            // Use the interpolation function (supports linear or quadratic)
                            depth = interpolatePressure(actualLineWidth);
                            lineWidth = actualLineWidth;

                            if (i === 0) {
                                // Start of line - rapid move to position
                                const cmd = buildMove('G0', x, y, null, null);
                                if (cmd) await writeLine(cmd);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                totalTime += calculateMoveTime(rapidDist, rapidRate, true);

                                // Apply pressure ramping at line start if enabled
                                if (usePressureRamping && processedLine.length > 1) {
                                    // Start with light pressure and ramp to target
                                    const startPressure = plotterPressureMin; // Light pressure
                                    const cmd2 = buildMove('G1', null, null, startPressure, plungeFeedRate);
                                    if (cmd2) await writeLine(cmd2);
                                }
                            } else {
                                // Apply pressure ramping if enabled
                                let effectiveDepth = depth;
                                if (usePressureRamping) {
                                    // Calculate distance from line start and end
                                    const distFromStart = i * pixelsToMM; // Approximate
                                    const distFromEnd = (processedLine.length - 1 - i) * pixelsToMM;

                                    if (distFromStart < plotterRampDistance) {
                                        // Ramp up from light pressure
                                        const rampRatio = distFromStart / plotterRampDistance;
                                        effectiveDepth = plotterPressureMin + (depth - plotterPressureMin) * rampRatio;
                                    } else if (distFromEnd < plotterRampDistance) {
                                        // Ramp down to light pressure
                                        const rampRatio = distFromEnd / plotterRampDistance;
                                        effectiveDepth = plotterPressureMin + (depth - plotterPressureMin) * rampRatio;
                                    }
                                }

                                const cmd = buildMove('G1', x, y, effectiveDepth, cuttingFeedRate);
                                if (cmd) await writeLine(cmd);
                            }
                        } else {
                            // Set Pen Size method - skip point-by-point processing
                            // Optimized handling is done at the line level after this loop
                            continue;
                        }
                    } else {
                        // Cutting mode
                        // Get the target line width from halftone data
                        const targetWidth = point.width !== undefined ? point.width :
                            (point.depth * (halftoneData.maxSize || 2));

                        // Calculate depth needed to achieve this width with the V-bit
                        // Formula: width = 2 * depth * tan(halfAngle), so depth = width / (2 * tan(halfAngle))
                        const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                        const fullDepth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);

                        // Apply progressive depth stepping for multiple passes
                        // Pass 1: depth - (multiPassCount - 1) * depthPerPass, Final pass: full depth
                        const depthReduction = (multiPassCount - 1 - pass) * depthPerPass;
                        depth = Math.max(minDepth, fullDepth - depthReduction);

                        if (depth > minDepth) {
                            if (i === 0) {
                                const cmd1 = buildMove('G0', x, y, null, null);
                                if (cmd1) await writeLine(cmd1);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                totalTime += calculateMoveTime(rapidDist, rapidRate, true);

                                if (ramping && i + 1 < line.length) {
                                    const nextPoint = line[i + 1];
                                    const nextX = (nextPoint.x * pixelsToMM) + xOffset;
                                    const nextY = (nextPoint.y * pixelsToMM) + yOffset;
                                    const distance = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);

                                    if (distance >= rampDistance) {
                                        const ratio = rampDistance / distance;
                                        const rampX = x + (nextX - x) * ratio;
                                        const rampY = y + (nextY - y) * ratio;
                                        const cmd2 = buildMove('G1', rampX, rampY, -depth, plungeFeedRate);
                                        if (cmd2) await writeLine(cmd2);
                                        const cmd3 = buildMove('G1', nextX, nextY, null, cuttingFeedRate);
                                        if (cmd3) await writeLine(cmd3);
                                        i++;
                                        const dist = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);
                                        totalCuttingDistance += dist;
                                        totalTime += calculateMoveTime(rampDistance, plungeFeedRate, true) + calculateMoveTime(dist - rampDistance, cuttingFeedRate);
                                        lastX = nextX;
                                        lastY = nextY;
                                        continue;
                                    }
                                }

                                const cmd2 = buildMove('G1', null, null, -depth, plungeFeedRate);
                                if (cmd2) await writeLine(cmd2);
                                lastZ = -depth;
                                totalTime += calculateMoveTime(depth, plungeFeedRate, true);
                            } else {
                                // Include Z for variable depth engraving along the line
                                const cmd = buildMove('G1', x, y, -depth, cuttingFeedRate);
                                if (cmd) await writeLine(cmd);
                                const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + ((-depth) - lastZ) ** 2);
                                totalCuttingDistance += dist;
                                totalTime += calculateMoveTime(dist, cuttingFeedRate);
                                lastZ = -depth;
                            }

                            lastX = x;
                            lastY = y;
                        }
                    }
                }

                // Optimized Set Pen Size method: process entire line for each pass
                // This minimizes pen lifts by drawing complete parallel lines
                if (plotterMode && plotterLineWidthMethod !== 'pressure') {
                    const penSize = plotterPenSize;

                    // Calculate the maximum number of passes needed for this line
                    // based on the widest point in the line
                    let maxPasses = 1;
                    for (const point of processedLine) {
                        const actualLineWidth = point.width !== undefined ? point.width :
                            (point.depth * (halftoneData.maxSize || maxDepth * 2));
                        const numPasses = Math.max(1, Math.ceil(actualLineWidth / penSize));
                        maxPasses = Math.max(maxPasses, numPasses);
                    }

                    // Process each offset pass for the entire line
                    for (let offsetPass = 0; offsetPass < maxPasses; offsetPass++) {
                        // Alternate direction for bidirectional optimization
                        const drawReverse = offsetPass % 2 === 1;
                        const passPoints = drawReverse ? [...processedLine].reverse() : processedLine;

                        let passStarted = false;

                        for (let i = 0; i < passPoints.length; i++) {
                            const point = passPoints[i];
                            const actualLineWidth = point.width !== undefined ? point.width :
                                (point.depth * (halftoneData.maxSize || maxDepth * 2));
                            const numPassesForPoint = Math.max(1, Math.ceil(actualLineWidth / penSize));

                            // Skip this point if it doesn't need this many passes
                            if (offsetPass >= numPassesForPoint) {
                                if (passStarted) {
                                    // Lift pen when skipping points mid-pass
                                    const cmd = buildMove('G0', null, null, plotterPenLift, null);
                                    if (cmd) await writeLine(cmd);
                                    passStarted = false;
                                }
                                continue;
                            }

                            const x = (point.x * pixelsToMM) + xOffset;
                            const y = (halftoneData.height - (point.y * pixelsToMM)) + yOffset;

                            // Calculate perpendicular offset
                            const offsetDist = (offsetPass - (numPassesForPoint - 1) / 2) * penSize;
                            let offsetX = x;
                            let offsetY = y;

                            if (i > 0) {
                                const prevIdx = drawReverse ? i + 1 : i - 1;
                                if (prevIdx >= 0 && prevIdx < passPoints.length) {
                                    const prevPoint = passPoints[prevIdx < i ? prevIdx : Math.max(0, i - 1)];
                                    const prevX = (prevPoint.x * pixelsToMM) + xOffset;
                                    const prevY = (prevPoint.y * pixelsToMM) + yOffset;
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
                            }

                            if (!passStarted) {
                                // Start of pass: rapid move, then pen down
                                const cmd1 = buildMove('G0', offsetX, offsetY, null, null);
                                if (cmd1) await writeLine(cmd1);
                                const cmd2 = buildMove('G1', null, null, 0, plungeFeedRate);
                                if (cmd2) await writeLine(cmd2);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                totalTime += calculateMoveTime(rapidDist, rapidRate, true);
                                passStarted = true;
                            } else {
                                // Continue drawing
                                const cmd = buildMove('G1', offsetX, offsetY, 0, cuttingFeedRate);
                                if (cmd) await writeLine(cmd);
                                const drawDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                totalCuttingDistance += drawDist;
                                totalTime += calculateMoveTime(drawDist, cuttingFeedRate);
                            }

                            lastX = offsetX;
                            lastY = offsetY;
                        }

                        // Lift pen at end of pass
                        if (passStarted) {
                            const cmd = buildMove('G0', null, null, plotterPenLift, null);
                            if (cmd) await writeLine(cmd);
                            lastZ = plotterPenLift;
                            totalTime += calculateMoveTime(plotterPenLift, rapidRate, true);
                        }
                    }
                }

                // Retract at end of line
                if (!plotterMode) {
                    const cmd = buildMove('G0', null, null, safeHeight, null);
                    if (cmd) await writeLine(cmd);
                    lastZ = safeHeight;
                    totalTime += calculateMoveTime(safeHeight + Math.abs(lastZ), rapidRate, true);
                } else if (plotterMode && plotterLineWidthMethod === 'pressure') {
                    // Lift pen to avoid dragging between lines (only for pressure method)
                    const cmd = buildMove('G0', null, null, plotterPenLift, null);
                    if (cmd) await writeLine(cmd);
                    lastZ = plotterPenLift;
                    totalTime += calculateMoveTime(plotterPenLift, rapidRate, true);
                }
                // Note: Set Pen Size method already lifts pen after each pass above
            }
        }

    } else if (halftoneData.elements) {
        // Process dots, squares, circles patterns
        const elements = halftoneData.elements;

        // For elements, we do all passes at each location (more efficient)
        // So no outer pass loop needed here
        for (let i = 0; i < elements.length; i++) {
                const element = elements[i];
                const x = element.x + xOffset;
                // Flip Y coordinate: image Y increases down, CNC Y increases up
                const y = (halftoneData.height - element.y) + yOffset;

                let depth;

                if (plotterMode) {
                    if (plotterLineWidthMethod === 'pressure') {
                        // element.size contains the actual size in mm from the halftone
                        const actualLineWidth = element.size || (element.depth * (halftoneData.maxSize || maxDepth * 2));

                        // Use the interpolation function (supports linear or quadratic)
                        depth = interpolatePressure(actualLineWidth);

                        const cmd1 = buildMove('G0', x, y, null, null);
                        if (cmd1) await writeLine(cmd1);
                        rapidMoveCount++;
                        const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                        totalTime += calculateMoveTime(rapidDist, rapidRate, true);
                        const cmd2 = buildMove('G1', null, null, depth, plungeFeedRate);
                        if (cmd2) await writeLine(cmd2);
                        lastX = x;
                        lastY = y;
                    } else {
                        // Set Pen Size method: generate concentric paths based on actual element size
                        const penSize = plotterPenSize;
                        const elementSize = element.size || (element.depth * (halftoneData.maxSize || maxDepth * 2));
                        // Calculate number of concentric paths needed to fill the element
                        const numPaths = Math.max(1, Math.ceil(elementSize / (penSize * 2)));

                        // Determine if this is dots (circles) or squares
                        const isDots = patternType === 'dots';

                        for (let pathIndex = 0; pathIndex < numPaths; pathIndex++) {
                            const radius = elementSize / 2 - (pathIndex * penSize);
                            if (radius < penSize / 2) break; // Stop when radius gets too small

                            if (isDots) {
                                // Generate concentric circle using G02 arc command
                                // Start point: right side of circle (x + radius, y)
                                const startX = x + radius;
                                const startY = y;

                                if (pathIndex > 0) {
                                    // Lift pen between paths
                                    const cmd1 = buildMove('G0', null, null, plotterPenLift, null);
                                    if (cmd1) await writeLine(cmd1);
                                }

                                // Rapid move to start point
                                const cmd2 = buildMove('G0', startX, startY, null, null);
                                if (cmd2) await writeLine(cmd2);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((startX - lastX) ** 2 + (startY - lastY) ** 2);
                                totalTime += calculateMoveTime(rapidDist, rapidRate, true);

                                // Lower pen
                                const cmd3 = buildMove('G1', null, null, 0, plungeFeedRate);
                                if (cmd3) await writeLine(cmd3);

                                // Draw full circle using G02 (clockwise arc)
                                // I and J are offsets from start point to center
                                // From (x + radius, y) to center (x, y): I = -radius, J = 0
                                const cmd4 = buildArc('G02', startX, startY, null, -radius, 0, cuttingFeedRate);
                                if (cmd4) await writeLine(cmd4);

                                // Calculate circle circumference for time estimation
                                const circumference = 2 * Math.PI * radius;
                                totalCuttingDistance += circumference;
                                totalTime += calculateMoveTime(circumference, cuttingFeedRate);

                                lastX = startX;
                                lastY = startY;
                            } else {
                                // Generate concentric square
                                const halfSize = radius;
                                const corners = [
                                    {x: x - halfSize, y: y - halfSize},
                                    {x: x + halfSize, y: y - halfSize},
                                    {x: x + halfSize, y: y + halfSize},
                                    {x: x - halfSize, y: y + halfSize},
                                    {x: x - halfSize, y: y - halfSize}  // Close the square
                                ];

                                for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex++) {
                                    const corner = corners[cornerIndex];
                                    if (cornerIndex === 0) {
                                        if (pathIndex > 0) {
                                            // Lift pen between paths
                                            const cmd1 = buildMove('G0', null, null, plotterPenLift, null);
                                            if (cmd1) await writeLine(cmd1);
                                        }
                                        const cmd2 = buildMove('G0', corner.x, corner.y, null, null);
                                        if (cmd2) await writeLine(cmd2);
                                        const cmd3 = buildMove('G1', null, null, 0, plungeFeedRate);
                                        if (cmd3) await writeLine(cmd3);
                                        rapidMoveCount++;
                                        const rapidDist = Math.sqrt((corner.x - lastX) ** 2 + (corner.y - lastY) ** 2);
                                        totalTime += calculateMoveTime(rapidDist, rapidRate, true);
                                    } else {
                                        const cmd = buildMove('G1', corner.x, corner.y, 0, cuttingFeedRate);
                                        if (cmd) await writeLine(cmd);
                                        const drawDist = Math.sqrt((corner.x - lastX) ** 2 + (corner.y - lastY) ** 2);
                                        totalCuttingDistance += drawDist;
                                        totalTime += calculateMoveTime(drawDist, cuttingFeedRate);
                                    }

                                    lastX = corner.x;
                                    lastY = corner.y;
                                }
                            }
                        }
                        // Lift pen after completing all paths for this element
                        const cmd = buildMove('G0', null, null, plotterPenLift, null);
                        if (cmd) await writeLine(cmd);
                    }
                } else {
                    // Cutting mode - V-bit engraving
                    const targetWidth = element.size;
                    const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                    depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);

                    if (depth > minDepth) {
                        // Rapid move to element position
                        const cmd1 = buildMove('G0', x, y, null, null);
                        if (cmd1) await writeLine(cmd1);
                        rapidMoveCount++;
                        const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                        totalTime += calculateMoveTime(rapidDist, rapidRate, true);

                        // Do all passes at this location before moving to next element
                        // Each pass goes progressively deeper: pass 1 is shallowest, last pass is full depth
                        for (let pass = 0; pass < multiPassCount; pass++) {
                            // Calculate depth for this pass - progressive depth stepping
                            // Pass 1: depth - (multiPassCount - 1) * depthPerPass
                            // Pass 2: depth - (multiPassCount - 2) * depthPerPass
                            // Final pass: full depth
                            const depthReduction = (multiPassCount - 1 - pass) * depthPerPass;
                            const currentDepth = Math.max(minDepth, depth - depthReduction);

                            // Plunge to current depth
                            const cmd2 = buildMove('G1', null, null, -currentDepth, plungeFeedRate);
                            if (cmd2) await writeLine(cmd2);
                            totalTime += calculateMoveTime(currentDepth, plungeFeedRate, true);

                            // Retract to safe height (or just above surface for intermediate passes)
                            const retractHeight = (pass < multiPassCount - 1) ? 1 : safeHeight;
                            const cmd3 = buildMove('G0', null, null, retractHeight, null);
                            if (cmd3) await writeLine(cmd3);
                            totalTime += calculateMoveTime(retractHeight + currentDepth, rapidRate, true);
                            lastZ = retractHeight;
                        }

                        lastX = x;
                        lastY = y;
                    }
                }
            }
    }

    await writeLine('(End halftone pattern)');
    await writeLine('');

    // === BOUNDARY FRAME ===
    // Generate boundary frame if enabled and includeBoundaryInGcode is true
    if (boundary && includeBoundaryInGcode) {
        // Boundary frame cuts around the OUTSIDE of the entire piece (including border)
        // halftoneData.width/height already includes the border on all sides
        const totalWidthMM = halftoneData.width;
        const totalHeightMM = halftoneData.height;

        // Frame cuts at the outer edge of the total piece
        const frameX1 = xOffset;
        const frameY1 = yOffset;
        const frameX2 = xOffset + totalWidthMM;
        const frameY2 = yOffset + totalHeightMM;
        const toolRadius = boundaryToolSize / 2;

        // Use border cutting feed rate if specified, otherwise use main cutting feed rate
        const borderFeedRate = borderCuttingFeedRate !== null && borderCuttingFeedRate > 0 ? borderCuttingFeedRate : cuttingFeedRate;

        // Calculate number of passes needed
        const numPasses = Math.ceil(boundaryDepth / boundaryPassDepth);
        const actualPassDepth = boundaryDepth / numPasses;

        await writeLine('(Boundary Frame)');
        await writeLine(`(Total depth: ${fmt(boundaryDepth)}${unitLabel} in ${numPasses} pass${numPasses > 1 ? 'es' : ''})`);

        if (toolChange) {
            await writeLine(`T${boundaryToolNumber} M6 (Load boundary frame tool - ${fmt(boundaryToolSize)}${unitLabel})`);
            await writeLine('G43 H2 (Tool length offset)');
            await writeLine(`M3 S${spindleSpeed} (Start spindle)`);
            await writeLine('G4 P2 (Wait for spindle)');
        }

        // Move to start position
        await writeLine(`G0 X${fmt(frameX1 - toolRadius)} Y${fmt(frameY1 - toolRadius)}`);
        await writeLine(`G0 Z${fmt(safeHeight)}`);
        rapidMoveCount++;

        const rapidDistToBoundary = Math.sqrt((frameX1 - toolRadius - lastX) ** 2 + (frameY1 - toolRadius - lastY) ** 2);
        totalTime += calculateMoveTime(rapidDistToBoundary, rapidRate, true);
        lastX = frameX1 - toolRadius;
        lastY = frameY1 - toolRadius;

        // Execute multiple passes
        for (let pass = 1; pass <= numPasses; pass++) {
            const currentDepth = actualPassDepth * pass;
            await writeLine('');
            await writeLine(`(Pass ${pass} of ${numPasses} - depth ${fmt(currentDepth)}${unitLabel})`);
            await writeLine(`G1 Z${fmt(-currentDepth)} F${Math.round(plungeFeedRate * feedScale)}`);
            totalTime += calculateMoveTime(currentDepth, plungeFeedRate, true);

            // Cut the frame rectangle
            await writeLine(`G1 X${fmt(frameX2 + toolRadius)} Y${fmt(frameY1 - toolRadius)} F${Math.round(borderFeedRate * feedScale)}`);
            await writeLine(`G1 X${fmt(frameX2 + toolRadius)} Y${fmt(frameY2 + toolRadius)}`);
            await writeLine(`G1 X${fmt(frameX1 - toolRadius)} Y${fmt(frameY2 + toolRadius)}`);
            await writeLine(`G1 X${fmt(frameX1 - toolRadius)} Y${fmt(frameY1 - toolRadius)}`);

            // Calculate distance for this pass
            const frameDist = 2 * (totalWidthMM + totalHeightMM + 4 * toolRadius);
            totalCuttingDistance += frameDist;
            totalTime += calculateMoveTime(frameDist, borderFeedRate);

            // Return to safe height after each pass (except the last one, handled by footer)
            if (pass < numPasses) {
                await writeLine(`G0 Z${fmt(safeHeight)}`);
                totalTime += calculateMoveTime(safeHeight + currentDepth, rapidRate, true);
            }
        }

        await writeLine(`G0 Z${fmt(safeHeight)}`);
        lastZ = safeHeight;
        totalTime += calculateMoveTime(safeHeight + actualPassDepth * numPasses, rapidRate, true);
    }

    // === FOOTER ===
    // NOTE: Footer is now written by the GcodeStreamer via finish() method
    // This ensures each file part gets a proper footer

    // Account for footer time in estimation
    totalTime += calculateMoveTime(Math.abs(safeHeight - lastZ), rapidRate, true);
    const finalDist = Math.sqrt(lastX ** 2 + lastY ** 2);
    totalTime += calculateMoveTime(finalDist, rapidRate, true);

    // Return stats (also return boundary info for separate file generation if needed)
    return {
        lineCount: streamer.getLineCount(),
        totalDistance: totalCuttingDistance,
        estimatedTime: totalTime,
        rapidMoveCount: rapidMoveCount,
        // Boundary info for separate file generation when includeBoundaryInGcode is false
        boundaryInfo: boundary && !includeBoundaryInGcode ? {
            enabled: true,
            xOffset,
            yOffset,
            totalWidthMM: halftoneData.width,
            totalHeightMM: halftoneData.height,
            boundaryToolSize,
            boundaryToolNumber,
            boundaryDepth,
            boundaryPassDepth,
            borderCuttingFeedRate: borderCuttingFeedRate || cuttingFeedRate,
            safeHeight,
            plungeFeedRate,
            spindleSpeed,
            toolChange,
            outputUnits
        } : null
    };
}

// Export for use
window.generateGcodeStreaming = generateGcodeStreaming;
window.generateGcodeHeader = generateGcodeHeader;
window.generateGcodeFooter = generateGcodeFooter;
