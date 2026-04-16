/**
 * History Renderer Module
 * Pure rendering functions for transaction history entries
 */

const HistoryRenderer = {
  // SVG Icons
  icons: {
    tipSent: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>',
    tipReceived: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    deposit: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
    failed: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    default: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>',
    xPlatform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    youtube: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
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
      case 'tip_sent': return 'Tipped';
      case 'tip_received': return 'Earned';
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
   * Build description HTML for a transaction
   * @param {Object} tx - Transaction object
   * @param {Object} parsed - Parsed destination
   * @param {Object} ctx - Transaction context
   * @returns {string} HTML string
   */
  buildDescriptionHtml(tx, parsed, ctx) {
    // Helper: parse a handle from a URL
    const socialParsed = tx.social_graph ? parseDestination(tx.social_graph) : null;

    // Helper: check if a URL is a Grove profile and return its handle
    const groveHandleFrom = (url) => {
      if (!url) return null;
      const p = parseDestination(url);
      if (p && p.profileHandle && p.profileUrl && p.profileUrl.includes('grove.city')) {
        return { handle: p.profileHandle, url: p.profileUrl };
      }
      return null;
    };

    // Helper: build a link element
    const link = (href, label) =>
      `<a href="${FormatUtils.escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(label)}</a>`;

    if (tx.type === 'tip_sent') {
      // 1. Grove handle — from context profile URL or destination
      const groveFromCtx = groveHandleFrom(ctx.recipient_profile_url);
      if (groveFromCtx) return link(groveFromCtx.url, groveFromCtx.handle);
      const groveFromDest = groveHandleFrom(tx.destination);
      if (groveFromDest) return link(groveFromDest.url, groveFromDest.handle);
      // 2. Social username from context
      if (ctx.recipient_username) {
        return link(ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`, `@${ctx.recipient_username}`);
      }
      // 3. Handle parsed from destination URL
      if (parsed.profileHandle && parsed.profileUrl) {
        return link(parsed.profileUrl, parsed.profileHandle);
      }
      if (socialParsed && socialParsed.profileHandle && socialParsed.profileUrl) {
        return link(socialParsed.profileUrl, socialParsed.profileHandle);
      }
      // 4. Link to post
      if (parsed.postUrl) {
        return link(parsed.postUrl, FormatUtils.truncateDestination(tx.destination));
      }
      // 5. Address
      if (tx.counterparty_address) {
        return link(LeaderboardRenderer.getAddressExplorerUrl(tx.network, tx.counterparty_address), FormatUtils.formatAddress(tx.counterparty_address));
      }
      return FormatUtils.formatNetwork(tx.network);
    } else if (tx.type === 'tip_received') {
      // 1. Grove handle — from context profile URL
      const groveFromCtx = groveHandleFrom(ctx.sender_profile_url);
      if (groveFromCtx) return link(groveFromCtx.url, groveFromCtx.handle);
      // 2. Social username from context
      if (ctx.sender_username) {
        return link(ctx.sender_profile_url || `https://x.com/${ctx.sender_username}`, `@${ctx.sender_username}`);
      }
      // 3. Handle parsed from destination/social_graph
      if (parsed.profileHandle && parsed.profileUrl) {
        return link(parsed.profileUrl, parsed.profileHandle);
      }
      if (socialParsed && socialParsed.profileHandle && socialParsed.profileUrl) {
        return link(socialParsed.profileUrl, socialParsed.profileHandle);
      }
      // 4. Address
      if (tx.counterparty_address) {
        return link(LeaderboardRenderer.getAddressExplorerUrl(tx.network, tx.counterparty_address), FormatUtils.formatAddress(tx.counterparty_address));
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
    // Normalize social graph URL
    const socialGraphUrl = tx.social_graph
      ? (tx.social_graph.startsWith('http') ? tx.social_graph : `https://${tx.social_graph}`)
      : null;

    // Candidate URLs in priority order
    const candidates = [
      ctx.source_post_url,
      parsed.postUrl,
      parsed.profileUrl,
      socialGraphUrl,
    ].filter(Boolean);

    // Normalize explicit platform name from context
    let platform = null;
    if (ctx.sender_platform) {
      const p = ctx.sender_platform.toLowerCase();
      platform = (p === 'twitter') ? 'x' : p;
    }

    // Detect from URLs if no explicit platform
    let platformUrl = ctx.source_post_url || null;
    if (!platform) {
      for (const url of candidates) {
        const detected = LeaderboardRenderer.detectPlatform(url);
        if (detected && detected !== 'website') {
          platform = detected;
          platformUrl = url;
          break;
        }
      }
    } else if (!platformUrl) {
      platformUrl = candidates[0] || null;
    }

    if (platform && platformUrl) {
      return LeaderboardRenderer.getPlatformIcon(platform, platformUrl);
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
    const amountClass = isFailed ? 'failed' : (tx.type === 'tip_sent' ? 'sent' : (tx.type === 'deposit' ? 'deposit' : 'received'));

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
  },

  /**
   * Calculate summary statistics from transactions
   * @param {Array} transactions - Array of transaction objects
   * @returns {Object} Summary with given, earned, deposits totals and counts
   */
  calculateSummary(transactions) {
    const summary = {
      givenAmount: 0,
      givenCount: 0,
      earnedAmount: 0,
      earnedCount: 0,
      depositsAmount: 0,
      depositsCount: 0
    };

    for (const tx of transactions) {
      // Skip failed transactions from summary
      if (tx.status === 'failed') continue;

      const amount = parseFloat(tx.amount_usd) || 0;
      if (tx.type === 'tip_sent') {
        summary.givenAmount += amount;
        summary.givenCount++;
      } else if (tx.type === 'tip_received') {
        summary.earnedAmount += amount;
        summary.earnedCount++;
      } else if (tx.type === 'deposit') {
        summary.depositsAmount += amount;
        summary.depositsCount++;
      }
    }

    return summary;
  },

  /**
   * Render compact stats summary row
   * @param {Object} summary - Summary object from calculateSummary
   * @returns {string} HTML string
   */
  renderStatsSummary(summary) {
    return `
      <div class="history-stats-row">
        <div class="history-stat-item given">
          <div class="history-stat-value">${FormatUtils.formatStatUSD(summary.givenAmount)}</div>
          <div class="history-stat-count">${summary.givenCount}</div>
          <div class="history-stat-label">tips sent</div>
        </div>
        <div class="history-stat-item earned">
          <div class="history-stat-value">${FormatUtils.formatStatUSD(summary.earnedAmount)}</div>
          <div class="history-stat-count">${summary.earnedCount}</div>
          <div class="history-stat-label">tips earned</div>
        </div>
        <div class="history-stat-item deposits">
          <div class="history-stat-value">${FormatUtils.formatStatUSD(summary.depositsAmount)}</div>
          <div class="history-stat-count">${summary.depositsCount}</div>
          <div class="history-stat-label">${summary.depositsCount === 1 ? 'deposit' : 'deposits'}</div>
        </div>
      </div>
    `;
  }
};

// Make globally available
if (typeof window !== 'undefined') {
  window.HistoryRenderer = HistoryRenderer;
}
