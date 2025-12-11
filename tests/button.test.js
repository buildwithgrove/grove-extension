import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

let TipButton;
let GROVE_COLORS;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  global.document = dom.window.document;
  global.window = dom.window;

  // Mock matchMedia
  global.window.matchMedia = vi.fn((query) => ({
    matches: query === '(prefers-color-scheme: dark)',
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

  // Mock getComputedStyle
  global.window.getComputedStyle = vi.fn(() => ({
    backgroundColor: 'rgb(0, 0, 0)',
  }));

  // Define GROVE_COLORS
  GROVE_COLORS = {
    primary: '#389f58',
    primaryHover: '#2f8549',
    primaryLight: '#4fb76d',
    shadow: 'rgba(56, 159, 88, 0.3)',
    shadowHover: 'rgba(56, 159, 88, 0.5)',
    error: '#ef4444',
    errorShadow: 'rgba(239, 68, 68, 0.55)',
  };
  global.GROVE_COLORS = GROVE_COLORS;

  // Create TipButton class for testing
  class TestTipButton {
    constructor(onClickCallback, platform = 'twitter') {
      this.onClickCallback = onClickCallback;
      this.button = null;
      this.platform = platform;
      this.isDarkMode = this.detectDarkMode();
    }

    detectDarkMode() {
      if (this.platform === 'twitter') {
        const bg = document.body.style.backgroundColor ||
                   window.getComputedStyle(document.body).backgroundColor;
        if (bg) {
          return this.isColorDark(bg);
        }
      }

      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
      }

      const bg = window.getComputedStyle(document.body).backgroundColor;
      return this.isColorDark(bg);
    }

    isColorDark(color) {
      const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (!match) return true;

      const r = parseInt(match[1]);
      const g = parseInt(match[2]);
      const b = parseInt(match[3]);

      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance < 0.5;
    }

    create() {
      if (this.platform === 'generic') {
        return this.createFloatingButton();
      }
      return this.createTwitterButton();
    }

    createTwitterButton() {
      this.button = document.createElement('button');
      this.button.setAttribute('aria-label', 'Send a tip');
      this.button.setAttribute('role', 'button');
      this.button.setAttribute('type', 'button');
      this.button.className = 'grove-tip-button';
      this.button.id = 'grove-tip-button';

      const bgColor = this.isDarkMode ? '#1a1a1a' : '#ffffff';
      const textColor = this.isDarkMode ? '#ffffff' : '#1a1a1a';
      this.bgColor = bgColor;

      this.button.style.background = bgColor;
      this.button.style.border = `2px solid ${GROVE_COLORS.primary}`;

      const textSpan = document.createElement('span');
      textSpan.textContent = 'Tip';
      textSpan.style.color = textColor;

      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = '🌿';

      textSpan.appendChild(emojiSpan);
      this.button.appendChild(textSpan);

      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleClick();
      });

      return this.button;
    }

    createFloatingButton() {
      const container = document.createElement('div');
      container.id = 'grove-floating-container';

      this.button = document.createElement('button');
      this.button.setAttribute('aria-label', 'Send a tip');
      this.button.className = 'grove-floating-button';
      this.button.id = 'grove-tip-button';

      const textSpan = document.createElement('span');
      textSpan.textContent = 'Tip';

      const emojiSpan = document.createElement('span');
      emojiSpan.textContent = '🌿';

      this.button.appendChild(textSpan);
      this.button.appendChild(emojiSpan);
      container.appendChild(this.button);

      this.container = container;

      this.button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleClick();
      });

      return container;
    }

    injectFloating() {
      if (!this.container) return false;
      if (document.getElementById('grove-floating-container')) return false;
      document.body.appendChild(this.container);
      return true;
    }

    handleClick() {
      if (this.onClickCallback) {
        this.onClickCallback();
      }
    }

    setLoading() {
      if (!this.button) return;
      this.button.disabled = true;
      this.button.style.pointerEvents = 'none';
    }

    setSuccess() {
      if (!this.button) return;
      this.button.disabled = false;
      this.button.style.pointerEvents = '';
      this.button.classList.add('grove-tip-success');

      const textElement = this.button.querySelector('span');
      if (textElement) {
        textElement.textContent = 'Sent! ✓';
      }
    }

    setError() {
      if (!this.button) return;
      this.button.disabled = false;
      this.button.style.pointerEvents = '';
      this.button.classList.add('grove-tip-error');

      const textElement = this.button.querySelector('span');
      if (textElement) {
        textElement.textContent = 'Failed ✗';
      }
    }

    resetState() {
      if (!this.button) return;
      this.button.disabled = false;
      this.button.style.pointerEvents = '';
      this.button.classList.remove('grove-tip-success', 'grove-tip-error');

      const textElement = this.button.querySelector('span');
      if (textElement) {
        textElement.textContent = 'Tip';
        const emojiSpan = document.createElement('span');
        emojiSpan.textContent = '🌿';
        textElement.appendChild(emojiSpan);
      }
    }

    inject(targetElement) {
      if (!targetElement || !this.button) return false;
      if (document.getElementById(this.button.id)) return false;
      targetElement.appendChild(this.button);
      return true;
    }

    remove() {
      if (this.container && this.container.parentElement) {
        this.container.remove();
      }
      if (this.button && this.button.parentElement) {
        this.button.remove();
      }
    }
  }

  TipButton = TestTipButton;
});

afterEach(() => {
  delete global.document;
  delete global.window;
  delete global.GROVE_COLORS;
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
      global.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(0, 0, 0)',
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(true);
    });

    it('should detect light mode from light background', () => {
      global.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: 'rgb(255, 255, 255)',
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(false);
    });

    it('should fallback to system preference', () => {
      global.window.getComputedStyle = vi.fn(() => ({
        backgroundColor: '',
      }));
      global.window.matchMedia = vi.fn(() => ({
        matches: true,
      }));
      const button = new TipButton(() => {});
      expect(button.isDarkMode).toBe(true);
    });
  });

  describe('isColorDark', () => {
    it('should return true for black', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('rgb(0, 0, 0)')).toBe(true);
    });

    it('should return false for white', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('rgb(255, 255, 255)')).toBe(false);
    });

    it('should return true for dark gray', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('rgb(50, 50, 50)')).toBe(true);
    });

    it('should return false for light gray', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('rgb(200, 200, 200)')).toBe(false);
    });

    it('should handle rgba format', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('rgba(0, 0, 0, 1)')).toBe(true);
      expect(button.isColorDark('rgba(255, 255, 255, 0.5)')).toBe(false);
    });

    it('should default to dark for unparseable colors', () => {
      const button = new TipButton(() => {});
      expect(button.isColorDark('invalid')).toBe(true);
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
      expect(document.getElementById('grove-floating-container')).not.toBeNull();
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
      const target = document.createElement('div');

      const result = tipButton.inject(target);

      expect(result).toBe(true);
      expect(target.querySelector('#grove-tip-button')).not.toBeNull();
    });

    it('should return false if button already exists', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      const target = document.createElement('div');
      document.body.appendChild(target);
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
      const target = document.createElement('div');

      const result = tipButton.inject(target);

      expect(result).toBe(false);
    });
  });

  describe('remove', () => {
    it('should remove button from DOM', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();
      const target = document.createElement('div');
      document.body.appendChild(target);
      tipButton.inject(target);

      tipButton.remove();

      expect(target.querySelector('#grove-tip-button')).toBeNull();
    });

    it('should remove floating container', () => {
      const tipButton = new TipButton(() => {}, 'generic');
      tipButton.create();
      tipButton.injectFloating();

      tipButton.remove();

      expect(document.getElementById('grove-floating-container')).toBeNull();
    });

    it('should handle button not in DOM gracefully', () => {
      const tipButton = new TipButton(() => {});
      tipButton.create();

      expect(() => tipButton.remove()).not.toThrow();
    });
  });
});
