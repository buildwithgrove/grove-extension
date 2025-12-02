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

// Tip amount
const tipAmountDisplay = document.getElementById('tipAmountDisplay');
const tipAmountEdit = document.getElementById('tipAmountEdit');
const tipAmountInput = document.getElementById('tipAmountInput');
const saveTipAmount = document.getElementById('saveTipAmount');
const cancelTipAmount = document.getElementById('cancelTipAmount');
const editTipBtn = document.getElementById('editTipAmount');

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

// Initialize Previous Keys UI
let prevKeysUI = null;

// Storage Keys
const STORAGE_KEYS = {
  JWT: 'GROVE_API_JWT',
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
  ENDPOINT: 'groveEndpoint',
  LAST_BALANCES: 'GROVE_LAST_BALANCES',
};

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
  await loadEnvironment();
  await loadChain();
  await loadEndpoint();
  await prevKeysUI.updateCount();
  setupEventListeners();

  // Fetch balance after everything is loaded
  await fetchBalance();
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

  // Tip Amount
  editTipBtn.addEventListener('click', showTipEdit);
  cancelTipAmount.addEventListener('click', hideTipEdit);
  saveTipAmount.addEventListener('click', saveTip);


  // JWT
  setupTokenBtn.addEventListener('click', () => {
    // Navigate to settings and open edit
    document.querySelector('[data-target="tab-settings"]').click();
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

  // Quick Actions (Placeholders)
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Coming Soon'));
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

  // Remove current JWT
  await chrome.storage.local.remove(STORAGE_KEYS.JWT);
  updateAuthState(null);
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
  // Update the amount value span inside the display div
  const amountSpan = tipAmountDisplay.querySelector('.amount-value');
  if (amountSpan) {
    amountSpan.textContent = formatted;
  }
  tipAmountInput.value = formatted;
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
 * Environment
 */
async function loadEnvironment() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  const testBanner = document.getElementById('testModeBanner');

  if (env === 'local') {
    if (devModeToggle) devModeToggle.checked = true;
    document.body.classList.add('developer-mode');
    if (testBanner) testBanner.classList.remove('hidden');
    if (endpointSelector) endpointSelector.classList.remove('hidden');
  } else {
    if (devModeToggle) devModeToggle.checked = false;
    document.body.classList.remove('developer-mode');
    if (testBanner) testBanner.classList.add('hidden');
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
    if (testBanner) testBanner.classList.remove('hidden');
    if (endpointSelector) endpointSelector.classList.remove('hidden');
    showToast('Developer Mode Enabled');

    // Check if current chain is a mainnet and switch to testnet
    const currentChain = chainName.textContent;
    if (currentChain === 'Base') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'base-sepolia' } } });
    } else if (currentChain === 'Solana') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'solana-devnet' } } });
    }
  } else {
    // Disable developer mode
    document.body.classList.remove('developer-mode');
    if (testBanner) testBanner.classList.add('hidden');
    if (endpointSelector) endpointSelector.classList.add('hidden');
    showToast('Developer Mode Disabled');

    // Reset to production endpoint
    await chrome.storage.local.set({ [STORAGE_KEYS.ENDPOINT]: 'production' });
    await loadEndpoint();

    // Check if current chain is a testnet and switch to mainnet
    const currentChain = chainName.textContent;
    if (currentChain === 'Base Sepolia') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'base' } } });
    } else if (currentChain === 'Solana Devnet') {
      await handleChainSelection({ currentTarget: { dataset: { chain: 'solana' } } });
    }
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
    'testnet': 'Testnet (testnet.api.grove.city)',
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

async function handleChainSelection(e) {
  const chain = e.currentTarget.dataset.chain;
  await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
  updateChainUI(chain);
  updateTopUpLink(chain);
  chainDropdown.classList.add('hidden');
  showToast(`Switched to ${NETWORKS[chain].name}`);

  // Reload balance
  fetchBalance();
}

function updateTopUpLink(chain) {
  if (!topUpBtn) return;
  const config = NETWORKS[chain] || NETWORKS[DEFAULT_CHAIN];
  const isTestnet = (config.type || '').toLowerCase() === 'testnet';
  topUpBtn.href = isTestnet ? TOP_UP_URLS.testnet : TOP_UP_URLS.mainnet;
}

/**
 * Setup Leaderboard Switcher
 */
function setupLeaderboardSwitcher() {
  leaderboardSwitcherBtns = document.querySelectorAll('.switcher-btn');
  leaderboardViews = document.querySelectorAll('.leaderboard-view');

  if (leaderboardSwitcherBtns) {
    leaderboardSwitcherBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = e.target.dataset.view;

        // Update active button
        leaderboardSwitcherBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        // Update active view
        leaderboardViews.forEach(v => v.classList.remove('active'));
        if (view === 'tippers') {
          document.getElementById('tippers-view').classList.add('active');
        } else {
          document.getElementById('tippees-view').classList.add('active');
        }
      });
    });
  }
}

/**
 * Toast Notification
 */
function showToast(msg) {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.bottom = '80px';
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%)';
  div.style.background = '#333';
  div.style.color = 'white';
  div.style.padding = '8px 16px';
  div.style.borderRadius = '20px';
  div.style.fontSize = '12px';
  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  div.style.zIndex = '2000';
  div.style.opacity = '0';
  div.style.transition = 'opacity 0.3s';
  div.style.whiteSpace = 'nowrap';
  div.textContent = msg;
  
  document.body.appendChild(div);
  
  requestAnimationFrame(() => {
    div.style.opacity = '1';
  });
  
  setTimeout(() => {
    div.style.opacity = '0';
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
