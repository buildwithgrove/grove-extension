/**
 * Grove UI Constants
 * Single source of truth for colors, gradients, and styling values
 * Using var to ensure global scope in content scripts
 */

var GROVE_COLORS = {
  primary: '#389f58',
  primaryHover: '#2f8549',
  primaryLight: '#4fb76d',
  shadow: 'rgba(56, 159, 88, 0.3)',
  shadowHover: 'rgba(56, 159, 88, 0.5)',
  error: '#ef4444',
  errorShadow: 'rgba(239, 68, 68, 0.55)',
  warning: '#f59e0b',
  warningShadow: 'rgba(245, 158, 11, 0.45)',
};

var GROVE_GRADIENTS = {
  background: 'linear-gradient(135deg, rgba(56, 159, 88, 0.25) 0%, rgba(56, 159, 88, 0.18) 100%)',
  backgroundHover: 'linear-gradient(135deg, rgba(56, 159, 88, 0.35) 0%, rgba(56, 159, 88, 0.25) 100%)',
};
