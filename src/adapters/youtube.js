/**
 * YouTube Adapter
 * Handles YouTube channel pages, video pages, and shorts
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

window.YouTubeAdapter = class YouTubeAdapter extends window.BaseAdapter {
  /**
   * Check if current page is a tippable YouTube page
   * Tippable: channel pages, video pages, shorts
   * Not tippable: system routes (feed, results, playlist, etc.)
   * @returns {boolean}
   */
  detectTippablePage() {
    try {
      const url = new URL(window.location.href);
      const path = url.pathname;

      // Video pages: /watch?v=...
      if (path === '/watch' && url.searchParams.has('v')) return true;

      // Shorts: /shorts/ID
      if (path.startsWith('/shorts/')) return true;

      // Channel pages: /@username, /channel/ID, /c/customname
      if (path.startsWith('/@')) return true;
      if (path.startsWith('/channel/')) return true;
      if (path.startsWith('/c/')) return true;

      // System routes — not tippable
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) return false;

      const systemRoutes = [
        'feed', 'results', 'playlist', 'gaming', 'trending',
        'premium', 'music', 'kids', 'account', 'reporthistory',
        'upload', 'live', 'hashtag', 'about'
      ];
      if (systemRoutes.includes(segments[0].toLowerCase())) return false;

      return false;
    } catch (err) {
      console.error('[Grove Extension] YouTube detectTippablePage failed:', err);
      return false;
    }
  }

  /**
   * Extract display name (channel name) from YouTube page
   * @returns {string|null}
   */
  extractDisplayName() {
    // Channel pages: ytd-channel-name in header
    const channelName = document.querySelector('ytd-channel-name #text');
    if (channelName?.textContent?.trim()) return channelName.textContent.trim();

    // Video pages: channel name below video
    const ownerName = document.querySelector('#owner #channel-name #text a');
    if (ownerName?.textContent?.trim()) return ownerName.textContent.trim();

    // Fallback: meta tag
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) return metaTitle.getAttribute('content');

    return null;
  }

  /**
   * Extract bio/description text from YouTube page
   * Combines channel name + description for address detection
   * @returns {string|null}
   */
  extractBio() {
    const parts = [];

    // 1. Channel/display name (might contain ENS)
    const displayName = this.extractDisplayName();
    if (displayName) parts.push(displayName);

    // 2. Description text (depends on page type)
    const path = window.location.pathname;

    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      // Channel page: description container
      const descEl = document.querySelector('#description-container')
        || document.querySelector('yt-formatted-string#description');
      if (descEl?.textContent?.trim()) {
        parts.push(descEl.textContent.trim());
      }
    }

    if (path === '/watch' || path.startsWith('/shorts/')) {
      // Video/Shorts page: video description
      const videoDesc = document.querySelector('ytd-text-inline-expander #plain-snippet-text')
        || document.querySelector('#description-inner ytd-text-inline-expander')
        || document.querySelector('#description yt-formatted-string');
      if (videoDesc?.textContent?.trim()) {
        parts.push(videoDesc.textContent.trim());
      }
    }

    // 3. Fallback: meta description
    if (parts.length <= 1) {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const content = metaDesc.getAttribute('content');
        if (content) parts.push(content);
      }
    }

    const result = parts.join(' ');
    return result || null;
  }

  /**
   * Get placement for tip button
   * @returns {Element|null}
   */
  getButtonPlacement() {
    const path = window.location.pathname;

    // Channel pages: subscribe button area
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      const subscribeBtn = document.querySelector('#subscribe-button');
      if (subscribeBtn) return subscribeBtn;

      // Fallback: channel header actions
      const headerActions = document.querySelector('#inner-header-container #buttons');
      if (headerActions) return headerActions;
    }

    // Video/Shorts pages: owner area near subscribe button
    if (path === '/watch' || path.startsWith('/shorts/')) {
      const ownerSubscribe = document.querySelector('#owner #subscribe-button');
      if (ownerSubscribe) return ownerSubscribe;

      // Fallback: top-row actions
      const topRow = document.querySelector('#above-the-fold #top-row #actions');
      if (topRow) return topRow;
    }

    return null;
  }

  /**
   * Wait for YouTube's web components to render
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    const path = window.location.pathname;

    // Channel pages: wait for channel name
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      const el = await this.waitForElement('ytd-channel-name #text', 8000);
      return el !== null;
    }

    // Video pages: wait for video owner info
    if (path === '/watch') {
      const el = await this.waitForElement('#owner #channel-name', 8000);
      return el !== null;
    }

    // Shorts: wait for shorts container
    if (path.startsWith('/shorts/')) {
      const el = await this.waitForElement('ytd-reel-video-renderer', 8000);
      return el !== null;
    }

    return true;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'youtube';
  }

  /**
   * Extract username from a YouTube URL
   * @param {string} url - The URL to parse
   * @returns {string|null} - Username (handle) or null
   */
  extractUsernameFromUrl(url) {
    // /@username pattern
    const handleMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (handleMatch) return handleMatch[1];

    return null;
  }

  /**
   * Get the profile URL for a YouTube username
   * @param {string} username - The username (handle)
   * @returns {string} - Profile URL
   */
  getProfileUrl(username) {
    return `https://youtube.com/@${username}`;
  }
};
