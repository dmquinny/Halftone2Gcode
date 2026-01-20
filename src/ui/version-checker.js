/**
 * Version Checker Module
 * Checks for updates via GitHub Releases API
 */

const VersionChecker = (function() {
    const CURRENT_VERSION = '1.6.2';
    const GITHUB_REPO = 'dmquinny/Halftone2Gcode';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
    const DISMISSED_VERSION_KEY = 'dismissedVersion';

    /**
     * Compare two semantic version strings
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    function compareVersions(v1, v2) {
        const parts1 = v1.replace(/^v/, '').split('.').map(Number);
        const parts2 = v2.replace(/^v/, '').split('.').map(Number);

        for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }

    /**
     * Check if user dismissed this specific version
     */
    function isVersionDismissed(version) {
        try {
            const dismissed = localStorage.getItem(DISMISSED_VERSION_KEY);
            return dismissed === version;
        } catch (e) {
            return false;
        }
    }

    /**
     * Dismiss the update notification for a specific version
     */
    function dismissVersion(version) {
        try {
            localStorage.setItem(DISMISSED_VERSION_KEY, version);
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Show the update dialog
     */
    function showUpdateDialog(latestVersion, releaseUrl, releaseNotes) {
        // Remove existing dialog if present
        const existingDialog = document.getElementById('updateDialog');
        if (existingDialog) {
            existingDialog.remove();
        }

        // Parse release notes - extract just the key points
        let formattedNotes = '';
        if (releaseNotes) {
            // Extract bullet points or first few lines
            const lines = releaseNotes.split('\n').filter(line => line.trim());
            const bulletPoints = lines.filter(line =>
                line.trim().startsWith('-') ||
                line.trim().startsWith('*') ||
                line.trim().startsWith('•')
            ).slice(0, 5);

            if (bulletPoints.length > 0) {
                formattedNotes = bulletPoints.map(line =>
                    `<div style="margin: 4px 0; padding-left: 10px;">${line.trim()}</div>`
                ).join('');
            } else {
                // Just show first 300 chars
                const truncated = releaseNotes.substring(0, 300);
                formattedNotes = `<div style="white-space: pre-wrap;">${truncated}${releaseNotes.length > 300 ? '...' : ''}</div>`;
            }
        }

        // Create dialog HTML
        const dialogHTML = `
            <div id="updateDialog" style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.6);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
            ">
                <div style="
                    background: #2d2d2d;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
                    max-width: 450px;
                    width: 90%;
                    overflow: hidden;
                ">
                    <!-- Header -->
                    <div style="
                        background: linear-gradient(135deg, #1e5799 0%, #2989d8 100%);
                        padding: 20px;
                        text-align: center;
                    ">
                        <div style="font-size: 2em; margin-bottom: 8px;">&#x2B06;</div>
                        <h2 style="margin: 0; color: white; font-size: 1.3em;">Update Available</h2>
                    </div>

                    <!-- Content -->
                    <div style="padding: 20px;">
                        <div style="text-align: center; margin-bottom: 15px;">
                            <span style="color: #999;">Current: v${CURRENT_VERSION}</span>
                            <span style="color: #666; margin: 0 10px;">→</span>
                            <span style="color: #7fdbff; font-weight: bold;">New: v${latestVersion}</span>
                        </div>

                        ${formattedNotes ? `
                            <div style="
                                background: #1e1e1e;
                                border-radius: 4px;
                                padding: 12px;
                                margin-bottom: 15px;
                                max-height: 150px;
                                overflow-y: auto;
                                font-size: 0.9em;
                                color: #ccc;
                            ">
                                <div style="color: #999; font-size: 0.85em; margin-bottom: 8px;">What's New:</div>
                                ${formattedNotes}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Buttons -->
                    <div style="
                        padding: 15px 20px;
                        background: #252525;
                        display: flex;
                        gap: 10px;
                        justify-content: flex-end;
                    ">
                        <button id="updateDialogSkip" style="
                            padding: 10px 20px;
                            background: transparent;
                            border: 1px solid #555;
                            color: #999;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.95em;
                        ">Skip This Version</button>
                        <button id="updateDialogLater" style="
                            padding: 10px 20px;
                            background: #444;
                            border: none;
                            color: white;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.95em;
                        ">Remind Me Later</button>
                        <button id="updateDialogDownload" style="
                            padding: 10px 20px;
                            background: #2989d8;
                            border: none;
                            color: white;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 0.95em;
                            font-weight: bold;
                        ">View Release</button>
                    </div>
                </div>
            </div>
        `;

        // Add dialog to page
        document.body.insertAdjacentHTML('beforeend', dialogHTML);

        // Setup button handlers using addEventListener (CSP compliant)
        const dialog = document.getElementById('updateDialog');
        const skipBtn = document.getElementById('updateDialogSkip');
        const laterBtn = document.getElementById('updateDialogLater');
        const downloadBtn = document.getElementById('updateDialogDownload');

        skipBtn.addEventListener('click', function() {
            dismissVersion(latestVersion);
            dialog.remove();
        });

        laterBtn.addEventListener('click', function() {
            dialog.remove();
        });

        downloadBtn.addEventListener('click', async function() {
            // Try Tauri shell API first, fall back to window.open
            try {
                if (window.__TAURI__) {
                    // Tauri v2 uses invoke with plugin:shell|open
                    const { invoke } = window.__TAURI__.core || window.__TAURI__;
                    if (invoke) {
                        await invoke('plugin:shell|open', { path: releaseUrl });
                    } else {
                        window.open(releaseUrl, '_blank');
                    }
                } else {
                    window.open(releaseUrl, '_blank');
                }
            } catch (e) {
                console.error('Failed to open URL:', e);
                // Fallback: try window.open anyway
                window.open(releaseUrl, '_blank');
            }
            dialog.remove();
        });

        // Close on background click
        dialog.addEventListener('click', function(e) {
            if (e.target === dialog) {
                dialog.remove();
            }
        });

        // Close on Escape key
        function handleEscape(e) {
            if (e.key === 'Escape') {
                dialog.remove();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);
    }

    /**
     * Fetch latest release from GitHub - checks every time app opens
     */
    async function checkForUpdates() {
        try {
            const response = await fetch(GITHUB_API_URL, {
                headers: {
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                console.log('Version check: GitHub API returned', response.status);
                return null;
            }

            const release = await response.json();
            const latestVersion = release.tag_name.replace(/^v/, '');

            // Check if update is available
            if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                // Check if user dismissed this version
                if (!isVersionDismissed(latestVersion)) {
                    showUpdateDialog(
                        latestVersion,
                        release.html_url,
                        release.body
                    );
                    return {
                        version: latestVersion,
                        url: release.html_url,
                        notes: release.body
                    };
                }
            }

            return null;
        } catch (error) {
            console.log('Version check failed:', error.message);
            return null;
        }
    }

    /**
     * Get current version
     */
    function getCurrentVersion() {
        return CURRENT_VERSION;
    }

    /**
     * Get releases page URL
     */
    function getReleasesUrl() {
        return RELEASES_URL;
    }

    /**
     * Force show the update dialog for testing
     */
    function testDialog() {
        showUpdateDialog(
            '99.0.0',
            RELEASES_URL,
            '- Test release notes\n- Feature 1\n- Feature 2\n- Bug fix'
        );
    }

    // Public API
    return {
        checkForUpdates,
        getCurrentVersion,
        getReleasesUrl,
        compareVersions,
        testDialog
    };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.VersionChecker = VersionChecker;
}
