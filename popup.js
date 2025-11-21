/**
 * Grove Extension Popup
 * Handles navigation, settings, and interactions
 */

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const pages = document.querySelectorAll('.page');

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

// Settings
const devModeToggle = document.getElementById('devModeCheckbox');
const envStatusRow = document.getElementById('envStatusRow');
const envStatus = document.getElementById('envStatus');

// JWT Management
const jwtStatusDisplay = document.getElementById('jwtStatusDisplay');
const manageJwtBtn = document.getElementById('manageJwtBtn');
const jwtEditContainer = document.getElementById('jwtEditContainer');
const jwtInput = document.getElementById('jwtInput');
const saveJwtBtn = document.getElementById('saveJwtBtn');
const cancelJwtBtn = document.getElementById('cancelJwtBtn');
const removeJwtBtn = document.getElementById('removeJwtBtn');

// Storage Keys
const STORAGE_KEYS = {
  JWT: 'GROVE_API_JWT',
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
};

// Defaults
const DEFAULT_TIP_AMOUNT = 0.10;
const DEFAULT_CHAIN = 'base';
const DEFAULT_ENV = 'prod';

const CHAIN_CONFIG = {
  'base': { name: 'Base', type: 'Mainnet' },
  'base-sepolia': { name: 'Base Sepolia', type: 'Testnet' },
  'solana': { name: 'Solana', type: 'Mainnet' },
  'solana-devnet': { name: 'Solana Devnet', type: 'Testnet' }
};

/**
 * Initialize Popup
 */
async function init() {
  await loadJWT();
  await loadTipAmount();
  await loadEnvironment();
  await loadChain();
  setupEventListeners();
}

/**
 * Setup Listeners
 */
function setupEventListeners() {
  // Navigation
  navItems.forEach(item => {
    item.addEventListener('click', handleNavigation);
  });

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

  saveJwtBtn.addEventListener('click', saveJwt);
  cancelJwtBtn.addEventListener('click', hideJwtEdit);
  removeJwtBtn.addEventListener('click', removeJwt);

  // Dev Mode
  if (devModeToggle) {
    devModeToggle.addEventListener('change', handleDevModeToggle);
  } else {
    console.error('Developer mode toggle not found');
  }

  // Quick Actions (Placeholders)
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Coming Soon'));
  });
}

/**
 * Navigation Handler
 */
function handleNavigation(e) {
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
    
    // Settings Display
    const first = jwt.substring(0, 6);
    const last = jwt.substring(jwt.length - 4);
    jwtStatusDisplay.textContent = `${first}...${last}`;
    jwtStatusDisplay.style.color = 'var(--color-primary)';
    jwtStatusDisplay.style.fontFamily = 'monospace';
    
    removeJwtBtn.classList.remove('hidden');
    jwtInput.value = ''; // Clear input for security
    } else {
    // Not Connected
    onboardingState.classList.remove('hidden');
    connectedState.classList.add('hidden');
    
    jwtStatusDisplay.textContent = 'Not connected';
    jwtStatusDisplay.style.color = 'var(--color-text-secondary)';
    jwtStatusDisplay.style.fontFamily = 'inherit';
    
    removeJwtBtn.classList.add('hidden');
  }
}

async function showJwtEdit() {
  jwtEditContainer.classList.remove('hidden');
  jwtInput.focus();
  manageJwtBtn.textContent = 'Close';

  // Check if JWT exists to show/hide remove button
  const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
  const jwt = result[STORAGE_KEYS.JWT];
  if (jwt && jwt.length > 0) {
    removeJwtBtn.classList.remove('hidden');
  } else {
    removeJwtBtn.classList.add('hidden');
  }
}

function hideJwtEdit() {
  jwtEditContainer.classList.add('hidden');
  manageJwtBtn.textContent = 'Manage';
  }

async function saveJwt() {
  const token = jwtInput.value.trim();
  if (token) {
    await chrome.storage.local.set({ [STORAGE_KEYS.JWT]: token });
    updateAuthState(token);
    hideJwtEdit();
    showToast('Account connected');
    
    // Go back to home if we were onboarding
    if (!onboardingState.classList.contains('hidden')) {
      document.querySelector('[data-target="tab-home"]').click();
  }
  } else {
    showToast('Please enter a token');
  }
}

async function removeJwt() {
  if (confirm('Are you sure you want to disconnect?')) {
    await chrome.storage.local.remove(STORAGE_KEYS.JWT);
    updateAuthState(null);
    hideJwtEdit();
    showToast('Account disconnected');
    document.querySelector('[data-target="tab-home"]').click();
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
async function fetchBalance() {
  // Placeholder for balance fetching from grove.city API
  // This would be fetched using the JWT token
  balanceAmount.style.opacity = '0.5';
  try {
    // TODO: Fetch balance from grove.city API using JWT
    balanceAmount.textContent = '0.00';
  } catch (e) {
    console.error('Balance fetch failed', e);
    balanceAmount.textContent = '0.00';
  } finally {
    balanceAmount.style.opacity = '1';
  }
}

/**
 * Environment
 */
async function loadEnvironment() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  const testBadge = document.getElementById('testModeBadge');

  if (env === 'local') {
    if (devModeToggle) devModeToggle.checked = true;
    document.body.classList.add('developer-mode');
    if (envStatusRow) envStatusRow.classList.remove('hidden');
    if (envStatus) envStatus.textContent = 'Test Environment';
    if (testBadge) testBadge.classList.remove('hidden');
  } else {
    if (devModeToggle) devModeToggle.checked = false;
    document.body.classList.remove('developer-mode');
    if (envStatusRow) envStatusRow.classList.add('hidden');
    if (testBadge) testBadge.classList.add('hidden');
  }
}

async function handleDevModeToggle(e) {
  const isDev = e.target.checked;
  const newEnv = isDev ? 'local' : 'prod';
  const testBadge = document.getElementById('testModeBadge');

  await chrome.storage.local.set({ [STORAGE_KEYS.ENVIRONMENT]: newEnv });

  if (isDev) {
    // Enable developer mode
    document.body.classList.add('developer-mode');
    envStatusRow.classList.remove('hidden');
    envStatus.textContent = 'Test Environment';
    if (testBadge) testBadge.classList.remove('hidden');
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
    envStatusRow.classList.add('hidden');
    if (testBadge) testBadge.classList.add('hidden');
    showToast('Developer Mode Disabled');

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
 * Chain Selection
 */
async function loadChain() {
    const result = await chrome.storage.local.get([STORAGE_KEYS.CHAIN]);
    const chain = result[STORAGE_KEYS.CHAIN] || DEFAULT_CHAIN;
    updateChainUI(chain);
}

function updateChainUI(chain) {
  const config = CHAIN_CONFIG[chain] || CHAIN_CONFIG['base'];
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
  chainDropdown.classList.add('hidden');
  showToast(`Switched to ${CHAIN_CONFIG[chain].name}`);

  // Reload balance
  fetchBalance();
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

// Init
document.addEventListener('DOMContentLoaded', init);
