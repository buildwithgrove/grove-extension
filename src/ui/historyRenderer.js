/**
 * History Renderer Module
 * Pure rendering functions for transaction history entries
 */

const HistoryRenderer = {
  // SVG Icons
  icons: {
    tipSent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>',
    tipReceived: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m0 0l7-7m-7 7l-7-7"/></svg>',
    deposit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    failed: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    default: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
    xPlatform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  },

  /**
   * Get transaction icon based on type
   * @param {string} type - Transaction type
   * @returns {string} SVG icon HTML
   */
  getTransactionIcon(type) {
    switch (type) {
      case 'tip_sent': return this.icons.tipSent;
      case 'tip_received': return this.icons.tipReceived;
      case 'deposit': return this.icons.deposit;
      case 'failed': return this.icons.failed;
      default: return this.icons.default;
    }
  },

  /**
   * Get transaction label based on type
   * @param {string} type - Transaction type
   * @returns {string} Human-readable label
   */
  getTransactionLabel(type) {
    switch (type) {
      case 'tip_sent': return 'Tip Sent';
      case 'tip_received': return 'Tip Received';
      case 'deposit': return 'Deposit';
      default: return 'Transaction';
    }
  },

  /**
   * Get transaction description (fallback when no context)
   * @param {Object} tx - Transaction object
   * @returns {string} Description text
   */
  getTransactionDescription(tx) {
    if (tx.type === 'tip_sent' || tx.type === 'tip_received') {
      if (tx.destination) {
        return FormatUtils.truncateDestination(tx.destination);
      }
      if (tx.counterparty_address) {
        return FormatUtils.formatAddress(tx.counterparty_address);
      }
      return FormatUtils.formatNetwork(tx.network);
    }
    return FormatUtils.formatNetwork(tx.network);
  },

  /**
   * Check if URL is Twitter/X
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isTwitterUrl(url) {
    return url && (url.includes('x.com') || url.includes('twitter.com'));
  },

  /**
   * Build description HTML for a transaction
   * @param {Object} tx - Transaction object
   * @param {Object} parsed - Parsed destination
   * @param {Object} ctx - Transaction context
   * @returns {string} HTML string
   */
  buildDescriptionHtml(tx, parsed, ctx) {
    if (tx.type === 'tip_sent') {
      if (ctx.recipient_username) {
        const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
        return `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${FormatUtils.escapeHtml(ctx.recipient_username)}</a>`;
      } else if (parsed.profileHandle && parsed.profileUrl) {
        return `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
      } else if (parsed.postUrl) {
        return `<a href="${parsed.postUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.truncateDestination(tx.destination)}</a>`;
      } else if (tx.counterparty_address) {
        const addressUrl = LeaderboardRenderer.getAddressExplorerUrl(tx.network, tx.counterparty_address);
        return `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.formatAddress(tx.counterparty_address)}</a>`;
      }
      return FormatUtils.formatNetwork(tx.network);
    } else if (tx.type === 'tip_received') {
      if (ctx.sender_username) {
        const profileUrl = ctx.sender_profile_url || `https://x.com/${ctx.sender_username}`;
        return `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${FormatUtils.escapeHtml(ctx.sender_username)}</a>`;
      } else if (tx.counterparty_address) {
        const addressUrl = LeaderboardRenderer.getAddressExplorerUrl(tx.network, tx.counterparty_address);
        return `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.formatAddress(tx.counterparty_address)}</a>`;
      } else if (parsed.profileHandle && parsed.profileUrl) {
        return `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
      }
      return FormatUtils.formatNetwork(tx.network);
    } else {
      // Deposits and other types
      if (tx.counterparty_address) {
        const addressUrl = LeaderboardRenderer.getAddressExplorerUrl(tx.network, tx.counterparty_address);
        return `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.formatAddress(tx.counterparty_address)}</a>`;
      }
      return FormatUtils.formatNetwork(tx.network);
    }
  },

  /**
   * Build platform link HTML for a transaction
   * @param {Object} tx - Transaction object
   * @param {Object} parsed - Parsed destination
   * @param {Object} ctx - Transaction context
   * @returns {string} HTML string
   */
  buildPlatformLink(tx, parsed, ctx) {
    const isTwitterFromContext = ctx.sender_platform === 'twitter' || ctx.sender_platform === 'x' ||
      (ctx.source_post_url && this.isTwitterUrl(ctx.source_post_url));
    const isTwitterFromDestination = this.isTwitterUrl(parsed.profileUrl);
    const isTwitterFromSocialGraph = this.isTwitterUrl(tx.social_graph);
    const isTwitter = isTwitterFromContext || isTwitterFromDestination || isTwitterFromSocialGraph;

    let platformUrl = null;
    let platformTitle = 'View on X';

    if (ctx.source_post_url) {
      platformUrl = ctx.source_post_url;
      platformTitle = ctx.source_post_url.includes('/status/') ? 'View post' : 'View profile';
    } else if (isTwitterFromDestination) {
      platformUrl = parsed.postUrl || parsed.profileUrl;
      platformTitle = parsed.postUrl ? 'View post' : 'View profile';
    } else if (isTwitterFromSocialGraph) {
      platformUrl = tx.social_graph.startsWith('http') ? tx.social_graph : `https://${tx.social_graph}`;
      platformTitle = 'View source';
    }

    if (isTwitter && platformUrl) {
      return `<a href="${platformUrl}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="${platformTitle}">${this.icons.xPlatform}</a>`;
    }
    return '<span class="history-platform-link history-platform-link-empty"></span>';
  },

  /**
   * Build transaction link HTML
   * @param {string} network - Network name
   * @param {string} txHash - Transaction hash
   * @returns {string} HTML string
   */
  buildTxLink(network, txHash) {
    const explorerUrl = LeaderboardRenderer.getExplorerUrl(network, txHash);
    if (explorerUrl) {
      return `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">${this.icons.link}</a>`;
    }
    return '<span class="history-tx-link history-tx-link-empty"></span>';
  },

  /**
   * Render a single history entry
   * @param {Object} tx - Transaction object
   * @returns {string} HTML string
   */
  renderHistoryEntry(tx) {
    const isFailed = tx.status === 'failed';
    const icon = isFailed ? this.getTransactionIcon('failed') : this.getTransactionIcon(tx.type);
    const label = isFailed ? 'Tip Failed' : this.getTransactionLabel(tx.type);
    const amount = FormatUtils.formatHistoryAmount(tx);
    const time = FormatUtils.formatRelativeTime(tx.created_at);
    const amountClass = isFailed ? 'failed' : (tx.type === 'tip_sent' ? 'sent' : 'received');

    const parsed = parseDestination(tx.destination);
    const ctx = tx.context || {};

    const descriptionHtml = this.buildDescriptionHtml(tx, parsed, ctx);
    const platformLinkHtml = this.buildPlatformLink(tx, parsed, ctx);
    const txLinkHtml = this.buildTxLink(tx.network, tx.tx_hash);

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon ${isFailed ? 'failed' : tx.type}">${icon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${descriptionHtml}</div>
          <div class="transaction-item-description">${label}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount ${amountClass}">${amount}</div>
          <div class="transaction-item-time">${time}</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
          ${txLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a list of history entries
   * @param {Array} transactions - Array of transaction objects
   * @returns {string} HTML string
   */
  renderHistoryList(transactions) {
    return transactions.map(tx => this.renderHistoryEntry(tx)).join('');
  }
};
