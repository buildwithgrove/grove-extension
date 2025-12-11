/**
 * Helper to load browser scripts for testing
 * Executes the script in a simulated browser context and returns exports
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { createContext, runInContext, isContext } from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function loadBrowserScript(relativePath, existingContext = null) {
  const fullPath = resolve(__dirname, '../../', relativePath);
  const code = readFileSync(fullPath, 'utf-8');

  // Create or use existing browser-like context
  const context = existingContext || {
    window: {},
    console,
    // Add other globals that might be needed
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
  };
  
  if (!context.window) {
    context.window = context;
  }

  // Ensure context is contextified
  if (!isContext(context)) {
    createContext(context);
  }

  runInContext(code, context);

  return context.window;
}
