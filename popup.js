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

// Tip amount
const tipAmountDisplay = document.getElementById('tipAmountDisplay');
const tipAmountEdit = document.getElementById('tipAmountEdit');
const tipAmountInput = document.getElementById('tipAmountInput');
const saveTipAmount = document.getElementById('saveTipAmount');
const cancelTipAmount = document.getElementById('cancelTipAmount');
const editTipBtn = document.getElementById('editTipAmount');

// Settings
const devModeToggle = document.getElementById('devModeCheckbox');
const envStatusRow = document.getElementById('envStatusRow');
const envStatus = document.getElementById('envStatus');

// Balance
const balanceAmount = document.querySelector('.balance-amount');
const walletAddress = document.querySelector('.wallet-address');
const copyAddressBtn = document.querySelector('.copy-address-btn');

// Storage Keys
const STORAGE_KEYS = {
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
  WALLET_ADDRESS: 'groveWalletAddress'
};

// Defaults
const DEFAULT_TIP_AMOUNT = 0.10;
const DEFAULT_CHAIN = 'base';
const DEFAULT_ENV = 'prod';

const CHAIN_CONFIG = {
  'base': { name: 'Base', type: 'Mainnet' },
  'base-sepolia': { name: 'Base Sepolia', type: 'Testnet' }
};

/**
 * Initialize Popup
 */
async function init() {
  await loadTipAmount();
  await loadEnvironment();
  await loadChain();
  await loadBalance(); // Placeholder or actual load if address exists
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

  // Dev Mode
  devModeToggle.addEventListener('change', handleDevModeToggle);

  // Quick Actions (Placeholders)
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => showToast('Coming Soon'));
  });

  // Copy Address
  copyAddressBtn.addEventListener('click', () => {
    const address = walletAddress.textContent;
    if (address && address !== '0x...') {
      navigator.clipboard.writeText(address);
      showToast('Address copied');
    } else {
      showToast('No address to copy');
    }
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
 * Load Tip Amount
 */
async function loadTipAmount() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.TIP_AMOUNT]);
  const amount = result[STORAGE_KEYS.TIP_AMOUNT] || DEFAULT_TIP_AMOUNT;
  updateTipUI(amount);
}

function updateTipUI(amount) {
  const formatted = `$${parseFloat(amount).toFixed(2)}`;
  tipAmountDisplay.textContent = formatted;
  tipAmountInput.value = parseFloat(amount).toFixed(2);
}

function showTipEdit() {
  tipAmountDisplay.classList.add('hidden');
  tipAmountEdit.classList.remove('hidden');
  editTipBtn.classList.add('hidden');
}

function hideTipEdit() {
  tipAmountDisplay.classList.remove('hidden');
  tipAmountEdit.classList.add('hidden');
  editTipBtn.classList.remove('hidden');
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
 * Environment
 */
async function loadEnvironment() {
  const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
  const env = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENV;
  
  if (env === 'local') {
    devModeToggle.checked = true;
    envStatusRow.classList.remove('hidden');
    envStatus.textContent = 'Localhost';
  } else {
    devModeToggle.checked = false;
    envStatusRow.classList.add('hidden');
  }
}

async function handleDevModeToggle(e) {
  const isLocal = e.target.checked;
  const newEnv = isLocal ? 'local' : 'prod';
  
  await chrome.storage.local.set({ [STORAGE_KEYS.ENVIRONMENT]: newEnv });
  
  if (isLocal) {
    envStatusRow.classList.remove('hidden');
    envStatus.textContent = 'Localhost';
    showToast('Switched to Localhost');
  } else {
    envStatusRow.classList.add('hidden');
    showToast('Switched to Production');
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
  
  // Logic to update checkmarks in dropdown could go here
  // For now we just update the header
}

async function handleChainSelection(e) {
  const chain = e.currentTarget.dataset.chain;
  await chrome.storage.local.set({ [STORAGE_KEYS.CHAIN]: chain });
  updateChainUI(chain);
  chainDropdown.classList.add('hidden');
  showToast(`Switched to ${CHAIN_CONFIG[chain].name}`);
  
  // Reload balance if possible
  loadBalance();
}

/**
 * Balance (Placeholder implementation matching previous logic)
 */
async function loadBalance() {
  // In a real scenario, we'd fetch the user's address or balances here.
  // Since the previous code relied on manual input, we check for that.
  const result = await chrome.storage.local.get([STORAGE_KEYS.WALLET_ADDRESS]);
  const address = result[STORAGE_KEYS.WALLET_ADDRESS];
  
  if (address) {
    walletAddress.textContent = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    // If we had the balance logic ready, we'd call it:
    // const balances = await getBalances(address);
    // balanceAmount.textContent = balances.usdc.formatted;
    // For now, keep 0.00 or load from cache if available
  } else {
    walletAddress.textContent = '0x...';
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
