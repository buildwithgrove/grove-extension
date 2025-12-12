import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let FirstTipModal;
let GROVE_COLORS;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;

  // Mock window dimensions
  global.window.innerWidth = 1024;
  global.window.innerHeight = 768;

  // Define GROVE_COLORS
  GROVE_COLORS = {
    primary: '#389f58',
    shadow: 'rgba(56, 159, 88, 0.3)',
    shadowHover: 'rgba(56, 159, 88, 0.5)',
  };
  global.GROVE_COLORS = GROVE_COLORS;

  // Create FirstTipModal class for testing
  class TestFirstTipModal {
    constructor() {
      this.modal = null;
      this.overlay = null;
      this.onConfirm = null;
      this.onCancel = null;
    }

    show(anchorElement, defaultAmount, currentConfirmSetting, onConfirm, onCancel) {
      this.hide();

      this.onConfirm = onConfirm;
      this.onCancel = onCancel;

      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'grove-first-tip-overlay';
      this.overlay.style.position = 'fixed';
      this.overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      });

      // Create modal
      this.modal = document.createElement('div');
      this.modal.className = 'grove-first-tip-modal';
      this.modal.style.position = 'fixed';

      // Create header
      const header = document.createElement('div');
      const title = document.createElement('span');
      title.textContent = 'Your First Tip!';
      title.className = 'modal-title';
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.className = 'close-btn';
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cancel();
      });
      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create amount label
      const amountLabel = document.createElement('label');
      amountLabel.textContent = 'Tip Amount';
      amountLabel.className = 'amount-label';

      // Create input
      const inputGroup = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.min = '0.01';
      input.value = defaultAmount.toFixed(2);
      input.className = 'tip-amount-input';
      inputGroup.appendChild(input);

      // Create helper text
      const helperText = document.createElement('p');
      helperText.className = 'helper-text';
      helperText.textContent = 'This will be your default amount. You can change it anytime in the extension settings.';

      // Create checkbox container
      const checkboxContainer = document.createElement('label');
      checkboxContainer.className = 'checkbox-container';

      const confirmCheckbox = document.createElement('input');
      confirmCheckbox.type = 'checkbox';
      confirmCheckbox.checked = currentConfirmSetting;
      confirmCheckbox.className = 'confirm-checkbox';

      const checkboxLabel = document.createElement('span');
      checkboxLabel.textContent = 'Always confirm before tipping';
      checkboxLabel.className = 'checkbox-label';

      checkboxContainer.appendChild(confirmCheckbox);
      checkboxContainer.appendChild(checkboxLabel);

      // Handle keyboard events
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirm(parseFloat(input.value) || defaultAmount, confirmCheckbox.checked);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancel();
        }
      });

      // Create send button
      const sendBtn = document.createElement('button');
      sendBtn.className = 'send-btn';
      sendBtn.textContent = 'Send Tip';
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.confirm(parseFloat(input.value) || defaultAmount, confirmCheckbox.checked);
      });

      // Assemble
      this.modal.appendChild(header);
      this.modal.appendChild(amountLabel);
      this.modal.appendChild(inputGroup);
      this.modal.appendChild(helperText);
      this.modal.appendChild(checkboxContainer);
      this.modal.appendChild(sendBtn);

      document.body.appendChild(this.overlay);
      document.body.appendChild(this.modal);

      this.position(anchorElement);
    }

    position(anchorElement) {
      if (!this.modal || !anchorElement) return;

      const rect = anchorElement.getBoundingClientRect();
      const modalRect = this.modal.getBoundingClientRect();

      let top = rect.bottom + 12;
      let left = rect.left + (rect.width / 2) - (modalRect.width / 2);

      // Adjust for right edge
      if (left + modalRect.width > window.innerWidth - 16) {
        left = window.innerWidth - modalRect.width - 16;
      }

      // Adjust for bottom edge
      if (top + modalRect.height > window.innerHeight - 16) {
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

    cancel() {
      const callback = this.onCancel;
      this.hide();
      if (callback) {
        callback();
      }
    }

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

  FirstTipModal = TestFirstTipModal;
});

afterEach(() => {
  delete global.document;
  delete global.window;
  delete global.GROVE_COLORS;
});

describe('FirstTipModal', () => {
  describe('constructor', () => {
    it('should initialize with null values', () => {
      const modal = new FirstTipModal();
      expect(modal.modal).toBeNull();
      expect(modal.overlay).toBeNull();
      expect(modal.onConfirm).toBeNull();
      expect(modal.onCancel).toBeNull();
    });
  });

  describe('show', () => {
    it('should create modal and overlay elements', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(document.querySelector('.grove-first-tip-modal')).not.toBeNull();
      expect(document.querySelector('.grove-first-tip-overlay')).not.toBeNull();
    });

    it('should display "Your First Tip!" title', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      const title = document.querySelector('.modal-title');
      expect(title.textContent).toBe('Your First Tip!');
    });

    it('should set default amount in input', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.50, false, () => {}, () => {});

      const input = document.querySelector('.tip-amount-input');
      expect(input.value).toBe('0.50');
    });

    it('should set checkbox based on currentConfirmSetting', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, true, () => {}, () => {});

      const checkbox = document.querySelector('.confirm-checkbox');
      expect(checkbox.checked).toBe(true);
    });

    it('should not check checkbox when currentConfirmSetting is false', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      const checkbox = document.querySelector('.confirm-checkbox');
      expect(checkbox.checked).toBe(false);
    });

    it('should display helper text about default amount', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      const helperText = document.querySelector('.helper-text');
      expect(helperText.textContent).toContain('default amount');
      expect(helperText.textContent).toContain('extension settings');
    });

    it('should store callbacks', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, cancelCb);

      expect(modal.onConfirm).toBe(confirmCb);
      expect(modal.onCancel).toBe(cancelCb);
    });

    it('should remove existing modal before creating new one', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      const firstModal = modal.modal;

      modal.show(anchor, 0.20, true, () => {}, () => {});

      expect(modal.modal).not.toBe(firstModal);
      expect(document.querySelectorAll('.grove-first-tip-modal').length).toBe(1);
    });
  });

  describe('confirm', () => {
    it('should call onConfirm with amount and confirmBeforeTipping', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.25, true);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.25, confirmBeforeTipping: true });
    });

    it('should pass false for confirmBeforeTipping when checkbox unchecked', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.10, false);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.10, confirmBeforeTipping: false });
    });

    it('should hide modal after confirm', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.confirm(0.10, false);

      expect(document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should enforce minimum amount of 0.01', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0, false);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.01, confirmBeforeTipping: false });
    });

    it('should enforce minimum for negative amounts', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(-5, true);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.01, confirmBeforeTipping: true });
    });
  });

  describe('cancel', () => {
    it('should call onCancel callback', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      modal.cancel();

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should hide modal after cancel', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.cancel();

      expect(document.querySelector('.grove-first-tip-modal')).toBeNull();
    });
  });

  describe('hide', () => {
    it('should remove modal from DOM', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should remove overlay from DOM', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(document.querySelector('.grove-first-tip-overlay')).toBeNull();
    });

    it('should clear callbacks', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(modal.onConfirm).toBeNull();
      expect(modal.onCancel).toBeNull();
    });

    it('should set references to null', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(modal.modal).toBeNull();
      expect(modal.overlay).toBeNull();
    });

    it('should handle being called when not shown', () => {
      const modal = new FirstTipModal();

      expect(() => modal.hide()).not.toThrow();
    });
  });

  describe('overlay click', () => {
    it('should cancel modal when overlay clicked', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      modal.overlay.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('should cancel modal when close button clicked', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      const closeBtn = modal.modal.querySelector('.close-btn');
      closeBtn.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('send button', () => {
    it('should confirm with checkbox state when send button clicked', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});

      // Check the checkbox
      const checkbox = modal.modal.querySelector('.confirm-checkbox');
      checkbox.checked = true;

      const sendBtn = modal.modal.querySelector('.send-btn');
      sendBtn.click();

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.10, confirmBeforeTipping: true });
    });

    it('should use input value when send button clicked', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});

      // Change the input value
      const input = modal.modal.querySelector('.tip-amount-input');
      input.value = '0.75';

      const sendBtn = modal.modal.querySelector('.send-btn');
      sendBtn.click();

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.75, confirmBeforeTipping: false });
    });
  });

  describe('input keyboard events', () => {
    it('should confirm on Enter key', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      const input = modal.modal.querySelector('.tip-amount-input');

      const event = new global.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalled();
    });

    it('should cancel on Escape key', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      const input = modal.modal.querySelector('.tip-amount-input');

      const event = new global.window.KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(event);

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('position', () => {
    it('should position modal below anchor', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 50,
        right: 100,
        width: 50,
        height: 30,
      }));
      document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 280,
        height: 200,
      }));

      modal.position(anchor);

      expect(modal.modal.style.top).toBe('142px'); // bottom + 12
    });

    it('should handle missing anchor gracefully', () => {
      const modal = new FirstTipModal();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);
      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(() => modal.position(null)).not.toThrow();
    });
  });
});
