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

  // GitHub: github.com/username
  const githubMatch = bare.match(/^github\.com\/([^\/\?]+)\/?$/i);
  if (githubMatch) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: githubMatch[1] };
  }

  // TikTok: tiktok.com/@handle
  const tiktokMatch = bare.match(/^tiktok\.com\/@([^\/\?]+)/i);
  if (tiktokMatch) {
    return { profileUrl: `https://tiktok.com/@${tiktokMatch[1]}`, postUrl: null, profileHandle: `@${tiktokMatch[1]}` };
  }

  // Twitch: twitch.tv/username
  const twitchMatch = bare.match(/^twitch\.tv\/([^\/\?]+)\/?$/i);
  if (twitchMatch) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: twitchMatch[1] };
  }

  // Telegram: t.me/username
  const telegramMatch = bare.match(/^t\.me\/([^\/\?]+)\/?$/i);
  if (telegramMatch) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: `@${telegramMatch[1]}` };
  }

  // Instagram: instagram.com/username
  const instagramMatch = bare.match(/^instagram\.com\/([^\/\?]+)\/?$/i);
  if (instagramMatch) {
    const reserved = ['p', 'reel', 'stories', 'explore', 'accounts', 'direct'];
    if (!reserved.includes(instagramMatch[1].toLowerCase())) {
      return { profileUrl: fullUrl, postUrl: null, profileHandle: `@${instagramMatch[1]}` };
    }
  }

  // LinkedIn: linkedin.com/in/username
  const linkedinMatch = bare.match(/^linkedin\.com\/in\/([^\/\?]+)/i);
  if (linkedinMatch) {
    return { profileUrl: `https://linkedin.com/in/${linkedinMatch[1]}`, postUrl: null, profileHandle: linkedinMatch[1] };
  }

  // Medium: medium.com/@username or username.medium.com
  const mediumProfile = bare.match(/^medium\.com\/@([^\/\?]+)\/?$/i);
  if (mediumProfile) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: `@${mediumProfile[1]}` };
  }
  const mediumPost = bare.match(/^medium\.com\/@([^\/\?]+)\/(.+)/i);
  if (mediumPost) {
    return { profileUrl: `https://medium.com/@${mediumPost[1]}`, postUrl: fullUrl, profileHandle: `@${mediumPost[1]}` };
  }

  // Reddit: reddit.com/u/username or reddit.com/user/username
  const redditMatch = bare.match(/^reddit\.com\/(?:u|user)\/([^\/\?]+)/i);
  if (redditMatch) {
    return { profileUrl: `https://reddit.com/u/${redditMatch[1]}`, postUrl: null, profileHandle: `u/${redditMatch[1]}` };
  }

  // Bluesky: bsky.app/profile/handle
  const blueskyMatch = bare.match(/^bsky\.app\/profile\/([^\/\?]+)/i);
  if (blueskyMatch) {
    return { profileUrl: `https://bsky.app/profile/${blueskyMatch[1]}`, postUrl: null, profileHandle: blueskyMatch[1] };
  }

  // Grove: grove.city/handle
  const groveMatch = bare.match(/^grove\.city\/([^\/\?]+)\/?$/i);
  if (groveMatch) {
    return { profileUrl: fullUrl, postUrl: null, profileHandle: groveMatch[1] };
  }

  // For other URLs, return as postUrl with no handle
  return { profileUrl: null, postUrl: fullUrl, profileHandle: null };
}

if (typeof window !== 'undefined') {
  window.parseDestination = parseDestination;
}
