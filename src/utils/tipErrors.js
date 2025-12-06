/**
 * Tip Error Handling Utilities
 *
 * Normalizes backend error responses into user-friendly messages with:
 * - Error type classification (auth, balance, rate limit, network)
 * - Visual variant (error vs warning) for UI styling
 * - Inline bubble display anchored to tip buttons
 *
 * Requires: src/ui/styles.css (for .grove-tip-inline-message styles)
 */
(function() {
  const TIP_ERROR_TYPES = {
    INSUFFICIENT_BALANCE: 'insufficient_balance',
    AUTH: 'auth',
    RATE_LIMITED: 'rate_limited',
    NETWORK: 'network',
    UNKNOWN: 'unknown'
  };

  const DEFAULT_VARIANTS = {
    [TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]: 'warning',
    [TIP_ERROR_TYPES.RATE_LIMITED]: 'warning',
    [TIP_ERROR_TYPES.AUTH]: 'error',
    [TIP_ERROR_TYPES.NETWORK]: 'error',
    [TIP_ERROR_TYPES.UNKNOWN]: 'error'
  };

  class TipErrorHandler {
    /**
     * Normalize an error response from GroveAPI.sendTip into a structured object.
     *
     * @param {Object|Error|string} raw - Raw error response or exception
     * @returns {{type: string, status: number|null, message: string, userMessage: string, detail: Object, variant: string}}
     */
    static parse(raw) {
      const status = raw?.status || null;
      const detail = raw?.data?.detail || raw?.detail || null;
      const baseMessage = this._extractMessage(raw);
      const normalizedMessage = (baseMessage || '').toString().toLowerCase();

      if (this._includes(normalizedMessage, 'insufficient balance') || this._includes(detail?.error?.toLowerCase?.(), 'insufficient balance')) {
        const formatted = this._formatInsufficient(detail);
        return {
          type: TIP_ERROR_TYPES.INSUFFICIENT_BALANCE,
          status,
          message: formatted,
          userMessage: formatted,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]
        };
      }

      if (status === 401 || status === 403 || this._includes(normalizedMessage, 'unauthorized') || this._includes(normalizedMessage, 'forbidden')) {
        const userMsg = 'Your Grove session expired. Reconnect your account in the extension to keep tipping.';
        return {
          type: TIP_ERROR_TYPES.AUTH,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.AUTH]
        };
      }

      if (status === 429 || this._includes(normalizedMessage, 'rate limit')) {
        const userMsg = 'You are tipping too quickly. Please wait a few seconds and try again.';
        return {
          type: TIP_ERROR_TYPES.RATE_LIMITED,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.RATE_LIMITED]
        };
      }

      if (this._includes(normalizedMessage, 'network') || this._includes(normalizedMessage, 'fetch') || this._includes(normalizedMessage, 'failed to fetch')) {
        const userMsg = 'Network issue while sending your tip. Check your connection and retry.';
        return {
          type: TIP_ERROR_TYPES.NETWORK,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.NETWORK]
        };
      }

      const fallbackMsg = baseMessage || 'Tip failed. Please try again.';
      return {
        type: TIP_ERROR_TYPES.UNKNOWN,
        status,
        message: fallbackMsg,
        userMessage: fallbackMsg,
        detail: detail || {},
        variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.UNKNOWN]
      };
    }

    /**
     * Show an inline message near the target element
     * @param {HTMLElement} targetEl - Element to anchor the message to
     * @param {string} message - Message to display
     * @param {string} variant - 'error' | 'warning'
     * @param {number} durationMs - Time before auto-hide
     */
    static showInlineMessage(targetEl, message, variant = 'error', durationMs = 2000) {
      if (!targetEl || !message) return;

      // Remove previous bubble if present
      this._clearActiveBubble();

      const bubble = document.createElement('div');
      bubble.className = 'grove-tip-inline-message';
      bubble.dataset.variant = variant;
      this._setBubbleText(bubble, message);

      // Position offscreen initially for measurement
      bubble.style.top = '0px';
      bubble.style.left = '0px';
      bubble.style.visibility = 'hidden';
      bubble.style.pointerEvents = 'none';

      document.body.appendChild(bubble);

      // Calculate and apply position
      const position = this._calculateBubblePosition(targetEl, bubble);
      bubble.style.top = `${position.top}px`;
      bubble.style.left = `${position.left}px`;
      bubble.style.visibility = 'visible';
      bubble.style.pointerEvents = 'auto';

      // Fade in
      requestAnimationFrame(() => bubble.classList.add('grove-tip-inline-message--visible'));

      const timeoutId = window.setTimeout(() => {
        bubble.classList.remove('grove-tip-inline-message--visible');
        window.setTimeout(() => bubble.remove(), 200);
      }, durationMs);

      bubble.addEventListener('click', () => {
        bubble.classList.remove('grove-tip-inline-message--visible');
        window.clearTimeout(timeoutId);
        window.setTimeout(() => bubble.remove(), 120);
      });

      this._activeBubble = bubble;
      this._activeTimeoutId = timeoutId;
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
    static _calculateBubblePosition(anchorEl, bubbleEl) {
      const anchorRect = anchorEl.getBoundingClientRect();
      const bubbleRect = bubbleEl.getBoundingClientRect();
      const padding = 12;
      const gap = 8;

      // Check if there's enough space below the button
      const spaceBelow = window.innerHeight - anchorRect.bottom;
      const needsFlip = spaceBelow < bubbleRect.height + gap + padding;

      let top;
      if (needsFlip) {
        // Position above the button
        top = anchorRect.top + window.scrollY - bubbleRect.height - gap;
      } else {
        // Position below the button
        top = anchorRect.bottom + window.scrollY + gap;
      }

      // Center horizontally under anchor, then clamp to viewport
      let left = anchorRect.left + window.scrollX + (anchorRect.width / 2) - (bubbleRect.width / 2);
      left = Math.max(padding, Math.min(left, window.scrollX + window.innerWidth - bubbleRect.width - padding));

      return { top, left };
    }

    /**
     * Clear the active bubble and cancel its timeout.
     * Called on visibility change and before showing a new bubble.
     */
    static _clearActiveBubble() {
      if (this._activeTimeoutId) {
        window.clearTimeout(this._activeTimeoutId);
        this._activeTimeoutId = null;
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
    static _initVisibilityCleanup() {
      if (this._visibilityListenerAttached) return;
      this._visibilityListenerAttached = true;

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this._clearActiveBubble();
        }
      });
    }

    // ----- Internal helpers -----

    static _setBubbleText(el, message) {
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

    static _extractMessage(raw) {
      if (!raw) return '';
      if (typeof raw === 'string') return raw;
      if (raw instanceof Error) return raw.message;
      return raw.error || raw.message || raw?.data?.message || raw?.data?.error || '';
    }

    static _includes(str, search) {
      if (!str || !search) return false;
      return str.includes(search);
    }

    /**
     * Format insufficient balance error into a human-readable message.
     * Extracts token, network, required and current amounts from the API response detail.
     *
     * @param {Object} detail - Error detail object from API response
     * @returns {string} - Formatted error message
     */
    static _formatInsufficient(detail = {}) {
      const token = detail.requested_token || detail.token || 'USDC';
      const network = detail.requested_network || detail.network || 'Base';
      const required = this._formatAmount(detail.required_amount);
      const current = this._formatAmount(detail.current_balance);

      if (required && current) {
        return `Not enough ${token} on ${this._titleCase(network)}. Need ${required}, you have ${current}. Add funds or try a smaller tip.`;
      }

      return `Not enough ${token} on ${this._titleCase(network)} to send this tip. Add funds or try again.`;
    }

    static _formatAmount(value) {
      if (value === undefined || value === null) return null;
      const num = Number(value);
      if (!Number.isFinite(num)) {
        // Non-numeric value (e.g., already formatted string) - return as-is
        return String(value);
      }
      // Adaptive precision based on magnitude
      if (num >= 1) return num.toFixed(2);
      if (num >= 0.01) return num.toFixed(4);
      return num.toFixed(6);
    }

    static _titleCase(str) {
      if (!str || typeof str !== 'string') return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
  }

  if (typeof window !== 'undefined') {
    window.TipErrorHandler = TipErrorHandler;
    // Initialize cleanup listener on load
    TipErrorHandler._initVisibilityCleanup();
  }
})();
