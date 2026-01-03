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
    'StreamSaver.js',
    'gcode-streamer.js',
    'gcode-generator-streaming-v2.js',
    'gcode-streaming-integration-v2.js',
    'mitm.html'
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

console.log('Build preparation complete!');
