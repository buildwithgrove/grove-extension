/**
 * Previous Keys UI
 * Handles rendering and interactions for previous JWT keys
 */

class PreviousKeysUI {
  constructor(countElement, listElement, containerElement) {
    this.countElement = countElement;
    this.listElement = listElement;
    this.containerElement = containerElement;
  }

  /**
   * Update the count display
   */
  async updateCount() {
    const count = await KeyManager.getKeyCount();

    if (count === 0) {
      this.countElement.textContent = 'No previous keys';
    } else {
      this.countElement.textContent = `${count} previous key${count === 1 ? '' : 's'}`;
    }
  }

  /**
   * Show the previous keys container and render keys
   */
  async show() {
    this.containerElement.classList.remove('hidden');
    await this.render();
  }

  /**
   * Hide the previous keys container
   */
  hide() {
    this.containerElement.classList.add('hidden');
  }

  /**
   * Render the list of previous keys
   */
  async render() {
    const prevJwts = await KeyManager.getPreviousKeys();

    if (prevJwts.length === 0) {
      this.listElement.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 12px; text-align: center; padding: 20px;">No previous keys stored</p>';
      return;
    }

    this.listElement.innerHTML = prevJwts.map((item, index) => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      const maskedKey = this._maskKey(item.key);

      return `
        <div class="prev-key-item">
          <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;">
            <span style="font-family: monospace; font-size: 11px; word-break: break-all;">${maskedKey}</span>
            <span class="prev-key-date">${formattedDate}</span>
          </div>
          <button class="copy-key-btn" data-key="${item.key}" data-index="${index}" title="Copy key">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Add event listeners to copy buttons
    this._attachCopyHandlers();
  }

  /**
   * Mask a key for display
   * @private
   */
  _maskKey(key) {
    if (key.length <= 20) {
      return key.substring(0, 5) + '...' + key.substring(key.length - 5);
    }
    return key.substring(0, 10) + '...' + key.substring(key.length - 10);
  }

  /**
   * Attach copy handlers to copy buttons
   * @private
   */
  _attachCopyHandlers() {
    const copyButtons = this.listElement.querySelectorAll('.copy-key-btn');
    copyButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.key;
        try {
          await navigator.clipboard.writeText(key);
          this._showToast('Key copied to clipboard');
        } catch (err) {
          console.error('Failed to copy key:', err);
          this._showToast('Failed to copy key');
        }
      });
    });
  }

  /**
   * Show a toast message
   * @private
   */
  _showToast(message) {
    // Reuse existing toast function if available
    if (typeof showToast === 'function') {
      showToast(message);
    }
  }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.PreviousKeysUI = PreviousKeysUI;
}
