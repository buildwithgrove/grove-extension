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

// JWT Slot Management (multi-slot UI)
const productionSlotDot = document.getElementById('productionSlotDot');
const testnetSlotDot = document.getElementById('testnetSlotDot');
const localhostSlotDot = document.getElementById('localhostSlotDot');
const productionKeyStatus = document.getElementById('productionKeyStatus');
const testnetKeyStatus = document.getElementById('testnetKeyStatus');
const localhostKeyStatus = document.getElementById('localhostKeyStatus');
const productionActiveBadge = document.getElementById('productionActiveBadge');
const testnetActiveBadge = document.getElementById('testnetActiveBadge');
const localhostActiveBadge = document.getElementById('localhostActiveBadge');
const testnetKeySlot = document.getElementById('testnetKeySlot');
const localhostKeySlot = document.getElementById('localhostKeySlot');
const manageProductionKeyBtn = document.getElementById('manageProductionKeyBtn');
const manageTestnetKeyBtn = document.getElementById('manageTestnetKeyBtn');
const manageLocalhostKeyBtn = document.getElementById('manageLocalhostKeyBtn');
const clearAllKeysItem = document.getElementById('clearAllKeysItem');
const clearAllKeysBtn = document.getElementById('clearAllKeysBtn');
const jwtEditSlotLabel = document.getElementById('jwtEditSlotLabel');
const jwtEditAppLink = document.getElementById('jwtEditAppLink');
let currentEditSlot = null; // Track which slot is being edited ('production', 'testnet', or 'localhost')

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
  // Dual JWT slots
  JWT_PRODUCTION: 'GROVE_JWT_PRODUCTION',
  JWT_TESTNET: 'GROVE_JWT_TESTNET',
  JWT: 'GROVE_API_JWT', // Legacy - for migration only
  // Settings
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  CONFIRM_TIP: 'GROVE_CONFIRM_TIP',
  HAS_TIPPED: 'GROVE_HAS_TIPPED',
  AUTO_REPLY: 'GROVE_AUTO_REPLY',
  AUTO_REPLY_MESSAGE: 'GROVE_AUTO_REPLY_MESSAGE',
  LIKE_ON_TIP: 'GROVE_LIKE_ON_TIP',
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
  ENDPOINT: 'groveEndpoint',
  LAST_BALANCES: 'GROVE_LAST_BALANCES',
  CLIENT_ADDRESS: 'GROVE_CLIENT_ADDRESS',
  ENS_NAME: 'GROVE_ENS_NAME',
  EARN_CTA_DISMISSED: 'GROVE_EARN_CTA_DISMISSED',
};

/**
 * Check if developer mode is enabled
 * @returns {Promise<boolean>}
 */
async function isDevMode() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  return result[STORAGE_KEYS.ENVIRONMENT] === 'local';
}

/**
 * Get the active JWT based on current dev mode state
 * @returns {Promise<string|null>}
 */
async function getActiveJWT() {
  return KeyManager.getActiveJWT();
}

// Default auto-reply message template
const DEFAULT_AUTO_REPLY_MESSAGE = `Hey @{username}, I just sent you a {amount} tip on {chain}! #TipWithGrove

Tx: {tx_link}

Tip creators you love → {grove_link}`;

// X Login Elements (now on home screen)
const likeOnTipToggle = document.getElementById('homeLikeOnTipToggle');
const autoReplyToggle = document.getElementById('homeAutoReplyToggle');
const autoReplyMessageContainer = document.getElementById('homeAutoReplyMessageContainer');
const autoReplyMessageInput = document.getElementById('homeAutoReplyMessageInput');
const saveAutoReplyMessageBtn = document.getElementById('homeSaveAutoReplyMessageBtn');
const resetAutoReplyMessageBtn = document.getElementById('homeResetAutoReplyMessageBtn');

// Defaults
const DEFAULT_TIP_AMOUNT = 0.10;
const DEFAULT_CHAIN = 'base';
const DEFAULT_ENV = 'prod';
const DEFAULT_ENDPOINT = 'production';
const DEFAULT_BALANCE_DISPLAY = '0.00';
const TOP_UP_URLS = {
  mainnet: 'https://app.grove.city/profile',
  testnet: 'https://app.testnet.grove.city/profile'
};
const MAINNET_CHAINS = ['base', 'solana'];
const TESTNET_CHAINS = ['base-sepolia', 'solana-devnet'];
const ENDPOINT_LABELS = {
  'production': 'api.grove.city',
  'testnet': 'api.testnet.grove.city',
  'localhost': 'localhost:8000',
};

/**
 * Initialize Popup
 */
async function init() {
  // Migrate from legacy single-JWT storage (runs once)
  await KeyManager.migrateFromLegacy();

  // Initialize Previous Keys UI
  prevKeysUI = new PreviousKeysUI(prevKeysCount, prevKeysList, prevKeysContainer);

  // Set up callback for when a previous key is used
  prevKeysUI.setOnUseKey(async (keyData) => {
    const { key, environment: storedEnv } = keyData;

    // Use stored environment, or fall back to active slot if not stored (legacy keys)
    const environment = storedEnv || await KeyManager.getActiveSlotId();
    const slotConfig = KeyManager.getEnvConfig(environment);
    const chain = slotConfig?.isDevMode ? 'base-sepolia' : 'base';

    // Archive current key in that slot first (if any)
    const currentJwt = await KeyManager.getJWT(environment);
    if (currentJwt) {
      await KeyManager.archiveCurrentKey(currentJwt, environment);
    }

    // Store in the appropriate slot
    await KeyManager.setJWT(environment, key);

    // Update environment and chain settings
    const newEnv = slotConfig?.isDevMode ? 'local' : 'prod';
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: environment,
      [STORAGE_KEYS.CHAIN]: chain,
      [STORAGE_KEYS.ENVIRONMENT]: newEnv,
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances when switching keys
    });

    // Update chain UI
    updateChainUI(chain);
    updateTopUpLink(chain);
    updateNetworkSelectorVisibility(environment);
    updateTestnetKeyVisibility(slotConfig?.isDevMode);

    // Update dev mode toggle
    if (devModeToggle) {
      devModeToggle.checked = slotConfig?.isDevMode;
    }
    const testBanner = document.getElementById('testModeBanner');
    if (slotConfig?.isDevMode) {
      document.body.classList.add('developer-mode');
      if (testBanner) {
        testBanner.classList.remove('hidden');
        testBanner.classList.add('visible');
      }
      if (endpointSelector) endpointSelector.classList.remove('hidden');
    } else {
      document.body.classList.remove('developer-mode');
      if (testBanner) testBanner.classList.remove('visible');
      if (endpointSelector) endpointSelector.classList.add('hidden');
    }

    // Delete the key from previous keys (since it's now current)
    const keys = await KeyManager.getPreviousKeys();
    const keyIndex = keys.findIndex(k => k.key === key);
    if (keyIndex !== -1) {
      await KeyManager.deleteKey(keyIndex);
    }

    // Update UI
    await updateAuthState(key);
    await prevKeysUI.updateCount();
    await prevKeysUI.render();
    await fetchBalance();

    showToast(`Connected to ${slotConfig?.label || environment}`);

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

  // Ensure chain dropdown options match current endpoint on init
  const endpointInit = await GroveAPI.getBaseURL().then(() => {
    return chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
  }).then(res => res[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT).catch(() => DEFAULT_ENDPOINT);
  updateNetworkSelectorVisibility(endpointInit);

  // Fetch balance after everything is loaded (also updates client address)
  await fetchBalance();

  // Resolve ENS name in the background (don't await to avoid blocking UI)
  loadAndResolveEnsName();

  // Refresh data when popup regains focus
  document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Handle visibility change - refresh current tab data when popup becomes visible
 */
function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return;

  // Find active tab
  const activeTab = document.querySelector('.page.active');
  if (!activeTab) return;

  const tabId = activeTab.id;

  // Refresh based on active tab
  if (tabId === 'tab-home') {
    fetchBalance();
  } else if (tabId === 'tab-history') {
    loadHistory();
  } else if (tabId === 'tab-leaderboard') {
    refreshLeaderboard();
  }
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
    // Refresh visibility based on current endpoint before showing dropdown
    chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]).then(res => {
      const endpoint = res[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
      updateNetworkSelectorVisibility(endpoint);
    });
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

  // Developer Mode Banner - click to go to developer settings
  const testModeBanner = document.getElementById('testModeBanner');
  if (testModeBanner) {
    testModeBanner.addEventListener('click', () => {
      document.querySelector('[data-target="tab-settings"]').click();
      showSettingsView('developer');
    });
  }

  // Home screen Twitter settings drill-down
  const homeTwitterSettingsBtn = document.getElementById('homeTwitterSettingsBtn');
  const homeTwitterSettingsPanel = document.getElementById('homeTwitterSettingsPanel');
  const homeTwitterSettingsBack = document.getElementById('homeTwitterSettingsBack');

  if (homeTwitterSettingsBtn && homeTwitterSettingsPanel) {
    homeTwitterSettingsBtn.addEventListener('click', () => {
      homeTwitterSettingsBtn.classList.add('hidden');
      homeTwitterSettingsPanel.classList.remove('hidden');
    });
  }

  if (homeTwitterSettingsBack && homeTwitterSettingsPanel) {
    homeTwitterSettingsBack.addEventListener('click', () => {
      homeTwitterSettingsPanel.classList.add('hidden');
      homeTwitterSettingsBtn.classList.remove('hidden');
    });
  }

  // Home X login button - call the same handler
  const homeXLoginBtnEl = document.getElementById('homeXLoginBtn');
  if (homeXLoginBtnEl) {
    homeXLoginBtnEl.addEventListener('click', handleXLogin);
  }

  // Legacy manage button (kept for compatibility but hidden)
  if (manageJwtBtn) {
    manageJwtBtn.addEventListener('click', () => {
      if (jwtEditContainer.classList.contains('hidden')) {
        showJwtEdit();
      } else {
        hideJwtEdit();
      }
    });
  }

  // New slot-specific manage buttons
  if (manageProductionKeyBtn) {
    manageProductionKeyBtn.addEventListener('click', () => {
      if (jwtEditContainer.classList.contains('hidden') || currentEditSlot !== 'production') {
        showJwtEditForSlot('production');
      } else {
        hideJwtEdit();
      }
    });
  }

  if (manageTestnetKeyBtn) {
    manageTestnetKeyBtn.addEventListener('click', () => {
      if (jwtEditContainer.classList.contains('hidden') || currentEditSlot !== 'testnet') {
        showJwtEditForSlot('testnet');
      } else {
        hideJwtEdit();
      }
    });
  }

  if (manageLocalhostKeyBtn) {
    manageLocalhostKeyBtn.addEventListener('click', () => {
      if (jwtEditContainer.classList.contains('hidden') || currentEditSlot !== 'localhost') {
        showJwtEditForSlot('localhost');
      } else {
        hideJwtEdit();
      }
    });
  }

  if (clearAllKeysBtn) {
    clearAllKeysBtn.addEventListener('click', clearAllKeys);
  }

  if (saveJwtBtn) saveJwtBtn.addEventListener('click', saveJwtForSlot);
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

  // Earn CTA Card - Navigate to Earn tab or dismiss
  const earnCtaCard = document.getElementById('earnCtaCard');
  const earnCtaBtn = document.getElementById('earnCtaBtn');
  const earnCtaClose = document.getElementById('earnCtaClose');

  // Check if CTA was dismissed and hide if so
  chrome.storage.local.get([STORAGE_KEYS.EARN_CTA_DISMISSED], (result) => {
    if (result[STORAGE_KEYS.EARN_CTA_DISMISSED] && earnCtaCard) {
      earnCtaCard.classList.add('hidden');
    }
  });

  if (earnCtaBtn) {
    earnCtaBtn.addEventListener('click', () => {
      document.querySelector('[data-target="tab-earn"]').click();
    });
  }

  if (earnCtaClose && earnCtaCard) {
    earnCtaClose.addEventListener('click', (e) => {
      e.stopPropagation();
      earnCtaCard.classList.add('hidden');
      chrome.storage.local.set({ [STORAGE_KEYS.EARN_CTA_DISMISSED]: true });
    });
  }

  // Listen for storage changes (e.g., when webapp injects JWT via external messaging)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== 'local') return;

    // Handle JWT changes (either slot)
    if (changes[STORAGE_KEYS.JWT_PRODUCTION] || changes[STORAGE_KEYS.JWT_TESTNET]) {
      console.log('[Grove Extension] JWT changed in storage, refreshing...');
      const jwt = await getActiveJWT();
      await updateAuthState(jwt);
      await fetchBalance();
    }

    // Handle environment (dev mode) changes from background
    if (changes[STORAGE_KEYS.ENVIRONMENT]) {
      console.log('[Grove Extension] Environment changed in storage, updating UI...');
      const newEnv = changes[STORAGE_KEYS.ENVIRONMENT].newValue;
      const isDevMode = newEnv === 'local';

      // Update dev mode toggle
      if (devModeToggle) devModeToggle.checked = isDevMode;

      // Update dev mode UI
      const testBanner = document.getElementById('testModeBanner');
      if (isDevMode) {
        document.body.classList.add('developer-mode');
        if (testBanner) {
          testBanner.classList.remove('hidden');
          testBanner.classList.add('visible');
        }
        if (endpointSelector) endpointSelector.classList.remove('hidden');
      } else {
        document.body.classList.remove('developer-mode');
        if (testBanner) testBanner.classList.remove('visible');
        if (endpointSelector) endpointSelector.classList.add('hidden');
      }

      const endpointResult = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
      const endpointValue = endpointResult[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
      updateNetworkSelectorVisibility(endpointValue);
      await fetchBalance();
    }

    if (changes[STORAGE_KEYS.CHAIN]) {
      console.log('[Grove Extension] Chain changed in storage, updating UI...');
      const newChain = changes[STORAGE_KEYS.CHAIN].newValue;
      updateChainUI(newChain);
      updateTopUpLink(newChain);
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
      loadLeaderboardStats();
      loadTopTippers();
    } else if (currentLeaderboardView === 'earners') {
      loadLeaderboardStats();
      loadTopEarners();
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
  // Get JWT based on current dev mode
  const jwt = await getActiveJWT();
  await updateAuthState(jwt);
  // Also update the slot UI
  await loadJwtSlots();
}

/**
 * Load and display all JWT slot statuses
 */
async function loadJwtSlots() {
  const prodJwt = await KeyManager.getJWT('production');
  const testnetJwt = await KeyManager.getJWT('testnet');
  const localhostJwt = await KeyManager.getJWT('localhost');
  const activeSlot = await KeyManager.getActiveSlotId();

  // Helper to update slot UI
  function updateSlotUI(dot, status, badge, jwt, isActive) {
    if (dot) {
      dot.classList.toggle('connected', !!jwt);
      dot.classList.toggle('disconnected', !jwt);
    }
    if (status) {
      if (jwt) {
        const first = jwt.substring(0, 6);
        const last = jwt.substring(jwt.length - 4);
        status.innerHTML = `<span style="font-family: monospace">${first}...${last}</span>`;
      } else {
        status.textContent = 'Not connected';
      }
    }
    if (badge) {
      badge.classList.toggle('hidden', !isActive);
    }
  }

  // Update each slot
  updateSlotUI(productionSlotDot, productionKeyStatus, productionActiveBadge, prodJwt, activeSlot === 'production');
  updateSlotUI(testnetSlotDot, testnetKeyStatus, testnetActiveBadge, testnetJwt, activeSlot === 'testnet');
  updateSlotUI(localhostSlotDot, localhostKeyStatus, localhostActiveBadge, localhostJwt, activeSlot === 'localhost');

  const devMode = await isDevMode();
  updateTestnetKeyVisibility(devMode);
}

async function updateAuthState(jwt) {
    if (jwt && jwt.length > 0) {
    // Connected
    onboardingState.classList.add('hidden');
    connectedState.classList.remove('hidden');

    // Get environment from storage to show in status
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
    const endpoint = result[STORAGE_KEYS.ENDPOINT] || 'production';
    const envLabel = endpoint === 'testnet' ? 'Testnet' : 'Mainnet';

    // Settings Display - show truncated key + environment
    const first = jwt.substring(0, 6);
    const last = jwt.substring(jwt.length - 4);
    jwtStatusDisplay.innerHTML = `<span style="font-family: monospace">${first}...${last}</span> <span class="key-env-badge ${endpoint === 'testnet' ? 'testnet' : ''}">${envLabel}</span>`;
    jwtStatusDisplay.style.color = 'var(--color-primary)';

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
  if (manageJwtBtn) manageJwtBtn.textContent = 'Close';

  // Get remove button if not already cached
  if (!removeJwtBtn) {
    removeJwtBtn = document.getElementById('removeJwtBtn');
  }

  // Check if JWT exists to show/hide remove button and populate input
  const jwt = await getActiveJWT();
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

/**
 * Show the JWT edit form for a specific slot
 * @param {string} slot - 'production', 'testnet', or 'localhost'
 */
async function showJwtEditForSlot(slot) {
  currentEditSlot = slot;
  jwtEditContainer.classList.remove('hidden');

  // Get config for this slot
  const config = KeyManager.getEnvConfig(slot) || { label: 'Key', appUrl: 'https://app.grove.city' };

  // Update the label and link based on slot
  if (jwtEditSlotLabel) {
    jwtEditSlotLabel.textContent = `${config.label} Key`;
  }
  if (jwtEditAppLink) {
    jwtEditAppLink.href = config.appUrl;
    jwtEditAppLink.textContent = config.appUrl.replace(/^https?:\/\//, '');
  }

  // Get remove button if not already cached
  if (!removeJwtBtn) {
    removeJwtBtn = document.getElementById('removeJwtBtn');
  }

  // Get the JWT for the specific slot
  const jwt = await KeyManager.getJWT(slot);

  if (jwt && jwt.length > 0) {
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove('hidden');
    }
    jwtInput.value = jwt;
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
  if (manageJwtBtn) manageJwtBtn.textContent = 'Manage';
  jwtInput.value = ''; // Clear input for security
  currentEditSlot = null; // Reset slot state
}

async function saveJwt() {
  const token = jwtInput.value.trim();
  if (!token) {
    showToast('Please enter a token');
    return;
  }

  // Save to the currently active slot
  const environment = await KeyManager.getActiveSlotId();
  const slotConfig = KeyManager.getEnvConfig(environment);
  const chain = slotConfig.isDevMode ? 'base-sepolia' : 'base';

  // Get current JWT in that slot before saving new one
  const currentJwt = await KeyManager.getJWT(environment);

  // If there's a current JWT and it's different from the new one, archive it
  if (currentJwt && currentJwt !== token) {
    await KeyManager.archiveCurrentKey(currentJwt, environment);
  }

  // Store in the slot
  await KeyManager.setJWT(environment, token);

  // Update chain settings
  await chrome.storage.local.set({
    [STORAGE_KEYS.CHAIN]: chain,
    [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances when switching keys
  });

  // Update chain UI
  updateChainUI(chain);
  updateTopUpLink(chain);

  await updateAuthState(token);
  hideJwtEdit();

  showToast(`Connected to ${slotConfig.label}`);
  await prevKeysUI.updateCount();

  // Fetch balance with new token
  await fetchBalance();

  // Go back to home if we were onboarding
  if (!onboardingState.classList.contains('hidden')) {
    document.querySelector('[data-target="tab-home"]').click();
  }
}

/**
 * Save JWT to the currently selected slot (production, testnet, or localhost)
 * Uses currentEditSlot to determine which slot to save to
 */
async function saveJwtForSlot() {
  const token = jwtInput.value.trim();
  if (!token) {
    showToast('Please enter a token');
    return;
  }

  // If no slot is set, fall back to auto-detection
  if (!currentEditSlot) {
    return saveJwt();
  }

  const slotConfig = KeyManager.getEnvConfig(currentEditSlot);
  if (!slotConfig) {
    showToast('Invalid slot');
    return;
  }

  // Get current JWT in slot before saving new one
  const currentJwt = await KeyManager.getJWT(currentEditSlot);

  // Archive current JWT if different
  if (currentJwt && currentJwt !== token) {
    await KeyManager.archiveCurrentKey(currentJwt, currentEditSlot);
  }

  // Store in the slot
  await KeyManager.setJWT(currentEditSlot, token);

  // Update the slot UI
  await loadJwtSlots();
  hideJwtEdit();

  showToast(`${slotConfig.label} key saved`);
  await prevKeysUI.updateCount();

  // If this slot is the active one, refresh the balance
  const activeSlot = await KeyManager.getActiveSlotId();
  if (currentEditSlot === activeSlot) {
    await updateAuthState(token);
    await fetchBalance();
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

  // Determine which slot to clear - use currentEditSlot if set, otherwise use active slot
  const activeSlot = await KeyManager.getActiveSlotId();
  const slotToRemove = currentEditSlot || activeSlot;
  const slotConfig = KeyManager.getEnvConfig(slotToRemove);

  // Get the JWT from the slot being removed
  const jwtToRemove = await KeyManager.getJWT(slotToRemove);

  // Archive JWT before removing
  if (jwtToRemove) {
    await KeyManager.archiveCurrentKey(jwtToRemove, slotToRemove);
  }

  // Clear the JWT in the slot
  await KeyManager.clearJWT(slotToRemove);

  // Update the slot UI
  await loadJwtSlots();

  // Only update auth state if we removed the active slot
  if (slotToRemove === activeSlot) {
    await chrome.storage.local.remove([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
    await updateAuthState(null);
    updateEarnAddressDisplay(null);
    updateEnsNameDisplay(null);
  }

  hideJwtEdit();
  const envLabel = slotConfig ? slotConfig.label : slotToRemove;
  showToast(`${envLabel} key removed`);
  await prevKeysUI.updateCount();

  // Refresh previous keys list if visible
  if (!prevKeysContainer.classList.contains('hidden')) {
    await prevKeysUI.render();
  }
}

let clearAllKeysPending = false;

/**
 * Clear all JWT keys (production, testnet, localhost) and archived keys
 * Requires confirmation (two clicks)
 */
async function clearAllKeys() {
  // First click: show confirmation state
  if (!clearAllKeysPending) {
    clearAllKeysPending = true;
    clearAllKeysBtn.textContent = 'Confirm?';
    clearAllKeysBtn.classList.add('confirming');

    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      if (clearAllKeysPending) {
        clearAllKeysPending = false;
        clearAllKeysBtn.textContent = 'Clear';
        clearAllKeysBtn.classList.remove('confirming');
      }
    }, 3000);
    return;
  }

  // Second click: clear everything
  clearAllKeysPending = false;
  clearAllKeysBtn.textContent = 'Clear';
  clearAllKeysBtn.classList.remove('confirming');

  // Clear all JWT slots
  await KeyManager.clearJWT('production');
  await KeyManager.clearJWT('testnet');
  await KeyManager.clearJWT('localhost');

  // Clear archived keys
  await KeyManager.clearAll();

  // Clear auth state
  await chrome.storage.local.remove([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  await updateAuthState(null);
  updateEarnAddressDisplay(null);
  updateEnsNameDisplay(null);

  // Update UI
  await loadJwtSlots();
  hideJwtEdit();
  await prevKeysUI.updateCount();

  if (!prevKeysContainer.classList.contains('hidden')) {
    await prevKeysUI.render();
  }

  showToast('All keys cleared');
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
  // Hide the default tip card in the grid
  const defaultTipCard = document.getElementById('defaultTipCard');
  if (defaultTipCard) {
    defaultTipCard.classList.add('hidden');
  }
  tipAmountEdit.classList.remove('hidden');
}

function hideTipEdit() {
  // Show the default tip card in the grid
  const defaultTipCard = document.getElementById('defaultTipCard');
  if (defaultTipCard) {
    defaultTipCard.classList.remove('hidden');
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
  // Auto-reply defaults to true
  const enabled = result[STORAGE_KEYS.AUTO_REPLY] !== false;
  if (autoReplyToggle) {
    autoReplyToggle.checked = enabled;
  }
  // Show/hide message container based on toggle state
  if (autoReplyMessageContainer) {
    if (enabled) {
      autoReplyMessageContainer.classList.remove('hidden');
    } else {
      autoReplyMessageContainer.classList.add('hidden');
    }
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
  // Auto-reply defaults to true
  const autoReplyEnabled = result[STORAGE_KEYS.AUTO_REPLY] !== false;

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

// Home screen X elements
const homeXLoginStatus = document.getElementById('homeXLoginStatus');
const homeXLoginBtn = document.getElementById('homeXLoginBtn');
const homeXPostConnectOptions = document.getElementById('homeXPostConnectOptions');
const homeXSettingsTitle = document.getElementById('homeXSettingsTitle');

async function loadXLoginStatus() {
  try {
    const isLoggedIn = await XAuth.isLoggedIn();

    if (isLoggedIn) {
      const userInfo = await XAuth.getStoredUserInfo();
      const isRealUsername = userInfo?.username && userInfo.username !== 'Connected';
      const displayName = isRealUsername ? `@${userInfo.username}` : 'Connected';

      if (homeXLoginStatus) {
        homeXLoginStatus.textContent = displayName;
        homeXLoginStatus.style.color = 'var(--color-primary)';
      }
      if (homeXLoginBtn) {
        homeXLoginBtn.textContent = 'Disconnect';
        homeXLoginBtn.classList.add('btn-danger-text');
      }
      if (homeXSettingsTitle) {
        homeXSettingsTitle.textContent = 'Connected to 𝕏';
      }
      if (homeXPostConnectOptions) homeXPostConnectOptions.classList.remove('hidden');
    } else {
      if (homeXLoginStatus) {
        homeXLoginStatus.textContent = 'Not connected';
        homeXLoginStatus.style.color = 'var(--color-text-secondary)';
      }
      if (homeXLoginBtn) {
        homeXLoginBtn.textContent = 'Connect';
        homeXLoginBtn.classList.remove('btn-danger-text');
      }
      if (homeXSettingsTitle) {
        homeXSettingsTitle.innerHTML = 'Connect to 𝕏 <span class="optional-badge">optional</span>';
      }
      if (homeXPostConnectOptions) homeXPostConnectOptions.classList.add('hidden');
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
    showToast('Disconnected from X');
  } else {
    // Login
    try {
      if (homeXLoginBtn) {
        homeXLoginBtn.textContent = 'Connecting...';
        homeXLoginBtn.disabled = true;
      }

      const userInfo = await XAuth.login();

      const isRealUsername = userInfo.username && userInfo.username !== 'Connected';
      const displayName = isRealUsername ? `@${userInfo.username}` : 'Connected';

      if (homeXLoginStatus) {
        homeXLoginStatus.textContent = displayName;
        homeXLoginStatus.style.color = 'var(--color-primary)';
      }
      if (homeXLoginBtn) {
        homeXLoginBtn.textContent = 'Disconnect';
        homeXLoginBtn.classList.add('btn-danger-text');
        homeXLoginBtn.disabled = false;
      }
      if (homeXSettingsTitle) {
        homeXSettingsTitle.textContent = 'Connected to 𝕏';
      }
      if (homeXPostConnectOptions) {
        homeXPostConnectOptions.classList.remove('hidden');
      }

      showToast(isRealUsername ? `Connected as @${userInfo.username}` : 'Connected to 𝕏');
    } catch (error) {
      console.error('[Grove Extension] X login failed:', error);
      if (homeXLoginBtn) {
        homeXLoginBtn.textContent = 'Connect';
        homeXLoginBtn.disabled = false;
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

  // Get JWT based on current dev mode
  const jwt = await getActiveJWT();

  // Get chain and cached balances
  const storageResult = await chrome.storage.local.get([
    STORAGE_KEYS.CHAIN,
    STORAGE_KEYS.LAST_BALANCES
  ]);
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

    if (!response.success || !response.data?.balances) {
      console.error('[Grove Extension] Balance fetch failed:', response.error);

      // Check if this is an auth/account failure (401/403 for invalid JWT, 404 for account not found)
      const isAuthFailure = response.status === 401 || response.status === 403 || response.status === 404;
      if (isAuthFailure) {
        console.log('[Grove Extension] Auth failure detected, archiving and clearing invalid JWT');

        // Get the active slot to know where to clear
        const activeSlot = await KeyManager.getActiveSlotId();

        // Archive the invalid key to previous keys
        await KeyManager.archiveCurrentKey(jwt, activeSlot);

        // Clear the JWT from the active slot
        await KeyManager.clearJWT(activeSlot);

        // Clear cached data
        await chrome.storage.local.remove([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME, STORAGE_KEYS.LAST_BALANCES]);

        // Update UI to show disconnected state
        await updateAuthState(null);
        await loadJwtSlots();
        await prevKeysUI.updateCount();
        updateEarnAddressDisplay(null);
        updateEnsNameDisplay(null);
        balanceAmount.textContent = DEFAULT_BALANCE_DISPLAY;

        showToast('API key invalid or expired. Key archived.');
      }
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
  const earnAddressDisplay = document.getElementById('earnAddressDisplay');

  if (ensNameDisplay && ensNameValue) {
    if (ensName) {
      ensNameValue.textContent = ensName;
      ensNameDisplay.classList.remove('hidden');
      // Hide "Get an ENS name" links when user has one
      if (ensLinksSection) {
        ensLinksSection.classList.add('hidden');
      }
      // Address display is secondary when ENS exists
      if (earnAddressDisplay) {
        earnAddressDisplay.classList.remove('primary');
      }
    } else {
      ensNameDisplay.classList.add('hidden');
      ensNameValue.textContent = '';
      // Show "Get an ENS name" links when user doesn't have one
      if (ensLinksSection) {
        ensLinksSection.classList.remove('hidden');
      }
      // Address display is primary when no ENS
      if (earnAddressDisplay) {
        earnAddressDisplay.classList.add('primary');
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
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT, STORAGE_KEYS.ENDPOINT, STORAGE_KEYS.CHAIN]);
  let env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  let endpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
  const testBanner = document.getElementById('testModeBanner');
  const isDevMode = env === 'local';

  // Force production defaults when not in dev mode
  if (!isDevMode) {
    env = 'prod';
    endpoint = 'production';
    const storedChain = result[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
    const chainConfig = NETWORKS[storedChain] || NETWORKS[DEFAULT_CHAIN];
    const isTestnetChain = (chainConfig.type || '').toLowerCase() === 'testnet';

    await chrome.storage.local.set({
      [STORAGE_KEYS.ENVIRONMENT]: env,
      [STORAGE_KEYS.ENDPOINT]: endpoint,
      [STORAGE_KEYS.CHAIN]: isTestnetChain ? DEFAULT_CHAIN : storedChain,
    });
  }

  if (isDevMode) {
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

  // Update network selector visibility based on endpoint
  updateNetworkSelectorVisibility(endpoint);
  updateTestnetKeyVisibility(isDevMode);
  setTestModeBannerText(endpoint);
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
    updateTestnetKeyVisibility(true);

    // Switch to testnet endpoint and Base Sepolia
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: 'testnet',
      [STORAGE_KEYS.CHAIN]: 'base-sepolia',
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances
    });
    await loadEndpoint();
    setTestModeBannerText('testnet');
    updateChainUI('base-sepolia');
    updateTopUpLink('base-sepolia');
    updateNetworkSelectorVisibility('testnet');

    // Switch to testnet JWT context
    const testnetJwt = await KeyManager.getJWT('testnet');
    await updateAuthState(testnetJwt);
    updateEarnAddressDisplay(null); // Clear address until balance is fetched
    updateEnsNameDisplay(null);

    // Update slot UI to show testnet as active
    await loadJwtSlots();

    if (testnetJwt) {
      await fetchBalance();
      loadAndResolveEnsName();
      showToast('Switched to Testnet');
    } else {
      showToast('Developer Mode - Connect via testnet app');
    }
  } else {
    // Disable developer mode
    document.body.classList.remove('developer-mode');
    if (testBanner) {
      testBanner.classList.remove('visible');
      testBanner.classList.add('hidden');
    }
    if (endpointSelector) endpointSelector.classList.add('hidden');
    updateTestnetKeyVisibility(false);

    // Reset to production endpoint and Base mainnet
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: 'production',
      [STORAGE_KEYS.CHAIN]: 'base',
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances
    });
    await loadEndpoint();
    setTestModeBannerText('production');
    updateChainUI('base');
    updateTopUpLink('base');
    updateNetworkSelectorVisibility('production');

    // Switch to production JWT context
    const prodJwt = await KeyManager.getJWT('production');
    await updateAuthState(prodJwt);
    updateEarnAddressDisplay(null); // Clear address until balance is fetched
    updateEnsNameDisplay(null);

    // Update slot UI to show mainnet as active
    await loadJwtSlots();

    if (prodJwt) {
      await fetchBalance();
      loadAndResolveEnsName();
      showToast('Switched to Mainnet');
    } else {
      showToast('Developer Mode Disabled - Connect via grove.city');
    }
  }
}

/**
 * API Endpoint Selection
 */
async function loadEndpoint() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT, STORAGE_KEYS.ENVIRONMENT]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  const storedEndpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
  const isDev = env === 'local';
  const endpoint = isDev ? storedEndpoint : 'production';

  // Persist production endpoint when dev mode is off
  if (!isDev && storedEndpoint !== 'production') {
    await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: 'production' });
  }

  setTestModeBannerText(endpoint);
  updateNetworkSelectorVisibility(endpoint);

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

  const chainResult = await chrome.storage.local.get([STORAGE_KEYS.CHAIN]);
  const allowedChains = isTestEndpoint(endpoint) ? TESTNET_CHAINS : MAINNET_CHAINS;
  let chain = chainResult[STORAGE_KEYS.CHAIN] || getDefaultChainForEndpoint(endpoint);
  const chainChangedBecauseEndpoint = !allowedChains.includes(chain);
  if (chainChangedBecauseEndpoint) {
    chain = getDefaultChainForEndpoint(endpoint);
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
  }

  // Update display
  if (endpointDisplay) {
    endpointDisplay.textContent = endpoint;
  }

  updateNetworkSelectorVisibility(endpoint);
  setTestModeBannerText(endpoint);
  await loadJwtSlots();

  const jwt = await getActiveJWT();
  await updateAuthState(jwt);
  updateChainUI(chain);
  updateTopUpLink(chain);
  await fetchBalance();

  if (chainChangedBecauseEndpoint) {
    historyTransactions = [];
    historyCurrentPage = 0;
    loadHistory();
    seenTxHashes.clear();
    refreshLeaderboard();
  }

  // Show friendly endpoint name in toast
  const endpointNames = {
    'production': 'Production (api.grove.city)',
    'testnet': 'Testnet (api.testnet.grove.city)',
    'localhost': 'Localhost:8000',
  };
  showToast(`Switched to ${endpointNames[endpoint] || endpoint}`);
}

/**
 * Chain Selection
 */
async function loadChain() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.CHAIN, STORAGE_KEYS.ENDPOINT]);
    const endpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
    const storedChain = result[STORAGE_KEYS.CHAIN] || getDefaultChainForEndpoint(endpoint);
    const allowedChains = isTestEndpoint(endpoint) ? TESTNET_CHAINS : MAINNET_CHAINS;
    const chain = allowedChains.includes(storedChain) ? storedChain : getDefaultChainForEndpoint(endpoint);

    if (storedChain !== chain) {
      await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
    }

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

  // Update selected state in dropdown
  chainOptions.forEach(opt => {
    const check = opt.querySelector('.chain-selected-check');
    if (opt.dataset.chain === chain) {
      if (check) check.style.opacity = '1';
    } else {
      if (check) check.style.opacity = '0';
    }
  });
}

/**
 * Update network selector visibility based on endpoint
 * - Production: show mainnet options (Base, Solana)
 * - Testnet/local: show testnet options (Base Sepolia, Solana Devnet)
 */
function updateNetworkSelectorVisibility(endpoint) {
  const isTest = isTestEndpoint(endpoint);
  const mainnetOptions = document.querySelectorAll('.chain-option.mainnet-option');
  const testnetOptions = document.querySelectorAll('.chain-option.testnet-option');

  mainnetOptions.forEach(option => {
    option.classList.toggle('hidden', isTest);
    option.style.display = isTest ? 'none' : 'flex';
  });

  testnetOptions.forEach(option => {
    option.classList.toggle('hidden', !isTest);
    option.style.display = isTest ? 'flex' : 'none';
  });
}

function updateTestnetKeyVisibility(devModeEnabled) {
  // Toggle visibility of dev-mode-only elements
  [testnetKeySlot, localhostKeySlot, clearAllKeysItem].forEach(el => {
    el?.classList.toggle('hidden', !devModeEnabled);
  });

  // Hide JWT edit form if current slot is no longer visible
  if (!devModeEnabled && (currentEditSlot === 'testnet' || currentEditSlot === 'localhost')) {
    hideJwtEdit();
  }
}

function isTestEndpoint(endpoint) {
  return endpoint === 'testnet' || endpoint === 'localhost';
}

function getDefaultChainForEndpoint(endpoint) {
  return isTestEndpoint(endpoint) ? TESTNET_CHAINS[0] : MAINNET_CHAINS[0];
}

function getEndpointLabel(endpoint) {
  return ENDPOINT_LABELS[endpoint] || endpoint || 'api.grove.city';
}

function setTestModeBannerText(endpoint) {
  const banner = document.getElementById('testModeBanner');
  if (!banner) return;
  const textNode = document.getElementById('testModeBannerText') || banner;
  const label = getEndpointLabel(endpoint);
  textNode.textContent = `Developer Mode (${label})`;
}

async function handleChainSelection(e, silent = false) {
  // Ignore disabled chains (e.g., Solana - Coming Soon)
  if (e.currentTarget.classList.contains('chain-disabled')) return;

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
  setTestModeBannerText(newEndpoint);
  updateNetworkSelectorVisibility(newEndpoint);
  await loadJwtSlots();

  if (!silent) showToast(`Switched to ${NETWORKS[chain].name}`);

  // Reload balance
  fetchBalance();

  // Reload history (reset state and refetch)
  historyTransactions = [];
  historyCurrentPage = 0;
  loadHistory();

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

  // Hide period selector and stats initially (Live is default view)
  const periodSelector = document.querySelector('.period-selector');
  const statsSection = document.getElementById('leaderboard-stats');
  if (periodSelector) {
    periodSelector.classList.add('hidden');
  }
  if (statsSection) {
    statsSection.classList.add('hidden');
  }

  // Period selector
  periodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const period = e.target.dataset.period;
      currentPeriod = period;

      periodBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Reload stats and current leaderboard view
      loadLeaderboardStats();
      if (currentLeaderboardView === 'tippers') {
        loadTopTippers();
      } else if (currentLeaderboardView === 'earners') {
        loadTopEarners();
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

        // Show/hide period selector and stats (not relevant for Live view)
        const isLive = view === 'live';
        if (periodSelector) {
          periodSelector.classList.toggle('hidden', isLive);
        }
        if (statsSection) {
          statsSection.classList.toggle('hidden', isLive);
        }

        // Load data for the selected view
        if (view === 'tippers') {
          loadLeaderboardStats();
          loadTopTippers();
          stopLivePolling();
        } else if (view === 'earners') {
          loadLeaderboardStats();
          loadTopEarners();
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

  list.innerHTML = result.data.entries.map((entry, i) => {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    // Icon with rank number
    const rankIcon = `<span class="rank-number">${i + 1}</span>`;

    // Label: wallet address or username
    let labelHtml = formatAddress(entry.address);

    // Description: latest tip recipient (prefer post/tweet URL over profile URL)
    let descriptionHtml;
    if (ctx.recipient_username) {
      const postUrl = ctx.source_post_url || parsed.postUrl;
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      const linkUrl = postUrl || profileUrl;
      const linkText = postUrl ? `@${escapeHtml(ctx.recipient_username)}'s post` : `@${escapeHtml(ctx.recipient_username)}`;
      descriptionHtml = `Latest tip: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else if (parsed.profileHandle) {
      const linkUrl = parsed.postUrl || parsed.profileUrl;
      const linkText = parsed.postUrl ? `${parsed.profileHandle}'s post` : parsed.profileHandle;
      descriptionHtml = `Latest tip: <a href="${linkUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else {
      descriptionHtml = `${entry.tipCount.toLocaleString()} tips sent`;
    }

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Load Top Earners
 */
async function loadTopEarners() {
  const loading = document.getElementById('earners-loading');
  const empty = document.getElementById('earners-empty');
  const list = document.getElementById('earners-list');

  loading.classList.remove('hidden');
  empty.classList.add('hidden');
  list.innerHTML = '';

  const result = await GroveAPI.getTopEarners(currentPeriod, 10);

  loading.classList.add('hidden');

  if (!result.success || result.data.entries.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  list.innerHTML = result.data.entries.map((entry, i) => {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    // Icon with rank number
    const rankIcon = `<span class="rank-number">${i + 1}</span>`;

    // Label: show the earner's identity (recipient username or address)
    let labelHtml;
    if (ctx.recipient_username) {
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      labelHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${escapeHtml(ctx.recipient_username)}</a>`;
    } else if (parsed.profileHandle && parsed.profileUrl) {
      labelHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
    } else {
      labelHtml = formatAddress(entry.address);
    }

    // Description: tip count
    const descriptionHtml = `${entry.tipCount.toLocaleString()} tips received`;

    // Platform link icon (X icon for Twitter/X tips)
    const isTwitter = (ctx.source_post_url && (ctx.source_post_url.includes('x.com') || ctx.source_post_url.includes('twitter.com'))) ||
      (parsed.profileUrl && (parsed.profileUrl.includes('x.com') || parsed.profileUrl.includes('twitter.com'))) ||
      (entry.lastTipSocialGraph && (entry.lastTipSocialGraph.includes('x.com') || entry.lastTipSocialGraph.includes('twitter.com')));

    let platformUrl = ctx.source_post_url || parsed.postUrl || parsed.profileUrl ||
      (entry.lastTipSocialGraph && (entry.lastTipSocialGraph.startsWith('http') ? entry.lastTipSocialGraph : `https://${entry.lastTipSocialGraph}`));

    const platformLinkHtml = isTwitter && platformUrl
      ? `<a href="${platformUrl}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="View on X">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>`
      : `<span class="history-platform-link history-platform-link-empty"></span>`;

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
        </div>
      </div>
    `;
  }).join('');
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
    const parsed = parseDestination(entry.destination);
    const ctx = entry.context || {};

    // Dollar icon for tips
    const icon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';

    // Label: recipient name (the main info)
    let labelHtml;
    if (ctx.recipient_username) {
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      labelHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${escapeHtml(ctx.recipient_username)}</a>`;
    } else if (parsed.profileHandle) {
      labelHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${escapeHtml(parsed.profileHandle)}</a>`;
    } else {
      const addressUrl = getAddressExplorerUrl(entry.network, entry.address);
      labelHtml = `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${formatAddress(entry.address)}</a>`;
    }

    // Description: "Tip Received"
    const descriptionHtml = 'Tip Received';

    // Platform link (X icon) - show if it's a Twitter/X tip
    const isTwitter = (ctx.source_post_url && (ctx.source_post_url.includes('x.com') || ctx.source_post_url.includes('twitter.com'))) ||
      (parsed.profileUrl && (parsed.profileUrl.includes('x.com') || parsed.profileUrl.includes('twitter.com')));

    let platformUrl = ctx.source_post_url || parsed.postUrl || parsed.profileUrl;
    const platformLinkHtml = isTwitter && platformUrl
      ? `<a href="${platformUrl}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="View on X">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>`
      : `<span class="history-platform-link history-platform-link-empty"></span>`;

    // TX link (chain icon)
    const explorerUrl = getExplorerUrl(entry.network, entry.txHash);
    const txLinkHtml = explorerUrl
      ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </a>`
      : `<span class="history-tx-link history-tx-link-empty"></span>`;

    return `
      <div class="transaction-item${isNew ? ' new' : ''}">
        <div class="transaction-item-icon tip_received">${icon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${formatUSD(entry.amountUSD)}</div>
          <div class="transaction-item-time">${formatTimeAgo(entry.confirmedAt)}</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
          ${txLinkHtml}
        </div>
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
  } else if (currentLeaderboardView === 'earners') {
    loadTopEarners();
  }
}

/**
 * Format USD value for stats display (compact)
 */
function formatStatUSD(value) {
  if (value >= 999500) {
    // 999,500+ rounds to 1M or shows as X.XM
    return '$' + (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (value >= 10000) {
    return '$' + Math.round(value / 1000) + 'K';
  } else if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else if (value >= 100) {
    return '$' + Math.round(value);
  } else {
    return '$' + value.toFixed(2);
  }
}

/**
 * Format count value for stats display (compact)
 */
function formatStatCount(value) {
  if (value >= 999500) {
    // 999,500+ rounds to 1M or shows as X.XM
    return (value / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  } else if (value >= 10000) {
    return Math.round(value / 1000) + 'K';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  } else {
    return value.toString();
  }
}

/**
 * Load leaderboard stats
 */
async function loadLeaderboardStats() {
  const depositsEl = document.getElementById('stat-deposits');
  const tipsEl = document.getElementById('stat-tips');
  const tippersEl = document.getElementById('stat-tippers');
  const recipientsEl = document.getElementById('stat-recipients');

  // Show loading state
  [depositsEl, tipsEl, tippersEl, recipientsEl].forEach(el => {
    if (el) {
      el.classList.add('loading');
      el.textContent = '...';
    }
  });

  try {
    const result = await GroveAPI.getLeaderboardStats(currentPeriod);

    if (result.success) {
      if (depositsEl) {
        depositsEl.textContent = formatStatUSD(result.data.deposits);
        depositsEl.classList.remove('loading');
      }
      if (tipsEl) {
        tipsEl.textContent = formatStatUSD(result.data.tips);
        tipsEl.classList.remove('loading');
      }
      if (tippersEl) {
        tippersEl.textContent = formatStatCount(result.data.tippers);
        tippersEl.classList.remove('loading');
      }
      if (recipientsEl) {
        recipientsEl.textContent = formatStatCount(result.data.recipients);
        recipientsEl.classList.remove('loading');
      }
    }
  } catch (error) {
    console.error('[Grove Extension] Failed to load leaderboard stats:', error);
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
  const jwt = await getActiveJWT();

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
      destination: tip.destination,
      social_graph: tip.tip_social_graph,
      context: tip.context
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
    const isFailed = tx.status === 'failed';
    const icon = isFailed ? getTransactionIcon('failed') : getTransactionIcon(tx.type);
    const label = isFailed ? 'Tip Failed' : getTransactionLabel(tx.type);
    const amount = formatHistoryAmount(tx);
    const time = formatRelativeTime(tx.created_at);
    const amountClass = isFailed ? 'failed' : (tx.type === 'tip_sent' ? 'sent' : 'received');

    const explorerUrl = getExplorerUrl(tx.network, tx.tx_hash);
    const parsed = parseDestination(tx.destination);
    const ctx = tx.context || {};

    // Build description with links - prefer context data when available
    let descriptionHtml;

    if (tx.type === 'tip_sent') {
      // For sent tips: show recipient
      if (ctx.recipient_username) {
        const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
        descriptionHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${escapeHtml(ctx.recipient_username)}</a>`;
      } else if (parsed.profileHandle && parsed.profileUrl) {
        descriptionHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
      } else if (parsed.postUrl) {
        descriptionHtml = `<a href="${parsed.postUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${truncateDestination(tx.destination)}</a>`;
      } else if (tx.counterparty_address) {
        const addressUrl = getAddressExplorerUrl(tx.network, tx.counterparty_address);
        descriptionHtml = `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${formatAddress(tx.counterparty_address)}</a>`;
      } else {
        descriptionHtml = formatNetwork(tx.network);
      }
    } else if (tx.type === 'tip_received') {
      // For received tips: show sender if available
      if (ctx.sender_username) {
        const profileUrl = ctx.sender_profile_url || `https://x.com/${ctx.sender_username}`;
        descriptionHtml = `<a href="${profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">@${escapeHtml(ctx.sender_username)}</a>`;
      } else if (tx.counterparty_address) {
        const addressUrl = getAddressExplorerUrl(tx.network, tx.counterparty_address);
        descriptionHtml = `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${formatAddress(tx.counterparty_address)}</a>`;
      } else if (parsed.profileHandle && parsed.profileUrl) {
        descriptionHtml = `<a href="${parsed.profileUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${parsed.profileHandle}</a>`;
      } else {
        descriptionHtml = formatNetwork(tx.network);
      }
    } else {
      // Deposits and other types
      if (tx.counterparty_address) {
        const addressUrl = getAddressExplorerUrl(tx.network, tx.counterparty_address);
        descriptionHtml = `<a href="${addressUrl}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${formatAddress(tx.counterparty_address)}</a>`;
      } else {
        descriptionHtml = formatNetwork(tx.network);
      }
    }


    // Platform link icon (X icon for Twitter/X tips)
    // Check context, destination, and social_graph for Twitter/X
    // Note: sender_platform can be 'x' or 'twitter' - both are valid and map to X/Twitter
    const isTwitterFromContext = ctx.sender_platform === 'twitter' || ctx.sender_platform === 'x' ||
      (ctx.source_post_url && (ctx.source_post_url.includes('x.com') || ctx.source_post_url.includes('twitter.com')));
    const isTwitterFromDestination = parsed.profileUrl && (parsed.profileUrl.includes('x.com') || parsed.profileUrl.includes('twitter.com'));
    const isTwitterFromSocialGraph = tx.social_graph && (tx.social_graph.includes('x.com') || tx.social_graph.includes('twitter.com'));
    const isTwitter = isTwitterFromContext || isTwitterFromDestination || isTwitterFromSocialGraph;

    // Use source_post_url from context first, then destination URL, then social_graph
    let platformUrl = null;
    let platformTitle = 'View on X';
    if (ctx.source_post_url) {
      platformUrl = ctx.source_post_url;
      platformTitle = ctx.source_post_url.includes('/status/') ? 'View post' : 'View profile';
    } else if (isTwitterFromDestination) {
      platformUrl = parsed.postUrl || parsed.profileUrl;
      platformTitle = parsed.postUrl ? 'View post' : 'View profile';
    } else if (isTwitterFromSocialGraph) {
      platformUrl = tx.social_graph.startsWith('http') ? tx.social_graph : `https://${tx.social_graph}`;
      platformTitle = 'View source';
    }

    // Always render platform icon slot for alignment, but only make it clickable if there's a URL
    const platformLinkHtml = isTwitter && platformUrl
      ? `<a href="${platformUrl}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="${platformTitle}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>`
      : `<span class="history-platform-link history-platform-link-empty"></span>`;

    // TX link icon (chain icon)
    const txLinkHtml = explorerUrl
      ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </a>`
      : `<span class="history-tx-link history-tx-link-empty"></span>`;

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon ${isFailed ? 'failed' : tx.type}">${icon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${descriptionHtml}</div>
          <div class="transaction-item-description">${label}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount ${amountClass}">${amount}</div>
          <div class="transaction-item-time">${time}</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
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
    case 'failed':
      return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
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

  // Default to Base mainnet if network unknown but tx_hash exists
  return `https://basescan.org/tx/${txHash}`;
}

/**
 * Get block explorer URL for an address
 */
function getAddressExplorerUrl(network, address) {
  if (!address) return null;

  const normalized = (network || '').toLowerCase().replace(/_/g, '-');

  if (normalized.includes('base')) {
    const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
    const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
    return `${baseUrl}/address/${address}`;
  }

  if (normalized.includes('solana') || normalized.includes('sol')) {
    const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
    const cluster = isDevnet ? '?cluster=devnet' : '';
    return `https://solscan.io/account/${address}${cluster}`;
  }

  // Default to Base mainnet
  return `https://basescan.org/address/${address}`;
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
      profileUrl: `https://www.base.org/name/${encodeURIComponent(name)}`,
      postUrl: null,
      profileHandle: destination
    };
  }

  // Check if it's a .eth name (but not .base.eth)
  if (destination.endsWith('.eth')) {
    return {
      profileUrl: `https://app.ens.domains/${encodeURIComponent(destination)}`,
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
 * Format USD Amount (always at least 2 decimals, up to 6 when needed)
 */
function formatUSD(amount) {
  if (amount >= 1000) {
    return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (amount >= 0.01) {
    return '$' + amount.toFixed(2);
  }
  // For very small amounts, show up to 6 decimals but keep at least 2
  const formatted = amount.toFixed(6).replace(/0+$/, '');
  // Ensure at least 2 decimal places
  const decimalPart = formatted.split('.')[1] || '';
  if (decimalPart.length < 2) {
    return '$' + amount.toFixed(2);
  }
  return '$' + formatted;
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
 * Escape HTML to prevent XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
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
