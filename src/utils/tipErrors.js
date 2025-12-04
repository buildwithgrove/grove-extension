/**
 * Tip Error Handling Utilities
 * Normalizes backend responses and shows user-facing messages.
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
    * Normalize an error response from GroveAPI.sendTip
    * @param {Object|Error|string} raw - Raw error response or exception
    * @returns {Object} - Normalized error { type, status, message, detail, variant }
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
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.INSUFFICIENT_BALANCE]
        };
      }

      if (status === 401 || status === 403 || this._includes(normalizedMessage, 'unauthorized') || this._includes(normalizedMessage, 'forbidden')) {
        return {
          type: TIP_ERROR_TYPES.AUTH,
          status,
          message: 'Your Grove session expired. Reconnect your account in the extension to keep tipping.',
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.AUTH]
        };
      }

      if (status === 429 || this._includes(normalizedMessage, 'rate limit')) {
        return {
          type: TIP_ERROR_TYPES.RATE_LIMITED,
          status,
          message: 'You are tipping too quickly. Please wait a few seconds and try again.',
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.RATE_LIMITED]
        };
      }

      if (this._includes(normalizedMessage, 'network') || this._includes(normalizedMessage, 'fetch') || this._includes(normalizedMessage, 'failed to fetch')) {
        return {
          type: TIP_ERROR_TYPES.NETWORK,
          status,
          message: 'Network issue while sending your tip. Check your connection and retry.',
          detail: detail || {},
          variant: DEFAULT_VARIANTS[TIP_ERROR_TYPES.NETWORK]
        };
      }

      return {
        type: TIP_ERROR_TYPES.UNKNOWN,
        status,
        message: baseMessage || 'Tip failed. Please try again.',
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
    static showInlineMessage(targetEl, message, variant = 'error', durationMs = 3600) {
      if (!targetEl || !message) return;

      // Remove previous bubble if present
      if (this._activeBubble && this._activeBubble.remove) {
        this._activeBubble.remove();
        this._activeBubble = null;
      }

      const bubble = document.createElement('div');
      bubble.className = 'grove-tip-inline-message';
      bubble.dataset.variant = variant;
      bubble.textContent = message;
      bubble.style.top = '0px';
      bubble.style.left = '0px';
      bubble.style.visibility = 'hidden';
      bubble.style.pointerEvents = 'none';

      document.body.appendChild(bubble);

      const rect = targetEl.getBoundingClientRect();
      const bubbleRect = bubble.getBoundingClientRect();

      const top = rect.bottom + window.scrollY + 8;
      let left = rect.left + window.scrollX + (rect.width / 2) - (bubbleRect.width / 2);
      left = Math.max(12, Math.min(left, window.scrollX + window.innerWidth - bubbleRect.width - 12));

      bubble.style.top = `${top}px`;
      bubble.style.left = `${left}px`;
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
    }

    // ----- Internal helpers -----

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
        return value;
      }
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
  }
})();
