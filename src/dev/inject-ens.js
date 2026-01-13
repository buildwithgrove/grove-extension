/**
 * DEV ONLY: Inject fake ENS names into Twitter bios for testing
 *
 * This script runs at document_start (before main extension scripts)
 * to inject fake .eth names into user bios, allowing you to test
 * the tipping flow on accounts that don't have crypto addresses.
 *
 * Usage:
 *   1. Set DEV_INJECT_ENS_ENABLED = true
 *   2. Add usernames to DEV_INJECT_ENS_ACCOUNTS array
 *   3. Reload extension and visit the user's profile
 *
 * Check status: make dev_inject_ens_status
 */

// ============================================================
// CONFIGURATION - Edit these values for development/testing
// ============================================================

const DEV_INJECT_ENS_ENABLED = false;

const DEV_INJECT_ENS_ACCOUNTS = [
  'elonmusk',
  'naval',
  'pmarca',
  // Add more usernames here for testing
];

// ============================================================
// IMPLEMENTATION - No need to edit below this line
// ============================================================

(function() {
  'use strict';

  if (!DEV_INJECT_ENS_ENABLED) {
    return;
  }

  /**
   * Extract username from current URL
   * @returns {string|null}
   */
  function getUsernameFromUrl() {
    try {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      if (segments.length === 0) return null;

      const username = segments[0].toLowerCase();

      // Skip system routes
      const systemRoutes = [
        'home', 'i', 'intent', 'search', 'explore', 'settings',
        'messages', 'notifications', 'compose', 'login', 'signup'
      ];
      if (systemRoutes.includes(username)) return null;

      // Skip tweet pages
      if (segments[1] === 'status') return null;

      return username;
    } catch (e) {
      return null;
    }
  }

  /**
   * Inject ENS name into bio element
   * @param {Element} bioElement
   * @param {string} username
   */
  function injectEnsIntoBio(bioElement, username) {
    const ensName = `${username}.eth`;

    // Check if already injected
    if (bioElement.textContent.includes(ensName)) {
      return;
    }

    // Create a styled span for the injected ENS
    const ensSpan = document.createElement('span');
    ensSpan.textContent = ` ${ensName}`;
    ensSpan.style.cssText = 'color: #389f58; font-weight: 500;';
    ensSpan.setAttribute('data-grove-dev-injected', 'true');

    // Append to bio
    bioElement.appendChild(ensSpan);

    console.log(`[Grove DEV] Injected ${ensName} into bio for @${username}`);
  }

  /**
   * Check if current page is for a target account and inject if so
   */
  function checkAndInject() {
    const username = getUsernameFromUrl();
    if (!username) return;

    // Check if this username is in our target list (case-insensitive)
    const normalizedAccounts = DEV_INJECT_ENS_ACCOUNTS.map(a => a.toLowerCase());
    if (!normalizedAccounts.includes(username)) return;

    // Look for the bio element
    const bioElement = document.querySelector('[data-testid="UserDescription"]');
    if (bioElement) {
      injectEnsIntoBio(bioElement, username);
    }
  }

  // Set up MutationObserver to watch for bio element
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        checkAndInject();
      }
    }
  });

  // Start observing once DOM is ready
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    });
  }

  // Also check on URL changes (Twitter is a SPA)
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      // Small delay for DOM to update
      setTimeout(checkAndInject, 500);
    }
  }, 500);

  // Initial check
  checkAndInject();

  console.log('[Grove DEV] ENS injection enabled for accounts:', DEV_INJECT_ENS_ACCOUNTS);
})();
