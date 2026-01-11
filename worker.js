// Web Worker for halftone generation
// This runs in a separate thread to keep the UI responsive

self.onmessage = function(e) {
    const { action, data } = e.data;
    
    if (action === 'generateHalftone') {
        try {
            generateHalftoneWithProgress(data);
        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error.message
            });
        }
    }
};

function generateHalftoneWithProgress(params) {
    const {
        imageData, width, height, spacing, angle, outputWidthMM,
        patternType, brightness, contrast, invert, gamma, angle2,
        upscale, options, shadows, midtones, highlights
    } = params;
    
    // Image is already upscaled if needed (via Pica in main thread)
    // Calculate resolution based on received dimensions vs output size
    const aspectRatio = height / width;
    const outputHeightMM = options.lockAspect !== false ? (outputWidthMM * aspectRatio) : (options.outputHeight || outputWidthMM * aspectRatio);

    // If image was upscaled, width will be 4x larger than original
    // Calculate actual resolution from received dimensions
    const resolution = width / outputWidthMM;

    // Use received dimensions directly (already at target resolution)
    const pixelWidth = width;
    const pixelHeight = height;

    const borderMM = options.border || 0;
    const totalWidthMM = outputWidthMM + (borderMM * 2);
    const totalHeightMM = outputHeightMM + (borderMM * 2);
    const totalPixelWidth = Math.floor(totalWidthMM * resolution);
    const totalPixelHeight = Math.floor(totalHeightMM * resolution);
    const borderPx = borderMM * resolution;

    // No resampling needed - image is already at correct size
    const resampledData = imageData;
    
    // Convert to grayscale
    let grayscale = new Uint8Array(pixelWidth * pixelHeight);
    for (let i = 0; i < resampledData.length; i += 4) {
        const gray = 0.299 * resampledData[i] + 0.587 * resampledData[i + 1] + 0.114 * resampledData[i + 2];
        grayscale[i / 4] = gray;
    }

    // Apply pre-blur to prevent aliasing if specified
    if (options.preBlur && options.preBlur > 0) {
        grayscale = applyGaussianBlur(grayscale, pixelWidth, pixelHeight, options.preBlur);
    }

    // Apply adjustments with levels support
    const shadowsLevel = shadows !== undefined ? shadows : 0;
    const midtonesLevel = midtones !== undefined ? midtones : 1.0;
    const highlightsLevel = highlights !== undefined ? highlights : 255;

    if (brightness !== 0 || contrast !== 0 || invert || gamma !== 1.0 || options.darkBoost || shadowsLevel !== 0 || midtonesLevel !== 1.0 || highlightsLevel !== 255) {
        grayscale = adjustBrightnessContrast(grayscale, brightness, contrast, invert, gamma, options.darkBoost || false, shadowsLevel, midtonesLevel, highlightsLevel);
    }
    
    // Generate pattern based on type
    if (patternType === 'lines') {
        generateLinesProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    } else if (patternType === 'crosshatch') {
        generateCrosshatchProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, angle2, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    } else if (patternType === 'circles') {
        generateConcentricCirclesProgressive(grayscale, pixelWidth, pixelHeight, spacing, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options, outputWidthMM, outputHeightMM);
    } else if (patternType === 'squares') {
        generateConcentricSquaresProgressive(grayscale, pixelWidth, pixelHeight, spacing, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options, outputWidthMM, outputHeightMM);
    } else {
        generateElementsProgressive(grayscale, pixelWidth, pixelHeight, spacing, patternType, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options);
    }
}

function generateLinesProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
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
    const batchSize = 5; // Process 5 lines at a time for more frequent updates
    let processedCount = 0;
    
    for (let i = -numLines / 2; i < numLines / 2; i++) {
        const line = generateLine(
            grayscale, pixelWidth, pixelHeight,
            centerX + perpX * i * spacingPx,
            centerY + perpY * i * spacingPx,
            paraX, paraY, resolution,
            options.wavelength || 0,
            options.amplitude || 0
        );
        
        if (line.length > 1) {
            const offsetLine = line.map(point => ({
                x: point.x + borderPx,
                y: point.y + borderPx,
                depth: point.depth
            }));
            lines.push(offsetLine);
        }
        
        processedCount++;
        
        // Send progress update every batch (even if no lines were added)
        if (processedCount % batchSize === 0) {
            self.postMessage({
                type: 'progress',
                progress: (i + numLines / 2) / numLines,
                partialLines: lines.slice(Math.max(0, lines.length - batchSize))
            });
        }
    }
    
    // Send final result
    self.postMessage({
        type: 'complete',
        data: {
            lines: lines,
            width: totalWidthMM,
            height: totalHeightMM,
            pixelWidth: totalPixelWidth,
            pixelHeight: totalPixelHeight,
            resolution: resolution,
            border: options.border || 0,
            patternType: 'lines'
        }
    });
}

function generateCrosshatchProgressive(grayscale, pixelWidth, pixelHeight, spacing, angle1, angle2, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
    // Generate first set of lines
    const lines1 = [];
    generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle1, resolution, borderPx, options, lines1);
    
    // Send progress update
    self.postMessage({
        type: 'progress',
        progress: 0.5,
        partialLines: lines1
    });
    
    // Generate second set of lines
    const lines2 = [];
    generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle2, resolution, borderPx, options, lines2);
    
    // Combine and send final result
    const allLines = [...lines1, ...lines2];
    
    self.postMessage({
        type: 'complete',
        data: {
            lines: allLines,
            width: totalWidthMM,
            height: totalHeightMM,
            pixelWidth: totalPixelWidth,
            pixelHeight: totalPixelHeight,
            resolution: resolution,
            border: options.border || 0,
            patternType: 'crosshatch'
        }
    });
}

function generateLinesForCrosshatch(grayscale, pixelWidth, pixelHeight, spacing, angle, resolution, borderPx, options, outputLines) {
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
        const line = generateLine(
            grayscale, pixelWidth, pixelHeight,
            centerX + perpX * i * spacingPx,
            centerY + perpY * i * spacingPx,
            paraX, paraY, resolution,
            options.wavelength || 0,
            options.amplitude || 0
        );
        
        if (line.length > 1) {
            const offsetLine = line.map(point => ({
                x: point.x + borderPx,
                y: point.y + borderPx,
                depth: point.depth
            }));
            outputLines.push(offsetLine);
        }
    }
}

function generateConcentricCirclesProgressive(grayscale, pixelWidth, pixelHeight, spacing, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options, outputWidthMM, outputHeightMM) {
    const borderMM = options.border || 0;
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
    const batchSize = 10; // Send updates every 10 circles
    let circleCount = 0;
    const totalCircles = Math.ceil(maxRadius / spacing);

    for (let radius = 0; radius < maxRadius; radius += spacing) {
        let currentLine = [];

        if (radius === 0) {
            // Center point - single dot
            const centerPx = {x: Math.floor(centerX * resolution), y: Math.floor(centerY * resolution)};
            if (centerPx.x >= 0 && centerPx.x < pixelWidth && centerPx.y >= 0 && centerPx.y < pixelHeight) {
                const index = centerPx.y * pixelWidth + centerPx.x;
                const bright = grayscale[index] / 255;
                const width = bright * maxSize;
                if (width > minSize) {
                    currentLine.push({x: centerX + borderMM, y: centerY + borderMM, width: width});
                }
            }
        } else {
            // Match halftoner: sample at each point individually
            const totalSteps = Math.max(8, Math.round((radius * 2 * Math.PI) / pointSpacing));
            const stepAngle = (totalSteps * pointSpacing) / radius / totalSteps; // Match halftoner formula

            let lastStep = -2; // Track if points were skipped
            let step = 0;

            for (let circleAngle = 0; circleAngle < 2 * Math.PI; circleAngle += stepAngle, step++) {
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

                            currentLine.push({x: xMM + borderMM, y: yMM + borderMM, width: width});
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

        circleCount++;

        // Send progress update every batch
        if (circleCount % batchSize === 0) {
            self.postMessage({
                type: 'progress',
                progress: circleCount / totalCircles,
                partialLines: lines.slice(Math.max(0, lines.length - batchSize))
            });
        }
    }

    // Send final result
    self.postMessage({
        type: 'complete',
        data: {
            lines: lines,
            width: totalWidthMM,
            height: totalHeightMM,
            pixelWidth: totalPixelWidth,
            pixelHeight: totalPixelHeight,
            resolution: resolution,
            spacing: spacing,
            minSize: minSize,
            maxSize: maxSize,
            patternType: 'circles',
            border: borderMM
        }
    });
}

function generateConcentricSquaresProgressive(grayscale, pixelWidth, pixelHeight, spacing, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options, outputWidthMM, outputHeightMM) {
    const borderMM = options.border || 0;
    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;

    // Generate concentric squares from center (like halftoner app)
    const centerX = (outputWidthMM * 0.5) + (options.centerOffsetX || 0);
    const centerY = (outputHeightMM * 0.5) + (options.centerOffsetY || 0);
    const maxRadius = Math.sqrt(outputWidthMM ** 2 + outputHeightMM ** 2) * 0.5 +
                     Math.max(Math.abs(options.centerOffsetX || 0), Math.abs(options.centerOffsetY || 0)) * 1.42;
    // High quality mode like halftoner: 0.25 * 0.25 = 0.0625 for very dense sampling
    const pointSpacing = spacing * 0.0625; // Very fine sampling for crisp rendering

    const lines = [];
    const batchSize = 10; // Send updates every 10 squares
    let squareCount = 0;
    const totalSquares = Math.ceil(maxRadius * 2 / spacing);

    for (let size = 0; size < maxRadius * 2; size += spacing) {
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

        squareCount++;

        // Send progress update every batch
        if (squareCount % batchSize === 0) {
            self.postMessage({
                type: 'progress',
                progress: squareCount / totalSquares,
                partialLines: lines.slice(Math.max(0, lines.length - batchSize))
            });
        }
    }

    // Send final result
    self.postMessage({
        type: 'complete',
        data: {
            lines: lines,
            width: totalWidthMM,
            height: totalHeightMM,
            pixelWidth: totalPixelWidth,
            pixelHeight: totalPixelHeight,
            resolution: resolution,
            spacing: spacing,
            minSize: minSize,
            maxSize: maxSize,
            patternType: 'squares',
            border: borderMM
        }
    });
}

function generateElementsProgressive(grayscale, pixelWidth, pixelHeight, spacing, patternType, resolution, totalWidthMM, totalHeightMM, totalPixelWidth, totalPixelHeight, borderPx, options) {
    const spacingPx = spacing * resolution;
    const borderMM = options.border || 0;
    const minSize = options.minSize || 0;
    const maxSize = options.maxSize || spacing;
    const offsetOddLines = options.offsetOddLines || false;
    const elements = [];
    const batchSize = 25; // Process 25 elements at a time for more frequent updates

    const totalCols = Math.ceil(pixelWidth / spacingPx);
    const totalRows = Math.ceil(pixelHeight / spacingPx);
    const totalElements = totalCols * totalRows;
    let processed = 0;
    let rowIndex = 0;

    for (let y = spacingPx / 2; y < pixelHeight; y += spacingPx) {
        const xOffset = (offsetOddLines && rowIndex % 2 === 1) ? spacingPx / 2 : 0;
        for (let x = spacingPx / 2 + xOffset; x < pixelWidth; x += spacingPx) {
            const px = Math.floor(x);
            const py = Math.floor(y);

            if (px >= pixelWidth || py >= pixelHeight) {
                processed++;
                continue;
            }

            const index = py * pixelWidth + px;
            const brightness = grayscale[index];
            const bright = brightness / 255;

            // Calculate element size based on pattern type
            let elementSize;
            if (patternType === 'dots') {
                // Area-based calculation for dots like halftoner app
                const maxArea = Math.PI * (maxSize * 0.5) * (maxSize * 0.5);
                const dotArea = bright * maxArea;
                const dotRadius = Math.sqrt(dotArea / Math.PI);
                elementSize = dotRadius * 2;
            } else {
                // For other element types, use linear scaling
                elementSize = bright * maxSize;
            }

            if (elementSize > minSize) {
                // Convert from pixels to mm
                const xMM = (x + borderPx) / resolution;
                const yMM = (y + borderPx) / resolution;

                elements.push({
                    x: xMM,
                    y: yMM,
                    size: elementSize,
                    type: patternType
                });
            }

            processed++;

            // Send progress update every batch
            if (processed % batchSize === 0) {
                self.postMessage({
                    type: 'progress',
                    progress: processed / totalElements,
                    partialElements: elements.slice(Math.max(0, elements.length - batchSize))
                });
            }
        }
        rowIndex++;
    }

    // Send final result
    self.postMessage({
        type: 'complete',
        data: {
            elements: elements,
            width: totalWidthMM,
            height: totalHeightMM,
            pixelWidth: totalPixelWidth,
            pixelHeight: totalPixelHeight,
            resolution: resolution,
            spacing: spacing,
            minSize: minSize,
            maxSize: maxSize,
            patternType: patternType,
            border: borderMM
        }
    });
}

function generateLine(grayscale, width, height, startX, startY, dirX, dirY, resolution, wavelength = 0, amplitude = 0) {
    const points = [];
    const diagonal = Math.sqrt(width * width + height * height);
    
    // Use much finer sampling (0.05mm) for crisp waves - matches Halftoner app approach
    // Halftoner uses pointSpacing = lineSpacing * 0.25 for better wave definition
    const step = 0.05;
    
    const perpDirX = -dirY;
    const perpDirY = dirX;
    
    // Pre-calculate wave step for efficiency
    let waveAngle = 0;
    const waveStep = wavelength > 0 ? (Math.PI * 2) / (wavelength / step) : 0;
    
    for (let t = -diagonal; t < diagonal; t += step) {
        let x = startX + dirX * t;
        let y = startY + dirY * t;
        
        if (wavelength > 0 && amplitude > 0) {
            const amplitudePx = amplitude * resolution;
            // Use sine of wave angle for smooth oscillation
            const waveOffset = Math.sin(waveAngle) * amplitudePx;
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

function adjustBrightnessContrast(grayscale, brightness, contrast, invert = false, gamma = 1.0, darkBoost = false, shadowsLevel = 0, midtonesLevel = 1.0, highlightsLevel = 255) {
    const result = new Uint8Array(grayscale.length);
    
    for (let i = 0; i < grayscale.length; i++) {
        let value = grayscale[i];
        
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
        
        if (gamma !== 1.0) {
            const normalized = Math.max(0, Math.min(1, value / 255));
            value = Math.pow(normalized, 1 / gamma) * 255;
        }
        
        if (brightness !== 0) {
            value = value + brightness;
        }
        
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

function resampleImage(imageData, srcWidth, srcHeight, destWidth, destHeight) {
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
}
