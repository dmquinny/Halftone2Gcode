// Ace Editor G-code Viewer
// Replacement for Monaco Editor with better Tauri compatibility

let aceEditor = null;
let aceLoaded = false;

// Initialize Ace Editor
function initAceGcodeViewer() {
    console.log('🔧 Initializing Ace Editor...');

    if (typeof ace === 'undefined') {
        console.error('❌ Ace Editor not loaded');
        return;
    }

    aceLoaded = true;
    console.log('✅ Ace Editor loaded successfully!');

    const container = document.getElementById('monacoEditorContainer');
    if (!container) {
        console.error('❌ Container not found');
        return;
    }

    console.log('📝 Creating Ace Editor instance...');

    // Create Ace Editor
    aceEditor = ace.edit(container);

    // Configure editor
    aceEditor.setTheme('ace/theme/tomorrow_night');
    aceEditor.session.setMode('ace/mode/gcode');
    aceEditor.setReadOnly(true);
    aceEditor.setOptions({
        fontSize: '14px',
        fontFamily: 'Consolas, Monaco, monospace',
        showPrintMargin: false,
        highlightActiveLine: false,
        highlightGutterLine: false,
        displayIndentGuides: false,
        enableBasicAutocompletion: false,
        enableLiveAutocompletion: false,
        enableSnippets: false,
        showLineNumbers: true,
        showGutter: true,
        wrap: false
    });

    // Set initial empty value
    aceEditor.setValue('', -1);

    console.log('✅ Ace Editor initialized successfully');
}

// Display G-code in Ace Editor
function displayGcodeInAce(gcodeText) {
    console.log('📄 displayGcodeInAce called with', gcodeText ? `${gcodeText.length} chars` : 'empty text');

    const container = document.getElementById('monacoEditorContainer');
    if (container) {
        container.style.display = 'block';
    }

    if (aceEditor) {
        console.log('📝 Setting Ace Editor value...');

        aceEditor.setValue(gcodeText, -1); // -1 moves cursor to start
        aceEditor.clearSelection();
        aceEditor.gotoLine(1, 0, false);

        const lineCount = gcodeText.split('\n').length;
        console.log(`✅ Loaded ${lineCount.toLocaleString()} lines into Ace Editor`);
    } else {
        console.error('❌ Ace Editor not initialized yet');
    }
}

// Clear Ace Editor
function clearAceEditor() {
    if (aceEditor) {
        aceEditor.setValue('', -1);
    }

    const container = document.getElementById('monacoEditorContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Get content from Ace Editor
function getAceEditorContent() {
    if (aceEditor) {
        return aceEditor.getValue();
    }
    return '';
}

// Expose functions globally (compatible with existing Monaco interface)
window.monacoGcode = {
    init: initAceGcodeViewer,
    display: displayGcodeInAce,
    clear: clearAceEditor,
    getContent: getAceEditorContent,
    isLoaded: () => aceLoaded,
    editor: () => aceEditor
};

// Auto-initialize when page loads
window.addEventListener('load', function() {
    setTimeout(() => {
        initAceGcodeViewer();
    }, 100);
});
