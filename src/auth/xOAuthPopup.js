/**
 * X (Twitter) OAuth Popup UI Handler
 * Manages X login/logout UI state in the popup
 * Requires: src/auth/xAuth.js, src/ui/toast.js
 */

/**
 * Load and update X login status UI
 * @returns {Promise<void>}
 */
async function loadXLoginStatus() {
  try {
    const homeXSettingsTitle = document.getElementById('homeXSettingsTitle');
    const homeXConnectBtn = document.getElementById('homeXConnectBtn');
    const homeXSettingsGear = document.getElementById('homeXSettingsGear');
    const homeTwitterSettingsBtn = document.getElementById('homeTwitterSettingsBtn');
    const homeTwitterSettingsPanel = document.getElementById('homeTwitterSettingsPanel');

    // Check if we have a token (don't verify with API call on every load)
    const isLoggedIn = await XAuth.isLoggedIn();

    if (isLoggedIn) {
      if (homeXSettingsTitle) homeXSettingsTitle.textContent = 'Connected';
      if (homeXConnectBtn) homeXConnectBtn.classList.add('hidden');
      if (homeXSettingsGear) homeXSettingsGear.classList.remove('hidden');
      // Auto-expand settings panel when connected
      if (homeTwitterSettingsBtn) homeTwitterSettingsBtn.classList.add('hidden');
      if (homeTwitterSettingsPanel) homeTwitterSettingsPanel.classList.remove('hidden');
    } else {
      if (homeXSettingsTitle) homeXSettingsTitle.textContent = 'Setup';
      if (homeXConnectBtn) homeXConnectBtn.classList.remove('hidden');
      if (homeXSettingsGear) homeXSettingsGear.classList.add('hidden');
      // Show card when not connected
      if (homeTwitterSettingsBtn) homeTwitterSettingsBtn.classList.remove('hidden');
      if (homeTwitterSettingsPanel) homeTwitterSettingsPanel.classList.add('hidden');
    }
  } catch (error) {
    console.error('[Grove Extension] X login status check failed:', error);
  }
}

/**
 * Handle X disconnect
 * @returns {Promise<void>}
 */
async function handleXDisconnect() {
  await XAuth.logout();
  await loadXLoginStatus();
  if (typeof showToast === 'function') {
    showToast('Disconnected from 𝕏');
  }
}

/**
 * Handle X login flow
 * @returns {Promise<void>}
 */
async function handleXLogin() {
  const homeXConnectBtn = document.getElementById('homeXConnectBtn');

  try {
    if (homeXConnectBtn) {
      homeXConnectBtn.textContent = 'Connecting...';
    }

    // Clear any stale tokens before starting fresh login
    await XAuth.logout();

    await XAuth.login();

    // Refresh UI from stored state
    if (homeXConnectBtn) {
      homeXConnectBtn.textContent = 'Connect';
    }

    // Only update UI and show toast if actually logged in
    const isLoggedIn = await XAuth.isLoggedIn();
    if (isLoggedIn) {
      await loadXLoginStatus();
      if (typeof showToast === 'function') {
        showToast('Connected to 𝕏');
      }
    }
  } catch (error) {
    console.error('[Grove Extension] X login failed:', error);
    if (homeXConnectBtn) {
      homeXConnectBtn.textContent = 'Connect';
    }
    // Truncate long error messages to prevent UI overflow
    const errorMsg = error.message?.length > 50
      ? error.message.substring(0, 50) + '...'
      : error.message;
    if (typeof showToast === 'function') {
      showToast('Login failed: ' + errorMsg);
    }
  }
}

/**
 * Check if X is connected before performing an action
 * Shows connect modal if not connected
 * @param {Function} showConnectModal - Function to show connect modal
 * @returns {Promise<boolean>} - True if connected
 */
async function requireXConnection(showConnectModal) {
  const isXConnected = await XAuth.isLoggedIn();
  if (!isXConnected && typeof showConnectModal === 'function') {
    showConnectModal();
    return false;
  }
  return isXConnected;
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.loadXLoginStatus = loadXLoginStatus;
  window.handleXDisconnect = handleXDisconnect;
  window.handleXLogin = handleXLogin;
  window.requireXConnection = requireXConnection;
}
