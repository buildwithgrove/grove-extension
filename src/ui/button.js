/**
 * Tip Button UI
 * Creates and manages the tip button element
 * Requires: src/ui/constants.js, src/utils/darkMode.js
 */

class TipButton {
  /**
   * Create a new tip button
   * @param {Function} onClickCallback - Callback function when button is clicked
   * @param {string} platform - Platform name (twitter, generic)
   */
  constructor(onClickCallback, platform = 'twitter') {
    this.onClickCallback = onClickCallback;
    this.button = null;
    this.platform = platform;
    // Use shared dark mode detector
    this.isDarkMode = typeof detectDarkMode === 'function'
      ? detectDarkMode(platform)
      : this._fallbackDetectDarkMode();
  }

  /**
   * Fallback dark mode detection if shared module not loaded
   * @returns {boolean}
   */
  _fallbackDetectDarkMode() {
    const bg = window.getComputedStyle(document.body).backgroundColor;
    const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!match) return true;
    const luminance = (0.299 * parseInt(match[1]) + 0.587 * parseInt(match[2]) + 0.114 * parseInt(match[3])) / 255;
    return luminance < 0.5;
  }

  /**
   * Create and return the button element
   * @returns {HTMLElement}
   */
  create() {
    if (this.platform === 'generic') {
      return this.createFloatingButton();
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

    // Adjust height for SoundCloud to match their medium buttons
    const buttonHeight = this.platform === 'soundcloud' ? '32px' : '36px';

    // Apply inline styles
    this.button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 9999px !important;
      padding: 0 16px !important;
      height: ${buttonHeight} !important;
      min-height: ${buttonHeight} !important;
      max-height: ${buttonHeight} !important;
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
    this.sheenOverlay = sheenOverlay;
    this.originalSheenBackground = sheenOverlay.style.background;

    // Store reference to text span for loading state
    this.textSpan = textSpan;
    this.emojiSpan = emojiSpan;

    // Add keyframe animation to document if not already added
    if (!document.querySelector('#grove-sheen-animation')) {
      const style = document.createElement('style');
      style.id = 'grove-sheen-animation';
      style.textContent = `
        @keyframes grove-sheen-slide {
          0% { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes grove-ellipsis {
          0% { content: '.'; }
          33% { content: '..'; }
          66% { content: '...'; }
          100% { content: '.'; }
        }
        .grove-ellipsis::after {
          content: '.';
          animation: grove-ellipsis 1.2s infinite steps(1);
          display: inline-block;
          width: 1em;
          text-align: left;
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
   * Create floating button for generic websites
   * Fixed position in bottom-right corner
   * @returns {HTMLElement}
   */
  createFloatingButton() {
    // Create container for floating button
    const container = document.createElement('div');
    container.id = 'grove-floating-container';
    container.style.cssText = `
      position: fixed !important;
      bottom: 24px !important;
      right: 24px !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column !important;
      align-items: flex-end !important;
      gap: 8px !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    `;

    // Create the main button
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('type', 'button');
    this.button.className = 'grove-floating-button';
    this.button.id = 'grove-tip-button';

    // Colors - always use dark theme for floating button for visibility
    const bgColor = '#1a1a1a';
    const bgHoverColor = '#252525';
    const textColor = '#ffffff';
    this.bgColor = bgColor;
    this.bgHoverColor = bgHoverColor;

    this.button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${GROVE_COLORS.primary} !important;
      border-radius: 28px !important;
      padding: 12px 20px !important;
      height: 56px !important;
      min-width: 56px !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      cursor: pointer !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 8px ${GROVE_COLORS.shadow} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    `;

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = 'Tip';
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: 15px !important;
      position: relative !important;
      z-index: 2 !important;
      white-space: nowrap !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = '🌿';
    emojiSpan.style.cssText = `
      font-size: 20px !important;
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
        rgba(255, 255, 255, 0.15),
        transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;
    this.sheenOverlay = sheenOverlay;
    this.originalSheenBackground = sheenOverlay.style.background;

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

    // Hover effects
    this.button.addEventListener('mouseenter', () => {
      this.button.style.background = `${bgHoverColor} !important`;
      this.button.style.transform = 'translateY(-2px) scale(1.02)';
      this.button.style.boxShadow = `0 6px 20px rgba(0, 0, 0, 0.4), 0 4px 12px ${GROVE_COLORS.shadowHover} !important`;
    });

    this.button.addEventListener('mouseleave', () => {
      this.button.style.background = `${bgColor} !important`;
      this.button.style.transform = 'translateY(0) scale(1)';
      this.button.style.boxShadow = `0 4px 16px rgba(0, 0, 0, 0.3), 0 2px 8px ${GROVE_COLORS.shadow} !important`;
    });

    // Assemble structure
    this.button.appendChild(sheenOverlay);
    this.button.appendChild(textSpan);
    this.button.appendChild(emojiSpan);
    container.appendChild(this.button);

    // Store container reference for removal
    this.container = container;

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return container;
  }

  /**
   * Inject floating button into the document body
   * @returns {boolean}
   */
  injectFloating() {
    if (!this.container) {
      return false;
    }

    // Check if already exists
    if (document.getElementById('grove-floating-container')) {
      return false;
    }

    document.body.appendChild(this.container);
    return true;
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
   * @param {number} [amount] - Optional tip amount to display
   */
  setLoading(amount) {
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

    // Update button text to show sending state with animated ellipsis
    const textElement = this.textSpan || this.button.querySelector('span');
    if (textElement) {
      // Remove emoji span if present
      const emojiSpan = textElement.querySelector('span');
      if (emojiSpan) {
        emojiSpan.remove();
      }
      // Create the sending text with ellipsis animation
      const formattedAmount = formatTipAmount(amount);
      const sendingText = formattedAmount ? `Sending $${formattedAmount}` : 'Sending';
      textElement.textContent = sendingText;
      textElement.classList.add('grove-ellipsis');
    }

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
    const textElement = this.button.querySelector('span');
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

    // Apply temporary error border/glow
    const errorBorder = GROVE_COLORS.error || '#ef4444';
    const errorShadow = GROVE_COLORS.errorShadow || 'rgba(239, 68, 68, 0.55)';
    this.button.style.setProperty('border', `2px solid ${errorBorder}`, 'important');
    this.button.style.setProperty('box-shadow', `0 0 12px ${errorShadow}`, 'important');
    if (this.sheenOverlay) {
      this.sheenOverlay.style.background = 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.35), transparent)';
    }

    // Add error styling
    this.button.classList.add('animate__animated', 'animate__shakeX', 'grove-tip-error');

    // Update button text
    const textElement = this.button.querySelector('span');
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
    if (this.sheenOverlay && this.originalSheenBackground) {
      this.sheenOverlay.style.background = this.originalSheenBackground;
    }

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


    // Remove ellipsis class from text element
    const ellipsisElement = this.textSpan || this.button.querySelector('span');
    if (ellipsisElement) {
      ellipsisElement.classList.remove('grove-ellipsis');
    }

    // Restore original text for all platforms to "Tip 🌿"
    if (this.platform === 'twitter') {
      // For Twitter, update the main text span
      const textElement = this.button.querySelector('span');
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
    } else if (this.platform === 'generic') {
      // For generic floating button
      const spans = this.button.querySelectorAll('span');
      if (spans.length >= 2) {
        spans[0].textContent = 'Tip';
        spans[1].textContent = '🌿';
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

    // Style the button to match platform spacing and ensure proper alignment
    const margin = this.platform === 'twitter' ? '8px' : '5px';
    this.button.style.marginLeft = margin;
    this.button.style.marginRight = margin;
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
    // Remove floating container if it exists
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }
    // Remove button directly if not in container
    if (this.button && this.button.parentElement) {
      this.button.remove();
    }
  }
}

if (typeof window !== 'undefined') {
  window.TipButton = TipButton;
}
