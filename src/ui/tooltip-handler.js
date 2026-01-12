// Tooltip Hover Handler
// Positions tooltips using JavaScript for better overflow handling

class TooltipHandler {
    constructor() {
        this.init();
    }

    init() {
        // Position tooltip on hover
        document.addEventListener('mouseover', (e) => {
            const helpIcon = e.target.closest('.help-icon');
            if (helpIcon) {
                this.positionTooltip(helpIcon);
            }
        });

        // Reposition on window resize
        window.addEventListener('resize', () => {
            this.updateAllTooltipPositions();
        });

        // Reposition on scroll
        document.addEventListener('scroll', () => {
            this.updateAllTooltipPositions();
        }, true);
    }

    positionTooltip(helpIcon) {
        const rect = helpIcon.getBoundingClientRect();

        // Position tooltip above the icon
        const top = rect.top - 8;
        const left = rect.left + (rect.width / 2);

        // Set CSS custom properties for positioning
        helpIcon.style.setProperty('--tooltip-top', `${top}px`);
        helpIcon.style.setProperty('--tooltip-left', `${left}px`);

        // Position arrow
        helpIcon.style.setProperty('--arrow-top', `${top + 6}px`);
        helpIcon.style.setProperty('--arrow-left', `${left}px`);
    }

    updateAllTooltipPositions() {
        document.querySelectorAll('.help-icon:hover').forEach(icon => {
            this.positionTooltip(icon);
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.tooltipHandler = new TooltipHandler();
    });
} else {
    window.tooltipHandler = new TooltipHandler();
}
