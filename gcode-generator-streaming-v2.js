/**
 * Streaming G-code Generator v2
 * Completely separate from the original generateGcode function
 * This version writes directly to disk via Tauri streaming API
 * Memory usage: ~50-100MB regardless of output size
 */

async function generateGcodeStreaming(halftoneData, maxDepth, safeHeight, cuttingFeedRate, plungeFeedRate, vbitAngle, workZero = 'bottom-left', spindleSpeed = 12000, toolChange = false, vbitToolNumber = 1, boundaryToolNumber = 2, boundaryToolSize = 3.175, boundaryDepth = 1, boundaryPassDepth = 0.5, multiPassCount = 1, ramping = false, rampDistance = 2, boundary = false, includeBoundaryInGcode = true, includeLineNumbers = false, optimizeToolpathEnabled = true, bidirectional = true, borderCuttingFeedRate = null, plotterMode = false, plotterLineWidthMethod = 'pressure', plotterPressureMin = 0, plotterPressureMax = -0.5, plotterPenWidth = 0.5, plotterLineWidthLight = 0.3, plotterLineWidthHeavy = 1.0, streamer) {

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
    const workZeroLabel = workZero.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-');

    await writeLine(`(Halftone ${patternType.charAt(0).toUpperCase() + patternType.slice(1)} Pattern G-code)`);
    await writeLine(plotterMode ? '(PLOTTER MODE - Pen Up/Down control)' : '(CUTTING MODE - Z-axis engraving)');
    await writeLine(`(Image size: ${halftoneData.width.toFixed(2)}mm x ${halftoneData.height.toFixed(2)}mm)`);
    if (!plotterMode) await writeLine(`(Max depth: ${maxDepth}mm)`);
    await writeLine(`(Safe Z height: ${safeHeight}mm)`);
    if (!plotterMode) await writeLine(`(Spindle speed: ${spindleSpeed} RPM)`);
    if (!plotterMode) await writeLine(`(V-bit angle: ${vbitAngle}°)`);
    if (toolChange && !plotterMode) await writeLine(`(V-bit tool: T${vbitToolNumber})`);
    if (boundary && toolChange) await writeLine(`(Boundary frame tool: T${boundaryToolNumber}, ${boundaryToolSize}mm diameter)`);
    if (!plotterMode) await writeLine(`(Cutting feed rate: ${cuttingFeedRate}mm/min)`);
    if (!plotterMode) await writeLine(`(Plunge feed rate: ${plungeFeedRate}mm/min)`);
    await writeLine(`(Work zero position: ${workZeroLabel})`);
    await writeLine(`(Total elements: ${elementCount})`);
    if (multiPassCount > 1 && !plotterMode) await writeLine(`(Halftone passes: ${multiPassCount})`);
    if (ramping && !plotterMode) await writeLine(`(Z-ramping enabled: ${rampDistance}mm)`);
    if (boundary) await writeLine(`(Boundary frame enabled at border edge)`);
    await writeLine(`(Generated for grblHAL)`);
    await writeLine('');
    await writeLine('G21 (Metric units)');
    await writeLine('G90 (Absolute positioning)');
    await writeLine('G17 (XY plane)');
    await writeLine('G94 (Feed per minute)');
    await writeLine('G54 (Work coordinate system)');
    await writeLine('');

    if (toolChange) {
        await writeLine(`T${vbitToolNumber} M6 (Load V-bit tool)`);
        await writeLine('G43 H1 (Tool length offset)');
    }

    if (!plotterMode) {
        await writeLine(`M3 S${spindleSpeed} (Start spindle)`);
        await writeLine('G4 P2 (Wait 2 seconds for spindle to reach speed)');
        totalTime += 2; // Spindle startup wait time
    }

    await writeLine(`F${cuttingFeedRate} (Set initial feed rate)`);
    await writeLine(`G0 Z${safeHeight.toFixed(1)} (Safe height)`);
    await writeLine('G0 X0.000 Y0.000 (Move to origin)');
    await writeLine('');
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
                    const y = (point.y * pixelsToMM) + yOffset;

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
                            // Parallel offset method: draw multiple passes for thickness
                            const penWidth = plotterPenWidth;
                            const numPasses = Math.max(1, Math.round(point.depth * 5));

                            for (let offsetPass = 0; offsetPass < numPasses; offsetPass++) {
                                const offsetDist = (offsetPass - (numPasses - 1) / 2) * (penWidth / 3);

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
                                    // First point of first pass: rapid move
                                    await writeLine(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                    rapidMoveCount++;
                                    const rapidDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalTime += (rapidDist / rapidRate) * 60;
                                } else if (offsetPass > 0 && i === 0) {
                                    // First point of subsequent passes: lift pen, rapid move, lower pen
                                    await writeLine(`G0 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)}`);
                                    rapidMoveCount++;
                                    const rapidDist = Math.sqrt((offsetX - lastX) ** 2 + (offsetY - lastY) ** 2);
                                    totalTime += (rapidDist / rapidRate) * 60;
                                } else {
                                    // Drawing move
                                    await writeLine(`G1 X${offsetX.toFixed(3)} Y${offsetY.toFixed(3)} F${cuttingFeedRate}`);
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
                const y = element.y + yOffset;

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
                    } else {
                        const lineWidth = plotterLineWidthLight + (element.depth * (plotterLineWidthHeavy - plotterLineWidthLight));
                        depth = -lineWidth;
                    }
                } else {
                    const targetWidth = element.size;
                    const vbitHalfAngle = (vbitAngle / 2) * (Math.PI / 180);
                    depth = Math.min(targetWidth / (2 * Math.tan(vbitHalfAngle)), maxDepth);
                }

                if ((!plotterMode && depth > minDepth) || plotterMode) {
                    await writeLine(`G0 X${x.toFixed(3)} Y${y.toFixed(3)}`);
                    rapidMoveCount++;
                    const rapidDist = Math.sqrt((x - lastX) ** 2 + (y - lastY) ** 2);
                    totalTime += (rapidDist / rapidRate) * 60;

                    if (!plotterMode) {
                        await writeLine(`G1 Z${(-depth).toFixed(3)} F${plungeFeedRate}`);
                        await writeLine(`G0 Z${safeHeight.toFixed(1)}`);
                        totalTime += ((depth / plungeFeedRate) + ((safeHeight + depth) / rapidRate)) * 60;
                    } else {
                        await writeLine(`G1 Z${depth.toFixed(3)}`);
                    }

                    lastX = x;
                    lastY = y;
                }
            }
        }
    }

    await writeLine('(End halftone pattern)');
    await writeLine('');

    // === FOOTER ===
    if (!plotterMode) {
        await writeLine('M5 (Stop spindle)');
    }
    await writeLine(`G0 Z${safeHeight.toFixed(1)} (Return to safe height)`);
    // Add time for final Z move
    totalTime += (Math.abs(safeHeight - lastZ) / rapidRate) * 60;

    await writeLine('G0 X0 Y0 (Return to origin)');
    // Add time for final XY return to origin
    const finalDist = Math.sqrt(lastX ** 2 + lastY ** 2);
    totalTime += (finalDist / rapidRate) * 60;

    await writeLine('M30 (Program end)');

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
