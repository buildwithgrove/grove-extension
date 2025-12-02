/**
 * Environment Toggle
 * Developer mode feature to switch between localhost and production
 */

class EnvironmentToggle {
  constructor() {
    this.container = null;
    this.currentEnv = 'prod'; // default to prod
    this.loadEnvironment();
  }

  /**
   * Load saved environment from chrome storage
   */
  async loadEnvironment() {
    try {
      const result = await chrome.storage.local.get(['groveEnvironment']);
      this.currentEnv = result.groveEnvironment || 'prod';
    } catch (error) {
      console.log("[Grove Extension] Environment load failed, using production");
      this.currentEnv = 'prod';
    }
  }

  /**
   * Save environment to chrome storage
   */
  async saveEnvironment(env) {
    try {
      await chrome.storage.local.set({ groveEnvironment: env });
      this.currentEnv = env;
    } catch (error) {
      console.error('[Grove Extension] Environment save failed:', error);
    }
  }

  /**
   * Create and inject the toggle UI
   */
  create() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'grove-env-toggle';
    this.container.id = 'grove-env-toggle';

    // Create toggle button
    const button = document.createElement('button');
    button.className = 'grove-env-toggle-button';
    button.textContent = this.currentEnv === 'prod' ? '🌍 PROD' : '🏠 LOCAL';
    button.title = `Current: ${this.currentEnv === 'prod' ? 'Production' : 'Localhost'}`;

    // Add click handler
    button.addEventListener('click', async () => {
      const newEnv = this.currentEnv === 'prod' ? 'local' : 'prod';
      await this.saveEnvironment(newEnv);
      button.textContent = newEnv === 'prod' ? '🌍 PROD' : '🏠 LOCAL';
      button.title = `Current: ${newEnv === 'prod' ? 'Production' : 'Localhost'}`;

      // Show toast notification
      this.showToast(`Switched to ${newEnv === 'prod' ? 'Production' : 'Localhost'}`);
    });

    this.container.appendChild(button);

    // Inject into page
    document.body.appendChild(this.container);

  }

  /**
   * Show a temporary toast notification
   */
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'grove-env-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Remove after 2 seconds
    setTimeout(() => {
      toast.remove();
    }, 2000);
  }

  /**
   * Get current environment setting
   * @returns {Promise<string>} - 'prod' or 'local'
   */
  static async getEnvironment() {
    try {
      const result = await chrome.storage.local.get(['groveEnvironment']);
      return result.groveEnvironment || 'prod';
    } catch (error) {
      console.log("[Grove Extension] Environment load failed, using production");
      return 'prod';
    }
  }

  /**
   * Remove toggle from DOM
   */
  remove() {
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }
  }
}

if (typeof window !== 'undefined') {
  window.EnvironmentToggle = EnvironmentToggle;
}
