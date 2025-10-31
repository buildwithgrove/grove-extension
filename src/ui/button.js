/**
 * Tip Button UI
 * Creates and manages the tip button element
 */

class TipButton {
  /**
   * Create a new tip button
   * @param {Function} onClickCallback - Callback function when button is clicked
   */
  constructor(onClickCallback) {
    this.onClickCallback = onClickCallback;
    this.button = null;
  }

  /**
   * Create and return the button element
   * @returns {HTMLElement}
   */
  create() {
    // Create button element
    this.button = document.createElement('button');
    this.button.className = 'grove-tip-button';
    this.button.textContent = 'Tip 🌿';
    this.button.id = 'grove-tip-button';

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Handle button click
   */
  handleClick() {
    if (this.onClickCallback) {
      this.onClickCallback();
    }
  }

  /**
   * Inject button into the DOM at target location
   * @param {Element} targetElement - Element to append button to
   * @returns {boolean} - True if injection successful
   */
  inject(targetElement) {
    if (!targetElement || !this.button) {
      return false;
    }

    // Check if button already exists
    if (document.getElementById(this.button.id)) {
      return false;
    }

    // Create wrapper for better positioning
    const wrapper = document.createElement('div');
    wrapper.className = 'grove-tip-button-wrapper';
    wrapper.appendChild(this.button);

    // Get all children of the target container
    const children = Array.from(targetElement.children);

    // Look for the dropdown menu (usually has overflow menu icon or three dots)
    // It's typically the last or second-to-last child
    let insertBeforeElement = null;

    // Try to find dropdown by looking for elements with specific attributes
    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i];
      const button = child.querySelector('button');
      if (button) {
        const ariaLabel = button.getAttribute('aria-label');
        // Look for "More" or similar labels in the last elements
        if (ariaLabel && ariaLabel.toLowerCase().includes('more')) {
          insertBeforeElement = child;
          break;
        }
      }
    }

    // If we found the dropdown, insert before it
    // Otherwise, insert as second-to-last (before the last button which is likely the dropdown)
    if (insertBeforeElement) {
      targetElement.insertBefore(wrapper, insertBeforeElement);
    } else if (children.length > 0) {
      // Insert before last child (usually the dropdown/more button)
      targetElement.insertBefore(wrapper, children[children.length - 1]);
    } else {
      // Fallback: just append
      targetElement.appendChild(wrapper);
    }

    return true;
  }

  /**
   * Remove button from DOM
   */
  remove() {
    if (this.button && this.button.parentElement) {
      this.button.parentElement.remove();
    }
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.TipButton = TipButton;
}
