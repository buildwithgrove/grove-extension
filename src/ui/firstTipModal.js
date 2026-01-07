/**
 * First Tip Modal UI
 * Shows an onboarding modal for the user's first tip, allowing them to:
 * - Set their default tip amount
 * - Choose whether to always confirm before tipping
 * Requires: src/ui/constants.js
 */

class FirstTipModal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.onConfirm = null;
    this.onCancel = null;
  }

  /**
   * Show the tip modal
   * @param {HTMLElement} anchorElement - The button to position near
   * @param {number} defaultAmount - The default tip amount
   * @param {boolean} currentConfirmSetting - Current confirm before tipping setting
   * @param {Function} onConfirm - Callback when confirmed, receives { amount, confirmBeforeTipping, likeOnTip, autoReply }
   * @param {Function} onCancel - Callback when cancelled
   * @param {Object} xOptions - X integration options
   * @param {boolean} xOptions.isConnected - Whether X is connected
   * @param {boolean} xOptions.likeOnTip - Current like on tip setting
   * @param {boolean} xOptions.autoReply - Current auto reply setting
   * @param {Object} displayOptions - Display options
   * @param {string} displayOptions.title - Modal title (default: "Your First Tip!")
   * @param {boolean} displayOptions.showConfirmCheckbox - Whether to show the confirm checkbox (default: true)
   */
  show(anchorElement, defaultAmount, currentConfirmSetting, onConfirm, onCancel, xOptions = null, displayOptions = null) {
    // Remove any existing modal
    this.hide();

    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    // Create overlay for clicking outside to close
    this.overlay = document.createElement('div');
    this.overlay.className = 'grove-first-tip-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999998;
      background: rgba(0, 0, 0, 0.5);
    `;
    this.overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    });

    // Create modal container
    this.modal = document.createElement('div');
    this.modal.className = 'grove-first-tip-modal';
    this.modal.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
      border: 2px solid ${GROVE_COLORS.primary};
      border-radius: 16px;
      padding: 20px 24px;
      width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 159, 88, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: grove-modal-in 0.2s ease-out;
    `;

    // Add keyframe animation
    if (!document.querySelector('#grove-first-tip-animation')) {
      const style = document.createElement('style');
      style.id = 'grove-first-tip-animation';
      style.textContent = `
        @keyframes grove-modal-in {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Parse display options
    const modalTitle = displayOptions?.title || 'Your First Tip!';
    const showConfirmCheckbox = displayOptions?.showConfirmCheckbox !== false;

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    `;

    const title = document.createElement('span');
    title.textContent = modalTitle;
    title.style.cssText = `
      color: #ffffff;
      font-weight: 700;
      font-size: 16px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 22px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
      transition: color 0.2s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#fff';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = 'rgba(255, 255, 255, 0.5)';
    });
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Create amount label
    const amountLabel = document.createElement('label');
    amountLabel.textContent = 'Tip Amount';
    amountLabel.style.cssText = `
      display: block;
      color: rgba(255, 255, 255, 0.6);
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    // Create amount input group
    const inputGroup = document.createElement('div');
    inputGroup.style.cssText = `
      display: flex;
      align-items: center;
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 8px;
      transition: border-color 0.2s;
    `;

    const currencySymbol = document.createElement('span');
    currencySymbol.textContent = '$';
    currencySymbol.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 18px;
      font-weight: 500;
      margin-right: 6px;
    `;

    const input = document.createElement('input');
    input.type = 'number';
    input.step = '0.01';
    input.min = '0.01';
    input.value = defaultAmount.toFixed(2);
    input.style.cssText = `
      background: transparent;
      border: none;
      color: #fff;
      font-size: 18px;
      font-weight: 500;
      width: 100%;
      outline: none;
      -moz-appearance: textfield;
    `;

    input.addEventListener('focus', () => {
      inputGroup.style.borderColor = GROVE_COLORS.primary;
      input.select();
    });
    input.addEventListener('blur', () => {
      inputGroup.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.confirm(
          parseFloat(input.value) || defaultAmount,
          confirmCheckbox.checked,
          likeCheckbox ? likeCheckbox.checked : null,
          replyCheckbox ? replyCheckbox.checked : null
        );
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancel();
      }
    });

    inputGroup.appendChild(currencySymbol);
    inputGroup.appendChild(input);

    // Create helper text
    const helperText = document.createElement('p');
    helperText.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 12px;
      margin: 0 0 18px 0;
      line-height: 1.4;
    `;
    helperText.textContent = 'This will be your default tip amount. You can change it anytime in the extension settings.';

    // Create checkbox container
    const checkboxContainer = document.createElement('label');
    checkboxContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      margin-bottom: 20px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 8px;
      transition: background 0.2s;
    `;
    checkboxContainer.addEventListener('mouseenter', () => {
      checkboxContainer.style.background = 'rgba(255, 255, 255, 0.06)';
    });
    checkboxContainer.addEventListener('mouseleave', () => {
      checkboxContainer.style.background = 'rgba(255, 255, 255, 0.03)';
    });

    const confirmCheckbox = document.createElement('input');
    confirmCheckbox.type = 'checkbox';
    confirmCheckbox.checked = currentConfirmSetting;
    confirmCheckbox.style.cssText = `
      width: 16px;
      height: 16px;
      accent-color: ${GROVE_COLORS.primary};
      cursor: pointer;
      flex-shrink: 0;
    `;

    const checkboxLabel = document.createElement('span');
    checkboxLabel.textContent = 'Always confirm before tipping';
    checkboxLabel.style.cssText = `
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;
    `;

    checkboxContainer.appendChild(confirmCheckbox);
    checkboxContainer.appendChild(checkboxLabel);

    // Create X actions section (only if X is connected)
    let likeCheckbox = null;
    let replyCheckbox = null;
    let xActionsContainer = null;

    if (xOptions && xOptions.isConnected) {
      xActionsContainer = document.createElement('div');
      xActionsContainer.style.cssText = `
        margin-bottom: 20px;
        padding: 12px 14px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      `;

      // X actions header
      const xHeader = document.createElement('div');
      xHeader.style.cssText = `
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 10px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      `;
      xHeader.textContent = 'X Actions';
      xActionsContainer.appendChild(xHeader);

      // Like checkbox
      const likeContainer = document.createElement('label');
      likeContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        margin-bottom: 8px;
      `;

      likeCheckbox = document.createElement('input');
      likeCheckbox.type = 'checkbox';
      likeCheckbox.checked = xOptions.likeOnTip !== false;
      likeCheckbox.style.cssText = `
        width: 16px;
        height: 16px;
        accent-color: ${GROVE_COLORS.primary};
        cursor: pointer;
        flex-shrink: 0;
      `;

      const likeLabel = document.createElement('span');
      likeLabel.textContent = 'Like this post';
      likeLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.85);
        font-size: 13px;
      `;

      likeContainer.appendChild(likeCheckbox);
      likeContainer.appendChild(likeLabel);
      xActionsContainer.appendChild(likeContainer);

      // Reply checkbox
      const replyContainer = document.createElement('label');
      replyContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      `;

      replyCheckbox = document.createElement('input');
      replyCheckbox.type = 'checkbox';
      replyCheckbox.checked = xOptions.autoReply !== false;
      replyCheckbox.style.cssText = `
        width: 16px;
        height: 16px;
        accent-color: ${GROVE_COLORS.primary};
        cursor: pointer;
        flex-shrink: 0;
      `;

      const replyLabel = document.createElement('span');
      replyLabel.textContent = 'Reply to this post';
      replyLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.85);
        font-size: 13px;
      `;

      replyContainer.appendChild(replyCheckbox);
      replyContainer.appendChild(replyLabel);
      xActionsContainer.appendChild(replyContainer);
    }

    // Create send button container for centering
    const sendBtnContainer = document.createElement('div');
    sendBtnContainer.style.cssText = `
      display: flex;
      justify-content: center;
    `;

    // Create send button (styled like the Tip button)
    const sendBtn = document.createElement('button');
    sendBtn.style.cssText = `
      background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%);
      border: 2px solid ${GROVE_COLORS.primary};
      border-radius: 9999px;
      color: #fff;
      font-size: 15px;
      font-weight: 600;
      padding: 12px 32px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow};
      position: relative;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    `;

    // Create text span
    const btnText = document.createElement('span');
    btnText.textContent = 'Send Tip';
    btnText.style.cssText = `
      position: relative;
      z-index: 2;
    `;

    // Create emoji span
    const btnEmoji = document.createElement('span');
    btnEmoji.textContent = '🌿';
    btnEmoji.style.cssText = `
      position: relative;
      z-index: 2;
    `;

    // Create animated sheen overlay
    const btnSheen = document.createElement('div');
    btnSheen.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
      transform: translateX(-200%);
      animation: grove-sheen-slide 3s ease-in-out infinite;
      pointer-events: none;
      z-index: 1;
    `;

    sendBtn.appendChild(btnSheen);
    sendBtn.appendChild(btnText);
    sendBtn.appendChild(btnEmoji);

    sendBtn.addEventListener('mouseenter', () => {
      sendBtn.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #141414 100%)';
      sendBtn.style.transform = 'translateY(-1px)';
      sendBtn.style.boxShadow = `0 4px 12px ${GROVE_COLORS.shadowHover}`;
    });
    sendBtn.addEventListener('mouseleave', () => {
      sendBtn.style.background = 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)';
      sendBtn.style.transform = 'translateY(0)';
      sendBtn.style.boxShadow = `0 2px 8px ${GROVE_COLORS.shadow}`;
    });
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.confirm(
        parseFloat(input.value) || defaultAmount,
        confirmCheckbox.checked,
        likeCheckbox ? likeCheckbox.checked : null,
        replyCheckbox ? replyCheckbox.checked : null
      );
    });

    sendBtnContainer.appendChild(sendBtn);

    // Assemble modal
    this.modal.appendChild(header);
    this.modal.appendChild(amountLabel);
    this.modal.appendChild(inputGroup);
    this.modal.appendChild(helperText);
    if (showConfirmCheckbox) {
      this.modal.appendChild(checkboxContainer);
    }
    if (xActionsContainer) {
      this.modal.appendChild(xActionsContainer);
    }
    this.modal.appendChild(sendBtnContainer);

    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    // Position modal near anchor element
    this.position(anchorElement);

    // Focus the input
    setTimeout(() => input.focus(), 50);
  }

  /**
   * Position the modal near the anchor element
   * @param {HTMLElement} anchorElement
   */
  position(anchorElement) {
    if (!this.modal || !anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    const modalRect = this.modal.getBoundingClientRect();

    // Default: position below and centered on the button
    let top = rect.bottom + 12;
    let left = rect.left + (rect.width / 2) - (modalRect.width / 2);

    // Adjust if modal would go off-screen to the right
    if (left + modalRect.width > window.innerWidth - 16) {
      left = window.innerWidth - modalRect.width - 16;
    }

    // Adjust if modal would go off-screen at the bottom
    if (top + modalRect.height > window.innerHeight - 16) {
      // Position above the button instead
      top = rect.top - modalRect.height - 12;
    }

    // Ensure not off-screen to the left
    if (left < 16) {
      left = 16;
    }

    // Ensure not off-screen at the top
    if (top < 16) {
      top = 16;
    }

    this.modal.style.top = `${top}px`;
    this.modal.style.left = `${left}px`;
  }

  /**
   * Confirm the first tip with settings
   * @param {number} amount - The tip amount
   * @param {boolean} confirmBeforeTipping - Whether to always confirm
   * @param {boolean|null} likeOnTip - Whether to like the post (null if X not connected)
   * @param {boolean|null} autoReply - Whether to reply to the post (null if X not connected)
   */
  confirm(amount, confirmBeforeTipping, likeOnTip = null, autoReply = null) {
    if (amount <= 0) {
      amount = 0.01;
    }
    const callback = this.onConfirm;
    this.hide();
    if (callback) {
      callback({ amount, confirmBeforeTipping, likeOnTip, autoReply });
    }
  }

  /**
   * Cancel and close the modal
   */
  cancel() {
    const callback = this.onCancel;
    this.hide();
    if (callback) {
      callback();
    }
  }

  /**
   * Hide and remove the modal
   */
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    this.onConfirm = null;
    this.onCancel = null;
  }
}

// Make globally available
if (typeof window !== 'undefined') {
  window.FirstTipModal = FirstTipModal;
}
