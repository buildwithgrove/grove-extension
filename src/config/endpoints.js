/**
 * API Endpoints Configuration
 * Centralized endpoint definitions for the Grove API
 */

const API_ENDPOINTS = {
  'production': 'https://api.grove.city',
  'testnet': 'https://api.testnet.grove.city',
  'localhost': 'http://localhost:8000',
  'localhost:8000': 'http://localhost:8000',
};

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.API_ENDPOINTS = API_ENDPOINTS;
}
