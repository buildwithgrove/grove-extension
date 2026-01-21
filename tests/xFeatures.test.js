import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let buildAutoReplyMessage;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');

  context = {
    window: dom.window,
    document: dom.window.document,
    console: console,
    // Mock XAuth if needed, though buildAutoReplyMessage doesn't use it
    XAuth: {},
  };
  context.window = context;
  
  // Need to provide globals if xFeatures expects them
  // xFeatures.js doesn't seem to depend on globals for buildAutoReplyMessage
  
  loadBrowserScript('src/content/xFeatures.js', context);
  buildAutoReplyMessage = context.buildAutoReplyMessage;
});

describe('buildAutoReplyMessage', () => {
  const template = 'Hey @{username}, I sent {amount} on {chain}. Tx: {tx_link} via {grove_link}';
  
  it('should replace all placeholders including amount', () => {
    const data = {
      username: 'testuser',
      amount: '5.00',
      chain: 'Base',
      tx_link: 'https://tx.link',
      grove_link: 'grove.city'
    };
    
    const result = buildAutoReplyMessage(template, data);
    expect(result).toBe('Hey @testuser, I sent 5.00 on Base. Tx: https://tx.link via grove.city');
  });

  it('should handle missing amount', () => {
    const data = {
      username: 'testuser',
      chain: 'Base'
    };
    // If amount is missing in data, it shouldn't replace {amount}
    const result = buildAutoReplyMessage(template, data);
    expect(result).toContain('{amount}');
    expect(result).toContain('@testuser');
  });

  it('should handle custom template', () => {
    const customTemplate = 'Tip: {amount} USDC';
    const data = { amount: '10.00' };
    expect(buildAutoReplyMessage(customTemplate, data)).toBe('Tip: 10.00 USDC');
  });
});
