const fs = require('fs');
const path = require('path');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Files to copy
const filesToCopy = [
    'index.html',
    'app.js',
    'styles.css',
    'worker.js',
    'pica.min.js',
    'StreamSaver.js',
    'gcode-streamer.js',
    'gcode-generator-streaming-v2.js',
    'gcode-streaming-integration-v2.js',
    'ace-gcode-viewer.js',
    'gcode-visualizer.js',
    'visualizer-controls.js'
];

// Copy each file
filesToCopy.forEach(file => {
    const src = path.join(__dirname, file);
    const dest = path.join(distDir, file);

    if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log(`Copied ${file} to dist/`);
    } else {
        console.warn(`Warning: ${file} not found, skipping...`);
    }
});

// Copy Ace Editor directory
const aceSrc = path.join(__dirname, 'ace-editor');
const aceDest = path.join(distDir, 'ace-editor');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

if (fs.existsSync(aceSrc)) {
    copyDir(aceSrc, aceDest);
    console.log('Copied ace-editor/ directory to dist/');
} else {
    console.warn('Warning: ace-editor/ directory not found, skipping...');
}

// Copy Three.js directory
const threeSrc = path.join(__dirname, 'three-js');
const threeDest = path.join(distDir, 'three-js');

if (fs.existsSync(threeSrc)) {
    copyDir(threeSrc, threeDest);
    console.log('Copied three-js/ directory to dist/');
} else {
    console.warn('Warning: three-js/ directory not found, skipping...');
}

console.log('Build preparation complete!');
