/**
 * Storage Keys Configuration
 * Single source of truth for all Chrome storage keys used in the extension
 * Using var to ensure global scope in content scripts and background
 */

var STORAGE_KEYS = {
  // JWT Storage (matches keyManager.js ENV_CONFIG)
  JWT_PRODUCTION: 'GROVE_JWT_PRODUCTION',
  JWT_TESTNET: 'GROVE_JWT_TESTNET',
  JWT_LOCALHOST: 'GROVE_JWT_LOCALHOST',
  JWT_LEGACY: 'GROVE_API_JWT', // Legacy - for migration only
  PREV_JWTS: 'GROVE_PREV_JWTS',

  // Environment settings
  ENVIRONMENT: 'groveEnvironment',
  CHAIN: 'groveChain',
  ENDPOINT: 'groveEndpoint',

  // User preferences
  TIP_AMOUNT: 'GROVE_TIP_AMOUNT',
  CONFIRM_TIP: 'GROVE_CONFIRM_TIP',
  AUTO_REPLY: 'GROVE_AUTO_REPLY',
  AUTO_REPLY_MESSAGE: 'GROVE_AUTO_REPLY_MESSAGE',
  LIKE_ON_TIP: 'GROVE_LIKE_ON_TIP',

  // State tracking
  HAS_TIPPED: 'GROVE_HAS_TIPPED',
  LAST_BALANCES: 'GROVE_LAST_BALANCES',
  CLIENT_ADDRESS: 'GROVE_CLIENT_ADDRESS',
  ENS_NAME: 'GROVE_ENS_NAME',

  // Onboarding/UI state
  TIP_INTRO_SEEN: 'GROVE_TIP_INTRO_SEEN',
  EARN_TAB_SEEN: 'GROVE_EARN_TAB_SEEN',
  LAUNCH_COUNT: 'GROVE_LAUNCH_COUNT',
  TWITTER_MODAL_SEEN: 'GROVE_TWITTER_MODAL_SEEN',
};
