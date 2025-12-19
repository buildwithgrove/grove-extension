/**
 * Toast Notification Utility
 * Displays temporary notification messages
 */

/**
 * Show a toast notification
 * @param {string} msg - Message to display
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.duration=2000] - Duration in ms before auto-hide
 * @param {string} [options.background='#f0ad4e'] - Background color
 * @param {string} [options.color='#000'] - Text color
 */
function showToast(msg, options = {}) {
  const {
    duration = 2000,
    background = '#f0ad4e',
    color = '#000'
  } = options;

  // Remove any existing toast
  const existing = document.querySelector('.grove-toast');
  if (existing) {
    existing.remove();
  }

  const div = document.createElement('div');
  div.className = 'grove-toast';
  div.style.position = 'fixed';
  div.style.bottom = '72px'; // Above nav bar (64px + 8px gap)
  div.style.left = '50%';
  div.style.transform = 'translateX(-50%) translateY(20px)';
  div.style.opacity = '0';
  div.style.background = background;
  div.style.color = color;
  div.style.padding = '8px 16px';
  div.style.borderRadius = '8px';
  div.style.fontSize = '13px';
  div.style.fontWeight = '500';
  div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
  div.style.zIndex = '2000';
  div.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
  div.style.whiteSpace = 'nowrap';
  div.textContent = msg;

  document.body.appendChild(div);

  requestAnimationFrame(() => {
    div.style.transform = 'translateX(-50%) translateY(0)';
    div.style.opacity = '1';
  });

  setTimeout(() => {
    div.style.transform = 'translateX(-50%) translateY(20px)';
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 300);
  }, duration);
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.showToast = showToast;
}
