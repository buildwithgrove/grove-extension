/**
 * Tweet Tip Handler Module
 * Handles tip button injection into tweets and the full tip flow
 * (loading state, API call, success/error states, delegates to xFeatures.js)
 */

const TweetTipHandler = {
  // UI instances
  tipModal: null,

  // Colors (set from GROVE_COLORS)
  colors: {
    primary: "#389f58",
    primaryHover: "#2f8549",
    shadow: "rgba(56, 159, 88, 0.3)",
    shadowHover: "rgba(56, 159, 88, 0.5)",
    error: "#ef4444",
    errorShadow: "rgba(239, 68, 68, 0.55)",
  },

  // Callbacks set by content.js
  callbacks: {
    detectDarkMode: null,
    ensureEllipsisStyles: null,
    formatTipAmount: null,
    isExtensionContextValid: null,
    showInlineTipError: null,
    getActiveJWT: null,
    getCachedAddress: null,
    extractUsernameFromUrl: null,
    addXSenderInfo: null,
    getDefaultAutoReplyMessage: null,
  },

  /**
   * Initialize the tweet tip handler with callbacks
   * @param {Object} callbacks - Callback functions
   * @param {Object} colors - Color configuration (GROVE_COLORS)
   */
  init(callbacks, colors) {
    this.callbacks = { ...this.callbacks, ...callbacks };
    if (colors) {
      this.colors = { ...this.colors, ...colors };
    }
  },

  /**
   * Reset state (useful for cleanup)
   */
  reset() {
    if (this.tipModal) {
      this.tipModal.hide();
      this.tipModal = null;
    }
  },

  /**
   * Inject tip button next to tweet date
   * @param {Element} tweetElement - The tweet article element
   * @param {Element} dateElement - The date link element
   * @param {string} tweetUrl - The tweet URL for tipping
   * @param {boolean} isQuotedTweet - Whether this is a button for a quoted tweet (smaller styling)
   */
  injectButton(tweetElement, dateElement, tweetUrl, isQuotedTweet = false) {
    const isDarkMode = this.callbacks.detectDarkMode
      ? this.callbacks.detectDarkMode()
      : false;
    const bgColor = isDarkMode ? "#1a1a1a" : "#ffffff";
    const bgHoverColor = isDarkMode ? "#252525" : "#f0f0f0";
    const textColor = isDarkMode ? "#ffffff" : "#1a1a1a";

    // Adjust sizing for quoted tweets (smaller to fit the compact layout)
    // Maintain ~50% padding-to-height ratio for consistent pill proportions
    const buttonHeight = isQuotedTweet ? "24px" : "28px";
    const buttonPadding = isQuotedTweet ? "0 12px" : "0 14px";
    const fontSize = isQuotedTweet ? "11px" : "13px";
    const emojiFontSize = isQuotedTweet ? "12px" : "14px";

    // Create the full tip button (matching profile button style)
    const button = document.createElement("button");
    button.className = "grove-tweet-tip-button";
    if (isQuotedTweet) button.classList.add("grove-quoted-tweet-tip-button");
    button.setAttribute("aria-label", "Send a tip");
    button.setAttribute("type", "button");

    button.style.cssText = `
      background: ${bgColor} !important;
      border: 2px solid ${this.colors.primary} !important;
      border-radius: 9999px !important;
      padding: ${buttonPadding} !important;
      height: ${buttonHeight} !important;
      min-height: ${buttonHeight} !important;
      max-height: ${buttonHeight} !important;
      min-width: 32px !important;
      position: relative !important;
      overflow: hidden !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 4px !important;
      cursor: pointer !important;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
      box-shadow: 0 2px 8px ${this.colors.shadow} !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      vertical-align: middle !important;
      margin-left: 8px !important;
      line-height: 1 !important;
    `;

    // Create text span
    const textSpan = document.createElement("span");
    textSpan.textContent = "Tip";
    textSpan.style.cssText = `
      color: ${textColor} !important;
      font-weight: 600 !important;
      font-size: ${fontSize} !important;
      position: relative !important;
      z-index: 2 !important;
      display: flex !important;
      align-items: center !important;
    `;

    // Create emoji span
    const emojiSpan = document.createElement("span");
    emojiSpan.textContent = "\u{1F33F}";
    emojiSpan.style.cssText = `
      font-size: ${emojiFontSize} !important;
      margin-left: 4px !important;
      position: relative !important;
      z-index: 2 !important;
    `;

    // Create animated sheen overlay
    const sheenOverlay = document.createElement("div");
    sheenOverlay.style.cssText = `
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      background: linear-gradient(90deg,
        transparent,
        rgba(255, 255, 255, 0.2),
        transparent) !important;
      pointer-events: none !important;
      z-index: 1 !important;
      animation: grove-sheen-slide 3s ease-in-out infinite !important;
    `;
    const defaultSheenBackground = sheenOverlay.style.background;

    // Assemble the structure
    textSpan.appendChild(emojiSpan);
    button.appendChild(sheenOverlay);
    button.appendChild(textSpan);

    // Hover effects
    const self = this;
    button.addEventListener("mouseenter", () => {
      button.style.background = `${bgHoverColor} !important`;
      button.style.transform = "translateY(-1px)";
      button.style.boxShadow = `0 4px 12px ${self.colors.shadowHover} !important`;
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = `${bgColor} !important`;
      button.style.transform = "translateY(0)";
      button.style.boxShadow = `0 2px 8px ${self.colors.shadow} !important`;
    });

    // Create button wrapper with state methods
    const buttonWrapper = this.createButtonWrapper(
      button,
      textSpan,
      emojiSpan,
      sheenOverlay,
      defaultSheenBackground,
    );

    // Click handler
    button.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.handleTipClick(buttonWrapper, tweetUrl);
    });

    // Insert after the date element
    if (dateElement.parentElement) {
      dateElement.parentElement.insertBefore(button, dateElement.nextSibling);
    }
  },

  /**
   * Create button wrapper with state methods
   * @param {Element} button - The button element
   * @param {Element} textSpan - The text span element
   * @param {Element} emojiSpan - The emoji span element
   * @param {Element} sheenOverlay - The sheen overlay element
   * @param {string} defaultSheenBackground - Default sheen background style
   * @returns {Object} Button wrapper with state methods
   */
  createButtonWrapper(
    button,
    textSpan,
    emojiSpan,
    sheenOverlay,
    defaultSheenBackground,
  ) {
    const self = this;

    return {
      button,
      textSpan,
      emojiSpan,
      setLoading: (amount) => {
        if (self.callbacks.ensureEllipsisStyles) {
          self.callbacks.ensureEllipsisStyles();
        }
        button.disabled = true;
        button.style.pointerEvents = "none";
        // Update button text to show sending state
        const formattedAmount = self.callbacks.formatTipAmount
          ? self.callbacks.formatTipAmount(amount)
          : amount;
        const sendingText = formattedAmount
          ? `Sending $${formattedAmount}`
          : "Sending";
        textSpan.textContent = sendingText;
        textSpan.classList.add("grove-ellipsis");
        // Color cycling animation
        const colors = [
          { border: "#389f58", shadow: "0 0 12px #389f58" },
          { border: "#4fb76d", shadow: "0 0 12px #4fb76d" },
          { border: "#f0ad4e", shadow: "0 0 12px #f0ad4e" },
          { border: "#4fb76d", shadow: "0 0 12px #4fb76d" },
        ];
        let colorIndex = 0;
        button._loadingInterval = setInterval(() => {
          colorIndex++;
          const color = colors[colorIndex % colors.length];
          button.style.setProperty("border-color", color.border, "important");
          button.style.setProperty("box-shadow", color.shadow, "important");
        }, 150);
      },
      setSuccess: () => {
        if (button._loadingInterval) {
          clearInterval(button._loadingInterval);
        }
        button.disabled = false;
        button.style.pointerEvents = "";
        button.style.setProperty(
          "border",
          `2px solid ${self.colors.primary}`,
          "important",
        );
        button.style.setProperty(
          "box-shadow",
          `0 2px 8px ${self.colors.shadow}`,
          "important",
        );
        sheenOverlay.style.background = defaultSheenBackground;
        textSpan.classList.remove("grove-ellipsis");
        textSpan.textContent = "Sent! \u2713";
        button.classList.add("animate__animated", "animate__bounceIn");
        setTimeout(() => {
          textSpan.textContent = "Tip";
          textSpan.appendChild(emojiSpan);
          button.classList.remove("animate__animated", "animate__bounceIn");
        }, 2000);
      },
      setError: () => {
        if (button._loadingInterval) {
          clearInterval(button._loadingInterval);
        }
        button.disabled = false;
        button.style.pointerEvents = "";
        button.style.setProperty(
          "border",
          `2px solid ${self.colors.error}`,
          "important",
        );
        button.style.setProperty(
          "box-shadow",
          `0 0 12px ${self.colors.errorShadow}`,
          "important",
        );
        sheenOverlay.style.background =
          "linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.35), transparent)";
        textSpan.classList.remove("grove-ellipsis");
        textSpan.textContent = "Failed \u2717";
        button.classList.add("animate__animated", "animate__shakeX");
        setTimeout(() => {
          textSpan.textContent = "Tip";
          textSpan.appendChild(emojiSpan);
          button.classList.remove("animate__animated", "animate__shakeX");
          button.style.setProperty(
            "border",
            `2px solid ${self.colors.primary}`,
            "important",
          );
          button.style.setProperty(
            "box-shadow",
            `0 2px 8px ${self.colors.shadow}`,
            "important",
          );
          sheenOverlay.style.background = defaultSheenBackground;
        }, 2000);
      },
    };
  },

  /**
   * Handle tip click for a tweet
   * @param {Object} buttonWrapper - Button wrapper with state methods
   * @param {string} tweetUrl - The tweet URL to tip
   */
  async handleTipClick(buttonWrapper, tweetUrl) {
    // Check if extension context is valid
    if (
      this.callbacks.isExtensionContextValid &&
      !this.callbacks.isExtensionContextValid()
    ) {
      console.error("[Grove TweetTipHandler] Extension context invalidated");
      buttonWrapper.setError();
      if (this.callbacks.showInlineTipError) {
        this.callbacks.showInlineTipError(buttonWrapper.button, {
          message: "Extension was reloaded. Please refresh the page.",
          variant: "error",
        });
      }
      return;
    }

    // Get settings from storage
    let tipAmount = 0.02;
    let confirmBeforeTipping = true; // New default is true
    let hasTipped = false;
    let likeOnTip = true;
    let autoReply = true;
    let isXConnected = false;

    let autoReplyMessage = this.callbacks.getDefaultAutoReplyMessage
      ? this.callbacks.getDefaultAutoReplyMessage()
      : "";

    try {
      if (
        typeof chrome !== "undefined" &&
        chrome.storage &&
        chrome.storage.local
      ) {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.TIP_AMOUNT,
          STORAGE_KEYS.CONFIRM_TIP,
          STORAGE_KEYS.CONFIRM_TIP_V2,
          STORAGE_KEYS.HAS_TIPPED,
          STORAGE_KEYS.LIKE_ON_TIP,
          STORAGE_KEYS.AUTO_REPLY,
          STORAGE_KEYS.AUTO_REPLY_MESSAGE,
        ]);
        autoReplyMessage =
          result[STORAGE_KEYS.AUTO_REPLY_MESSAGE] || autoReplyMessage;
        tipAmount = result[STORAGE_KEYS.TIP_AMOUNT] || 0.02;
        hasTipped = result[STORAGE_KEYS.HAS_TIPPED] || false;
        likeOnTip = result[STORAGE_KEYS.LIKE_ON_TIP] !== false;
        autoReply = result[STORAGE_KEYS.AUTO_REPLY] !== false;

        // Migration logic: if V2 flag not set, reset confirm to true (new default)
        if (!result[STORAGE_KEYS.CONFIRM_TIP_V2]) {
          confirmBeforeTipping = true;
          await chrome.storage.local.set({
            [STORAGE_KEYS.CONFIRM_TIP]: true,
            [STORAGE_KEYS.CONFIRM_TIP_V2]: true,
          });
          console.log(
            "[Grove TweetTipHandler] Migrated to V2: confirm before tipping set to true",
          );
        } else {
          confirmBeforeTipping = result[STORAGE_KEYS.CONFIRM_TIP] !== false;
        }

        // Check X connection status
        if (typeof XAuth !== "undefined") {
          isXConnected = await XAuth.isLoggedIn();
        }
      }
    } catch (error) {
      console.error("[Grove TweetTipHandler] Settings load failed:", error);
      buttonWrapper.setError();
      if (this.callbacks.showInlineTipError) {
        this.callbacks.showInlineTipError(buttonWrapper.button, {
          message: "Extension was reloaded. Please refresh the page.",
          variant: "error",
        });
      }
      return;
    }

    // Build X options for modals
    const xOptions = isXConnected
      ? {
          isConnected: true,
          likeOnTip: likeOnTip,
          autoReply: autoReply,
        }
      : null;

    // If confirmation disabled, send tip directly
    if (!confirmBeforeTipping) {
      // Mark as having tipped if this is the first tip
      if (!hasTipped) {
        try {
          await chrome.storage.local.set({ [STORAGE_KEYS.HAS_TIPPED]: true });
        } catch (e) {
          console.error("[Grove TweetTipHandler] Failed to mark first tip:", e);
        }
      }
      this.sendTip(tipAmount, buttonWrapper, tweetUrl);
      return;
    }

    // Show confirmation modal
    if (!this.tipModal && typeof TipModal !== "undefined") {
      this.tipModal = new TipModal();
    }

    if (this.tipModal) {
      // Get username from tweet URL
      const recipientUsername = this.callbacks.extractUsernameFromUrl
        ? this.callbacks.extractUsernameFromUrl(tweetUrl)
        : null;

      // Detect dark mode for modal theming
      const isDarkMode = this.callbacks.detectDarkMode
        ? this.callbacks.detectDarkMode()
        : true;

      // Configure display based on whether this is the first tip
      const displayOptions = {
        title: hasTipped ? "Confirm Tip" : "Your First Tip!",
        showConfirmCheckbox: true,
        recipientUsername,
        autoReplyMessage,
        isDarkMode,
      };

      this.tipModal.show(
        buttonWrapper.button,
        tipAmount,
        confirmBeforeTipping,
        async ({
          amount,
          confirmBeforeTipping: newConfirmSetting,
          likeOnTip: newLikeOnTip,
          autoReply: newAutoReply,
          customMessage,
        }) => {
          // Save preferences
          try {
            const saveData = {
              [STORAGE_KEYS.TIP_AMOUNT]: amount,
              [STORAGE_KEYS.CONFIRM_TIP]: newConfirmSetting,
              [STORAGE_KEYS.HAS_TIPPED]: true,
            };
            // Save X preferences if they were set (X is connected)
            if (newLikeOnTip !== null) {
              saveData[STORAGE_KEYS.LIKE_ON_TIP] = newLikeOnTip;
            }
            if (newAutoReply !== null) {
              saveData[STORAGE_KEYS.AUTO_REPLY] = newAutoReply;
            }
            await chrome.storage.local.set(saveData);
          } catch (e) {
            console.error(
              "[Grove TweetTipHandler] Failed to save tip preferences:",
              e,
            );
          }
          // Build xActions if X options were provided
          const xActions =
            newLikeOnTip !== null || newAutoReply !== null
              ? {
                  likeOnTip: newLikeOnTip,
                  autoReply: newAutoReply,
                  customMessage,
                }
              : null;
          // Send the tip
          this.sendTip(amount, buttonWrapper, tweetUrl, xActions);
        },
        () => {
          console.log("[Grove TweetTipHandler] Tip cancelled");
        },
        xOptions,
        displayOptions,
      );
    } else {
      // Fallback: send tip directly if modal not available
      this.sendTip(tipAmount, buttonWrapper, tweetUrl);
    }
  },

  /**
   * Send tip for a tweet
   * @param {number} tipAmount - The amount to tip
   * @param {Object} buttonWrapper - Button wrapper with state methods
   * @param {string} tweetUrl - The tweet URL to tip
   * @param {Object|null} xActions - X actions from modal { likeOnTip, autoReply }, or null to read from storage
   */
  async sendTip(tipAmount, buttonWrapper, tweetUrl, xActions = null) {
    buttonWrapper.setLoading(tipAmount);

    // Check if extension context is valid before making API calls
    if (
      this.callbacks.isExtensionContextValid &&
      !this.callbacks.isExtensionContextValid()
    ) {
      console.error("[Grove TweetTipHandler] Extension context invalidated");
      buttonWrapper.setError();
      if (this.callbacks.showInlineTipError) {
        this.callbacks.showInlineTipError(buttonWrapper.button, {
          message: "Extension was reloaded. Please refresh the page.",
          variant: "error",
        });
      }
      return;
    }

    // Get JWT and settings from storage
    let jwt = "";
    let autoReplyEnabled = true;
    let autoReplyMessage = this.callbacks.getDefaultAutoReplyMessage
      ? this.callbacks.getDefaultAutoReplyMessage()
      : "";
    let likeOnTipEnabled = true;
    let chainName = "Base Sepolia";
    let explorerBaseUrl = "https://sepolia.basescan.org/tx/";
    let referralLink = "grove.city";

    try {
      // Get JWT using callback
      if (this.callbacks.getActiveJWT) {
        jwt = (await this.callbacks.getActiveJWT()) || "";
      }

      // Get other settings from storage
      const result = await chrome.storage.local.get([
        STORAGE_KEYS.AUTO_REPLY,
        STORAGE_KEYS.AUTO_REPLY_MESSAGE,
        STORAGE_KEYS.REFERRAL_CODE,
        STORAGE_KEYS.LIKE_ON_TIP,
        STORAGE_KEYS.CHAIN,
        STORAGE_KEYS.ENDPOINT,
        STORAGE_KEYS.ENVIRONMENT,
      ]);

      // Use xActions from modal if provided, otherwise read from storage
      if (xActions) {
        likeOnTipEnabled = xActions.likeOnTip !== false;
        autoReplyEnabled = xActions.autoReply !== false;
        // Use custom message from modal if provided
        if (xActions.customMessage) {
          autoReplyMessage = xActions.customMessage;
        } else {
          autoReplyMessage =
            result[STORAGE_KEYS.AUTO_REPLY_MESSAGE] || autoReplyMessage;
        }
      } else {
        autoReplyEnabled = result[STORAGE_KEYS.AUTO_REPLY] !== false;
        likeOnTipEnabled = result[STORAGE_KEYS.LIKE_ON_TIP] !== false;
        autoReplyMessage =
          result[STORAGE_KEYS.AUTO_REPLY_MESSAGE] || autoReplyMessage;
      }
      const referralCode = result[STORAGE_KEYS.REFERRAL_CODE];
      if (referralCode) {
        referralLink = `https://grove.city/?ref=${encodeURIComponent(referralCode)}`;
      }
      console.log("[Grove TweetTipHandler] Storage loaded:", {
        hasJwt: !!jwt,
        autoReply: autoReplyEnabled,
        likeOnTip: likeOnTipEnabled,
        chain: result[STORAGE_KEYS.CHAIN],
        fromModal: !!xActions,
      });

      // Get friendly chain name and explorer URL from centralized config
      // Use testnet explorer URL when on localhost or testnet endpoints
      const rawChain = result[STORAGE_KEYS.CHAIN] || "base";
      const explorerChain = getExplorerChain(rawChain, result);
      const config = getChainConfig(explorerChain);
      chainName = config.name;
      explorerBaseUrl = `${config.explorerUrl}/tx/`;

      if (!jwt) {
        console.error("[Grove TweetTipHandler] No API key configured.");
        buttonWrapper.setError();
        if (this.callbacks.showInlineTipError) {
          this.callbacks.showInlineTipError(buttonWrapper.button, {
            message: "Missing tipping key in the extension settings.",
            variant: "error",
          });
        }
        return;
      }
    } catch (error) {
      console.error("[Grove TweetTipHandler] Settings load failed:", error);
      buttonWrapper.setError();
      if (this.callbacks.showInlineTipError) {
        this.callbacks.showInlineTipError(buttonWrapper.button, {
          message:
            error.message || "Could not read settings. Refresh and try again.",
          variant: "error",
        });
      }
      return;
    }

    // Determine tip destination: use cached address if available (from bio fetch)
    let tipDestination = tweetUrl;
    const username = this.callbacks.extractUsernameFromUrl
      ? this.callbacks.extractUsernameFromUrl(tweetUrl)
      : null;
    if (username && this.callbacks.getCachedAddress) {
      const cached = this.callbacks.getCachedAddress(username);
      if (cached && cached.address) {
        tipDestination = cached.address;
        console.log(
          `[Grove TweetTipHandler] Tipping to ${cached.type} address: ${tipDestination} (from @${username})`,
        );
      }
    }

    // Build context metadata for the tip
    const context = {
      source_post_url: tweetUrl,
      sender_platform: "x",
    };
    if (username) {
      context.recipient_username = username;
      context.recipient_profile_url = `https://x.com/${username}`;
    }

    // Add sender info if callback available
    if (this.callbacks.addXSenderInfo) {
      await this.callbacks.addXSenderInfo(context);
    }

    // Send tip via API with context
    const response = await GroveAPI.sendTip(
      tipDestination,
      tipAmount,
      jwt,
      context,
    );

    let parsedError = null;
    if (!response.success && typeof TipErrorHandler !== "undefined") {
      try {
        parsedError = TipErrorHandler.parse(response);
      } catch (e) {
        console.error("[Grove TweetTipHandler] Error parsing tip error:", e);
      }
    }

    if (response.success) {
      buttonWrapper.setSuccess();

      // Like and/or reply if X features are enabled (delegates to xFeatures.js)
      if (
        (likeOnTipEnabled || autoReplyEnabled) &&
        typeof performXActionsAfterTip === "function"
      ) {
        const xResult = await performXActionsAfterTip({
          tweetUrl,
          txHash: response.data?.tx_hash || "",
          likeEnabled: likeOnTipEnabled,
          replyEnabled: autoReplyEnabled,
          replyTemplate: autoReplyMessage,
          username,
          chainName,
          explorerBaseUrl,
          referralLink,
          amount: tipAmount,
        });

        const feedback = getXActionFeedback(xResult);
        if (feedback && this.callbacks.showInlineTipError) {
          setTimeout(() => {
            this.callbacks.showInlineTipError(buttonWrapper.button, feedback);
          }, 100);
        }
      }
    } else {
      console.error(
        "[Grove TweetTipHandler] Tweet tip failed:",
        response.error,
        response.data,
      );
      buttonWrapper.setError();
      if (this.callbacks.showInlineTipError) {
        const errorMessage =
          parsedError?.userMessage ||
          parsedError?.message ||
          response.error ||
          "Tip failed. Please try again.";
        this.callbacks.showInlineTipError(buttonWrapper.button, errorMessage);
      }
    }
  },
};

if (typeof window !== "undefined") {
  window.TweetTipHandler = TweetTipHandler;
}
