/**
 * X (Twitter) OAuth Popup UI Handler
 * Manages X login/logout UI state in the popup
 * Requires: src/auth/xAuth.js, src/ui/toast.js
 */

/**
 * Load and update X login status UI
 * Updates both Home card and Settings > X views
 * @returns {Promise<void>}
 */
async function loadXLoginStatus() {
  try {
    // Home card elements
    const homeXSettingsTitle = document.getElementById('homeXSettingsTitle');
    const homeXConnectBtn = document.getElementById('homeXConnectBtn');
    const homeXSettingsChevron = document.getElementById('homeXSettingsChevron');

    // Settings > X elements
    const settingsXConnectionStatus = document.getElementById('settingsXConnectionStatus');
    const settingsXConnectBtn = document.getElementById('settingsXConnectBtn');
    const settingsXDisconnectBtn = document.getElementById('settingsXDisconnectBtn');
    const settingsXActionsGroup = document.getElementById('settingsXActionsGroup');
    const settingsXMenuDesc = document.getElementById('settingsXMenuDesc');

    // Check if we have a token (don't verify with API call on every load)
    const isLoggedIn = await XAuth.isLoggedIn();

    if (isLoggedIn) {
      // Update Home card - show "Connected" with chevron to navigate
      if (homeXSettingsTitle) homeXSettingsTitle.textContent = 'Connected';
      if (homeXConnectBtn) {
        homeXConnectBtn.textContent = 'Manage';
        homeXConnectBtn.classList.remove('hidden');
      }
      if (homeXSettingsChevron) homeXSettingsChevron.classList.remove('hidden');

      // Update Settings > X view
      if (settingsXConnectionStatus) settingsXConnectionStatus.textContent = 'Connected to X';
      if (settingsXConnectBtn) settingsXConnectBtn.classList.add('hidden');
      if (settingsXDisconnectBtn) settingsXDisconnectBtn.classList.remove('hidden');
      if (settingsXActionsGroup) settingsXActionsGroup.classList.remove('hidden');
      if (settingsXMenuDesc) settingsXMenuDesc.textContent = 'Connected';
    } else {
      // Update Home card - show "Setup" with Connect button
      if (homeXSettingsTitle) homeXSettingsTitle.textContent = 'Setup';
      if (homeXConnectBtn) {
        homeXConnectBtn.textContent = 'Connect';
        homeXConnectBtn.classList.remove('hidden');
      }
      if (homeXSettingsChevron) homeXSettingsChevron.classList.add('hidden');

      // Update Settings > X view
      if (settingsXConnectionStatus) settingsXConnectionStatus.textContent = 'Not connected';
      if (settingsXConnectBtn) settingsXConnectBtn.classList.remove('hidden');
      if (settingsXDisconnectBtn) settingsXDisconnectBtn.classList.add('hidden');
      if (settingsXActionsGroup) settingsXActionsGroup.classList.add('hidden');
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
