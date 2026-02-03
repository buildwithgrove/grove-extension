/**
 * X (Twitter) Features for Content Script
 * Handles like/reply/auto-reply after successful tips
 * Requires: src/auth/xAuth.js
 */

/**
 * Build auto-reply message from template
 * @param {string} template - Message template with placeholders
 * @param {Object} data - Data to fill placeholders
 * @returns {string}
 */
function buildAutoReplyMessage(template, data) {
  let message = template;
  if (data.username) {
    message = message.replace(/{username}/g, data.username);
  }
  if (data.amount != null) {
    message = message.replace(/{amount}/g, '$' + Number(data.amount).toFixed(2));
  }
  if (data.chain) {
    message = message.replace(/{chain}/g, data.chain);
  }
  if (data.tx_link) {
    message = message.replace(/{tx_link}/g, data.tx_link);
  }
  if (data.grove_link) {
    message = message.replace(/{grove_link}/g, data.grove_link);
  }
  if (data.referral_link) {
    message = message.replace(/{referral_link}/g, data.referral_link);
  }
  return message;
}

/**
 * Perform X actions (like/reply) after a successful tip
 * @param {Object} options - Options for X actions
 * @param {string} options.tweetUrl - URL of the tweet
 * @param {string} options.txHash - Transaction hash from tip response
 * @param {boolean} options.likeEnabled - Whether to like the tweet
 * @param {boolean} options.replyEnabled - Whether to post auto-reply
 * @param {string} options.replyTemplate - Template for auto-reply message
 * @param {string} options.username - Recipient username
 * @param {string} options.chainName - Chain name for reply message
 * @param {string} options.explorerBaseUrl - Block explorer base URL
 * @param {string} options.explorerSuffix - Block explorer URL suffix (e.g., ?cluster=devnet)
 * @param {string} options.referralLink - User's referral link (optional)
 * @param {number} options.amount - Tip amount in USD
 * @returns {Promise<{didLike: boolean, didReply: boolean, likeFailed: boolean, replyFailed: boolean}>}
 */
async function performXActionsAfterTip(options) {
  const {
    tweetUrl,
    txHash,
    likeEnabled,
    replyEnabled,
    replyTemplate,
    username,
    chainName,
    explorerBaseUrl,
    explorerSuffix = '',
    referralLink = '',
    amount
  } = options;

  const result = {
    didLike: false,
    didReply: false,
    likeFailed: false,
    replyFailed: false
  };

  // Check if XAuth is available
  if (typeof XAuth === 'undefined') {
    console.log('[Grove X Features] XAuth not available');
    return result;
  }

  // Check if any X features are enabled
  if (!likeEnabled && !replyEnabled) {
    return result;
  }

  try {
    // Extract tweet ID
    const tweetId = XAuth.extractTweetId(tweetUrl);
    if (!tweetId) {
      console.log('[Grove X Features] Could not extract tweet ID from URL');
      return result;
    }

    // Check if logged in to X
    const isLoggedIn = await XAuth.isLoggedIn();
    if (!isLoggedIn) {
      console.log('[Grove X Features] Not logged in to X');
      return result;
    }

    // Like the tweet if enabled
    if (likeEnabled) {
      try {
        await XAuth.likeTweet(tweetId);
        console.log('[Grove X Features] Tweet liked successfully');
        result.didLike = true;
      } catch (likeError) {
        // Don't fail if like fails (might already be liked or rate limited)
        console.error('[Grove X Features] Like failed:', likeError);
        result.likeFailed = true;
      }
    }

    // Post auto-reply if enabled
    if (replyEnabled && replyTemplate) {
      const txLink = `${explorerBaseUrl}${txHash}${explorerSuffix}`;

      // Build reply text from template
      const replyText = buildAutoReplyMessage(replyTemplate, {
        username: username,
        amount: amount,
        chain: chainName,
        tx_link: txLink,
        grove_link: 'grove.city',
        referral_link: referralLink || 'grove.city'
      });

      try {
        await XAuth.postReply(tweetId, replyText);
        console.log('[Grove X Features] Auto-reply posted successfully');
        result.didReply = true;
      } catch (replyError) {
        console.error('[Grove X Features] Reply failed:', replyError);
        result.replyFailed = true;
      }
    }
  } catch (error) {
    console.error('[Grove X Features] Error performing X actions:', error);
  }

  return result;
}

/**
 * Get feedback message based on X action results
 * @param {Object} result - Result from performXActionsAfterTip
 * @returns {{message: string, variant: string}|null}
 */
function getXActionFeedback(result) {
  const { didLike, didReply, likeFailed, replyFailed } = result;

  if (didLike || didReply) {
    // At least one action succeeded
    if (didLike && didReply) {
      return { message: 'Liked & replied! Refresh to view.', variant: 'success' };
    } else if (didLike) {
      return { message: 'Post liked! Refresh to view.', variant: 'success' };
    } else if (didReply) {
      return { message: 'Reply posted! Refresh to view.', variant: 'success' };
    }
  } else if (likeFailed || replyFailed) {
    // All attempted actions failed
    if (likeFailed && replyFailed) {
      return { message: 'Tip sent! Like/reply failed.', variant: 'warning' };
    } else if (likeFailed) {
      return { message: 'Tip sent! Like failed.', variant: 'warning' };
    } else if (replyFailed) {
      return { message: 'Tip sent! Reply failed.', variant: 'warning' };
    }
  }

  return null;
}

/**
 * Add sender info to tip context if X is authenticated
 * @param {Object} context - Tip context object to modify
 * @returns {Promise<void>}
 */
async function addXSenderInfo(context) {
  if (typeof XAuth === 'undefined') {
    return;
  }

  try {
    const senderInfo = await XAuth.getStoredUserInfo();
    // Only use if we have a real username (not the fallback 'Connected')
    if (senderInfo && senderInfo.username && senderInfo.username !== 'Connected') {
      context.sender_username = senderInfo.username;
      context.sender_profile_url = `https://x.com/${senderInfo.username}`;
    }
  } catch (e) {
    // Ignore - sender info is optional
  }
}

// Export to window for browser context
if (typeof window !== 'undefined') {
  window.buildAutoReplyMessage = buildAutoReplyMessage;
  window.performXActionsAfterTip = performXActionsAfterTip;
  window.getXActionFeedback = getXActionFeedback;
  window.addXSenderInfo = addXSenderInfo;
}
