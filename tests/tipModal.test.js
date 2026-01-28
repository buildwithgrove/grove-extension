import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let TipModal;
let context;
let dom;

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>');

  // Create context with browser-like environment
  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
  };
  context.window = context;

  // Mock window dimensions
  Object.defineProperty(context.window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(context.window, 'innerHeight', { value: 768, writable: true });

  // Load constants first (defines GROVE_COLORS)
  loadBrowserScript('src/ui/constants.js', context);

  // Load tipModal (defines TipModal)
  loadBrowserScript('src/ui/tipModal.js', context);

  TipModal = context.TipModal;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TipModal', () => {
  describe('constructor', () => {
    it('should initialize with null values', () => {
      const modal = new TipModal();
      expect(modal.modal).toBeNull();
      expect(modal.overlay).toBeNull();
      expect(modal.onConfirm).toBeNull();
      expect(modal.onCancel).toBeNull();
    });
  });

  describe('show', () => {
    it('should create modal and overlay elements', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(context.document.querySelector('.grove-first-tip-modal')).not.toBeNull();
      expect(context.document.querySelector('.grove-first-tip-overlay')).not.toBeNull();
    });

    it('should display "Your First Tip!" title', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.modal.textContent).toContain('Your First Tip!');
    });

    it('should set default amount in input', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.50, false, () => {}, () => {});

      const input = context.document.querySelector('input[type="number"]');
      expect(input.value).toBe('0.50');
    });

    it('should always have checkbox checked (modal only shows when confirmation enabled)', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      // Checkbox is always checked regardless of currentConfirmSetting
      // because this modal only appears when confirmation is enabled
      modal.show(anchor, 0.10, false, () => {}, () => {});

      const checkbox = context.document.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(true);
    });

    it('should display helper text about default amount', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.modal.textContent).toContain('default tip amount');
      expect(modal.modal.textContent).toContain('extension settings');
    });

    it('should store callbacks', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, cancelCb);

      expect(modal.onConfirm).toBe(confirmCb);
      expect(modal.onCancel).toBe(cancelCb);
    });

    it('should remove existing modal before creating new one', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      const firstModal = modal.modal;

      modal.show(anchor, 0.20, true, () => {}, () => {});

      expect(modal.modal).not.toBe(firstModal);
      expect(context.document.querySelectorAll('.grove-first-tip-modal').length).toBe(1);
    });

    it('should add animation keyframes to document', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(context.document.querySelector('#grove-first-tip-animation')).not.toBeNull();
    });

    it('should have overlay with semi-transparent background', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.overlay.style.background).toContain('rgba');
    });
  });

  describe('confirm', () => {
    it('should call onConfirm with amount, confirmBeforeTipping, and X actions', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.25, true, null, null);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.25,
        confirmBeforeTipping: true,
        likeOnTip: null,
        autoReply: null,
        customMessage: null,
      });
    });

    it('should pass false for confirmBeforeTipping when checkbox unchecked', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.10, false, null, null);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.10,
        confirmBeforeTipping: false,
        likeOnTip: null,
        autoReply: null,
        customMessage: null,
      });
    });

    it('should include X actions in callback when provided', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.50, true, true, false);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.50,
        confirmBeforeTipping: true,
        likeOnTip: true,
        autoReply: false,
        customMessage: null,
      });
    });

    it('should hide modal after confirm', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.confirm(0.10, false);

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should enforce minimum amount of 0.01', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0, false);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.01,
        confirmBeforeTipping: false,
        likeOnTip: null,
        autoReply: null,
        customMessage: null,
      });
    });

    it('should enforce minimum for negative amounts', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(-5, true);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.01,
        confirmBeforeTipping: true,
        likeOnTip: null,
        autoReply: null,
        customMessage: null,
      });
    });
  });

  describe('cancel', () => {
    it('should call onCancel callback', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      modal.cancel();

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should hide modal after cancel', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.cancel();

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });
  });

  describe('hide', () => {
    it('should remove modal from DOM', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should remove overlay from DOM', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(context.document.querySelector('.grove-first-tip-overlay')).toBeNull();
    });

    it('should clear callbacks', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(modal.onConfirm).toBeNull();
      expect(modal.onCancel).toBeNull();
    });

    it('should set references to null', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(modal.modal).toBeNull();
      expect(modal.overlay).toBeNull();
    });

    it('should handle being called when not shown', () => {
      const modal = new TipModal();

      expect(() => modal.hide()).not.toThrow();
    });
  });

  describe('overlay click', () => {
    it('should cancel modal when overlay clicked', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      modal.overlay.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('input keyboard events', () => {
    it('should confirm on Enter key', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      const input = context.document.querySelector('input[type="number"]');

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalled();
    });

    it('should cancel on Escape key', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      const input = context.document.querySelector('input[type="number"]');

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(event);

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should use input value and checkbox state when confirming via Enter', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      const input = context.document.querySelector('input[type="number"]');
      const checkbox = context.document.querySelector('input[type="checkbox"]');

      input.value = '0.75';
      checkbox.checked = true;

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalledWith({
        amount: 0.75,
        confirmBeforeTipping: true,
        likeOnTip: null,
        autoReply: null,
        customMessage: '',
      });
    });
  });

  describe('position', () => {
    it('should position modal below and centered on anchor', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 50,
        right: 150,
        width: 100,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 320,
        height: 300,
      }));

      modal.position(anchor);

      expect(modal.modal.style.top).toBe('142px'); // bottom + 12
    });

    it('should handle missing anchor gracefully', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);
      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(() => modal.position(null)).not.toThrow();
    });

    it('should adjust when near right edge', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 900,
        right: 1000,
        width: 100,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 320,
        height: 300,
      }));

      modal.position(anchor);

      // Should adjust left to stay within viewport
      expect(parseInt(modal.modal.style.left)).toBeLessThanOrEqual(1024 - 320 - 16);
    });

    it('should position above anchor when near bottom', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 600,
        bottom: 630,
        left: 100,
        right: 200,
        width: 100,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 320,
        height: 300,
      }));

      modal.position(anchor);

      // Should position above (600 - 300 - 12 = 288)
      expect(parseInt(modal.modal.style.top)).toBeLessThan(600);
    });

    it('should ensure modal stays on screen to the left', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 0,
        right: 50,
        width: 50,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 320,
        height: 300,
      }));

      modal.position(anchor);

      expect(parseInt(modal.modal.style.left)).toBeGreaterThanOrEqual(16);
    });

    it('should ensure modal stays on screen at the top', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 50,
        bottom: 80,
        left: 100,
        right: 200,
        width: 100,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.modal.getBoundingClientRect = vi.fn(() => ({
        width: 320,
        height: 300,
      }));

      // Force position above which would go negative
      modal.position(anchor);

      // Since bottom positioning would overflow and top positioning would go negative,
      // it should clamp to minimum 16
      expect(parseInt(modal.modal.style.top)).toBeGreaterThanOrEqual(16);
    });
  });

  describe('xOptions', () => {
    it('should show X actions section when X is connected', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: true,
        autoReply: true,
      });

      expect(modal.modal.textContent).toContain('𝕏 Actions');
      expect(modal.modal.textContent).toContain('Like this post');
      expect(modal.modal.textContent).toContain('Reply to this post');
    });

    it('should not show X actions section when X is not connected', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: false,
        likeOnTip: true,
        autoReply: true,
      });

      expect(modal.modal.textContent).not.toContain('𝕏 Actions');
    });

    it('should not show X actions section when xOptions is null', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, null);

      expect(modal.modal.textContent).not.toContain('𝕏 Actions');
    });

    it('should check like checkbox based on likeOnTip setting', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: false,
        autoReply: true,
      });

      // Find all checkboxes - first is confirm, second is like, third is reply
      const checkboxes = context.document.querySelectorAll('input[type="checkbox"]');
      // Like checkbox is the second one (index 1)
      expect(checkboxes[1].checked).toBe(false);
    });

    it('should check reply checkbox based on autoReply setting', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: true,
        autoReply: false,
      });

      // Find all checkboxes - first is confirm, second is like, third is reply
      const checkboxes = context.document.querySelectorAll('input[type="checkbox"]');
      // Reply checkbox is the third one (index 2)
      expect(checkboxes[2].checked).toBe(false);
    });
  });

  describe('displayOptions', () => {
    it('should show custom title when provided', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, null, {
        title: 'Confirm Tip',
      });

      expect(modal.modal.textContent).toContain('Confirm Tip');
      expect(modal.modal.textContent).not.toContain('Your First Tip!');
    });

    it('should hide confirm checkbox when showConfirmCheckbox is false', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, null, {
        showConfirmCheckbox: false,
      });

      expect(modal.modal.textContent).not.toContain('Always confirm before tipping');
    });

    it('should show confirm checkbox by default', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.modal.textContent).toContain('Always confirm before tipping');
    });

    it('should hide like checkbox for profile tips', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: true,
        autoReply: true,
      }, {
        isProfileTip: true,
      });

      expect(modal.modal.textContent).not.toContain('Like this post');
      // Reply option should still be shown
      expect(modal.modal.textContent).toContain('Let them know');
    });

    it('should show "Let @username know" for profile tips with username', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: true,
        autoReply: true,
      }, {
        isProfileTip: true,
        recipientUsername: 'vitalik',
      });

      expect(modal.modal.textContent).toContain('Let @vitalik know');
    });

    it('should show "Let @username know" for tweet tips with username', () => {
      const modal = new TipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {}, {
        isConnected: true,
        likeOnTip: true,
        autoReply: true,
      }, {
        isProfileTip: false,
        recipientUsername: 'sassal',
      });

      expect(modal.modal.textContent).toContain('Let @sassal know');
    });
  });
});
