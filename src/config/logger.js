/**
 * Grove Extension Logger
 * Only logs in local development mode (groveEnvironment === 'local').
 * Reads environment from chrome.storage.local on load and
 * enables itself automatically for local development.
 * Errors always log regardless of environment.
 */
var groveLog = {
  _enabled: false,

  enable() {
    this._enabled = true;
  },

  log(...args) {
    if (this._enabled) console.log('[Grove]', ...args);
  },

  warn(...args) {
    if (this._enabled) console.warn('[Grove]', ...args);
  },

  error(...args) {
    console.error('[Grove]', ...args);
  },
};

// Auto-detect dev mode from storage
(function () {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['groveEnvironment'], function (result) {
        if (result && result.groveEnvironment === 'local') {
          groveLog.enable();
        }
      });
    }
  } catch (e) {
    // Extension context invalidated — stay silent
  }
})();

if (typeof window !== 'undefined') {
  window.groveLog = groveLog;
}
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.groveLog = groveLog;
}
