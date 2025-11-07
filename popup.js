/**
 * Grove Extension Popup
 * Handles navigation, JWT management, and tip amount settings
 */

// DOM Elements
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
const navCloseBtn = document.getElementById('navCloseBtn');
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');

// Tip amount elements
const tipAmountDisplay = document.getElementById('tipAmountDisplay');
const tipAmountEdit = document.getElementById('tipAmountEdit');
const tipAmountInput = document.getElementById('tipAmountInput');
const saveTipAmount = document.getElementById('saveTipAmount');
const cancelTipAmount = document.getElementById('cancelTipAmount');

// JWT status container
const jwtStatus = document.getElementById('jwtStatus');

// Storage keys
const STORAGE_KEYS = {
  JWT: 'GROVE_API_JWT',
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  ENVIRONMENT: 'groveEnvironment'
};

// Default values
const DEFAULT_TIP_AMOUNT = 0.10;
const DEFAULT_ENVIRONMENT = 'prod';

/**
 * Initialize the popup
 */
async function init() {
  await loadJWTStatus();
  await loadTipAmount();
  await loadEnvironmentStatus();
  setupEventListeners();
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Hamburger menu
  hamburgerBtn.addEventListener('click', openMenu);
  navCloseBtn.addEventListener('click', closeMenu);

  // Navigation links
  navLinks.forEach(link => {
    link.addEventListener('click', handleNavigation);
  });

  // Tip amount controls
  tipAmountDisplay.addEventListener('click', showTipAmountEdit);
  saveTipAmount.addEventListener('click', handleSaveTipAmount);
  cancelTipAmount.addEventListener('click', hideTipAmountEdit);

  // Environment toggle
  const toggleEnvBtn = document.getElementById('toggleEnvBtn');
  if (toggleEnvBtn) {
    toggleEnvBtn.addEventListener('click', handleToggleEnvironment);
  }

  // Close menu when clicking outside
  navMenu.addEventListener('click', (e) => {
    if (e.target === navMenu) {
      closeMenu();
    }
  });
}

/**
 * Open navigation menu
 */
function openMenu() {
  navMenu.classList.add('active');
}

/**
 * Close navigation menu
 */
function closeMenu() {
  navMenu.classList.remove('active');
}

/**
 * Handle navigation between pages
 */
function handleNavigation(e) {
  e.preventDefault();
  const targetPage = e.target.dataset.page;

  // Update active nav link
  navLinks.forEach(link => link.classList.remove('active'));
  e.target.classList.add('active');

  // Show target page
  pages.forEach(page => page.classList.remove('active'));
  document.getElementById(targetPage).classList.add('active');

  // Close menu
  closeMenu();
}

/**
 * Load and display JWT status
 */
async function loadJWTStatus() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.JWT]);
    const jwt = result[STORAGE_KEYS.JWT];

    if (jwt && jwt.length > 0) {
      // JWT exists - show truncated version
      const firstChars = jwt.substring(0, 5);
      const lastChars = jwt.substring(jwt.length - 5);

      jwtStatus.innerHTML = `
        <div class="jwt-display">
          <div class="jwt-token">
            <span class="token-preview">${firstChars}...${lastChars}</span>
            <button class="btn-icon" id="editJwt" title="Edit token">✏️</button>
          </div>
          <div class="jwt-actions">
            <button class="btn btn-small" id="copyJwt">Copy Token</button>
            <button class="btn btn-small btn-danger" id="removeJwt">Remove Token</button>
          </div>
        </div>
      `;

      // Add event listeners for JWT actions
      document.getElementById('editJwt').addEventListener('click', showJWTInput);
      document.getElementById('copyJwt').addEventListener('click', () => copyJWT(jwt));
      document.getElementById('removeJwt').addEventListener('click', removeJWT);
    } else {
      // No JWT - show setup instructions
      showJWTInput(true);
    }
  } catch (error) {
    console.error('[Grove Extension] Error loading JWT:', error);
    showJWTInput(true);
  }
}

/**
 * Show JWT input form
 */
function showJWTInput(isFirstTime = false) {
  const message = isFirstTime
    ? 'Get your API token to start tipping!'
    : 'Update your API token';

  jwtStatus.innerHTML = `
    <div class="jwt-input-container">
      <p class="info-text">${message}</p>
      <a href="https://www.x402scan.com/server/170d2ee7-73b4-457f-aa48-dbab753f6d5f"
         target="_blank"
         class="link">
        Get your token here →
      </a>
      <input
        type="password"
        id="jwtInput"
        class="input"
        placeholder="Paste your JWT token here"
      >
      <div class="jwt-actions">
        <button class="btn btn-small" id="saveJwt">Save Token</button>
        ${!isFirstTime ? '<button class="btn btn-small btn-secondary" id="cancelJwt">Cancel</button>' : ''}
      </div>
    </div>
  `;

  // Add event listeners
  document.getElementById('saveJwt').addEventListener('click', saveJWT);
  const cancelBtn = document.getElementById('cancelJwt');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', loadJWTStatus);
  }
}

/**
 * Save JWT token
 */
async function saveJWT() {
  const jwtInput = document.getElementById('jwtInput');
  const jwt = jwtInput.value.trim();

  if (!jwt) {
    alert('Please enter a valid token');
    return;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.JWT]: jwt });
    await loadJWTStatus();
    showToast('Token saved successfully!');
  } catch (error) {
    console.error('[Grove Extension] Error saving JWT:', error);
    alert('Failed to save token. Please try again.');
  }
}

/**
 * Remove JWT token
 */
async function removeJWT() {
  if (!confirm('Are you sure you want to remove your token?')) {
    return;
  }

  try {
    await chrome.storage.local.remove(STORAGE_KEYS.JWT);
    await loadJWTStatus();
    showToast('Token removed');
  } catch (error) {
    console.error('[Grove Extension] Error removing JWT:', error);
    alert('Failed to remove token. Please try again.');
  }
}

/**
 * Copy JWT token to clipboard
 */
async function copyJWT(jwt) {
  try {
    await navigator.clipboard.writeText(jwt);
    showToast('Token copied to clipboard!');
  } catch (error) {
    console.error('[Grove Extension] Error copying JWT:', error);
    alert('Failed to copy token. Please try again.');
  }
}

/**
 * Load tip amount from storage
 */
async function loadTipAmount() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.TIP_AMOUNT]);
    const tipAmount = result[STORAGE_KEYS.TIP_AMOUNT] || DEFAULT_TIP_AMOUNT;

    tipAmountDisplay.textContent = `$${tipAmount.toFixed(2)}`;
    tipAmountInput.value = tipAmount.toFixed(2);
  } catch (error) {
    console.error('[Grove Extension] Error loading tip amount:', error);
    tipAmountDisplay.textContent = `$${DEFAULT_TIP_AMOUNT.toFixed(2)}`;
    tipAmountInput.value = DEFAULT_TIP_AMOUNT.toFixed(2);
  }
}

/**
 * Show tip amount edit mode
 */
function showTipAmountEdit() {
  tipAmountDisplay.parentElement.classList.add('hidden');
  tipAmountEdit.classList.remove('hidden');
  tipAmountInput.focus();
  tipAmountInput.select();
}

/**
 * Hide tip amount edit mode
 */
function hideTipAmountEdit() {
  tipAmountDisplay.parentElement.classList.remove('hidden');
  tipAmountEdit.classList.add('hidden');
}

/**
 * Save tip amount
 */
async function handleSaveTipAmount() {
  const amount = parseFloat(tipAmountInput.value);

  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount greater than $0');
    return;
  }

  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.TIP_AMOUNT]: amount });
    tipAmountDisplay.textContent = `$${amount.toFixed(2)}`;
    hideTipAmountEdit();
    showToast('Tip amount updated!');
  } catch (error) {
    console.error('[Grove Extension] Error saving tip amount:', error);
    alert('Failed to save tip amount. Please try again.');
  }
}

/**
 * Show toast notification
 */
function showToast(message) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // Show toast
  setTimeout(() => toast.classList.add('show'), 10);

  // Hide and remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

/**
 * Load and display environment status
 */
async function loadEnvironmentStatus() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
    const environment = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENVIRONMENT;

    updateEnvironmentUI(environment);
  } catch (error) {
    console.error('[Grove Extension] Error loading environment:', error);
    updateEnvironmentUI(DEFAULT_ENVIRONMENT);
  }
}

/**
 * Update environment UI elements
 */
function updateEnvironmentUI(environment) {
  const envStatus = document.getElementById('envStatus');
  const toggleEnvLabel = document.getElementById('toggleEnvLabel');

  if (!envStatus || !toggleEnvLabel) return;

  const isProd = environment === 'prod';
  const icon = isProd ? '🌍' : '🏠';
  const label = isProd ? 'Production' : 'Localhost';
  const url = isProd ? 'api.grove.city' : 'localhost:8000';
  const toggleText = isProd ? 'Switch to Localhost' : 'Switch to Production';

  envStatus.innerHTML = `
    <div class="env-badge ${isProd ? 'env-prod' : 'env-local'}">
      <span class="env-icon">${icon}</span>
      <span class="env-label">${label}</span>
    </div>
    <p class="env-url">${url}</p>
  `;

  toggleEnvLabel.textContent = toggleText;
}

/**
 * Handle environment toggle
 */
async function handleToggleEnvironment() {
  try {
    const result = await chrome.storage.local.get([STORAGE_KEYS.ENVIRONMENT]);
    const currentEnv = result[STORAGE_KEYS.ENVIRONMENT] || DEFAULT_ENVIRONMENT;
    const newEnv = currentEnv === 'prod' ? 'local' : 'prod';

    await chrome.storage.local.set({ [STORAGE_KEYS.ENVIRONMENT]: newEnv });
    updateEnvironmentUI(newEnv);

    const envName = newEnv === 'prod' ? 'Production' : 'Localhost';
    showToast(`Switched to ${envName}`);
  } catch (error) {
    console.error('[Grove Extension] Error toggling environment:', error);
    alert('Failed to switch environment. Please try again.');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
