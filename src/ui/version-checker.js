/**
 * Version Checker Module
 * Checks for updates via GitHub Releases API
 */

const VersionChecker = (function() {
    const CURRENT_VERSION = '1.5.0';
    const GITHUB_REPO = 'dmquinny/Halftone2Gcode';
    const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // Check once per day
    const STORAGE_KEY = 'lastVersionCheck';
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
     * Check if we should check for updates (based on time interval)
     */
    function shouldCheckForUpdates() {
        try {
            const lastCheck = localStorage.getItem(STORAGE_KEY);
            if (!lastCheck) return true;

            const lastCheckTime = parseInt(lastCheck, 10);
            return Date.now() - lastCheckTime > CHECK_INTERVAL;
        } catch (e) {
            return true;
        }
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
     * Update the last check timestamp
     */
    function updateLastCheckTime() {
        try {
            localStorage.setItem(STORAGE_KEY, Date.now().toString());
        } catch (e) {
            // Ignore storage errors
        }
    }

    /**
     * Show the update notification banner
     */
    function showUpdateBanner(latestVersion, releaseUrl, releaseNotes) {
        const banner = document.getElementById('updateBanner');
        if (!banner) return;

        const versionSpan = document.getElementById('latestVersionNumber');
        const notesDiv = document.getElementById('releaseNotes');
        const downloadLink = document.getElementById('downloadUpdateLink');

        if (versionSpan) {
            versionSpan.textContent = latestVersion;
        }

        if (notesDiv && releaseNotes) {
            // Show first 200 chars of release notes
            const truncatedNotes = releaseNotes.length > 200
                ? releaseNotes.substring(0, 200) + '...'
                : releaseNotes;
            notesDiv.textContent = truncatedNotes;
            notesDiv.style.display = 'block';
        }

        if (downloadLink) {
            downloadLink.href = releaseUrl;
        }

        banner.style.display = 'flex';

        // Setup dismiss button
        const dismissBtn = document.getElementById('dismissUpdateBtn');
        if (dismissBtn) {
            dismissBtn.onclick = function() {
                banner.style.display = 'none';
                dismissVersion(latestVersion);
            };
        }
    }

    /**
     * Fetch latest release from GitHub
     */
    async function checkForUpdates(force = false) {
        // Skip check if not enough time has passed (unless forced)
        if (!force && !shouldCheckForUpdates()) {
            return null;
        }

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
            updateLastCheckTime();

            const latestVersion = release.tag_name.replace(/^v/, '');

            // Check if update is available
            if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                // Check if user dismissed this version
                if (!isVersionDismissed(latestVersion)) {
                    showUpdateBanner(
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

    // Public API
    return {
        checkForUpdates,
        getCurrentVersion,
        getReleasesUrl,
        compareVersions
    };
})();

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.VersionChecker = VersionChecker;
}
