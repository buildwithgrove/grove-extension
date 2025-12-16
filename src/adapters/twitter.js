/**
 * Twitter Adapter
 * Handles Twitter/X profile pages and tweets
 *
 * Requires: src/adapters/base.js (BaseAdapter)
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
   * Find all tweet articles on the page
   * @returns {NodeList}
   */
  findTweets() {
    return document.querySelectorAll('article[data-testid="tweet"]');
  }

  /**
   * Check if a tweet is a retweet
   * @param {Element} tweetElement - The tweet article element
   * @returns {boolean}
   */
  isRetweet(tweetElement) {
    // Retweets have a "retweeted" indicator with data-testid="socialContext"
    // The social context contains text like "Username retweeted"
    const socialContext = tweetElement.querySelector('[data-testid="socialContext"]');
    if (socialContext) {
      const text = socialContext.textContent?.toLowerCase() || '';
      // Check for retweet indicators in various languages
      if (text.includes('retweet') || text.includes('reposted')) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a tweet contains a quoted tweet
   * @param {Element} tweetElement - The tweet article element
   * @returns {boolean}
   */
  hasQuotedTweet(tweetElement) {
    // Quote tweets can have various structures - try multiple selectors
    // data-testid="quoteTweet" - standard quote tweet container
    // [data-testid="card.wrapper"] with a status link - embedded tweet card
    // role="link" div containing another tweet's status link
    const quotedTweet = this.getQuotedTweetElement(tweetElement);
    return !!quotedTweet;
  }

  /**
   * Extract author info from a tweet element
   * For retweets: returns the ORIGINAL author's info (the person being retweeted)
   * For quote tweets: returns the quoter's info (the person adding commentary)
   * For regular tweets: returns the author's info
   * @param {Element} tweetElement - The tweet article element
   * @returns {{username: string|null, displayName: string|null, profileUrl: string|null, isRetweet: boolean}}
   */
  extractTweetAuthor(tweetElement) {
    const isRT = this.isRetweet(tweetElement);

    // For all tweet types, extract the main visible author
    // - For retweets: this is the ORIGINAL author (the retweeted person)
    // - For quote tweets: this is the quoter
    // - For regular tweets: this is the author

    // First, try to find the author section using the avatar link
    // The avatar shows the main tweet author (for RTs, this is the original author)
    const avatarLink = tweetElement.querySelector('div[data-testid="Tweet-User-Avatar"] a[href^="/"]');
    let username = null;
    let profileUrl = null;

    if (avatarLink) {
      const href = avatarLink.getAttribute('href');
      if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
        username = href.slice(1);
        profileUrl = `https://x.com${href}`;
      }
    }

    // Find display name from the User-Name section
    let displayName = null;

    const userNameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
    if (userNameContainer) {
      // Get the first link which should be the display name
      const nameLink = userNameContainer.querySelector('a[href^="/"][role="link"]');
      if (nameLink) {
        // The display name is in a span inside
        const nameSpan = nameLink.querySelector('span span') || nameLink.querySelector('span');
        if (nameSpan) {
          displayName = nameSpan.textContent;
        }

        // Also verify/get username from this link if we didn't get it from avatar
        if (!username) {
          const href = nameLink.getAttribute('href');
          if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
            username = href.slice(1);
            profileUrl = `https://x.com${href}`;
          }
        }
      }
    }

    // Fallback: original method if the above didn't work
    if (!username) {
      const usernameLinks = tweetElement.querySelectorAll('a[href^="/"][role="link"]');
      for (const link of usernameLinks) {
        const href = link.getAttribute('href');
        if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
          username = href.slice(1);
          profileUrl = `https://x.com${href}`;
          break;
        }
      }
    }

    if (!displayName) {
      const userNameLink = tweetElement.querySelector('a[href^="/"][role="link"] div[dir="ltr"] > span');
      displayName = userNameLink ? userNameLink.textContent : null;
    }

    return { username, displayName, profileUrl, isRetweet: isRT };
  }

  /**
   * Extract the quoted tweet's author info from a quote tweet
   * @param {Element} tweetElement - The tweet article element
   * @returns {{username: string|null, displayName: string|null, profileUrl: string|null}|null}
   */
  extractQuotedTweetAuthor(tweetElement) {
    // Find the quoted tweet container using our robust getter
    const quotedTweet = this.getQuotedTweetElement(tweetElement);
    if (!quotedTweet) return null;

    let username = null;
    let displayName = null;
    let profileUrl = null;

    // Method 1: Extract username from UserAvatar-Container-{username} data-testid
    const avatarContainer = quotedTweet.querySelector('[data-testid^="UserAvatar-Container-"]');
    if (avatarContainer) {
      const testId = avatarContainer.getAttribute('data-testid');
      // Extract username from "UserAvatar-Container-jessepollak"
      const match = testId.match(/^UserAvatar-Container-(.+)$/);
      if (match) {
        username = match[1];
        profileUrl = `https://x.com/${username}`;
      }
    }

    // Method 2: Try to find User-Name container for display name
    const userNameContainer = quotedTweet.querySelector('[data-testid="User-Name"]');
    if (userNameContainer) {
      // The display name is in nested spans, find the innermost one with actual text
      const spans = userNameContainer.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim();
        // Skip @username spans and empty spans
        if (text && !text.startsWith('@') && text.length > 0 && text.length < 100) {
          // Check if this is likely a display name (not just punctuation)
          if (!/^[·•\s]+$/.test(text)) {
            displayName = text;
            break;
          }
        }
      }

      // Also try to get username from links if we don't have it yet
      if (!username) {
        const nameLink = userNameContainer.querySelector('a[href^="/"][role="link"]');
        if (nameLink) {
          const href = nameLink.getAttribute('href');
          if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
            username = href.slice(1);
            profileUrl = `https://x.com${href}`;
          }
        }
      }
    }

    // Method 3: Look for @username text
    if (!username) {
      const spans = quotedTweet.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim();
        if (text && text.startsWith('@')) {
          username = text.slice(1); // Remove @
          profileUrl = `https://x.com/${username}`;
          break;
        }
      }
    }

    // Method 4: Extract username from any status link
    if (!username) {
      const statusLink = quotedTweet.querySelector('a[href*="/status/"]');
      if (statusLink) {
        const href = statusLink.getAttribute('href');
        const match = href.match(/\/([a-zA-Z0-9_]+)\/status\//);
        if (match) {
          username = match[1];
          profileUrl = `https://x.com/${username}`;
        }
      }
    }

    // Method 5: Find display name from spans with .eth or address patterns
    if (!displayName && quotedTweet) {
      const spans = quotedTweet.querySelectorAll('span');
      for (const span of spans) {
        const text = span.textContent?.trim();
        if (text && (text.includes('.eth') || /0x[a-fA-F0-9]{40}/.test(text))) {
          if (text.length < 100) {
            displayName = text;
            break;
          }
        }
      }
    }

    if (!username) return null;

    return { username, displayName, profileUrl };
  }

  /**
   * Get the quoted tweet element within a quote tweet
   * @param {Element} tweetElement - The tweet article element
   * @returns {Element|null}
   */
  getQuotedTweetElement(tweetElement) {
    // Try multiple selectors for quoted tweet containers
    // X/Twitter uses different structures for quoted tweets

    // Standard quoted tweet with data-testid
    let quoted = tweetElement.querySelector('[data-testid="quoteTweet"]');
    if (quoted) return quoted;

    // Card wrapper that contains a status link (embedded tweet)
    const cardWrapper = tweetElement.querySelector('[data-testid="card.wrapper"]');
    if (cardWrapper && cardWrapper.querySelector('a[href*="/status/"]')) {
      return cardWrapper;
    }

    // Look for a second Tweet-User-Avatar (the first is the main tweet author)
    // Quoted tweets have their own avatar section
    const allAvatars = tweetElement.querySelectorAll('[data-testid="Tweet-User-Avatar"]');
    if (allAvatars.length > 1) {
      // The second avatar belongs to the quoted tweet
      // Walk up to find its container
      let container = allAvatars[1].parentElement;
      while (container && container !== tweetElement) {
        // Look for a container that has User-Name as well
        if (container.querySelector('[data-testid="User-Name"]') &&
            container.querySelector('[data-testid="Tweet-User-Avatar"]')) {
          return container;
        }
        container = container.parentElement;
      }
    }

    // Look for UserAvatar-Container that's not the main author
    // The main tweet's avatar container has the main author's username
    const mainAuthorAvatar = tweetElement.querySelector('[data-testid="Tweet-User-Avatar"]');
    const allUserAvatarContainers = tweetElement.querySelectorAll('[data-testid^="UserAvatar-Container-"]');

    if (allUserAvatarContainers.length > 1 && mainAuthorAvatar) {
      // Find which avatar container is NOT a descendant of the main avatar area
      for (const avatarContainer of allUserAvatarContainers) {
        if (!mainAuthorAvatar.contains(avatarContainer)) {
          // This is a quoted tweet's avatar - walk up to find container
          let container = avatarContainer.parentElement;
          let depth = 0;
          while (container && container !== tweetElement && depth < 15) {
            // A good container should have both avatar and user-name
            const hasUserName = container.querySelector('[data-testid="User-Name"]');
            const hasAvatar = container.querySelector('[data-testid^="UserAvatar-Container-"]');
            if (hasUserName && hasAvatar) {
              return container;
            }
            container = container.parentElement;
            depth++;
          }
        }
      }
    }

    // Look for any div[role="link"] that links to another status
    const linkDivs = tweetElement.querySelectorAll('div[role="link"]');
    for (const linkDiv of linkDivs) {
      const statusLink = linkDiv.querySelector('a[href*="/status/"]');
      if (statusLink) {
        const hasAvatar = linkDiv.querySelector('[data-testid^="UserAvatar-Container-"]');
        if (hasAvatar) {
          return linkDiv;
        }
      }
    }

    // Look for sibling elements after tweet text that contain user info
    const tweetTextEl = tweetElement.querySelector('[data-testid="tweetText"]');
    if (tweetTextEl) {
      let sibling = tweetTextEl.parentElement?.nextElementSibling;
      while (sibling) {
        // Check if this sibling contains avatar/user info (quoted tweet signature)
        const hasAvatar = sibling.querySelector('[data-testid^="UserAvatar-Container-"]');
        const hasUserName = sibling.querySelector('[data-testid="User-Name"]');
        if (hasAvatar || hasUserName) {
          return sibling;
        }
        sibling = sibling.nextElementSibling;
      }
    }

    return null;
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
