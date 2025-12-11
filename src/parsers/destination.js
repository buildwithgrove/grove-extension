/**
 * Destination Parser
 * Parses tip destinations to extract profile URLs, post URLs, and handles
 */

/**
 * Parse destination to extract profile URL and check if it's a specific post
 * @param {string} destination - The destination string (URL, ENS name, etc.)
 * @returns {{ profileUrl: string|null, postUrl: string|null, profileHandle: string|null }}
 */
function parseDestination(destination) {
  if (!destination) return { profileUrl: null, postUrl: null, profileHandle: null };

  // Check if it's a .base.eth name
  if (destination.endsWith('.base.eth')) {
    const name = destination.replace('.base.eth', '');
    return {
      profileUrl: `https://www.base.org/name/${encodeURIComponent(name)}`,
      postUrl: null,
      profileHandle: destination
    };
  }

  // Check if it's a .eth name (but not .base.eth)
  if (destination.endsWith('.eth')) {
    return {
      profileUrl: `https://app.ens.domains/${encodeURIComponent(destination)}`,
      postUrl: null,
      profileHandle: destination
    };
  }

  // Normalize: add https if needed
  const fullUrl = destination.startsWith('http') ? destination : `https://${destination}`;

  // Check if it's a Twitter/X status URL
  const statusMatch = destination.match(/^(x\.com|twitter\.com)\/([^\/]+)\/status\/(\d+)/i);
  if (statusMatch) {
    const domain = statusMatch[1];
    const username = statusMatch[2];
    return {
      profileUrl: `https://${domain}/${username}`,
      postUrl: fullUrl,
      profileHandle: `@${username}`
    };
  }

  // Check if it's just a Twitter/X profile
  const profileMatch = destination.match(/^(x\.com|twitter\.com)\/([^\/]+)\/?$/i);
  if (profileMatch) {
    const username = profileMatch[2];
    return {
      profileUrl: fullUrl,
      postUrl: null,
      profileHandle: `@${username}`
    };
  }

  // For other URLs, just return the destination as-is
  return {
    profileUrl: null,
    postUrl: fullUrl,
    profileHandle: null
  };
}

if (typeof window !== 'undefined') {
  window.parseDestination = parseDestination;
}

export { parseDestination };
