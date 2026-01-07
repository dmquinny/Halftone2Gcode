// Monaco Editor Integration for G-code Output
import { initializeMonacoEditor, setMonacoContent, getMonacoContent, disposeMonacoEditor } from './monaco-editor-setup.js';

let monacoEditorInstance = null;
let gcodeContainer = null;

// Initialize Monaco Editor for G-code output
export function initGcodeMonacoEditor() {
    gcodeContainer = document.getElementById('monacoEditorContainer');

    if (!gcodeContainer) {
        console.error('Monaco editor container not found');
        return null;
    }

    // Initialize Monaco Editor
    monacoEditorInstance = initializeMonacoEditor(gcodeContainer);

    console.log('Monaco Editor initialized for G-code output');
    return monacoEditorInstance;
}

// Display G-code in Monaco Editor
export function displayGcodeInMonaco(gcodeText) {
    if (!monacoEditorInstance) {
        console.error('Monaco editor not initialized');
        return;
    }

    // Show the Monaco container
    if (gcodeContainer) {
        gcodeContainer.style.display = 'block';
    }

    // Set the G-code content
    setMonacoContent(gcodeText);
}

// Clear G-code display
export function clearGcodeMonaco() {
    if (monacoEditorInstance) {
        setMonacoContent('');
    }

    if (gcodeContainer) {
        gcodeContainer.style.display = 'none';
    }
}

// Get G-code content from Monaco
export function getGcodeFromMonaco() {
    return getMonacoContent();
}

// Cleanup Monaco Editor
export function cleanupMonacoEditor() {
    if (monacoEditorInstance) {
        disposeMonacoEditor();
        monacoEditorInstance = null;
    }
}

// Export for window access
if (typeof window !== 'undefined') {
    window.monacoGcode = {
        init: initGcodeMonacoEditor,
        display: displayGcodeInMonaco,
        clear: clearGcodeMonaco,
        getContent: getGcodeFromMonaco,
        cleanup: cleanupMonacoEditor
    };
}
