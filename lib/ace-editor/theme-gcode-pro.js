// Custom Ace Editor theme for G-code - matches visualizer colors
ace.define("ace/theme/gcode-pro", ["require", "exports", "module", "ace/lib/dom"], function(require, exports, module) {
    exports.isDark = true;
    exports.cssClass = "ace-gcode-pro";

    // CSS rules for the theme
    exports.cssText = `
.ace-gcode-pro .ace_gutter {
    background: #0d0d0d;
    color: #666666;
}

.ace-gcode-pro .ace_print-margin {
    width: 1px;
    background: #2a2a2a;
}

.ace-gcode-pro {
    background-color: #0d0d0d;
    color: #cccccc;
}

.ace-gcode-pro .ace_cursor {
    color: #00ffff;
}

.ace-gcode-pro .ace_marker-layer .ace_selection {
    background: rgba(68, 136, 255, 0.2);
}

.ace-gcode-pro.ace_multiselect .ace_selection.ace_start {
    box-shadow: 0 0 3px 0px #0d0d0d;
}

.ace-gcode-pro .ace_marker-layer .ace_step {
    background: rgb(102, 82, 0);
}

.ace-gcode-pro .ace_marker-layer .ace_bracket {
    margin: -1px 0 0 -1px;
    border: 1px solid rgba(255, 255, 255, 0.15);
}

.ace-gcode-pro .ace_marker-layer .ace_active-line {
    background: rgba(255, 255, 255, 0.05);
}

.ace-gcode-pro .ace_gutter-active-line {
    background-color: rgba(255, 255, 255, 0.05);
}

.ace-gcode-pro .ace_marker-layer .ace_selected-word {
    border: 1px solid rgba(68, 136, 255, 0.4);
}

.ace-gcode-pro .ace_invisible {
    color: rgba(255, 255, 255, 0.15);
}

.ace-gcode-pro .ace_keyword,
.ace-gcode-pro .ace_meta {
    color: #ff4444;
}

.ace-gcode-pro .ace_constant,
.ace-gcode-pro .ace_constant.ace_numeric {
    color: #ffaa66;
}

.ace-gcode-pro .ace_constant.ace_language {
    color: #ff4444;
}

.ace-gcode-pro .ace_invalid {
    color: #ff0000;
    background-color: rgba(255, 0, 0, 0.1);
}

.ace-gcode-pro .ace_fold {
    background-color: #4488ff;
    border-color: #cccccc;
}

/* G-code specific syntax highlighting - matches 3D visualizer colors */

/* Comments - dimmed gray */
.ace-gcode-pro .ace_comment {
    color: #666666;
    font-style: italic;
}

/* Line numbers (N commands) - gray */
.ace-gcode-pro .ace_comment.ace_line {
    color: #888888;
}

/* G0 (rapid moves) - CYAN to match visualizer */
.ace-gcode-pro .ace_keyword.ace_rapid {
    color: #00ffff;
    font-weight: bold;
}

/* G1, G2, G3 (cutting moves) - BLUE to match visualizer */
.ace-gcode-pro .ace_keyword.ace_cutting {
    color: #4488ff;
    font-weight: bold;
}

/* Other G commands - standard blue */
.ace-gcode-pro .ace_keyword.ace_gcode {
    color: #4488ff;
}

/* M commands (machine control) - orange */
.ace-gcode-pro .ace_keyword.ace_mcode {
    color: #ff9944;
    font-weight: bold;
}

/* T commands (tool change) - yellow */
.ace-gcode-pro .ace_keyword.ace_tcode {
    color: #ffdd44;
    font-weight: bold;
}

/* F command (feed rate) - light blue */
.ace-gcode-pro .ace_keyword.ace_feed {
    color: #88ccff;
}

/* S command (spindle speed) - light blue */
.ace-gcode-pro .ace_keyword.ace_spindle {
    color: #88ccff;
}

/* Axis coordinates (X, Y, Z) - white */
.ace-gcode-pro .ace_variable.ace_axis {
    color: #ffffff;
}

/* Arc parameters (I, J, K) - light green */
.ace-gcode-pro .ace_variable.ace_arc {
    color: #88ff88;
}

/* Numeric values - light color */
.ace-gcode-pro .ace_constant.ace_numeric {
    color: #aaddff;
}

.ace-gcode-pro .ace_indent-guide {
    background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAACCAYAAACZgbYnAAAAEklEQVQImWNgYGBgYHB3d/8PAAOIAdULw8qMAAAAAElFTkSuQmCC) right repeat-y;
}
`;

    var dom = require("../lib/dom");
    dom.importCssString(exports.cssText, exports.cssClass);
});

(function() {
    ace.require(["ace/theme/gcode-pro"], function(m) {
        if (typeof module == "object" && typeof exports == "object" && module) {
            module.exports = m;
        }
    });
})();
