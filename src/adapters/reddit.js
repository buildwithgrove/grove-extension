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
   * Places button in the right sidebar next to username
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

    // Check if button already exists
    if (document.querySelector('#grove-tip-button')) {
      console.log('[RedditAdapter] Button already exists');
      return null;
    }

    // Strategy 1: Find the main profile header/banner area
    const profileBanner = document.querySelector('[style*="banner"]') ||
                         document.querySelector('[class*="banner"]') ||
                         document.querySelector('div[style*="height: 94px"]') ||
                         document.querySelector('div[style*="height: 128px"]');

    if (profileBanner) {
      console.log('[RedditAdapter] Found profile banner area');

      // Create container positioned in top right
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 10;
      `;

      // Make parent relative if needed
      const parent = profileBanner.parentElement || profileBanner;
      const currentPosition = window.getComputedStyle(parent).position;
      if (currentPosition === 'static') {
        parent.style.position = 'relative';
      }

      parent.appendChild(buttonContainer);
      return buttonContainer;
    }

    // Strategy 2: Look for the profile header with avatar
    const avatar = document.querySelector('img[alt*="Avatar"]') ||
                  document.querySelector('[data-testid="profile-avatar"]') ||
                  document.querySelector('img[src*="avatar"]');

    if (avatar) {
      const profileHeader = avatar.closest('div').parentElement;

      if (profileHeader) {
        console.log('[RedditAdapter] Found profile header via avatar');

        // Create container for top right placement
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
        `;

        // Make sure parent is positioned
        const style = window.getComputedStyle(profileHeader);
        if (style.position === 'static') {
          profileHeader.style.position = 'relative';
        }

        profileHeader.appendChild(buttonContainer);
        return buttonContainer;
      }
    }

    // Strategy 3: Find the main content area and place at top
    const mainContent = document.querySelector('main') ||
                       document.querySelector('[role="main"]') ||
                       document.querySelector('#main-content');

    if (mainContent) {
      console.log('[RedditAdapter] Using main content area');

      // Find the first major section
      const firstSection = mainContent.querySelector('div > div') || mainContent.firstElementChild;

      if (firstSection) {
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 10;
        `;

        // Position the parent
        if (window.getComputedStyle(firstSection).position === 'static') {
          firstSection.style.position = 'relative';
        }

        firstSection.appendChild(buttonContainer);
        return buttonContainer;
      }
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
    console.log('[RedditAdapter] Waiting for profile to load...');

    // Wait for hover card
    const hoverCard = await this.waitForElement('[data-testid="user-hover-card"]', 2000);
    if (hoverCard) {
      console.log('[RedditAdapter] Found hover card');
      return true;
    }

    // Wait for any h1 element (usually contains username)
    const h1Element = await this.waitForElement('h1', 3000);
    if (h1Element) {
      console.log('[RedditAdapter] Found h1 element:', h1Element.textContent);
      return true;
    }

    // Wait for profile description
    const profileDescription = await this.waitForElement('[data-testid="profile-description"]', 2000);
    if (profileDescription) {
      console.log('[RedditAdapter] Found profile description');
      return true;
    }

    // Fallback to profile bio
    const profileBio = await this.waitForElement('[data-testid="profile-bio"]', 2000);
    if (profileBio) {
      console.log('[RedditAdapter] Found profile bio');
      return true;
    }

    console.log('[RedditAdapter] Profile load timeout - proceeding anyway');
    return true; // Try to proceed anyway
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.RedditAdapter = RedditAdapter;
}
