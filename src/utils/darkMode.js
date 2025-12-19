/**
 * Dark Mode Detection Utility
 * Shared module for detecting dark mode across the extension
 */

/**
 * Check if a color is dark based on luminosity
 * @param {string} color - CSS color string (rgb/rgba)
 * @returns {boolean}
 */
function isColorDark(color) {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return true; // Default to dark if can't parse

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);

  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/**
 * Detect if the page is in dark mode
 * @param {string} [platform] - Optional platform hint (e.g., 'twitter')
 * @returns {boolean}
 */
function detectDarkMode(platform) {
  // Platform-specific detection
  if (platform === 'twitter') {
    const bg = document.body.style.backgroundColor ||
               window.getComputedStyle(document.body).backgroundColor;
    if (bg) {
      return isColorDark(bg);
    }
  }

  // Fallback: check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return true;
  }

  // Fallback: check body background luminosity
  const bg = window.getComputedStyle(document.body).backgroundColor;
  return isColorDark(bg);
}

// Export for different module systems
if (typeof window !== 'undefined') {
  window.detectDarkMode = detectDarkMode;
  window.isColorDark = isColorDark;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectDarkMode, isColorDark };
}
