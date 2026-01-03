// Streaming G-code Generator
// This module handles writing G-code directly to disk in chunks to avoid memory issues

class GcodeStreamer {
    constructor() {
        this.isStreaming = false;
        this.lineCount = 0;
        this.buffer = [];
        this.bufferSize = 1000; // Write every 1000 lines
    }

    async start(filePath) {
        if (window.__TAURI__) {
            // Tauri mode - use native file streaming
            // In Tauri v2, invoke is on __TAURI_INTERNALS__.invoke
            const invoke = window.__TAURI_INTERNALS__.invoke;
            await invoke('start_gcode_stream', { filePath });
            this.isStreaming = true;
            this.lineCount = 0;
            this.buffer = [];
        } else {
            // Browser mode - collect in memory (fallback)
            this.buffer = [];
            this.isStreaming = true;
            this.lineCount = 0;
        }
    }

    async writeLine(line) {
        if (!this.isStreaming) {
            throw new Error('Stream not started');
        }

        this.buffer.push(line);
        this.lineCount++;

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

        // Flush any remaining buffered lines
        await this.flush();

        if (window.__TAURI__) {
            // Close file via Tauri
            const invoke = window.__TAURI_INTERNALS__.invoke;
            const path = await invoke('finish_gcode_stream');
            this.isStreaming = false;
            return { path, lineCount: this.lineCount };
        } else {
            // Browser mode - return collected data
            this.isStreaming = false;
            return { content: this.buffer.join('\n'), lineCount: this.lineCount };
        }
    }

    getLineCount() {
        return this.lineCount;
    }
}

// Export for use in app.js
window.GcodeStreamer = GcodeStreamer;
