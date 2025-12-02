/**
 * Tip Button UI
 * Creates and manages the tip button element
 * Requires: src/ui/constants.js
 */

class TipButton {
  /**
   * Create a new tip button
   * @param {Function} onClickCallback - Callback function when button is clicked
   * @param {string} platform - Platform name (twitter, reddit, etc.)
   */
  constructor(onClickCallback, platform = 'twitter') {
    this.onClickCallback = onClickCallback;
    this.button = null;
    this.platform = platform;
    this.isDarkMode = this.detectDarkMode();
  }

  /**
   * Detect if the page is in dark mode
   * @returns {boolean}
   */
  detectDarkMode() {
    // Platform-specific detection
    if (this.platform === 'twitter') {
      // Twitter uses backgroundColor on body or color-scheme
      const bg = document.body.style.backgroundColor ||
                 window.getComputedStyle(document.body).backgroundColor;
      if (bg) {
        return this.isColorDark(bg);
      }
    }

    if (this.platform === 'reddit') {
      // Reddit uses a class or data attribute
      const html = document.documentElement;
      if (html.classList.contains('theme-dark') ||
          html.getAttribute('data-theme') === 'dark') {
        return true;
      }
      if (html.classList.contains('theme-light') ||
          html.getAttribute('data-theme') === 'light') {
        return false;
      }
    }

    if (this.platform === 'youtube') {
      // YouTube uses dark attribute on html
      if (document.documentElement.hasAttribute('dark')) {
        return true;
      }
    }

    // Fallback: check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return true;
    }

    // Fallback: check body background luminosity
    const bg = window.getComputedStyle(document.body).backgroundColor;
    return this.isColorDark(bg);
  }

  /**
   * Check if a color is dark based on luminosity
   * @param {string} color - CSS color string (rgb/rgba)
   * @returns {boolean}
   */
  isColorDark(color) {
    // Parse rgb/rgba color
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return true; // Default to dark if can't parse

    const r = parseInt(match[1]);
    const g = parseInt(match[2]);
    const b = parseInt(match[3]);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  /**
   * Create and return the button element
   * @returns {HTMLElement}
   */
  create() {

    if (this.platform === 'reddit') {
      return this.createRedditButton();
    }

    if (this.platform === 'youtube') {
      return this.createYouTubeButton();
    }

    return this.createTwitterButton();
  }

  /**
   * Create Twitter-style button
   * @returns {HTMLElement}
   */
  createTwitterButton() {

    // Create button element - simplified structure for cleaner styling
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('type', 'button');
    this.button.className = 'grove-tip-button';
    this.button.id = 'grove-tip-button';

    // Colors based on detected mode
    const bgColor = this.isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = this.isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = this.isDarkMode ? '#ffffff' : '#1a1a1a';
    this.bgColor = bgColor;
    this.bgHoverColor = bgHoverColor;

    // Apply inline styles
    this.button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 9999px !important;
      padding: 0 16px !important;
      height: 36px !important;
      min-height: 36px !important;
      max-height: 36px !important;
      min-width: 32px !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      cursor: pointer !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      vertical-align: top !important;
      align-self: flex-start !important;
      flex-shrink: 0 !important;
      margin-top: 0px !important;
      margin-bottom: 0px !important;
      line-height: 1 !important;
    `;

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Tip';
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: 15px !important;
      margin-left: 4px !important;
      position: relative !important;
      z-index: 2 !important;
    `;

    // Create animated sheen overlay
    const sheenOverlay = document.createElement('div');
    sheenOverlay.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;

    // Add keyframe animation to document if not already added
    if (!document.querySelector('#grove-sheen-animation')) {
      const style = document.createElement('style');
      style.id = 'grove-sheen-animation';
      style.textContent = `
        @keyframes grove-sheen-slide {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
      `;
      document.head.appendChild(style);
    }

    // Add hover effect
    this.button.addEventListener('mouseenter', () => {
      this.button.style.background = `${bgHoverColor} !important`;
      this.button.style.transform = 'translateY(-1px)';
      this.button.style.boxShadow = `0 4px 12px ${GROVE_COLORS.shadowHover} !important`;
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.background = `${bgColor} !important`;
      this.button.style.transform = 'translateY(0)';
      this.button.style.boxShadow = `0 2px 8px ${GROVE_COLORS.shadow} !important`;
    });

    // Assemble the structure
    textSpan.appendChild(emojiSpan);
    this.button.appendChild(sheenOverlay);
    this.button.appendChild(textSpan);


    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create Reddit-style button
   * Creates different styles based on context (hover card vs profile page)
   * @returns {HTMLElement}
   */
  createRedditButton() {

    // Check if we're on a hover card or profile page
    const isHoverCard = !!document.querySelector('[data-testid="user-hover-card"]');
    const isProfilePage = /^https:\/\/(www\.)?reddit\.com\/(user|u)\/[^\/]+\/?$/.test(window.location.href);

    if (isProfilePage) {
      return this.createRedditProfileButton();
    } else {
      return this.createRedditHoverCardButton();
    }
  }

  /**
   * Create Reddit hover card button (matches karma display layout)
   * @returns {HTMLElement}
   */
  createRedditHoverCardButton() {

    // Create button element matching Reddit's karma layout
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('type', 'button');
    this.button.className = 'flex flex-col grove-tip-button-reddit';
    this.button.id = 'grove-tip-button';

    // Create inner container
    const innerDiv = document.createElement('div');
    innerDiv.className = 'grove-tip-inner';

    // Create value span with emoji
    const valueSpan = document.createElement('span');
    valueSpan.className = 'grove-tip-value font-semibold text-14';
    valueSpan.textContent = 'Tip 🌿';

    // Create label span (like "Post karma", "Comment karma")
    const labelSpan = document.createElement('span');
    labelSpan.className = 'grove-tip-label text-neutral-content-weak text-12';
    labelSpan.textContent = 'Send crypto';

    // Assemble the structure
    innerDiv.appendChild(valueSpan);
    innerDiv.appendChild(labelSpan);
    this.button.appendChild(innerDiv);


    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create Reddit profile page button (matches Share button style)
   * @returns {HTMLElement}
   */
  createRedditProfileButton() {

    // Create button element with inline styles for consistency
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.id = 'grove-tip-button';

    // Colors based on detected mode
    const bgColor = this.isDarkMode ? '#1a1a1a' : '#ffffff';
    const bgHoverColor = this.isDarkMode ? '#252525' : '#f0f0f0';
    const textColor = this.isDarkMode ? '#D7DADC' : '#1a1a1a';
    this.bgColor = bgColor;
    this.bgHoverColor = bgHoverColor;

    // Apply inline styles
    this.button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 999px !important;
      padding: 8px 16px !important;
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 6px !important;
      height: 32px !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      position: relative !important;
      overflow: hidden !important;
      white-space: nowrap !important;
      margin-left: 8px !important;
      margin-right: 4px !important;
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    `;

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Tip';
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: 14px !important;
      position: relative !important;
      z-index: 2 !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: 16px !important;
      position: relative !important;
      z-index: 2 !important;
      filter: none !important;
    `;

    // Create animated sheen overlay (subtle)
    const sheenOverlay = document.createElement('div');
    sheenOverlay.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg,
        transparent,
        rgba(56, 159, 88, 0.1),
        transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;

    // Add hover effect
    this.button.addEventListener('mouseenter', () => {
      this.button.style.background = `${bgHoverColor} !important`;
      this.button.style.transform = 'translateY(-1px)';
      this.button.style.boxShadow = `0 4px 12px ${GROVE_COLORS.shadowHover} !important`;
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.background = `${bgColor} !important`;
      this.button.style.transform = 'translateY(0)';
      this.button.style.boxShadow = `0 2px 8px ${GROVE_COLORS.shadow} !important`;
    });

    // Assemble the structure
    this.button.appendChild(sheenOverlay);
    this.button.appendChild(textSpan);
    this.button.appendChild(emojiSpan);


    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create YouTube-style button
   * Matches YouTube's action buttons (Share, Download) using yt-button-shape
   * @returns {HTMLElement}
   */
  createYouTubeButton() {

    // Create yt-button-view-model wrapper
    const buttonViewModel = document.createElement('yt-button-view-model');
    buttonViewModel.className = 'ytd-menu-renderer';
    buttonViewModel.id = 'grove-tip-button';

    // Create button-view-model wrapper
    const buttonViewModelInner = document.createElement('button-view-model');
    buttonViewModelInner.className = 'ytSpecButtonViewModelHost style-scope ytd-menu-renderer';

    // Create the actual button
    this.button = document.createElement('button');
    this.button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-trailing yt-spec-button-shape-next--enable-backdrop-filter-experiment grove-tip-button-youtube';
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('title', '');
    this.button.setAttribute('aria-disabled', 'false');

    // Create icon div
    const iconDiv = document.createElement('div');
    iconDiv.setAttribute('aria-hidden', 'true');
    iconDiv.className = 'yt-spec-button-shape-next__icon';

    // Create icon span (using the leaf emoji as icon)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ytIconWrapperHost';
    iconSpan.style.width = '24px';
    iconSpan.style.height = '24px';
    iconSpan.style.fontSize = '18px';
    iconSpan.style.display = 'flex';
    iconSpan.style.alignItems = 'center';
    iconSpan.style.justifyContent = 'center';
    iconSpan.textContent = '🌿';

    // Assemble icon structure
    iconDiv.appendChild(iconSpan);

    // Create button text content div
    const textDiv = document.createElement('div');
    textDiv.className = 'yt-spec-button-shape-next__button-text-content';

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.className = 'yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap';
    textSpan.setAttribute('role', 'text');
    textSpan.textContent = 'Tip';

    // Assemble text structure
    textDiv.appendChild(textSpan);

    // Create touch feedback shape (YouTube's ripple effect)
    const touchFeedback = document.createElement('yt-touch-feedback-shape');
    touchFeedback.setAttribute('aria-hidden', 'true');
    touchFeedback.className = 'yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response';

    const strokeDiv = document.createElement('div');
    strokeDiv.className = 'yt-spec-touch-feedback-shape__stroke';

    const fillDiv = document.createElement('div');
    fillDiv.className = 'yt-spec-touch-feedback-shape__fill';

    touchFeedback.appendChild(strokeDiv);
    touchFeedback.appendChild(fillDiv);

    // Assemble button structure (text first, then icon for trailing position)
    this.button.appendChild(textDiv);
    this.button.appendChild(iconDiv);
    this.button.appendChild(touchFeedback);

    // Assemble wrapper structure
    buttonViewModelInner.appendChild(this.button);
    buttonViewModel.appendChild(buttonViewModelInner);


    // Add click handler to the actual button
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    // Return the wrapper so we can inject it properly
    return buttonViewModel;
  }

  /**
   * Handle button click
   */
  handleClick() {
    if (this.onClickCallback) {
      this.onClickCallback();
    }
  }

  /**
   * Set button to loading state
   */
  setLoading() {
    if (!this.button) return;

    // Clear any pending reset timeout
    if (this.resetTimeout) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }

    // Store original border/shadow styles
    this.originalBorder = this.button.style.border;
    this.originalBoxShadow = this.button.style.boxShadow;

    this.button.disabled = true;

    // Use JS interval to cycle border colors with !important to override inline styles
    const colors = [
      { border: '#389f58', shadow: '0 0 12px #389f58' },
      { border: '#4fb76d', shadow: '0 0 12px #4fb76d' },
      { border: '#f0ad4e', shadow: '0 0 12px #f0ad4e' },
      { border: '#4fb76d', shadow: '0 0 12px #4fb76d' },
    ];
    let colorIndex = 0;

    // Set initial color
    this.button.style.setProperty('border-color', colors[0].border, 'important');
    this.button.style.setProperty('box-shadow', colors[0].shadow, 'important');

    this.loadingInterval = setInterval(() => {
      colorIndex++;
      const color = colors[colorIndex % colors.length];
      this.button.style.setProperty('border-color', color.border, 'important');
      this.button.style.setProperty('box-shadow', color.shadow, 'important');
    }, 150);

    this.button.style.pointerEvents = 'none';
  }

  /**
   * Set button to success state
   */
  setSuccess() {
    if (!this.button) return;

    // Stop loading animation
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    // Remove loading state
    this.button.disabled = false;
    this.button.style.pointerEvents = '';

    // Restore original border/shadow
    this.button.style.setProperty('border', this.originalBorder || `2px solid ${GROVE_COLORS.primary}`, 'important');
    this.button.style.setProperty('box-shadow', this.originalBoxShadow || `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');

    // Add success styling
    this.button.classList.add('animate__animated', 'animate__bounceIn', 'grove-tip-success');

    // Update button text to show success
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
    } else {
      textElement = this.button.querySelector('span');
    }

    if (textElement) {
      textElement.textContent = 'Sent! ✓';
    }

    // Reset after 2 seconds
    this.resetTimeout = setTimeout(() => {
      this.resetState();
    }, 2000);
  }

  /**
   * Set button to error state
   */
  setError() {
    if (!this.button) return;

    // Stop loading animation
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    // Remove loading state
    this.button.disabled = false;
    this.button.style.pointerEvents = '';

    // Restore original border/shadow
    this.button.style.setProperty('border', this.originalBorder || `2px solid ${GROVE_COLORS.primary}`, 'important');
    this.button.style.setProperty('box-shadow', this.originalBoxShadow || `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');

    // Add error styling
    this.button.classList.add('animate__animated', 'animate__shakeX', 'grove-tip-error');

    // Update button text
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
    } else {
      textElement = this.button.querySelector('span');
    }

    if (textElement) {
      textElement.textContent = 'Failed ✗';
    }

    // Reset after 2 seconds
    this.resetTimeout = setTimeout(() => {
      this.resetState();
    }, 2000);
  }

  /**
   * Reset button to original state
   */
  resetState() {
    if (!this.button) return;

    this.resetTimeout = null;

    // Stop loading animation
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    }

    // Remove loading styles
    this.button.style.pointerEvents = '';

    // Restore original border/shadow
    this.button.style.setProperty('border', this.originalBorder || `2px solid ${GROVE_COLORS.primary}`, 'important');
    this.button.style.setProperty('box-shadow', this.originalBoxShadow || `0 2px 8px ${GROVE_COLORS.shadow}`, 'important');

    // Remove all state classes
    this.button.classList.remove(
      'animate__animated',
      'animate__pulse',
      'animate__infinite',
      'animate__bounceIn',
      'animate__shakeX',
      'grove-tip-success',
      'grove-tip-error'
    );

    // Reset button properties
    this.button.disabled = false;
    this.button.style.cursor = 'pointer';


    // Restore original text for all platforms to "Tip 🌿"
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
      if (textElement) {
        textElement.textContent = 'Tip';
      }
    } else if (this.platform === 'twitter') {
      // For Twitter, update the main text span
      textElement = this.button.querySelector('span');
      if (textElement) {
        // Clear and reset with both text and emoji
        textElement.textContent = 'Tip';
        // Find or create emoji span
        let emojiSpan = textElement.querySelector('span');
        if (!emojiSpan) {
          emojiSpan = document.createElement('span');
          emojiSpan.style.cssText = `
            font-size: 16px !important;
            margin-left: 4px !important;
            filter: saturate(1.5) !important;
            position: relative !important;
            z-index: 2 !important;
          `;
        }
        emojiSpan.textContent = '🌿';
        textElement.appendChild(emojiSpan);
      }
    } else if (this.platform === 'reddit') {
      // For Reddit, check which type of button
      const valueSpan = this.button.querySelector('.grove-tip-value');
      if (valueSpan) {
        // Hover card style
        valueSpan.textContent = 'Tip 🌿';
      } else {
        // Profile button style - has separate text and emoji spans
        const spans = this.button.querySelectorAll('span');
        if (spans.length >= 2) {
          // We have separate spans - reset each individually
          spans[0].textContent = 'Tip'; // Text span
          spans[1].textContent = '🌿';   // Emoji span
        } else if (spans.length === 1) {
          // Fallback - single span with both text and emoji
          spans[0].textContent = 'Tip 🌿';
        }
      }
    } else {
      // Default case
      textElement = this.button.querySelector('span') || this.button;
      textElement.textContent = 'Tip 🌿';
    }
  }

  /**
   * Inject button into the DOM at target location
   * @param {Element} targetElement - Element to append button to
   * @returns {boolean} - True if injection successful
   */
  inject(targetElement) {

    if (!targetElement || !this.button) {
      return false;
    }

    // Check if button already exists
    if (document.getElementById(this.button.id)) {
      return false;
    }

    // Style the button to match Twitter's spacing and ensure proper alignment
    this.button.style.marginLeft = '8px';
    this.button.style.marginRight = '8px';
    this.button.style.alignSelf = 'flex-start';
    this.button.style.flexShrink = '0';
    this.button.style.marginTop = '0px';
    this.button.style.marginBottom = '0px';

    // Get all children of the target container
    const children = Array.from(targetElement.children);

    // Find the last visible action button (usually the "More" button)
    let insertBeforeElement = null;

    // Look for the More button specifically
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      const childButton = child.tagName === 'BUTTON' ? child : child.querySelector('button');

      if (childButton) {
        const ariaLabel = childButton.getAttribute('aria-label');
        const testId = childButton.getAttribute('data-testid');

        // Find the More button (3 dots)
        if ((ariaLabel && ariaLabel.toLowerCase().includes('more')) ||
            (testId && testId === 'userActions')) {
          insertBeforeElement = child;
          break;
        }
      }
    }

    // If no More button found, look for other buttons to insert after
    if (!insertBeforeElement) {
      // Find Message or Follow button to insert after
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const childButton = child.tagName === 'BUTTON' ? child : child.querySelector('button');

        if (childButton) {
          const ariaLabel = childButton.getAttribute('aria-label');

          if (ariaLabel && (ariaLabel.includes('Message') || ariaLabel.includes('Follow'))) {
            // Insert after this button
            if (i < children.length - 1) {
              insertBeforeElement = children[i + 1];
            }
            break;
          }
        }
      }
    }

    // Insert the button
    if (insertBeforeElement) {
      targetElement.insertBefore(this.button, insertBeforeElement);
    } else {
      // Append at the end
      targetElement.appendChild(this.button);
    }

    return true;
  }

  /**
   * Remove button from DOM
   */
  remove() {
    if (this.button && this.button.parentElement) {
      this.button.remove();
    }
  }
}

if (typeof window !== 'undefined') {
  window.TipButton = TipButton;
}
