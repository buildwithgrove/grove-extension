/**
 * First Tip Modal UI
 * Shows a multi-page onboarding modal for the user's first tip:
 * - Page 1: Set default tip amount and confirm setting
 * - Page 2: Prompt to connect X account
 * Requires: src/ui/constants.js
 */

class FirstTipModal {
  constructor() {
    this.modal = null;
    this.overlay = null;
    this.onConfirm = null;
    this.onCancel = null;
    this.currentPage = 0;
    this.pages = [];
    this.pageIndicators = [];
    this.pendingTipData = null;
  }

  /**
   * Show the first tip modal
   * @param {HTMLElement} anchorElement - The button to position near
   * @param {number} defaultAmount - The default tip amount
   * @param {boolean} currentConfirmSetting - Current confirm before tipping setting
   * @param {Function} onConfirm - Callback when confirmed, receives { amount, confirmBeforeTipping }
   * @param {Function} onCancel - Callback when cancelled
   */
  show(anchorElement, defaultAmount, currentConfirmSetting, onConfirm, onCancel) {
    // Remove any existing modal
    this.hide();

    this.onConfirm = onConfirm;
    this.onCancel = onCancel;
    this.currentPage = 0;
    this.pages = [];
    this.pageIndicators = [];

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
      overflow: hidden;
    `;

    // Add keyframe animations
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
        @keyframes grove-page-slide-left {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes grove-page-slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes grove-bounce-right {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
      `;
      document.head.appendChild(style);
    }

    // Create pages container
    const pagesContainer = document.createElement('div');
    pagesContainer.style.cssText = `
      position: relative;
    `;

    // Create Page 1: Tip Amount
    const page1 = this.createTipAmountPage(defaultAmount, currentConfirmSetting);
    page1.style.cssText = `
      position: relative;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    this.pages.push(page1);
    pagesContainer.appendChild(page1);

    // Create Page 2: Connect to X
    const page2 = this.createConnectXPage();
    page2.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      transform: translateX(100%);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;
    this.pages.push(page2);
    pagesContainer.appendChild(page2);

    // Create page indicators
    const indicatorContainer = document.createElement('div');
    indicatorContainer.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
    `;

    for (let i = 0; i < 2; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${i === 0 ? GROVE_COLORS.primary : 'rgba(255, 255, 255, 0.3)'};
        transition: background 0.3s ease;
        cursor: pointer;
      `;
      dot.addEventListener('click', () => this.goToPage(i));
      this.pageIndicators.push(dot);
      indicatorContainer.appendChild(dot);
    }

    // Assemble modal
    this.modal.appendChild(pagesContainer);
    this.modal.appendChild(indicatorContainer);

    // Add to DOM
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.modal);

    // Position modal near anchor element
    this.position(anchorElement);

    // Focus the input on page 1
    const input = page1.querySelector('input[type="number"]');
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  /**
   * Create the tip amount page (page 1)
   */
  createTipAmountPage(defaultAmount, currentConfirmSetting) {
    const page = document.createElement('div');

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    `;

    const title = document.createElement('span');
    title.textContent = 'Your First Tip!';
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

    const confirmCheckbox = document.createElement('input');
    confirmCheckbox.type = 'checkbox';
    confirmCheckbox.checked = currentConfirmSetting;

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
        this.handlePage1Continue(parseFloat(input.value) || defaultAmount, confirmCheckbox.checked);
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
    btnText.textContent = 'Next';
    btnText.style.cssText = `
      position: relative;
      z-index: 2;
    `;

    // Create bouncing chevron
    const btnChevron = document.createElement('span');
    btnChevron.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    btnChevron.style.cssText = `
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      animation: grove-bounce-right 1s ease-in-out infinite;
    `;

    sendBtn.appendChild(btnText);
    sendBtn.appendChild(btnChevron);

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
      this.handlePage1Continue(parseFloat(input.value) || defaultAmount, confirmCheckbox.checked);
    });

    sendBtnContainer.appendChild(sendBtn);

    // Assemble page
    page.appendChild(header);
    page.appendChild(amountLabel);
    page.appendChild(inputGroup);
    page.appendChild(helperText);
    page.appendChild(checkboxContainer);
    page.appendChild(sendBtnContainer);

    return page;
  }

  /**
   * Create the Connect to X page (page 2)
   */
  createConnectXPage() {
    const page = document.createElement('div');

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    `;

    const title = document.createElement('span');
    title.textContent = 'Tip Sent!';
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
      this.hide();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // X logo container
    const xLogoContainer = document.createElement('div');
    xLogoContainer.style.cssText = `
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    `;

    const xLogo = document.createElement('div');
    xLogo.innerHTML = `<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`;
    xLogo.style.cssText = `
      width: 72px;
      height: 72px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    `;

    xLogoContainer.appendChild(xLogo);

    // Description
    const description = document.createElement('p');
    description.style.cssText = `
      color: rgba(255, 255, 255, 0.8);
      font-size: 14px;
      text-align: center;
      margin: 0 0 8px 0;
      line-height: 1.5;
    `;
    description.textContent = 'Let creators know you appreciate their content when you send them a tip!';

    // Features list
    const featuresList = document.createElement('ul');
    featuresList.style.cssText = `
      list-style: none;
      padding: 0;
      margin: 0 0 20px 0;
    `;

    const features = [
      'Auto-like posts you tip',
      'Send a custom reply message'
    ];

    features.forEach(feature => {
      const li = document.createElement('li');
      li.style.cssText = `
        color: rgba(255, 255, 255, 0.6);
        font-size: 13px;
        padding: 6px 0;
        padding-left: 24px;
        position: relative;
      `;
      li.innerHTML = `<span style="position: absolute; left: 0; color: ${GROVE_COLORS.primary};">✓</span>${feature}`;
      featuresList.appendChild(li);
    });

    // Buttons container - side by side
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
    `;

    // Connect button
    const connectBtn = document.createElement('button');
    connectBtn.style.cssText = `
      flex: 1;
      background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%);
      border: 2px solid ${GROVE_COLORS.primary};
      border-radius: 9999px;
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px ${GROVE_COLORS.shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    `;
    connectBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg><span>Connect</span>`;

    connectBtn.addEventListener('mouseenter', () => {
      connectBtn.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #141414 100%)';
      connectBtn.style.transform = 'translateY(-1px)';
      connectBtn.style.boxShadow = `0 4px 12px ${GROVE_COLORS.shadowHover}`;
    });
    connectBtn.addEventListener('mouseleave', () => {
      connectBtn.style.background = 'linear-gradient(135deg, #000000 0%, #0a0a0a 100%)';
      connectBtn.style.transform = 'translateY(0)';
      connectBtn.style.boxShadow = `0 2px 8px ${GROVE_COLORS.shadow}`;
    });
    connectBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Open extension popup to X settings
      chrome.runtime.sendMessage({ type: 'OPEN_POPUP_TO_X_SETTINGS' });
      this.hide();
    });

    // Skip button - orange outline
    const skipBtn = document.createElement('button');
    skipBtn.textContent = 'Maybe Later';
    skipBtn.style.cssText = `
      flex: 1;
      background: transparent;
      border: 2px solid #f0ad4e;
      border-radius: 9999px;
      color: #f0ad4e;
      font-size: 14px;
      font-weight: 600;
      padding: 10px 16px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    skipBtn.addEventListener('mouseenter', () => {
      skipBtn.style.background = 'rgba(240, 173, 78, 0.1)';
      skipBtn.style.transform = 'translateY(-1px)';
    });
    skipBtn.addEventListener('mouseleave', () => {
      skipBtn.style.background = 'transparent';
      skipBtn.style.transform = 'translateY(0)';
    });
    skipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.hide();
    });

    buttonsContainer.appendChild(connectBtn);
    buttonsContainer.appendChild(skipBtn);

    // Assemble page
    page.appendChild(header);
    page.appendChild(xLogoContainer);
    page.appendChild(description);
    page.appendChild(featuresList);
    page.appendChild(buttonsContainer);

    return page;
  }

  /**
   * Handle page 1 continue - send tip and go to page 2
   */
  handlePage1Continue(amount, confirmBeforeTipping) {
    if (amount <= 0) {
      amount = 0.01;
    }

    // Store data and trigger the tip
    this.pendingTipData = { amount, confirmBeforeTipping };

    // Call onConfirm to send the tip
    if (this.onConfirm) {
      this.onConfirm({ amount, confirmBeforeTipping });
    }

    // Go to page 2
    this.goToPage(1);
  }

  /**
   * Go to a specific page
   */
  goToPage(pageIndex) {
    if (pageIndex < 0 || pageIndex >= this.pages.length) return;
    if (pageIndex === this.currentPage) return;

    const oldPage = this.pages[this.currentPage];
    const newPage = this.pages[pageIndex];

    // Animate out old page
    if (pageIndex > this.currentPage) {
      // Going forward
      oldPage.style.transform = 'translateX(-100%)';
      oldPage.style.opacity = '0';
      oldPage.style.pointerEvents = 'none';
      oldPage.style.position = 'absolute';
      newPage.style.transform = 'translateX(0)';
      newPage.style.opacity = '1';
      newPage.style.pointerEvents = 'auto';
      newPage.style.position = 'relative';
    } else {
      // Going backward
      oldPage.style.transform = 'translateX(100%)';
      oldPage.style.opacity = '0';
      oldPage.style.pointerEvents = 'none';
      oldPage.style.position = 'absolute';
      newPage.style.transform = 'translateX(0)';
      newPage.style.opacity = '1';
      newPage.style.pointerEvents = 'auto';
      newPage.style.position = 'relative';
    }

    // Update indicators
    this.pageIndicators.forEach((dot, i) => {
      dot.style.background = i === pageIndex ? GROVE_COLORS.primary : 'rgba(255, 255, 255, 0.3)';
    });

    this.currentPage = pageIndex;
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
   */
  confirm(amount, confirmBeforeTipping) {
    if (amount <= 0) {
      amount = 0.01;
    }
    const callback = this.onConfirm;
    this.hide();
    if (callback) {
      callback({ amount, confirmBeforeTipping });
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
    this.currentPage = 0;
    this.pages = [];
    this.pageIndicators = [];
    this.pendingTipData = null;
  }
}

// Make globally available
if (typeof window !== 'undefined') {
  window.FirstTipModal = FirstTipModal;
}
