// Monaco Editor G-code Viewer
// Standalone script for G-code preview with Monaco Editor

let monacoEditor = null;
let monacoLoaded = false;

// Initialize Monaco Editor
function initMonacoGcodeViewer() {
    console.log('🔧 Initializing Monaco Editor...');

    if (!window.require) {
        console.error('❌ Monaco loader not found - require is not available');
        return;
    }

    console.log('✅ Monaco loader found, configuring paths...');

    require.config({
        paths: {
            'vs': './monaco-editor/vs'
        }
    });

    console.log('📦 Loading Monaco Editor modules...');

    require(['vs/editor/editor.main'], function() {
        console.log('✅ Monaco Editor loaded successfully!');
        monacoLoaded = true;

        if (typeof monaco === 'undefined') {
            console.error('❌ Monaco object not available after loading!');
            return;
        }

        // Register G-code language
        monaco.languages.register({ id: 'gcode' });

        // Define G-code syntax highlighting
        monaco.languages.setMonarchTokensProvider('gcode', {
            tokenizer: {
                root: [
                    // Comments
                    [/\(.*?\)/, 'comment'],
                    [/;.*$/, 'comment'],

                    // G-code commands (G0, G1, G2, G3, etc.)
                    [/\b[G]\d+(\.\d+)?\b/, 'keyword'],

                    // M-code commands
                    [/\bM\d+\b/, 'keyword.control'],

                    // T-code (Tool)
                    [/\bT\d+\b/, 'type'],

                    // Coordinates (X, Y, Z, A, B, C, U, V, W, I, J, K)
                    [/\b[XYZABCUVWIJK]-?\d+(\.\d+)?\b/, 'variable'],

                    // Feed rate (F)
                    [/\bF\d+(\.\d+)?\b/, 'number'],

                    // Spindle speed (S)
                    [/\bS\d+(\.\d+)?\b/, 'number'],

                    // Line numbers (N)
                    [/\bN\d+\b/, 'string'],

                    // Numbers
                    [/-?\d+(\.\d+)?/, 'number']
                ]
            }
        });

        // Define dark theme for G-code
        monaco.editor.defineTheme('gcode-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: '', foreground: 'd4d4d4' },  // Default token color
                { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
                { token: 'keyword.control', foreground: 'C586C0', fontStyle: 'bold' },
                { token: 'type', foreground: '4EC9B0' },
                { token: 'variable', foreground: '9CDCFE' },
                { token: 'number', foreground: 'B5CEA8' },
                { token: 'string', foreground: 'CE9178' }
            ],
            colors: {
                'editor.background': '#1e1e1e',
                'editor.foreground': '#d4d4d4',
                'editorLineNumber.foreground': '#858585',
                'editor.selectionBackground': '#264f78',
                'editor.lineHighlightBackground': '#2a2a2a'
            }
        });

        // Define light theme for G-code
        monaco.editor.defineTheme('gcode-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '008000', fontStyle: 'italic' },
                { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
                { token: 'keyword.control', foreground: 'AF00DB', fontStyle: 'bold' },
                { token: 'type', foreground: '267f99' },
                { token: 'variable', foreground: '001080' },
                { token: 'number', foreground: '098658' },
                { token: 'string', foreground: 'A31515' }
            ],
            colors: {
                'editor.background': '#ffffff',
                'editor.foreground': '#000000',
                'editorLineNumber.foreground': '#237893',
                'editor.selectionBackground': '#ADD6FF',
                'editor.lineHighlightBackground': '#f0f0f0'
            }
        });

        // Create the editor instance
        const container = document.getElementById('monacoEditorContainer');
        console.log('🔍 Looking for Monaco container:', container ? 'Found!' : 'NOT FOUND');

        if (container) {
            console.log('📝 Creating Monaco Editor instance...');

            // Ensure container has explicit dimensions before creating editor
            const rect = container.getBoundingClientRect();
            console.log('Container dimensions:', rect.width, 'x', rect.height);

            // Create editor with automaticLayout disabled initially
            monacoEditor = monaco.editor.create(container, {
                value: 'G21\nG90\nG0 X0 Y0\nG1 X10 Y10 F500',
                language: 'gcode',
                theme: 'gcode-dark',
                readOnly: true,
                automaticLayout: false,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineNumbers: 'on',
                glyphMargin: false,
                folding: false,
                lineDecorationsWidth: 0,
                lineNumbersMinChars: 5,
                renderLineHighlight: 'line',
                selectionHighlight: false,
                scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto',
                    verticalScrollbarSize: 12,
                    horizontalScrollbarSize: 12
                },
                wordWrap: 'off',
                fontFamily: "'Consolas', 'Courier New', monospace"
            });

            console.log('✅ Monaco Editor created');

            // Force layout after creation with explicit dimensions
            setTimeout(() => {
                const width = container.clientWidth;
                const height = container.clientHeight;
                console.log('Forcing layout with dimensions:', width, 'x', height);
                monacoEditor.layout({ width, height });

                // Enable automatic layout after initial forced layout
                setTimeout(() => {
                    monacoEditor.updateOptions({ automaticLayout: true });
                    console.log('✅ Automatic layout enabled');
                }, 100);
            }, 100);
        } else {
            console.error('❌ Monaco Editor container not found!');
        }
    });
}

// Display G-code in Monaco Editor
function displayGcodeInMonaco(gcodeText) {
    console.log('📄 displayGcodeInMonaco called with', gcodeText ? `${gcodeText.length} chars` : 'empty text');

    const container = document.getElementById('monacoEditorContainer');
    if (container) {
        console.log('👁️ Making container visible...');
        container.style.display = 'block';
    }

    // TEMPORARY FALLBACK: Use simple pre element since Monaco has rendering issues in Tauri
    console.warn('⚠️ Using fallback text viewer - Monaco rendering not working in Tauri');
    if (container) {
        // Show first 10000 lines only to avoid browser freeze
        const lines = gcodeText.split('\n');
        const displayLines = lines.slice(0, 10000);
        const totalLines = lines.length;

        container.innerHTML = `
            <div style="padding: 10px; background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas', monospace; font-size: 13px; height: 100%; overflow: auto; white-space: pre;">
                <div style="color: #6A9955; margin-bottom: 10px;">// Showing first ${displayLines.length.toLocaleString()} of ${totalLines.toLocaleString()} lines</div>
${displayLines.map((line, i) => {
    const lineNum = (i + 1).toString().padStart(6, ' ');
    // Simple syntax highlighting
    let coloredLine = line;
    if (line.trim().startsWith('(') || line.trim().startsWith(';')) {
        coloredLine = `<span style="color: #6A9955; font-style: italic;">${line}</span>`;
    } else if (line.match(/\b[GM]\d+/)) {
        coloredLine = line.replace(/(\b[GM]\d+)/g, '<span style="color: #569CD6; font-weight: bold;">$1</span>')
                         .replace(/(\b[XYZF]-?\d+\.?\d*)/g, '<span style="color: #9CDCFE;">$1</span>');
    }
    return `<span style="color: #858585;">${lineNum}</span>  ${coloredLine}`;
}).join('\n')}
            </div>
        `;
        console.log(`✅ Loaded ${totalLines.toLocaleString()} lines into fallback viewer`);
        return;
    }

    if (monacoEditor) {
        console.log('📝 Setting Monaco Editor value...');
        console.log('First 500 chars of content:', gcodeText.substring(0, 500));

        monacoEditor.setValue(gcodeText);

        // Force layout after content is set and container is visible
        setTimeout(() => {
            const container = document.getElementById('monacoEditorContainer');
            if (container) {
                const width = container.clientWidth;
                const height = container.clientHeight;
                console.log('📐 Final layout dimensions:', width, 'x', height);
                monacoEditor.layout({ width, height });
                monacoEditor.setScrollPosition({ scrollTop: 0, scrollLeft: 0 });
                monacoEditor.revealLine(1);
            }
        }, 100);

        const lineCount = gcodeText.split('\n').length;
        console.log(`✅ Loaded ${lineCount} lines into Monaco Editor`);
    } else {
        console.error('❌ Monaco Editor not initialized yet');
    }
}

// Clear Monaco Editor
function clearMonacoEditor() {
    if (monacoEditor) {
        monacoEditor.setValue('');
    }

    const container = document.getElementById('monacoEditorContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Get content from Monaco Editor
function getMonacoEditorContent() {
    if (monacoEditor) {
        return monacoEditor.getValue();
    }
    return '';
}

// Expose functions globally
window.monacoGcode = {
    init: initMonacoGcodeViewer,
    display: displayGcodeInMonaco,
    clear: clearMonacoEditor,
    getContent: getMonacoEditorContent,
    isLoaded: () => monacoLoaded,
    editor: () => monacoEditor
};

// Auto-initialize when page loads
window.addEventListener('load', function() {
    setTimeout(() => {
        initMonacoGcodeViewer();
    }, 100);
});
