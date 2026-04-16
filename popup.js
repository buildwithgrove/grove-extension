/**
 * Grove Extension Popup
 * Handles navigation, settings, and interactions
 */

// DOM Elements
const navItems = document.querySelectorAll(".nav-item");
const pages = document.querySelectorAll(".page");

// Track previous tab for settings toggle
let previousTabTarget = "tab-home";

// Leaderboard switcher
let leaderboardSwitcherBtns = null;
let leaderboardViews = null;

// Home States
const onboardingState = document.getElementById("onboardingState");
const connectedState = document.getElementById("connectedState");
const setupTokenBtn = document.getElementById("setupTokenBtn");

// Tip amount (Home)
const tipAmountDisplay = document.getElementById("tipAmountDisplay");
const defaultTipRow = document.getElementById("defaultTipRow");
const tipAmountEditRow = document.getElementById("tipAmountEditRow");
const tipAmountInput = document.getElementById("tipAmountInput");
const saveTipAmount = document.getElementById("saveTipAmount");
const cancelTipEdit = document.getElementById("cancelTipEdit");
const editDefaultTipBtn = document.getElementById("editDefaultTipBtn");
const confirmTipToggle = document.getElementById("confirmTipToggle");

// Balance
const balanceAmount = document.getElementById("balanceAmount");
const balanceDisplay = document.getElementById("balanceDisplay");
const topUpBtn = document.getElementById("topUpBtn");

// Settings
const devModeToggle = document.getElementById("devModeCheckbox");
const endpointSelector = document.getElementById("endpointSelector");
const endpointDisplay = document.getElementById("endpointDisplay");
const endpointOptions = document.querySelectorAll('input[name="endpoint"]');

// JWT Management
const jwtStatusDisplay = document.getElementById("jwtStatusDisplay");
const manageJwtBtn = document.getElementById("manageJwtBtn");
const jwtEditContainer = document.getElementById("jwtEditContainer");
const jwtInput = document.getElementById("jwtInput");
const saveJwtBtn = document.getElementById("saveJwtBtn");
const cancelJwtBtn = document.getElementById("cancelJwtBtn");
const toggleJwtVisibility = document.getElementById("toggleJwtVisibility");
let removeJwtBtn = null; // Will be set later since it might not exist initially.

// JWT Slot Management (multi-slot UI)
const productionSlotDot = document.getElementById("productionSlotDot");
const testnetSlotDot = document.getElementById("testnetSlotDot");
const localhostSlotDot = document.getElementById("localhostSlotDot");
const productionKeyStatus = document.getElementById("productionKeyStatus");
const testnetKeyStatus = document.getElementById("testnetKeyStatus");
const localhostKeyStatus = document.getElementById("localhostKeyStatus");
const productionActiveBadge = document.getElementById("productionActiveBadge");
const testnetActiveBadge = document.getElementById("testnetActiveBadge");
const localhostActiveBadge = document.getElementById("localhostActiveBadge");
const productionKeySlot = document.getElementById("productionKeySlot");
const testnetKeySlot = document.getElementById("testnetKeySlot");
const localhostKeySlot = document.getElementById("localhostKeySlot");
const manageProductionKeyBtn = document.getElementById(
  "manageProductionKeyBtn",
);
const manageTestnetKeyBtn = document.getElementById("manageTestnetKeyBtn");
const manageLocalhostKeyBtn = document.getElementById("manageLocalhostKeyBtn");
const copyProductionKeyBtn = document.getElementById("copyProductionKeyBtn");
const copyTestnetKeyBtn = document.getElementById("copyTestnetKeyBtn");
const copyLocalhostKeyBtn = document.getElementById("copyLocalhostKeyBtn");
const clearAllKeysItem = document.getElementById("clearAllKeysItem");
const clearAllKeysBtn = document.getElementById("clearAllKeysBtn");
const jwtEditSlotLabel = document.getElementById("jwtEditSlotLabel");
const jwtEditAppLink = document.getElementById("jwtEditAppLink");
let currentEditSlot = null; // Track which slot is being edited ('production', 'testnet', or 'localhost')

// Previous Keys Management
const prevKeysSection = document.getElementById("prevKeysSection");
const prevKeysCount = document.getElementById("prevKeysCount");
const viewPrevKeysBtn = document.getElementById("viewPrevKeysBtn");
const prevKeysContainer = document.getElementById("prevKeysContainer");
const prevKeysList = document.getElementById("prevKeysList");
const closePrevKeysBtn = document.getElementById("closePrevKeysBtn");

// Account Info Section (shows for all logged-in users)
const accountInfoSection = document.getElementById("accountInfoSection");
const accountIdentityRow = document.getElementById("accountIdentityRow");
const accountInfoIcon = document.getElementById("accountInfoIcon");
const accountInfoValue = document.getElementById("accountInfoValue");
const accountInfoType = document.getElementById("accountInfoType");

// Tipping Wallet (in Account section)
const tippingWalletRow = document.getElementById("tippingWalletRow");
const tippingWalletAddress = document.getElementById("tippingWalletAddress");
const copyTippingWalletBtn = document.getElementById("copyTippingWalletBtn");

// Username Claim
const homeUsernameBtn = document.getElementById("homeUsernameBtn");
const homeUsernameSubtitle = document.getElementById("homeUsernameSubtitle");
const usernameClaimed = document.getElementById("usernameClaimed");
const usernameClaim = document.getElementById("usernameClaim");
const usernameDisplayValue = document.getElementById("usernameDisplayValue");
const usernameInput = document.getElementById("usernameInput");
const usernameClaimBtn = document.getElementById("usernameClaimBtn");
const usernameError = document.getElementById("usernameError");
const homeProfileLink = document.getElementById("homeProfileLink");

// Account Disconnect Button
const accountDisconnectBtn = document.getElementById("accountLogoutBtn");

// Tip Intro Modal
const tipButtonIntroModal = document.getElementById("tipButtonIntroModal");
const tipIntroGotItBtn = document.getElementById("tipIntroGotItBtn");
const tipIntroPage1 = document.getElementById("tipIntroPage1");
const tipIntroDots = document.querySelectorAll(".tip-intro-dot");

// Initialize Previous Keys UI
let prevKeysUI = null;

// STORAGE_KEYS is loaded from src/config/storageKeys.js

/**
 * Check if developer mode is enabled
 * @returns {Promise<boolean>}
 */
async function isDevMode() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  return result[STORAGE_KEYS.ENVIRONMENT] === "local";
}

/**
 * Get the active JWT based on current dev mode state
 * @returns {Promise<string|null>}
 */
async function getActiveJWT() {
  return KeyManager.getActiveJWT();
}


const walletSignInBtn = document.getElementById("walletSignInBtn");

// Defaults
const DEFAULT_TIP_AMOUNT = 0.02;
// DEFAULT_CHAIN is provided by src/config/chains.js
const DEFAULT_ENV = "prod";
const DEFAULT_ENDPOINT = "production";
// FormatUtils.DEFAULT_BALANCE_DISPLAY is now in FormatUtils
// Environment constants are now provided by GroveEnv (src/config/environments.js)

/**
 * Initialize Popup
 */
async function init() {
  // Migrate from legacy single-JWT storage (runs once)
  await KeyManager.migrateFromLegacy();

  // Migrate old wallet address storage keys to new terminology (runs once)
  await migrateWalletStorageKeys();

  // Initialize Previous Keys UI
  prevKeysUI = new PreviousKeysUI(
    prevKeysCount,
    prevKeysList,
    prevKeysContainer,
  );

  // Set up callback for when a previous key is used
  prevKeysUI.setOnUseKey(async (keyData) => {
    const { key, environment: storedEnv } = keyData;

    // Use stored environment, or fall back to active slot if not stored (legacy keys)
    const environment = storedEnv || (await KeyManager.getActiveSlotId());
    const slotConfig = KeyManager.getEnvConfig(environment);
    const chain = GroveEnv.defaultChain(environment);

    // Archive current key in that slot first (if any)
    const currentJwt = await KeyManager.getJWT(environment);
    if (currentJwt) {
      await KeyManager.archiveCurrentKey(currentJwt, environment);
    }

    // Store in the appropriate slot
    await KeyManager.setJWT(environment, key);

    // Update environment and chain settings
    const newEnv = slotConfig?.isDevMode ? "local" : "prod";
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: environment,
      [STORAGE_KEYS.CHAIN]: chain,
      [STORAGE_KEYS.ENVIRONMENT]: newEnv,
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances when switching keys
    });

    // Update chain UI
    updateChainUI(chain);
    updateTopUpLink(chain);
    updateAppLinks();
    updateNetworkSelectorVisibility(environment);
    updateTestnetKeyVisibility(slotConfig?.isDevMode);

    // Update dev mode toggle
    if (devModeToggle) {
      devModeToggle.checked = slotConfig?.isDevMode;
    }
    const testBanner = document.getElementById("testModeBanner");
    if (slotConfig?.isDevMode) {
      document.body.classList.add("developer-mode");
      if (testBanner) {
        testBanner.classList.remove("hidden");
        testBanner.classList.add("visible");
      }
      if (endpointSelector) endpointSelector.classList.remove("hidden");
    } else {
      document.body.classList.remove("developer-mode");
      if (testBanner) testBanner.classList.remove("visible");
      if (endpointSelector) endpointSelector.classList.add("hidden");
    }

    // Delete the key from previous keys (since it's now current)
    const keys = await KeyManager.getPreviousKeys();
    const keyIndex = keys.findIndex((k) => k.key === key);
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
  await loadEnvironment();
  await loadChain();
  await loadEndpoint();
  await prevKeysUI.updateCount();

  // Clear stale ENS cache on init - will be re-resolved fresh
  await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);

  loadExtensionVersion();
  checkForUpdates();
  setupEventListeners();

  // Ensure chain dropdown options match current endpoint on init
  const endpointInit = await GroveAPI.getBaseURL()
    .then(() => {
      return chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
    })
    .then((res) => res[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT)
    .catch(() => DEFAULT_ENDPOINT);
  updateNetworkSelectorVisibility(endpointInit);

  // Load cached handle for immediate home card display
  const cachedHandle = await chrome.storage.local.get([STORAGE_KEYS.HANDLE]);
  await updateUsernameCard(cachedHandle[STORAGE_KEYS.HANDLE] || null);

  // Fetch balance after everything is loaded (also updates earn address)
  await fetchBalance();

  // Update account info display (shows identity/wallet in Settings)
  await updateAccountInfoDisplay();

  // Resolve ENS name in the background (don't await to avoid blocking UI)
  loadAndResolveEnsName();

  // Increment launch count
  await incrementLaunchCount();

  // Refresh data when popup regains focus
  document.addEventListener("visibilitychange", handleVisibilityChange);
}

/**
 * Handle visibility change - refresh current tab data when popup becomes visible
 */
function handleVisibilityChange() {
  if (document.visibilityState !== "visible") return;

  // Find active tab
  const activeTab = document.querySelector(".page.active");
  if (!activeTab) return;

  const tabId = activeTab.id;

  // Refresh based on active tab
  if (tabId === "tab-home") {
    fetchBalance();
  } else if (tabId === "tab-history") {
    loadHistory();
  } else if (tabId === "tab-leaderboard") {
    refreshLeaderboard();
  }
}

/**
 * Load extension version from manifest
 */
function loadExtensionVersion() {
  const versionElement = document.getElementById("extensionVersion");
  if (versionElement && chrome.runtime.getManifest) {
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = manifest.version;
  }
}

/**
 * Check for extension updates and show banner if available
 */
async function checkForUpdates() {
  if (typeof UpdateChecker === "undefined") {
    groveLog.warn("UpdateChecker not loaded");
    return;
  }

  try {
    const result = await UpdateChecker.checkForUpdate();

    if (result.available) {
      showUpdateBanner(result.tag, result.displayVersion, result.downloadUrl);
    }
  } catch (error) {
    console.error("[Grove] Error checking for updates:", error);
  }
}

/**
 * Show the update available banner
 * @param {string} tag - Full release tag (e.g., "grove-extension-v1.0.5-abc123")
 * @param {string} displayVersion - Display version (e.g., "v1.0.5-abc123")
 * @param {string} downloadUrl - URL to download the update
 */
function showUpdateBanner(tag, displayVersion, downloadUrl) {
  const banner = document.getElementById("updateBanner");
  const versionText = document.getElementById("updateVersionText");
  const downloadBtn = document.getElementById("updateDownloadBtn");
  const dismissBtn = document.getElementById("updateDismissBtn");

  if (!banner || !versionText || !downloadBtn) return;

  versionText.textContent = displayVersion;
  downloadBtn.href = downloadUrl;

  // Mark as installed when user clicks download
  downloadBtn.onclick = () => {
    UpdateChecker.setInstalledTag(tag);
  };

  // Show the banner
  banner.classList.remove("hidden");
  // Use setTimeout to trigger CSS transition
  setTimeout(() => {
    banner.classList.add("visible");
  }, 10);

  // Set up dismiss handler
  if (dismissBtn) {
    dismissBtn.onclick = async () => {
      await UpdateChecker.dismissUpdate(tag);
      hideUpdateBanner();
      // Clear the badge in background
      chrome.runtime.sendMessage({ type: "CLEAR_UPDATE_BADGE" }, () => {
        void chrome.runtime.lastError; // Suppress warning if service worker inactive
      });
    };
  }
}

/**
 * Hide the update banner
 */
function hideUpdateBanner() {
  const banner = document.getElementById("updateBanner");
  if (!banner) return;

  banner.classList.remove("visible");
  setTimeout(() => {
    banner.classList.add("hidden");
  }, 300); // Match CSS transition duration
}

/**
 * Setup Listeners
 */
function setupEventListeners() {
  // Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", handleNavigation);
  });

  // Leaderboard switcher
  setupLeaderboardSwitcher();

  // History tab
  setupHistoryTab();

  // Settings drill-down navigation
  setupSettingsDrillDown();

  // Referral copy button
  setupReferralCopyButton();

  // Header settings button
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  if (headerSettingsBtn) {
    headerSettingsBtn.addEventListener("click", () => {
      navigateToSettings();
    });
  }

  // Tip Amount (Home) - Edit button triggers edit mode
  editDefaultTipBtn.addEventListener("click", showTipEdit);
  saveTipAmount.addEventListener("click", saveTip);
  if (cancelTipEdit) cancelTipEdit.addEventListener("click", hideTipEdit);
  confirmTipToggle.addEventListener("change", handleConfirmTipToggle);

  // Tip Intro Modal - "Got it" button
  if (tipIntroGotItBtn) {
    tipIntroGotItBtn.addEventListener("click", () => {
      hideTipIntroModal();
    });
  }
  // Page indicator dots
  tipIntroDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      const page = parseInt(dot.dataset.page);
      goToTipIntroPage(page);
    });
  });
  // Also close modal when clicking overlay
  if (tipButtonIntroModal) {
    tipButtonIntroModal.addEventListener("click", (e) => {
      if (e.target === tipButtonIntroModal) {
        hideTipIntroModal();
      }
    });
  }

  // Onboarding Multi-step Navigation
  setupOnboardingNavigation();

  // JWT setup button (if present)
  if (setupTokenBtn) {
    setupTokenBtn.addEventListener("click", () => {
      // Navigate to settings -> Account and open edit
      navigateToSettings();
      showSettingsView("account");
      showJwtEdit();
    });
  }

  // Developer Mode Banner - click to go to developer settings
  const testModeBanner = document.getElementById("testModeBanner");
  if (testModeBanner) {
    testModeBanner.addEventListener("click", () => {
      navigateToSettings();
      showSettingsView("developer");
    });
  }

  // Home Username Card - navigate to Settings > Username view
  if (homeUsernameBtn) {
    homeUsernameBtn.addEventListener("click", () => {
      navigateToSettings();
      showSettingsView("username");
    });
  }

  // Username claim button
  if (usernameClaimBtn) {
    usernameClaimBtn.addEventListener("click", handleClaimUsername);
  }

  // Username release button
  const usernameReleaseBtn = document.getElementById("usernameReleaseBtn");
  if (usernameReleaseBtn) {
    usernameReleaseBtn.addEventListener("click", handleReleaseUsername);
  }

  // Home Referrals Card - navigate to Settings > Referrals view
  const homeReferralsBtn = document.getElementById("homeReferralsBtn");
  if (homeReferralsBtn) {
    homeReferralsBtn.addEventListener("click", () => {
      navigateToSettings();
      showSettingsView("referral");
      loadReferralData();
    });
  }

  // Legacy manage button (kept for compatibility but hidden)
  if (manageJwtBtn) {
    manageJwtBtn.addEventListener("click", () => {
      if (jwtEditContainer.classList.contains("hidden")) {
        showJwtEdit();
      } else {
        hideJwtEdit();
      }
    });
  }

  // Slot click handlers - whole row is clickable
  const handleSlotClick = (slot) => {
    if (
      jwtEditContainer.classList.contains("hidden") ||
      currentEditSlot !== slot
    ) {
      showJwtEditForSlot(slot);
    } else {
      hideJwtEdit();
    }
  };

  if (productionKeySlot) {
    productionKeySlot.addEventListener("click", () =>
      handleSlotClick("production"),
    );
  }
  if (testnetKeySlot) {
    testnetKeySlot.addEventListener("click", () => handleSlotClick("testnet"));
  }
  if (localhostKeySlot) {
    localhostKeySlot.addEventListener("click", () =>
      handleSlotClick("localhost"),
    );
  }

  if (clearAllKeysBtn) {
    clearAllKeysBtn.addEventListener("click", clearAllKeys);
  }

  if (saveJwtBtn) saveJwtBtn.addEventListener("click", saveJwtForSlot);
  if (cancelJwtBtn) cancelJwtBtn.addEventListener("click", hideJwtEdit);

  // Get remove button and add event listener
  removeJwtBtn = document.getElementById("removeJwtBtn");
  if (removeJwtBtn) {
    removeJwtBtn.addEventListener("click", removeJwt);
  }

  // Previous Keys - whole row is clickable
  const handlePrevKeysClick = () => {
    if (prevKeysContainer.classList.contains("hidden")) {
      prevKeysUI.show();
      viewPrevKeysBtn.textContent = "Hide";
    } else {
      prevKeysUI.hide();
      viewPrevKeysBtn.textContent = "View";
    }
  };

  if (prevKeysSection) {
    const prevKeysRow = prevKeysSection.querySelector(".account-info-card");
    if (prevKeysRow) {
      prevKeysRow.addEventListener("click", handlePrevKeysClick);
    }
  }
  if (closePrevKeysBtn) {
    closePrevKeysBtn.addEventListener("click", () => {
      prevKeysUI.hide();
      viewPrevKeysBtn.textContent = "View";
    });
  }

  // JWT Visibility Toggle
  if (toggleJwtVisibility) {
    toggleJwtVisibility.addEventListener("click", togglePasswordVisibility);
  }

  // Dev Mode
  if (devModeToggle) {
    devModeToggle.addEventListener("change", handleDevModeToggle);
  } else {
    console.error("[Grove Extension] Developer mode toggle element not found");
  }

  // Endpoint Selection
  endpointOptions.forEach((option) => {
    option.addEventListener("change", handleEndpointChange);
  });

  // Quick Actions (Placeholders)
  document.querySelectorAll(".action-btn").forEach((btn) => {
    btn.addEventListener("click", () => showToast("Coming Soon"));
  });

  // Account - Copy Tipping Wallet Button
  if (copyTippingWalletBtn) {
    copyTippingWalletBtn.addEventListener("click", copyTippingWallet);
  }

  // Grove Keys - Copy Key Buttons
  if (copyProductionKeyBtn) {
    copyProductionKeyBtn.addEventListener("click", () =>
      copyGroveKey("production", copyProductionKeyBtn),
    );
  }
  if (copyTestnetKeyBtn) {
    copyTestnetKeyBtn.addEventListener("click", () =>
      copyGroveKey("testnet", copyTestnetKeyBtn),
    );
  }
  if (copyLocalhostKeyBtn) {
    copyLocalhostKeyBtn.addEventListener("click", () =>
      copyGroveKey("localhost", copyLocalhostKeyBtn),
    );
  }

  // Account - Disconnect Button
  if (accountDisconnectBtn) {
    accountDisconnectBtn.addEventListener("click", handleAccountDisconnect);
  }

  // Listen for storage changes (e.g., when webapp injects JWT via external messaging)
  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") return;

    // Handle JWT changes (either slot)
    if (
      changes[STORAGE_KEYS.JWT_PRODUCTION] ||
      changes[STORAGE_KEYS.JWT_TESTNET]
    ) {
      groveLog.log("JWT changed in storage, refreshing...");
      const jwt = await getActiveJWT();
      await updateAuthState(jwt);
      await fetchBalance();
    }

    // Handle environment (dev mode) changes from background
    if (changes[STORAGE_KEYS.ENVIRONMENT]) {
      console.log(
        "[Grove Extension] Environment changed in storage, updating UI...",
      );
      const newEnv = changes[STORAGE_KEYS.ENVIRONMENT].newValue;
      const isDevMode = newEnv === "local";

      // Update dev mode toggle
      if (devModeToggle) devModeToggle.checked = isDevMode;

      // Update dev mode UI
      const testBanner = document.getElementById("testModeBanner");
      if (isDevMode) {
        document.body.classList.add("developer-mode");
        if (testBanner) {
          testBanner.classList.remove("hidden");
          testBanner.classList.add("visible");
        }
        if (endpointSelector) endpointSelector.classList.remove("hidden");
      } else {
        document.body.classList.remove("developer-mode");
        if (testBanner) testBanner.classList.remove("visible");
        if (endpointSelector) endpointSelector.classList.add("hidden");
      }

      const endpointResult = await chrome.storage.local.get([
        STORAGE_KEYS.ENDPOINT,
      ]);
      const endpointValue =
        endpointResult[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
      updateNetworkSelectorVisibility(endpointValue);
      await fetchBalance();
    }

    if (changes[STORAGE_KEYS.CHAIN]) {
      groveLog.log("Chain changed in storage, updating UI...");
      const newChain = changes[STORAGE_KEYS.CHAIN].newValue;
      updateChainUI(newChain);
      updateTopUpLink(newChain);
      updateAppLinks();
      await fetchBalance();
    }
  });
}

/**
 * Navigate to Settings tab programmatically
 */
function navigateToSettings() {
  // If already on settings, go back to previous tab
  const settingsPage = document.getElementById("tab-settings");
  if (settingsPage && settingsPage.classList.contains("active")) {
    const prevNav = document.querySelector(
      `.nav-item[data-target="${previousTabTarget}"]`,
    );
    if (prevNav) prevNav.click();
    return;
  }

  // Save current tab before switching
  const activeNav = document.querySelector(".nav-item.active");
  if (activeNav) previousTabTarget = activeNav.dataset.target;

  // Remove active from all nav items (settings is now in the header, not bottom nav)
  navItems.forEach((item) => item.classList.remove("active"));

  // Highlight header settings button
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  if (headerSettingsBtn) headerSettingsBtn.classList.add("active");

  // Update pages
  pages.forEach((page) => {
    if (page.id === "tab-settings") {
      page.classList.add("active");
    } else {
      page.classList.remove("active");
    }
  });

  // Show main settings menu
  showSettingsView("main");
}

/**
 * Navigation Handler
 */
async function handleNavigation(e) {
  const targetId = e.currentTarget.dataset.target;

  // Update Tabs
  navItems.forEach((item) => item.classList.remove("active"));
  e.currentTarget.classList.add("active");

  // Deactivate header settings button when navigating to a tab
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  if (headerSettingsBtn) headerSettingsBtn.classList.remove("active");

  // Update Pages
  pages.forEach((page) => {
    if (page.id === targetId) {
      page.classList.add("active");
    } else {
      page.classList.remove("active");
    }
  });

  // Refresh balance when navigating to home
  if (targetId === "tab-home") {
    await fetchBalance();
  }

  // Load history when navigating to history tab
  if (targetId === "tab-history") {
    loadHistory();
  }

  // Load leaderboard data when navigating to leaderboard
  if (targetId === "tab-leaderboard") {
    loadPoolStats();
    if (currentLeaderboardView === "top") {
      loadFeedItems("tipped");
    } else {
      loadFeedItems("live");
      startLivePolling();
    }
  } else {
    // Stop live polling when leaving leaderboard tab
    stopLivePolling();
  }

  // Reset settings view to main menu when navigating to settings tab
  if (targetId === "tab-settings") {
    showSettingsView("main");
  }
}

/**
 * Onboarding Multi-step Navigation
 */
function setupOnboardingNavigation() {
  const onboardingContainer = document.querySelector(".onboarding-container");
  if (!onboardingContainer) return;

  const steps = onboardingContainer.querySelectorAll(".onboarding-step");
  const progressDots = onboardingContainer.querySelectorAll(".progress-dot");
  const nextBtns = onboardingContainer.querySelectorAll(".onboarding-btn-next");
  const backBtns = onboardingContainer.querySelectorAll(
    ".onboarding-btn-back, .onboarding-btn-back-text",
  );

  function goToStep(stepNum) {
    // Update steps
    steps.forEach((step) => {
      const currentStep = parseInt(step.dataset.step);
      if (currentStep === stepNum) {
        step.classList.add("active");
        step.style.animation = "fadeSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
      } else {
        step.classList.remove("active");
      }
    });

    // Update progress dots
    progressDots.forEach((dot) => {
      const dotStep = parseInt(dot.dataset.step);
      dot.classList.remove("active", "completed");
      if (dotStep === stepNum) {
        dot.classList.add("active");
      } else if (dotStep < stepNum) {
        dot.classList.add("completed");
      }
    });
  }

  // Next buttons
  nextBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const nextStep = parseInt(btn.dataset.next);
      goToStep(nextStep);
    });
  });

  // Back buttons
  backBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const prevStep = parseInt(btn.dataset.back);
      goToStep(prevStep);
    });
  });

  // Progress dot clicks
  progressDots.forEach((dot) => {
    dot.addEventListener("click", () => {
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
  const prodJwt = await KeyManager.getJWT("production");
  const testnetJwt = await KeyManager.getJWT("testnet");
  const localhostJwt = await KeyManager.getJWT("localhost");
  const activeSlot = await KeyManager.getActiveSlotId();

  // Helper to update slot UI
  function updateSlotUI(dot, status, badge, copyBtn, jwt, isActive) {
    if (dot) {
      dot.classList.toggle("connected", !!jwt);
      dot.classList.toggle("disconnected", !jwt);
    }
    if (status) {
      if (jwt) {
        const first = jwt.substring(0, 6);
        const last = jwt.substring(jwt.length - 4);
        status.innerHTML = `<span style="font-family: monospace">${first}...${last}</span>`;
      } else {
        status.textContent = "Not connected";
      }
    }
    if (badge) {
      badge.classList.toggle("hidden", !isActive);
    }
    if (copyBtn) {
      copyBtn.classList.toggle("hidden", !jwt);
    }
  }

  // Update each slot
  updateSlotUI(
    productionSlotDot,
    productionKeyStatus,
    productionActiveBadge,
    copyProductionKeyBtn,
    prodJwt,
    activeSlot === "production",
  );
  updateSlotUI(
    testnetSlotDot,
    testnetKeyStatus,
    testnetActiveBadge,
    copyTestnetKeyBtn,
    testnetJwt,
    activeSlot === "testnet",
  );
  updateSlotUI(
    localhostSlotDot,
    localhostKeyStatus,
    localhostActiveBadge,
    copyLocalhostKeyBtn,
    localhostJwt,
    activeSlot === "localhost",
  );

  const devMode = await isDevMode();
  updateTestnetKeyVisibility(devMode);
}

async function updateAuthState(jwt) {
  if (jwt && jwt.length > 0) {
    // Connected
    onboardingState.classList.add("hidden");
    connectedState.classList.remove("hidden");

    // Earn setup modal is triggered after fetchBalance() has account data

    // Get environment from storage to show in status
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT]);
    const endpoint = result[STORAGE_KEYS.ENDPOINT] || "production";
    const envLabel = endpoint === "testnet" ? "Testnet" : "Mainnet";

    // Settings Display - show truncated key + environment
    const first = jwt.substring(0, 6);
    const last = jwt.substring(jwt.length - 4);
    jwtStatusDisplay.innerHTML = `<span style="font-family: monospace">${first}...${last}</span> <span class="key-env-badge ${endpoint === "testnet" ? "testnet" : ""}">${envLabel}</span>`;
    jwtStatusDisplay.style.color = "var(--color-primary)";

    // Get remove button if not already cached
    if (!removeJwtBtn) {
      removeJwtBtn = document.getElementById("removeJwtBtn");
    }
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove("hidden");
    }
  } else {
    // Not Connected
    onboardingState.classList.remove("hidden");
    connectedState.classList.add("hidden");

    jwtStatusDisplay.textContent = "Not connected";
    jwtStatusDisplay.style.color = "var(--color-text-secondary)";
    jwtStatusDisplay.style.fontFamily = "inherit";

    // Get remove button if not already cached
    if (!removeJwtBtn) {
      removeJwtBtn = document.getElementById("removeJwtBtn");
    }
    if (removeJwtBtn) {
      removeJwtBtn.classList.add("hidden");
    }
  }
}

async function showJwtEdit() {
  jwtEditContainer.classList.remove("hidden");
  if (manageJwtBtn) manageJwtBtn.textContent = "Close";

  // Get remove button if not already cached
  if (!removeJwtBtn) {
    removeJwtBtn = document.getElementById("removeJwtBtn");
  }

  // Check if JWT exists to show/hide remove button and populate input
  const jwt = await getActiveJWT();
  if (jwt && jwt.length > 0) {
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove("hidden");
    }
    jwtInput.value = jwt; // Show existing key in input
  } else {
    if (removeJwtBtn) {
      removeJwtBtn.classList.add("hidden");
    }
    jwtInput.value = "";
  }

  jwtInput.focus();
}

/**
 * Show the JWT edit form for a specific slot
 * @param {string} slot - 'production', 'testnet', or 'localhost'
 */
async function showJwtEditForSlot(slot) {
  currentEditSlot = slot;
  jwtEditContainer.classList.remove("hidden");

  // Get config for this slot
  const config = KeyManager.getEnvConfig(slot) || {
    label: "Key",
    appUrl: "https://grove.city/extension",
  };

  // Update the label and link based on slot
  if (jwtEditSlotLabel) {
    jwtEditSlotLabel.textContent = `${config.label} Key`;
  }
  if (jwtEditAppLink) {
    jwtEditAppLink.href = config.appUrl;
    jwtEditAppLink.textContent = config.appUrl.replace(/^https?:\/\//, "");
  }

  // Get remove button if not already cached
  if (!removeJwtBtn) {
    removeJwtBtn = document.getElementById("removeJwtBtn");
  }

  // Get the JWT for the specific slot
  const jwt = await KeyManager.getJWT(slot);

  if (jwt && jwt.length > 0) {
    if (removeJwtBtn) {
      removeJwtBtn.classList.remove("hidden");
    }
    jwtInput.value = jwt;
  } else {
    if (removeJwtBtn) {
      removeJwtBtn.classList.add("hidden");
    }
    jwtInput.value = "";
  }

  jwtInput.focus();
}

function hideJwtEdit() {
  jwtEditContainer.classList.add("hidden");
  if (manageJwtBtn) manageJwtBtn.textContent = "Manage";
  jwtInput.value = ""; // Clear input for security
  currentEditSlot = null; // Reset slot state
}

async function saveJwt() {
  const token = jwtInput.value.trim();
  if (!token) {
    showToast("Please enter a token");
    return;
  }

  // Save to the currently active slot
  const environment = await KeyManager.getActiveSlotId();
  const slotConfig = KeyManager.getEnvConfig(environment);
  const chain = GroveEnv.defaultChain(environment);

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
  updateAppLinks();

  await updateAuthState(token);
  hideJwtEdit();

  showToast(`Connected to ${slotConfig.label}`);
  await prevKeysUI.updateCount();

  // Fetch balance with new token
  await fetchBalance();

  // Go back to home if we were onboarding
  if (!onboardingState.classList.contains("hidden")) {
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
    showToast("Please enter a token");
    return;
  }

  // If no slot is set, fall back to auto-detection
  if (!currentEditSlot) {
    return saveJwt();
  }

  const slotConfig = KeyManager.getEnvConfig(currentEditSlot);
  if (!slotConfig) {
    showToast("Invalid slot");
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

/**
 * Core disconnect logic - archives key and clears slot
 * @param {string} slotId - The slot to disconnect (e.g., 'production', 'testnet')
 * @returns {Promise<{envLabel: string}>} - Info about what was disconnected
 */
async function disconnectSlot(slotId) {
  const activeSlot = await KeyManager.getActiveSlotId();
  const slotConfig = KeyManager.getEnvConfig(slotId);

  // Archive the key before removing
  const jwtToRemove = await KeyManager.getJWT(slotId);
  if (jwtToRemove) {
    await KeyManager.archiveCurrentKey(jwtToRemove, slotId);
  }

  // Clear the JWT in the slot
  await KeyManager.clearJWT(slotId);

  // Update the slot UI
  await loadJwtSlots();

  // If we removed the active slot, clear auth state and account info
  if (slotId === activeSlot) {
    // Set logged-out flag so the web app can't re-inject JWT
    await chrome.storage.local.set({ [STORAGE_KEYS.LOGGED_OUT]: true });

    await chrome.storage.local.remove([
      STORAGE_KEYS.EARNING_ADDRESS,
      STORAGE_KEYS.TIPPING_ADDRESS,
      STORAGE_KEYS.SMART_ACCOUNT_ADDRESS,
      STORAGE_KEYS.EXTERNAL_LINKED_WALLETS,
      STORAGE_KEYS.ENS_NAME,
      STORAGE_KEYS.HANDLE,
    ]);
    await updateAuthState(null);

    await updateUsernameCard(null);
    await updateAccountInfoDisplay();
  }

  await prevKeysUI.updateCount();

  // Refresh previous keys list if visible
  if (!prevKeysContainer.classList.contains("hidden")) {
    await prevKeysUI.render();
  }

  return { envLabel: slotConfig ? slotConfig.label : slotId };
}

let removeJwtPending = false;

async function removeJwt() {
  // First click: show confirmation state
  if (!removeJwtPending) {
    removeJwtPending = true;
    removeJwtBtn.textContent = "Confirm?";
    removeJwtBtn.classList.add("confirming");

    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      if (removeJwtPending) {
        removeJwtPending = false;
        removeJwtBtn.textContent = "Disconnect";
        removeJwtBtn.classList.remove("confirming");
      }
    }, 3000);
    return;
  }

  // Second click: actually disconnect
  removeJwtPending = false;
  removeJwtBtn.textContent = "Disconnect";
  removeJwtBtn.classList.remove("confirming");

  // Determine which slot to clear - use currentEditSlot if set, otherwise use active slot
  const activeSlot = await KeyManager.getActiveSlotId();
  const slotToRemove = currentEditSlot || activeSlot;

  const { envLabel } = await disconnectSlot(slotToRemove);

  hideJwtEdit();
  showToast(`${envLabel} key removed`);
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
    clearAllKeysBtn.textContent = "Confirm?";
    clearAllKeysBtn.classList.add("confirming");

    // Reset after 3 seconds if not confirmed
    setTimeout(() => {
      if (clearAllKeysPending) {
        clearAllKeysPending = false;
        clearAllKeysBtn.textContent = "Clear";
        clearAllKeysBtn.classList.remove("confirming");
      }
    }, 3000);
    return;
  }

  // Second click: clear everything
  clearAllKeysPending = false;
  clearAllKeysBtn.textContent = "Clear";
  clearAllKeysBtn.classList.remove("confirming");

  // Clear all JWT slots
  await KeyManager.clearJWT("production");
  await KeyManager.clearJWT("testnet");
  await KeyManager.clearJWT("localhost");

  // Clear archived keys
  await KeyManager.clearAll();

  // Clear auth state
  await chrome.storage.local.remove([
    STORAGE_KEYS.EARNING_ADDRESS,
    STORAGE_KEYS.TIPPING_ADDRESS,
    STORAGE_KEYS.SMART_ACCOUNT_ADDRESS,
    STORAGE_KEYS.EXTERNAL_LINKED_WALLETS,
    STORAGE_KEYS.ENS_NAME,
  ]);
  await updateAuthState(null);
  await updateAccountInfoDisplay();

  // Update UI
  await loadJwtSlots();
  hideJwtEdit();
  await prevKeysUI.updateCount();

  if (!prevKeysContainer.classList.contains("hidden")) {
    await prevKeysUI.render();
  }

  showToast("All keys cleared");
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
  const amountSpan = tipAmountDisplay.querySelector(".amount-value");
  if (amountSpan) {
    amountSpan.textContent = formatted;
  }
  tipAmountInput.value = formatted;
}

function showTipEdit() {
  // Hide display row, show edit row
  if (defaultTipRow) defaultTipRow.classList.add("hidden");
  if (tipAmountEditRow) tipAmountEditRow.classList.remove("hidden");
  // Focus and select all for easy replacement
  tipAmountInput.focus();
  tipAmountInput.select();
}

function hideTipEdit() {
  // Show display row, hide edit row
  if (defaultTipRow) defaultTipRow.classList.remove("hidden");
  if (tipAmountEditRow) tipAmountEditRow.classList.add("hidden");
}

async function saveTip() {
  const val = parseFloat(tipAmountInput.value);
  if (val > 0) {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIP_AMOUNT]: val });
    updateTipUI(val);
    hideTipEdit();
    showToast("Default tip updated");
  } else {
    showToast("Invalid amount");
  }
}

/**
 * Confirm tip toggle
 */
async function loadConfirmTip() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CONFIRM_TIP,
    STORAGE_KEYS.CONFIRM_TIP_V2,
  ]);

  // Disable transition during initial load
  const toggleSwitch = confirmTipToggle.closest(".toggle-switch");
  if (toggleSwitch) toggleSwitch.classList.add("no-transition");

  // Migration logic: if V2 flag not set, reset confirm to true (new default)
  if (!result[STORAGE_KEYS.CONFIRM_TIP_V2]) {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CONFIRM_TIP]: true,
      [STORAGE_KEYS.CONFIRM_TIP_V2]: true,
    });
    confirmTipToggle.checked = true;
  } else {
    // V2 already set, use stored value (default to true if not set)
    const enabled = result[STORAGE_KEYS.CONFIRM_TIP] !== false;
    confirmTipToggle.checked = enabled;
  }

  // Re-enable transitions after paint completes
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (toggleSwitch) toggleSwitch.classList.remove("no-transition");
    });
  });
}

async function handleConfirmTipToggle() {
  const enabled = confirmTipToggle.checked;
  await chrome.storage.local.set({ [STORAGE_KEYS.CONFIRM_TIP]: enabled });
}

/**
 * Balance
 */
async function fetchBalance() {
  balanceDisplay.classList.add("loading");
  const earningsDisplayEl = document.getElementById("earningsDisplay");
  if (earningsDisplayEl) earningsDisplayEl.classList.add("loading");

  // Get JWT based on current dev mode
  const jwt = await getActiveJWT();

  // Get chain and cached balances
  const storageResult = await chrome.storage.local.get([
    STORAGE_KEYS.CHAIN,
    STORAGE_KEYS.LAST_BALANCES,
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

    if (!response.success || !response.data?.wallet_balances) {
      console.error("[Grove Extension] Balance fetch failed:", response.error);

      // Check if this is an auth/account failure (401/403 for invalid JWT, 404 for account not found)
      const isAuthFailure =
        response.status === 401 ||
        response.status === 403 ||
        response.status === 404;
      if (isAuthFailure) {
        console.log(
          "[Grove Extension] Auth failure detected, archiving and clearing invalid JWT",
        );

        // Get the active slot to know where to clear
        const activeSlot = await KeyManager.getActiveSlotId();

        // Archive the invalid key to previous keys
        await KeyManager.archiveCurrentKey(jwt, activeSlot);

        // Clear the JWT from the active slot
        await KeyManager.clearJWT(activeSlot);

        // Clear cached data
        await chrome.storage.local.remove([
          STORAGE_KEYS.EARNING_ADDRESS,
          STORAGE_KEYS.TIPPING_ADDRESS,
          STORAGE_KEYS.SMART_ACCOUNT_ADDRESS,
          STORAGE_KEYS.EXTERNAL_LINKED_WALLETS,
          STORAGE_KEYS.ENS_NAME,
          STORAGE_KEYS.HANDLE,
          STORAGE_KEYS.LAST_BALANCES,
        ]);

        // Update UI to show disconnected state
        await updateAuthState(null);
        await loadJwtSlots();
        await prevKeysUI.updateCount();

        balanceAmount.textContent = FormatUtils.DEFAULT_BALANCE_DISPLAY;

        showToast("API key invalid or expired. Key archived.");
      }
      return;
    }

    // Store addresses from API response
    // earning_address = user's smart account wallet
    // tipping_address = Grove-managed tipping wallet (server)
    const earnAddress = response.data.earning_address;

    if (earnAddress) {
      groveLog.log("fetchBalance got addresses:", {
        earning: response.data.earning_address,
        tipping: response.data.tipping_address,
        earn: earnAddress,
      });

      const previousEarnAddress = await getEarnAddress();

      // Store addresses
      const addressUpdates = {};
      if (response.data.earning_address) {
        addressUpdates[STORAGE_KEYS.EARNING_ADDRESS] =
          response.data.earning_address;
      }
      if (response.data.tipping_address) {
        addressUpdates[STORAGE_KEYS.TIPPING_ADDRESS] =
          response.data.tipping_address;
      }
      if (response.data.smart_account_address) {
        addressUpdates[STORAGE_KEYS.SMART_ACCOUNT_ADDRESS] =
          response.data.smart_account_address;
      }
      // TODO_IDEA: external_linked_wallets are non-earning linked wallet addresses — not used yet
      if (response.data.external_linked_wallets) {
        addressUpdates[STORAGE_KEYS.EXTERNAL_LINKED_WALLETS] =
          response.data.external_linked_wallets;
      }
      await chrome.storage.local.set(addressUpdates);

      // If earning address changed, clear cached ENS name and re-resolve
      if (previousEarnAddress !== earnAddress) {
        await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
        loadAndResolveEnsName();
      }
    } else {
      // No earning address in response - clear cached data and show setup card
      await chrome.storage.local.remove([
        STORAGE_KEYS.EARNING_ADDRESS,
        STORAGE_KEYS.TIPPING_ADDRESS,
        STORAGE_KEYS.SMART_ACCOUNT_ADDRESS,
        STORAGE_KEYS.EXTERNAL_LINKED_WALLETS,
        STORAGE_KEYS.ENS_NAME,
      ]);
    }

    // Store handle from account response
    const handle = response.data.handle || null;
    if (handle) {
      await chrome.storage.local.set({ [STORAGE_KEYS.HANDLE]: handle });
    } else {
      await chrome.storage.local.remove([STORAGE_KEYS.HANDLE]);
    }

    // Cache referral code for use in auto-reply messages
    if (response.data.referral_code) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.REFERRAL_CODE]: response.data.referral_code,
      });
    } else {
      await chrome.storage.local.remove([STORAGE_KEYS.REFERRAL_CODE]);
    }
    await updateUsernameCard(handle);

    // Find the server wallet (Grove-controlled tipping wallet)
    const serverWallet = response.data.wallet_balances.find(
      (w) => w.wallet_type === "server",
    );
    // Find USDC balance within the server wallet for current chain
    const chainBalance = serverWallet?.balances.find(
      (b) => b.network === chain && b.token_symbol === "USDC",
    );

    if (chainBalance) {
      // Format balance (remove trailing zeros, max 2 decimal places for display)
      const formattedBalance = FormatUtils.formatBalance(chainBalance.balance);
      balanceAmount.textContent = formattedBalance;
      cachedBalances[chain] = formattedBalance;
      await chrome.storage.local.set({
        [STORAGE_KEYS.LAST_BALANCES]: cachedBalances,
      });
    } else {
      balanceAmount.textContent = FormatUtils.DEFAULT_BALANCE_DISPLAY;
      cachedBalances[chain] = FormatUtils.DEFAULT_BALANCE_DISPLAY;
      await chrome.storage.local.set({
        [STORAGE_KEYS.LAST_BALANCES]: cachedBalances,
      });
    }

    // Display earnings balance (smart account wallet)
    const earningsDisplay = document.getElementById("earningsDisplay");
    const earningsAmountEl = document.getElementById("earningsAmount");
    const earningsRow = document.getElementById("earningsRow");
    const smartAccountWallet = response.data.wallet_balances.find(
      (w) => w.wallet_type === "smart_account",
    );
    const earningsChainBalance = smartAccountWallet?.balances?.find(
      (b) => b.network === chain && b.token_symbol === "USDC",
    );
    if (earningsAmountEl) {
      earningsAmountEl.textContent = earningsChainBalance
        ? FormatUtils.formatBalance(earningsChainBalance.balance)
        : FormatUtils.DEFAULT_BALANCE_DISPLAY;
    }
    if (earningsDisplay) earningsDisplay.classList.remove("loading");
    if (earningsRow) earningsRow.classList.remove("hidden");
  } catch (e) {
    console.error("[Grove Extension] Balance fetch failed:", e);
  } finally {
    balanceDisplay.classList.remove("loading");
    const earningsDisplayFinal = document.getElementById("earningsDisplay");
    if (earningsDisplayFinal) earningsDisplayFinal.classList.remove("loading");
  }
}

/**
 * Migrate old wallet storage keys to new terminology (one-time).
 * CLIENT_ADDRESS → EARNING_ADDRESS (Smart Account)
 * EMBEDDED_WALLET_ADDRESS → EARNING_ADDRESS (legacy EOA fallback)
 * ONCHAIN_ADDRESS → TIPPING_ADDRESS (Server)
 */
async function migrateWalletStorageKeys() {
  // Skip if already migrated
  const flags = await chrome.storage.local.get([
    STORAGE_KEYS.WALLET_KEYS_MIGRATED,
  ]);
  if (flags[STORAGE_KEYS.WALLET_KEYS_MIGRATED]) return;

  const old = await chrome.storage.local.get([
    "GROVE_CLIENT_ADDRESS",
    "GROVE_EMBEDDED_WALLET_ADDRESS",
    "GROVE_ONCHAIN_ADDRESS",
  ]);
  const updates = {};
  if (old["GROVE_CLIENT_ADDRESS"]) {
    updates[STORAGE_KEYS.EARNING_ADDRESS] = old["GROVE_CLIENT_ADDRESS"];
  } else if (old["GROVE_EMBEDDED_WALLET_ADDRESS"]) {
    // Fallback to embedded wallet address if earn address is missing
    updates[STORAGE_KEYS.EARNING_ADDRESS] =
      old["GROVE_EMBEDDED_WALLET_ADDRESS"];
  }

  if (old["GROVE_ONCHAIN_ADDRESS"]) {
    updates[STORAGE_KEYS.TIPPING_ADDRESS] = old["GROVE_ONCHAIN_ADDRESS"];
  }
  if (Object.keys(updates).length) {
    await chrome.storage.local.set(updates);
  }
  // Always clean up old keys regardless of whether migration happened
  await chrome.storage.local.remove([
    "GROVE_CLIENT_ADDRESS",
    "GROVE_EMBEDDED_WALLET_ADDRESS",
    "GROVE_ONCHAIN_ADDRESS",
  ]);
  // Mark migration as done
  await chrome.storage.local.set({ [STORAGE_KEYS.WALLET_KEYS_MIGRATED]: true });
  if (Object.keys(updates).length) {
    console.log(
      "[Grove Extension] Migrated wallet storage keys:",
      Object.keys(updates),
    );
  }
}

/**
 * Get the user's earning address from storage.
 */
async function getEarnAddress() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.EARNING_ADDRESS]);
  return result[STORAGE_KEYS.EARNING_ADDRESS] || null;
}

/**
 * Core claim-handle logic shared by earn tab and settings tab.
 * Returns { success: true } or { success: false, error: string }.
 */
async function claimHandleCore(handle) {
  const jwt = await getActiveJWT();
  if (!jwt) return { success: false, error: "Not signed in." };

  const response = await GroveAPI.claimHandle(handle, jwt);
  if (!response.success) {
    const msg =
      response.status === 409
        ? "Already taken."
        : response.status === 400
          ? response.error || "Invalid username."
          : response.error || "Failed to claim.";
    return { success: false, error: msg };
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.HANDLE]: handle });
  await updateUsernameCard(handle);
  loadUsernameView();
  return { success: true };
}

async function copyTippingWallet() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.TIPPING_ADDRESS]);
  const address = result[STORAGE_KEYS.TIPPING_ADDRESS];

  if (address) {
    try {
      await navigator.clipboard.writeText(address);
      showToast("Address copied!");

      if (copyTippingWalletBtn) {
        copyTippingWalletBtn.classList.add("copied");
        setTimeout(() => {
          copyTippingWalletBtn.classList.remove("copied");
        }, 2000);
      }
    } catch (err) {
      console.error("[Grove Extension] Copy failed:", err);
      showToast("Failed to copy");
    }
  }
}

/**
 * Copy a Grove Key to clipboard
 * @param {string} slotId - The slot ID ('production', 'testnet', or 'localhost')
 * @param {HTMLElement} btn - The copy button element for visual feedback
 */
async function copyGroveKey(slotId, btn) {
  const jwt = await KeyManager.getJWT(slotId);

  if (jwt) {
    try {
      await navigator.clipboard.writeText(jwt);
      showToast("Key copied!");

      if (btn) {
        btn.classList.add("copied");
        setTimeout(() => {
          btn.classList.remove("copied");
        }, 2000);
      }
    } catch (err) {
      console.error("[Grove Extension] Copy failed:", err);
      showToast("Failed to copy");
    }
  }
}

/**
 * Handle disconnect from Account section
 * Uses shared disconnectSlot flow
 */
async function handleAccountDisconnect() {
  const activeSlot = await KeyManager.getActiveSlotId();
  const { envLabel } = await disconnectSlot(activeSlot);

  // Go back to main settings
  showSettingsView("main");

  showToast(`Disconnected from ${envLabel}`);
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
  if (!address || !address.startsWith("0x")) {
    return null;
  }

  const addr = address.toLowerCase();

  // Use web3.bio API - but FILTER results to only use entries where address matches
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://api.web3.bio/profile/${addr}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      // IMPORTANT: Filter to only results where the address field matches our query
      // web3.bio sometimes returns unrelated profiles first
      const matchingProfiles = data.filter(
        (p) => p.address && p.address.toLowerCase() === addr,
      );

      // Prefer ENS (.eth but not .base.eth) over Basenames
      const ensProfile = matchingProfiles.find(
        (p) =>
          p.platform === "ens" ||
          (p.identity &&
            p.identity.endsWith(".eth") &&
            !p.identity.endsWith(".base.eth")),
      );
      if (ensProfile?.identity) {
        groveLog.log("Resolved ENS:", ensProfile.identity);
        return ensProfile.identity;
      }

      // Fallback to Basenames (.base.eth)
      const baseProfile = matchingProfiles.find(
        (p) =>
          p.platform === "basenames" ||
          (p.identity && p.identity.endsWith(".base.eth")),
      );
      if (baseProfile?.identity) {
        console.log(
          "[Grove Extension] Resolved Basename:",
          baseProfile.identity,
        );
        return baseProfile.identity;
      }
    }
  } catch (e) {
    groveLog.log("ENS lookup failed:", e.message);
  }

  return null;
}

/**
 * Load and resolve ENS name for stored address
 * Always does fresh resolution - does not trust cached ENS name
 */
async function loadAndResolveEnsName() {
  const address = await getEarnAddress();

  console.log(
    "[Grove Extension] loadAndResolveEnsName called, address:",
    address,
  );

  if (!address) {
    groveLog.log("No address to resolve");
    return;
  }

  // Always do fresh resolution
  try {
    const ensName = await resolveEnsName(address);
    console.log(
      "[Grove Extension] ENS resolution result:",
      ensName,
      "for address:",
      address,
    );
    if (ensName) {
      await chrome.storage.local.set({ [STORAGE_KEYS.ENS_NAME]: ensName });
    } else {
      // No ENS found - clear cache and keep showing truncated address
      await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
    }
  } catch (e) {
    console.error("[Grove Extension] ENS resolution failed:", e);
    // On error, keep showing truncated address (don't use stale cache)
    await chrome.storage.local.remove([STORAGE_KEYS.ENS_NAME]);
  }
}

/**
 * Environment
 */
async function loadEnvironment() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ENVIRONMENT,
    STORAGE_KEYS.ENDPOINT,
    STORAGE_KEYS.CHAIN,
  ]);
  let env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  let endpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
  const testBanner = document.getElementById("testModeBanner");
  const isDevMode = env === "local";

  // Force production defaults when not in dev mode
  if (!isDevMode) {
    env = "prod";
    endpoint = "production";
    const storedChain = result[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
    const chainConfig = NETWORKS[storedChain] || NETWORKS[DEFAULT_CHAIN];
    const isTestnetChain = (chainConfig.type || "").toLowerCase() === "testnet";

    await chrome.storage.local.set({
      [STORAGE_KEYS.ENVIRONMENT]: env,
      [STORAGE_KEYS.ENDPOINT]: endpoint,
      [STORAGE_KEYS.CHAIN]: isTestnetChain ? DEFAULT_CHAIN : storedChain,
    });
  }

  if (isDevMode) {
    if (devModeToggle) devModeToggle.checked = true;
    document.body.classList.add("developer-mode");
    if (testBanner) {
      testBanner.classList.remove("hidden");
      testBanner.classList.add("visible");
    }
    if (endpointSelector) endpointSelector.classList.remove("hidden");
  } else {
    if (devModeToggle) devModeToggle.checked = false;
    document.body.classList.remove("developer-mode");
    if (testBanner) {
      testBanner.classList.remove("visible");
    }
    if (endpointSelector) endpointSelector.classList.add("hidden");
  }

  // Update network selector visibility based on endpoint
  updateNetworkSelectorVisibility(endpoint);
  updateTestnetKeyVisibility(isDevMode);
  setTestModeBannerText(endpoint);
}

async function handleDevModeToggle(e) {
  const isDev = e.target.checked;
  const newEnv = isDev ? "local" : "prod";
  const testBanner = document.getElementById("testModeBanner");

  await chrome.storage.local.set({ [STORAGE_KEYS.ENVIRONMENT]: newEnv });

  if (isDev) {
    // Enable developer mode
    document.body.classList.add("developer-mode");
    if (testBanner) {
      testBanner.classList.remove("hidden");
      testBanner.classList.add("visible");
    }
    if (endpointSelector) endpointSelector.classList.remove("hidden");
    updateTestnetKeyVisibility(true);

    // Switch to testnet endpoint and its default chain
    const testnetChain = GroveEnv.defaultChain("testnet");
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: "testnet",
      [STORAGE_KEYS.CHAIN]: testnetChain,
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances
    });
    // Clear resolve cache — results from the previous environment are not valid
    await chrome.storage.local.remove("GROVE_RESOLVE_CACHE");
    await loadEndpoint();
    setTestModeBannerText("testnet");
    updateChainUI(testnetChain);
    updateTopUpLink(testnetChain);
    updateAppLinks();
    updateNetworkSelectorVisibility("testnet");

    // Switch to testnet JWT context
    const testnetJwt = await KeyManager.getJWT("testnet");
    await updateAuthState(testnetJwt);

    // Update slot UI to show testnet as active
    await loadJwtSlots();

    if (testnetJwt) {
      await fetchBalance();
      loadAndResolveEnsName();
      showToast("Switched to Testnet");
    } else {
      showToast("Developer Mode - Connect via testnet app");
    }
  } else {
    // Disable developer mode
    document.body.classList.remove("developer-mode");
    if (testBanner) {
      testBanner.classList.remove("visible");
      testBanner.classList.add("hidden");
    }
    if (endpointSelector) endpointSelector.classList.add("hidden");
    updateTestnetKeyVisibility(false);

    // Reset to production endpoint and its default chain
    const prodChain = GroveEnv.defaultChain("production");
    await chrome.storage.local.set({
      [STORAGE_KEYS.ENDPOINT]: "production",
      [STORAGE_KEYS.CHAIN]: prodChain,
      [STORAGE_KEYS.LAST_BALANCES]: {}, // Clear cached balances
    });
    // Clear resolve cache — results from the previous environment are not valid
    await chrome.storage.local.remove("GROVE_RESOLVE_CACHE");
    await loadEndpoint();
    setTestModeBannerText("production");
    updateChainUI(prodChain);
    updateTopUpLink(prodChain);
    updateAppLinks();
    updateNetworkSelectorVisibility("production");

    // Switch to production JWT context
    const prodJwt = await KeyManager.getJWT("production");
    await updateAuthState(prodJwt);

    // Update slot UI to show mainnet as active
    await loadJwtSlots();

    if (prodJwt) {
      await fetchBalance();
      loadAndResolveEnsName();
      showToast("Switched to Mainnet");
    } else {
      showToast("Developer Mode Disabled - Connect via grove.city");
    }
  }
}

/**
 * API Endpoint Selection
 */
async function loadEndpoint() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ENDPOINT,
    STORAGE_KEYS.ENVIRONMENT,
  ]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  const storedEndpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
  const isDev = env === "local";
  const endpoint = isDev ? storedEndpoint : "production";

  // Persist production endpoint when dev mode is off
  if (!isDev && storedEndpoint !== "production") {
    await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: "production" });
  }

  setTestModeBannerText(endpoint);
  updateNetworkSelectorVisibility(endpoint);

  // Update UI
  if (endpointDisplay) {
    endpointDisplay.textContent = endpoint;
  }

  // Check the correct radio button
  endpointOptions.forEach((option) => {
    option.checked = option.value === endpoint;
  });
}

async function handleEndpointChange(e) {
  const endpoint = e.target.value;
  await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: endpoint });

  const chainResult = await chrome.storage.local.get([STORAGE_KEYS.CHAIN]);
  const allowedChains = GroveEnv.allowedChains(endpoint);
  let chain =
    chainResult[STORAGE_KEYS.CHAIN] || getDefaultChainForEndpoint(endpoint);
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
  updateAppLinks();
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
    production: "Production (api.grove.city)",
    testnet: "Testnet (api.testnet.grove.city)",
    localhost: "Localhost:8000",
  };
  showToast(`Switched to ${endpointNames[endpoint] || endpoint}`);
}

/**
 * Chain Selection
 */
async function loadChain() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.CHAIN,
    STORAGE_KEYS.ENDPOINT,
  ]);
  const endpoint = result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT;
  const storedChain =
    result[STORAGE_KEYS.CHAIN] || getDefaultChainForEndpoint(endpoint);
  const allowedChains = GroveEnv.allowedChains(endpoint);
  const chain = allowedChains.includes(storedChain)
    ? storedChain
    : getDefaultChainForEndpoint(endpoint);

  if (storedChain !== chain) {
    await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
  }

  updateChainUI(chain);
  updateTopUpLink(chain);
  updateAppLinks();
}

function updateChainUI(chain) {
  // Chain selector UI removed — no-op
}

/**
 * Update network selector visibility based on endpoint
 * - Production: show mainnet options (Base, Solana)
 * - Testnet/local: show testnet options (Base Sepolia, Solana Devnet)
 */
function updateNetworkSelectorVisibility(endpoint) {
  // Chain selector UI removed — no-op
}

function updateTestnetKeyVisibility(devModeEnabled) {
  // Toggle visibility of dev-mode-only elements
  [testnetKeySlot, localhostKeySlot, clearAllKeysItem].forEach((el) => {
    el?.classList.toggle("hidden", !devModeEnabled);
  });

  // Hide JWT edit form if current slot is no longer visible
  if (
    !devModeEnabled &&
    (currentEditSlot === "testnet" || currentEditSlot === "localhost")
  ) {
    hideJwtEdit();
  }
}

function isTestEndpoint(endpoint) {
  return GroveEnv.isTestChains(endpoint);
}

function getDefaultChainForEndpoint(endpoint) {
  return GroveEnv.defaultChain(endpoint);
}

function getEndpointLabel(endpoint) {
  return GroveEnv.apiLabel(endpoint);
}

function setTestModeBannerText(endpoint) {
  const banner = document.getElementById("testModeBanner");
  if (!banner) return;
  const textNode = document.getElementById("testModeBannerText") || banner;
  const label = getEndpointLabel(endpoint);
  textNode.textContent = `Developer Mode (${label})`;
}

async function updateTopUpLink(chain) {
  if (!topUpBtn) return;

  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ENDPOINT,
    STORAGE_KEYS.ENVIRONMENT,
  ]);
  const envId = GroveEnv.resolveActiveEnvId(
    result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV,
    result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT,
  );
  topUpBtn.href = GroveEnv.topUpUrl(envId);
}

/**
 * Update all app-related links based on current endpoint
 * Should be called on init and when endpoint changes
 */
async function updateAppLinks() {
  const result = await chrome.storage.local.get([
    STORAGE_KEYS.ENDPOINT,
    STORAGE_KEYS.ENVIRONMENT,
  ]);
  const envId = GroveEnv.resolveActiveEnvId(
    result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV,
    result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT,
  );
  const appUrl = GroveEnv.get(envId).appUrl;

  // Update wallet sign-in button
  if (walletSignInBtn) {
    walletSignInBtn.href = appUrl + "/extension";
  }

  // Update leaderboard app link
  const leaderboardAppLink = document.getElementById("leaderboardAppLink");
  if (leaderboardAppLink) {
    leaderboardAppLink.href = appUrl + "/leaderboard";
  }
}

/**
 * Show a specific settings view (e.g., 'account', 'tipping').
 * Used for programmatic navigation to settings subpages.
 * @param {string} targetView - The view ID suffix (e.g., 'account' for 'settings-account')
 */
function showSettingsView(targetView) {
  const settingsViews = document.querySelectorAll(".settings-view");
  settingsViews.forEach((view) => view.classList.remove("active"));

  const targetElement = document.getElementById(`settings-${targetView}`);
  if (targetElement) {
    targetElement.classList.add("active");
  }

  if (targetView === "referral") {
    loadReferralData();
  }

  if (targetView === "username") {
    loadUsernameView();
  }
}

/**
 * Load the Username settings view — show claimed or claim UI
 */
async function loadUsernameView() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.HANDLE]);
  const handle = result[STORAGE_KEYS.HANDLE];

  if (handle) {
    usernameClaimed.classList.remove("hidden");
    usernameClaim.classList.add("hidden");
    usernameDisplayValue.textContent = handle;
  } else {
    usernameClaimed.classList.add("hidden");
    usernameClaim.classList.remove("hidden");
    usernameInput.value = "";
    usernameError.classList.add("hidden");
    usernameError.textContent = "";
  }
}

/**
 * Update the home screen username card visibility and page title
 */
async function updateUsernameCard(handle) {
  if (homeUsernameBtn) {
    if (handle) {
      homeUsernameBtn.classList.add("hidden");
    } else {
      homeUsernameBtn.classList.remove("hidden");
    }
  }

  // Update profile link visibility and href
  if (homeProfileLink) {
    if (handle) {
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.ENDPOINT,
        STORAGE_KEYS.ENVIRONMENT,
      ]);
      const envId = GroveEnv.resolveActiveEnvId(
        result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV,
        result[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT,
      );
      const appUrl = GroveEnv.get(envId).appUrl;
      homeProfileLink.href = `${appUrl}/${encodeURIComponent(handle)}`;
      homeProfileLink.classList.remove("hidden");
    } else {
      homeProfileLink.classList.add("hidden");
    }
  }

  // Update header settings button to show handle
  const headerHandleLabel = document.getElementById("headerHandleLabel");
  const headerSettingsIcon = document.getElementById("headerSettingsIcon");
  const headerHandleChevron = document.getElementById("headerHandleChevron");
  const headerSettingsBtn = document.getElementById("headerSettingsBtn");
  if (
    headerHandleLabel &&
    headerSettingsIcon &&
    headerHandleChevron &&
    headerSettingsBtn
  ) {
    if (handle) {
      headerHandleLabel.textContent = `@${handle}`;
      headerHandleLabel.classList.remove("hidden");
      headerHandleChevron.classList.remove("hidden");
      headerSettingsIcon.classList.add("hidden");
      headerSettingsBtn.classList.add("has-handle");
    } else {
      headerHandleLabel.classList.add("hidden");
      headerHandleChevron.classList.add("hidden");
      headerSettingsIcon.classList.remove("hidden");
      headerSettingsBtn.classList.remove("has-handle");
    }
  }
}

/**
 * Validate a handle string client-side
 * @param {string} handle
 * @returns {string|null} Error message, or null if valid
 */
function validateHandle(handle) {
  if (handle.length < 4 || handle.length > 15) {
    return "Must be 4–15 characters.";
  }
  if (!/^[a-z0-9_]+$/.test(handle)) {
    return "Only lowercase letters, numbers, and underscores.";
  }
  if (handle.startsWith("_") || handle.endsWith("_")) {
    return "Cannot start or end with an underscore.";
  }
  if (handle.includes("__")) {
    return "Cannot contain consecutive underscores.";
  }
  return null;
}

/**
 * Handle the "Claim" button click
 */
async function handleClaimUsername() {
  const handle = usernameInput.value.trim().toLowerCase();
  usernameError.classList.add("hidden");

  const validationError = validateHandle(handle);
  if (validationError) {
    usernameError.textContent = validationError;
    usernameError.classList.remove("hidden");
    return;
  }

  usernameClaimBtn.disabled = true;
  usernameClaimBtn.textContent = "Claiming...";

  try {
    const result = await claimHandleCore(handle);
    if (!result.success) {
      usernameError.textContent = result.error;
      usernameError.classList.remove("hidden");
      return;
    }
    showToast(`Claimed @${handle}`);
  } catch (error) {
    console.error("[Grove Extension] Claim username error:", error);
    usernameError.textContent = "Something went wrong. Try again.";
    usernameError.classList.remove("hidden");
  } finally {
    usernameClaimBtn.disabled = false;
    usernameClaimBtn.textContent = "Claim";
  }
}

/**
 * Handle the "Release username" button click
 */
async function handleReleaseUsername() {
  const releaseBtn = document.getElementById("usernameReleaseBtn");
  if (!releaseBtn) return;

  // Two-click confirmation
  if (!releaseBtn.classList.contains("confirming")) {
    releaseBtn.classList.add("confirming");
    releaseBtn.textContent = "Confirm release?";
    setTimeout(() => {
      if (releaseBtn.classList.contains("confirming")) {
        releaseBtn.classList.remove("confirming");
        releaseBtn.textContent = "Release username";
      }
    }, 3000);
    return;
  }

  releaseBtn.disabled = true;
  releaseBtn.textContent = "Releasing...";
  releaseBtn.classList.remove("confirming");

  try {
    const jwt = await getActiveJWT();
    if (!jwt) {
      showToast("Not signed in.");
      return;
    }

    const response = await GroveAPI.releaseHandle(jwt);

    if (!response.success) {
      showToast(response.error || "Failed to release username.");
      return;
    }

    await chrome.storage.local.remove(STORAGE_KEYS.HANDLE);
    await updateUsernameCard(null);
    loadUsernameView();
    showToast("Username released");
  } catch (error) {
    console.error("[Grove Extension] Release username error:", error);
    showToast("Something went wrong. Try again.");
  } finally {
    releaseBtn.disabled = false;
    releaseBtn.textContent = "Release username";
  }
}

/**
 * Setup Settings Drill-Down Navigation
 */
function setupSettingsDrillDown() {
  const menuItems = document.querySelectorAll(".settings-menu-item");
  const backBtns = document.querySelectorAll(".settings-back");
  const settingsViews = document.querySelectorAll(".settings-view");

  // Handle menu item clicks
  menuItems.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.drill;

      showSettingsView(targetView);
    });
  });

  // Handle back button clicks
  backBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetView = btn.dataset.back;

      // Hide all views
      settingsViews.forEach((view) => view.classList.remove("active"));

      // Show target view (main menu)
      const targetElement = document.getElementById(`settings-${targetView}`);
      if (targetElement) {
        targetElement.classList.add("active");
      }
    });
  });
}

/**
 * Leaderboard State
 */
let currentPeriod = "week";
let currentLeaderboardView = "live";
let livePollingInterval = null;
let seenTxHashes = new Set();

/**
 * History State
 */
let historyTransactions = [];
let historyFilter = "all";
let historyPeriod = "all";
let historyCurrentPage = 0;
let historyTotalCount = 0;
const HISTORY_PAGE_SIZE = 10;

/**
 * Setup Leaderboard
 */
function setupLeaderboardSwitcher() {
  leaderboardSwitcherBtns = document.querySelectorAll(".switcher-btn");
  leaderboardViews = document.querySelectorAll(".leaderboard-view");

  if (leaderboardSwitcherBtns) {
    leaderboardSwitcherBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view = e.target.dataset.view;
        currentLeaderboardView = view;

        leaderboardSwitcherBtns.forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");

        leaderboardViews.forEach((v) => v.classList.remove("active"));
        document.getElementById(`${view}-view`).classList.add("active");

        if (view === "live") {
          loadFeedItems("live");
          startLivePolling();
        } else if (view === "top") {
          loadFeedItems("tipped");
          stopLivePolling();
        }
      });
    });
  }
}

/**
 * Load Top Tippers
 */
async function loadTopTippers() {
  const empty = document.getElementById("tippers-empty");
  const list = document.getElementById("tippers-list");

  empty.classList.add("hidden");
  list.innerHTML = LeaderboardRenderer.renderSkeletonTable(false, 5);

  const result = await GroveAPI.getTopTippers(currentPeriod, 10);

  if (!result.success || result.data.entries.length === 0) {
    list.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  list.innerHTML = LeaderboardRenderer.renderTippersList(result.data.entries);
}

/**
 * Load Pool Stats (lifetime totals)
 */
async function loadPoolStats() {
  try {
    const [tipsRes, statsRes] = await Promise.all([
      GroveAPI.getTipsTotal(),
      GroveAPI.getLeaderboardStats("all"),
    ]);

    if (!tipsRes.success) {
      console.error("[Grove Extension] Failed to load pool stats");
      return;
    }

    const totalTipped = tipsRes.data.totalUSD;
    const tipCount = tipsRes.data.totalTipCount;

    // Live on Grove banner
    const paidOutEl = document.getElementById("stat-paid-out");
    if (paidOutEl) paidOutEl.textContent = FormatUtils.formatPoolUSD(totalTipped);

    const tipsSentEl = document.getElementById("stat-tips-sent");
    if (tipsSentEl) tipsSentEl.textContent = tipCount.toLocaleString();

    if (statsRes.success) {
      const creatorsEl = document.getElementById("stat-creators");
      if (creatorsEl)
        creatorsEl.textContent = FormatUtils.formatStatCount(statsRes.data.recipients);
    }
  } catch (error) {
    console.error("[Grove Extension] Pool stats error:", error);
  }
}

/**
 * Load Live Tips
 */
/**
 * Load Front Page feed items (Live or Top sort)
 * @param {string} sort - 'live' | 'tipped'
 * @param {boolean} isRefresh - Whether this is a background refresh
 */
async function loadFeedItems(sort = "live", isRefresh = false) {
  const viewId = sort === "live" ? "live" : "top";
  const empty = document.getElementById(`${viewId}-empty`);
  const list = document.getElementById(`${viewId}-list`);
  if (!list || !empty) return;

  if (!isRefresh) {
    empty.classList.add("hidden");
    list.innerHTML = LeaderboardRenderer.renderFeedSkeleton(5);
  }

  try {
    const url = `https://api.grove.city/v1/feed/items?sort=${sort}&window=7d&limit=20&enrich=true`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Feed API ${resp.status}`);
    const data = await resp.json();
    const items = sort === "live"
      ? (data.items || []).filter(i => i.tip_count > 0)
      : (data.items || []);

    if (!items.length) {
      if (!isRefresh) { list.innerHTML = ""; empty.classList.remove("hidden"); }
      return;
    }

    const storageResult = await chrome.storage.local.get([STORAGE_KEYS.ENDPOINT, STORAGE_KEYS.ENVIRONMENT]);
    const envId = GroveEnv.resolveActiveEnvId(
      storageResult[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV,
      storageResult[STORAGE_KEYS.ENDPOINT] || DEFAULT_ENDPOINT,
    );
    const appUrl = GroveEnv.get(envId)?.appUrl || "https://grove.city";

    list.innerHTML = LeaderboardRenderer.renderFeedList(items, appUrl);
  } catch (err) {
    console.error("[Grove] loadFeedItems error:", err);
    if (!isRefresh) { list.innerHTML = ""; empty.classList.remove("hidden"); }
  }
}

/**
 * Start Live Polling
 */
function startLivePolling() {
  stopLivePolling();
  livePollingInterval = setInterval(() => {
    if (currentLeaderboardView === "live") {
      loadFeedItems("live", true);
    }
  }, 30000); // Poll every 30 seconds (matches app's Front Page interval)
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
  if (currentLeaderboardView === "top") {
    loadFeedItems("tipped");
  } else {
    loadFeedItems("live");
  }
}

/**
 * Load leaderboard stats
 */
async function loadLeaderboardStats() {
  const depositsEl = document.getElementById("stat-deposits");
  const tipsEl = document.getElementById("stat-tips");
  const tippersEl = document.getElementById("stat-tippers");
  const recipientsEl = document.getElementById("stat-recipients");

  // Show loading state
  [depositsEl, tipsEl, tippersEl, recipientsEl].forEach((el) => {
    if (el) {
      el.classList.add("loading");
      el.textContent = "...";
    }
  });

  try {
    const result = await GroveAPI.getLeaderboardStats(currentPeriod);

    if (result.success) {
      if (depositsEl) {
        depositsEl.textContent = FormatUtils.formatStatUSD(
          result.data.deposits,
        );
        depositsEl.classList.remove("loading");
      }
      if (tipsEl) {
        tipsEl.textContent = FormatUtils.formatStatUSD(result.data.tips);
        tipsEl.classList.remove("loading");
      }
      if (tippersEl) {
        tippersEl.textContent = FormatUtils.formatStatCount(
          result.data.tippers,
        );
        tippersEl.classList.remove("loading");
      }
      if (recipientsEl) {
        recipientsEl.textContent = FormatUtils.formatStatCount(
          result.data.recipients,
        );
        recipientsEl.classList.remove("loading");
      }
    }
  } catch (error) {
    console.error("[Grove Extension] Failed to load leaderboard stats:", error);
  }
}

/**
 * Setup History Tab
 */
function setupHistoryTab() {
  const filterBtns = document.querySelectorAll(".history-filter .filter-btn");
  const periodBtns = document.querySelectorAll(
    ".history-period-filter .period-btn",
  );
  const prevBtn = document.getElementById("history-prev-btn");
  const nextBtn = document.getElementById("history-next-btn");
  const retryBtn = document.getElementById("history-retry-btn");

  // Filter buttons (All/Tips/Deposits)
  filterBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const filter = e.target.dataset.filter;
      historyFilter = filter;
      historyCurrentPage = 0;

      filterBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      renderHistoryList();
    });
  });

  // Period filter buttons (24h/7d/30d/All)
  periodBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const period = e.target.dataset.period;
      historyPeriod = period;
      historyCurrentPage = 0;

      periodBtns.forEach((b) => b.classList.remove("active"));
      e.target.classList.add("active");

      renderHistoryList();
    });
  });

  // Pagination
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (historyCurrentPage > 0) {
        historyCurrentPage--;
        renderHistoryList();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
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
    retryBtn.addEventListener("click", () => {
      loadHistory();
    });
  }
}

/**
 * Load Transaction History
 */
async function loadHistory() {
  const loading = document.getElementById("history-loading");
  const error = document.getElementById("history-error");
  const empty = document.getElementById("history-empty");
  const notConnected = document.getElementById("history-not-connected");
  const list = document.getElementById("history-list");
  const pagination = document.getElementById("history-pagination");

  // Reset states
  loading.classList.remove("hidden");
  error.classList.add("hidden");
  empty.classList.add("hidden");
  notConnected.classList.add("hidden");
  list.innerHTML = "";
  pagination.classList.add("hidden");

  // Check if connected
  const jwt = await getActiveJWT();

  if (!jwt) {
    loading.classList.add("hidden");
    notConnected.classList.remove("hidden");
    return;
  }

  try {
    // Fetch both tip and fund history in parallel
    const [tipResult, fundResult] = await Promise.allSettled([
      GroveAPI.getTipHistory(jwt, 100, 0),
      GroveAPI.getFundHistory(jwt, 100, 0),
    ]);

    loading.classList.add("hidden");

    // Process results
    const tips =
      tipResult.status === "fulfilled" && tipResult.value.success
        ? tipResult.value.data.entries
        : [];
    const funds =
      fundResult.status === "fulfilled" && fundResult.value.success
        ? fundResult.value.data.entries
        : [];

    // Check if both failed
    if (
      tips.length === 0 &&
      funds.length === 0 &&
      tipResult.status === "rejected" &&
      fundResult.status === "rejected"
    ) {
      error.classList.remove("hidden");
      document.getElementById("history-error-message").textContent =
        "Unable to load transactions";
      return;
    }

    // Transform and combine transactions
    const tipTransactions = tips.map((tip) => ({
      id: `tip-${tip.id}`,
      type: tip.direction === "sent" ? "tip_sent" : "tip_received",
      amount_usd: tip.amount_usd,
      token_symbol: tip.token_symbol,
      network: tip.network,
      status: tip.status,
      created_at: tip.created_at,
      tx_hash: tip.tx_hash,
      counterparty_address: tip.counterparty_address,
      destination: tip.destination,
      social_graph: tip.tip_social_graph,
      context: tip.context,
    }));

    const fundTransactions = funds.map((fund) => ({
      id: `fund-${fund.id}`,
      type: "deposit",
      amount_usd: fund.amount_usd,
      token_symbol: fund.token_symbol,
      network: fund.network,
      status: fund.status,
      created_at: fund.created_at,
      tx_hash: fund.tx_hash,
    }));

    // Combine and sort by date (newest first)
    historyTransactions = [...tipTransactions, ...fundTransactions].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );

    historyTotalCount = historyTransactions.length;
    historyCurrentPage = 0;

    renderHistoryList();
  } catch (err) {
    console.error("[Grove Extension] History load failed:", err);
    loading.classList.add("hidden");
    error.classList.remove("hidden");
  }
}

/**
 * Get filtered transactions based on current filter and period
 */
function getFilteredTransactions() {
  const now = new Date();

  return historyTransactions.filter((tx) => {
    // Type filter (All/Tipped/Earned/Deposits)
    if (historyFilter === "tipped" && tx.type !== "tip_sent") return false;
    if (historyFilter === "earned" && tx.type !== "tip_received") return false;
    if (historyFilter === "deposits" && tx.type !== "deposit") return false;

    // Period filter (24h/7d/30d/All)
    if (historyPeriod !== "all") {
      const txDate = new Date(tx.created_at);
      const diffMs = now - txDate;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (historyPeriod === "24h" && diffDays > 1) return false;
      if (historyPeriod === "7d" && diffDays > 7) return false;
      if (historyPeriod === "30d" && diffDays > 30) return false;
    }

    return true;
  });
}

/**
 * Render History List
 */
function renderHistoryList() {
  const empty = document.getElementById("history-empty");
  const emptyMessage = document.getElementById("history-empty-message");
  const list = document.getElementById("history-list");
  const pagination = document.getElementById("history-pagination");
  const pageInfo = document.getElementById("history-page-info");
  const prevBtn = document.getElementById("history-prev-btn");
  const nextBtn = document.getElementById("history-next-btn");
  const statsContainer = document.getElementById("history-stats");

  const filtered = getFilteredTransactions();

  // Calculate and render stats summary
  if (statsContainer && filtered.length > 0) {
    const summary = HistoryRenderer.calculateSummary(filtered);
    statsContainer.innerHTML = HistoryRenderer.renderStatsSummary(summary);
    statsContainer.classList.remove("hidden");
  } else if (statsContainer) {
    statsContainer.classList.add("hidden");
  }

  if (filtered.length === 0) {
    empty.classList.remove("hidden");
    list.innerHTML = "";
    pagination.classList.add("hidden");

    // Contextual empty message
    if (historyFilter === "tipped") {
      emptyMessage.textContent = "No tips sent yet";
    } else if (historyFilter === "earned") {
      emptyMessage.textContent = "No tips earned yet";
    } else if (historyFilter === "deposits") {
      emptyMessage.textContent = "No deposits yet";
    } else if (historyPeriod !== "all") {
      const periodLabels = {
        "24h": "24 hours",
        "7d": "7 days",
        "30d": "30 days",
      };
      emptyMessage.textContent = `No transactions in the last ${periodLabels[historyPeriod] || historyPeriod}`;
    } else {
      emptyMessage.textContent = "No transactions yet";
    }
    return;
  }

  empty.classList.add("hidden");

  // Paginate
  const totalPages = Math.ceil(filtered.length / HISTORY_PAGE_SIZE);
  const start = historyCurrentPage * HISTORY_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + HISTORY_PAGE_SIZE);

  // Render items using HistoryRenderer
  list.innerHTML = HistoryRenderer.renderHistoryList(pageItems);

  // Update pagination
  if (totalPages > 1) {
    pagination.classList.remove("hidden");
    pageInfo.textContent = `${historyCurrentPage + 1} of ${totalPages}`;
    prevBtn.disabled = historyCurrentPage === 0;
    nextBtn.disabled = historyCurrentPage >= totalPages - 1;
  } else {
    pagination.classList.add("hidden");
  }
}

// parseDestination is loaded from src/parsers/destination.js
// Format utilities are loaded from src/utils/formatUtils.js
// Leaderboard renderer is loaded from src/ui/leaderboardRenderer.js
// History renderer is loaded from src/ui/historyRenderer.js

/**
 * Tip Button Intro Modal
 * Shows "You're all set!" when user first connects their account
 */

async function hideTipIntroModal() {
  if (tipButtonIntroModal) {
    tipButtonIntroModal.classList.add("hidden");
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.TIP_INTRO_SEEN]: true });
}

/**
 * Increment launch count on each popup open
 */
async function incrementLaunchCount() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.LAUNCH_COUNT]);
  const currentCount = result[STORAGE_KEYS.LAUNCH_COUNT] || 0;
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAUNCH_COUNT]: currentCount + 1,
  });
}


// Toast notification: uses shared showToast from src/ui/toast.js
// Loaded via popup.html script tag before popup.js

/**
 * Toggle Password Visibility
 */
function togglePasswordVisibility() {
  const isPassword = jwtInput.type === "password";
  jwtInput.type = isPassword ? "text" : "password";

  // Toggle eye icon
  const eyeOpenPaths = toggleJwtVisibility.querySelectorAll(".eye-open");
  const eyeClosedPaths = toggleJwtVisibility.querySelectorAll(".eye-closed");

  eyeOpenPaths.forEach((path) => {
    if (isPassword) {
      path.classList.add("hidden");
    } else {
      path.classList.remove("hidden");
    }
  });

  eyeClosedPaths.forEach((path) => {
    if (isPassword) {
      path.classList.remove("hidden");
    } else {
      path.classList.add("hidden");
    }
  });
}

/**
 * Update the Account section in Settings
 * Shows for all logged-in users:
 * - CDP users: email/phone + tipping wallet
 * - Web3 users: connected wallet + tipping wallet
 */
async function updateAccountInfoDisplay() {
  // Check if there's an active JWT to show/hide disconnect button
  const activeJwt = await getActiveJWT();
  if (accountDisconnectBtn) {
    if (activeJwt) {
      accountDisconnectBtn.classList.remove("hidden");
    } else {
      accountDisconnectBtn.classList.add("hidden");
    }
  }

  // Account info section hidden — not useful to end users
  accountInfoSection.classList.add("hidden");
}

/**
 * Load referral data from the referrals API
 */
async function loadReferralData() {
  const referralLinkInput = document.getElementById("referralLinkInput");
  const referralCount = document.getElementById("referralCount");
  const referralEarnings = document.getElementById("referralEarnings");
  const referralCommission = document.getElementById("referralCommission");
  const referralRefereesList = document.getElementById("referralRefereesList");
  const referralRefereesEmpty = document.getElementById(
    "referralRefereesEmpty",
  );

  if (!referralLinkInput || !referralCount) return;

  referralLinkInput.value = "";
  referralLinkInput.placeholder = "Loading...";
  referralCount.textContent = "—";
  if (referralEarnings) referralEarnings.textContent = "—";

  try {
    const jwt = await getActiveJWT();
    if (!jwt) {
      referralLinkInput.placeholder = "Sign in to get your referral link";
      if (referralRefereesEmpty)
        referralRefereesEmpty.textContent = "Sign in to see your referrals.";
      return;
    }

    // Try the dedicated referrals endpoint first, fall back to account endpoint
    let referralCode, totalReferees, totalEarnings, referees;

    const referralsResponse = await GroveAPI.getReferrals(jwt);
    if (referralsResponse.success && referralsResponse.data) {
      referralCode = referralsResponse.data.referral_code;
      totalReferees = referralsResponse.data.stats?.total_referees ?? 0;
      totalEarnings =
        referralsResponse.data.stats?.total_referee_earnings_usd || "0";
      referees = referralsResponse.data.referees || [];
    } else {
      // Fallback: getAccount has referral_code and referral_count
      const accountResponse = await GroveAPI.getAccount(jwt);
      if (!accountResponse.success || !accountResponse.data) {
        referralLinkInput.placeholder = "Failed to load referral link";
        return;
      }
      referralCode = accountResponse.data.referral_code;
      totalReferees = accountResponse.data.referral_count ?? 0;
      totalEarnings = null;
      referees = null;
    }

    // Referral link
    if (referralCode) {
      referralLinkInput.value = `https://grove.city/?ref=${encodeURIComponent(referralCode)}`;
    } else {
      referralLinkInput.placeholder = "No referral code available";
    }

    // Stats
    referralCount.textContent = totalReferees;
    if (referralEarnings) {
      if (totalEarnings !== null) {
        const earnings = parseFloat(totalEarnings);
        referralEarnings.textContent = `$${isNaN(earnings) ? "0.00" : earnings.toFixed(2)}`;
      } else {
        referralEarnings.textContent = "$0.00";
      }
    }

    // Referees list
    if (referralRefereesList && referees) {
      renderRefereesList(referees, referralRefereesList, referralRefereesEmpty);
    }

    // Fetch referral commission earnings
    if (referralCommission) {
      try {
        const earningsRes = await GroveAPI.getReferralEarnings(jwt);
        if (earningsRes.success && earningsRes.data) {
          const commission = parseFloat(earningsRes.data.total_usd || "0");
          referralCommission.textContent = `$${isNaN(commission) ? "0.00" : commission.toFixed(2)}`;
        } else {
          referralCommission.textContent = "$0.00";
        }
      } catch (earningsError) {
        console.log(
          "[Referrals] Failed to load commission earnings:",
          earningsError.message,
        );
        referralCommission.textContent = "$0.00";
      }
    }
  } catch (error) {
    console.log("[Referrals] Failed to load referral data:", error.message);
    referralLinkInput.placeholder = "Failed to load referral link";
  }
}

/**
 * Render the list of referred friends
 */
function renderRefereesList(referees, listEl, emptyEl) {
  // Clear existing referee rows (keep the empty message element)
  listEl.querySelectorAll(".referral-referee-row").forEach((el) => el.remove());

  if (!referees.length) {
    if (emptyEl) emptyEl.classList.remove("hidden");
    return;
  }

  if (emptyEl) emptyEl.classList.add("hidden");

  referees.forEach((referee) => {
    const row = document.createElement("div");
    row.className = "referral-referee-row";

    const nameEl = document.createElement("div");
    nameEl.className = "referral-referee-name";
    nameEl.textContent = referee.display_name || "Unknown";
    if (referee.display_type === "wallet") {
      nameEl.classList.add("monospace");
    }

    const infoEl = document.createElement("div");
    infoEl.className = "referral-referee-info";

    const earnings = parseFloat(referee.earnings_usd || "0");
    const earningsEl = document.createElement("span");
    earningsEl.className = "referral-referee-earnings";
    earningsEl.textContent = `$${isNaN(earnings) ? "0.00" : earnings.toFixed(2)}`;

    const tipCount = referee.tip_count ?? 0;
    const tipsEl = document.createElement("span");
    tipsEl.className = "referral-referee-tips";
    tipsEl.textContent = `${tipCount} tip${tipCount !== 1 ? "s" : ""}`;

    infoEl.appendChild(earningsEl);
    infoEl.appendChild(tipsEl);

    row.appendChild(nameEl);
    row.appendChild(infoEl);
    listEl.appendChild(row);
  });
}

/**
 * Setup referral copy button handler
 */
function setupReferralCopyButton() {
  const referralCopyBtn = document.getElementById("referralCopyBtn");
  const referralLinkInput = document.getElementById("referralLinkInput");

  if (!referralCopyBtn || !referralLinkInput) return;

  referralCopyBtn.addEventListener("click", async () => {
    const link = referralLinkInput.value;
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Fallback for environments where clipboard API is unavailable
      referralLinkInput.select();
      document.execCommand("copy");
    }

    referralCopyBtn.textContent = "Copied!";
    referralCopyBtn.classList.add("copied");
    setTimeout(() => {
      referralCopyBtn.textContent = "Copy";
      referralCopyBtn.classList.remove("copied");
    }, 2000);
  });
}

async function refreshUIState() {
  // Re-check JWT status and update UI
  await loadJWT();
  // Also fetch updated balance
  await fetchBalance();
  // Update account info display
  await updateAccountInfoDisplay();
}

// Init
document.addEventListener("DOMContentLoaded", init);
