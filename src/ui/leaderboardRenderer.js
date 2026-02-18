/**
 * Leaderboard Renderer Module
 * Pure rendering functions for leaderboard entries
 */

const LeaderboardRenderer = {
  // SVG Icons
  icons: {
    dollar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    xPlatform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    // Platform icons
    grove: '<svg width="14" height="14" viewBox="0 0 100 100" fill="currentColor"><path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 80c-19.3 0-35-15.7-35-35s15.7-35 35-35 35 15.7 35 35-15.7 35-35 35z"/><path d="M50 25c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15z"/></svg>',
    substack: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>',
    base: '<svg width="14" height="14" viewBox="0 0 111 111" fill="currentColor"><path d="M54.921 110.034c30.291 0 54.86-24.569 54.86-54.86S85.212.314 54.921.314C26.042.314 2.128 22.678.079 51.334h72.102v7.396H.08c2.048 28.656 25.963 51.304 54.842 51.304z"/></svg>',
    ens: '<svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor"><path d="M10.502 6.748c.509-.841 1.437-1.322 2.382-1.322a2.7 2.7 0 011.404.403l18.09 11.19a3.4 3.4 0 011.467 2.292c.088.491.04.898.04 1.475l-.002 8.99c-.022.55-.088 1.16-.44 1.74l-5.854 9.678a.32.32 0 01-.556-.025l-.027-.072-5.476-17.52a3.74 3.74 0 01.02-2.213l3.62-10.72a.26.26 0 00-.347-.327l-12.98 6.067a.32.32 0 01-.465-.295l.002-8.56c.001-.32.041-.545.122-.782zm26.996 34.504c-.509.841-1.437 1.322-2.382 1.322a2.7 2.7 0 01-1.404-.403l-18.09-11.19a3.4 3.4 0 01-1.467-2.292c-.088-.491-.04-.898-.04-1.475l.002-8.99c.022-.55.088-1.16.44-1.74l5.854-9.678a.32.32 0 01.556.025l.027.072 5.476 17.52a3.74 3.74 0 01-.02 2.213l-3.62 10.72a.26.26 0 00.347.327l12.98-6.067a.32.32 0 01.465.295l-.002 8.56c-.001.32-.041.545-.122.782z"/></svg>',
    globe: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
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
   * Format address with shorter truncation (8 chars total)
   * @param {string} address - Wallet address
   * @returns {string} Shortened address (4...4)
   */
  formatAddressShort(address) {
    if (!address) return 'Unknown';
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  },

  /**
   * Detect platform from URL or destination
   * @param {string} destination - URL or destination string
   * @returns {string} Platform name: 'x', 'substack', 'grove', 'base', 'ens', 'website', or null
   */
  detectPlatform(destination) {
    if (!destination) return null;
    const lower = destination.toLowerCase();
    if (lower.includes('x.com') || lower.includes('twitter.com')) return 'x';
    if (lower.includes('substack.com')) return 'substack';
    if (lower.includes('grove.city')) return 'grove';
    if (lower.includes('base.org') || lower.includes('basescan.org')) return 'base';
    if (lower.includes('ens.domains') || lower.endsWith('.eth')) return 'ens';
    // If it looks like a URL, it's a website
    if (lower.includes('http') || lower.includes('www.') || lower.includes('.com') || lower.includes('.org') || lower.includes('.io')) {
      return 'website';
    }
    return null;
  },

  /**
   * Get platform icon HTML with link
   * @param {string} platform - Platform name
   * @param {string} url - URL to link to
   * @returns {string} HTML string
   */
  getPlatformIcon(platform, url) {
    const iconMap = {
      'x': { icon: this.icons.xPlatform, title: 'View on X', cssClass: 'platform-x' },
      'substack': { icon: this.icons.substack, title: 'View on Substack', cssClass: 'platform-substack' },
      'grove': { icon: this.icons.grove, title: 'View on Grove', cssClass: 'platform-grove' },
      'base': { icon: this.icons.base, title: 'View on Base', cssClass: 'platform-base' },
      'ens': { icon: this.icons.ens, title: 'View on ENS', cssClass: 'platform-ens' },
      'website': { icon: this.icons.globe, title: 'Visit website', cssClass: 'platform-website' }
    };

    const config = iconMap[platform];
    if (!config || !url) {
      return '<span class="history-platform-link history-platform-link-empty"></span>';
    }

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="history-platform-link platform-icon ${config.cssClass}" title="${config.title}">${config.icon}</a>`;
  },

  /**
   * Get display name for leaderboard entry with priority logic
   * Priority: handle > base_name > ens_name > context username > parsed handle > address
   * @param {Object} entry - Leaderboard entry
   * @param {boolean} isEarner - Whether this is an earner entry (affects context field name)
   * @returns {Object} { displayName, url, platform }
   */
  getDisplayName(entry, isEarner = false) {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    // 1. Grove handle (from API)
    if (entry.handle) {
      return {
        displayName: entry.handle,
        url: `https://grove.city/@${encodeURIComponent(entry.handle)}`,
        platform: 'grove'
      };
    }

    // 2. Base name
    if (entry.base_name) {
      return {
        displayName: entry.base_name,
        url: `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`,
        platform: 'base'
      };
    }

    // 3. ENS name
    if (entry.ens_name) {
      return {
        displayName: entry.ens_name,
        url: `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`,
        platform: 'ens'
      };
    }

    // 4. Context username (recipient for earners, sender for tippers)
    const username = isEarner ? ctx.recipient_username : ctx.sender_username;
    const profileUrl = isEarner ? ctx.recipient_profile_url : ctx.sender_profile_url;
    if (username) {
      const url = profileUrl || `https://x.com/${encodeURIComponent(username)}`;
      return {
        displayName: `@${username}`,
        url: url,
        platform: 'x'
      };
    }

    // 5. Parsed profile handle from destination
    if (parsed.profileHandle && parsed.profileUrl) {
      const platform = this.detectPlatform(parsed.profileUrl);
      return {
        displayName: parsed.profileHandle,
        url: parsed.profileUrl,
        platform: platform
      };
    }

    // 6. Fallback to address (shorter truncation)
    const addressUrl = this.getAddressExplorerUrl(entry.network, entry.address);
    return {
      displayName: this.formatAddressShort(entry.address),
      url: addressUrl,
      platform: null
    };
  },

  /**
   * Render a top tipper entry
   * @param {Object} entry - Tipper entry data
   * @param {number} index - Rank index (0-based)
   * @returns {string} HTML string
   */
  renderTipperEntry(entry, index) {
    const ctx = entry.topTipContext || entry.lastTipContext || {};
    const tipDest = entry.topTipDestination || entry.lastTipDestination;
    const parsed = tipDest ? parseDestination(tipDest) : {};

    const rankIcon = `<span class="rank-number">${index + 1}</span>`;

    // Get display name for the tipper
    const display = this.getDisplayName(entry, false);
    const labelHtml = display.url
      ? `<a href="${display.url}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(display.displayName)}</a>`
      : FormatUtils.escapeHtml(display.displayName);

    // Platform icon for the tipper
    const platformLinkHtml = this.getPlatformIcon(display.platform, display.url);

    const tipLabel = entry.topTipContext ? 'Top tip' : 'Latest tip';
    let descriptionHtml;
    if (ctx.recipient_username) {
      const postUrl = ctx.source_post_url || parsed.postUrl;
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      const linkUrl = postUrl || profileUrl;
      const linkText = postUrl ? `@${FormatUtils.escapeHtml(ctx.recipient_username)}'s post` : `@${FormatUtils.escapeHtml(ctx.recipient_username)}`;
      descriptionHtml = `${tipLabel}: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else if (parsed.profileHandle) {
      const linkUrl = parsed.postUrl || parsed.profileUrl;
      const linkText = parsed.postUrl ? `${parsed.profileHandle}'s post` : parsed.profileHandle;
      descriptionHtml = `${tipLabel}: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
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
        <div class="transaction-item-links">
          ${platformLinkHtml}
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
    const rankIcon = `<span class="rank-number">${index + 1}</span>`;

    // Get display name for the earner
    const display = this.getDisplayName(entry, true);
    const labelHtml = display.url
      ? `<a href="${display.url}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(display.displayName)}</a>`
      : FormatUtils.escapeHtml(display.displayName);

    const descriptionHtml = `${entry.tipCount.toLocaleString()} tips received`;

    // Platform icon for the earner
    const platformLinkHtml = this.getPlatformIcon(display.platform, display.url);

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

    // Build display info for recipient using similar priority logic
    let displayName, displayUrl, displayPlatform;

    // 1. Grove handle
    if (entry.handle) {
      displayName = entry.handle;
      displayUrl = `https://grove.city/@${encodeURIComponent(entry.handle)}`;
      displayPlatform = 'grove';
    }
    // 2. Base name
    else if (entry.base_name) {
      displayName = entry.base_name;
      displayUrl = `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`;
      displayPlatform = 'base';
    }
    // 3. ENS name
    else if (entry.ens_name) {
      displayName = entry.ens_name;
      displayUrl = `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`;
      displayPlatform = 'ens';
    }
    // 4. Context recipient username
    else if (ctx.recipient_username) {
      displayName = `@${ctx.recipient_username}`;
      displayUrl = ctx.recipient_profile_url || `https://x.com/${encodeURIComponent(ctx.recipient_username)}`;
      displayPlatform = 'x';
    }
    // 5. Parsed handle
    else if (parsed.profileHandle && parsed.profileUrl) {
      displayName = parsed.profileHandle;
      displayUrl = parsed.profileUrl;
      displayPlatform = this.detectPlatform(parsed.profileUrl);
    }
    // 6. Address fallback
    else {
      displayName = this.formatAddressShort(entry.address);
      displayUrl = this.getAddressExplorerUrl(entry.network, entry.address);
      displayPlatform = null;
    }

    const labelHtml = displayUrl
      ? `<a href="${displayUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(displayName)}</a>`
      : FormatUtils.escapeHtml(displayName);

    const platformLinkHtml = this.getPlatformIcon(displayPlatform, displayUrl);
    const txLinkHtml = this.buildTxLink(entry.network, entry.txHash);

    return `
      <div class="transaction-item${isNew ? ' new' : ''}">
        <div class="transaction-item-icon tip_received">${this.icons.dollar}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">Earned</div>
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
    return this.renderTippersTable(entries);
  },

  /**
   * Render a list of earner entries
   * @param {Array} entries - Array of earner entries
   * @returns {string} HTML string
   */
  renderEarnersList(entries) {
    return this.renderEarnersTable(entries);
  },

  /**
   * Render a list of live tip entries
   * @param {Array} entries - Array of live tip entries
   * @param {Set} newTxHashes - Set of new transaction hashes (for animation)
   * @returns {string} HTML string
   */
  renderLiveTipsList(entries, newTxHashes = new Set()) {
    return this.renderLiveTipsTable(entries, newTxHashes);
  },

  // ---- Table-based rendering ----

  /**
   * Get rank class for top 3 positions
   * @param {number} index - 0-based rank index
   * @returns {string} CSS class name
   */
  getRankClass(index) {
    if (index === 0) return 'rank1';
    if (index === 1) return 'rank2';
    if (index === 2) return 'rank3';
    return '';
  },

  /**
   * Build platform icon cell HTML for table
   * @param {string} platform - Platform name
   * @param {string} url - URL to link to
   * @returns {string} HTML string for td content
   */
  buildPlatformIconCell(platform, url) {
    const iconMap = {
      'x': { icon: this.icons.xPlatform, title: 'View on X' },
      'substack': { icon: this.icons.substack, title: 'View on Substack' },
      'grove': { icon: this.icons.grove, title: 'View on Grove' },
      'base': { icon: this.icons.base, title: 'View on Base' },
      'ens': { icon: this.icons.ens, title: 'View on ENS' },
      'website': { icon: this.icons.globe, title: 'Visit website' }
    };

    const config = iconMap[platform];
    if (!config || !url) return '';

    return `<a href="${url}" target="_blank" rel="noopener noreferrer" title="${config.title}">${config.icon}</a>`;
  },

  /**
   * Get the tipped content platform and URL from entry context/destination
   * @param {Object} entry - Leaderboard entry with lastTipContext/lastTipDestination or context/destination
   * @returns {{ platform: string|null, url: string|null }}
   */
  getContentPlatform(entry) {
    // Only surface actual content platforms, not identity platforms
    const contentPlatforms = new Set(['x', 'substack', 'website']);
    // Prefer top tip (highest volume) over last tip for more meaningful display
    const ctx = entry.topTipContext || entry.lastTipContext || entry.context || {};
    const destination = entry.topTipDestination || entry.lastTipDestination || entry.destination;

    // Prefer source post URL (most specific content link)
    const contentUrl = ctx.source_post_url || destination;
    if (contentUrl) {
      const url = this.getDestinationUrl(contentUrl);
      const platform = this.detectPlatform(contentUrl);
      if (contentPlatforms.has(platform) && url) return { platform, url };
    }

    // Fall back to profile URL from context
    const profileUrl = ctx.recipient_profile_url || ctx.sender_profile_url;
    if (profileUrl) {
      const platform = this.detectPlatform(profileUrl);
      if (contentPlatforms.has(platform)) return { platform, url: profileUrl };
    }

    return { platform: null, url: null };
  },

  /**
   * Render tippers as a table
   * @param {Array} entries - Array of tipper entries
   * @returns {string} HTML table string
   */
  renderTippersTable(entries) {
    const rows = entries.map((entry, i) => {
      const display = this.getDisplayName(entry, false);
      const rankClass = this.getRankClass(i);
      const nameHtml = display.url
        ? `<a href="${display.url}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(display.displayName)}</a>`
        : FormatUtils.escapeHtml(display.displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      return `<tr>
        <td class="lb-col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">${entry.tipCount.toLocaleString()} tips sent</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.totalUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render earners as a table
   * @param {Array} entries - Array of earner entries
   * @returns {string} HTML table string
   */
  renderEarnersTable(entries) {
    const rows = entries.map((entry, i) => {
      const display = this.getDisplayName(entry, true);
      const rankClass = this.getRankClass(i);
      const nameHtml = display.url
        ? `<a href="${display.url}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(display.displayName)}</a>`
        : FormatUtils.escapeHtml(display.displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      return `<tr>
        <td class="lb-col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">${entry.tipCount.toLocaleString()} tips earned</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.totalUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render live tips as a table
   * @param {Array} entries - Array of live tip entries
   * @param {Set} newTxHashes - Set of new transaction hashes (for animation)
   * @returns {string} HTML table string
   */
  renderLiveTipsTable(entries, newTxHashes = new Set()) {
    const rows = entries.map(entry => {
      const isNew = newTxHashes.has(entry.txHash);
      const parsed = parseDestination(entry.destination);
      const ctx = entry.context || {};

      // Build display info for recipient
      let displayName, displayUrl, displayPlatform;
      if (entry.handle) {
        displayName = entry.handle;
        displayUrl = `https://grove.city/@${encodeURIComponent(entry.handle)}`;
        displayPlatform = 'grove';
      } else if (entry.base_name) {
        displayName = entry.base_name;
        displayUrl = `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`;
        displayPlatform = 'base';
      } else if (entry.ens_name) {
        displayName = entry.ens_name;
        displayUrl = `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`;
        displayPlatform = 'ens';
      } else if (ctx.recipient_username) {
        displayName = `@${ctx.recipient_username}`;
        displayUrl = ctx.recipient_profile_url || `https://x.com/${encodeURIComponent(ctx.recipient_username)}`;
        displayPlatform = 'x';
      } else if (parsed.profileHandle && parsed.profileUrl) {
        displayName = parsed.profileHandle;
        displayUrl = parsed.profileUrl;
        displayPlatform = this.detectPlatform(parsed.profileUrl);
      } else {
        displayName = this.formatAddressShort(entry.address);
        displayUrl = this.getAddressExplorerUrl(entry.network, entry.address);
        displayPlatform = null;
      }

      const nameHtml = displayUrl
        ? `<a href="${displayUrl}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(displayName)}</a>`
        : FormatUtils.escapeHtml(displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      // Time column: tx-linked "Xm ago"
      const timeText = FormatUtils.formatTimeAgo(entry.confirmedAt);
      const explorerUrl = this.getExplorerUrl(entry.network, entry.txHash);
      const timeHtml = explorerUrl
        ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="lb-time-link">${timeText}</a>`
        : `<span class="lb-time-link">${timeText}</span>`;

      return `<tr${isNew ? ' class="lb-new"' : ''}>
        <td class="lb-col-time">${timeHtml}</td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">earned tip</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.amountUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render a skeleton loading table
   * @param {boolean} isLive - Whether this is the live view (uses time column instead of rank)
   * @param {number} rowCount - Number of skeleton rows
   * @returns {string} HTML table string
   */
  renderSkeletonTable(isLive = false, rowCount = 5) {
    const rows = Array.from({ length: rowCount }, () => {
      const firstCol = isLive
        ? `<td class="lb-col-time"><span class="lb-shimmer lb-skeleton-amount">&nbsp;</span></td>`
        : `<td class="lb-col-rank"><span class="lb-shimmer lb-skeleton-rank">&nbsp;</span></td>`;

      return `<tr>
        ${firstCol}
        <td class="lb-col-user">
          <span class="lb-shimmer lb-skeleton-name">&nbsp;</span>
          <span class="lb-shimmer lb-skeleton-meta">&nbsp;</span>
        </td>
        <td class="lb-col-amount"><span class="lb-shimmer lb-skeleton-amount">&nbsp;</span></td>
        <td class="lb-col-content"><span class="lb-shimmer lb-skeleton-icon">&nbsp;</span></td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  }
};

// Make globally available
if (typeof window !== 'undefined') {
  window.LeaderboardRenderer = LeaderboardRenderer;
}
