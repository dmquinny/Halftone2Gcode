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
function generateGcodeHeader(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero, spindleSpeed, toolChange, vbitToolNumber, boundaryToolNumber, boundaryToolSize, multiPassCount, ramping, rampDistance, boundary, plotterMode, includeLineNumbers) {
    const headerLines = [];
    const patternType = halftoneData.patternType || 'lines';
    const elementCount = halftoneData.lines ? halftoneData.lines.length : halftoneData.elements.length;
    const workZeroLabel = workZero.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

    // Build header
    headerLines.push(`(Halftone ${patternType.charAt(0).toUpperCase() + patternType.slice(1)} Pattern G-code)`);
    headerLines.push(plotterMode ? '(PLOTTER MODE - Pen Up/Down control)' : '(CUTTING MODE - Z-axis engraving)');
    headerLines.push(`(Image size: ${halftoneData.width.toFixed(2)}mm x ${halftoneData.height.toFixed(2)}mm)`);
    if (!plotterMode) headerLines.push(`(Max depth: ${maxDepth}mm)`);
    headerLines.push(`(Safe Z height: ${safeHeight}mm)`);
    if (!plotterMode) headerLines.push(`(Spindle speed: ${spindleSpeed} RPM)`);
    if (!plotterMode) headerLines.push(`(V-bit angle: ${vbitAngle}°)`);
    if (toolChange && !plotterMode) headerLines.push(`(V-bit tool: T${vbitToolNumber})`);
    if (boundary && toolChange) headerLines.push(`(Boundary frame tool: T${boundaryToolNumber}, ${boundaryToolSize}mm diameter)`);
    if (!plotterMode) headerLines.push(`(Cutting feed rate: ${cuttingFeedRate}mm/min)`);
    if (!plotterMode) headerLines.push(`(Plunge feed rate: ${plungeFeedRate}mm/min)`);
    headerLines.push(`(Work zero position: ${workZeroLabel})`);
    headerLines.push(`(Total elements: ${elementCount})`);
    if (multiPassCount > 1 && !plotterMode) headerLines.push(`(Halftone passes: ${multiPassCount})`);
    if (ramping && !plotterMode) headerLines.push(`(Z-ramping enabled: ${rampDistance}mm)`);
    if (boundary) headerLines.push(`(Boundary frame enabled at border edge)`);
    headerLines.push(`(Generated for grblHAL)`);
    headerLines.push('');
    headerLines.push('G21 (Metric units)');
    headerLines.push('G90 (Absolute positioning)');
    headerLines.push('G17 (XY plane)');
    headerLines.push('G94 (Feed per minute)');
    headerLines.push('G54 (Work coordinate system)');
    headerLines.push('');

    if (toolChange) {
        headerLines.push(`T${vbitToolNumber} M6 (Load V-bit tool)`);
        headerLines.push('G43 H1 (Tool length offset)');
    }

    if (!plotterMode) {
        headerLines.push(`M3 S${spindleSpeed} (Start spindle)`);
        headerLines.push('G4 P2 (Wait 2 seconds for spindle to reach speed)');
    }

    headerLines.push(`F${cuttingFeedRate} (Set initial feed rate)`);
    headerLines.push(`G0 Z${safeHeight.toFixed(1)} (Safe height)`);
    headerLines.push('G0 X0.000 Y0.000 (Move to origin)');
    headerLines.push('');

    return headerLines;
}

/**
 * Generate G-code footer lines (without writing to file)
 * Returns array of footer lines
 */
function generateGcodeFooter(safeHeight, plotterMode) {
    const footerLines = [];

    if (!plotterMode) {
        footerLines.push('M5 (Stop spindle)');
    }
    footerLines.push(`G0 Z${safeHeight.toFixed(1)} (Return to safe height)`);
    footerLines.push('G0 X0 Y0 (Return to origin)');
    footerLines.push('M30 (Program end)');

    return footerLines;
}

async function generateGcodeStreaming(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero = 'bottom-left', spindleSpeed = 12000, toolChange = false, vbitToolNumber = 1, boundaryToolNumber = 2, boundaryToolSize = 3.175, boundaryDepth = 1, boundaryPassDepth = 0.5, multiPassCount = 1, ramping = false, rampDistance = 2, boundary = false, includeBoundaryInGcode = true, includeLineNumbers = false, optimizeToolpathEnabled = true, bidirectional = true, borderCuttingFeedRate = null, plotterMode = false, plotterLineWidthMethod = 'pressure', plotterPressureMin = 0, plotterPressureMax = -0.5, plotterPenWidth = 0.5, plotterPenSize = 0.5, plotterLineWidthLight = 0.3, plotterLineWidthHeavy = 1.0, streamer) {

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

    // === HEADER ===
    // NOTE: Header is now written by the GcodeStreamer via start() method
    // This ensures each file part gets a proper header

    // Account for header time in estimation
    if (!plotterMode) {
        totalTime += 2; // Spindle startup wait time
    }
    // Add time for initial positioning (assume machine starts at 0,0,0)
    totalTime += (safeHeight / rapidRate) * 60; // Convert mm/min to seconds

    // === MAIN PATTERN GENERATION ===
    await writeLine('(Begin halftone pattern)');

    if (patternType === 'lines' && halftoneData.lines) {
        // Process line pattern
        const lines = halftoneData.lines;

        for (let pass = 0; pass < multiPassCount; pass++) {
            if (multiPassCount > 1) {
                await writeLine(`(Pass ${pass + 1} of ${multiPassCount})`);
            }

            for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                const line = lines[lineIndex];

                // Process each point in the line
                for (let i = 0; i < line.length; i++) {
                    const point = line[i];
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

                            // Interpolate Z pressure to achieve that line width
                            // Linear interpolation between (plotterLineWidthLight, plotterPressureMin) and (plotterLineWidthHeavy, plotterPressureMax)
                            const widthRange = plotterLineWidthHeavy - plotterLineWidthLight;
                            const pressureRange = plotterPressureMax - plotterPressureMin;
                            const widthRatio = widthRange > 0 ? (actualLineWidth - plotterLineWidthLight) / widthRange : 0;
                            // Clamp widthRatio to 0-1 range
                            const clampedRatio = Math.max(0, Math.min(1, widthRatio));
                            depth = plotterPressureMin + (clampedRatio * pressureRange);
                            lineWidth = actualLineWidth;

                            if (i === 0) {
                                await writeLine(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                totalTime += (rapidDist / rapidRate) * 60;
                            } else {
                                await writeLine(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${depth.toFixed(3)}`);
                            }
                        } else {
                            // Set Pen Size method: draw multiple passes based on actual line width
                            const penSize = plotterPenSize;
                            // Get actual line width from halftone data
                            const actualLineWidth = point.width !== undefined ? point.width :
                                (point.depth * (halftoneData.maxSize || maxDepth * 2));
                            // Calculate number of passes needed to cover the line width
                            const numPasses = Math.max(1, Math.ceil(actualLineWidth / penSize));

                            for (let offsetPass = 0; offsetPass < numPasses; offsetPass++) {
                                // Center the passes around the line center
                                const offsetDist = (offsetPass - (numPasses - 1) / 2) * penSize;

                                // Calculate perpendicular offset
                                let offsetX = x;
                                let offsetY = y;
                                if (i > 0) {
                                    const prevPoint = line[i - 1];
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

                                if (i === 0 && offsetPass === 0) {
                                    // First point of first pass: rapid move, then pen down
                                    await writeLine(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                    await writeLine(`G1 Z0 F${plungeFeedRate}`);
                                    rapidMoveCount++;
                                    const rapidDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalTime += (rapidDist / rapidRate) * 60;
                                } else if (offsetPass > 0 && i === 0) {
                                    // First point of subsequent passes: lift pen, rapid move, lower pen
                                    await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                                    await writeLine(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                    await writeLine(`G1 Z0 F${plungeFeedRate}`);
                                    rapidMoveCount++;
                                    const rapidDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalTime += (rapidDist / rapidRate) * 60;
                                } else {
                                    // Drawing move with Z at paper level
                                    await writeLine(`G1 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)} Z0 F${cuttingFeedRate}`);
                                    const drawDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalCuttingDistance += drawDist;
                                    totalTime += (drawDist / cuttingFeedRate) * 60;
                                }

                                lastX = offsetX;
                                lastY = offsetY;
                            }
                        }
                    } else {
                        // Cutting mode
                        const targetWidth = point.depth * maxDepth * 2;
                        const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                        depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);

                        if (depth > minDepth) {
                            if (i === 0) {
                                await writeLine(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                                rapidMoveCount++;
                                const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                                totalTime += (rapidDist / rapidRate) * 60;

                                if (ramping && i + 1 < line.length) {
                                    const nextPoint = line[i + 1];
                                    const nextX = (nextPoint.x * pixelsToMM) + xOffset;
                                    const nextY = (nextPoint.y * pixelsToMM) + yOffset;
                                    const distance = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);

                                    if (distance >= rampDistance) {
                                        const ratio = rampDistance / distance;
                                        const rampX = x + (nextX - x) * ratio;
                                        const rampY = y + (nextY - y) * ratio;
                                        await writeLine(`G1 X${rampX.toFixed(3)} Y${rampY.toFixed(3)} Z${(-depth).toFixed(3)} F${plungeFeedRate}`);
                                        await writeLine(`G1 X${nextX.toFixed(3)} Y${nextY.toFixed(3)} F${cuttingFeedRate}`);
                                        i++;
                                        const dist = Math.sqrt((nextX - x) ** 2 + (nextY - y) ** 2);
                                        totalCuttingDistance += dist;
                                        totalTime += ((rampDistance / plungeFeedRate) + ((dist - rampDistance) / cuttingFeedRate)) * 60;
                                        lastX = nextX;
                                        lastY = nextY;
                                        continue;
                                    }
                                }

                                await writeLine(`G1 Z${(-depth).toFixed(3)} F${plungeFeedRate}`);
                                lastZ = -depth;
                                totalTime += (depth / plungeFeedRate) * 60;
                            } else {
                                // Include Z for variable depth engraving along the line
                                await writeLine(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${(-depth).toFixed(3)} F${cuttingFeedRate}`);
                                const dist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2 + ((-depth) - lastZ) ** 2);
                                totalCuttingDistance += dist;
                                totalTime += (dist / cuttingFeedRate) * 60;
                                lastZ = -depth;
                            }

                            lastX = x;
                            lastY = y;
                        }
                    }
                }

                // Retract at end of line
                if (!plotterMode) {
                    await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                    lastZ = safeHeight;
                    totalTime += ((safeHeight + Math.abs(lastZ)) / rapidRate) * 60;
                } else if (plotterMode && plotterLineWidthMethod === 'setPenSize') {
                    // Lift pen for Set Pen Size method
                    await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                }
            }
        }

    } else if (halftoneData.elements) {
        // Process dots, squares, circles patterns
        const elements = halftoneData.elements;

        for (let pass = 0; pass < multiPassCount; pass++) {
            if (multiPassCount > 1) {
                await writeLine(`(Pass ${pass + 1} of ${multiPassCount})`);
            }

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

                        // Interpolate Z pressure to achieve that line width
                        const widthRange = plotterLineWidthHeavy - plotterLineWidthLight;
                        const pressureRange = plotterPressureMax - plotterPressureMin;
                        const widthRatio = widthRange > 0 ? (actualLineWidth - plotterLineWidthLight) / widthRange : 0;
                        // Clamp widthRatio to 0-1 range
                        const clampedRatio = Math.max(0, Math.min(1, widthRatio));
                        depth = plotterPressureMin + (clampedRatio * pressureRange);

                        await writeLine(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                        rapidMoveCount++;
                        const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                        totalTime += (rapidDist / rapidRate) * 60;
                        await writeLine(`G1 Z${depth.toFixed(3)}`);
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
                                // Generate concentric circle
                                const segments = Math.max(16, Math.floor(radius * 4)); // More segments for larger circles
                                for (let seg = 0; seg <= segments; seg++) {
                                    const angle = (seg / segments) * Math.PI * 2;
                                    const circleX = x + Math.cos(angle) * radius;
                                    const circleY = y + Math.sin(angle) * radius;

                                    if (seg === 0) {
                                        if (pathIndex > 0) {
                                            // Lift pen between paths
                                            await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                                        }
                                        await writeLine(`G0 X${circleX.toFixed(3)} Y${circleY.toFixed(3)}`);
                                        await writeLine(`G1 Z0 F${plungeFeedRate}`);
                                        rapidMoveCount++;
                                        const rapidDist = Math.sqrt((circleX - lastX) ** 2 + (circleY - lastY) ** 2);
                                        totalTime += (rapidDist / rapidRate) * 60;
                                    } else {
                                        await writeLine(`G1 X${circleX.toFixed(3)} Y${circleY.toFixed(3)} Z0 F${cuttingFeedRate}`);
                                        const drawDist = Math.sqrt((circleX - lastX) ** 2 + (circleY - lastY) ** 2);
                                        totalCuttingDistance += drawDist;
                                        totalTime += (drawDist / cuttingFeedRate) * 60;
                                    }

                                    lastX = circleX;
                                    lastY = circleY;
                                }
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
                                            await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                                        }
                                        await writeLine(`G0 X${corner.x.toFixed(3)} Y${corner.y.toFixed(3)}`);
                                        await writeLine(`G1 Z0 F${plungeFeedRate}`);
                                        rapidMoveCount++;
                                        const rapidDist = Math.sqrt((corner.x - lastX) ** 2 + (corner.y - lastY) ** 2);
                                        totalTime += (rapidDist / rapidRate) * 60;
                                    } else {
                                        await writeLine(`G1 X${corner.x.toFixed(3)} Y${corner.y.toFixed(3)} Z0 F${cuttingFeedRate}`);
                                        const drawDist = Math.sqrt((corner.x - lastX) ** 2 + (corner.y - lastY) ** 2);
                                        totalCuttingDistance += drawDist;
                                        totalTime += (drawDist / cuttingFeedRate) * 60;
                                    }

                                    lastX = corner.x;
                                    lastY = corner.y;
                                }
                            }
                        }
                        // Lift pen after completing all paths for this element
                        await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                    }
                } else {
                    const targetWidth = element.size;
                    const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                    depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);

                    if (depth > minDepth) {
                        await writeLine(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                        rapidMoveCount++;
                        const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                        totalTime += (rapidDist / rapidRate) * 60;
                        await writeLine(`G1 Z${(-depth).toFixed(3)} F${plungeFeedRate}`);
                        await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                        totalTime += ((depth / plungeFeedRate) + ((safeHeight + depth) / rapidRate)) * 60;
                        lastX = x;
                        lastY = y;
                    }
                }
            }
        }
    }

    await writeLine('(End halftone pattern)');
    await writeLine('');

    // === FOOTER ===
    // NOTE: Footer is now written by the GcodeStreamer via finish() method
    // This ensures each file part gets a proper footer

    // Account for footer time in estimation
    totalTime += (Math.abs(safeHeight - lastZ) / rapidRate) * 60;
    const finalDist = Math.sqrt(lastX ** 2 + lastY ** 2);
    totalTime += (finalDist / rapidRate) * 60;

    // Return stats
    return {
        lineCount: streamer.getLineCount(),
        totalDistance: totalCuttingDistance,
        estimatedTime: totalTime,
        rapidMoveCount: rapidMoveCount
    };
}

// Export for use
window.generateGcodeStreaming = generateGcodeStreaming;
window.generateGcodeHeader = generateGcodeHeader;
window.generateGcodeFooter = generateGcodeFooter;
