// Collapsible Groups Manager
// Handles expand/collapse functionality with localStorage persistence

class CollapsibleGroups {
    constructor() {
        this.storageKey = 'collapsibleGroupsState';
        this.groups = new Map();
        this.init();
    }

    init() {
        // Load saved state from localStorage
        this.loadState();

        // Initialize all collapsible groups
        document.querySelectorAll('.collapsible-group').forEach(group => {
            this.initGroup(group);
        });

        // Setup event listeners
        this.setupEventListeners();
    }

    initGroup(groupElement) {
        const header = groupElement.querySelector('.collapsible-header');
        const content = groupElement.querySelector('.collapsible-content');

        if (!header || !content) return;

        const groupId = content.id || this.generateId(header.textContent);
        content.id = groupId;

        // Set initial state from localStorage or default to collapsed
        const savedState = this.groups.get(groupId);
        const isExpanded = savedState !== undefined ? savedState : false;

        this.setGroupState(groupElement, isExpanded);

        // Store reference
        this.groups.set(groupId, isExpanded);
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const header = e.target.closest('.collapsible-header');
            if (!header) return;

            const group = header.closest('.collapsible-group');
            if (!group) return;

            this.toggleGroup(group);
        });

        // Add keyboard support (Enter/Space to toggle)
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter' && e.key !== ' ') return;

            const header = e.target.closest('.collapsible-header');
            if (!header) return;

            e.preventDefault();
            const group = header.closest('.collapsible-group');
            if (group) this.toggleGroup(group);
        });
    }

    toggleGroup(groupElement) {
        const content = groupElement.querySelector('.collapsible-content');
        if (!content) return;

        const groupId = content.id;
        const currentState = this.groups.get(groupId);
        const newState = !currentState;

        this.setGroupState(groupElement, newState);
        this.groups.set(groupId, newState);
        this.saveState();
    }

    setGroupState(groupElement, isExpanded) {
        const content = groupElement.querySelector('.collapsible-content');

        groupElement.dataset.expanded = isExpanded;
        content.dataset.expanded = isExpanded;

        // Update ARIA attributes for accessibility
        const header = groupElement.querySelector('.collapsible-header');
        if (header) {
            header.setAttribute('aria-expanded', isExpanded);
            header.setAttribute('role', 'button');
            header.setAttribute('tabindex', '0');
        }

        if (content) {
            content.setAttribute('aria-hidden', !isExpanded);
        }
    }

    expandAll() {
        document.querySelectorAll('.collapsible-group').forEach(group => {
            const content = group.querySelector('.collapsible-content');
            if (content) {
                this.setGroupState(group, true);
                this.groups.set(content.id, true);
            }
        });
        this.saveState();
    }

    collapseAll() {
        document.querySelectorAll('.collapsible-group').forEach(group => {
            const content = group.querySelector('.collapsible-content');
            if (content) {
                this.setGroupState(group, false);
                this.groups.set(content.id, false);
            }
        });
        this.saveState();
    }

    saveState() {
        const state = {};
        this.groups.forEach((isExpanded, groupId) => {
            state[groupId] = isExpanded;
        });
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    }

    loadState() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const state = JSON.parse(saved);
                Object.entries(state).forEach(([groupId, isExpanded]) => {
                    this.groups.set(groupId, isExpanded);
                });
            }
        } catch (error) {
            console.warn('Failed to load collapsible groups state:', error);
        }
    }

    generateId(text) {
        return text.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.collapsibleGroups = new CollapsibleGroups();
    });
} else {
    window.collapsibleGroups = new CollapsibleGroups();
}
