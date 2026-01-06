import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let TipPopover;
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

  // Load popover (defines TipPopover)
  loadBrowserScript('src/ui/popover.js', context);

  TipPopover = context.TipPopover;
});

afterEach(() => {
  vi.restoreAllMocks();
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
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      expect(context.document.querySelector('.grove-tip-popover')).not.toBeNull();
      expect(context.document.querySelector('.grove-popover-overlay')).not.toBeNull();
    });

    it('should set default amount in input', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.50, () => {}, () => {});

      const input = context.document.querySelector('input[type="number"]');
      expect(input.value).toBe('0.50');
    });

    it('should store callbacks', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, cancelCb);

      expect(popover.onConfirm).toBe(confirmCb);
      expect(popover.onCancel).toBe(cancelCb);
    });

    it('should remove existing popover before creating new one', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      const firstPopover = popover.popover;

      popover.show(anchor, 0.20, () => {}, () => {});

      expect(popover.popover).not.toBe(firstPopover);
      expect(context.document.querySelectorAll('.grove-tip-popover').length).toBe(1);
    });

    it('should contain title "Send Tip"', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      expect(popover.popover.textContent).toContain('Send Tip');
    });

    it('should add animation keyframes to document', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});

      expect(context.document.querySelector('#grove-popover-animation')).not.toBeNull();
    });
  });

  describe('position', () => {
    it('should position popover below anchor', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 50,
        right: 100,
        width: 50,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

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
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: 900,
        right: 950,
        width: 50,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      // Should adjust left to stay within viewport (1024 - 200 - 16 = 808)
      expect(parseInt(popover.popover.style.left)).toBeLessThan(900);
    });

    it('should position above anchor when near bottom', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 700,
        bottom: 730,
        left: 50,
        right: 100,
        width: 50,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      // Should position above (700 - 150 - 8 = 542)
      expect(parseInt(popover.popover.style.top)).toBeLessThan(700);
    });

    it('should handle missing anchor gracefully', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);
      popover.show(anchor, 0.10, () => {}, () => {});

      expect(() => popover.position(null)).not.toThrow();
    });

    it('should ensure popover stays on screen to the left', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      anchor.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        bottom: 130,
        left: -50,
        right: 0,
        width: 50,
        height: 30,
      }));
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.popover.getBoundingClientRect = vi.fn(() => ({
        width: 200,
        height: 150,
      }));

      popover.position(anchor);

      expect(parseInt(popover.popover.style.left)).toBeGreaterThanOrEqual(16);
    });
  });

  describe('confirm', () => {
    it('should call onConfirm with amount', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(0.25);

      expect(confirmCb).toHaveBeenCalledWith(0.25);
    });

    it('should hide popover after confirm', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.confirm(0.10);

      expect(context.document.querySelector('.grove-tip-popover')).toBeNull();
    });

    it('should enforce minimum amount of 0.01', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(0);

      expect(confirmCb).toHaveBeenCalledWith(0.01);
    });

    it('should enforce minimum for negative amounts', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      popover.confirm(-5);

      expect(confirmCb).toHaveBeenCalledWith(0.01);
    });
  });

  describe('cancel', () => {
    it('should call onCancel callback', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      popover.cancel();

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should hide popover after cancel', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.cancel();

      expect(context.document.querySelector('.grove-tip-popover')).toBeNull();
    });
  });

  describe('hide', () => {
    it('should remove popover from DOM', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(context.document.querySelector('.grove-tip-popover')).toBeNull();
    });

    it('should remove overlay from DOM', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(context.document.querySelector('.grove-popover-overlay')).toBeNull();
    });

    it('should clear callbacks', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, () => {});
      popover.hide();

      expect(popover.onConfirm).toBeNull();
      expect(popover.onCancel).toBeNull();
    });

    it('should set references to null', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      context.document.body.appendChild(anchor);

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
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      popover.overlay.click();

      expect(cancelCb).toHaveBeenCalled();
    });
  });

  describe('input keyboard events', () => {
    it('should confirm on Enter key', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      const input = context.document.querySelector('input[type="number"]');

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalled();
    });

    it('should cancel on Escape key', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const cancelCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, () => {}, cancelCb);
      const input = context.document.querySelector('input[type="number"]');

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Escape' });
      input.dispatchEvent(event);

      expect(cancelCb).toHaveBeenCalled();
    });

    it('should use input value when confirming', () => {
      const popover = new TipPopover();
      const anchor = context.document.createElement('button');
      const confirmCb = vi.fn();
      context.document.body.appendChild(anchor);

      popover.show(anchor, 0.10, confirmCb, () => {});
      const input = context.document.querySelector('input[type="number"]');
      input.value = '0.75';

      const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter' });
      input.dispatchEvent(event);

      expect(confirmCb).toHaveBeenCalledWith(0.75);
    });
  });
});
