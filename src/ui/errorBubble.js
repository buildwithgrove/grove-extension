/**
 * Error Bubble UI Component
 * Displays inline error messages anchored to elements
 * Requires: src/ui/styles.css (for .grove-tip-inline-message styles)
 */

class ErrorBubble {
  static _activeBubble = null;
  static _scrollHandler = null;
  static _visibilityListenerAttached = false;

  /**
   * Show an inline message near the target element
   * Message stays visible until user dismisses it with the X button
   * @param {HTMLElement} targetEl - Element to anchor the message to
   * @param {string} message - Message to display
   * @param {string} variant - 'error' (all errors use red)
   */
  static show(targetEl, message, variant = 'error') {
    if (!targetEl || !message) return;

    // Remove previous bubble if present
    this._clear();

    const bubble = document.createElement('div');
    bubble.className = 'grove-tip-inline-message';
    bubble.dataset.variant = variant;

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'grove-tip-inline-message__close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Dismiss');
    closeBtn.textContent = '\u00D7'; // × symbol

    // Create text container
    const textContainer = document.createElement('div');
    this._setText(textContainer, message);

    bubble.appendChild(textContainer);
    bubble.appendChild(closeBtn);

    // Position offscreen initially for measurement
    bubble.style.top = '0px';
    bubble.style.left = '0px';
    bubble.style.visibility = 'hidden';
    bubble.style.pointerEvents = 'none';

    document.body.appendChild(bubble);

    // Calculate and apply position
    const position = this._calculatePosition(targetEl, bubble);
    bubble.style.top = `${position.top}px`;
    bubble.style.left = `${position.left}px`;
    bubble.style.visibility = 'visible';
    bubble.style.pointerEvents = 'auto';

    // Fade in
    requestAnimationFrame(() => bubble.classList.add('grove-tip-inline-message--visible'));

    // Close button handler
    const dismissBubble = () => {
      bubble.classList.remove('grove-tip-inline-message--visible');
      window.setTimeout(() => bubble.remove(), 120);
      this._activeBubble = null;
      // Clean up scroll listener
      if (this._scrollHandler) {
        window.removeEventListener('scroll', this._scrollHandler, true);
        this._scrollHandler = null;
      }
    };

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dismissBubble();
    });

    // Dismiss on scroll - add small delay to avoid immediate dismissal from dynamic content
    setTimeout(() => {
      this._scrollHandler = () => dismissBubble();
      window.addEventListener('scroll', this._scrollHandler, true);
    }, 100);

    this._activeBubble = bubble;
  }

  /**
   * Calculate bubble position anchored to the target element, centered horizontally.
   * Positions above if near bottom of viewport, otherwise below.
   * Clamps to viewport edges with padding.
   *
   * @param {HTMLElement} anchorEl - Element to anchor the bubble to
   * @param {HTMLElement} bubbleEl - The bubble element (must be in DOM for measurement)
   * @returns {{top: number, left: number}}
   */
  static _calculatePosition(anchorEl, bubbleEl) {
    const anchorRect = anchorEl.getBoundingClientRect();
    const bubbleRect = bubbleEl.getBoundingClientRect();
    const padding = 12;
    const gap = 8;

    // Check if there's enough space below the button
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    const needsFlip = spaceBelow < bubbleRect.height + gap + padding;

    // Use viewport coordinates directly since bubble is position: fixed
    let top;
    if (needsFlip) {
      // Position above the button
      top = anchorRect.top - bubbleRect.height - gap;
    } else {
      // Position below the button
      top = anchorRect.bottom + gap;
    }

    // Center horizontally under anchor, then clamp to viewport
    let left = anchorRect.left + (anchorRect.width / 2) - (bubbleRect.width / 2);
    left = Math.max(padding, Math.min(left, window.innerWidth - bubbleRect.width - padding));

    return { top, left };
  }

  /**
   * Clear the active bubble.
   * Called on visibility change and before showing a new bubble.
   */
  static _clear() {
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler, true);
      this._scrollHandler = null;
    }
    if (this._activeBubble) {
      try {
        this._activeBubble.remove();
      } catch (e) {
        // Bubble may already be removed
      }
      this._activeBubble = null;
    }
  }

  /**
   * Initialize visibility change listener to clean up bubbles on navigation.
   * Should be called once when the handler is loaded.
   */
  static init() {
    if (this._visibilityListenerAttached) return;
    this._visibilityListenerAttached = true;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this._clear();
      }
    });
  }

  /**
   * Set bubble text, splitting sentences into separate lines
   * @param {HTMLElement} el - Element to set text on
   * @param {string} message - Message text
   */
  static _setText(el, message) {
    // Split sentences/newlines into separate lines
    const lines = (message || '')
      .split(/\r?\n/)
      .flatMap(line => line.split(/(?<=[.?!])\s+(?=[A-Z0-9])/))
      .filter(Boolean);

    el.textContent = ''; // clear
    lines.forEach((line, idx) => {
      if (idx > 0) el.appendChild(document.createElement('br'));
      el.appendChild(document.createTextNode(line));
    });
  }
}

// Export for different module systems
if (typeof window !== 'undefined') {
  window.ErrorBubble = ErrorBubble;
  // Initialize cleanup listener on load
  ErrorBubble.init();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ErrorBubble };
}
