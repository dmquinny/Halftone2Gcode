// Monaco Editor Setup for G-code Preview
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';

let monacoEditor = null;

// Register G-code language
function registerGcodeLanguage() {
    // Register the G-code language
    monaco.languages.register({ id: 'gcode' });

    // Define G-code syntax highlighting
    monaco.languages.setMonarchTokensProvider('gcode', {
        tokenizer: {
            root: [
                // Comments
                [/\(.*?\)/, 'comment'],
                [/;.*$/, 'comment'],

                // G-code commands (G0, G1, G2, G3, etc.)
                [/\b[GM]\d+(\.\d+)?\b/, 'keyword'],

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
}

// Initialize Monaco Editor
export function initializeMonacoEditor(containerElement) {
    // Register language and themes
    registerGcodeLanguage();

    // Create the editor
    monacoEditor = monaco.editor.create(containerElement, {
        value: '',
        language: 'gcode',
        theme: 'gcode-dark',
        readOnly: true,
        automaticLayout: true,
        minimap: {
            enabled: true
        },
        scrollBeyondLastLine: false,
        fontSize: 13,
        lineNumbers: 'on',
        glyphMargin: false,
        folding: false,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 5,
        renderLineHighlight: 'line',
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 12,
            horizontalScrollbarSize: 12
        },
        wordWrap: 'off'
    });

    return monacoEditor;
}

// Update editor content
export function setMonacoContent(content) {
    if (monacoEditor) {
        monacoEditor.setValue(content);
    }
}

// Get editor content
export function getMonacoContent() {
    if (monacoEditor) {
        return monacoEditor.getValue();
    }
    return '';
}

// Dispose editor
export function disposeMonacoEditor() {
    if (monacoEditor) {
        monacoEditor.dispose();
        monacoEditor = null;
    }
}

// Scroll to line
export function scrollToLine(lineNumber) {
    if (monacoEditor) {
        monacoEditor.revealLineInCenter(lineNumber);
    }
}

// Set theme
export function setMonacoTheme(isDark) {
    if (monacoEditor) {
        monaco.editor.setTheme(isDark ? 'gcode-dark' : 'gcode-light');
    }
}
