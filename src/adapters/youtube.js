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

      // Community posts: /post/ID
      if (path.startsWith('/post/')) return true;

      // Shorts: /shorts/ID
      if (path.startsWith('/shorts/')) return true;

      // Channel pages: /@username, /channel/ID, /c/customname
      if (path.startsWith('/@')) {
        // Allow @username/community
        if (path.includes('/community')) return true;
        return true;
      }
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
    // Community pages: author name in post
    const postAuthor = document.querySelector('ytd-post-renderer #author-text')
      || document.querySelector('ytd-backstage-post-renderer #author-text');
    if (postAuthor?.textContent?.trim()) {
      console.log('[Grove Extension] YouTube displayName from ytd-post-renderer #author-text:', postAuthor.textContent.trim());
      return postAuthor.textContent.trim();
    }

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
        || document.querySelector('ytd-channel-about-metadata-renderer #description')
        || document.querySelector('[slot="description"]')
        || document.querySelector('.description');
      if (descEl?.textContent?.trim()) {
        parts.push(descEl.textContent.trim());
      }

      // Also check channel tagline/handle area for ENS
      const tagline = document.querySelector('#channel-tagline #tagline-text')
        || document.querySelector('yt-formatted-string.ytd-channel-tagline-renderer')
        || document.querySelector('#header-author #handle')
        || document.querySelector('#channel-header #content #text-container')
        || document.querySelector('ytd-channel-header-renderer #inner-header-container');
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
        || document.querySelector('.ytd-video-secondary-info-renderer #description')
        || document.querySelector('#attributed-snippet-text');
      if (videoDesc?.textContent?.trim()) {
        parts.push(videoDesc.textContent.trim());
      }

      // Also check channel handle/tagline in the owner section
      const ownerHandle = document.querySelector('#owner #channel-name + yt-formatted-string')
        || document.querySelector('#owner ytd-channel-name + yt-formatted-string')
        || document.querySelector('#owner #owner-sub-count')
        || document.querySelector('#owner #upload-info');
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

    // Community posts: action bar below post
    if (path.startsWith('/post/') || path.includes('/community')) {
      const toolbar = document.querySelector('ytd-post-renderer #toolbar')
        || document.querySelector('#toolbar.ytd-post-renderer')
        || document.querySelector('ytd-backstage-post-renderer #toolbar');
      console.log('[Grove Extension] YouTube getButtonPlacement community:', {
        toolbar: !!toolbar,
        path
      });
      if (toolbar) return toolbar;
    }

    // Channel pages: subscribe button (used as existence check; actual injection via injectTipButton)
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      const subscribeBtn = document.querySelector('#subscribe-button')
        || document.querySelector('ytd-subscribe-button-renderer')
        || document.querySelector('#channel-header-container #buttons');
      
      console.log('[Grove Extension] YouTube getButtonPlacement channel:', {
        '#subscribe-button': !!document.querySelector('#subscribe-button'),
        'ytd-subscribe-button-renderer': !!document.querySelector('ytd-subscribe-button-renderer'),
        '#channel-header-container #buttons': !!document.querySelector('#channel-header-container #buttons')
      });

      if (subscribeBtn) return subscribeBtn;
    }

    // Video/Shorts pages: actions row (Share, Ask, Save, Download)
    if (path === '/watch' || path.startsWith('/shorts/')) {
      const actionsRow = document.querySelector('#top-level-buttons-computed')
        || document.querySelector('ytd-menu-renderer #top-level-buttons-computed')
        || document.querySelector('#actions-inner #top-level-buttons-computed');
      
      if (actionsRow) return actionsRow;

      // Fallback: actions container
      const actions = document.querySelector('#actions ytd-menu-renderer');
      if (actions) return actions;

      // Last fallback: subscribe area
      const ownerSubscribe = document.querySelector('#owner #subscribe-button')
        || document.querySelector('ytd-video-owner-renderer #subscribe-button');
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

    // Community posts: insert at start of toolbar
    if (path.startsWith('/post/') || path.includes('/community')) {
      const toolbar = document.querySelector('ytd-post-renderer #toolbar')
        || document.querySelector('#toolbar.ytd-post-renderer')
        || document.querySelector('ytd-backstage-post-renderer #toolbar');
      if (toolbar) {
        buttonElement.classList.add('grove-youtube-community-action');
        toolbar.insertBefore(buttonElement, toolbar.firstElementChild);
        console.log('[Grove Extension] YouTube injectTipButton: inserted into community toolbar');
        return true;
      }
    }

    if (path === '/watch' || path.startsWith('/shorts/')) {
      // Video/Shorts: insert at start of actions row (before Share)
      const actionsRow = document.querySelector('#top-level-buttons-computed')
        || document.querySelector('ytd-menu-renderer #top-level-buttons-computed')
        || document.querySelector('#actions-inner #top-level-buttons-computed');
      
      if (actionsRow) {
        buttonElement.classList.add('grove-youtube-video-action');
        actionsRow.insertBefore(buttonElement, actionsRow.firstElementChild);
        console.log('[Grove Extension] YouTube injectTipButton: inserted into actions row');
        return true;
      }
    }

    // Channel pages: insert right after subscribe button as sibling
    // We target the renderer or the button container
    const subscribeBtn = document.querySelector('ytd-subscribe-button-renderer')
      || document.querySelector('#subscribe-button ytd-subscribe-button-renderer')
      || document.querySelector('#subscribe-button')
      || document.querySelector('#channel-header-container #buttons #subscribe-button');

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

    // Community post pages: wait for post content
    if (path.startsWith('/post/') || path.includes('/community')) {
      const el = await this.waitForElement('ytd-post-renderer #author-text, ytd-backstage-post-renderer #author-text', 8000);
      return el !== null;
    }

    // Channel pages: wait for channel name AND subscribe button area to load
    if (path.startsWith('/@') || path.startsWith('/channel/') || path.startsWith('/c/')) {
      // Wait for any of the potential channel name selectors
      await Promise.race([
        this.waitForElement('ytd-channel-name #text', 8000),
        this.waitForElement('yt-formatted-string.ytd-channel-name', 8000),
        this.waitForElement('#channel-header-container #text', 8000)
      ]);

      // Wait for subscribe button area
      await Promise.race([
        this.waitForElement('#subscribe-button', 5000),
        this.waitForElement('ytd-subscribe-button-renderer', 5000)
      ]);
      
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
