/**
 * Format Utilities Module
 * Pure formatting functions for display values
 */

const FormatUtils = {
  /**
   * Default balance display value
   */
  DEFAULT_BALANCE_DISPLAY: '0.00',

  /**
   * Format balance for display
   * @param {string|number} balance - Balance value
   * @returns {string} Formatted balance
   */
  formatBalance(balance) {
    const parsed = parseFloat(balance);
    if (Number.isNaN(parsed)) {
      return this.DEFAULT_BALANCE_DISPLAY;
    }
    return parsed.toFixed(2);
  },

  /**
   * Format USD for pool display (compact: $1.5K, $2.3M)
   * @param {number} value - USD value
   * @returns {string} Formatted string
   */
  formatPoolUSD(value) {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return `$${value.toFixed(2)}`;
  },

  /**
   * Format USD value for stats display (compact)
   * @param {number} value - USD value
   * @returns {string} Formatted string
   */
  formatStatUSD(value) {
    if (value >= 999500) {
      // 999,500+ rounds to 1M or shows as X.XM
      return '$' + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (value >= 10000) {
      return '$' + Math.round(value / 1000) + 'K';
    } else if (value >= 1000) {
      return '$' + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else if (value >= 100) {
      return '$' + Math.round(value);
    } else {
      return '$' + value.toFixed(2);
    }
  },

  /**
   * Format count value for stats display (compact)
   * @param {number} value - Count value
   * @returns {string} Formatted string
   */
  formatStatCount(value) {
    if (value >= 999500) {
      // 999,500+ rounds to 1M or shows as X.XM
      return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (value >= 10000) {
      return Math.round(value / 1000) + 'K';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      return value.toString();
    }
  },

  /**
   * Truncate destination string
   * @param {string} dest - Destination string
   * @returns {string} Truncated string
   */
  truncateDestination(dest) {
    if (!dest) return '';
    if (dest.length <= 24) return dest;
    return dest.slice(0, 24) + '...';
  },

  /**
   * Format network name
   * @param {string} network - Network identifier
   * @returns {string} Formatted network name
   */
  formatNetwork(network) {
    if (!network) return '';
    if (network.includes('base')) return 'Base';
    if (network.includes('solana')) return 'Solana';
    return network.charAt(0).toUpperCase() + network.slice(1);
  },

  /**
   * Format history amount with sign
   * @param {Object} tx - Transaction object with type and amount_usd
   * @returns {string} Formatted amount with sign
   */
  formatHistoryAmount(tx) {
    const amount = parseFloat(tx.amount_usd) || 0;
    const formatted = this.formatUSD(amount);
    if (tx.type === 'tip_sent') {
      return '-' + formatted;
    }
    return '+' + formatted;
  },

  /**
   * Format relative time (enhanced version)
   * @param {string} dateString - ISO date string
   * @returns {string} Relative time string
   */
  formatRelativeTime(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const then = new Date(dateString);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

    const days = Math.floor(seconds / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    // Format as date for older items
    return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Format Address (shorten)
   * @param {string} address - Wallet address
   * @returns {string} Shortened address
   */
  formatAddress(address) {
    if (!address) return 'Unknown';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  /**
   * Format USD Amount (always at least 2 decimals, up to 6 when needed)
   * @param {number} amount - USD amount
   * @returns {string} Formatted USD string
   */
  formatUSD(amount) {
    if (amount >= 1000) {
      return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (amount >= 0.01) {
      return '$' + amount.toFixed(2);
    }
    // For very small amounts, show up to 6 decimals but keep at least 2
    const formatted = amount.toFixed(6).replace(/0+$/, '');
    // Ensure at least 2 decimal places
    const decimalPart = formatted.split('.')[1] || '';
    if (decimalPart.length < 2) {
      return '$' + amount.toFixed(2);
    }
    return '$' + formatted;
  },

  /**
   * Format Time Ago
   * @param {string|Date} timestamp - Timestamp
   * @returns {string} Relative time string
   */
  formatTimeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now - then) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  },

  /**
   * Escape HTML to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};
