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
    const channelName = document.querySelector('ytd-channel-name #text')
      || document.querySelector('yt-formatted-string.ytd-channel-name')
      || document.querySelector('#channel-header-container #text');
    if (channelName?.textContent?.trim()) {
      console.log('[Grove Extension] YouTube displayName from header:', channelName.textContent.trim());
      return channelName.textContent.trim();
    }

    // Video pages: channel name below video
    const ownerName = document.querySelector('#owner #channel-name #text a')
      || document.querySelector('ytd-video-owner-renderer #channel-name a');
    if (ownerName?.textContent?.trim()) {
      console.log('[Grove Extension] YouTube displayName from owner section:', ownerName.textContent.trim());
      return ownerName.textContent.trim();
    }

    // Fallback: meta tag
    const metaTitle = document.querySelector('meta[property="og:title"]');
    if (metaTitle) {
      console.log('[Grove Extension] YouTube displayName from meta og:title:', metaTitle.getAttribute('content'));
      return metaTitle.getAttribute('content');
    }

    console.log('[Grove Extension] YouTube displayName: none found');
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
      // Channel page: try multiple selectors for the channel description
      const descEl = document.querySelector('#description-container')
        || document.querySelector('yt-formatted-string#description')
        || document.querySelector('yt-attributed-string#description-text')
        || document.querySelector('yt-description-snippet-renderer')
        || document.querySelector('.description-snippet')
        || document.querySelector('#channel-header-container #description')
        || document.querySelector('[slot="description"]')
        || document.querySelector('.description');
      if (descEl?.textContent?.trim()) {
        parts.push(descEl.textContent.trim());
      }

      // Also check channel tagline/handle area for ENS
      const tagline = document.querySelector('#channel-tagline #tagline-text')
        || document.querySelector('yt-formatted-string.ytd-channel-tagline-renderer')
        || document.querySelector('#header-author #handle');
      if (tagline?.textContent?.trim()) {
        parts.push(tagline.textContent.trim());
      }
    }

    if (path === '/watch' || path.startsWith('/shorts/')) {
      // Video/Shorts page: video description (may contain ENS)
      const videoDesc = document.querySelector('ytd-text-inline-expander #plain-snippet-text')
        || document.querySelector('#description-inner ytd-text-inline-expander')
        || document.querySelector('#description yt-formatted-string')
        || document.querySelector('ytd-text-inline-expander .ytd-text-inline-expander')
        || document.querySelector('.ytd-video-secondary-info-renderer #description');
      if (videoDesc?.textContent?.trim()) {
        parts.push(videoDesc.textContent.trim());
      }

      // Also check channel handle/tagline in the owner section
      const ownerHandle = document.querySelector('#owner #channel-name + yt-formatted-string')
        || document.querySelector('#owner ytd-channel-name + yt-formatted-string')
        || document.querySelector('#owner #owner-sub-count');
      if (ownerHandle?.textContent?.trim()) {
        parts.push(ownerHandle.textContent.trim());
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
    console.log('[Grove Extension] YouTube extractBio result:', {
      path,
      displayName,
      partsCount: parts.length,
      bioLength: result?.length || 0,
      bioPreview: result ? result.substring(0, 200) : null
    });
    return result || null;
  }

  /**
   * Get placement for tip button
   * @returns {Element|null}
   */
  getButtonPlacement() {
    const path = window.location.pathname;

    // Channel pages: subscribe button (used as existence check; actual injection via injectTipButton)
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      const subscribeBtn = document.querySelector('#subscribe-button');
      console.log('[Grove Extension] YouTube getButtonPlacement channel:', {
        '#subscribe-button': !!subscribeBtn,
        childCount: subscribeBtn?.children?.length,
        className: subscribeBtn?.className
      });
      if (subscribeBtn) return subscribeBtn;

      const headerActions = document.querySelector('#inner-header-container #buttons');
      if (headerActions) return headerActions;
    }

    // Video/Shorts pages: actions row (Share, Ask, Save, Download)
    if (path === '/watch' || path.startsWith('/shorts/')) {
      const actionsRow = document.querySelector('#top-level-buttons-computed');
      console.log('[Grove Extension] YouTube getButtonPlacement video:', {
        '#top-level-buttons-computed': !!actionsRow,
        childCount: actionsRow?.children?.length
      });
      if (actionsRow) return actionsRow;

      // Fallback: actions container
      const actions = document.querySelector('#actions ytd-menu-renderer');
      if (actions) return actions;

      // Last fallback: subscribe area
      const ownerSubscribe = document.querySelector('#owner #subscribe-button');
      if (ownerSubscribe) return ownerSubscribe;
    }

    console.log('[Grove Extension] YouTube getButtonPlacement: no placement found for path:', path);
    return null;
  }

  /**
   * Custom tip button injection for YouTube
   * Handles different placement per page type:
   * - Channel pages: sibling after subscribe button
   * - Video/Shorts: first in actions row (before Share)
   * @param {HTMLElement} buttonElement - The tip button element
   * @returns {boolean} - True if injection succeeded
   */
  injectTipButton(buttonElement) {
    const path = window.location.pathname;

    // Add common YouTube-specific styling class
    buttonElement.classList.add('grove-youtube-tip-button');

    if (path === '/watch' || path.startsWith('/shorts/')) {
      // Video/Shorts: insert at start of actions row (before Share)
      const actionsRow = document.querySelector('#top-level-buttons-computed');
      if (actionsRow) {
        buttonElement.classList.add('grove-youtube-video-action');
        actionsRow.insertBefore(buttonElement, actionsRow.firstElementChild);
        console.log('[Grove Extension] YouTube injectTipButton: inserted into actions row');
        return true;
      }
    }

    // Channel pages: insert right after subscribe button as sibling
    // We target the renderer or the button container
    const subscribeBtn = document.querySelector('#subscribe-button ytd-subscribe-button-renderer')
      || document.querySelector('#subscribe-button');

    if (subscribeBtn) {
      subscribeBtn.insertAdjacentElement('afterend', buttonElement);
      console.log('[Grove Extension] YouTube injectTipButton: inserted after subscribe button');
      return true;
    }

    console.log('[Grove Extension] YouTube injectTipButton: no target found');
    return false;
  }

  /**
   * Wait for YouTube's web components to render
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    const path = window.location.pathname;

    // Channel pages: wait for channel name AND subscribe button to load (not skeleton)
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      const el = await this.waitForElement('ytd-channel-name #text', 8000);
      if (!el) return false;
      // Wait for subscribe button to be populated (skeleton has 0 children)
      await this.waitForElement('#subscribe-button > *', 5000);
      return true;
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
