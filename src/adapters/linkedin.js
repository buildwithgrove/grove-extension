/**
 * LinkedIn Adapter
 * Handles LinkedIn profile pages, individual posts, and feed posts
 *
 * Requires: src/adapters/base.js (BaseAdapter)
 */

groveLog.log('Loading linkedin.js...');

window.LinkedInAdapter = class LinkedInAdapter extends window.BaseAdapter {
  /**
   * Check if current page is a tippable LinkedIn page
   * Tippable: profile pages, individual post pages
   * Feed pages are handled by LinkedInHandler (not here)
   * @returns {boolean}
   */
  detectTippablePage() {
    try {
      const path = window.location.pathname;

      // Profile pages: /in/username
      if (this.isProfilePage()) return true;

      // Individual post pages: /feed/update/urn:li:activity:ID
      if (this.isPostPage()) return true;

      return false;
    } catch (err) {
      console.error('[Grove Extension] LinkedIn detectTippablePage failed:', err);
      return false;
    }
  }

  /**
   * Check if current page is a LinkedIn profile
   * @returns {boolean}
   */
  isProfilePage() {
    const path = window.location.pathname;
    return /^\/in\/[a-zA-Z0-9_-]+\/?/.test(path);
  }

  /**
   * Check if current page is an individual LinkedIn post
   * @returns {boolean}
   */
  isPostPage() {
    const path = window.location.pathname;
    return path.startsWith('/feed/update/');
  }

  /**
   * Check if current page is a LinkedIn feed
   * @returns {boolean}
   */
  isFeedPage() {
    const path = window.location.pathname;
    return path === '/feed/' || path === '/feed' || path === '/';
  }

  /**
   * Extract display name from LinkedIn page
   * @returns {string|null}
   */
  extractDisplayName() {
    if (this.isProfilePage()) {
      // Profile: name is in the main h1
      const nameEl = document.querySelector('h1.text-heading-xlarge')
        || document.querySelector('.pv-top-card h1')
        || document.querySelector('h1[tabindex="-1"]')
        || document.querySelector('main h1');
      if (nameEl?.textContent?.trim()) {
        groveLog.log('LinkedIn displayName from profile h1:', nameEl.textContent.trim());
        return nameEl.textContent.trim();
      }
    }

    if (this.isPostPage()) {
      // Individual post: author name in the post header
      const authorEl = document.querySelector('.update-components-actor__name .visually-hidden')
        || document.querySelector('.feed-shared-actor__name .visually-hidden')
        || document.querySelector('.feed-shared-actor__name span[dir="ltr"]')
        || document.querySelector('.update-components-actor__name span[dir="ltr"]')
        || document.querySelector('[data-feed-action-entity] .update-components-actor__name');
      if (authorEl?.textContent?.trim()) {
        groveLog.log('LinkedIn displayName from post author:', authorEl.textContent.trim());
        return authorEl.textContent.trim();
      }
    }

    groveLog.log('LinkedIn displayName: none found');
    return null;
  }

  /**
   * Extract bio/description text from LinkedIn page
   * Combines display name + about section for address detection
   * @returns {string|null}
   */
  extractBio() {
    const parts = [];

    // 1. Display name
    const displayName = this.extractDisplayName();
    if (displayName) parts.push(displayName);

    // 2. Headline (subtitle under name)
    const headlineEl = document.querySelector('.text-body-medium.break-words')
      || document.querySelector('.pv-top-card--list .text-body-medium')
      || document.querySelector('[data-generated-suggestion-target]');
    if (headlineEl?.textContent?.trim()) {
      parts.push(headlineEl.textContent.trim());
    }

    // 3. About section (profile pages only)
    if (this.isProfilePage()) {
      // LinkedIn's About section is in a specific section
      const aboutSection = document.querySelector('#about ~ .display-flex .pv-shared-text-with-see-more span[aria-hidden="true"]')
        || document.querySelector('#about + .display-flex .inline-show-more-text')
        || document.querySelector('[data-generated-suggestion-target="urn:li:fsd_profilePagedListComponent"]')
        || document.querySelector('.pv-about__summary-text')
        || document.querySelector('section:has(#about) .pv-shared-text-with-see-more span');

      if (aboutSection?.textContent?.trim()) {
        parts.push(aboutSection.textContent.trim());
      }
    }

    const result = parts.join(' ');
    groveLog.log('LinkedIn extractBio result:', {
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
    if (this.isProfilePage()) {
      // Profile: action buttons row (Open to, Add section, etc.)
      const actionsContainer = document.querySelector('.pvs-profile-actions')
        || document.querySelector('.pv-top-card-v2-ctas')
        || document.querySelector('.ph5 .display-flex.pb2')
        || document.querySelector('.pv-top-card--list + .mt2 .display-flex');

      if (actionsContainer) {
        groveLog.log('LinkedIn getButtonPlacement: profile actions container');
        return actionsContainer;
      }

      // Fallback: look for the row of buttons near the profile header
      const buttons = document.querySelectorAll('main section:first-of-type button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim()?.toLowerCase();
        if (text === 'open to' || text === 'connect' || text === 'follow' || text === 'message') {
          groveLog.log('LinkedIn getButtonPlacement: found via button text, using parent');
          return btn.parentElement;
        }
      }
    }

    if (this.isPostPage()) {
      // Individual post: social actions bar
      const actionsBar = document.querySelector('.social-details-social-activity')
        || document.querySelector('.feed-shared-social-action-bar')
        || document.querySelector('[data-feed-action-entity] .social-details-social-activity');

      if (actionsBar) {
        groveLog.log('LinkedIn getButtonPlacement: post social actions bar');
        return actionsBar;
      }
    }

    groveLog.log('LinkedIn getButtonPlacement: no placement found');
    return null;
  }

  /**
   * Custom tip button injection for LinkedIn
   * @param {HTMLElement} buttonElement - The tip button element
   * @returns {boolean} - True if injection succeeded
   */
  injectTipButton(buttonElement) {
    buttonElement.classList.add('grove-linkedin-tip-button');

    if (this.isProfilePage()) {
      const placement = this.getButtonPlacement();
      if (!placement) return false;

      // Style to match LinkedIn's button row
      buttonElement.style.setProperty('margin-left', '8px', 'important');
      placement.appendChild(buttonElement);
      groveLog.log('LinkedIn injectTipButton: appended to profile actions');
      return true;
    }

    if (this.isPostPage()) {
      const placement = this.getButtonPlacement();
      if (!placement) return false;

      // Insert as last action in the bar
      buttonElement.classList.add('grove-linkedin-post-action');
      placement.appendChild(buttonElement);
      groveLog.log('LinkedIn injectTipButton: appended to post social actions');
      return true;
    }

    return false;
  }

  /**
   * Wait for LinkedIn page to load
   * @returns {Promise<boolean>}
   */
  async waitForProfileLoad() {
    if (this.isProfilePage()) {
      // Wait for the profile name to render
      const nameEl = await this.waitForElement('h1.text-heading-xlarge, .pv-top-card h1, main h1', 8000);
      return nameEl !== null;
    }

    if (this.isPostPage()) {
      // Wait for the post content to render
      const postEl = await this.waitForElement(
        '.feed-shared-update-v2, .update-components-actor__name, .feed-shared-actor__name',
        8000
      );
      return postEl !== null;
    }

    return true;
  }

  /**
   * Get platform name
   * @returns {string}
   */
  getPlatformName() {
    return 'linkedin';
  }

  /**
   * Extract username from a LinkedIn URL
   * @param {string} url - The URL to parse
   * @returns {string|null} - Username (slug) or null
   */
  extractUsernameFromUrl(url) {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];

    return null;
  }

  /**
   * Get the profile URL for a LinkedIn username
   * @param {string} username - The username (slug)
   * @returns {string} - Profile URL
   */
  getProfileUrl(username) {
    return `https://www.linkedin.com/in/${username}`;
  }

  /**
   * Extract the profile username from an individual post page
   * Looks at the post author's profile link
   * @returns {string|null}
   */
  extractPostAuthorUsername() {
    // Find the author link in the post
    const authorLink = document.querySelector('.update-components-actor__container a[href*="/in/"]')
      || document.querySelector('.feed-shared-actor__container a[href*="/in/"]')
      || document.querySelector('a.update-components-actor__meta-link[href*="/in/"]')
      || document.querySelector('a.app-aware-link[href*="/in/"]');

    if (authorLink) {
      const href = authorLink.getAttribute('href');
      const username = this.extractUsernameFromUrl(href);
      if (username) {
        groveLog.log('LinkedIn extractPostAuthorUsername:', username);
        return username;
      }
    }

    groveLog.log('LinkedIn extractPostAuthorUsername: not found');
    return null;
  }
};

groveLog.log('linkedin.js loaded. window.LinkedInAdapter =', typeof window.LinkedInAdapter);
