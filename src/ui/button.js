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
    console.log('[TipButton] Creating button with Twitter structure...');

    // Create button element matching Twitter's structure exactly
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('type', 'button');
    this.button.className = 'css-175oi2r r-sdzlij r-1phboty r-rs99b7 r-lrvibr r-6gpygo r-1wron08 r-2yi16 r-1qi8awa r-1loqt21 r-o7ynqc r-6416eg r-1ny4l3l grove-tip-button';
    this.button.style.borderColor = 'rgb(83, 100, 113)';
    this.button.style.backgroundColor = 'rgba(0, 0, 0, 0)';
    this.button.id = 'grove-tip-button';

    // Create inner div matching Twitter's structure
    const innerDiv = document.createElement('div');
    innerDiv.setAttribute('dir', 'ltr');
    innerDiv.className = 'css-146c3p1 r-bcqeeo r-qvutc0 r-37j5jr r-q4m81j r-a023e6 r-rjixqe r-b88u0q r-1awozwy r-6koalj r-18u37iz r-16y2uox r-1777fci';
    innerDiv.style.color = 'rgb(239, 243, 244)';

    // Create text span (no SVG icon, just text)
    const textSpan = document.createElement('span');
    textSpan.className = 'css-1jxf684 r-dnmrzs r-1udh08x r-1udbk01 r-3s2u2q r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3 r-a023e6 r-rjixqe';
    textSpan.textContent = 'Tip 🌿';

    // Assemble the structure
    innerDiv.appendChild(textSpan);
    this.button.appendChild(innerDiv);

    console.log('[TipButton] Button created successfully', this.button);

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
    console.log('[TipButton] Injecting button...', { targetElement, button: this.button });

    if (!targetElement || !this.button) {
      console.log('[TipButton] Injection failed: missing target or button');
      return false;
    }

    // Check if button already exists
    if (document.getElementById(this.button.id)) {
      console.log('[TipButton] Button already exists in DOM');
      return false;
    }

    // Get all children of the target container
    const children = Array.from(targetElement.children);
    console.log('[TipButton] Target container has', children.length, 'children');

    // Look for a good insertion point
    // On other people's profiles: insert before "More" button (data-testid="userActions")
    // On own profile: insert before "Edit profile" button (data-testid="editProfileButton")
    let insertBeforeElement = null;

    // Try to find the "More" button or other action buttons
    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      // Check if this child is a button or contains a button with specific attributes
      const childButton = child.tagName === 'BUTTON' ? child : child.querySelector('button');

      if (childButton) {
        const ariaLabel = childButton.getAttribute('aria-label');
        const testId = childButton.getAttribute('data-testid');

        // Insert before "More" button, Edit profile, or Follow/Following buttons
        if ((ariaLabel && ariaLabel.toLowerCase().includes('more')) ||
            (testId && testId === 'userActions') ||
            (ariaLabel && (ariaLabel.includes('Follow') || ariaLabel.includes('Message'))) ||
            (testId && testId.includes('follow'))) {
          insertBeforeElement = child;
          console.log('[TipButton] Found insertion point before:', ariaLabel || testId);
          break;
        }
      }
    }

    // Insert button directly without wrapper to match Twitter's button structure
    if (insertBeforeElement) {
      targetElement.insertBefore(this.button, insertBeforeElement);
      console.log('[TipButton] Inserted before target element');
    } else if (children.length > 0) {
      // Fallback: Insert at the beginning
      targetElement.insertBefore(this.button, children[0]);
      console.log('[TipButton] Inserted at beginning');
    } else {
      // Fallback: just append
      targetElement.appendChild(this.button);
      console.log('[TipButton] Appended to container');
    }

    console.log('[TipButton] Button injected successfully');
    return true;
  }

  /**
   * Remove button from DOM
   */
  remove() {
    if (this.button && this.button.parentElement) {
      this.button.remove();
    }
  }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
  window.TipButton = TipButton;
}
