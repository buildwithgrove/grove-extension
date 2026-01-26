import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let TipButton;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  
  // Create context
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

  // Mock matchMedia
  context.window.matchMedia = vi.fn((query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

  // Mock getComputedStyle
  context.window.getComputedStyle = vi.fn(() => ({
    backgroundColor: 'rgb(0, 0, 0)',
  }));

  // Load constants first (defines GROVE_COLORS)
  loadBrowserScript('src/ui/constants.js', context);

  // Load darkMode (defines detectDarkMode, isColorDark)
  loadBrowserScript('src/utils/darkMode.js', context);

  // Load TipButton
  loadBrowserScript('src/ui/button.js', context);

  TipButton = context.TipButton;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TipButton', () => {
  describe('constructor', () => {
    it('should create button with default twitter platform', () => {
      const button = new TipButton(() => {});
      expect(button.platform).toBe('twitter');
    });

    it('should create button with specified platform', () => {
      const button = new TipButton(() => {}, 'generic');
      expect(button.platform).toBe('generic');
    });

    it('should store callback function', () => {
      const callback = vi.fn();
      const button = new TipButton(callback);
      expect(button.onClickCallback).toBe(callback);
    });
  });

  describe('detectDarkMode', () => {
    it('should detect dark mode from dark background', () => {
      context.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(0, 0, 0)',
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(true);
    });

    it('should detect light mode from light background', () => {
      context.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(255, 255, 255)',
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(false);
    });

    it('should fallback to system preference', () => {
      context.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: '',
      }));
      context.window.matchMedia = vi.fn(() => ({
        matches: true,
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(true);
    });
  });

  describe('isColorDark (from darkMode.js)', () => {
    it('should return true for black', () => {
      expect(context.isColorDark('rgb(0, 0, 0)')).toBe(true);
    });

    it('should return false for white', () => {
      expect(context.isColorDark('rgb(255, 255, 255)')).toBe(false);
    });

    it('should return true for dark gray', () => {
      expect(context.isColorDark('rgb(50, 50, 50)')).toBe(true);
    });

    it('should return false for light gray', () => {
      expect(context.isColorDark('rgb(200, 200, 200)')).toBe(false);
    });

    it('should handle rgba format', () => {
      expect(context.isColorDark('rgba(0, 0, 0, 1)')).toBe(true);
      expect(context.isColorDark('rgba(255, 255, 255, 0.5)')).toBe(false);
    });

    it('should return null for unparseable colors', () => {
      expect(context.isColorDark('invalid')).toBe(null);
    });

    it('should return null for transparent backgrounds', () => {
      expect(context.isColorDark('rgba(0, 0, 0, 0)')).toBe(null);
    });
  });

  describe('create', () => {
    it('should create Twitter button by default', () => {
      const tipButton = new TipButton(() => {});
      const element = tipButton.create();

      expect(element.tagName).toBe('BUTTON');
      expect(element.className).toBe('grove-tip-button');
      expect(element.id).toBe('grove-tip-button');
    });

    it('should create floating container for generic platform', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      const element = tipButton.create();

      expect(element.tagName).toBe('DIV');
      expect(element.id).toBe('grove-floating-container');
    });
  });

  describe('createTwitterButton', () => {
    it('should have correct attributes', () => {
      const tipButton = new TipButton(() => {});
      const button = tipButton.createTwitterButton();

      expect(button.getAttribute('aria-label')).toBe('Send a tip');
      expect(button.getAttribute('role')).toBe('button');
      expect(button.getAttribute('type')).toBe('button');
    });

    it('should contain tip text and emoji', () => {
      const tipButton = new TipButton(() => {});
      const button = tipButton.createTwitterButton();

      expect(button.textContent).toContain('Tip');
      expect(button.textContent).toContain('🌿');
    });

    it('should trigger callback on click', () => {
      const callback = vi.fn();
      const tipButton = new TipButton(callback);
      const button = tipButton.createTwitterButton();

      button.click();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('createFloatingButton', () => {
    it('should create container with button inside', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      const container = tipButton.createFloatingButton();

      expect(container.id).toBe('grove-floating-container');
      const button = container.querySelector('button');
      expect(button).not.toBeNull();
      expect(button.id).toBe('grove-tip-button');
    });

    it('should store container reference', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      tipButton.createFloatingButton();

      expect(tipButton.container).not.toBeNull();
    });
  });

  describe('injectFloating', () => {
    it('should inject floating container into body', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      tipButton.create();

      const result = tipButton.injectFloating();

      expect(result).toBe(true);
      expect(context.document.getElementById('grove-floating-container')).not.toBeNull();
    });

    it('should return false if container already exists', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      tipButton.create();
      tipButton.injectFloating();

      const result = tipButton.injectFloating();

      expect(result).toBe(false);
    });

    it('should return false if no container', () => {
      const tipButton = new TipButton(() => {}, 'twitter');
      tipButton.createTwitterButton();

      const result = tipButton.injectFloating();

      expect(result).toBe(false);
    });
  });

  describe('handleClick', () => {
    it('should call callback when set', () => {
      const callback = vi.fn();
      const tipButton = new TipButton(callback);

      tipButton.handleClick();

      expect(callback).toHaveBeenCalled();
    });

    it('should not throw when no callback', () => {
      const tipButton = new TipButton(null);

      expect(() => tipButton.handleClick()).not.toThrow();
    });
  });

  describe('setLoading', () => {
    it('should disable button', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setLoading();

      expect(tipButton.button.disabled).toBe(true);
    });

    it('should disable pointer events', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setLoading();

      expect(tipButton.button.style.pointerEvents).toBe('none');
    });

    it('should handle null button gracefully', () => {
      const tipButton = new TipButton(() => {});

      expect(() => tipButton.setLoading()).not.toThrow();
    });
  });

  describe('setSuccess', () => {
    it('should enable button', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      tipButton.setLoading();

      tipButton.setSuccess();

      expect(tipButton.button.disabled).toBe(false);
    });

    it('should add success class', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setSuccess();

      expect(tipButton.button.classList.contains('grove-tip-success')).toBe(true);
    });

    it('should update button text', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setSuccess();

      expect(tipButton.button.textContent).toContain('Sent!');
    });
  });

  describe('setError', () => {
    it('should add error class', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setError();

      expect(tipButton.button.classList.contains('grove-tip-error')).toBe(true);
    });

    it('should update button text', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      tipButton.setError();

      expect(tipButton.button.textContent).toContain('Failed');
    });
  });

  describe('resetState', () => {
    it('should remove state classes', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      tipButton.setSuccess();

      tipButton.resetState();

      expect(tipButton.button.classList.contains('grove-tip-success')).toBe(false);
      expect(tipButton.button.classList.contains('grove-tip-error')).toBe(false);
    });

    it('should restore original text', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      tipButton.setSuccess();

      tipButton.resetState();

      expect(tipButton.button.textContent).toContain('Tip');
      expect(tipButton.button.textContent).toContain('🌿');
    });

    it('should enable button', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      tipButton.setLoading();

      tipButton.resetState();

      expect(tipButton.button.disabled).toBe(false);
    });
  });

  describe('inject', () => {
    it('should inject button into target element', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      const target = context.document.createElement('div');

      const result = tipButton.inject(target);

      expect(result).toBe(true);
      expect(target.querySelector('#grove-tip-button')).not.toBeNull();
    });

    it('should return false if button already exists', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      const target = context.document.createElement('div');
      context.document.body.appendChild(target);
      tipButton.inject(target);

      const result = tipButton.inject(target);

      expect(result).toBe(false);
    });

    it('should return false if no target', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      const result = tipButton.inject(null);

      expect(result).toBe(false);
    });

    it('should return false if no button', () => {
      const tipButton = new TipButton(() => {});
      const target = context.document.createElement('div');

      const result = tipButton.inject(target);

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove button from DOM', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      const target = context.document.createElement('div');
      context.document.body.appendChild(target);
      tipButton.inject(target);

      tipButton.remove();

      expect(target.querySelector('#grove-tip-button')).toBeNull();
    });

    it('should remove floating container', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      tipButton.create();
      tipButton.injectFloating();

      tipButton.remove();

      expect(context.document.getElementById('grove-floating-container')).toBeNull();
    });

    it('should handle button not in DOM gracefully', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      expect(() => tipButton.remove()).not.toThrow();
    });
  });
});
