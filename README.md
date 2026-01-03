# Halftone to G-code Converter

A high-performance desktop application for converting images to CNC G-code using halftone patterns. Built with Tauri for native performance and memory efficiency.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Image to G-code Conversion
- **Halftone Patterns**: Lines, dots, squares, circles with customizable spacing and angles
- **Advanced Effects**: Wavelength and amplitude controls for wavy patterns
- **Image Processing**: Brightness, contrast, gamma, and level adjustments
- **Live Preview**: Real-time visualization before generating G-code

### CNC Engraving
- **V-bit Support**: Multiple angles (30°, 60°, 90°, 120°)
- **Variable Depth**: Automatic depth calculation based on halftone intensity
- **Toolpath Optimization**: Bidirectional cutting, path optimization
- **Multi-pass**: Multiple passes for deeper engraving
- **Z-axis Ramping**: Smooth entry into material
- **Boundary Cutting**: Automatic frame around the design

### Plotter Mode
- **Pen Plotting**: Convert designs to pen plotter instructions
- **Pressure Control**: Z-axis pressure adjustment based on line darkness
- **Line Width Control**: Variable line width through parallel offset

### Memory Efficient Streaming
- **Low Memory Usage**: Process files of any size with minimal RAM
- **Direct File Writing**: Stream G-code directly to disk
- **Large File Support**: Generate 640k+ line files (16MB+) using only ~100MB RAM
- **Preview System**: View specific line ranges without loading entire file

### Preset Management
- Save/load halftone settings
- Save/load CNC parameters
- Export/import presets as files
- Default preset auto-loading

## 🚀 Quick Start

### Download Pre-built App

**[Download for Windows](#)** • **[Download for macOS](#)** • **[Download for Linux](#)**

> Both installers and portable versions are available in the [Releases](../../releases) section.

**Available Formats:**
- **Windows**: `.msi` installer, `.exe` installer, and portable `.exe` (no installation required)
- **macOS**: `.dmg` installer and `.app` bundle (portable)
- **Linux**: `.deb` package and `.AppImage` (portable, run anywhere)

### Build from Source

#### Prerequisites

1. **Node.js** - [Download](https://nodejs.org/)
2. **Rust** - [Install via rustup](https://rustup.rs/)

Verify installation:
```bash
node --version
npm --version
rustc --version
cargo --version
```

#### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/halftone-converter.git
cd halftone-converter

# Install dependencies
npm install

# Run in development mode
npm run dev
```

#### Building

```bash
# Build production installer
npm run build
```

Build outputs will be in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` installer, `.exe` installer, and portable `.exe` in `nsis/` folder
- **macOS**: `.dmg` installer and `.app` bundle (portable)
- **Linux**: `.deb` package and `.AppImage` (portable)

## 📖 Usage

1. **Load Image**: Click "Choose Image" or drag & drop
2. **Adjust Halftone**: Configure pattern type, spacing, angle
3. **Preview**: Click "Generate Halftone" to see preview
4. **Configure CNC**: Set V-bit angle, depths, feed rates
5. **Generate**: Click "Generate G-code" to save file

### Tips
- Start with default settings and adjust gradually
- Use preview to verify pattern before generating G-code
- Enable line numbers for easier debugging
- Use the line preview feature to inspect specific sections of large files

## 🏗️ Project Structure

```
halftone-converter/
├── index.html                              # Main UI
├── app.js                                  # Core application logic
├── styles.css                              # Application styling
├── worker.js                               # Image processing worker
├── gcode-generator-streaming-v2.js         # Streaming G-code generator
├── gcode-streaming-integration-v2.js       # Tauri integration
├── gcode-streamer.js                       # File streaming API
├── StreamSaver.js                          # Download helper
├── mitm.html                               # Service worker helper
├── copy-files.js                           # Build script
├── package.json                            # NPM configuration
├── .github/workflows/release.yml           # CI/CD for multi-platform builds
└── src-tauri/
    ├── src/main.rs                         # Rust backend with streaming commands
    ├── Cargo.toml                          # Rust dependencies
    ├── tauri.conf.json                     # Tauri configuration
    ├── capabilities/default.json           # Security permissions
    └── icons/                              # Application icons
```

## 🔧 Advanced Configuration

### Memory Efficient Streaming

The app uses a streaming architecture to handle large G-code files:

- G-code is written directly to disk in chunks
- Only ~1000 lines loaded in memory for preview
- Supports files with 640k+ lines without memory issues

### Custom Icons

1. Create a 1024x1024 PNG image named `app-icon.png`
2. Run: `npm run tauri icon`

### Window Settings

Edit `src-tauri/tauri.conf.json`:

```json
{
  "app": {
    "windows": [{
      "title": "Halftone Converter",
      "width": 1400,
      "height": 900,
      "minWidth": 1000,
      "minHeight": 700
    }]
  }
}
```

## 🐛 Troubleshooting

**Port 8080 already in use**
```bash
# Change port in package.json
"serve": "python -m http.server 8081"  # Use port 8081 instead
```

**Rust not found**
- Install from https://rustup.rs/
- Restart terminal/IDE after installation

**Build fails**
```bash
# Update Rust
rustup update

# Clean build cache
cd src-tauri && cargo clean
```

**Large files cause memory issues (older versions)**
- Update to latest version with streaming support
- Memory usage should stay under 200MB regardless of file size

## 🚢 Multi-Platform Builds

This project uses GitHub Actions for automated builds:

```bash
# Create and push a release tag
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions will automatically build installers for Windows, macOS, and Linux.

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📝 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with [Tauri](https://tauri.app/)
- Powered by [Rust](https://www.rust-lang.org/)
- Image processing with HTML5 Canvas

---

**Made with ❤️ for CNC enthusiasts and makers**
