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
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return null; // Can't parse — let caller decide

  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;

  // Transparent background — can't determine from this element
  if (a < 0.1) return null;

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
  if (platform === 'soundcloud') {
    return document.body.classList.contains('theme-dark');
  }

  // Check body background (most reliable for platforms that set it)
  const bodyBg = document.body.style.backgroundColor ||
                 window.getComputedStyle(document.body).backgroundColor;
  if (bodyBg) {
    const result = isColorDark(bodyBg);
    if (result !== null) return result;
  }

  // Body was transparent — check <html> element
  const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
  if (htmlBg) {
    const result = isColorDark(htmlBg);
    if (result !== null) return result;
  }

  // Both body and html are transparent — browser default is white
  return false;
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.detectDarkMode = detectDarkMode;
  window.isColorDark = isColorDark;
}
