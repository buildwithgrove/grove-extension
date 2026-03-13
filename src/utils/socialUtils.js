/**
 * Social URL normalization and display utilities
 * Used by popup.js for social link management
 */

/**
 * Normalize a social handle/URL to a full URL for a given platform
 * @param {string} platform - Platform key (e.g. 'x', 'youtube', 'github')
 * @param {string} input - Handle, username, or full URL
 * @returns {string} - Normalized URL
 */
function normalizeSocialUrl(platform, input) {
  const trimmed = input.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://"))
    return trimmed;
  const handle = trimmed.replace(/^@/, "");
  if (!handle) return trimmed;

  switch (platform) {
    case "x":
      return `https://x.com/${handle}`;
    case "github":
      return `https://github.com/${handle}`;
    case "youtube":
      return `https://youtube.com/@${handle}`;
    case "substack":
      return handle.includes(".")
        ? `https://${handle}`
        : `https://${handle}.substack.com`;
    case "instagram":
      return `https://instagram.com/${handle}`;
    case "linkedin":
      return handle.startsWith("in/")
        ? `https://linkedin.com/${handle}`
        : `https://linkedin.com/in/${handle}`;
    case "medium":
      return `https://medium.com/@${handle}`;
    case "reddit":
      return handle.startsWith("u/")
        ? `https://reddit.com/${handle}`
        : `https://reddit.com/u/${handle}`;
    case "soundcloud":
      return `https://soundcloud.com/${handle}`;
    case "tiktok":
      return `https://tiktok.com/@${handle}`;
    case "telegram":
      return `https://t.me/${handle}`;
    case "discord":
      return handle; // No URL normalization for Discord
    case "website":
      return handle.includes(".") ? `https://${handle}` : handle;
    default:
      return trimmed;
  }
}

/**
 * Extract a display label from a social link URL
 * @param {string} platform - Platform key
 * @param {string} url - Full URL
 * @returns {string} - Display-friendly label (e.g. username extracted from URL)
 */
function socialDisplayLabel(platform, url) {
  try {
    const u = new URL(url);
    if (platform === "website") return u.hostname;
    const path = u.pathname.replace(/^\//, "").replace(/\/$/, "");
    if (path) {
      return path.replace(/^[@]/, "").replace(/^(in|u)\//, "");
    }
  } catch (_) {}
  return url.replace(/^@/, "").replace(/^https?:\/\//, "");
}

// Export to window for browser context
if (typeof window !== "undefined") {
  window.normalizeSocialUrl = normalizeSocialUrl;
  window.socialDisplayLabel = socialDisplayLabel;
}
