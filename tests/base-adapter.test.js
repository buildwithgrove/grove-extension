
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let BaseAdapter;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;

  context = {
    window: dom.window,
    document: document,
    console: console,
    MutationObserver: dom.window.MutationObserver,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  context.window = context;

  loadBrowserScript('src/adapters/base.js', context);
  BaseAdapter = context.BaseAdapter;
});

describe('BaseAdapter', () => {
  it('getApiPlatformName should default to getPlatformName()', () => {
    class TestAdapter extends BaseAdapter {
      getPlatformName() {
        return 'test_platform';
      }
    }
    
    const adapter = new TestAdapter();
    expect(adapter.getApiPlatformName()).toBe('test_platform');
  });
});
