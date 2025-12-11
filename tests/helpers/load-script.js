/**
 * Helper to load browser scripts for testing
 * Executes the script in a simulated browser context and returns exports
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createContext, runInContext } from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadBrowserScript(relativePath) {
  const fullPath = resolve(__dirname, '../../', relativePath);
  const code = readFileSync(fullPath, 'utf-8');

  // Create a browser-like context
  const context = {
    window: {},
    console,
  };
  context.window = context; // window === global in browser

  createContext(context);
  runInContext(code, context);

  return context.window;
}
