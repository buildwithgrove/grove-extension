/**
 * Leaderboard Renderer Module
 * Pure rendering functions for leaderboard entries
 */

const LeaderboardRenderer = {
  // SVG Icons
  icons: {
    dollar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    xPlatform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
  },

  /**
   * Get block explorer URL for a transaction
   * @param {string} network - Network name
   * @param {string} txHash - Transaction hash
   * @returns {string|null} Explorer URL
   */
  getExplorerUrl(network, txHash) {
    if (!txHash) return null;

    const normalized = (network || '').toLowerCase().replace(/_/g, '-');

    if (normalized.includes('base')) {
      const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
      const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
      return `${baseUrl}/tx/${txHash}`;
    }

    if (normalized.includes('solana') || normalized.includes('sol')) {
      const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
      const cluster = isDevnet ? '?cluster=devnet' : '';
      return `https://solscan.io/tx/${txHash}${cluster}`;
    }

    return `https://basescan.org/tx/${txHash}`;
  },

  /**
   * Get block explorer URL for an address
   * @param {string} network - Network name
   * @param {string} address - Wallet address
   * @returns {string|null} Explorer URL
   */
  getAddressExplorerUrl(network, address) {
    if (!address) return null;

    const normalized = (network || '').toLowerCase().replace(/_/g, '-');

    if (normalized.includes('base')) {
      const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
      const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
      return `${baseUrl}/address/${address}`;
    }

    if (normalized.includes('solana') || normalized.includes('sol')) {
      const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
      const cluster = isDevnet ? '?cluster=devnet' : '';
      return `https://solscan.io/account/${address}${cluster}`;
    }

    return `https://basescan.org/address/${address}`;
  },

  /**
   * Get URL for the tipped content
   * @param {string} destination - Destination string
   * @returns {string|null} Full URL
   */
  getDestinationUrl(destination) {
    if (!destination) return null;

    if (destination.startsWith('http://') || destination.startsWith('https://')) {
      return destination;
    }

    return `https://${destination}`;
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
   * Build platform link HTML (X icon for Twitter)
   * @param {string} url - Platform URL
   * @param {boolean} isTwitter - Whether it's a Twitter link
   * @returns {string} HTML string
   */
  buildPlatformLink(url, isTwitter) {
    if (isTwitter && url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="View on X">${this.icons.xPlatform}</a>`;
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
    const explorerUrl = this.getExplorerUrl(network, txHash);
    if (explorerUrl) {
      return `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">${this.icons.link}</a>`;
    }
    return '<span class="history-tx-link history-tx-link-empty"></span>';
  },

  /**
   * Render a top tipper entry
   * @param {Object} entry - Tipper entry data
   * @param {number} index - Rank index (0-based)
   * @returns {string} HTML string
   */
  renderTipperEntry(entry, index) {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    const rankIcon = `<span class="rank-number">${index + 1}</span>`;
    const labelHtml = FormatUtils.formatAddress(entry.address);

    let descriptionHtml;
    if (ctx.recipient_username) {
      const postUrl = ctx.source_post_url || parsed.postUrl;
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      const linkUrl = postUrl || profileUrl;
      const linkText = postUrl ? `@${FormatUtils.escapeHtml(ctx.recipient_username)}'s post` : `@${FormatUtils.escapeHtml(ctx.recipient_username)}`;
      descriptionHtml = `Latest tip: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else if (parsed.profileHandle) {
      const linkUrl = parsed.postUrl || parsed.profileUrl;
      const linkText = parsed.postUrl ? `${parsed.profileHandle}'s post` : parsed.profileHandle;
      descriptionHtml = `Latest tip: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else {
      descriptionHtml = `${entry.tipCount.toLocaleString()} tips sent`;
    }

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
      </div>
    `;
  },

  /**
   * Render a top earner entry
   * @param {Object} entry - Earner entry data
   * @param {number} index - Rank index (0-based)
   * @returns {string} HTML string
   */
  renderEarnerEntry(entry, index) {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    const rankIcon = `<span class="rank-number">${index + 1}</span>`;

    let labelHtml;
    if (ctx.recipient_username) {
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      labelHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${FormatUtils.escapeHtml(ctx.recipient_username)}</a>`;
    } else if (parsed.profileHandle && parsed.profileUrl) {
      labelHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
    } else {
      labelHtml = FormatUtils.formatAddress(entry.address);
    }

    const descriptionHtml = `${entry.tipCount.toLocaleString()} tips received`;

    const isTwitter = this.isTwitterUrl(ctx.source_post_url) ||
      this.isTwitterUrl(parsed.profileUrl) ||
      this.isTwitterUrl(entry.lastTipSocialGraph);

    let platformUrl = ctx.source_post_url || parsed.postUrl || parsed.profileUrl ||
      (entry.lastTipSocialGraph && (entry.lastTipSocialGraph.startsWith('http') ? entry.lastTipSocialGraph : `https://${entry.lastTipSocialGraph}`));

    const platformLinkHtml = this.buildPlatformLink(platformUrl, isTwitter);

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a live tip entry
   * @param {Object} entry - Live tip entry data
   * @param {boolean} isNew - Whether this is a new entry (for animation)
   * @returns {string} HTML string
   */
  renderLiveTipEntry(entry, isNew = false) {
    const parsed = parseDestination(entry.destination);
    const ctx = entry.context || {};

    let labelHtml;
    if (ctx.recipient_username) {
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      labelHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${FormatUtils.escapeHtml(ctx.recipient_username)}</a>`;
    } else if (parsed.profileHandle) {
      labelHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(parsed.profileHandle)}</a>`;
    } else {
      const addressUrl = this.getAddressExplorerUrl(entry.network, entry.address);
      labelHtml = `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.formatAddress(entry.address)}</a>`;
    }

    const isTwitter = this.isTwitterUrl(ctx.source_post_url) || this.isTwitterUrl(parsed.profileUrl);
    const platformUrl = ctx.source_post_url || parsed.postUrl || parsed.profileUrl;
    const platformLinkHtml = this.buildPlatformLink(platformUrl, isTwitter);
    const txLinkHtml = this.buildTxLink(entry.network, entry.txHash);

    return `
      <div class="transaction-item${isNew ? ' new' : ''}">
        <div class="transaction-item-icon tip_received">${this.icons.dollar}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">Tip Received</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.amountUSD)}</div>
          <div class="transaction-item-time">${FormatUtils.formatTimeAgo(entry.confirmedAt)}</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
          ${txLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a list of tipper entries
   * @param {Array} entries - Array of tipper entries
   * @returns {string} HTML string
   */
  renderTippersList(entries) {
    return entries.map((entry, i) => this.renderTipperEntry(entry, i)).join('');
  },

  /**
   * Render a list of earner entries
   * @param {Array} entries - Array of earner entries
   * @returns {string} HTML string
   */
  renderEarnersList(entries) {
    return entries.map((entry, i) => this.renderEarnerEntry(entry, i)).join('');
  },

  /**
   * Render a list of live tip entries
   * @param {Array} entries - Array of live tip entries
   * @param {Set} newTxHashes - Set of new transaction hashes (for animation)
   * @returns {string} HTML string
   */
  renderLiveTipsList(entries, newTxHashes = new Set()) {
    return entries.map(entry => this.renderLiveTipEntry(entry, newTxHashes.has(entry.txHash))).join('');
  }
};
