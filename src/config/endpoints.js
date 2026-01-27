/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for the Grove API
 */

const API_ENDPOINTS = {
  'production': 'https://api.grove.city',
  'testnet': 'https://api.testnet.grove.city',
  'localhost': 'http://localhost:3000',
  'localhost:3000': 'http://localhost:3000',
};

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.API_ENDPOINTS = API_ENDPOINTS;
}
