/**
 * Grove Extension Popup
 * Handles navigation, settings, and interactions
 */

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

// Leaderboard switcher
let leaderboardSwitcherBtns = null;
let leaderboardViews = null;

// Chain selector
const chainSelectorBtn = document.getElementById('chainSelectorBtn');
const chainDropdown = document.getElementById('chainDropdown');
const chainName = document.getElementById('chainName');
const chainOptions = document.querySelectorAll('.chain-option');

// Home States
const onboardingState = document.getElementById('onboardingState');
const connectedState = document.getElementById('connectedState');
const setupTokenBtn = document.getElementById('setupTokenBtn');

// Tip amount (Home)
const tipAmountDisplay = document.getElementById('tipAmountDisplay');
const tipAmountEdit = document.getElementById('tipAmountEdit');
const tipAmountInput = document.getElementById('tipAmountInput');
const saveTipAmount = document.getElementById('saveTipAmount');
const cancelTipAmount = document.getElementById('cancelTipAmount');
const editTipBtn = document.getElementById('editTipAmount');
const confirmTipToggle = document.getElementById('confirmTipToggle');

// Tip amount (Settings)
const settingsTipAmountDisplay = document.getElementById('settingsTipAmountDisplay');
const settingsTipAmountInput = document.getElementById('settingsTipAmountInput');
const settingsSaveTipAmount = document.getElementById('settingsSaveTipAmount');
const settingsEditTipBtn = document.getElementById('settingsEditTipBtn');
const settingsCancelTipAmount = document.getElementById('settingsCancelTipAmount');
const settingsTipRow = document.getElementById('settingsTipRow');
const settingsTipEditRow = document.getElementById('settingsTipEditRow');

// Balance
const balanceAmount = document.getElementById('balanceAmount');
const balanceDisplay = document.getElementById('balanceDisplay');
const topUpBtn = document.getElementById('topUpBtn');

// Settings
const devModeToggle = document.getElementById('devModeCheckbox');
const endpointSelector = document.getElementById('endpointSelector');
const endpointDisplay = document.getElementById('endpointDisplay');
const endpointOptions = document.querySelectorAll('input[name="endpoint"]');

// JWT Management
const jwtStatusDisplay = document.getElementById('jwtStatusDisplay');
const manageJwtBtn = document.getElementById('manageJwtBtn');
const jwtEditContainer = document.getElementById('jwtEditContainer');
const jwtInput = document.getElementById('jwtInput');
const saveJwtBtn = document.getElementById('saveJwtBtn');
const cancelJwtBtn = document.getElementById('cancelJwtBtn');
const toggleJwtVisibility = document.getElementById('toggleJwtVisibility');
let removeJwtBtn = null; // Will be set later since it might not exist initially.

// Previous Keys Management
const prevKeysCount = document.getElementById('prevKeysCount');
const viewPrevKeysBtn = document.getElementById('viewPrevKeysBtn');
const prevKeysContainer = document.getElementById('prevKeysContainer');
const prevKeysList = document.getElementById('prevKeysList');
const closePrevKeysBtn = document.getElementById('closePrevKeysBtn');

// Earn Tab - Address Display
const earnAddressText = document.getElementById('earnAddressText');
const copyEarnAddressBtn = document.getElementById('copyEarnAddressBtn');
const ensNameDisplay = document.getElementById('ensNameDisplay');
const ensNameValue = document.getElementById('ensNameValue');
const copyEnsNameBtn = document.getElementById('copyEnsNameBtn');

// Initialize Previous Keys UI
let prevKeysUI = null;

// Storage Keys
const STORAGE_KEYS = {
  JWT: 'GROVE_API_JWT',
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  CONFIRM_TIP: 'GROVE_CONFIRM_TIP',
  AUTO_REPLY: 'GROVE_AUTO_REPLY',
  AUTO_REPLY_MESSAGE: 'GROVE_AUTO_REPLY_MESSAGE',
  LIKE_ON_TIP: 'GROVE_LIKE_ON_TIP',
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
  ENDPOINT: 'groveEndpoint',
  LAST_BALANCES: 'GROVE_LAST_BALANCES',
  CLIENT_ADDRESS: 'GROVE_CLIENT_ADDRESS',
  ENS_NAME: 'GROVE_ENS_NAME',
};

// Default auto-reply message template
const DEFAULT_AUTO_REPLY_MESSAGE = `Hey @{username}, loved this post! Just sent you a {amount} tip on {chain} via @BuildWithGrove.

Tx: {tx_link}

Find out more → {grove_link}`;

// X Login Elements
const xLoginStatus = document.getElementById('xLoginStatus');
const xLoginBtn = document.getElementById('xLoginBtn');
const xPreConnectInfo = document.getElementById('xPreConnectInfo');
const xPostConnectOptions = document.getElementById('xPostConnectOptions');
const likeOnTipToggle = document.getElementById('likeOnTipToggle');
const autoReplyToggle = document.getElementById('autoReplyToggle');
const autoReplyMessageContainer = document.getElementById('autoReplyMessageContainer');
const autoReplyMessageInput = document.getElementById('autoReplyMessageInput');
const saveAutoReplyMessageBtn = document.getElementById('saveAutoReplyMessageBtn');
const resetAutoReplyMessageBtn = document.getElementById('resetAutoReplyMessageBtn');

// Defaults
const DEFAULT_TIP_AMOUNT = 0.10;
const DEFAULT_CHAIN = 'base-sepolia';
const DEFAULT_ENV = 'local';
const DEFAULT_ENDPOINT = 'testnet';
const DEFAULT_BALANCE_DISPLAY = '0.00';
const TOP_UP_URLS = {
  mainnet: 'https://app.grove.city/profile',
  testnet: 'https://testnet.grove.city/profile'
};

/**
 * Initialize Popup
 */
async function init() {
  // Initialize Previous Keys UI
  prevKeysUI = new PreviousKeysUI(prevKeysCount, prevKeysList, prevKeysContainer);

  // Set up callback for when a previous key is used
  prevKeysUI.setOnUseKey(async (key) => {
    // Archive current key first (if any)
    const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
    const currentJwt = result[STORAGE_KEYS.JWT];
    if (currentJwt) {
      await KeyManager.archiveCurrentKey(currentJwt);
    }

    // Set the selected key as current
    await chrome.storage.local.set({ [STORAGE_KEYS.JWT]: key });

    // Delete the key from previous keys (since it's now current)
    const keys = await KeyManager.getPreviousKeys();
    const keyIndex = keys.findIndex(k => k.key === key);
    if (keyIndex !== -1) {
      await KeyManager.deleteKey(keyIndex);
    }

    // Update UI
    updateAuthState(key);
    await prevKeysUI.updateCount();
    await prevKeysUI.render();
    await fetchBalance();

    // Navigate to home
    document.querySelector('[data-target="tab-home"]').click();
  });

  await loadJWT();
  await loadTipAmount();
  await loadConfirmTip();
  await loadLikeOnTip();
  await loadAutoReply();
  await loadAutoReplyMessage();
  await loadXLoginStatus();
  await loadEnvironment();
  await loadChain();
  await loadEndpoint();
  await prevKeysUI.updateCount();
  await loadClientAddress();
  loadExtensionVersion();
  setupEventListeners();

  // Fetch balance after everything is loaded (also updates client address)
  await fetchBalance();

  // Resolve ENS name in the background (don't await to avoid blocking UI)
  loadAndResolveEnsName();
}

/**
 * Load extension version from manifest
 */
function loadExtensionVersion() {
  const versionElement = document.getElementById('extensionVersion');
  if (versionElement && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = manifest.version;
  }
}

/**
 * Setup Listeners
 */
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', handleNavigation);
  });

  // Leaderboard switcher
  setupLeaderboardSwitcher();

  // History tab
  setupHistoryTab();

  // Settings drill-down navigation
  setupSettingsDrillDown();

  // Chain Selector
  chainSelectorBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    chainDropdown.classList.toggle('hidden');
  });

  chainOptions.forEach(option => {
    option.addEventListener('click', handleChainSelection);
  });

  document.addEventListener('click', (e) => {
    if (!chainSelectorBtn.contains(e.target) && !chainDropdown.contains(e.target)) {
      chainDropdown.classList.add('hidden');
    }
  });

  // Tip Amount (Home)
  editTipBtn.addEventListener('click', showTipEdit);
  cancelTipAmount.addEventListener('click', hideTipEdit);
  saveTipAmount.addEventListener('click', saveTip);
  confirmTipToggle.addEventListener('change', handleConfirmTipToggle);

  // Tip Amount (Settings) - synced with Home
  if (settingsEditTipBtn) {
    settingsEditTipBtn.addEventListener('click', showSettingsTipEdit);
  }
  if (settingsCancelTipAmount) {
    settingsCancelTipAmount.addEventListener('click', hideSettingsTipEdit);
  }
  if (settingsSaveTipAmount) {
    settingsSaveTipAmount.addEventListener('click', saveTipFromSettings);
  }
  if (settingsTipAmountInput) {
    settingsTipAmountInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') saveTipFromSettings();
    });
  }

  // JWT
  setupTokenBtn.addEventListener('click', () => {
    // Navigate to settings -> Account and open edit
    document.querySelector('[data-target="tab-settings"]').click();
    showSettingsView('account');
    showJwtEdit();
  });
  
  manageJwtBtn.addEventListener('click', () => {
    if (jwtEditContainer.classList.contains('hidden')) {
      showJwtEdit();
    } else {
      hideJwtEdit();
    }
  });

  if (saveJwtBtn) saveJwtBtn.addEventListener('click', saveJwt);
  if (cancelJwtBtn) cancelJwtBtn.addEventListener('click', hideJwtEdit);

  // Get remove button and add event listener
  removeJwtBtn = document.getElementById('removeJwtBtn');
  if (removeJwtBtn) {
    removeJwtBtn.addEventListener('click', removeJwt);
  }

  // Previous Keys
  if (viewPrevKeysBtn) {
    viewPrevKeysBtn.addEventListener('click', () => {
      if (prevKeysContainer.classList.contains('hidden')) {
        prevKeysUI.show();
        viewPrevKeysBtn.textContent = 'Hide';
      } else {
        prevKeysUI.hide();
        viewPrevKeysBtn.textContent = 'View';
      }
    });
  }
  if (closePrevKeysBtn) {
    closePrevKeysBtn.addEventListener('click', () => {
      prevKeysUI.hide();
      viewPrevKeysBtn.textContent = 'View';
    });
  }

  // JWT Visibility Toggle
  if (toggleJwtVisibility) {
    toggleJwtVisibility.addEventListener('click', togglePasswordVisibility);
  }

  // Dev Mode
  if (devModeToggle) {
    devModeToggle.addEventListener('change', handleDevModeToggle);
  } else {
    console.error('[Grove Extension] Developer mode toggle element not found');
  }

  // Endpoint Selection
  endpointOptions.forEach(option => {
    option.addEventListener('change', handleEndpointChange);
  });

  // X Login
  if (xLoginBtn) {
    xLoginBtn.addEventListener('click', handleXLogin);
  }

  // Like on Tip Toggle
  if (likeOnTipToggle) {
    likeOnTipToggle.addEventListener('change', handleLikeOnTipToggle);
  }

  // Auto Reply Toggle
  if (autoReplyToggle) {
    autoReplyToggle.addEventListener('change', handleAutoReplyToggle);
  }

  // Auto Reply Message
  if (saveAutoReplyMessageBtn) {
    saveAutoReplyMessageBtn.addEventListener('click', saveAutoReplyMessage);
  }
  if (resetAutoReplyMessageBtn) {
    resetAutoReplyMessageBtn.addEventListener('click', resetAutoReplyMessage);
  }

  // Quick Actions (Placeholders)
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Coming Soon'));
  });

  // Earn Tab - Copy Address Button
  if (copyEarnAddressBtn) {
    copyEarnAddressBtn.addEventListener('click', copyEarnAddress);
  }

  // Earn Tab - Copy ENS Name Button
  if (copyEnsNameBtn) {
    copyEnsNameBtn.addEventListener('click', copyEnsName);
  }

  // Listen for storage changes (e.g., when webapp injects JWT via external messaging)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName === 'local' && changes[STORAGE_KEYS.JWT]) {
      console.log('[Grove Extension] JWT changed in storage, refreshing...');
      const newJwt = changes[STORAGE_KEYS.JWT].newValue;
      updateAuthState(newJwt);
      await fetchBalance();
    }
  });
}

/**
 * Navigation Handler
 */
async function handleNavigation(e) {
  const targetId = e.currentTarget.dataset.target;

  // Update Tabs
  navItems.forEach(item => item.classList.remove('active'));
  e.currentTarget.classList.add('active');

  // Update Pages
  pages.forEach(page => {
    if (page.id === targetId) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });

  // Refresh balance when navigating to home
  if (targetId === 'tab-home') {
    await fetchBalance();
  }

  // Load history when navigating to history tab
  if (targetId === 'tab-history') {
    loadHistory();
  }

  // Load leaderboard data when navigating to leaderboard
  if (targetId === 'tab-leaderboard') {
    if (currentLeaderboardView === 'tippers') {
      loadTopTippers();
    } else if (currentLeaderboardView === 'tippees') {
      loadTopTippees();
    } else if (currentLeaderboardView === 'live') {
      loadLiveTips();
      startLivePolling();
    }
  } else {
    // Stop live polling when leaving leaderboard tab
    stopLivePolling();
  }
}

/**
 * JWT & Auth State
 */
async function loadJWT() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
    const jwt = result[STORAGE_KEYS.JWT];

  updateAuthState(jwt);
}

function updateAuthState(jwt) {
    if (jwt && jwt.length > 0) {
    // Connected
    onboardingState.classList.add('hidden');
    connectedState.classList.remove('hidden');

    // Settings Display - show full key if short, truncate if long
    if (jwt.length <= 20) {
      jwtStatusDisplay.textContent = jwt;
    } else {
      const first = jwt.substring(0, 6);
      const last = jwt.substring(jwt.length - 4);
      jwtStatusDisplay.textContent = `${first}...${last}`;
    }
    jwtStatusDisplay.style.color = 'var(--color-primary)';
    jwtStatusDisplay.style.fontFamily = 'monospace';

    // Get remove button if not already cached
    if (!removeJwtBtn) {
      removeJwtBtn = document.getElementById('removeJwtBtn');
    }
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove('hidden');
    }
    } else {
    // Not Connected
    onboardingState.classList.remove('hidden');
    connectedState.classList.add('hidden');

    jwtStatusDisplay.textContent = 'Not connected';
    jwtStatusDisplay.style.color = 'var(--color-text-secondary)';
    jwtStatusDisplay.style.fontFamily = 'inherit';

    // Get remove button if not already cached
    if (!removeJwtBtn) {
      removeJwtBtn = document.getElementById('removeJwtBtn');
    }
    if (removeJwtBtn) {
      removeJwtBtn.classList.add('hidden');
    }
  }
}

async function showJwtEdit() {
  jwtEditContainer.classList.remove('hidden');
  manageJwtBtn.textContent = 'Close';

  // Get remove button if not already cached
  if (!removeJwtBtn) {
    removeJwtBtn = document.getElementById('removeJwtBtn');
  }

  // Check if JWT exists to show/hide remove button and populate input
  const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
  const jwt = result[STORAGE_KEYS.JWT];
  if (jwt && jwt.length > 0) {
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove('hidden');
    }
    jwtInput.value = jwt; // Show existing key in input
  } else {
    if (removeJwtBtn) {
      removeJwtBtn.classList.add('hidden');
    }
    jwtInput.value = '';
  }

  jwtInput.focus();
}

function hideJwtEdit() {
  jwtEditContainer.classList.add('hidden');
  manageJwtBtn.textContent = 'Manage';
  jwtInput.value = ''; // Clear input for security
}

async function saveJwt() {
  const token = jwtInput.value.trim();
  if (token) {
    // Get current JWT before saving new one
    const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
    const currentJwt = result[STORAGE_KEYS.JWT];

    // If there's a current JWT and it's different from the new one, archive it
    if (currentJwt && currentJwt !== token) {
      await KeyManager.archiveCurrentKey(currentJwt);
    }

    // Save new JWT
    await chrome.storage.local.set({ [STORAGE_KEYS.JWT]: token });
    updateAuthState(token);
    hideJwtEdit();
    showToast('Account connected');
    await prevKeysUI.updateCount();

    // Fetch balance with new token
    await fetchBalance();

    // Go back to home if we were onboarding
    if (!onboardingState.classList.contains('hidden')) {
      document.querySelector('[data-target="tab-home"]').click();
  }
  } else {
    showToast('Please enter a token');
  }
}

let removeJwtPending = false;

async function removeJwt() {
  // First click: show confirmation state
  if (!removeJwtPending) {
    removeJwtPending = true;
    removeJwtBtn.textContent = 'Confirm?';
    removeJwtBtn.classList.add('confirming');

    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      if (removeJwtPending) {
        removeJwtPending = false;
        removeJwtBtn.textContent = 'Disconnect';
        removeJwtBtn.classList.remove('confirming');
      }
    }, 3000);
    return;
  }

  // Second click: actually disconnect
  removeJwtPending = false;
  removeJwtBtn.textContent = 'Disconnect';
  removeJwtBtn.classList.remove('confirming');

  // Get current JWT before removing it
  const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
  const currentJwt = result[STORAGE_KEYS.JWT];

  // Archive current JWT before removing
  if (currentJwt) {
    await KeyManager.archiveCurrentKey(currentJwt);
  }

  // Remove current JWT, client address, and ENS name
  await chrome.storage.local.remove([STORAGE_KEYS.JWT, STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  updateAuthState(null);
  updateEarnAddressDisplay(null);
  updateEnsNameDisplay(null);
  hideJwtEdit();
  showToast('Key saved to history');
  await prevKeysUI.updateCount();

  // Refresh previous keys list if visible
  if (!prevKeysContainer.classList.contains('hidden')) {
    await prevKeysUI.render();
  }
}

/**
 * Tip Amount
 */
async function loadTipAmount() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.TIP_AMOUNT]);
  const amount = result[STORAGE_KEYS.TIP_AMOUNT] || DEFAULT_TIP_AMOUNT;
  updateTipUI(amount);
}

function updateTipUI(amount) {
  const formatted = parseFloat(amount).toFixed(2);

  // Update Home display
  const amountSpan = tipAmountDisplay.querySelector('.amount-value');
  if (amountSpan) {
    amountSpan.textContent = formatted;
  }
  tipAmountInput.value = formatted;

  // Update Settings display (sync)
  if (settingsTipAmountDisplay) {
    const settingsAmountSpan = settingsTipAmountDisplay.querySelector('.amount-value');
    if (settingsAmountSpan) {
      settingsAmountSpan.textContent = formatted;
    }
  }
  if (settingsTipAmountInput) {
    settingsTipAmountInput.value = formatted;
  }
}

function showTipEdit() {
  // Hide the entire card row
  const cardRow = document.querySelector('#tipAmountDisplay').closest('.card-row');
  if (cardRow) {
    cardRow.classList.add('hidden');
  }
  tipAmountEdit.classList.remove('hidden');
}

function hideTipEdit() {
  // Show the entire card row
  const cardRow = document.querySelector('#tipAmountDisplay').closest('.card-row');
  if (cardRow) {
    cardRow.classList.remove('hidden');
  }
  tipAmountEdit.classList.add('hidden');
}

async function saveTip() {
  const val = parseFloat(tipAmountInput.value);
  if (val > 0) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIP_AMOUNT]: val });
    updateTipUI(val);
    hideTipEdit();
    showToast('Default tip updated');
  } else {
    showToast('Invalid amount');
  }
}

function showSettingsTipEdit() {
  if (settingsTipRow) settingsTipRow.classList.add('hidden');
  if (settingsTipEditRow) settingsTipEditRow.classList.remove('hidden');
  if (settingsTipAmountInput) settingsTipAmountInput.focus();
}

function hideSettingsTipEdit() {
  if (settingsTipRow) settingsTipRow.classList.remove('hidden');
  if (settingsTipEditRow) settingsTipEditRow.classList.add('hidden');
}

async function saveTipFromSettings() {
  const val = parseFloat(settingsTipAmountInput.value);
  if (val > 0) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIP_AMOUNT]: val });
    updateTipUI(val);
    hideSettingsTipEdit();
    showToast('Default tip updated');
  } else {
    showToast('Invalid amount');
  }
}

/**
 * Confirm tip toggle
 */
async function loadConfirmTip() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CONFIRM_TIP]);
  const enabled = result[STORAGE_KEYS.CONFIRM_TIP] || false;
  confirmTipToggle.checked = enabled;
}

async function handleConfirmTipToggle() {
  const enabled = confirmTipToggle.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.CONFIRM_TIP]: enabled });
}

/**
 * Auto Reply Toggle
 */
async function loadAutoReply() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.AUTO_REPLY]);
  const enabled = result[STORAGE_KEYS.AUTO_REPLY] || false;
  if (autoReplyToggle) {
    autoReplyToggle.checked = enabled;
  }
}

async function handleAutoReplyToggle() {
  const enabled = autoReplyToggle.checked;

  // Check if user is logged in to X when enabling
  if (enabled) {
    const isLoggedIn = await XAuth.isLoggedIn();
    if (!isLoggedIn) {
      autoReplyToggle.checked = false;
      showToast('Connect X account first');
      return;
    }
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLY]: enabled });

  // Show/hide custom message container
  updateAutoReplyMessageVisibility(enabled);

  showToast(enabled ? 'Auto-reply enabled' : 'Auto-reply disabled');
}

/**
 * Like on Tip Toggle
 */
async function loadLikeOnTip() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.LIKE_ON_TIP]);
  // Default to true (ON by default)
  const enabled = result[STORAGE_KEYS.LIKE_ON_TIP] !== false;
  if (likeOnTipToggle) {
    likeOnTipToggle.checked = enabled;
  }
}

async function handleLikeOnTipToggle() {
  const enabled = likeOnTipToggle.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.LIKE_ON_TIP]: enabled });
  showToast(enabled ? 'Like on tip enabled' : 'Like on tip disabled');
}

/**
 * Update visibility of auto-reply message container
 */
function updateAutoReplyMessageVisibility(enabled) {
  if (autoReplyMessageContainer) {
    if (enabled) {
      autoReplyMessageContainer.classList.remove('hidden');
    } else {
      autoReplyMessageContainer.classList.add('hidden');
    }
  }
}

/**
 * Load Auto Reply Message
 */
async function loadAutoReplyMessage() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.AUTO_REPLY_MESSAGE, STORAGE_KEYS.AUTO_REPLY]);
  const message = result[STORAGE_KEYS.AUTO_REPLY_MESSAGE] || DEFAULT_AUTO_REPLY_MESSAGE;
  const autoReplyEnabled = result[STORAGE_KEYS.AUTO_REPLY] || false;

  if (autoReplyMessageInput) {
    autoReplyMessageInput.value = message;
  }

  // Show/hide based on auto-reply toggle state
  updateAutoReplyMessageVisibility(autoReplyEnabled);
}

/**
 * Save Auto Reply Message
 */
async function saveAutoReplyMessage() {
  const message = autoReplyMessageInput?.value?.trim();

  if (!message) {
    showToast('Message cannot be empty');
    return;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLY_MESSAGE]: message });
  showToast('Auto-reply message saved');
}

/**
 * Reset Auto Reply Message to Default
 */
async function resetAutoReplyMessage() {
  if (autoReplyMessageInput) {
    autoReplyMessageInput.value = DEFAULT_AUTO_REPLY_MESSAGE;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLY_MESSAGE]: DEFAULT_AUTO_REPLY_MESSAGE });
  showToast('Message reset to default');
}

/**
 * X (Twitter) Login
 */
async function loadXLoginStatus() {
  try {
    const isLoggedIn = await XAuth.isLoggedIn();

    if (isLoggedIn) {
      const userInfo = await XAuth.getStoredUserInfo();
      if (userInfo && xLoginStatus) {
        const isRealUsername = userInfo.username && userInfo.username !== 'Connected';
        xLoginStatus.textContent = isRealUsername ? `@${userInfo.username}` : 'Connected';
        xLoginStatus.style.color = 'var(--color-primary)';
      }
      if (xLoginBtn) {
        xLoginBtn.textContent = 'Disconnect';
        xLoginBtn.classList.add('btn-danger-text');
      }
      // Show post-connect options, hide pre-connect info
      if (xPreConnectInfo) {
        xPreConnectInfo.classList.add('hidden');
      }
      if (xPostConnectOptions) {
        xPostConnectOptions.classList.remove('hidden');
      }
    } else {
      if (xLoginStatus) {
        xLoginStatus.textContent = 'Not connected';
        xLoginStatus.style.color = 'var(--color-text-secondary)';
      }
      if (xLoginBtn) {
        xLoginBtn.textContent = 'Connect';
        xLoginBtn.classList.remove('btn-danger-text');
      }
      // Show pre-connect info, hide post-connect options
      if (xPreConnectInfo) {
        xPreConnectInfo.classList.remove('hidden');
      }
      if (xPostConnectOptions) {
        xPostConnectOptions.classList.add('hidden');
      }
      // Disable auto-reply if not logged in
      if (autoReplyToggle && autoReplyToggle.checked) {
        autoReplyToggle.checked = false;
        await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLY]: false });
      }
    }
  } catch (error) {
    console.error('[Grove Extension] X login status check failed:', error);
  }
}

async function handleXLogin() {
  const isLoggedIn = await XAuth.isLoggedIn();

  if (isLoggedIn) {
    // Logout
    await XAuth.logout();
    await loadXLoginStatus();
    // Disable auto-reply when disconnecting
    if (autoReplyToggle) {
      autoReplyToggle.checked = false;
      await chrome.storage.local.set({ [STORAGE_KEYS.AUTO_REPLY]: false });
    }
    showToast('Disconnected from X');
  } else {
    // Login
    try {
      xLoginBtn.textContent = 'Connecting...';
      xLoginBtn.disabled = true;

      const userInfo = await XAuth.login();

      const isRealUsername = userInfo.username && userInfo.username !== 'Connected';
      const displayName = isRealUsername ? `@${userInfo.username}` : 'Connected';

      if (xLoginStatus) {
        xLoginStatus.textContent = displayName;
        xLoginStatus.style.color = 'var(--color-primary)';
      }
      if (xLoginBtn) {
        xLoginBtn.textContent = 'Disconnect';
        xLoginBtn.classList.add('btn-danger-text');
        xLoginBtn.disabled = false;
      }
      // Show post-connect options, hide pre-connect info
      if (xPreConnectInfo) {
        xPreConnectInfo.classList.add('hidden');
      }
      if (xPostConnectOptions) {
        xPostConnectOptions.classList.remove('hidden');
      }

      showToast(isRealUsername ? `Connected as @${userInfo.username}` : 'Connected to X');
    } catch (error) {
      console.error('[Grove Extension] X login failed:', error);
      if (xLoginBtn) {
        xLoginBtn.textContent = 'Connect';
        xLoginBtn.disabled = false;
      }
      showToast('Login failed: ' + error.message);
    }
  }
}

/**
 * Balance
 */
function formatBalance(balance) {
  const parsed = parseFloat(balance);
  if (Number.isNaN(parsed)) {
    return DEFAULT_BALANCE_DISPLAY;
  }
  return parsed.toFixed(2);
}

async function fetchBalance() {
  balanceDisplay.classList.add('loading');

  // Get JWT, chain, and any cached balances first so we can render immediately
  const storageResult = await chrome.storage.local.get([
    STORAGE_KEYS.JWT,
    STORAGE_KEYS.CHAIN,
    STORAGE_KEYS.LAST_BALANCES
  ]);
  const jwt = storageResult[STORAGE_KEYS.JWT];
  const chain = storageResult[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
  const cachedBalances = storageResult[STORAGE_KEYS.LAST_BALANCES] || {};
  const cachedBalance = cachedBalances[chain];

  // Show cached balance if available to avoid flashing $0.00
  if (cachedBalance !== undefined) {
    balanceAmount.textContent = cachedBalance;
  } else {
    balanceAmount.textContent = DEFAULT_BALANCE_DISPLAY;
  }

  try {
    if (!jwt) {
      return;
    }

    // Fetch account data from API
    const response = await GroveAPI.getAccount(jwt);

    if (!response.success || !response.data.balances) {
      console.error('[Grove Extension] Balance fetch failed:', response.error);
      return;
    }

    // Store client_address for Earn tab display
    if (response.data.client_address) {
      const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS]);
      const previousAddress = result[STORAGE_KEYS.CLIENT_ADDRESS];

      await chrome.storage.local.set({ [STORAGE_KEYS.CLIENT_ADDRESS]: response.data.client_address });
      updateEarnAddressDisplay(response.data.client_address);

      // If address changed, clear cached ENS name and re-resolve
      if (previousAddress !== response.data.client_address) {
        await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
        updateEnsNameDisplay(null);
        // Resolve in background
        loadAndResolveEnsName();
      }
    }

    // Find balance for current chain (USDC)
    const chainBalance = response.data.balances.find(
      b => b.network === chain && b.token_symbol === 'USDC'
    );

    if (chainBalance) {
      // Format balance (remove trailing zeros, max 2 decimal places for display)
      const formattedBalance = formatBalance(chainBalance.balance);
      balanceAmount.textContent = formattedBalance;
      cachedBalances[chain] = formattedBalance;
      await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
    } else {
      balanceAmount.textContent = DEFAULT_BALANCE_DISPLAY;
      cachedBalances[chain] = DEFAULT_BALANCE_DISPLAY;
      await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
    }
  } catch (e) {
    console.error('[Grove Extension] Balance fetch failed:', e);
  } finally {
    balanceDisplay.classList.remove('loading');
  }
}

/**
 * Earn Tab - Address Display
 */
function updateEarnAddressDisplay(address) {
  if (earnAddressText && address) {
    earnAddressText.textContent = address;
    earnAddressText.classList.remove('placeholder');
    if (copyEarnAddressBtn) {
      copyEarnAddressBtn.disabled = false;
    }
  } else if (earnAddressText) {
    earnAddressText.textContent = 'Connect to see address';
    earnAddressText.classList.add('placeholder');
    if (copyEarnAddressBtn) {
      copyEarnAddressBtn.disabled = true;
    }
  }
}

async function loadClientAddress() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
  const ensName = result[STORAGE_KEYS.ENS_NAME];
  updateEarnAddressDisplay(address);
  updateEnsNameDisplay(ensName);
}

async function copyEarnAddress() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS]);
  const address = result[STORAGE_KEYS.CLIENT_ADDRESS];

  if (address) {
    try {
      await navigator.clipboard.writeText(address);
      showToast('Address copied!');

      // Visual feedback
      if (copyEarnAddressBtn) {
        copyEarnAddressBtn.classList.add('copied');
        setTimeout(() => {
          copyEarnAddressBtn.classList.remove('copied');
        }, 2000);
      }
    } catch (err) {
      console.error('[Grove Extension] Copy failed:', err);
      showToast('Failed to copy');
    }
  }
}

async function copyEnsName() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENS_NAME]);
  const ensName = result[STORAGE_KEYS.ENS_NAME];

  if (ensName) {
    try {
      await navigator.clipboard.writeText(ensName);
      showToast('ENS name copied!');

      // Visual feedback
      if (copyEnsNameBtn) {
        copyEnsNameBtn.classList.add('copied');
        setTimeout(() => {
          copyEnsNameBtn.classList.remove('copied');
        }, 2000);
      }
    } catch (err) {
      console.error('[Grove Extension] Copy ENS name failed:', err);
      showToast('Failed to copy');
    }
  }
}

/**
 * ENS Reverse Resolution
 * Resolves an Ethereum address to its ENS name (.eth or .base.eth)
 */


/**
 * Resolve ENS name for an address using reverse resolution
 * Checks both Ethereum ENS (.eth) and Base ENS (.base.eth)
 */
async function resolveEnsName(address) {
  if (!address || !address.startsWith('0x')) {
    return null;
  }

  const addr = address.toLowerCase();

  // Try web3.bio API (handles both ENS and Basenames)
  try {
    const response = await fetch(`https://api.web3.bio/profile/${addr}`);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      // Prefer ENS (.eth) over Basenames (.base.eth)
      const ensProfile = data.find(p => p.platform === 'ens' || (p.identity && p.identity.endsWith('.eth') && !p.identity.endsWith('.base.eth')));
      if (ensProfile?.identity) {
        console.log('[Grove Extension] Resolved ENS:', ensProfile.identity);
        return ensProfile.identity;
      }

      // Check for Basenames
      const baseProfile = data.find(p => p.platform === 'basenames' || (p.identity && p.identity.endsWith('.base.eth')));
      if (baseProfile?.identity) {
        console.log('[Grove Extension] Resolved Basename:', baseProfile.identity);
        return baseProfile.identity;
      }
    }
  } catch (e) {
    console.log('[Grove Extension] web3.bio lookup failed:', e.message);
  }

  // Fallback: Try Ensideas API for ENS only
  try {
    const response = await fetch(`https://ensideas.com/ens/resolve/${addr}`);
    const data = await response.json();
    if (data.name && data.name.endsWith('.eth')) {
      console.log('[Grove Extension] Resolved ENS via Ensideas:', data.name);
      return data.name;
    }
  } catch (e) {
    console.log('[Grove Extension] Ensideas lookup failed:', e.message);
  }

  return null;
}


/**
 * Update ENS name display in the UI
 */
function updateEnsNameDisplay(ensName) {
  const ensLinksSection = document.getElementById('ensLinksSection');

  if (ensNameDisplay && ensNameValue) {
    if (ensName) {
      ensNameValue.textContent = ensName;
      ensNameDisplay.classList.remove('hidden');
      // Hide "Get an ENS name" links when user has one
      if (ensLinksSection) {
        ensLinksSection.classList.add('hidden');
      }
    } else {
      ensNameDisplay.classList.add('hidden');
      ensNameValue.textContent = '';
      // Show "Get an ENS name" links when user doesn't have one
      if (ensLinksSection) {
        ensLinksSection.classList.remove('hidden');
      }
    }
  }
}

/**
 * Load and resolve ENS name for stored address
 */
async function loadAndResolveEnsName() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
  const cachedEnsName = result[STORAGE_KEYS.ENS_NAME];

  // Show cached name immediately if available
  if (cachedEnsName) {
    updateEnsNameDisplay(cachedEnsName);
  }

  // If we have an address, try to resolve it
  if (address) {
    try {
      const ensName = await resolveEnsName(address);
      if (ensName) {
        await chrome.storage.local.set({ [STORAGE_KEYS.ENS_NAME]: ensName });
        updateEnsNameDisplay(ensName);
      } else if (cachedEnsName) {
        // Clear cached name if resolution returns nothing
        await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
        updateEnsNameDisplay(null);
      }
    } catch (e) {
      console.error('[Grove Extension] ENS resolution failed:', e);
      // Keep showing cached name on error
    }
  }
}

/**
 * Environment
 */
async function loadEnvironment() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  const testBanner = document.getElementById('testModeBanner');

  if (env === 'local') {
    if (devModeToggle) devModeToggle.checked = true;
    document.body.classList.add('developer-mode');
    if (testBanner) {
      testBanner.classList.remove('hidden');
      testBanner.classList.add('visible');
    }
    if (endpointSelector) endpointSelector.classList.remove('hidden');
  } else {
    if (devModeToggle) devModeToggle.checked = false;
    document.body.classList.remove('developer-mode');
    if (testBanner) {
      testBanner.classList.remove('visible');
    }
    if (endpointSelector) endpointSelector.classList.add('hidden');
  }
}

async function handleDevModeToggle(e) {
  const isDev = e.target.checked;
  const newEnv = isDev ? 'local' : 'prod';
  const testBanner = document.getElementById('testModeBanner');

  await chrome.storage.local.set({ [STORAGE_KEYS.ENVIRONMENT]: newEnv });

  if (isDev) {
    // Enable developer mode
    document.body.classList.add('developer-mode');
    if (testBanner) {
      testBanner.classList.remove('hidden');
      testBanner.classList.add('visible');
    }
    if (endpointSelector) endpointSelector.classList.remove('hidden');
    setTimeout(() => showToast('Developer Mode Enabled'), 350);

    // Switch to testnet endpoint
    await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: 'testnet' });
    await loadEndpoint();

    // Check if current chain is a mainnet and switch to testnet
    const currentChain = chainName.textContent;
    if (currentChain === 'Base') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'base-sepolia' } } }, true);
    }
    // Solana chain selection commented out - Base/Base Sepolia only for now
    // else if (currentChain === 'Solana') {
    //   await handleChainSelection({ currentTarget: { dataset: { chain: 'solana-devnet' } } }, true);
    // }
  } else {
    // Disable developer mode
    document.body.classList.remove('developer-mode');
    if (testBanner) {
      testBanner.classList.remove('visible');
    }
    if (endpointSelector) endpointSelector.classList.add('hidden');
    showToast('Developer Mode Disabled');

    // Reset to production endpoint
    await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: 'production' });
    await loadEndpoint();

    // Check if current chain is a testnet and switch to mainnet
    const currentChain = chainName.textContent;
    if (currentChain === 'Base Sepolia') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'base' } } }, true);
    }
    // Solana chain selection commented out - Base/Base Sepolia only for now
    // else if (currentChain === 'Solana Devnet') {
    //   await handleChainSelection({ currentTarget: { dataset: { chain: 'solana' } } }, true);
    // }
  }
}

/**
 * API Endpoint Selection
 */
async function loadEndpoint() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
  const endpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;

  // Update UI
  if (endpointDisplay) {
    endpointDisplay.textContent = endpoint;
  }

  // Check the correct radio button
  endpointOptions.forEach(option => {
    option.checked = option.value === endpoint;
  });
}

async function handleEndpointChange(e) {
  const endpoint = e.target.value;
  await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: endpoint });

  // Update display
  if (endpointDisplay) {
    endpointDisplay.textContent = endpoint;
  }

  // Show friendly endpoint name in toast
  const endpointNames = {
    'production': 'Production (api.grove.city)',
    'testnet': 'Testnet (api.testnet.grove.city)',
    'localhost': 'Localhost:8000',
    'localhost:3000': 'Localhost:3000',
  };

  showToast(`Switched to ${endpointNames[endpoint] || endpoint}`);
}

/**
 * Chain Selection
 */
async function loadChain() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.CHAIN]);
    const chain = result[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
    updateChainUI(chain);
    updateTopUpLink(chain);
}

function updateChainUI(chain) {
  const config = NETWORKS[chain] || NETWORKS['base'];
  chainName.textContent = config.name;

  // Update chain icon based on selected chain
  const chainIcon = document.getElementById('chainSelectorIcon');
  if (chainIcon) {
    // Get the logo SVG from the dropdown option
    const selectedOption = document.querySelector(`[data-chain="${chain}"]`);
    if (selectedOption) {
      const logo = selectedOption.querySelector('.chain-logo').cloneNode(true);
      logo.setAttribute('width', '16');
      logo.setAttribute('height', '16');
      chainIcon.innerHTML = '';
      chainIcon.appendChild(logo);
    }
  }
}

async function handleChainSelection(e, silent = false) {
  const chain = e.currentTarget.dataset.chain;
  await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
  updateChainUI(chain);
  updateTopUpLink(chain);
  chainDropdown.classList.add('hidden');

  // Switch API endpoint based on chain (testnet vs mainnet)
  const config = NETWORKS[chain] || NETWORKS[DEFAULT_CHAIN];
  const isTestnet = (config.type || '').toLowerCase() === 'testnet';
  const newEndpoint = isTestnet ? 'testnet' : 'production';
  await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: newEndpoint });

  if (!silent) showToast(`Switched to ${NETWORKS[chain].name}`);

  // Reload balance
  fetchBalance();

  // Reload leaderboard data
  seenTxHashes.clear(); // Reset seen tips for new chain
  refreshLeaderboard();
}

function updateTopUpLink(chain) {
  if (!topUpBtn) return;
  const config = NETWORKS[chain] || NETWORKS[DEFAULT_CHAIN];
  const isTestnet = (config.type || '').toLowerCase() === 'testnet';
  topUpBtn.href = isTestnet ? TOP_UP_URLS.testnet : TOP_UP_URLS.mainnet;
}

/**
 * Show a specific settings view (e.g., 'account', 'tipping').
 * Used for programmatic navigation to settings subpages.
 * @param {string} targetView - The view ID suffix (e.g., 'account' for 'settings-account')
 */
function showSettingsView(targetView) {
  const settingsViews = document.querySelectorAll('.settings-view');
  settingsViews.forEach(view => view.classList.remove('active'));

  const targetElement = document.getElementById(`settings-${targetView}`);
  if (targetElement) {
    targetElement.classList.add('active');
  }
}

/**
 * Setup Settings Drill-Down Navigation
 */
function setupSettingsDrillDown() {
  const menuItems = document.querySelectorAll('.settings-menu-item');
  const backBtns = document.querySelectorAll('.settings-back');
  const settingsViews = document.querySelectorAll('.settings-view');

  // Handle menu item clicks
  menuItems.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.drill;

      showSettingsView(targetView);
    });
  });

  // Handle back button clicks
  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.dataset.back;

      // Hide all views
      settingsViews.forEach(view => view.classList.remove('active'));

      // Show target view (main menu)
      const targetElement = document.getElementById(`settings-${targetView}`);
      if (targetElement) {
        targetElement.classList.add('active');
      }
    });
  });
}

/**
 * Leaderboard State
 */
let currentPeriod = 'day';
let currentLeaderboardView = 'live';
let livePollingInterval = null;
let seenTxHashes = new Set();

/**
 * History State
 */
let historyTransactions = [];
let historyFilter = 'all';
let historyCurrentPage = 0;
let historyTotalCount = 0;
const HISTORY_PAGE_SIZE = 10;

/**
 * Setup Leaderboard
 */
function setupLeaderboardSwitcher() {
  const periodBtns = document.querySelectorAll('.period-btn');
  leaderboardSwitcherBtns = document.querySelectorAll('.switcher-btn');
  leaderboardViews = document.querySelectorAll('.leaderboard-view');

  // Period selector
  periodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const period = e.target.dataset.period;
      currentPeriod = period;

      periodBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Reload current leaderboard view
      if (currentLeaderboardView === 'tippers') {
        loadTopTippers();
      } else if (currentLeaderboardView === 'tippees') {
        loadTopTippees();
      }
    });
  });

  // View switcher
  if (leaderboardSwitcherBtns) {
    leaderboardSwitcherBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;
        currentLeaderboardView = view;

        leaderboardSwitcherBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        leaderboardViews.forEach(v => v.classList.remove('active'));
        document.getElementById(`${view}-view`).classList.add('active');

        // Load data for the selected view
        if (view === 'tippers') {
          loadTopTippers();
          stopLivePolling();
        } else if (view === 'tippees') {
          loadTopTippees();
          stopLivePolling();
        } else if (view === 'live') {
          loadLiveTips();
          startLivePolling();
        }
      });
    });
  }
}

/**
 * Load Top Tippers
 */
async function loadTopTippers() {
  const loading = document.getElementById('tippers-loading');
  const empty = document.getElementById('tippers-empty');
  const list = document.getElementById('tippers-list');

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  list.innerHTML = '';

  const result = await GroveAPI.getTopTippers(currentPeriod, 10);

  loading.classList.add('hidden');

  if (!result.success || result.data.entries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  list.innerHTML = result.data.entries.map((entry, i) => `
    <div class="leaderboard-item">
      <div class="rank">${i + 1}</div>
      <div class="user-info">
        <div class="wallet-address">${formatAddress(entry.address)}</div>
        <div class="tip-count">${entry.tipCount.toLocaleString()} tips sent</div>
      </div>
      <div class="amount">${formatUSD(entry.totalUSD)}</div>
    </div>
  `).join('');
}

/**
 * Load Top Tippees
 */
async function loadTopTippees() {
  const loading = document.getElementById('tippees-loading');
  const empty = document.getElementById('tippees-empty');
  const list = document.getElementById('tippees-list');

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  list.innerHTML = '';

  const result = await GroveAPI.getTopTippees(currentPeriod, 10);

  loading.classList.add('hidden');

  if (!result.success || result.data.entries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  list.innerHTML = result.data.entries.map((entry, i) => `
    <div class="leaderboard-item">
      <div class="rank">${i + 1}</div>
      <div class="user-info">
        <div class="wallet-address">${formatAddress(entry.address)}</div>
        <div class="tip-count">${entry.tipCount.toLocaleString()} tips received</div>
      </div>
      <div class="amount">${formatUSD(entry.totalUSD)}</div>
    </div>
  `).join('');
}

/**
 * Load Live Tips
 */
async function loadLiveTips(isRefresh = false) {
  const loading = document.getElementById('live-loading');
  const empty = document.getElementById('live-empty');
  const list = document.getElementById('live-list');

  if (!isRefresh) {
    loading.classList.remove('hidden');
    empty.classList.add('hidden');
    list.innerHTML = '';
  }

  const result = await GroveAPI.getRecentTips(10);

  loading.classList.add('hidden');

  if (!result.success || result.data.entries.length === 0) {
    if (!isRefresh) {
      empty.classList.remove('hidden');
    }
    return;
  }

  const newEntries = result.data.entries.filter(e => !seenTxHashes.has(e.txHash));

  // Update seen hashes
  result.data.entries.forEach(e => seenTxHashes.add(e.txHash));

  list.innerHTML = result.data.entries.map((entry) => {
    const isNew = newEntries.some(n => n.txHash === entry.txHash) && isRefresh;
    return `
      <div class="live-tip-item${isNew ? ' new' : ''}">
        <div class="tip-time">${formatTimeAgo(entry.confirmedAt)}</div>
        <div class="tip-recipient">${formatAddress(entry.address)}</div>
        <div class="tip-amount">${formatUSD(entry.amountUSD)}</div>
      </div>
    `;
  }).join('');
}

/**
 * Start Live Polling
 */
function startLivePolling() {
  stopLivePolling();
  livePollingInterval = setInterval(() => {
    if (currentLeaderboardView === 'live') {
      loadLiveTips(true);
    }
  }, 10000); // Poll every 10 seconds
}

/**
 * Stop Live Polling
 */
function stopLivePolling() {
  if (livePollingInterval) {
    clearInterval(livePollingInterval);
    livePollingInterval = null;
  }
}

/**
 * Refresh current leaderboard view
 */
function refreshLeaderboard() {
  if (currentLeaderboardView === 'live') {
    loadLiveTips();
  } else if (currentLeaderboardView === 'tippers') {
    loadTopTippers();
  } else if (currentLeaderboardView === 'tippees') {
    loadTopTippees();
  }
}

/**
 * Setup History Tab
 */
function setupHistoryTab() {
  const filterBtns = document.querySelectorAll('.history-filter .filter-btn');
  const prevBtn = document.getElementById('history-prev-btn');
  const nextBtn = document.getElementById('history-next-btn');
  const retryBtn = document.getElementById('history-retry-btn');

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const filter = e.target.dataset.filter;
      historyFilter = filter;
      historyCurrentPage = 0;

      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      renderHistoryList();
    });
  });

  // Pagination
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (historyCurrentPage > 0) {
        historyCurrentPage--;
        renderHistoryList();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const filteredCount = getFilteredTransactions().length;
      const totalPages = Math.ceil(filteredCount / HISTORY_PAGE_SIZE);
      if (historyCurrentPage < totalPages - 1) {
        historyCurrentPage++;
        renderHistoryList();
      }
    });
  }

  // Retry button
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      loadHistory();
    });
  }
}

/**
 * Load Transaction History
 */
async function loadHistory() {
  const loading = document.getElementById('history-loading');
  const error = document.getElementById('history-error');
  const empty = document.getElementById('history-empty');
  const notConnected = document.getElementById('history-not-connected');
  const list = document.getElementById('history-list');
  const pagination = document.getElementById('history-pagination');

  // Reset states
  loading.classList.remove('hidden');
  error.classList.add('hidden');
  empty.classList.add('hidden');
  notConnected.classList.add('hidden');
  list.innerHTML = '';
  pagination.classList.add('hidden');

  // Check if connected
  const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
  const jwt = result[STORAGE_KEYS.JWT];

  if (!jwt) {
    loading.classList.add('hidden');
    notConnected.classList.remove('hidden');
    return;
  }

  try {
    // Fetch both tip and fund history in parallel
    const [tipResult, fundResult] = await Promise.allSettled([
      GroveAPI.getTipHistory(jwt, 100, 0),
      GroveAPI.getFundHistory(jwt, 100, 0)
    ]);

    loading.classList.add('hidden');

    // Process results
    const tips = tipResult.status === 'fulfilled' && tipResult.value.success
      ? tipResult.value.data.entries : [];
    const funds = fundResult.status === 'fulfilled' && fundResult.value.success
      ? fundResult.value.data.entries : [];

    // Check if both failed
    if (tips.length === 0 && funds.length === 0 &&
        tipResult.status === 'rejected' && fundResult.status === 'rejected') {
      error.classList.remove('hidden');
      document.getElementById('history-error-message').textContent = 'Unable to load transactions';
      return;
    }

    // Transform and combine transactions
    const tipTransactions = tips.map(tip => ({
      id: `tip-${tip.id}`,
      type: tip.direction === 'sent' ? 'tip_sent' : 'tip_received',
      amount_usd: tip.amount_usd,
      token_symbol: tip.token_symbol,
      network: tip.network,
      status: tip.status,
      created_at: tip.created_at,
      tx_hash: tip.tx_hash,
      counterparty_address: tip.counterparty_address,
      destination: tip.destination
    }));

    const fundTransactions = funds.map(fund => ({
      id: `fund-${fund.id}`,
      type: 'deposit',
      amount_usd: fund.amount_usd,
      token_symbol: fund.token_symbol,
      network: fund.network,
      status: fund.status,
      created_at: fund.created_at,
      tx_hash: fund.tx_hash
    }));

    // Combine and sort by date (newest first)
    historyTransactions = [...tipTransactions, ...fundTransactions]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    historyTotalCount = historyTransactions.length;
    historyCurrentPage = 0;

    renderHistoryList();

  } catch (err) {
    console.error('[Grove Extension] History load failed:', err);
    loading.classList.add('hidden');
    error.classList.remove('hidden');
  }
}

/**
 * Get filtered transactions based on current filter
 */
function getFilteredTransactions() {
  return historyTransactions.filter(tx => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'tips') return tx.type === 'tip_sent' || tx.type === 'tip_received';
    if (historyFilter === 'deposits') return tx.type === 'deposit';
    return true;
  });
}

/**
 * Render History List
 */
function renderHistoryList() {
  const empty = document.getElementById('history-empty');
  const emptyMessage = document.getElementById('history-empty-message');
  const list = document.getElementById('history-list');
  const pagination = document.getElementById('history-pagination');
  const pageInfo = document.getElementById('history-page-info');
  const prevBtn = document.getElementById('history-prev-btn');
  const nextBtn = document.getElementById('history-next-btn');

  const filtered = getFilteredTransactions();

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    list.innerHTML = '';
    pagination.classList.add('hidden');

    // Contextual empty message
    if (historyFilter === 'tips') {
      emptyMessage.textContent = 'No tips yet';
    } else if (historyFilter === 'deposits') {
      emptyMessage.textContent = 'No deposits yet';
    } else {
      emptyMessage.textContent = 'No transactions yet';
    }
    return;
  }

  empty.classList.add('hidden');

  // Paginate
  const totalPages = Math.ceil(filtered.length / HISTORY_PAGE_SIZE);
  const start = historyCurrentPage * HISTORY_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + HISTORY_PAGE_SIZE);

  // Render items
  list.innerHTML = pageItems.map(tx => {
    const icon = getTransactionIcon(tx.type);
    const label = getTransactionLabel(tx.type);
    const amount = formatHistoryAmount(tx);
    const time = formatRelativeTime(tx.created_at);
    const amountClass = tx.type === 'tip_sent' ? 'sent' : 'received';

    const explorerUrl = getExplorerUrl(tx.network, tx.tx_hash);
    const parsed = parseDestination(tx.destination);

    // Build description with links
    let descriptionHtml;
    if (parsed.profileHandle && parsed.profileUrl) {
      // Twitter/X: show @username linking to profile
      descriptionHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="history-item-desc-link">${parsed.profileHandle}</a>`;
    } else if (parsed.postUrl) {
      // Other URL: show truncated destination
      descriptionHtml = `<a href="${parsed.postUrl}" target="_blank" rel="noopener noreferrer" class="history-item-desc-link">${truncateDestination(tx.destination)}</a>`;
    } else if (tx.counterparty_address) {
      descriptionHtml = formatAddress(tx.counterparty_address);
    } else {
      descriptionHtml = formatNetwork(tx.network);
    }

    // Tweet/post link icon (if there's a specific post, not just a profile)
    const postLinkHtml = parsed.postUrl && parsed.profileUrl
      ? `<a href="${parsed.postUrl}" target="_blank" rel="noopener noreferrer" class="history-post-link" title="View post">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>`
      : '';

    // TX link icon (chain icon)
    const txLinkHtml = explorerUrl
      ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </a>`
      : '';

    return `
      <div class="history-item">
        <div class="history-item-icon ${tx.type}">${icon}</div>
        <div class="history-item-details">
          <div class="history-item-label">${label}</div>
          <div class="history-item-description">${descriptionHtml}</div>
        </div>
        <div class="history-item-right">
          <div class="history-item-amount ${amountClass}">${amount}</div>
          <div class="history-item-time">${time}</div>
        </div>
        <div class="history-item-links">
          ${postLinkHtml}
          ${txLinkHtml}
        </div>
      </div>
    `;
  }).join('');

  // Update pagination
  if (totalPages > 1) {
    pagination.classList.remove('hidden');
    pageInfo.textContent = `${historyCurrentPage + 1} of ${totalPages}`;
    prevBtn.disabled = historyCurrentPage === 0;
    nextBtn.disabled = historyCurrentPage >= totalPages - 1;
  } else {
    pagination.classList.add('hidden');
  }
}

/**
 * Get transaction icon based on type
 */
function getTransactionIcon(type) {
  switch (type) {
    case 'tip_sent':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5m0 0l-7 7m7-7l7 7"/></svg>';
    case 'tip_received':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14m0 0l7-7m-7 7l-7-7"/></svg>';
    case 'deposit':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>';
    default:
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
  }
}

/**
 * Get transaction label based on type
 */
function getTransactionLabel(type) {
  switch (type) {
    case 'tip_sent': return 'Tip Sent';
    case 'tip_received': return 'Tip Received';
    case 'deposit': return 'Deposit';
    default: return 'Transaction';
  }
}

/**
 * Get transaction description
 */
function getTransactionDescription(tx) {
  if (tx.type === 'tip_sent' || tx.type === 'tip_received') {
    if (tx.destination) {
      // Show destination (twitter.com/username)
      return truncateDestination(tx.destination);
    }
    if (tx.counterparty_address) {
      return formatAddress(tx.counterparty_address);
    }
    return formatNetwork(tx.network);
  }
  return formatNetwork(tx.network);
}

/**
 * Get block explorer URL for a transaction
 */
function getExplorerUrl(network, txHash) {
  if (!txHash) return null;

  // Normalize: lowercase and replace underscores with hyphens
  const normalized = (network || '').toLowerCase().replace(/_/g, '-');

  if (normalized.includes('base')) {
    const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
    const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
    return `${baseUrl}/tx/${txHash}`;
  }

  if (normalized.includes('solana') || normalized.includes('sol')) {
    const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
    const cluster = isDevnet ? '?cluster=devnet' : '';
    return `https://solscan.io/tx/${txHash}${cluster}`;
  }

  return null;
}

/**
 * Get URL for the tipped content (tweet, etc)
 */
function getDestinationUrl(destination) {
  if (!destination) return null;

  // If it already has a protocol, return as-is
  if (destination.startsWith('http://') || destination.startsWith('https://')) {
    return destination;
  }

  // Construct full URL from destination (e.g., "x.com/user/status/123" -> "https://x.com/user/status/123")
  return `https://${destination}`;
}

/**
 * Parse destination to extract profile URL and check if it's a specific post
 * Returns { profileUrl, postUrl, profileHandle }
 */
function parseDestination(destination) {
  if (!destination) return { profileUrl: null, postUrl: null, profileHandle: null };

  // Check if it's a .base.eth name
  if (destination.endsWith('.base.eth')) {
    const name = destination.replace('.base.eth', '');
    return {
      profileUrl: `https://www.base.org/name/${name}`,
      postUrl: null,
      profileHandle: destination
    };
  }

  // Check if it's a .eth name (but not .base.eth)
  if (destination.endsWith('.eth')) {
    return {
      profileUrl: `https://app.ens.domains/${destination}`,
      postUrl: null,
      profileHandle: destination
    };
  }

  // Normalize: add https if needed
  const fullUrl = destination.startsWith('http') ? destination : `https://${destination}`;

  // Check if it's a Twitter/X status URL
  const statusMatch = destination.match(/^(x\.com|twitter\.com)\/([^\/]+)\/status\/(\d+)/i);
  if (statusMatch) {
    const domain = statusMatch[1];
    const username = statusMatch[2];
    return {
      profileUrl: `https://${domain}/${username}`,
      postUrl: fullUrl,
      profileHandle: `@${username}`
    };
  }

  // Check if it's just a Twitter/X profile
  const profileMatch = destination.match(/^(x\.com|twitter\.com)\/([^\/]+)\/?$/i);
  if (profileMatch) {
    const username = profileMatch[2];
    return {
      profileUrl: fullUrl,
      postUrl: null,
      profileHandle: `@${username}`
    };
  }

  // For other URLs, just return the destination as-is
  return {
    profileUrl: null,
    postUrl: fullUrl,
    profileHandle: null
  };
}

/**
 * Truncate destination string
 */
function truncateDestination(dest) {
  if (!dest) return '';
  if (dest.length <= 24) return dest;
  return dest.slice(0, 24) + '...';
}

/**
 * Format network name
 */
function formatNetwork(network) {
  if (!network) return '';
  if (network.includes('base')) return 'Base';
  if (network.includes('solana')) return 'Solana';
  return network.charAt(0).toUpperCase() + network.slice(1);
}

/**
 * Format history amount with sign
 */
function formatHistoryAmount(tx) {
  const amount = parseFloat(tx.amount_usd) || 0;
  const formatted = formatUSD(amount);
  if (tx.type === 'tip_sent') {
    return '-' + formatted;
  }
  return '+' + formatted;
}

/**
 * Format relative time (enhanced version)
 */
function formatRelativeTime(dateString) {
  if (!dateString) return '';
  const now = new Date();
  const then = new Date(dateString);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  const days = Math.floor(seconds / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  // Format as date for older items
  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format Address (shorten)
 */
function formatAddress(address) {
  if (!address) return 'Unknown';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format USD Amount (up to 6 decimals when needed)
 */
function formatUSD(amount) {
  if (amount >= 1000) {
    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }
  if (amount >= 1) {
    return '$' + amount.toFixed(2);
  }
  // For small amounts, show up to 6 decimals but trim trailing zeros
  const formatted = amount.toFixed(6).replace(/\.?0+$/, '');
  return '$' + (formatted === '' ? '0' : formatted);
}

/**
 * Format Time Ago
 */
function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Toast Notification
 */
function showToast(msg) {
  // Remove any existing toast
  const existing = document.querySelector('.grove-toast');
  if (existing) {
    existing.remove();
  }

  const testBanner = document.getElementById('testModeBanner');
  const bannerVisible = testBanner && testBanner.classList.contains('visible');
  let topPos;
  if (bannerVisible) {
    const bannerRect = testBanner.getBoundingClientRect();
    topPos = (bannerRect.bottom + 8) + 'px';
  } else {
    const header = document.querySelector('.header');
    const headerRect = header.getBoundingClientRect();
    topPos = (headerRect.bottom + 8) + 'px';
  }

  const div = document.createElement('div');
  div.className = 'grove-toast';
  div.style.position = 'fixed';
  div.style.top = topPos;
  div.style.right = '8px';
  div.style.transform = 'translateX(120%)';
  div.style.background = '#22c55e';
  div.style.color = '#000';
  div.style.padding = '8px 16px';
  div.style.borderRadius = '20px';
  div.style.fontSize = '12px';
  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  div.style.zIndex = '2000';
  div.style.transition = 'transform 0.3s ease-out';
  div.style.whiteSpace = 'nowrap';
  div.textContent = msg;

  document.body.appendChild(div);

  requestAnimationFrame(() => {
    div.style.transform = 'translateX(0)';
  });

  setTimeout(() => {
    div.style.transform = 'translateX(120%)';
    setTimeout(() => div.remove(), 300);
  }, 2000);
}

/**
 * Toggle Password Visibility
 */
function togglePasswordVisibility() {
  const isPassword = jwtInput.type === 'password';
  jwtInput.type = isPassword ? 'text' : 'password';

  // Toggle eye icon
  const eyeOpenPaths = toggleJwtVisibility.querySelectorAll('.eye-open');
  const eyeClosedPaths = toggleJwtVisibility.querySelectorAll('.eye-closed');

  eyeOpenPaths.forEach(path => {
    if (isPassword) {
      path.classList.add('hidden');
    } else {
      path.classList.remove('hidden');
    }
  });

  eyeClosedPaths.forEach(path => {
    if (isPassword) {
      path.classList.remove('hidden');
    } else {
      path.classList.add('hidden');
    }
  });
}

// Init
document.addEventListener('DOMContentLoaded', init);
