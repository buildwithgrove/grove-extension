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

// Export for different module systems
if (typeof window !== 'undefined') {
  window.API_ENDPOINTS = API_ENDPOINTS;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { API_ENDPOINTS };
}
