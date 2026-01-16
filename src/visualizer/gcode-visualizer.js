// Simple G-code 3D Visualizer with Simulation
// Uses Three.js for rendering

class GCodeVisualizer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Container not found:', containerId);
            return;
        }

        // Three.js objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;

        // G-code data
        this.moves = [];
        this.currentLine = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1.0;

        // Visual elements
        this.pathGroup = new THREE.Group();
        this.toolMesh = null;
        this.materialBlock = null;
        this.depthCanvas = null;
        this.depthTexture = null;

        // Plotter mode settings for pressure visualization
        this.plotterMode = false;
        this.plotterPressureMin = 0;      // Light pressure (less negative Z)
        this.plotterPressureMax = -0.5;   // Heavy pressure (more negative Z)
        this.showPressureColors = true;   // Color-code by pressure

        this.init();
    }

    init() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0d0d0d); // Professional near-black background

        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000);
        this.camera.position.set(200, 200, 200);
        this.camera.lookAt(0, 0, 0);

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Add lights
        const ambientLight = new THREE.AmbientLight(0x404040, 2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(100, 100, 50);
        this.scene.add(directionalLight);

        // Add grid helper positioned so origin (0,0,0) is at corner
        const gridSize = 800;
        const gridDivisions = 80;
        const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x2a2a2a, 0x1a1a1a); // Subtle professional grid
        // Offset grid so (0,0,0) is at the corner instead of center
        grid.position.set(gridSize / 2, 0, -gridSize / 2);
        this.scene.add(grid);

        // Add axis helper at origin (0,0,0) - shows X(red), Y(green), Z(blue)
        const axesHelper = new THREE.AxesHelper(100);
        this.scene.add(axesHelper);

        // Add tool visualization (small cone)
        const toolHeight = 10;
        const toolGeometry = new THREE.ConeGeometry(2, toolHeight, 8);
        const toolMaterial = new THREE.MeshPhongMaterial({ color: 0xff4444 }); // Red for plunge/active cutting
        this.toolMesh = new THREE.Mesh(toolGeometry, toolMaterial);
        this.toolMesh.rotation.x = Math.PI; // Point downward
        this.toolMeshHeight = toolHeight; // Store for positioning offset
        this.scene.add(this.toolMesh);

        // Add OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 2000;
        this.controls.maxPolarAngle = Math.PI / 2;

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Start render loop
        this.animate();
    }

    onWindowResize() {
        if (!this.container) return;

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    parseGCode(gcodeText) {
        this.moves = [];
        const lines = gcodeText.split('\n');

        let currentX = 0, currentY = 0, currentZ = 0;
        let currentMode = 'rapid'; // 'rapid' for G0, 'cutting' for G1

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Remove comments
            const commentIndex = line.indexOf('(');
            if (commentIndex >= 0) {
                line = line.substring(0, commentIndex).trim();
            }
            const semicolonIndex = line.indexOf(';');
            if (semicolonIndex >= 0) {
                line = line.substring(0, semicolonIndex).trim();
            }

            // Skip empty lines
            if (!line) continue;

            // Update mode if G0 or G1 is found
            if (line.includes('G0') || line.includes('G00')) {
                currentMode = 'rapid';
            } else if (line.includes('G1') || line.includes('G01')) {
                currentMode = 'cutting';
            }

            // Parse coordinates (works even if X/Y/Z is on a separate line)
            const xMatch = line.match(/X([-+]?[0-9]*\.?[0-9]+)/);
            const yMatch = line.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
            const zMatch = line.match(/Z([-+]?[0-9]*\.?[0-9]+)/);

            let hasCoordinate = false;
            let newX = currentX;
            let newY = currentY;
            let newZ = currentZ;

            if (xMatch) {
                newX = parseFloat(xMatch[1]);
                hasCoordinate = true;
            }
            if (yMatch) {
                newY = parseFloat(yMatch[1]);
                hasCoordinate = true;
            }
            if (zMatch) {
                newZ = parseFloat(zMatch[1]);
                hasCoordinate = true;
            }

            // If we found coordinates and they're different, create a move
            if (hasCoordinate && (newX !== currentX || newY !== currentY || newZ !== currentZ)) {
                this.moves.push({
                    type: currentMode,
                    from: { x: currentX, y: currentY, z: currentZ },
                    to: { x: newX, y: newY, z: newZ },
                    lineNumber: i + 1
                });

                currentX = newX;
                currentY = newY;
                currentZ = newZ;
            }
        }

        this.drawToolpath();
    }

    drawToolpath() {
        // Clear existing toolpath
        this.scene.remove(this.pathGroup);
        this.pathGroup = new THREE.Group();

        if (this.moves.length === 0) {
            console.warn('⚠️ No moves to draw!');
            return;
        }

        // Offset toolpath to sit on top of material block surface
        const toolpathOffset = this.materialThickness || 0;

        // Check if we should use pressure-based coloring (plotter mode)
        const usePressureColors = this.plotterMode && this.showPressureColors;

        if (usePressureColors) {
            // Plotter mode: color-code cutting moves by pressure (Z depth)
            // Group moves into pressure bands for efficient rendering
            const NUM_PRESSURE_BANDS = 10;
            const rapidVertices = [];
            const pressureBands = new Array(NUM_PRESSURE_BANDS).fill(null).map(() => []);

            const pressureRange = this.plotterPressureMin - this.plotterPressureMax;

            for (let i = 0; i < this.moves.length; i++) {
                const move = this.moves[i];

                const fromX = move.from.x;
                const fromY = move.from.z + toolpathOffset;
                const fromZ = -move.from.y;

                const toX = move.to.x;
                const toY = move.to.z + toolpathOffset;
                const toZ = -move.to.y;

                if (move.type === 'rapid') {
                    rapidVertices.push(fromX, fromY, fromZ);
                    rapidVertices.push(toX, toY, toZ);
                } else {
                    // Determine pressure band based on destination Z
                    let bandIndex = 0;
                    if (pressureRange > 0) {
                        const normalizedPressure = (this.plotterPressureMin - move.to.z) / pressureRange;
                        bandIndex = Math.floor(Math.max(0, Math.min(0.999, normalizedPressure)) * NUM_PRESSURE_BANDS);
                    }
                    pressureBands[bandIndex].push(fromX, fromY, fromZ, toX, toY, toZ);
                }
            }

            // Create rapid moves (cyan)
            if (rapidVertices.length > 0) {
                const rapidGeometry = new THREE.BufferGeometry();
                rapidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rapidVertices, 3));
                const rapidMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    linewidth: 2,
                    opacity: 0.6,
                    transparent: true
                });
                const rapidLines = new THREE.LineSegments(rapidGeometry, rapidMaterial);
                this.pathGroup.add(rapidLines);
            }

            // Create cutting moves for each pressure band with gradient colors
            for (let band = 0; band < NUM_PRESSURE_BANDS; band++) {
                if (pressureBands[band].length === 0) continue;

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(pressureBands[band], 3));

                // Calculate color for this band (light cyan to deep blue gradient)
                const bandRatio = band / (NUM_PRESSURE_BANDS - 1);
                const r = Math.round(0x88 + (0x11 - 0x88) * bandRatio);
                const g = Math.round(0xdd + (0x44 - 0xdd) * bandRatio);
                const b = Math.round(0xff + (0xaa - 0xff) * bandRatio);
                const bandColor = (r << 16) | (g << 8) | b;

                const material = new THREE.LineBasicMaterial({
                    color: bandColor,
                    linewidth: 2,
                    opacity: 1.0,
                    transparent: false
                });
                const lines = new THREE.LineSegments(geometry, material);
                this.pathGroup.add(lines);
            }
        } else {
            // Standard mode: use fixed colors for rapid/cutting
            const rapidVertices = [];
            const cuttingVertices = [];

            for (let i = 0; i < this.moves.length; i++) {
                const move = this.moves[i];

                const fromX = move.from.x;
                const fromY = move.from.z + toolpathOffset;
                const fromZ = -move.from.y;

                const toX = move.to.x;
                const toY = move.to.z + toolpathOffset;
                const toZ = -move.to.y;

                if (move.type === 'rapid') {
                    rapidVertices.push(fromX, fromY, fromZ);
                    rapidVertices.push(toX, toY, toZ);
                } else {
                    cuttingVertices.push(fromX, fromY, fromZ);
                    cuttingVertices.push(toX, toY, toZ);
                }
            }

            // Create rapid moves line (cyan)
            if (rapidVertices.length > 0) {
                const rapidGeometry = new THREE.BufferGeometry();
                rapidGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rapidVertices, 3));
                const rapidMaterial = new THREE.LineBasicMaterial({
                    color: 0x00ffff,
                    linewidth: 2,
                    opacity: 0.6,
                    transparent: true
                });
                const rapidLines = new THREE.LineSegments(rapidGeometry, rapidMaterial);
                this.pathGroup.add(rapidLines);
            }

            // Create cutting moves line (blue)
            if (cuttingVertices.length > 0) {
                const cuttingGeometry = new THREE.BufferGeometry();
                cuttingGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cuttingVertices, 3));
                const cuttingMaterial = new THREE.LineBasicMaterial({
                    color: 0x4488ff,
                    linewidth: 2,
                    opacity: 1.0,
                    transparent: false
                });
                const cuttingLines = new THREE.LineSegments(cuttingGeometry, cuttingMaterial);
                this.pathGroup.add(cuttingLines);
            }
        }

        // Create material block visualization if dimensions are available
        if (this.imageWidth && this.imageHeight && this.materialThickness) {
            this.createMaterialBlock();
        }

        this.scene.add(this.pathGroup);

        // Center camera on toolpath
        this.centerCameraOnToolpath();
    }

    createMaterialBlock() {
        // Remove existing material block if present
        if (this.materialBlock) {
            this.scene.remove(this.materialBlock);
            this.materialBlock = null;
        }

        const width = this.imageWidth;
        const height = this.imageHeight;
        const thickness = this.materialThickness;

        // Create a blank canvas (uncarved material) - we'll update it progressively during simulation
        const resolution = 1024;
        this.depthCanvas = document.createElement('canvas');
        this.depthCanvas.width = resolution;
        this.depthCanvas.height = resolution;
        const ctx = this.depthCanvas.getContext('2d');

        // Fill with light wood color (uncarved material)
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(0, 0, resolution, resolution);

        // Create texture from canvas
        this.depthTexture = new THREE.CanvasTexture(this.depthCanvas);
        this.depthTexture.needsUpdate = true;

        // Create the material block as a box
        const blockGeometry = new THREE.BoxGeometry(width, thickness, height);

        // Create materials for each face
        const sideMaterial = new THREE.MeshPhongMaterial({
            color: 0xd2b48c, // Tan/wood side color
            shininess: 5
        });

        const topMaterial = new THREE.MeshPhongMaterial({
            color: 0xf5deb3, // Light wood color - will show carved texture during simulation
            map: this.depthTexture,
            shininess: 5
        });

        const materials = [
            sideMaterial, // right
            sideMaterial, // left
            topMaterial,  // top (carved surface)
            sideMaterial, // bottom
            sideMaterial, // front
            sideMaterial  // back
        ];

        this.materialBlock = new THREE.Mesh(blockGeometry, materials);

        // Position the block so the top surface is at Y=0 (G-code Z=0)
        // In Three.js: X stays X, Z (gcode) becomes Y (threejs), Y (gcode) becomes -Z (threejs)
        this.materialBlock.position.set(width / 2, -thickness / 2, -height / 2);

        this.scene.add(this.materialBlock);

        // Store carving parameters for simulation
        this.vbitAngle = document.getElementById('vbitAngle') ? parseFloat(document.getElementById('vbitAngle').value) : 90;
        this.carvingResolution = resolution;
        this.carvingScaleX = resolution / width;
        this.carvingScaleY = resolution / height;

        // Calculate max depth
        let maxDepth = 0.1;
        for (let i = 0; i < this.moves.length; i++) {
            const depth = Math.abs(this.moves[i].to.z);
            if (depth > maxDepth) maxDepth = depth;
        }
        this.maxDepth = maxDepth;

        // Draw the complete halftone image immediately
        this.updateMaterialCarving();
    }

    updateMaterialCarving() {
        // Show complete halftone image (all moves, not progressive)
        if (!this.depthCanvas || !this.materialBlock) return;

        const ctx = this.depthCanvas.getContext('2d');

        // Reset to blank wood
        ctx.fillStyle = '#f5deb3';
        ctx.fillRect(0, 0, this.carvingResolution, this.carvingResolution);

        // Calculate V-bit parameters
        const angleRad = (this.vbitAngle * Math.PI) / 180;
        const tanHalfAngle = Math.tan(angleRad / 2);

        // Draw ALL carved lines to show complete halftone image
        for (let i = 0; i < this.moves.length; i++) {
            const move = this.moves[i];

            if (move.type === 'cutting') {
                const depth = Math.abs(move.to.z);
                const vbitWidth = 2 * depth * tanHalfAngle;
                const lineWidth = Math.max(1, vbitWidth * this.carvingScaleX);

                const darkness = Math.min(1, depth / this.maxDepth);
                const gray = Math.floor(245 - (darkness * 180));
                ctx.strokeStyle = `rgb(${gray}, ${gray - 20}, ${gray - 30})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Transform G-code coordinates to canvas coordinates
                // Canvas uses standard screen coordinates (Y+ down)
                // We need to flip Y to match the Three.js texture orientation
                const x1 = move.from.x * this.carvingScaleX;
                const y1 = (this.imageHeight - move.from.y) * this.carvingScaleY;
                const x2 = move.to.x * this.carvingScaleX;
                const y2 = (this.imageHeight - move.to.y) * this.carvingScaleY;

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }

        this.depthTexture.needsUpdate = true;
    }

    toggleMaterialBlock() {
        if (!this.materialBlock) return;

        this.materialBlock.visible = !this.materialBlock.visible;
    }

    // Camera preset views
    setCameraTop() {
        if (!this.controls) return;

        // Calculate the center of the toolpath
        const center = this.getToolpathCenter();

        // Position camera directly above looking down
        const distance = this.getCameraDistance();
        this.camera.position.set(center.x, distance, center.z);
        this.controls.target.set(center.x, 0, center.z);
        this.controls.update();
    }

    setCameraFront() {
        if (!this.controls) return;

        // Calculate the center of the toolpath
        const center = this.getToolpathCenter();

        // Position camera looking from front (positive Z looking toward negative Z)
        const distance = this.getCameraDistance();
        this.camera.position.set(center.x, distance * 0.5, distance);
        this.controls.target.set(center.x, 0, center.z);
        this.controls.update();
    }

    setCameraSide() {
        if (!this.controls) return;

        // Calculate the center of the toolpath
        const center = this.getToolpathCenter();

        // Position camera looking from right side (positive X looking toward negative X)
        const distance = this.getCameraDistance();
        this.camera.position.set(distance, distance * 0.5, center.z);
        this.controls.target.set(center.x, 0, center.z);
        this.controls.update();
    }

    setCameraIsometric() {
        if (!this.controls) return;

        // Calculate the center of the toolpath
        const center = this.getToolpathCenter();

        // Position camera at 45-degree isometric angle
        const distance = this.getCameraDistance();
        const isoDistance = distance * 0.7;
        this.camera.position.set(center.x + isoDistance, isoDistance, center.z - isoDistance);
        this.controls.target.set(center.x, 0, center.z);
        this.controls.update();
    }

    zoomIn() {
        if (!this.controls) return;

        // Move camera 20% closer
        const direction = new THREE.Vector3();
        direction.subVectors(this.controls.target, this.camera.position);
        const distance = direction.length();
        const newDistance = Math.max(this.controls.minDistance, distance * 0.8);
        direction.normalize();
        this.camera.position.copy(this.controls.target).sub(direction.multiplyScalar(newDistance));
        this.controls.update();
    }

    zoomOut() {
        if (!this.controls) return;

        // Move camera 20% farther
        const direction = new THREE.Vector3();
        direction.subVectors(this.controls.target, this.camera.position);
        const distance = direction.length();
        const newDistance = Math.min(this.controls.maxDistance, distance * 1.25);
        direction.normalize();
        this.camera.position.copy(this.controls.target).sub(direction.multiplyScalar(newDistance));
        this.controls.update();
    }

    // Helper method to get toolpath center
    getToolpathCenter() {
        if (this.moves.length === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.moves.forEach(move => {
            minX = Math.min(minX, move.from.x, move.to.x);
            maxX = Math.max(maxX, move.from.x, move.to.x);
            minY = Math.min(minY, move.from.y, move.to.y);
            maxY = Math.max(maxY, move.from.y, move.to.y);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // In Three.js coordinates, Y is up, so we use 0 for Y
        // and transform G-code Y to Three.js Z
        return { x: centerX, y: 0, z: -centerY };
    }

    // Helper method to calculate appropriate camera distance
    getCameraDistance() {
        if (this.moves.length === 0) {
            return 200; // Default distance
        }

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.moves.forEach(move => {
            minX = Math.min(minX, move.from.x, move.to.x);
            maxX = Math.max(maxX, move.from.x, move.to.x);
            minY = Math.min(minY, move.from.y, move.to.y);
            maxY = Math.max(maxY, move.from.y, move.to.y);
        });

        const sizeX = maxX - minX;
        const sizeY = maxY - minY;

        // Use image dimensions if available
        const width = this.imageWidth || sizeX;
        const height = this.imageHeight || sizeY;

        const maxSize = Math.max(width, height);

        // Calculate distance based on field of view
        const fov = this.camera.fov * (Math.PI / 180);
        const distance = (maxSize / 2) / Math.tan(fov / 2);

        // Add some padding
        return distance * 1.5;
    }

    centerCameraOnToolpath() {
        if (this.moves.length === 0) return;

        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        this.moves.forEach(move => {
            minX = Math.min(minX, move.from.x, move.to.x);
            maxX = Math.max(maxX, move.from.x, move.to.x);
            minY = Math.min(minY, move.from.y, move.to.y);
            maxY = Math.max(maxY, move.from.y, move.to.y);
            minZ = Math.min(minZ, move.from.z, move.to.z);
            maxZ = Math.max(maxZ, move.from.z, move.to.z);
        });

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const centerZ = (minZ + maxZ) / 2;

        let sizeX = maxX - minX;
        let sizeY = maxY - minY;
        const sizeZ = maxZ - minZ;

        // If image dimensions were provided, use them with 50mm padding
        const padding = 50; // mm on each side
        if (this.imageWidth && this.imageHeight) {
            sizeX = this.imageWidth + (padding * 2);
            sizeY = this.imageHeight + (padding * 2);
        }

        // For flat toolpaths (like engravings), use XY size, not Z
        const xySize = Math.max(sizeX, sizeY);
        const maxSize = Math.max(xySize, sizeZ * 2); // Give Z some weight but not too much

        // Update controls target and camera position
        this.controls.target.set(centerX, centerZ, -centerY);
        const distance = maxSize * 1.2; // Even closer view

        // Position camera at 45-degree angle for better view
        const angle = Math.PI / 4;
        this.camera.position.set(
            centerX + distance * Math.cos(angle),
            centerZ + distance * 0.7,
            -(centerY + distance * Math.sin(angle))
        );
        this.controls.update();

    }

    updateVisualization() {
        if (this.moves.length === 0) return;

        // Update tube colors based on current position
        // Note: Last child is the red marker sphere, so we iterate through moves only
        const numMoves = Math.min(this.pathGroup.children.length - 1, this.moves.length);

        for (let index = 0; index < numMoves; index++) {
            const tube = this.pathGroup.children[index];
            if (!tube.material) continue;

            if (index < this.currentLine) {
                // Completed - dark gray
                tube.material.color.setHex(0x404040);
                tube.material.opacity = 0.3;
            } else if (index === this.currentLine) {
                // Current - bright red (active cutting)
                tube.material.color.setHex(0xff4444);
                tube.material.opacity = 1.0;
            } else {
                // Upcoming - original color
                const move = this.moves[index];
                const color = move.type === 'rapid' ? 0x00ffff : 0x4488ff; // Cyan for rapids, blue for cutting
                tube.material.color.setHex(color);
                tube.material.opacity = 0.9;
            }
        }

        // Update tool position
        if (this.currentLine < this.moves.length) {
            const move = this.moves[this.currentLine];
            // Position tool cone so its tip (not center) is at the cutting position
            // Cone is rotated 180° (pointing down), so we add half height to raise it
            const toolOffset = this.toolMeshHeight / 2;
            // Also add material thickness offset to match the raised toolpath lines
            const materialOffset = this.materialThickness || 0;
            this.toolMesh.position.set(move.to.x, move.to.z + toolOffset + materialOffset, -move.to.y);
        }
    }

    play() {
        this.isPlaying = true;
        this.simulationLoop();
    }

    pause() {
        this.isPlaying = false;
    }

    reset() {
        this.currentLine = 0;
        this.updateVisualization();
    }

    setSpeed(speed) {
        this.playbackSpeed = Math.max(0.1, Math.min(10, speed));
    }

    simulationLoop() {
        if (!this.isPlaying) return;

        this.currentLine++;
        if (this.currentLine >= this.moves.length) {
            this.currentLine = this.moves.length - 1;
            this.pause();
        }

        this.updateVisualization();

        const delay = 50 / this.playbackSpeed;
        setTimeout(() => this.simulationLoop(), delay);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update(); // Update OrbitControls
        this.renderer.render(this.scene, this.camera);
    }

    loadGCode(gcodeText, imageWidth = null, imageHeight = null, materialThickness = null) {
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
        this.materialThickness = materialThickness;
        this.parseGCode(gcodeText);
        this.reset();
    }

    async loadGCodeFromFile(filePath, imageWidth = null, imageHeight = null, materialThickness = null) {
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
        this.materialThickness = materialThickness;

        if (!window.__TAURI__ || !window.__TAURI__.core) {
            alert('File streaming requires Tauri desktop app');
            return;
        }

        try {
            const fileContent = await window.__TAURI__.core.invoke('read_gcode_file', {
                filePath: filePath
            });

            await this.parseGCodeIncremental(fileContent);
            this.reset();

        } catch (error) {
            console.error('Failed to load G-code file:', error);
            alert('Failed to load G-code file: ' + error.message);
        }
    }

    async parseGCodeIncremental(gcodeText) {
        this.moves = [];
        const lines = gcodeText.split('\n');

        let currentX = 0, currentY = 0, currentZ = 0;
        let currentMode = 'rapid';

        const BATCH_SIZE = 10000;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Remove comments
            const commentIndex = line.indexOf('(');
            if (commentIndex >= 0) {
                line = line.substring(0, commentIndex).trim();
            }
            const semicolonIndex = line.indexOf(';');
            if (semicolonIndex >= 0) {
                line = line.substring(0, semicolonIndex).trim();
            }

            if (!line) continue;

            // Update mode
            if (line.includes('G0') || line.includes('G00')) {
                currentMode = 'rapid';
            } else if (line.includes('G1') || line.includes('G01')) {
                currentMode = 'cutting';
            }

            // Parse coordinates
            const xMatch = line.match(/X([-+]?[0-9]*\.?[0-9]+)/);
            const yMatch = line.match(/Y([-+]?[0-9]*\.?[0-9]+)/);
            const zMatch = line.match(/Z([-+]?[0-9]*\.?[0-9]+)/);

            let hasCoordinate = false;
            let newX = currentX;
            let newY = currentY;
            let newZ = currentZ;

            if (xMatch) {
                newX = parseFloat(xMatch[1]);
                hasCoordinate = true;
            }
            if (yMatch) {
                newY = parseFloat(yMatch[1]);
                hasCoordinate = true;
            }
            if (zMatch) {
                newZ = parseFloat(zMatch[1]);
                hasCoordinate = true;
            }

            if (hasCoordinate && (newX !== currentX || newY !== currentY || newZ !== currentZ)) {
                this.moves.push({
                    type: currentMode,
                    from: { x: currentX, y: currentY, z: currentZ },
                    to: { x: newX, y: newY, z: newZ },
                    lineNumber: i + 1
                });

                currentX = newX;
                currentY = newY;
                currentZ = newZ;
            }

            // Yield to browser periodically
            if (i % BATCH_SIZE === 0 && i > 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        this.drawToolpath();
    }

    /**
     * Configure plotter mode visualization
     * @param {boolean} enabled - Whether plotter mode is active
     * @param {number} pressureMin - Light pressure Z value (typically 0 or near 0)
     * @param {number} pressureMax - Heavy pressure Z value (typically negative)
     */
    setPlotterMode(enabled, pressureMin = 0, pressureMax = -0.5) {
        this.plotterMode = enabled;
        this.plotterPressureMin = pressureMin;
        this.plotterPressureMax = pressureMax;

        // Redraw toolpath if we have moves
        if (this.moves.length > 0) {
            this.drawToolpath();
        }
    }

    /**
     * Toggle pressure color visualization on/off
     */
    togglePressureColors() {
        this.showPressureColors = !this.showPressureColors;
        if (this.moves.length > 0) {
            this.drawToolpath();
        }
        return this.showPressureColors;
    }

    /**
     * Convert pressure/Z value to color for plotter mode visualization
     * Light pressure (higher Z) = lighter color, Heavy pressure (lower Z) = darker color
     * @param {number} z - Z coordinate (pressure value)
     * @returns {THREE.Color} - Color based on pressure
     */
    getPressureColor(z) {
        // Normalize Z to 0-1 range (0 = light pressure, 1 = heavy pressure)
        const range = this.plotterPressureMin - this.plotterPressureMax; // Positive value
        let normalizedPressure = 0;

        if (range > 0) {
            normalizedPressure = (this.plotterPressureMin - z) / range;
            normalizedPressure = Math.max(0, Math.min(1, normalizedPressure));
        }

        // Create gradient from light cyan (low pressure) to deep blue (high pressure)
        // Light pressure: 0x88ddff (light cyan-blue)
        // Heavy pressure: 0x1144aa (deep blue)
        const r = Math.round(0x88 + (0x11 - 0x88) * normalizedPressure);
        const g = Math.round(0xdd + (0x44 - 0xdd) * normalizedPressure);
        const b = Math.round(0xff + (0xaa - 0xff) * normalizedPressure);

        return new THREE.Color((r << 16) | (g << 8) | b);
    }
}

// Global instance
window.gcodeVisualizer = null;

// Initialize visualizer
function initGCodeVisualizer() {
    window.gcodeVisualizer = new GCodeVisualizer('gcodeVisualizerContainer');
}

// Export for use in other scripts
window.initGCodeVisualizer = initGCodeVisualizer;
