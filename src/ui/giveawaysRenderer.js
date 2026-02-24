/**
 * Giveaways Renderer Module
 * Pure rendering functions for giveaway cards and detail views
 */

const GiveawaysRenderer = {
  /**
   * Get time remaining as a human-readable string
   * @param {string} endAt - ISO date string
   * @returns {string} e.g. "3d 5h", "2h 30m", "Ending soon", "Ended"
   */
  getTimeRemaining(endAt) {
    if (!endAt) return '';
    const now = new Date();
    const end = new Date(endAt);
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    if (minutes > 5) return `${minutes}m left`;
    return 'Ending soon';
  },

  /**
   * Truncate description text
   * @param {string} text - Description
   * @param {number} maxLen - Max length (default: 80)
   * @returns {string} Truncated text
   */
  truncateDescription(text, maxLen = 80) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + '...';
  },

  /**
   * Format address short (4...4)
   * @param {string} address - Wallet address
   * @returns {string} Shortened address
   */
  formatAddressShort(address) {
    if (!address) return 'Unknown';
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },

  /**
   * Get display name for a giveaway creator
   * Priority: handle > base_name > ens_name > truncated address
   * @param {Object} giveaway - Giveaway object from API
   * @returns {{ displayName: string, url: string|null }}
   */
  getCreatorDisplay(giveaway) {
    if (giveaway.creator_handle) {
      return {
        displayName: `@${giveaway.creator_handle}`,
        url: `https://grove.city/@${encodeURIComponent(giveaway.creator_handle)}`
      };
    }
    if (giveaway.creator_base_name) {
      return {
        displayName: giveaway.creator_base_name,
        url: `https://www.base.org/name/${encodeURIComponent(giveaway.creator_base_name)}`
      };
    }
    if (giveaway.creator_ens_name) {
      return {
        displayName: giveaway.creator_ens_name,
        url: `https://app.ens.domains/${encodeURIComponent(giveaway.creator_ens_name)}`
      };
    }
    return {
      displayName: this.formatAddressShort(giveaway.creator_address),
      url: null
    };
  },

  /**
   * Format USD for giveaway display
   * @param {string|number} amount - USD amount
   * @returns {string} Formatted amount
   */
  formatUsd(amount) {
    const val = parseFloat(amount) || 0;
    if (val >= 1000) {
      return '$' + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '$' + val.toFixed(2);
  },

  /**
   * Render a single giveaway card for the browse list
   * @param {Object} item - { giveaway, stats }
   * @returns {string} HTML string
   */
  renderGiveawayCard(item) {
    const g = item.giveaway;
    const stats = item.stats || {};
    const timeLeft = this.getTimeRemaining(g.end_at);
    const isEnded = timeLeft === 'Ended';
    const isEndingSoon = !isEnded && g.status === 'active' && new Date(g.end_at) > new Date() && (new Date(g.end_at) - new Date()) <= 24 * 60 * 60 * 1000;
    const badgeClass = isEnded ? ' ended' : isEndingSoon ? ' ending-soon' : '';
    const title = g.title ? this.truncateDescription(g.title, 60) : '';
    const description = this.truncateDescription(g.description);
    const { displayName: creatorName, url: creatorUrl } = this.getCreatorDisplay(g);
    const totalTipped = this.formatUsd(stats.total_tips_usd || '0');
    const participants = stats.unique_participants || 0;
    const entries = stats.total_entries || 0;
    const minTip = this.formatUsd(g.minimum_tip_usd);

    const creatorHtml = creatorUrl
      ? `<a href="${FormatUtils.escapeHtml(creatorUrl)}" target="_blank" rel="noopener noreferrer" class="giveaway-creator giveaway-creator-link">${FormatUtils.escapeHtml(creatorName)}</a>`
      : `<span class="giveaway-creator">${FormatUtils.escapeHtml(creatorName)}</span>`;

    return `
      <div class="giveaway-card" data-giveaway-id="${FormatUtils.escapeHtml(g.id)}">
        <div class="giveaway-card-header">
          <span class="giveaway-time-badge${badgeClass}">${FormatUtils.escapeHtml(timeLeft)}</span>
          <span class="giveaway-entries-count">${entries} ${entries === 1 ? 'entry' : 'entries'}</span>
        </div>
        ${title ? `<h3 class="giveaway-card-title">${FormatUtils.escapeHtml(title)}</h3>` : ''}
        <p class="giveaway-card-description">${FormatUtils.escapeHtml(description)}</p>
        <div class="giveaway-card-stats">
          <div class="giveaway-stat">
            <span class="giveaway-stat-value">${totalTipped}</span>
            <span class="giveaway-stat-label">Pool</span>
          </div>
          <div class="giveaway-stat-divider"></div>
          <div class="giveaway-stat">
            <span class="giveaway-stat-value">${g.num_winners}</span>
            <span class="giveaway-stat-label">${g.num_winners === 1 ? 'Winner' : 'Winners'}</span>
          </div>
          <div class="giveaway-stat-divider"></div>
          <div class="giveaway-stat">
            <span class="giveaway-stat-value">${participants}</span>
            <span class="giveaway-stat-label">Tippers</span>
          </div>
        </div>
        <div class="giveaway-card-footer">
          ${creatorHtml}
          <span class="giveaway-min-tip">min ${minTip}</span>
        </div>
      </div>
    `;
  },

  /**
   * Render a list of giveaway cards
   * @param {Array} items - Array of { giveaway, stats }
   * @returns {string} HTML string
   */
  renderGiveawaysList(items) {
    if (!items || items.length === 0) return '';
    return items.map(item => this.renderGiveawayCard(item)).join('');
  },

  /**
   * Render the giveaway detail overlay
   * @param {Object} giveaway - Giveaway object
   * @param {Object} stats - Stats object
   * @returns {string} HTML string
   */
  renderGiveawayDetail(giveaway, stats) {
    const g = giveaway;
    const timeLeft = this.getTimeRemaining(g.end_at);
    const isActive = g.status === 'active' && timeLeft !== 'Ended';
    const title = g.title || '';
    const description = g.description || '';
    const { displayName: creatorName, url: creatorUrl } = this.getCreatorDisplay(g);
    const totalTipped = this.formatUsd(stats.total_tips_usd || '0');
    const participants = stats.unique_participants || 0;
    const entries = stats.total_entries || 0;
    const minTip = parseFloat(g.minimum_tip_usd) || 0;
    const minTipFormatted = this.formatUsd(g.minimum_tip_usd);

    const creatorValueHtml = creatorUrl
      ? `<a href="${FormatUtils.escapeHtml(creatorUrl)}" target="_blank" rel="noopener noreferrer" class="giveaway-creator-link">${FormatUtils.escapeHtml(creatorName)}</a>`
      : FormatUtils.escapeHtml(creatorName);

    return `
      <div class="giveaway-detail-header">
        <span class="giveaway-time-badge${!isActive ? ' ended' : ''}">${FormatUtils.escapeHtml(timeLeft)}</span>
      </div>
      ${title ? `<h2 class="giveaway-detail-title">${FormatUtils.escapeHtml(title)}</h2>` : ''}
      <p class="giveaway-detail-description">${FormatUtils.escapeHtml(description)}</p>
      <div class="giveaway-detail-stats">
        <div class="giveaway-detail-stat">
          <span class="giveaway-detail-stat-value">${totalTipped}</span>
          <span class="giveaway-detail-stat-label">Total Tipped</span>
        </div>
        <div class="giveaway-detail-stat">
          <span class="giveaway-detail-stat-value">${g.num_winners}</span>
          <span class="giveaway-detail-stat-label">${g.num_winners === 1 ? 'Winner' : 'Winners'}</span>
        </div>
        <div class="giveaway-detail-stat">
          <span class="giveaway-detail-stat-value">${entries}</span>
          <span class="giveaway-detail-stat-label">Entries</span>
        </div>
      </div>
      <div class="giveaway-detail-meta">
        <div class="giveaway-detail-meta-row">
          <span class="giveaway-detail-meta-label">Creator</span>
          <span class="giveaway-detail-meta-value">${creatorValueHtml}</span>
        </div>
        <div class="giveaway-detail-meta-row">
          <span class="giveaway-detail-meta-label">Min Tip</span>
          <span class="giveaway-detail-meta-value">${minTipFormatted} USDC</span>
        </div>
        <div class="giveaway-detail-meta-row">
          <span class="giveaway-detail-meta-label">Tippers</span>
          <span class="giveaway-detail-meta-value">${participants}</span>
        </div>
        <div class="giveaway-detail-meta-row">
          <span class="giveaway-detail-meta-label">Selection</span>
          <span class="giveaway-detail-meta-value">${g.selection_mode === 'random' ? 'Random' : 'Manual'}</span>
        </div>
        ${g.allow_multiple_entries ? `
        <div class="giveaway-detail-meta-row">
          <span class="giveaway-detail-meta-label">Multiple Entries</span>
          <span class="giveaway-detail-meta-value">Yes</span>
        </div>` : ''}
      </div>
      ${isActive ? `
      <div class="giveaway-detail-tip-form">
        <div class="giveaway-tip-input-row">
          <span class="giveaway-tip-prefix">$</span>
          <input type="number" class="giveaway-tip-input" id="giveawayTipAmount"
            value="${minTip.toFixed(2)}" min="${minTip.toFixed(2)}" max="10000" step="0.01"
            placeholder="${minTip.toFixed(2)}">
          <span class="giveaway-tip-suffix">USDC</span>
        </div>
        <button class="giveaway-enter-btn" id="giveawayEnterBtn">
          <span class="giveaway-enter-btn-text">Enter Giveaway</span>
          <span class="giveaway-enter-btn-leaf">🌿</span>
        </button>
        <p class="giveaway-tip-error hidden" id="giveawayTipError"></p>
      </div>` : `
      <div class="giveaway-detail-ended">
        <p>This giveaway has ended.</p>
      </div>`}
    `;
  }
};

// Make globally available
if (typeof window !== 'undefined') {
  window.GiveawaysRenderer = GiveawaysRenderer;
}
