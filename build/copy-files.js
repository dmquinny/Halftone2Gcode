const fs = require('fs');
const path = require('path');

// Paths relative to project root (parent of build/)
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Helper function to recursively copy directories
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

// Copy index.html
console.log('Copying index.html...');
fs.copyFileSync(
    path.join(rootDir, 'index.html'),
    path.join(distDir, 'index.html')
);

// Copy assets directory
console.log('Copying assets/...');
copyDir(
    path.join(rootDir, 'assets'),
    path.join(distDir, 'assets')
);

// Copy src directory
console.log('Copying src/...');
copyDir(
    path.join(rootDir, 'src'),
    path.join(distDir, 'src')
);

// Copy lib directory
console.log('Copying lib/...');
copyDir(
    path.join(rootDir, 'lib'),
    path.join(distDir, 'lib')
);

console.log('\n✓ Build preparation complete!');
console.log('All files copied to dist/ with new folder structure.');
