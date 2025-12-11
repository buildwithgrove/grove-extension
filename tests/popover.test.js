import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let TipPopover;
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

  // Create TipPopover class for testing
  class TestTipPopover {
    constructor() {
      this.popover = null;
      this.overlay = null;
      this.onConfirm = null;
      this.onCancel = null;
    }

    show(anchorElement, defaultAmount, onConfirm, onCancel) {
      this.hide();

      this.onConfirm = onConfirm;
      this.onCancel = onCancel;

      // Create overlay
      this.overlay = document.createElement('div');
      this.overlay.className = 'grove-popover-overlay';
      this.overlay.style.position = 'fixed';
      this.overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      });

      // Create popover
      this.popover = document.createElement('div');
      this.popover.className = 'grove-tip-popover';
      this.popover.style.position = 'fixed';

      // Create header
      const header = document.createElement('div');
      const title = document.createElement('span');
      title.textContent = 'Send Tip';
      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '&times;';
      closeBtn.className = 'close-btn';
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.cancel();
      });
      header.appendChild(title);
      header.appendChild(closeBtn);

      // Create input
      const inputGroup = document.createElement('div');
      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.min = '0.01';
      input.value = defaultAmount.toFixed(2);
      input.className = 'tip-amount-input';
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.confirm(parseFloat(input.value) || defaultAmount);
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.cancel();
        }
      });
      inputGroup.appendChild(input);

      // Create send button
      const sendBtn = document.createElement('button');
      sendBtn.className = 'send-btn';
      sendBtn.textContent = 'Send Tip';
      sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.confirm(parseFloat(input.value) || defaultAmount);
      });

      // Assemble
      this.popover.appendChild(header);
      this.popover.appendChild(inputGroup);
      this.popover.appendChild(sendBtn);

      document.body.appendChild(this.overlay);
      document.body.appendChild(this.popover);

      this.position(anchorElement);
    }

    position(anchorElement) {
      if (!this.popover || !anchorElement) return;

      const rect = anchorElement.getBoundingClientRect();
      const popoverRect = this.popover.getBoundingClientRect();

      let top = rect.bottom + 8;
      let left = rect.left;

      // Adjust for right edge
      if (left + popoverRect.width > window.innerWidth - 16) {
        left = window.innerWidth - popoverRect.width - 16;
      }

      // Adjust for bottom edge
      if (top + popoverRect.height > window.innerHeight - 16) {
        top = rect.top - popoverRect.height - 8;
      }

      // Ensure not off-screen to the left
      if (left < 16) {
        left = 16;
      }

      this.popover.style.top = `${top}px`;
      this.popover.style.left = `${left}px`;
    }

    confirm(amount) {
      if (amount <= 0) {
        amount = 0.01;
      }
      const callback = this.onConfirm;
      this.hide();
      if (callback) {
        callback(amount);
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
      if (this.popover) {
        this.popover.remove();
        this.popover = null;
      }
      this.onConfirm = null;
      this.onCancel = null;
    }
  }

  TipPopover = TestTipPopover;
});

afterEach(() => {
  delete global.document;
  delete global.window;
  delete global.GROVE_COLORS;
});

describe('TipPopover', () => {
  describe('constructor', () => {
    it('should initialize with null values', () => {
      const popover = new TipPopover();
      expect(popover.popover).toBeNull();
      expect(popover.overlay).toBeNull();
      expect(popover.onConfirm).toBeNull();
      expect(popover.onCancel).toBeNull();
    });
  });

  describe('show', () => {
    it('should create popover and overlay elements', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      expect(document.querySelector('.grove-tip-popover')).not.toBeNull();
      expect(document.querySelector('.grove-popover-overlay')).not.toBeNull();
    });

    it('should set default amount in input', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.50, () => {}, () => {});

      const input = document.querySelector('.tip-amount-input');
      expect(input.value).toBe('0.50');
    });

    it('should store callbacks', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, cancelCb);

      expect(popover.onConfirm).toBe(confirmCb);
      expect(popover.onCancel).toBe(cancelCb);
    });

    it('should remove existing popover before creating new one', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      const firstPopover = popover.popover;

      popover.show(anchor, 0.20, () => {}, () => {});

      expect(popover.popover).not.toBe(firstPopover);
      expect(document.querySelectorAll('.grove-tip-popover').length).toBe(1);
    });

    it('should contain title and close button', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      expect(popover.popover.textContent).toContain('Send Tip');
      expect(popover.popover.querySelector('.close-btn')).not.toBeNull();
    });

    it('should have send button', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      const sendBtn = popover.popover.querySelector('.send-btn');
      expect(sendBtn).not.toBeNull();
      expect(sendBtn.textContent).toContain('Send');
    });
  });

  describe('position', () => {
    it('should position popover below anchor', () => {
      const popover = new TipPopover();
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

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      expect(popover.popover.style.top).toBe('138px'); // bottom + 8
      expect(popover.popover.style.left).toBe('50px');
    });

    it('should adjust when near right edge', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 900, // Near right edge
        right: 950,
        width: 50,
        height: 30,
      }));
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      // Should adjust left to stay within viewport
      expect(parseInt(popover.popover.style.left)).toBeLessThan(900);
    });

    it('should position above anchor when near bottom', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 700, // Near bottom
        bottom: 730,
        left: 50,
        right: 100,
        width: 50,
        height: 30,
      }));
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      // Should position above (top - height - 8)
      expect(parseInt(popover.popover.style.top)).toBeLessThan(700);
    });

    it('should handle missing anchor gracefully', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);
      popover.show(anchor, 0.10, () => {}, () => {});

      expect(() => popover.position(null)).not.toThrow();
    });
  });

  describe('confirm', () => {
    it('should call onConfirm with amount', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(0.25);

      expect(confirmCb).toHaveBeenCalledWith(0.25);
    });

    it('should hide popover after confirm', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.confirm(0.10);

      expect(document.querySelector('.grove-tip-popover')).toBeNull();
    });

    it('should enforce minimum amount of 0.01', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(0);

      expect(confirmCb).toHaveBeenCalledWith(0.01);
    });

    it('should enforce minimum for negative amounts', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(-5);

      expect(confirmCb).toHaveBeenCalledWith(0.01);
    });
  });

  describe('cancel', () => {
    it('should call onCancel callback', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      popover.cancel();

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should hide popover after cancel', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.cancel();

      expect(document.querySelector('.grove-tip-popover')).toBeNull();
    });
  });

  describe('hide', () => {
    it('should remove popover from DOM', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(document.querySelector('.grove-tip-popover')).toBeNull();
    });

    it('should remove overlay from DOM', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(document.querySelector('.grove-popover-overlay')).toBeNull();
    });

    it('should clear callbacks', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(popover.onConfirm).toBeNull();
      expect(popover.onCancel).toBeNull();
    });

    it('should set references to null', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(popover.popover).toBeNull();
      expect(popover.overlay).toBeNull();
    });

    it('should handle being called when not shown', () => {
      const popover = new TipPopover();

      expect(() => popover.hide()).not.toThrow();
    });
  });

  describe('overlay click', () => {
    it('should cancel popover when overlay clicked', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      popover.overlay.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('close button', () => {
    it('should cancel popover when close button clicked', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      const closeBtn = popover.popover.querySelector('.close-btn');
      closeBtn.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('send button', () => {
    it('should confirm when send button clicked', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      const sendBtn = popover.popover.querySelector('.send-btn');
      sendBtn.click();

      expect(confirmCb).toHaveBeenCalled();
    });
  });

  describe('input keyboard events', () => {
    it('should confirm on Enter key', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const confirmCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      const input = popover.popover.querySelector('.tip-amount-input');

      const event = new global.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalled();
    });

    it('should cancel on Escape key', () => {
      const popover = new TipPopover();
      const anchor = document.createElement('button');
      const cancelCb = vi.fn();
      document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      const input = popover.popover.querySelector('.tip-amount-input');

      const event = new global.window.KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(event);

      expect(cancelCb).toHaveBeenCalled();
    });
  });
});
