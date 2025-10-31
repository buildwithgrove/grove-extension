/**
 * Polyfills for service worker environment
 * Chrome extension service workers don't have access to DOM APIs
 */

// Provide minimal polyfills for missing browser APIs
if (typeof document === "undefined") {
  // @ts-ignore
  globalThis.document = {
    createElement: () => ({}),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementsByTagName: () => [],
    head: {
      appendChild: () => {},
    },
  };
}

if (typeof window === "undefined") {
  // @ts-ignore
  globalThis.window = globalThis;
}

export {};
