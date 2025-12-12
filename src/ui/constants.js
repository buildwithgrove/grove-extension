/**
 * Grove UI Constants
 * Single source of truth for colors, gradients, and styling values
 * Using var to ensure global scope in content scripts
 */

var GROVE_COLORS = {
  primary: 'var(--grove-primary)',
  primaryHover: 'var(--grove-primary-hover)',
  primaryLight: 'var(--grove-primary-light)',
  shadow: 'var(--grove-shadow)',
  shadowHover: 'var(--grove-shadow-hover)',
  error: '#ef4444',
  errorShadow: 'rgba(239, 68, 68, 0.55)',
  warning: '#f59e0b',
  warningShadow: 'rgba(245, 158, 11, 0.45)',
};

var GROVE_GRADIENTS = {
  background: 'linear-gradient(135deg, rgba(56, 159, 88, 0.25) 0%, rgba(56, 159, 88, 0.18) 100%)',
  backgroundHover: 'linear-gradient(135deg, rgba(56, 159, 88, 0.35) 0%, rgba(56, 159, 88, 0.25) 100%)',
};

/**
 * Format tip amount for display
 * - Shows at least 2 decimal places for amounts >= $0.01
 * - Shows up to first non-zero digit for smaller amounts
 * @param {number|string} amount - The amount to format
 * @returns {string|null} - Formatted amount string or null if no amount
 */
var formatTipAmount = function(amount) {
  if (!amount) return null;
  const num = Number(amount);
  if (num < 0.01 && num > 0) {
    // For very small amounts, show up to first non-zero digit
    const str = num.toFixed(20);
    const match = str.match(/^0\.(0*[1-9])/);
    if (match) {
      return '0.' + match[1];
    }
  }
  return num.toFixed(2);
};
