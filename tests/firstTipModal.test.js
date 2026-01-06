import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let FirstTipModal;
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

  // Load firstTipModal (defines FirstTipModal)
  loadBrowserScript('src/ui/firstTipModal.js', context);

  FirstTipModal = context.FirstTipModal;
});

afterEach(() => {
  vi.restoreAllMocks();
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
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(context.document.querySelector('.grove-first-tip-modal')).not.toBeNull();
      expect(context.document.querySelector('.grove-first-tip-overlay')).not.toBeNull();
    });

    it('should display "Your First Tip!" title', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.modal.textContent).toContain('Your First Tip!');
    });

    it('should set default amount in input', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.50, false, () => {}, () => {});

      const input = context.document.querySelector('input[type="number"]');
      expect(input.value).toBe('0.50');
    });

    it('should set checkbox based on currentConfirmSetting true', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, true, () => {}, () => {});

      const checkbox = context.document.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(true);
    });

    it('should not check checkbox when currentConfirmSetting is false', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      const checkbox = context.document.querySelector('input[type="checkbox"]');
      expect(checkbox.checked).toBe(false);
    });

    it('should display helper text about default amount', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.modal.textContent).toContain('default tip amount');
      expect(modal.modal.textContent).toContain('extension settings');
    });

    it('should store callbacks', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, cancelCb);

      expect(modal.onConfirm).toBe(confirmCb);
      expect(modal.onCancel).toBe(cancelCb);
    });

    it('should remove existing modal before creating new one', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      const firstModal = modal.modal;

      modal.show(anchor, 0.20, true, () => {}, () => {});

      expect(modal.modal).not.toBe(firstModal);
      expect(context.document.querySelectorAll('.grove-first-tip-modal').length).toBe(1);
    });

    it('should add animation keyframes to document', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(context.document.querySelector('#grove-first-tip-animation')).not.toBeNull();
    });

    it('should have overlay with semi-transparent background', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(modal.overlay.style.background).toContain('rgba');
    });
  });

  describe('confirm', () => {
    it('should call onConfirm with amount and confirmBeforeTipping', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.25, true);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.25, confirmBeforeTipping: true });
    });

    it('should pass false for confirmBeforeTipping when checkbox unchecked', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0.10, false);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.10, confirmBeforeTipping: false });
    });

    it('should hide modal after confirm', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.confirm(0.10, false);

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should enforce minimum amount of 0.01', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(0, false);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.01, confirmBeforeTipping: false });
    });

    it('should enforce minimum for negative amounts', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, confirmCb, () => {});
      modal.confirm(-5, true);

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.01, confirmBeforeTipping: true });
    });
  });

  describe('cancel', () => {
    it('should call onCancel callback', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, cancelCb);
      modal.cancel();

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should hide modal after cancel', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.cancel();

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });
  });

  describe('hide', () => {
    it('should remove modal from DOM', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(context.document.querySelector('.grove-first-tip-modal')).toBeNull();
    });

    it('should remove overlay from DOM', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(context.document.querySelector('.grove-first-tip-overlay')).toBeNull();
    });

    it('should clear callbacks', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      modal.show(anchor, 0.10, false, () => {}, () => {});
      modal.hide();

      expect(modal.onConfirm).toBeNull();
      expect(modal.onCancel).toBeNull();
    });

    it('should set references to null', () => {
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

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
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
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

      expect(confirmCb).toHaveBeenCalledWith({ amount: 0.75, confirmBeforeTipping: true });
    });
  });

  describe('position', () => {
    it('should position modal below and centered on anchor', () => {
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);
      modal.show(anchor, 0.10, false, () => {}, () => {});

      expect(() => modal.position(null)).not.toThrow();
    });

    it('should adjust when near right edge', () => {
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
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
      const modal = new FirstTipModal();
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
});
