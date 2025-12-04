/**
 * Twitter Adapter
 * Handles Twitter/X profile pages and tweets
 */

class TwitterAdapter extends BaseAdapter {
  /**
   * Check if current page is a Twitter profile page
   * @returns {boolean}
   */
  detectProfilePage() {
    try {
      const url = new URL(window.location.href);
      const segments = url.pathname.split('/').filter(Boolean); // e.g., ['olshansky', 'likes']

      // Must have at least the username
      if (segments.length === 0) return false;

      const username = segments[0];

      // Non-profile top-level routes (system pages, not user profiles)
      const systemRoutes = [
        'home', 'i', 'intent', 'search', 'explore', 'settings',
        'messages', 'notifications', 'compose', 'login', 'signup'
      ];
      if (systemRoutes.includes(username.toLowerCase())) return false;

      // Profile subpages like /user/likes, /user/media are still profile pages.
      // Only /user/status/* are individual tweet pages (not profiles).
      const subpage = segments[1];
      const tweetPagePrefixes = ['status', 'statuses'];
      if (subpage && tweetPagePrefixes.some(prefix => subpage.toLowerCase().startsWith(prefix))) {
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Grove Extension] detectProfilePage failed:', err);
      return false;
    }
  }

  /**
   * Check if we're on a page that could show tweets (timeline, profile, search, etc.)
   * @returns {boolean}
   */
  detectTweetPage() {
    const hostname = window.location.hostname;
    return hostname.includes('twitter.com') || hostname.includes('x.com');
  }

  /**
   * Find all tweet articles on the page
   * @returns {NodeList}
   */
  findTweets() {
    return document.querySelectorAll('article[data-testid="tweet"]');
  }

  /**
   * Extract author info from a tweet element
   * @param {Element} tweetElement - The tweet article element
   * @returns {{username: string|null, displayName: string|null, profileUrl: string|null}}
   */
  extractTweetAuthor(tweetElement) {
    // Find the user name link in the tweet
    const userNameLink = tweetElement.querySelector('a[href^="/"][role="link"] div[dir="ltr"] > span');
    const displayName = userNameLink ? userNameLink.textContent : null;

    // Find the @username link
    const usernameLinks = tweetElement.querySelectorAll('a[href^="/"][role="link"]');
    let username = null;
    let profileUrl = null;

    for (const link of usernameLinks) {
      const href = link.getAttribute('href');
      // Match /@username or /username pattern (not /status, /hashtag, etc.)
      if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
        username = href.slice(1); // Remove leading /
        profileUrl = `https://x.com${href}`;
        break;
      }
    }

    return { username, displayName, profileUrl };
  }

  /**
   * Get the action bar element from a tweet (where like, retweet, reply buttons are)
   * @param {Element} tweetElement - The tweet article element
   * @returns {Element|null}
   */
  getTweetActionBar(tweetElement) {
    // The action bar has role="group" and contains the interaction buttons
    return tweetElement.querySelector('[role="group"]');
  }

  /**
   * Get the tweet URL from a tweet element
   * @param {Element} tweetElement - The tweet article element
   * @returns {string|null}
   */
  getTweetUrl(tweetElement) {
    // Find the timestamp link which contains the tweet URL
    const timeLink = tweetElement.querySelector('a[href*="/status/"] time');
    if (timeLink && timeLink.parentElement) {
      const href = timeLink.parentElement.getAttribute('href');
      if (href) {
        return href.startsWith('/') ? `https://x.com${href}` : href;
      }
    }
    // Fallback: look for any link with /status/
    const statusLink = tweetElement.querySelector('a[href*="/status/"]');
    if (statusLink) {
      const href = statusLink.getAttribute('href');
      if (href) {
        return href.startsWith('/') ? `https://x.com${href}` : href;
      }
    }
    return null;
  }

  /**
   * Get the timestamp/date element from a tweet
   * @param {Element} tweetElement - The tweet article element
   * @returns {Element|null}
   */
  getTweetDateElement(tweetElement) {
    // The date is inside a time element within a link
    const timeElement = tweetElement.querySelector('a[href*="/status/"] time');
    if (timeElement && timeElement.parentElement) {
      return timeElement.parentElement;
    }
    return null;
  }

  /**
   * Extract display name from Twitter profile
   * @returns {string|null}
   */
  extractDisplayName() {
    // Twitter display name is in a span with data-testid="UserName"
    // The actual name is in the first nested span
    const userNameContainer = document.querySelector('[data-testid="UserName"]');
    if (userNameContainer) {
      // Get the first span which contains the display name
      const nameSpan = userNameContainer.querySelector('span span');
      return nameSpan ? nameSpan.textContent : null;
    }
    return null;
  }

  /**
   * Extract bio from Twitter profile
   * @returns {string|null}
   */
  extractBio() {
    // Twitter profile bio is in a div with data-testid="UserDescription"
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    const bio = bioElement ? bioElement.textContent : '';

    // Also include display name (users often put .eth there)
    const displayName = this.extractDisplayName() || '';

    // Combine display name and bio for address detection
    return [displayName, bio].filter(Boolean).join(' ') || null;
  }

  /**
   * Get placement for tip button (near username in header)
   * @returns {Element|null}
   */
  getButtonPlacement() {
    // Look for the profile header actions area
    // data-testid="userActions" is the "More" button - we want its parent container
    const userActionsButton = document.querySelector('[data-testid="userActions"]');
    if (userActionsButton && userActionsButton.parentElement) {
      return userActionsButton.parentElement;
    }

    // On your own profile, look for the area with "Edit profile" button
    const editProfileButton = document.querySelector('[data-testid="editProfileButton"]');
    if (editProfileButton && editProfileButton.parentElement) {
      return editProfileButton.parentElement;
    }

    // Another fallback: look for Following/Follow button and get its parent
    const followButton = document.querySelector('[data-testid*="follow"]');
    if (followButton && followButton.parentElement) {
      return followButton.parentElement;
    }

    return null;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'twitter';
  }

  /**
   * Wait for profile to fully load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    // Wait for username to appear (indicates profile is loaded)
    // Use UserName instead of UserDescription since not all profiles have bios
    const userNameElement = await this.waitForElement('[data-testid="UserName"]', 8000);
    return userNameElement !== null;
  }
}

if (typeof window !== 'undefined') {
  window.TwitterAdapter = TwitterAdapter;
}
