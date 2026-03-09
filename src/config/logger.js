/**
 * Grove Extension Logger
 * Only logs in dev mode (testnet/localhost environments).
 * Reads environment from chrome.storage.local on load and
 * enables itself automatically for non-production environments.
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
