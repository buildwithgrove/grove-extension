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

  // Strip protocol + www for pattern matching
  const bare = destination.replace(/^https?:\/\/(www\.)?/i, '');

  // X / Twitter status URL
  const statusMatch = bare.match(/^(x\.com|twitter\.com)\/([^\/]+)\/status\/(\d+)/i);
  if (statusMatch) {
    const username = statusMatch[2];
    return {
      profileUrl: `https://${statusMatch[1]}/${username}`,
      postUrl: fullUrl,
      profileHandle: `@${username}`
    };
  }

  // X / Twitter profile
  const twitterProfile = bare.match(/^(x\.com|twitter\.com)\/([^\/\?]+)\/?$/i);
  if (twitterProfile) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: `@${twitterProfile[2]}` };
  }

  // YouTube channel: youtube.com/@handle
  const ytHandle = bare.match(/^youtube\.com\/@([^\/\?]+)/i);
  if (ytHandle) {
    return {
      profileUrl: `https://youtube.com/@${ytHandle[1]}`,
      postUrl: null,
      profileHandle: `@${ytHandle[1]}`
    };
  }

  // YouTube channel: youtube.com/c/name
  const ytChannel = bare.match(/^youtube\.com\/c\/([^\/\?]+)/i);
  if (ytChannel) {
    return { profileUrl: `https://youtube.com/c/${ytChannel[1]}`, postUrl: null, profileHandle: ytChannel[1] };
  }

  // YouTube video — keep as postUrl, no handle
  if (/^youtube\.com\/watch/i.test(bare)) {
    return { profileUrl: null, postUrl: fullUrl, profileHandle: null };
  }

  // Substack profile: substack.com/@author
  const substackProfile = bare.match(/^substack\.com\/@([^\/\?]+)/i);
  if (substackProfile) {
    return {
      profileUrl: `https://substack.com/@${substackProfile[1]}`,
      postUrl: null,
      profileHandle: `@${substackProfile[1]}`
    };
  }

  // Substack subdomain: author.substack.com (profile or post page)
  const substackSub = bare.match(/^([^.]+)\.substack\.com(\/[^?]*)?/i);
  if (substackSub) {
    const author = substackSub[1];
    const hasPath = substackSub[2] && substackSub[2].length > 1;
    return {
      profileUrl: `https://${author}.substack.com`,
      postUrl: hasPath ? fullUrl : null,
      profileHandle: author
    };
  }

  // SoundCloud: soundcloud.com/artist
  const soundcloudMatch = bare.match(/^soundcloud\.com\/([^\/\?]+)\/?$/i);
  if (soundcloudMatch) {
    const reserved = ['stream', 'discover', 'upload', 'pages', 'jobs', 'imprint', 'legal'];
    if (!reserved.includes(soundcloudMatch[1].toLowerCase())) {
      return { profileUrl: fullUrl, postUrl: null, profileHandle: soundcloudMatch[1] };
    }
  }

  // For other URLs, return as postUrl with no handle
  return { profileUrl: null, postUrl: fullUrl, profileHandle: null };
}

if (typeof window !== 'undefined') {
  window.parseDestination = parseDestination;
}
