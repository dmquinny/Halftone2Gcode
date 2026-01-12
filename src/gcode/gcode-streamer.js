// Streaming G-code Generator
// This module handles writing G-code directly to disk in chunks to avoid memory issues

class GcodeStreamer {
    constructor() {
        this.isStreaming = false;
        this.lineCount = 0;
        this.buffer = [];
        this.bufferSize = 10000; // Write every 10,000 lines (increased from 1000 for better performance)

        // File splitting properties
        this.maxLinesPerFile = 0; // 0 = no splitting
        this.currentFilePartNumber = 1;
        this.currentFileLineCount = 0;
        this.baseFilePath = '';
        this.headerLines = [];
        this.footerLines = [];
        this.generatedFiles = []; // Track all generated file paths
    }

    async start(filePath, maxLinesPerFile = 0, headerLines = [], footerLines = []) {
        // Store splitting configuration
        this.maxLinesPerFile = maxLinesPerFile;
        this.baseFilePath = filePath;
        this.headerLines = headerLines;
        this.footerLines = footerLines;
        this.currentFilePartNumber = 1;
        this.currentFileLineCount = 0;
        this.generatedFiles = [];

        // Generate first file path
        const actualFilePath = this.getFilePathForPart(1);
        this.generatedFiles.push(actualFilePath);

        if (window.__TAURI__) {
            // Tauri mode - use native file streaming
            // In Tauri v2, invoke is on __TAURI_INTERNALS__.invoke
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('start_gcode_stream', { filePath: actualFilePath });
            this.isStreaming = true;
            this.lineCount = 0;
            this.buffer = [];

            // Write header to first file if provided
            if (this.headerLines.length > 0) {
                for (const line of this.headerLines) {
                    this.buffer.push(line);
                }
                await this.flush();
            }
        } else {
            // Browser mode - collect in memory (fallback)
            this.buffer = [];
            this.isStreaming = true;
            this.lineCount = 0;

            // Add header to buffer in browser mode
            if (this.headerLines.length > 0) {
                this.buffer.push(...this.headerLines);
            }
        }
    }

    getFilePathForPart(partNumber) {
        if (this.maxLinesPerFile === 0 || partNumber === 1) {
            return this.baseFilePath;
        }

        // Insert "_part001", "_part002", etc. before extension (zero-padded)
        const lastDotIndex = this.baseFilePath.lastIndexOf('.');
        if (lastDotIndex === -1) {
            // No extension
            return `${this.baseFilePath}_part${String(partNumber).padStart(3, '0')}`;
        }
        const ext = this.baseFilePath.substring(lastDotIndex);
        const base = this.baseFilePath.substring(0, lastDotIndex);
        return `${base}_part${String(partNumber).padStart(3, '0')}${ext}`;
    }

    async checkAndSplitFile() {
        // Don't split if splitting is disabled
        if (this.maxLinesPerFile === 0) return false;

        // Check if we need to split (only count content lines, not header)
        const contentLineCount = this.currentFileLineCount - this.headerLines.length;
        if (contentLineCount < this.maxLinesPerFile) return false;

        console.log(`Splitting file at ${this.currentFileLineCount} lines (${contentLineCount} content lines)`);

        // Write footer to current file
        if (this.footerLines.length > 0) {
            for (const line of this.footerLines) {
                this.buffer.push(line);
            }
            await this.flush();
        }

        // Close current file
        if (window.__TAURI__) {
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('finish_gcode_stream');
        }

        // Start next file
        this.currentFilePartNumber++;
        this.currentFileLineCount = 0;
        const nextFilePath = this.getFilePathForPart(this.currentFilePartNumber);
        this.generatedFiles.push(nextFilePath);

        console.log(`Starting new file part ${this.currentFilePartNumber}: ${nextFilePath}`);

        if (window.__TAURI__) {
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('start_gcode_stream', { filePath: nextFilePath });
        }

        // Write header to new file
        if (this.headerLines.length > 0) {
            for (const line of this.headerLines) {
                this.buffer.push(line);
            }
            await this.flush();
        }

        return true;
    }

    async writeLine(line) {
        if (!this.isStreaming) {
            throw new Error('Stream not started');
        }

        // Check if we need to split before writing this line
        await this.checkAndSplitFile();

        this.buffer.push(line);
        this.lineCount++;
        this.currentFileLineCount++;

        // Flush buffer when it reaches bufferSize
        if (this.buffer.length >= this.bufferSize) {
            await this.flush();
        }
    }

    async writeLines(lines) {
        for (const line of lines) {
            await this.writeLine(line);
        }
    }

    async flush() {
        if (this.buffer.length === 0) return;

        const chunk = this.buffer.join('\n') + '\n';

        if (window.__TAURI__) {
            // Write to file via Tauri
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('write_gcode_chunk', { chunk });
        }

        // Clear buffer
        this.buffer = [];
    }

    async finish() {
        if (!this.isStreaming) {
            throw new Error('Stream not started');
        }

        // Write footer to the last file if provided
        if (this.footerLines.length > 0) {
            for (const line of this.footerLines) {
                this.buffer.push(line);
                this.currentFileLineCount++;
            }
        }

        // Flush any remaining buffered lines
        await this.flush();

        if (window.__TAURI__) {
            // Close file via Tauri
            const invoke = window.__TAURI_INTERNALS__.invoke;
            const path = await invoke('finish_gcode_stream');
            this.isStreaming = false;

            // Return information about all generated files
            return {
                path,
                lineCount: this.lineCount,
                files: this.generatedFiles,
                fileCount: this.generatedFiles.length
            };
        } else {
            // Browser mode - return collected data
            this.isStreaming = false;
            return {
                content: this.buffer.join('\n'),
                lineCount: this.lineCount,
                files: this.generatedFiles,
                fileCount: this.generatedFiles.length
            };
        }
    }

    getLineCount() {
        return this.lineCount;
    }
}

// Export for use in app.js
window.GcodeStreamer = GcodeStreamer;
