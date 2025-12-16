/**
 * Tip Error Handling Utilities
 *
 * Normalizes backend error responses into user-friendly messages with:
 * - Error type classification:
 *   - auth: expired/invalid JWT tokens (401/403)
 *   - insufficient_balance: not enough funds
 *   - rate_limited: too many requests (429)
 *   - network: connection/fetch failures
 *   - address_not_found: couldn't resolve tip destination (ENS, Twitter user, etc.)
 *   - validation: amount limits, invalid format, unsupported token/network
 *   - transfer_failed: backend/provider errors (500s)
 *   - unknown: fallback for unrecognized errors
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
    ADDRESS_NOT_FOUND: 'address_not_found',
    VALIDATION: 'validation',
    TRANSFER_FAILED: 'transfer_failed',
    UNKNOWN: 'unknown'
  };

  const DEFAULT_VARIANTS = {
    [TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]: 'warning',
    [TIP_ERROR_TYPES.RATE_LIMITED]: 'warning',
    [TIP_ERROR_TYPES.AUTH]: 'error',
    [TIP_ERROR_TYPES.NETWORK]: 'error',
    [TIP_ERROR_TYPES.ADDRESS_NOT_FOUND]: 'warning',
    [TIP_ERROR_TYPES.VALIDATION]: 'warning',
    [TIP_ERROR_TYPES.TRANSFER_FAILED]: 'error',
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

      // Check for ADDRESS_NOT_FOUND errors (404 with specific error codes or messages)
      const errorCode = detail?.error_code || '';
      if (status === 404 || errorCode === 'ADDRESS_NOT_FOUND' ||
          this._includes(normalizedMessage, 'address not found') ||
          this._includes(normalizedMessage, 'failed to resolve')) {
        const userMsg = this._formatAddressNotFound(normalizedMessage, detail);
        return {
          type: TIP_ERROR_TYPES.ADDRESS_NOT_FOUND,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.ADDRESS_NOT_FOUND]
        };
      }

      // Check for validation errors (amount limits, format issues)
      if (this._includes(normalizedMessage, 'minimum') ||
          this._includes(normalizedMessage, 'maximum') ||
          this._includes(normalizedMessage, 'invalid amount') ||
          this._includes(normalizedMessage, 'too small after fees') ||
          this._includes(normalizedMessage, 'decimal places') ||
          this._includes(normalizedMessage, 'not supported')) {
        const userMsg = this._formatValidationError(normalizedMessage, detail);
        return {
          type: TIP_ERROR_TYPES.VALIDATION,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.VALIDATION]
        };
      }

      // Check for transfer/provider errors (500s, settlement failures)
      if (status === 500 ||
          this._includes(normalizedMessage, 'settlement failed') ||
          this._includes(normalizedMessage, 'transfer failed') ||
          this._includes(normalizedMessage, 'provider') ||
          this._includes(normalizedMessage, 'funding wallet') ||
          errorCode === 'TRANSFER_FAILED' ||
          errorCode === 'INSUFFICIENT_GAS_IN_FUNDING_WALLET' ||
          errorCode === 'INSUFFICIENT_TOKEN_BALANCE' ||
          errorCode === 'WALLET_NOT_FOUND' ||
          errorCode === 'PROVIDER_API_ERROR') {
        const userMsg = 'There was an issue processing your tip. Please try again in a moment.';
        return {
          type: TIP_ERROR_TYPES.TRANSFER_FAILED,
          status,
          message: userMsg,
          userMessage: userMsg,
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.TRANSFER_FAILED]
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

    /**
     * Format address not found error into a user-friendly message.
     * Handles various sub-types: ENS resolution, Twitter user, no published address, etc.
     *
     * @param {string} normalizedMessage - Lowercase error message
     * @param {Object} detail - Error detail object from API response
     * @returns {string} - Formatted error message
     */
    static _formatAddressNotFound(normalizedMessage, detail = {}) {
      // Twitter user not found
      if (this._includes(normalizedMessage, 'twitter user not found') ||
          detail?.error_code === 'TWITTER_USER_NOT_FOUND') {
        return 'This Twitter user could not be found. Check the username and try again.';
      }

      // Twitter API issues
      if (this._includes(normalizedMessage, 'twitter api') ||
          detail?.error_code === 'TWITTER_API_CREDITS_EXHAUSTED' ||
          detail?.error_code === 'TWITTER_API_UNAVAILABLE') {
        return 'Twitter lookup is temporarily unavailable. Please try again later.';
      }

      // ENS resolution failed
      if (this._includes(normalizedMessage, 'ens')) {
        return 'Could not resolve this ENS name. Verify it exists and has an address set.';
      }

      // Address incompatible with network
      if (this._includes(normalizedMessage, 'incompatible with network')) {
        return 'This address is not compatible with the selected network. Try switching networks.';
      }

      // Adapter not implemented (Reddit, GitHub, etc.)
      if (this._includes(normalizedMessage, 'not yet implemented')) {
        return 'Tipping on this platform is not yet supported.';
      }

      // Generic: no address found
      // Use suggestion from API if available
      if (detail?.suggestion) {
        return detail.suggestion;
      }

      return 'Could not find a tippable address for this user. They may need to add one to their profile.';
    }

    /**
     * Format validation error into a user-friendly message.
     * Handles amount limits, format issues, unsupported tokens/networks.
     *
     * @param {string} normalizedMessage - Lowercase error message
     * @param {Object} detail - Error detail object from API response
     * @returns {string} - Formatted error message
     */
    static _formatValidationError(normalizedMessage, detail = {}) {
      // Below minimum
      if (this._includes(normalizedMessage, 'below minimum')) {
        // Try to extract the minimum amount from the message
        const minMatch = normalizedMessage.match(/minimum[:\s]+\$?([\d.]+)/);
        if (minMatch) {
          return `Tip amount is too small. Minimum is $${minMatch[1]}.`;
        }
        return 'Tip amount is below the minimum. Please increase the amount.';
      }

      // Exceeds maximum
      if (this._includes(normalizedMessage, 'exceeds maximum')) {
        const maxMatch = normalizedMessage.match(/maximum[:\s]+\$?([\d.]+)/);
        if (maxMatch) {
          return `Tip amount is too large. Maximum is $${maxMatch[1]}.`;
        }
        return 'Tip amount exceeds the maximum. Please reduce the amount.';
      }

      // Too small after fees
      if (this._includes(normalizedMessage, 'too small after fees')) {
        return 'Tip amount is too small after fees. Please increase the amount.';
      }

      // Invalid amount format
      if (this._includes(normalizedMessage, 'invalid amount')) {
        return 'Invalid tip amount. Please enter a valid number.';
      }

      // Decimal places
      if (this._includes(normalizedMessage, 'decimal places')) {
        return 'Too many decimal places. USDC supports up to 6 decimals.';
      }

      // Unsupported token or network
      if (this._includes(normalizedMessage, 'not supported')) {
        if (this._includes(normalizedMessage, 'token')) {
          return 'This token is not supported on the selected network.';
        }
        if (this._includes(normalizedMessage, 'currency')) {
          return 'This currency is not supported.';
        }
        return 'This configuration is not supported. Please check your settings.';
      }

      // Generic validation error
      return 'Invalid tip configuration. Please check the amount and try again.';
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
