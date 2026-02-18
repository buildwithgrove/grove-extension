import { describe, it, expect, beforeEach } from 'vitest';
import { loadBrowserScript } from './helpers/load-script.js';

let GROVE_ENVIRONMENTS;
let GroveEnv;
let context;

beforeEach(() => {
  context = {
    window: {},
    console: console,
  };
  context.window = context;

  loadBrowserScript('src/config/environments.js', context);
  GROVE_ENVIRONMENTS = context.GROVE_ENVIRONMENTS;
  GroveEnv = context.GroveEnv;
});

describe('GROVE_ENVIRONMENTS', () => {
  it('should define production, testnet, and localhost', () => {
    expect(GROVE_ENVIRONMENTS.production).toBeDefined();
    expect(GROVE_ENVIRONMENTS.testnet).toBeDefined();
    expect(GROVE_ENVIRONMENTS.localhost).toBeDefined();
  });

  it('production should use mainnet config', () => {
    const prod = GROVE_ENVIRONMENTS.production;
    expect(prod.apiUrl).toBe('https://api.grove.city');
    expect(prod.appUrl).toBe('https://app.grove.city');
    expect(prod.defaultChain).toBe('base');
    expect(prod.jwtStorageKey).toBe('GROVE_JWT_PRODUCTION');
    expect(prod.isDevMode).toBe(false);
  });

  it('testnet should use testnet config', () => {
    const testnet = GROVE_ENVIRONMENTS.testnet;
    expect(testnet.apiUrl).toBe('https://api.testnet.grove.city');
    expect(testnet.appUrl).toBe('https://app.testnet.grove.city');
    expect(testnet.defaultChain).toBe('base-sepolia');
    expect(testnet.jwtStorageKey).toBe('GROVE_JWT_TESTNET');
    expect(testnet.isDevMode).toBe(true);
  });

  it('localhost should use local config with mainnet chain', () => {
    const local = GROVE_ENVIRONMENTS.localhost;
    expect(local.apiUrl).toBe('http://localhost:8000');
    expect(local.appUrl).toBe('http://localhost:3000');
    expect(local.defaultChain).toBe('base');
    expect(local.jwtStorageKey).toBe('GROVE_JWT_LOCALHOST');
    expect(local.isDevMode).toBe(true);
  });
});

describe('GroveEnv.get', () => {
  it('should return config for valid env IDs', () => {
    expect(GroveEnv.get('production')).toBe(GROVE_ENVIRONMENTS.production);
    expect(GroveEnv.get('testnet')).toBe(GROVE_ENVIRONMENTS.testnet);
    expect(GroveEnv.get('localhost')).toBe(GROVE_ENVIRONMENTS.localhost);
  });

  it('should return null for unknown env ID', () => {
    expect(GroveEnv.get('unknown')).toBeNull();
  });
});

describe('GroveEnv.resolveActiveEnvId', () => {
  it('should return production when groveEnvironment is not local', () => {
    expect(GroveEnv.resolveActiveEnvId('prod', 'testnet')).toBe('production');
    expect(GroveEnv.resolveActiveEnvId('prod', 'localhost')).toBe('production');
    expect(GroveEnv.resolveActiveEnvId(undefined, 'testnet')).toBe('production');
  });

  it('should return localhost when local + localhost endpoint', () => {
    expect(GroveEnv.resolveActiveEnvId('local', 'localhost')).toBe('localhost');
  });

  it('should return testnet when local + testnet endpoint', () => {
    expect(GroveEnv.resolveActiveEnvId('local', 'testnet')).toBe('testnet');
  });

  it('should return production when local + production endpoint', () => {
    expect(GroveEnv.resolveActiveEnvId('local', 'production')).toBe('production');
  });

  it('should return production when local + unknown endpoint', () => {
    expect(GroveEnv.resolveActiveEnvId('local', 'unknown')).toBe('production');
  });
});

describe('GroveEnv.topUpUrl', () => {
  it('should derive top-up URL from appUrl for each env', () => {
    expect(GroveEnv.topUpUrl('production')).toBe('https://app.grove.city/wallets?action=topup');
    expect(GroveEnv.topUpUrl('testnet')).toBe('https://app.testnet.grove.city/wallets?action=topup');
    expect(GroveEnv.topUpUrl('localhost')).toBe('http://localhost:3000/wallets?action=topup');
  });

  it('should fall back to production for unknown env', () => {
    expect(GroveEnv.topUpUrl('unknown')).toBe('https://app.grove.city/wallets?action=topup');
  });
});

describe('GroveEnv.extensionUrl', () => {
  it('should derive extension URL from appUrl', () => {
    expect(GroveEnv.extensionUrl('production')).toBe('https://app.grove.city/extension');
    expect(GroveEnv.extensionUrl('testnet')).toBe('https://app.testnet.grove.city/extension');
    expect(GroveEnv.extensionUrl('localhost')).toBe('http://localhost:3000/extension');
  });
});

describe('GroveEnv.apiLabel', () => {
  it('should return display label for each env', () => {
    expect(GroveEnv.apiLabel('production')).toBe('api.grove.city');
    expect(GroveEnv.apiLabel('testnet')).toBe('api.testnet.grove.city');
    expect(GroveEnv.apiLabel('localhost')).toBe('localhost:8000');
  });

  it('should fall back to production label for unknown env', () => {
    expect(GroveEnv.apiLabel('unknown')).toBe('api.grove.city');
  });
});

describe('GroveEnv.allowedChains', () => {
  it('should return mainnet chains for production', () => {
    expect(GroveEnv.allowedChains('production')).toEqual(['base', 'solana']);
  });

  it('should return testnet chains for testnet', () => {
    expect(GroveEnv.allowedChains('testnet')).toEqual(['base-sepolia', 'solana-devnet']);
  });

  it('should return mainnet chains for localhost', () => {
    expect(GroveEnv.allowedChains('localhost')).toEqual(['base', 'solana']);
  });
});

describe('GroveEnv.defaultChain', () => {
  it('should return base for production', () => {
    expect(GroveEnv.defaultChain('production')).toBe('base');
  });

  it('should return base-sepolia for testnet', () => {
    expect(GroveEnv.defaultChain('testnet')).toBe('base-sepolia');
  });

  it('should return base for localhost', () => {
    expect(GroveEnv.defaultChain('localhost')).toBe('base');
  });
});

describe('GroveEnv.isTestChains', () => {
  it('should return false for production', () => {
    expect(GroveEnv.isTestChains('production')).toBe(false);
  });

  it('should return true for testnet', () => {
    expect(GroveEnv.isTestChains('testnet')).toBe(true);
  });

  it('should return false for localhost', () => {
    expect(GroveEnv.isTestChains('localhost')).toBe(false);
  });
});

describe('GroveEnv.jwtKeyForEnv', () => {
  it('should return correct JWT storage key for each env', () => {
    expect(GroveEnv.jwtKeyForEnv('production')).toBe('GROVE_JWT_PRODUCTION');
    expect(GroveEnv.jwtKeyForEnv('testnet')).toBe('GROVE_JWT_TESTNET');
    expect(GroveEnv.jwtKeyForEnv('localhost')).toBe('GROVE_JWT_LOCALHOST');
  });

  it('should fall back to production for unknown env', () => {
    expect(GroveEnv.jwtKeyForEnv('unknown')).toBe('GROVE_JWT_PRODUCTION');
  });
});
