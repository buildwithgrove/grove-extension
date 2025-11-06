/**
 * Reddit Adapter
 * Handles Reddit profile pages and hover cards
 */

class RedditAdapter extends BaseAdapter {
  /**
   * Check if current page is a Reddit profile page or has hover cards
   * @returns {boolean}
   */
  detectProfilePage() {
    const url = window.location.href;
    // Match reddit.com/user/username or reddit.com/u/username
    return /^https:\/\/(www\.)?reddit\.com\/(user|u)\/[^\/]+\/?$/.test(url);
  }

  /**
   * Extract bio from Reddit profile
   * Looks in both hover cards and full profile pages
   * @returns {string|null}
   */
  extractBio() {
    // Try to find bio in hover card first
    const hoverCard = document.querySelector('[data-testid="user-hover-card"]');
    if (hoverCard) {
      // Bio is in a span element with whitespace-normal class
      const bioSpan = hoverCard.querySelector('.whitespace-normal');
      if (bioSpan) {
        return bioSpan.textContent;
      }
    }

    // Look for bio on full profile page using data-testid
    const profileDescription = document.querySelector('[data-testid="profile-description"]');
    if (profileDescription) {
      return profileDescription.textContent;
    }

    // Fallback: look for bio on full profile page (legacy selector)
    const profileBio = document.querySelector('[data-testid="profile-bio"]');
    if (profileBio) {
      return profileBio.textContent;
    }

    return null;
  }

  /**
   * Get placement for tip button
   * Places button in the hover card karma section or full profile page
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Look for the hover card
    const hoverCard = document.querySelector('[data-testid="user-hover-card"]');
    if (hoverCard) {
      // Find the karma stats container (flex-row with post/comment karma)
      const karmaContainer = hoverCard.querySelector('.flex.flex-row.mt-md.text-neutral-content');
      if (karmaContainer) {
        console.log('[RedditAdapter] Found karma container for button placement');
        return karmaContainer;
      }
    }

    // Look on full profile page - find the div with class "p-md" containing profile info
    // This is the section that has the username, share button, followers, etc.
    const profileSection = document.querySelector('div.p-md');
    if (profileSection) {
      // Find the div that contains the "Share" button
      const shareButtonContainer = profileSection.querySelector('.flex.items-center.gap-xs');
      if (shareButtonContainer) {
        console.log('[RedditAdapter] Found share button container for button placement');
        return shareButtonContainer;
      }
    }

    // Fallback: look for profile actions area (legacy selector)
    const profileActions = document.querySelector('[data-testid="profile-actions"]');
    if (profileActions) {
      console.log('[RedditAdapter] Found profile actions for button placement');
      return profileActions;
    }

    console.log('[RedditAdapter] No suitable container found');
    return null;
  }

  /**
   * Get Reddit username from URL
   * @returns {string|null}
   */
  getUserIdentifier() {
    const match = window.location.pathname.match(/\/(user|u)\/([^\/]+)/);
    return match ? match[2] : null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'reddit';
  }

  /**
   * Wait for profile to fully load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // Wait for hover card or profile page to appear
    const hoverCard = await this.waitForElement('[data-testid="user-hover-card"]', 3000);
    if (hoverCard) {
      return true;
    }

    // Wait for full profile page - look for profile description
    const profileDescription = await this.waitForElement('[data-testid="profile-description"]', 5000);
    if (profileDescription) {
      return true;
    }

    // Fallback to legacy profile page selector
    const profileBio = await this.waitForElement('[data-testid="profile-bio"]', 5000);
    return profileBio !== null;
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.RedditAdapter = RedditAdapter;
}
