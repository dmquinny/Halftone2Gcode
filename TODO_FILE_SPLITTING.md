# TODO: File Splitting Feature

## Overview
Implement backend logic to split large G-code files into multiple smaller files with a specified maximum line count per file.

## Current Status
- ✅ UI Implementation Complete
  - "Split Into Multiple Files" toggle added ([index.html:690](index.html#L690))
  - "Max Lines Per File" input added (default: 50,000 lines) ([index.html:701](index.html#L701))
  - DOM references added to [app.js:70-71](app.js#L70-L71)
  - Visibility toggle logic implemented ([app.js:1289](app.js#L1289))
- ❌ Backend Implementation - NOT STARTED

## Required Implementation

### 1. Modify GcodeStreamer Class
**File:** [gcode-streamer.js](gcode-streamer.js)

Current architecture uses a single file stream. Need to add:
- Track current file part number
- Track lines written to current file
- Method to close current file and open next file
- File naming scheme (e.g., `output_part1.nc`, `output_part2.nc`, etc.)

**Proposed Changes:**
```javascript
class GcodeStreamer {
    constructor() {
        this.isStreaming = false;
        this.lineCount = 0;
        this.buffer = [];
        this.bufferSize = 1000;

        // NEW: File splitting properties
        this.maxLinesPerFile = 0; // 0 = no splitting
        this.currentFilePartNumber = 1;
        this.currentFileLineCount = 0;
        this.baseFilePath = '';
        this.headerLines = [];
        this.footerLines = [];
    }

    async start(filePath, maxLinesPerFile = 0, headerLines = [], footerLines = []) {
        // Store splitting configuration
        this.maxLinesPerFile = maxLinesPerFile;
        this.baseFilePath = filePath;
        this.headerLines = headerLines;
        this.footerLines = footerLines;
        this.currentFilePartNumber = 1;
        this.currentFileLineCount = 0;

        // Generate first file path
        const actualFilePath = this.getFilePathForPart(1);

        // Initialize file with header
        // ...
    }

    getFilePathForPart(partNumber) {
        if (this.maxLinesPerFile === 0) {
            return this.baseFilePath;
        }

        // Insert "_part1", "_part2", etc. before extension
        const ext = this.baseFilePath.substring(this.baseFilePath.lastIndexOf('.'));
        const base = this.baseFilePath.substring(0, this.baseFilePath.lastIndexOf('.'));
        return `${base}_part${partNumber}${ext}`;
    }

    async checkAndSplitFile() {
        if (this.maxLinesPerFile === 0) return;
        if (this.currentFileLineCount < this.maxLinesPerFile) return;

        // Write footer to current file
        for (const line of this.footerLines) {
            this.buffer.push(line);
        }
        await this.flush();

        // Close current file
        if (window.__TAURI__) {
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('finish_gcode_stream');
        }

        // Start next file
        this.currentFilePartNumber++;
        this.currentFileLineCount = 0;
        const nextFilePath = this.getFilePathForPart(this.currentFilePartNumber);

        if (window.__TAURI__) {
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('start_gcode_stream', { filePath: nextFilePath });
        }

        // Write header to new file
        for (const line of this.headerLines) {
            this.buffer.push(line);
            this.currentFileLineCount++;
        }
        await this.flush();
    }

    async writeLine(line) {
        if (!this.isStreaming) {
            throw new Error('Stream not started');
        }

        // Check if we need to split before writing
        await this.checkAndSplitFile();

        this.buffer.push(line);
        this.lineCount++;
        this.currentFileLineCount++;

        if (this.buffer.length >= this.bufferSize) {
            await this.flush();
        }
    }
}
```

### 2. Update Rust Backend
**File:** `src-tauri/src/main.rs`

Need to ensure Rust commands support:
- Opening/closing multiple file streams
- Proper file handle management
- No conflicts when switching between files

**Current Commands:**
- `start_gcode_stream` - Should work as-is, can be called multiple times
- `write_gcode_chunk` - Should work as-is
- `finish_gcode_stream` - Should work as-is

**Verification Needed:**
- Test that `start_gcode_stream` can be called after `finish_gcode_stream` without issues
- Ensure no file handle leaks when creating multiple files

### 3. Extract Header/Footer from Generator
**File:** [gcode-generator-streaming-v2.js](gcode-generator-streaming-v2.js)

Currently, the generator writes header and footer directly to the stream. Need to:
1. Extract header generation into a separate function that returns array of lines
2. Extract footer generation into a separate function that returns array of lines
3. Pass these to `GcodeStreamer.start()`

**Header includes:**
- File metadata comment
- Units (G21/G20)
- Work coordinate system (G54)
- Absolute positioning (G90)
- Spindle speed (M3 S{speed} or plotter-specific commands)
- Initial safe height positioning

**Footer includes:**
- Retract to safe height
- Return to origin
- Spindle off (M5 or plotter-specific)
- Program end (M30)

### 4. Update Integration Layer
**File:** [gcode-streaming-integration-v2.js](gcode-streaming-integration-v2.js)

Add parameters:
```javascript
const splitFiles = splitFilesToggle?.checked || false;
const maxLinesPerFile = splitFiles ? parseInt(maxLinesPerFileInput?.value || 50000) : 0;
```

Pass to streamer:
```javascript
const headerLines = [/* extract from generator */];
const footerLines = [/* extract from generator */];

await streamer.start(filePath, maxLinesPerFile, headerLines, footerLines);
```

### 5. User Feedback
When file splitting is enabled, update the completion message to list all generated files:
```
Generated 3 files:
- halftone_part1.nc (50,000 lines)
- halftone_part2.nc (50,000 lines)
- halftone_part3.nc (12,345 lines)
Total: 112,345 lines
```

## Considerations

### State Preservation Between Files
Each file should be independently runnable. Ensure each file:
- Starts from a safe state (tool up, spindle off)
- Sets up coordinate system and units
- Includes spindle/plotter initialization
- Ends in a safe state (tool up, return to origin)

### Line Counting Strategy
Need to decide what counts toward `maxLinesPerFile`:
- **Option 1:** Only G-code commands (exclude comments)
- **Option 2:** All lines including comments (simpler, recommended)
- **Option 3:** Configurable by user

**Recommendation:** Option 2 for simplicity

### Header/Footer Line Count
Header and footer lines should NOT count toward the `maxLinesPerFile` limit, or files will be smaller than expected.

**Revised logic:**
```javascript
// Split when content lines reach limit (excluding header/footer)
if (this.currentFileLineCount - this.headerLines.length >= this.maxLinesPerFile) {
    await this.splitToNextFile();
}
```

### File Naming
Current proposal: `basename_part1.ext`, `basename_part2.ext`, etc.

Alternative: `basename_001.ext`, `basename_002.ext` (zero-padded)

**Recommendation:** Zero-padded for better sorting with 100+ files

### Memory Efficiency
File splitting should maintain the same memory efficiency as single-file streaming. Don't load entire files into memory.

## Testing Checklist

- [ ] Single file mode still works (maxLinesPerFile = 0)
- [ ] Two-file split works correctly
- [ ] Multi-file split (5+ files) works correctly
- [ ] Header appears in every file
- [ ] Footer appears in every file
- [ ] Line counts are accurate
- [ ] File naming is correct
- [ ] Each file is independently runnable
- [ ] Memory usage stays low during splitting
- [ ] Progress updates show correct total line count
- [ ] Completion message lists all files
- [ ] Works in both browser and Tauri modes
- [ ] Works with plotter mode enabled
- [ ] Works with boundary enabled
- [ ] Works with tool change enabled

## Estimated Complexity
**Medium-High** - Requires careful state management and coordination between multiple subsystems.

## Priority
**Low-Medium** - Nice to have for very large jobs, but current single-file streaming handles most use cases efficiently.

## Related Files
- [index.html](index.html) - UI controls (lines 690-711)
- [app.js](app.js) - DOM references and event handlers (lines 70-71, 1289-1295)
- [gcode-streamer.js](gcode-streamer.js) - Core streaming class (needs major modifications)
- [gcode-generator-streaming-v2.js](gcode-generator-streaming-v2.js) - Header/footer extraction needed
- [gcode-streaming-integration-v2.js](gcode-streaming-integration-v2.js) - Parameter passing
- `src-tauri/src/main.rs` - Rust backend (verify multiple file support)
