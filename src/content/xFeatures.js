/**
 * X (Twitter) Features for Content Script
 * Handles auto-reply message template building after tips
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
    message = message.replace(
      /{amount}/g,
      "$" + Number(data.amount).toFixed(2),
    );
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
  if (data.post_url) {
    message = message.replace(/{post_url}/g, data.post_url);
  } else {
    message = message.replace(/\s*\{post_url\}/g, "");
  }
  return message;
}

// Export to window for browser context
if (typeof window !== "undefined") {
  window.buildAutoReplyMessage = buildAutoReplyMessage;
}
