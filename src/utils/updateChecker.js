/**
 * Update Checker for Grove Extension
 * Checks GitHub releases for new versions and notifies users
 *
 * NOTE: This only runs for sideloaded installs (not Chrome Web Store).
 * Store installs are auto-updated by Chrome.
 *
 * Compares full release tags (e.g., "grove-extension-v1.0.5-abc123") so that
 * any new build triggers a notification, even without version bumps.
 */

const UpdateChecker = (() => {
  // Configuration
  const GITHUB_RELEASES_API = 'https://api.github.com/repos/buildwithgrove/grove-releases/releases/latest';
  const RELEASES_PAGE_URL = 'https://github.com/buildwithgrove/grove-releases/releases/latest';
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
  const STORAGE_KEYS = {
    LAST_CHECK: 'GROVE_UPDATE_LAST_CHECK',
    LATEST_TAG: 'GROVE_UPDATE_LATEST_TAG',
    DISMISSED_TAG: 'GROVE_UPDATE_DISMISSED_TAG',
    DOWNLOAD_URL: 'GROVE_UPDATE_DOWNLOAD_URL',
    INSTALLED_TAG: 'GROVE_UPDATE_INSTALLED_TAG',
  };

  /**
   * Check if extension was installed from Chrome Web Store
   * Store installs have update_url injected by Chrome
   * @returns {boolean}
   */
  function isStoreInstall() {
    const manifest = chrome.runtime.getManifest();
    // Chrome Web Store injects update_url for store installs
    // Sideloaded extensions don't have this unless manually added
    return !!manifest.update_url;
  }

  /**
   * Get the current extension version from manifest
   * @returns {string}
   */
  function getCurrentVersion() {
    return chrome.runtime.getManifest().version;
  }

  /**
   * Parse display version from release tag
   * "grove-extension-v1.0.5-abc123" → "v1.0.5-abc123"
   * @param {string} tag - Release tag name
   * @returns {string} - Display version string
   */
  function parseDisplayVersion(tag) {
    // Remove "grove-extension-" prefix if present
    return tag.replace(/^grove-extension-/, '');
  }

  /**
   * Extract base version from release tag
   * "grove-extension-v1.0.6" → "1.0.6"
   * "grove-extension-v1.0.6.1" → "1.0.6"
   * @param {string} tag - Release tag name
   * @returns {string} - Base semver version (major.minor.patch)
   */
  function parseBaseVersion(tag) {
    // Extract version: grove-extension-v1.0.6 or grove-extension-v1.0.6.1
    const match = tag.match(/grove-extension-v(\d+\.\d+\.\d+)/);
    return match ? match[1] : '';
  }

  /**
   * Check if manifest version matches the release's base version
   * This prevents false update notifications for dev installs
   * @param {string} releaseTag - The release tag to check
   * @returns {boolean} - True if versions match
   */
  function manifestMatchesRelease(releaseTag) {
    const manifestVersion = getCurrentVersion();
    const releaseBaseVersion = parseBaseVersion(releaseTag);
    return manifestVersion === releaseBaseVersion;
  }

  /**
   * Fetch the latest release from GitHub
   * @returns {Promise<{tag: string, displayVersion: string, downloadUrl: string, releaseUrl: string, releaseName: string} | null>}
   */
  async function fetchLatestRelease() {
    try {
      const response = await fetch(GITHUB_RELEASES_API, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        console.warn('[Grove Update] Failed to fetch releases:', response.status);
        return null;
      }

      const release = await response.json();
      const tag = release.tag_name;
      const displayVersion = parseDisplayVersion(tag);

      // Find the .zip asset for Chrome
      const asset = release.assets?.find(a => a.name.endsWith('.zip'));

      return {
        tag,
        displayVersion,
        downloadUrl: asset?.browser_download_url || release.html_url,
        releaseUrl: release.html_url,
        releaseName: release.name || displayVersion,
      };
    } catch (error) {
      console.error('[Grove Update] Error fetching releases:', error);
      return null;
    }
  }

  /**
   * Get the installed release tag (set during installation)
   * @returns {Promise<string|null>}
   */
  async function getInstalledTag() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.INSTALLED_TAG]);
    return result[STORAGE_KEYS.INSTALLED_TAG] || null;
  }

  /**
   * Set the installed release tag (call this after user updates)
   * @param {string} tag - The release tag that was installed
   */
  async function setInstalledTag(tag) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.INSTALLED_TAG]: tag,
    });
  }

  /**
   * Check if an update is available
   * Compares full release tags, not just semver versions
   * @param {boolean} force - Force check even if recently checked
   * @returns {Promise<{available: boolean, tag?: string, displayVersion?: string, downloadUrl?: string, releaseUrl?: string}>}
   */
  async function checkForUpdate(force = false) {
    // Skip update checks for Chrome Web Store installs
    if (isStoreInstall()) {
      return { available: false, isStoreInstall: true };
    }

    const storage = await chrome.storage.local.get([
      STORAGE_KEYS.LAST_CHECK,
      STORAGE_KEYS.LATEST_TAG,
      STORAGE_KEYS.DISMISSED_TAG,
      STORAGE_KEYS.DOWNLOAD_URL,
      STORAGE_KEYS.INSTALLED_TAG,
    ]);

    const now = Date.now();
    const lastCheck = storage[STORAGE_KEYS.LAST_CHECK] || 0;
    const installedTag = storage[STORAGE_KEYS.INSTALLED_TAG];
    const dismissedTag = storage[STORAGE_KEYS.DISMISSED_TAG];

    // Return cached result if checked recently (unless forced)
    if (!force && (now - lastCheck) < CHECK_INTERVAL_MS) {
      const cachedTag = storage[STORAGE_KEYS.LATEST_TAG];

      if (cachedTag) {
        const isNew = cachedTag !== installedTag && !manifestMatchesRelease(cachedTag);
        const isDismissed = cachedTag === dismissedTag;

        return {
          available: isNew && !isDismissed,
          tag: cachedTag,
          displayVersion: parseDisplayVersion(cachedTag),
          downloadUrl: storage[STORAGE_KEYS.DOWNLOAD_URL],
          releaseUrl: RELEASES_PAGE_URL,
        };
      }
    }

    // Fetch fresh release info
    const release = await fetchLatestRelease();

    if (!release) {
      return { available: false };
    }

    // Store the result
    await chrome.storage.local.set({
      [STORAGE_KEYS.LAST_CHECK]: now,
      [STORAGE_KEYS.LATEST_TAG]: release.tag,
      [STORAGE_KEYS.DOWNLOAD_URL]: release.downloadUrl,
    });

    const isNew = release.tag !== installedTag && !manifestMatchesRelease(release.tag);
    const isDismissed = release.tag === dismissedTag;

    return {
      available: isNew && !isDismissed,
      tag: release.tag,
      displayVersion: release.displayVersion,
      downloadUrl: release.downloadUrl,
      releaseUrl: release.releaseUrl,
      releaseName: release.releaseName,
    };
  }

  /**
   * Dismiss the update notification for a specific release tag
   * @param {string} tag - Release tag to dismiss
   */
  async function dismissUpdate(tag) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.DISMISSED_TAG]: tag,
    });
  }

  /**
   * Clear dismissed tag (for testing)
   */
  async function clearDismissed() {
    await chrome.storage.local.remove(STORAGE_KEYS.DISMISSED_TAG);
  }

  /**
   * Get the releases page URL
   * @returns {string}
   */
  function getReleasesPageUrl() {
    return RELEASES_PAGE_URL;
  }

  return {
    isStoreInstall,
    getCurrentVersion,
    getInstalledTag,
    setInstalledTag,
    checkForUpdate,
    dismissUpdate,
    clearDismissed,
    getReleasesPageUrl,
    STORAGE_KEYS,
  };
})();

// Export for use in popup.js and background.js
if (typeof window !== 'undefined') {
  window.UpdateChecker = UpdateChecker;
}
