// Enhanced G-code mode with color-coded rapid vs cutting moves
ace.define("ace/mode/gcode_enhanced_highlight_rules", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

    var GcodeEnhancedHighlightRules = function() {
        this.$rules = {
            start: [
                // Comments in parentheses - gray
                {
                    token: "comment",
                    regex: "\\(.*?\\)"
                },
                // Line numbers (N commands) - gray
                {
                    token: "comment.line",
                    regex: "\\b[Nn]\\d+"
                },
                // G0 (rapid moves) - CYAN to match visualizer
                {
                    token: "keyword.rapid",
                    regex: "\\b[Gg]0+(?:\\.\\d+)?\\b"
                },
                // G1, G2, G3 (cutting moves) - BLUE to match visualizer
                {
                    token: "keyword.cutting",
                    regex: "\\b[Gg][123](?:\\.\\d+)?\\b"
                },
                // Other G commands - standard blue
                {
                    token: "keyword.gcode",
                    regex: "\\b[Gg]\\d+(?:\\.\\d+)?\\b"
                },
                // M commands (machine control) - orange
                {
                    token: "keyword.mcode",
                    regex: "\\b[Mm]\\d+(?:\\.\\d+)?\\b"
                },
                // T commands (tool change) - yellow
                {
                    token: "keyword.tcode",
                    regex: "\\b[Tt]\\d+\\b"
                },
                // F command (feed rate) - light blue
                {
                    token: "keyword.feed",
                    regex: "\\b[Ff]\\d+(?:\\.\\d+)?\\b"
                },
                // S command (spindle speed) - light blue
                {
                    token: "keyword.spindle",
                    regex: "\\b[Ss]\\d+(?:\\.\\d+)?\\b"
                },
                // Axis coordinates (X, Y, Z, A, B, C) - white
                {
                    token: "variable.axis",
                    regex: "\\b[XYZABCxyzabc]-?\\d+(?:\\.\\d+)?\\b"
                },
                // I, J, K (arc parameters) - light green
                {
                    token: "variable.arc",
                    regex: "\\b[IJKijk]-?\\d+(?:\\.\\d+)?\\b"
                },
                // Standalone numbers - light color
                {
                    token: "constant.numeric",
                    regex: "-?\\d+(?:\\.\\d+)?"
                },
                // Other single letters - dimmed
                {
                    token: "text",
                    regex: "[A-Za-z]"
                },
                // Whitespace
                {
                    token: "text",
                    regex: "\\s+"
                }
            ]
        };
    };

    oop.inherits(GcodeEnhancedHighlightRules, TextHighlightRules);
    exports.GcodeEnhancedHighlightRules = GcodeEnhancedHighlightRules;
});

ace.define("ace/mode/gcode-enhanced", ["require", "exports", "module", "ace/lib/oop", "ace/mode/text", "ace/mode/gcode_enhanced_highlight_rules"], function(require, exports, module) {
    "use strict";

    var oop = require("../lib/oop");
    var TextMode = require("./text").Mode;
    var GcodeEnhancedHighlightRules = require("./gcode_enhanced_highlight_rules").GcodeEnhancedHighlightRules;

    var Mode = function() {
        this.HighlightRules = GcodeEnhancedHighlightRules;
        this.$behaviour = this.$defaultBehaviour;
    };

    oop.inherits(Mode, TextMode);

    (function() {
        this.$id = "ace/mode/gcode-enhanced";
    }).call(Mode.prototype);

    exports.Mode = Mode;
});

(function() {
    ace.require(["ace/mode/gcode-enhanced"], function(m) {
        if (typeof module == "object" && typeof exports == "object" && module) {
            module.exports = m;
        }
    });
})();
