/**
 * X (Twitter) OAuth Popup UI Handler
 * Manages X login/logout UI state in the popup
 * Requires: src/auth/xAuth.js, src/ui/toast.js
 */

/**
 * Load and update X login status UI
 * Updates Settings > X view
 * @returns {Promise<void>}
 */
async function loadXLoginStatus() {
  try {
    // Settings > X elements
    const settingsXConnectionStatus = document.getElementById('settingsXConnectionStatus');
    const settingsXConnectBtn = document.getElementById('settingsXConnectBtn');
    const settingsXDisconnectBtn = document.getElementById('settingsXDisconnectBtn');
    const settingsXActionsGroup = document.getElementById('settingsXActionsGroup');
    const settingsXMenuDesc = document.getElementById('settingsXMenuDesc');
    const settingsXFeaturesGroup = document.getElementById('settingsXFeaturesGroup');

    // Check if we have a token (don't verify with API call on every load)
    const isLoggedIn = await XAuth.isLoggedIn();

    if (isLoggedIn) {
      // Update Settings > X view
      if (settingsXConnectionStatus) settingsXConnectionStatus.textContent = 'Connected to X';
      if (settingsXConnectBtn) settingsXConnectBtn.classList.add('hidden');
      if (settingsXDisconnectBtn) settingsXDisconnectBtn.classList.remove('hidden');
      if (settingsXActionsGroup) settingsXActionsGroup.classList.remove('hidden');
      if (settingsXFeaturesGroup) settingsXFeaturesGroup.classList.add('hidden');
      if (settingsXMenuDesc) settingsXMenuDesc.textContent = 'Connected';
    } else {
      // Update Settings > X view
      if (settingsXConnectionStatus) settingsXConnectionStatus.textContent = 'Not connected';
      if (settingsXConnectBtn) settingsXConnectBtn.classList.remove('hidden');
      if (settingsXDisconnectBtn) settingsXDisconnectBtn.classList.add('hidden');
      if (settingsXActionsGroup) settingsXActionsGroup.classList.add('hidden');
      if (settingsXFeaturesGroup) settingsXFeaturesGroup.classList.remove('hidden');
      if (settingsXMenuDesc) settingsXMenuDesc.textContent = 'Auto-like & reply settings';
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
  const settingsXConnectBtn = document.getElementById('settingsXConnectBtn');

  try {
    if (settingsXConnectBtn) {
      settingsXConnectBtn.textContent = 'Connecting...';
    }

    // Clear any stale tokens before starting fresh login
    await XAuth.logout();

    await XAuth.login();

    // Refresh UI from stored state
    if (settingsXConnectBtn) {
      settingsXConnectBtn.textContent = 'Connect';
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
    if (settingsXConnectBtn) {
      settingsXConnectBtn.textContent = 'Connect';
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
