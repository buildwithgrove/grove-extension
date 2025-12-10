/**
 * Previous Keys UI
 * Handles rendering and interactions for previous JWT keys
 */

class PreviousKeysUI {
  constructor(countElement, listElement, containerElement) {
    this.countElement = countElement;
    this.listElement = listElement;
    this.containerElement = containerElement;
    this.onUseKey = null; // Callback when a key is used
    this.deleteConfirmIndex = null; // Track which key is pending delete confirmation
  }

  /**
   * Set callback for when a key is used/restored
   * @param {Function} callback - Function to call with keyData object {key, environment, timestamp}
   */
  setOnUseKey(callback) {
    this.onUseKey = callback;
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
    try {
      const prevJwts = await KeyManager.getPreviousKeys();

      if (prevJwts.length === 0) {
        this.listElement.innerHTML = '<p style="color: var(--color-text-secondary); font-size: 12px; text-align: center; padding: 20px;">No previous keys stored</p>';
        return;
      }

      this.listElement.innerHTML = prevJwts.map((item, index) => {
        // Defensive checks for malformed data
        if (!item || !item.key) return '';

        const date = item.timestamp ? new Date(item.timestamp) : new Date();
        const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const maskedKey = this._maskKey(item.key);
        const env = item.environment;
        const envLabel = env === 'testnet' ? 'Testnet' : (env === 'production' ? 'Mainnet' : '');
        const envBadge = envLabel ? ` <span class="key-env-badge ${env === 'testnet' ? 'testnet' : ''}">${envLabel}</span>` : '';

        return `
          <div class="prev-key-item">
            <div class="prev-key-info">
              <span class="prev-key-value">${maskedKey}</span>${envBadge}
              <span class="prev-key-date">${formattedDate}</span>
            </div>
            <div class="prev-key-actions">
              <button class="prev-key-btn use-key-btn" data-index="${index}" title="Use this key">
                Use
              </button>
              <button class="prev-key-btn delete-key-btn" data-index="${index}" title="Delete this key">
                Delete
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Add event listeners
      this._attachHandlers();
    } catch (error) {
      console.error('[PreviousKeysUI] Error rendering keys:', error);
      this.listElement.innerHTML = '<p style="color: var(--color-danger); font-size: 12px; text-align: center; padding: 20px;">Error loading keys</p>';
    }
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
   * Attach event handlers to buttons
   * @private
   */
  _attachHandlers() {
    // Use buttons
    const useButtons = this.listElement.querySelectorAll('.use-key-btn');
    useButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.dataset.index);
        const keyData = await KeyManager.getKey(index);
        if (keyData && this.onUseKey) {
          await this.onUseKey(keyData);
          this._showToast('Key restored');
        }
      });
    });

    // Delete buttons
    const deleteButtons = this.listElement.querySelectorAll('.delete-key-btn');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const index = parseInt(btn.dataset.index);

        // First click: show confirmation
        if (this.deleteConfirmIndex !== index) {
          // Reset any other pending confirmation
          this._resetDeleteConfirmation();

          this.deleteConfirmIndex = index;
          btn.textContent = 'Confirm?';
          btn.classList.add('confirming');

          // Reset after 3 seconds
          this._deleteTimeout = setTimeout(() => {
            this._resetDeleteConfirmation();
          }, 3000);
          return;
        }

        // Second click: delete
        this._resetDeleteConfirmation();
        await KeyManager.deleteKey(index);
        await this.updateCount();
        await this.render();
        this._showToast('Key deleted');
      });
    });
  }

  /**
   * Reset delete confirmation state
   * @private
   */
  _resetDeleteConfirmation() {
    if (this._deleteTimeout) {
      clearTimeout(this._deleteTimeout);
      this._deleteTimeout = null;
    }

    if (this.deleteConfirmIndex !== null) {
      const btn = this.listElement.querySelector(`.delete-key-btn[data-index="${this.deleteConfirmIndex}"]`);
      if (btn) {
        btn.textContent = 'Delete';
        btn.classList.remove('confirming');
      }
      this.deleteConfirmIndex = null;
    }
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
