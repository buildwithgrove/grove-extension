/**
 * Tip Button UI
 * Creates and manages the tip button element
 */

class TipButton {
  /**
   * Create a new tip button
   * @param {Function} onClickCallback - Callback function when button is clicked
   * @param {string} platform - Platform name (twitter, reddit, etc.)
   */
  constructor(onClickCallback, platform = 'twitter') {
    this.onClickCallback = onClickCallback;
    this.button = null;
    this.platform = platform;
  }

  /**
   * Create and return the button element
   * @returns {HTMLElement}
   */
  create() {
    console.log(`[TipButton] Creating button for ${this.platform}...`);

    if (this.platform === 'reddit') {
      return this.createRedditButton();
    }

    if (this.platform === 'youtube') {
      return this.createYouTubeButton();
    }

    return this.createTwitterButton();
  }

  /**
   * Create Twitter-style button
   * @returns {HTMLElement}
   */
  createTwitterButton() {
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

    console.log('[TipButton] Twitter button created successfully', this.button);

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create Reddit-style button
   * Creates different styles based on context (hover card vs profile page)
   * @returns {HTMLElement}
   */
  createRedditButton() {
    console.log('[TipButton] Creating button with Reddit structure...');

    // Check if we're on a hover card or profile page
    const isHoverCard = !!document.querySelector('[data-testid="user-hover-card"]');
    const isProfilePage = /^https:\/\/(www\.)?reddit\.com\/(user|u)\/[^\/]+\/?$/.test(window.location.href);

    if (isProfilePage) {
      return this.createRedditProfileButton();
    } else {
      return this.createRedditHoverCardButton();
    }
  }

  /**
   * Create Reddit hover card button (matches karma display layout)
   * @returns {HTMLElement}
   */
  createRedditHoverCardButton() {
    console.log('[TipButton] Creating Reddit hover card button...');

    // Create button element matching Reddit's karma layout
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('role', 'button');
    this.button.setAttribute('type', 'button');
    this.button.className = 'flex flex-col grove-tip-button-reddit';
    this.button.id = 'grove-tip-button';

    // Create inner container
    const innerDiv = document.createElement('div');
    innerDiv.className = 'grove-tip-inner';

    // Create value span (the "Tip 🌿" text)
    const valueSpan = document.createElement('span');
    valueSpan.className = 'grove-tip-value font-semibold text-14';
    valueSpan.textContent = 'Tip 🌿';

    // Create label span (like "Post karma", "Comment karma")
    const labelSpan = document.createElement('span');
    labelSpan.className = 'grove-tip-label text-neutral-content-weak text-12';
    labelSpan.textContent = 'Send crypto';

    // Assemble the structure
    innerDiv.appendChild(valueSpan);
    innerDiv.appendChild(labelSpan);
    this.button.appendChild(innerDiv);

    console.log('[TipButton] Reddit hover card button created successfully', this.button);

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create Reddit profile page button (matches Share button style)
   * @returns {HTMLElement}
   */
  createRedditProfileButton() {
    console.log('[TipButton] Creating Reddit profile page button...');

    // Create button element matching Reddit's Share button style
    this.button = document.createElement('button');
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('rpl', '');
    this.button.className = 'button-small px-[var(--rem10)] button-secondary items-center justify-center button inline-flex grove-tip-button-reddit-profile';
    this.button.id = 'grove-tip-button';

    // Create span wrapper
    const spanWrapper = document.createElement('span');
    spanWrapper.className = 'flex items-center justify-center';

    // Create icon span (using leaf emoji as icon)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'flex me-xs';
    iconSpan.textContent = '🌿';

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.className = 'flex items-center gap-xs';
    textSpan.textContent = 'Tip';

    // Assemble the structure
    spanWrapper.appendChild(iconSpan);
    spanWrapper.appendChild(textSpan);
    this.button.appendChild(spanWrapper);

    console.log('[TipButton] Reddit profile button created successfully', this.button);

    // Add click handler
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    return this.button;
  }

  /**
   * Create YouTube-style button
   * Matches YouTube's action buttons (Share, Download) using yt-button-shape
   * @returns {HTMLElement}
   */
  createYouTubeButton() {
    console.log('[TipButton] Creating YouTube button...');

    // Create yt-button-view-model wrapper
    const buttonViewModel = document.createElement('yt-button-view-model');
    buttonViewModel.className = 'ytd-menu-renderer';
    buttonViewModel.id = 'grove-tip-button';

    // Create button-view-model wrapper
    const buttonViewModelInner = document.createElement('button-view-model');
    buttonViewModelInner.className = 'ytSpecButtonViewModelHost style-scope ytd-menu-renderer';

    // Create the actual button
    this.button = document.createElement('button');
    this.button.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--tonal yt-spec-button-shape-next--mono yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment grove-tip-button-youtube';
    this.button.setAttribute('aria-label', 'Send a tip');
    this.button.setAttribute('title', '');
    this.button.setAttribute('aria-disabled', 'false');

    // Create icon div
    const iconDiv = document.createElement('div');
    iconDiv.setAttribute('aria-hidden', 'true');
    iconDiv.className = 'yt-spec-button-shape-next__icon';

    // Create icon span (using the leaf emoji as icon)
    const iconSpan = document.createElement('span');
    iconSpan.className = 'ytIconWrapperHost';
    iconSpan.style.width = '24px';
    iconSpan.style.height = '24px';
    iconSpan.style.fontSize = '18px';
    iconSpan.style.display = 'flex';
    iconSpan.style.alignItems = 'center';
    iconSpan.style.justifyContent = 'center';
    iconSpan.textContent = '🌿';

    // Assemble icon structure
    iconDiv.appendChild(iconSpan);

    // Create button text content div
    const textDiv = document.createElement('div');
    textDiv.className = 'yt-spec-button-shape-next__button-text-content';

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.className = 'yt-core-attributed-string yt-core-attributed-string--white-space-no-wrap';
    textSpan.setAttribute('role', 'text');
    textSpan.textContent = 'Tip';

    // Assemble text structure
    textDiv.appendChild(textSpan);

    // Create touch feedback shape (YouTube's ripple effect)
    const touchFeedback = document.createElement('yt-touch-feedback-shape');
    touchFeedback.setAttribute('aria-hidden', 'true');
    touchFeedback.className = 'yt-spec-touch-feedback-shape yt-spec-touch-feedback-shape--touch-response';

    const strokeDiv = document.createElement('div');
    strokeDiv.className = 'yt-spec-touch-feedback-shape__stroke';

    const fillDiv = document.createElement('div');
    fillDiv.className = 'yt-spec-touch-feedback-shape__fill';

    touchFeedback.appendChild(strokeDiv);
    touchFeedback.appendChild(fillDiv);

    // Assemble button structure
    this.button.appendChild(iconDiv);
    this.button.appendChild(textDiv);
    this.button.appendChild(touchFeedback);

    // Assemble wrapper structure
    buttonViewModelInner.appendChild(this.button);
    buttonViewModel.appendChild(buttonViewModelInner);

    console.log('[TipButton] YouTube button created successfully', buttonViewModel);

    // Add click handler to the actual button
    this.button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleClick();
    });

    // Return the wrapper so we can inject it properly
    return buttonViewModel;
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
   * Set button to loading state
   */
  setLoading() {
    if (!this.button) return;

    // Store original state
    this.originalText = this.button.textContent || this.button.innerText;
    this.button.disabled = true;
    this.button.style.cursor = 'wait';

    // Remove any existing state classes
    this.button.classList.remove('animate__bounceIn', 'animate__shakeX', 'grove-tip-success', 'grove-tip-error');

    // Add pulsing animation
    this.button.classList.add('animate__animated', 'animate__pulse', 'animate__infinite');

    // Update button text based on platform
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
    } else {
      textElement = this.button.querySelector('span') || this.button;
    }

    if (textElement) {
      textElement.textContent = 'Sending...';
    }
  }

  /**
   * Set button to success state
   */
  setSuccess() {
    if (!this.button) return;

    // Remove loading state
    this.button.disabled = false;
    this.button.style.cursor = 'pointer';
    this.button.classList.remove('animate__pulse', 'animate__infinite', 'grove-tip-error');

    // Add success animation and styling
    this.button.classList.add('animate__bounceIn', 'grove-tip-success');

    // Update button text
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
    } else {
      textElement = this.button.querySelector('span') || this.button;
    }

    if (textElement) {
      textElement.textContent = 'Sent! ✓';
    }

    // Reset after 2 seconds
    setTimeout(() => {
      this.resetState();
    }, 2000);
  }

  /**
   * Set button to error state
   */
  setError() {
    if (!this.button) return;

    // Remove loading state
    this.button.disabled = false;
    this.button.style.cursor = 'pointer';
    this.button.classList.remove('animate__pulse', 'animate__infinite', 'grove-tip-success');

    // Add error animation and styling
    this.button.classList.add('animate__shakeX', 'grove-tip-error');

    // Update button text
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
    } else {
      textElement = this.button.querySelector('span') || this.button;
    }

    if (textElement) {
      textElement.textContent = 'Failed ✗';
    }

    // Reset after 2 seconds
    setTimeout(() => {
      this.resetState();
    }, 2000);
  }

  /**
   * Reset button to original state
   */
  resetState() {
    if (!this.button) return;

    // Remove all state classes
    this.button.classList.remove(
      'animate__animated',
      'animate__pulse',
      'animate__infinite',
      'animate__bounceIn',
      'animate__shakeX',
      'grove-tip-success',
      'grove-tip-error'
    );

    // Reset button properties
    this.button.disabled = false;
    this.button.style.cursor = 'pointer';

    // Restore original text
    let textElement;
    if (this.platform === 'youtube') {
      textElement = this.button.querySelector('.yt-core-attributed-string');
      if (textElement) {
        textElement.textContent = 'Tip';
      }
    } else {
      textElement = this.button.querySelector('span') || this.button;
      if (this.originalText) {
        textElement.textContent = this.originalText;
      } else {
        textElement.textContent = this.platform === 'reddit' ? 'Tip 🌿' : 'Tip 🌿';
      }
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
