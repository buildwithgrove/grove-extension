/**
 * GitHub Adapter
 * Handles GitHub profile pages
 *
 * TODO: Implement GitHub profile detection and address extraction
 */

class GitHubAdapter extends BaseAdapter {
  /**
   * Check if current page is a GitHub profile page
   * @returns {boolean}
   */
  detectProfilePage() {
    // TODO: Implement GitHub profile page detection
    // Example: Match github.com/username (not repos, issues, etc.)
    return false;
  }

  /**
   * Extract bio from GitHub profile
   * @returns {string|null}
   */
  extractBio() {
    // TODO: Implement bio extraction from GitHub profile
    // Look for the bio section in the profile sidebar
    return null;
  }

  /**
   * Get placement for tip button
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // TODO: Determine best placement on GitHub profile
    // Possibly near the "Follow" button or in the profile header
    return null;
  }

  /**
   * Get GitHub username
   * @returns {string|null}
   */
  getUserIdentifier() {
    // TODO: Extract username from URL or page content
    return null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'github';
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.GitHubAdapter = GitHubAdapter;
}
