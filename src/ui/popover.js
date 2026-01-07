/**
 * Tip Popover UI
 * Shows a confirmation popover with editable tip amount
 * Requires: src/ui/constants.js
 */

class TipPopover {
  constructor() {
    this.popover = null;
    this.overlay = null;
    this.onConfirm = null;
    this.onCancel = null;
  }

  /**
   * Show the popover near the button
   * @param {HTMLElement} anchorElement - The button to position near
   * @param {number} defaultAmount - The default tip amount
   * @param {Function} onConfirm - Callback when tip is confirmed, receives { amount, likeOnTip, autoReply }
   * @param {Function} onCancel - Callback when cancelled
   * @param {Object} xOptions - X integration options
   * @param {boolean} xOptions.isConnected - Whether X is connected
   * @param {boolean} xOptions.likeOnTip - Current like on tip setting
   * @param {boolean} xOptions.autoReply - Current auto reply setting
   */
  show(anchorElement, defaultAmount, onConfirm, onCancel, xOptions = null) {
    // Remove any existing popover
    this.hide();

    this.onConfirm = onConfirm;
    this.onCancel = onCancel;

    // Create overlay for clicking outside to close
    this.overlay = document.createElement('div');
    this.overlay.className = 'grove-popover-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 999998;
    `;
    this.overlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.cancel();
    });

    // Create popover container
    this.popover = document.createElement('div');
    this.popover.className = 'grove-tip-popover';
    this.popover.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
      border: 2px solid ${GROVE_COLORS.primary};
      border-radius: 12px;
      padding: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 159, 88, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      animation: grove-popover-in 0.15s ease-out;
    `;

    // Add keyframe animation
    if (!document.querySelector('#grove-popover-animation')) {
      const style = document.createElement('style');
      style.id = 'grove-popover-animation';
      style.textContent = `
        @keyframes grove-popover-in {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `;
      document.head.appendChild(style);
    }

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    `;

    const title = document.createElement('span');
    title.textContent = 'Send Tip';
    title.style.cssText = `
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
    `;

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.5);
      font-size: 20px;
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

    // Create amount input group
    const inputGroup = document.createElement('div');
    inputGroup.style.cssText = `
      display: flex;
      align-items: center;
      background: #000;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 6px 10px;
      margin-bottom: 10px;
      transition: border-color 0.2s;
    `;

    const currencySymbol = document.createElement('span');
    currencySymbol.textContent = '$';
    currencySymbol.style.cssText = `
      color: rgba(255, 255, 255, 0.5);
      font-size: 16px;
      font-weight: 500;
      margin-right: 4px;
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
      font-size: 16px;
      font-weight: 500;
      width: 80px;
      outline: none;
      -moz-appearance: textfield;
    `;
    // Remove spinner buttons
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

    // Create X actions section (only if X is connected)
    let likeCheckbox = null;
    let replyCheckbox = null;
    let xActionsContainer = null;

    if (xOptions && xOptions.isConnected) {
      xActionsContainer = document.createElement('div');
      xActionsContainer.style.cssText = `
        margin-bottom: 10px;
        padding: 10px 12px;
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
        margin-bottom: 8px;
        color: rgba(255, 255, 255, 0.5);
        font-size: 10px;
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
        gap: 8px;
        cursor: pointer;
        margin-bottom: 6px;
      `;

      likeCheckbox = document.createElement('input');
      likeCheckbox.type = 'checkbox';
      likeCheckbox.checked = xOptions.likeOnTip !== false;
      likeCheckbox.style.cssText = `
        width: 14px;
        height: 14px;
        accent-color: ${GROVE_COLORS.primary};
        cursor: pointer;
        flex-shrink: 0;
      `;

      const likeLabel = document.createElement('span');
      likeLabel.textContent = 'Like this post';
      likeLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.85);
        font-size: 12px;
      `;

      likeContainer.appendChild(likeCheckbox);
      likeContainer.appendChild(likeLabel);
      xActionsContainer.appendChild(likeContainer);

      // Reply checkbox
      const replyContainer = document.createElement('label');
      replyContainer.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      `;

      replyCheckbox = document.createElement('input');
      replyCheckbox.type = 'checkbox';
      replyCheckbox.checked = xOptions.autoReply !== false;
      replyCheckbox.style.cssText = `
        width: 14px;
        height: 14px;
        accent-color: ${GROVE_COLORS.primary};
        cursor: pointer;
        flex-shrink: 0;
      `;

      const replyLabel = document.createElement('span');
      replyLabel.textContent = 'Reply to this post';
      replyLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.85);
        font-size: 12px;
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
      font-size: 14px;
      font-weight: 600;
      padding: 8px 20px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow};
      position: relative;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
        likeCheckbox ? likeCheckbox.checked : null,
        replyCheckbox ? replyCheckbox.checked : null
      );
    });

    sendBtnContainer.appendChild(sendBtn);

    // Assemble popover
    this.popover.appendChild(header);
    this.popover.appendChild(inputGroup);
    if (xActionsContainer) {
      this.popover.appendChild(xActionsContainer);
    }
    this.popover.appendChild(sendBtnContainer);

    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.popover);

    // Position popover near anchor element
    this.position(anchorElement);

    // Focus the input
    setTimeout(() => input.focus(), 50);
  }

  /**
   * Position the popover near the anchor element
   * @param {HTMLElement} anchorElement
   */
  position(anchorElement) {
    if (!this.popover || !anchorElement) return;

    const rect = anchorElement.getBoundingClientRect();
    const popoverRect = this.popover.getBoundingClientRect();

    // Default: position below and aligned to the left of the button
    let top = rect.bottom + 8;
    let left = rect.left;

    // Adjust if popover would go off-screen to the right
    if (left + popoverRect.width > window.innerWidth - 16) {
      left = window.innerWidth - popoverRect.width - 16;
    }

    // Adjust if popover would go off-screen at the bottom
    if (top + popoverRect.height > window.innerHeight - 16) {
      // Position above the button instead
      top = rect.top - popoverRect.height - 8;
    }

    // Ensure not off-screen to the left
    if (left < 16) {
      left = 16;
    }

    this.popover.style.top = `${top}px`;
    this.popover.style.left = `${left}px`;
  }

  /**
   * Confirm the tip with the given amount and X options
   * @param {number} amount - The tip amount
   * @param {boolean|null} likeOnTip - Whether to like the post (null if X not connected)
   * @param {boolean|null} autoReply - Whether to reply to the post (null if X not connected)
   */
  confirm(amount, likeOnTip = null, autoReply = null) {
    if (amount <= 0) {
      amount = 0.01;
    }
    const callback = this.onConfirm;
    this.hide();
    if (callback) {
      callback({ amount, likeOnTip, autoReply });
    }
  }

  /**
   * Cancel and close the popover
   */
  cancel() {
    const callback = this.onCancel;
    this.hide();
    if (callback) {
      callback();
    }
  }

  /**
   * Hide and remove the popover
   */
  hide() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    if (this.popover) {
      this.popover.remove();
      this.popover = null;
    }
    this.onConfirm = null;
    this.onCancel = null;
  }
}

// Make globally available
if (typeof window !== 'undefined') {
  window.TipPopover = TipPopover;
}
