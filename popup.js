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
const defaultTipCard = document.getElementById('defaultTipCard');
const editDefaultTipBtn = document.getElementById('editDefaultTipBtn');
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

// Earn Tab - Address Display (unified - shows ENS/basename or 0x address)
const earnAddressText = document.getElementById('earnAddressText');
const copyEarnAddressBtn = document.getElementById('copyEarnAddressBtn');

// Tip Intro Modal
const tipButtonIntroModal = document.getElementById('tipButtonIntroModal');
const tipIntroGotItBtn = document.getElementById('tipIntroGotItBtn');
const tipIntroNextBtn = document.getElementById('tipIntroNextBtn');
const tipIntroConnectBtn = document.getElementById('tipIntroConnectBtn');
const tipIntroSkipBtn = document.getElementById('tipIntroSkipBtn');
const tipIntroPage1 = document.getElementById('tipIntroPage1');
const tipIntroPage2 = document.getElementById('tipIntroPage2');
const tipIntroDots = document.querySelectorAll('.tip-intro-dot');

// Initialize Previous Keys UI
let prevKeysUI = null;

// STORAGE_KEYS is loaded from src/config/storageKeys.js

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

// DEFAULT_AUTO_REPLY_MESSAGE is loaded from src/ui/constants.js

// X Login Elements (now on home screen)
const likeOnTipToggle = document.getElementById('homeLikeOnTipToggle');
const autoReplyToggle = document.getElementById('homeAutoReplyToggle');
const autoReplyMessageContainer = document.getElementById('homeAutoReplyMessageContainer');
const autoReplyMessageInput = document.getElementById('homeAutoReplyMessageInput');
const saveAutoReplyMessageBtn = document.getElementById('homeSaveAutoReplyMessageBtn');
const resetAutoReplyMessageBtn = document.getElementById('homeResetAutoReplyMessageBtn');

// Defaults
const DEFAULT_TIP_AMOUNT = 0.02;
const DEFAULT_CHAIN = 'base';
const DEFAULT_ENV = 'prod';
const DEFAULT_ENDPOINT = 'production';
// FormatUtils.DEFAULT_BALANCE_DISPLAY is now in FormatUtils
const TOP_UP_URLS = {
  mainnet: 'https://app.grove.city/profile?tab=tip',
  testnet: 'https://app.testnet.grove.city/profile?tab=tip'
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
  checkForUpdates();
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

  // Show earn tab badge only if user hasn't visited earn tab yet
  const earnTabSeen = await chrome.storage.local.get([STORAGE_KEYS.EARN_TAB_SEEN]);
  if (!earnTabSeen[STORAGE_KEYS.EARN_TAB_SEEN]) {
    const earnBadge = document.querySelector('.nav-badge-dot');
    if (earnBadge) {
      earnBadge.classList.remove('hidden');
    }
  }

  // Increment launch count
  await incrementLaunchCount();

  // Check if we should show the Twitter connect modal (after 5 launches and 1 tip)
  await checkAndShowTwitterModal();

  // Check if we should open to X settings (from first tip modal)
  chrome.runtime.sendMessage({ type: 'CHECK_OPEN_TO_X_SETTINGS' }, (response) => {
    if (chrome.runtime.lastError) return; // Service worker inactive
    if (response?.shouldOpen) {
      // Navigate to home tab first
      const homeTab = document.querySelector('[data-target="tab-home"]');
      if (homeTab) homeTab.click();

      // Open X settings panel
      const homeTwitterSettingsBtn = document.getElementById('homeTwitterSettingsBtn');
      const homeTwitterSettingsPanel = document.getElementById('homeTwitterSettingsPanel');
      if (homeTwitterSettingsBtn && homeTwitterSettingsPanel) {
        homeTwitterSettingsBtn.classList.add('hidden');
        homeTwitterSettingsPanel.classList.remove('hidden');
      }
    }
  });

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
 * Check for extension updates and show banner if available
 */
async function checkForUpdates() {
  if (typeof UpdateChecker === 'undefined') {
    console.warn('[Grove] UpdateChecker not loaded');
    return;
  }

  try {
    const result = await UpdateChecker.checkForUpdate();

    if (result.available) {
      showUpdateBanner(result.tag, result.displayVersion, result.downloadUrl);
    }
  } catch (error) {
    console.error('[Grove] Error checking for updates:', error);
  }
}

/**
 * Show the update available banner
 * @param {string} tag - Full release tag (e.g., "grove-extension-v1.0.5-abc123")
 * @param {string} displayVersion - Display version (e.g., "v1.0.5-abc123")
 * @param {string} downloadUrl - URL to download the update
 */
function showUpdateBanner(tag, displayVersion, downloadUrl) {
  const banner = document.getElementById('updateBanner');
  const versionText = document.getElementById('updateVersionText');
  const downloadBtn = document.getElementById('updateDownloadBtn');
  const dismissBtn = document.getElementById('updateDismissBtn');

  if (!banner || !versionText || !downloadBtn) return;

  versionText.textContent = displayVersion;
  downloadBtn.href = downloadUrl;

  // Mark as installed when user clicks download
  downloadBtn.onclick = () => {
    UpdateChecker.setInstalledTag(tag);
  };

  // Show the banner
  banner.classList.remove('hidden');
  // Use setTimeout to trigger CSS transition
  setTimeout(() => {
    banner.classList.add('visible');
  }, 10);

  // Set up dismiss handler
  if (dismissBtn) {
    dismissBtn.onclick = async () => {
      await UpdateChecker.dismissUpdate(tag);
      hideUpdateBanner();
      // Clear the badge in background
      chrome.runtime.sendMessage({ type: 'CLEAR_UPDATE_BADGE' }, () => {
        void chrome.runtime.lastError; // Suppress warning if service worker inactive
      });
    };
  }
}

/**
 * Hide the update banner
 */
function hideUpdateBanner() {
  const banner = document.getElementById('updateBanner');
  if (!banner) return;

  banner.classList.remove('visible');
  setTimeout(() => {
    banner.classList.add('hidden');
  }, 300); // Match CSS transition duration
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

  // Tip Amount (Home) - Edit button triggers edit mode
  editDefaultTipBtn.addEventListener('click', showTipEdit);
  cancelTipAmount.addEventListener('click', hideTipEdit);
  saveTipAmount.addEventListener('click', saveTip);
  confirmTipToggle.addEventListener('change', handleConfirmTipToggle);

  // Tip Intro Modal - Page Navigation
  if (tipIntroNextBtn) {
    tipIntroNextBtn.addEventListener('click', () => {
      // In intro mode, "Got it" button closes the modal
      // In twitter mode, this button isn't visible (we're on page 2)
      if (introModalMode === 'intro') {
        hideTipIntroModal();
      } else {
        goToTipIntroPage(2);
      }
    });
  }
  if (tipIntroConnectBtn) {
    tipIntroConnectBtn.addEventListener('click', async () => {
      // Set flag to open settings when user returns after auth
      await chrome.storage.local.set({ openToXSettings: true });
      await hideTipIntroModal();
      handleXLogin();
    });
  }
  if (tipIntroSkipBtn) {
    tipIntroSkipBtn.addEventListener('click', hideTipIntroModal);
  }
  // Page indicator dots
  tipIntroDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const page = parseInt(dot.dataset.page);
      goToTipIntroPage(page);
    });
  });
  // Also close modal when clicking overlay
  if (tipButtonIntroModal) {
    tipButtonIntroModal.addEventListener('click', (e) => {
      if (e.target === tipButtonIntroModal) {
        hideTipIntroModal();
      }
    });
  }

  // Onboarding Multi-step Navigation
  setupOnboardingNavigation();

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

  // JWT setup button (if present)
  if (setupTokenBtn) {
    setupTokenBtn.addEventListener('click', () => {
      // Navigate to settings -> Account and open edit
      document.querySelector('[data-target="tab-settings"]').click();
      showSettingsView('account');
      showJwtEdit();
    });
  }

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
    homeTwitterSettingsBtn.addEventListener('click', async () => {
      const isLoggedIn = await XAuth.isLoggedIn();
      if (isLoggedIn) {
        // Show settings panel when connected
        homeTwitterSettingsBtn.classList.add('hidden');
        homeTwitterSettingsPanel.classList.remove('hidden');
      } else {
        // Trigger login directly when not connected
        handleXLogin();
      }
    });
  }

  if (homeTwitterSettingsBack && homeTwitterSettingsPanel) {
    homeTwitterSettingsBack.addEventListener('click', () => {
      homeTwitterSettingsPanel.classList.add('hidden');
      homeTwitterSettingsBtn.classList.remove('hidden');
    });
  }

  // Home X disconnect button
  const homeXDisconnectBtnEl = document.getElementById('homeXDisconnectBtn');
  if (homeXDisconnectBtnEl) {
    homeXDisconnectBtnEl.addEventListener('click', handleXDisconnect);
  }

  // Home X connect button (on card header)
  const homeXConnectBtnEl = document.getElementById('homeXConnectBtn');
  if (homeXConnectBtnEl) {
    homeXConnectBtnEl.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card click
      handleXLogin();
    });
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

  // Earn Tab - Copy Address Button (copies ENS name if available, otherwise 0x address)
  if (copyEarnAddressBtn) {
    copyEarnAddressBtn.addEventListener('click', copyEarnAddress);
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

  // Hide earn badge when navigating to earn tab
  if (targetId === 'tab-earn') {
    const earnBadge = document.querySelector('.nav-badge-dot');
    if (earnBadge) {
      earnBadge.classList.add('hidden');
    }
    chrome.storage.local.set({ [STORAGE_KEYS.EARN_TAB_SEEN]: true });
  }

  // Load leaderboard data when navigating to leaderboard
  if (targetId === 'tab-leaderboard') {
    loadPoolStats();
    if (currentLeaderboardView === 'tippers') {
      loadTopTippers();
    } else if (currentLeaderboardView === 'earners') {
      loadTopEarners();
    } else if (currentLeaderboardView === 'live') {
      loadLiveTips();
      startLivePolling();
    }
  } else {
    // Stop live polling when leaving leaderboard tab
    stopLivePolling();
  }

  // Reset settings view to main menu when navigating to settings tab
  if (targetId === 'tab-settings') {
    showSettingsView('main');
  }
}

/**
 * Onboarding Multi-step Navigation
 */
function setupOnboardingNavigation() {
  const onboardingContainer = document.querySelector('.onboarding-container');
  if (!onboardingContainer) return;

  const steps = onboardingContainer.querySelectorAll('.onboarding-step');
  const progressDots = onboardingContainer.querySelectorAll('.progress-dot');
  const nextBtns = onboardingContainer.querySelectorAll('.onboarding-btn-next');
  const backBtns = onboardingContainer.querySelectorAll('.onboarding-btn-back, .onboarding-btn-back-text');

  function goToStep(stepNum) {
    // Update steps
    steps.forEach(step => {
      const currentStep = parseInt(step.dataset.step);
      if (currentStep === stepNum) {
        step.classList.add('active');
        step.style.animation = 'fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
      } else {
        step.classList.remove('active');
      }
    });

    // Update progress dots
    progressDots.forEach(dot => {
      const dotStep = parseInt(dot.dataset.step);
      dot.classList.remove('active', 'completed');
      if (dotStep === stepNum) {
        dot.classList.add('active');
      } else if (dotStep < stepNum) {
        dot.classList.add('completed');
      }
    });
  }

  // Next buttons
  nextBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.next);
      goToStep(nextStep);
    });
  });

  // Back buttons
  backBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const prevStep = parseInt(btn.dataset.back);
      goToStep(prevStep);
    });
  });

  // Progress dot clicks
  progressDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const targetStep = parseInt(dot.dataset.step);
      goToStep(targetStep);
    });
  });
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

    // Show tip button intro modal if first time
    checkAndShowTipIntroModal();

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
  // Hide the default tip card
  if (defaultTipCard) {
    defaultTipCard.classList.add('hidden');
  }
  tipAmountEdit.classList.remove('hidden');
  // Focus the input for quick editing
  tipAmountInput.focus();
  tipAmountInput.select();
}

function hideTipEdit() {
  // Show the default tip card
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
  const result = await chrome.storage.local.get([STORAGE_KEYS.CONFIRM_TIP, STORAGE_KEYS.CONFIRM_TIP_V2]);

  // Migration logic: if V2 flag not set, reset confirm to true (new default)
  if (!result[STORAGE_KEYS.CONFIRM_TIP_V2]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CONFIRM_TIP]: true,
      [STORAGE_KEYS.CONFIRM_TIP_V2]: true
    });
    confirmTipToggle.checked = true;
    return;
  }

  // V2 already set, use stored value (default to true if not set)
  const enabled = result[STORAGE_KEYS.CONFIRM_TIP] !== false;
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
  // Auto-reply defaults to true (only false if explicitly set to false)
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
  // Auto-reply defaults to true (only false if explicitly set to false)
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
const homeXDisconnectBtn = document.getElementById('homeXDisconnectBtn');
const homeXSettingsTitle = document.getElementById('homeXSettingsTitle');
const homeXConnectBtn = document.getElementById('homeXConnectBtn');
const homeXSettingsGear = document.getElementById('homeXSettingsGear');

// X OAuth functions are imported from src/auth/xOAuthPopup.js
// loadXLoginStatus, handleXDisconnect, handleXLogin are available globally

/**
 * Balance
 */
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
    balanceAmount.textContent = FormatUtils.DEFAULT_BALANCE_DISPLAY;
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
        balanceAmount.textContent = FormatUtils.DEFAULT_BALANCE_DISPLAY;

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
      const formattedBalance = FormatUtils.formatBalance(chainBalance.balance);
      balanceAmount.textContent = formattedBalance;
      cachedBalances[chain] = formattedBalance;
      await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
    } else {
      balanceAmount.textContent = FormatUtils.DEFAULT_BALANCE_DISPLAY;
      cachedBalances[chain] = FormatUtils.DEFAULT_BALANCE_DISPLAY;
      await chrome.storage.local.set({ [STORAGE_KEYS.LAST_BALANCES]: cachedBalances });
    }
  } catch (e) {
    console.error('[Grove Extension] Balance fetch failed:', e);
  } finally {
    balanceDisplay.classList.remove('loading');
  }
}

/**
 * Earn Tab - Unified Address Display
 * Shows ENS name or base name if available, otherwise shows 0x address
 */
function updateEarnAddressDisplay(displayValue, hasEnsName = false) {
  const ensLinksSection = document.getElementById('ensLinksSection');

  if (earnAddressText && displayValue) {
    earnAddressText.textContent = displayValue;
    earnAddressText.classList.remove('placeholder');
    if (copyEarnAddressBtn) {
      copyEarnAddressBtn.disabled = false;
    }
    // Hide "Get an ENS name" links when user has one
    if (ensLinksSection) {
      if (hasEnsName) {
        ensLinksSection.classList.add('hidden');
      } else {
        ensLinksSection.classList.remove('hidden');
      }
    }
  } else if (earnAddressText) {
    earnAddressText.textContent = 'Connect to see address';
    earnAddressText.classList.add('placeholder');
    if (copyEarnAddressBtn) {
      copyEarnAddressBtn.disabled = true;
    }
    // Show "Get an ENS name" links when not connected
    if (ensLinksSection) {
      ensLinksSection.classList.remove('hidden');
    }
  }
}

async function loadClientAddress() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
  const ensName = result[STORAGE_KEYS.ENS_NAME];

  // Show ENS/base name if available, otherwise show truncated 0x address
  if (ensName) {
    updateEarnAddressDisplay(ensName, true);
  } else if (address) {
    // Truncate address for display: 0x1234...abcd
    const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`;
    updateEarnAddressDisplay(truncated, false);
  } else {
    updateEarnAddressDisplay(null, false);
  }
}

async function copyEarnAddress() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.CLIENT_ADDRESS, STORAGE_KEYS.ENS_NAME]);
  const address = result[STORAGE_KEYS.CLIENT_ADDRESS];
  const ensName = result[STORAGE_KEYS.ENS_NAME];

  // Copy ENS name if available, otherwise copy 0x address
  const valueToCopy = ensName || address;
  const toastMessage = ensName ? 'Address copied!' : 'Address copied!';

  if (valueToCopy) {
    try {
      await navigator.clipboard.writeText(valueToCopy);
      showToast(toastMessage);

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
 * Update unified address display in the UI when ENS name changes
 * This is called after ENS resolution completes
 */
async function updateEnsNameDisplay(ensName) {
  // Re-load and display the address (will show ENS if available)
  await loadClientAddress();
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

  // Filters container (period selector + stats) - collapsed by default for Live view
  const filtersContainer = document.getElementById('leaderboard-filters');

  // Period selector
  periodBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const period = e.target.dataset.period;
      currentPeriod = period;

      periodBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      // Reload current leaderboard view with new period
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

        // Show/hide filters container with slide animation
        const isLive = view === 'live';
        if (filtersContainer) {
          filtersContainer.classList.toggle('expanded', !isLive);
        }

        // Load data for the selected view
        if (view === 'tippers') {
          loadTopTippers();
          stopLivePolling();
        } else if (view === 'earners') {
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

  list.innerHTML = LeaderboardRenderer.renderTippersList(result.data.entries);
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

  list.innerHTML = LeaderboardRenderer.renderEarnersList(result.data.entries);
}

/**
 * Load Pool Stats (lifetime totals)
 */
async function loadPoolStats() {
  try {
    const [fundsRes, tipsRes, statsRes] = await Promise.all([
      GroveAPI.getFundsTotal(),
      GroveAPI.getTipsTotal(),
      GroveAPI.getLeaderboardStats('all')
    ]);

    if (!fundsRes.success || !tipsRes.success) {
      console.error('[Grove Extension] Failed to load pool stats');
      return;
    }

    const totalFunded = fundsRes.data.totalUSD;
    const totalTipped = tipsRes.data.totalUSD;
    const available = totalFunded - totalTipped;
    const tipCount = tipsRes.data.totalTipCount;
    const percentage = totalFunded > 0 ? Math.round((totalTipped / totalFunded) * 100) : 0;

    // Update DOM - Hero card
    const availableEl = document.getElementById('pool-available');
    if (availableEl) {
      availableEl.textContent = FormatUtils.formatPoolUSD(available);
      availableEl.classList.remove('loading');
    }

    const tippedEl = document.getElementById('pool-tipped');
    if (tippedEl) tippedEl.textContent = `${FormatUtils.formatPoolUSD(totalTipped)} earned`;

    const fundedEl = document.getElementById('pool-funded');
    if (fundedEl) fundedEl.textContent = `${FormatUtils.formatPoolUSD(totalFunded)} deposited`;

    const barFillEl = document.getElementById('pool-bar-fill');
    if (barFillEl) barFillEl.style.width = `${Math.min(percentage, 100)}%`;

    // Update DOM - Stats cards
    const tipCountEl = document.getElementById('pool-tip-count');
    if (tipCountEl) tipCountEl.textContent = tipCount.toLocaleString();

    // Update tippers and earners counts
    if (statsRes.success) {
      const tippersEl = document.getElementById('stat-tippers');
      if (tippersEl) tippersEl.textContent = FormatUtils.formatStatCount(statsRes.data.tippers);

      const recipientsEl = document.getElementById('stat-recipients');
      if (recipientsEl) recipientsEl.textContent = FormatUtils.formatStatCount(statsRes.data.recipients);
    }
  } catch (error) {
    console.error('[Grove Extension] Pool stats error:', error);
  }
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

  // Track new entries for animation
  const newTxHashes = new Set();
  if (isRefresh) {
    result.data.entries.forEach(e => {
      if (!seenTxHashes.has(e.txHash)) {
        newTxHashes.add(e.txHash);
      }
    });
  }

  // Update seen hashes
  result.data.entries.forEach(e => seenTxHashes.add(e.txHash));

  list.innerHTML = LeaderboardRenderer.renderLiveTipsList(result.data.entries, newTxHashes);
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
  loadPoolStats();
  if (currentLeaderboardView === 'live') {
    loadLiveTips();
  } else if (currentLeaderboardView === 'tippers') {
    loadTopTippers();
  } else if (currentLeaderboardView === 'earners') {
    loadTopEarners();
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
        depositsEl.textContent = FormatUtils.formatStatUSD(result.data.deposits);
        depositsEl.classList.remove('loading');
      }
      if (tipsEl) {
        tipsEl.textContent = FormatUtils.formatStatUSD(result.data.tips);
        tipsEl.classList.remove('loading');
      }
      if (tippersEl) {
        tippersEl.textContent = FormatUtils.formatStatCount(result.data.tippers);
        tippersEl.classList.remove('loading');
      }
      if (recipientsEl) {
        recipientsEl.textContent = FormatUtils.formatStatCount(result.data.recipients);
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

  // Render items using HistoryRenderer
  list.innerHTML = HistoryRenderer.renderHistoryList(pageItems);

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

// parseDestination is loaded from src/parsers/destination.js
// Format utilities are loaded from src/utils/formatUtils.js
// Leaderboard renderer is loaded from src/ui/leaderboardRenderer.js
// History renderer is loaded from src/ui/historyRenderer.js

/**
 * Tip Button Intro Modal
 * Shows page 1 only when user first connects their account
 * Twitter connect (page 2) is shown separately after conditions are met
 */

// Track current modal mode: 'intro' shows page 1 only, 'twitter' shows page 2 only
let introModalMode = 'intro';

async function checkAndShowTipIntroModal() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.TIP_INTRO_SEEN]);
  if (!result[STORAGE_KEYS.TIP_INTRO_SEEN]) {
    showIntroModalPage1Only();
  }
}

/**
 * Shows only page 1 of the intro modal (You're all set!)
 * The Next button will close the modal instead of going to page 2
 */
function showIntroModalPage1Only() {
  introModalMode = 'intro';
  if (tipButtonIntroModal) {
    tipButtonIntroModal.classList.remove('hidden');
    // Show page 1
    if (tipIntroPage1) tipIntroPage1.classList.add('active');
    if (tipIntroPage2) tipIntroPage2.classList.remove('active');
    // Hide the page indicator dots for intro-only mode
    const dotsContainer = document.querySelector('.tip-intro-indicators');
    if (dotsContainer) dotsContainer.style.display = 'none';
    // Change Next button text to "Got it"
    if (tipIntroNextBtn) {
      tipIntroNextBtn.innerHTML = '<span>Got it</span>';
    }
  }
}

/**
 * Shows page 2 (Twitter connect) directly
 * Called when conditions are met: 5+ launches and 1+ tips
 */
function showTwitterConnectModal() {
  introModalMode = 'twitter';
  if (tipButtonIntroModal) {
    tipButtonIntroModal.classList.remove('hidden');
    // Show page 2 directly
    if (tipIntroPage1) tipIntroPage1.classList.remove('active');
    if (tipIntroPage2) tipIntroPage2.classList.add('active');
    // Hide the page indicator dots for twitter-only mode
    const dotsContainer = document.querySelector('.tip-intro-indicators');
    if (dotsContainer) dotsContainer.style.display = 'none';
  }
}

async function hideTipIntroModal() {
  if (tipButtonIntroModal) {
    tipButtonIntroModal.classList.add('hidden');
  }
  // Mark appropriate flag based on mode
  if (introModalMode === 'intro') {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIP_INTRO_SEEN]: true });
  } else if (introModalMode === 'twitter') {
    await chrome.storage.local.set({ [STORAGE_KEYS.TWITTER_MODAL_SEEN]: true });
  }
  // Reset modal state
  resetIntroModalState();
}

/**
 * Reset modal to default state
 */
function resetIntroModalState() {
  if (tipIntroPage1) tipIntroPage1.classList.add('active');
  if (tipIntroPage2) tipIntroPage2.classList.remove('active');
  // Restore dots visibility
  const dotsContainer = document.querySelector('.tip-intro-indicators');
  if (dotsContainer) dotsContainer.style.display = '';
  // Restore Next button text
  if (tipIntroNextBtn) {
    tipIntroNextBtn.innerHTML = '<span>Next</span><svg class="bounce-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  }
  introModalMode = 'intro';
}

function goToTipIntroPage(pageNum) {
  // Update pages
  if (tipIntroPage1 && tipIntroPage2) {
    if (pageNum === 1) {
      tipIntroPage1.classList.add('active');
      tipIntroPage2.classList.remove('active');
    } else {
      tipIntroPage1.classList.remove('active');
      tipIntroPage2.classList.add('active');
    }
  }
  // Update dots
  tipIntroDots.forEach(dot => {
    if (parseInt(dot.dataset.page) === pageNum) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

/**
 * Increment launch count on each popup open
 */
async function incrementLaunchCount() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.LAUNCH_COUNT]);
  const currentCount = result[STORAGE_KEYS.LAUNCH_COUNT] || 0;
  await chrome.storage.local.set({ [STORAGE_KEYS.LAUNCH_COUNT]: currentCount + 1 });
}

/**
 * Check if Twitter connect modal should be shown
 * Conditions: 3+ launches, 1+ tips, not already seen, not already connected to X
 */
async function checkAndShowTwitterModal() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.LAUNCH_COUNT,
    STORAGE_KEYS.HAS_TIPPED,
    STORAGE_KEYS.TWITTER_MODAL_SEEN
  ]);

  const launchCount = result[STORAGE_KEYS.LAUNCH_COUNT] || 0;
  const hasTipped = result[STORAGE_KEYS.HAS_TIPPED] || false;
  const twitterModalSeen = result[STORAGE_KEYS.TWITTER_MODAL_SEEN] || false;

  // Check if conditions are met
  if (launchCount >= 5 && hasTipped && !twitterModalSeen) {
    // Check if user is already connected to X
    const isXConnected = await XAuth.isLoggedIn();
    if (!isXConnected) {
      showTwitterConnectModal();
    }
  }
}

// Toast notification: uses shared showToast from src/ui/toast.js
// Loaded via popup.html script tag before popup.js

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
