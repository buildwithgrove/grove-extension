/**
 * Grove Spinner Component
 * Reusable loading spinner with gradient glow effect
 */

class GroveSpinner {
  /**
   * Create a spinner element
   * @param {Object} options - Spinner options
   * @param {string} options.size - Size of spinner (default: '20px')
   * @returns {HTMLElement} The spinner element
   */
  static create(options = {}) {
    const size = options.size || '20px';

    const spinner = document.createElement('div');
    spinner.className = 'grove-spinner';
    spinner.style.cssText = `
      width: ${size};
      height: ${size};
      border-radius: 50%;
      border: 2px solid #444;
      box-shadow:
        -5px -5px 5px #389f58,
        0px -5px 5px 0px #389f58,
        5px -5px 5px #f0ad4e,
        5px 0 5px #f0ad4e,
        5px 5px 5px 0px #f0ad4e,
        0 5px 5px 0px #389f58,
        -5px 5px 5px 0px #389f58;
      animation: grove-spinner-rotate 0.7s linear infinite;
      flex-shrink: 0;
    `;

    // Add keyframe animation if not already added
    if (!document.querySelector('#grove-spinner-animation')) {
      const style = document.createElement('style');
      style.id = 'grove-spinner-animation';
      style.textContent = `
        @keyframes grove-spinner-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }

    return spinner;
  }
}

// Make globally available
if (typeof window !== 'undefined') {
  window.GroveSpinner = GroveSpinner;
}
