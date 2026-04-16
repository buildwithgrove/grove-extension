/**
 * Leaderboard Renderer Module
 * Pure rendering functions for leaderboard entries
 */

const LeaderboardRenderer = {
  // SVG Icons
  icons: {
    dollar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    xPlatform: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    link: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    // Platform icons
    grove: '<svg width="14" height="14" viewBox="0 0 100 100" fill="currentColor"><path d="M50 5C25.1 5 5 25.1 5 50s20.1 45 45 45 45-20.1 45-45S74.9 5 50 5zm0 80c-19.3 0-35-15.7-35-35s15.7-35 35-35 35 15.7 35 35-15.7 35-35 35z"/><path d="M50 25c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm0 40c-8.3 0-15-6.7-15-15s6.7-15 15-15 15 6.7 15 15-6.7 15-15 15z"/></svg>',
    substack: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg>',
    soundcloud: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.015 0-.024.015-.024.03l-.315 1.956.315 1.956c0 .015.009.03.024.03.015 0 .024-.015.024-.03l.362-1.956-.362-1.956c0-.015-.01-.03-.024-.03zm.849-.691c-.02 0-.032.015-.032.035l-.285 2.647.285 2.647c0 .02.013.035.032.035.02 0 .032-.015.032-.035l.324-2.647-.324-2.647c0-.02-.013-.035-.032-.035zm.857-.333c-.024 0-.04.017-.04.041l-.256 2.98.256 2.98c0 .024.016.041.04.041.024 0 .04-.017.04-.041l.29-2.98-.29-2.98c0-.024-.016-.041-.04-.041zm.867-.198c-.027 0-.047.02-.047.047l-.227 3.178.227 3.178c0 .027.02.047.047.047.027 0 .047-.02.047-.047l.258-3.178-.258-3.178c0-.027-.02-.047-.047-.047zm.877-.118c-.031 0-.054.023-.054.054l-.2 3.296.2 3.296c0 .031.023.054.054.054.031 0 .054-.023.054-.054l.228-3.296-.228-3.296c0-.031-.023-.054-.054-.054zm.888-.067c-.035 0-.062.027-.062.062l-.173 3.363.173 3.363c0 .035.027.062.062.062.035 0 .062-.027.062-.062l.196-3.363-.196-3.363c0-.035-.027-.062-.062-.062zm.9-.037c-.038 0-.068.03-.068.068l-.147 3.4.147 3.4c0 .038.03.068.068.068.038 0 .068-.03.068-.068l.167-3.4-.167-3.4c0-.038-.03-.068-.068-.068zm5.765-2.158c-.19-.064-.39-.096-.592-.096-1.072 0-1.94.868-1.94 1.94v.02l-.098 5.695.098 1.007c.014.502.422.9.924.9.502 0 .91-.398.924-.9l.108-1.007-.108-5.695c0-.502.376-.91.876-.924zm1.35-.557c-.208 0-.413.038-.607.112-.173-1.784-1.676-3.178-3.507-3.178-1.831 0-3.334 1.394-3.507 3.178-.193-.074-.4-.112-.607-.112-1.072 0-1.94.868-1.94 1.94l-.094 5.624.094 1.07c.014.502.422.9.924.9.502 0 .91-.398.924-.9l.107-1.07-.107-5.624c0-.502.408-.91.91-.91.502 0 .91.408.91.91v.02l-.095 5.604.095 1.07c.014.502.422.9.924.9.502 0 .91-.398.924-.9l.108-1.07-.108-5.624c0-.502.408-.91.91-.91h.02c.52 0 .938.42.938.94v.04l-.093 5.584.093 1.07c.014.502.422.9.924.9.502 0 .91-.398.924-.9l.108-1.07-.108-5.624c0-.52.42-.94.94-.94.52 0 .94.42.94.94l-.1 5.624.1 1.07c.014.502.422.9.924.9.502 0 .91-.398.924-.9l.108-1.07-.108-5.624c0-1.072-.868-1.94-1.94-1.94z"/></svg>',
    github: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
    tiktok: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
    twitch: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/></svg>',
    telegram: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="m9.417 15.181-.397 5.584c.568 0 .814-.244 1.109-.537l2.663-2.545 5.518 4.041c1.012.564 1.725.267 1.998-.931l3.622-16.972.001-.001c.321-1.496-.541-2.081-1.527-1.714l-21.29 8.151c-1.453.564-1.431 1.374-.247 1.741l5.443 1.693 12.643-7.911c.595-.394 1.136-.176.691.218z"/></svg>',
    facebook: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    discord: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>',
    instagram: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>',
    linkedin: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
    medium: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>',
    reddit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>',
    bluesky: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364.136-.02.275-.039.415-.056-.138.022-.276.04-.415.056-3.912.58-7.387 2.005-2.83 7.078 5.013 5.19 6.87-1.113 7.823-4.308.953 3.195 2.05 9.271 7.733 4.308 4.267-4.308 1.172-6.498-2.74-7.078a8.741 8.741 0 0 1-.415-.056c.14.017.279.036.415.056 2.67.297 5.568-.628 6.383-3.364.246-.828.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.664-.62-4.3 1.24C16.046 4.748 13.087 8.687 12 10.8z"/></svg>',
    base: '<svg width="14" height="14" viewBox="0 0 111 111" fill="currentColor"><path d="M54.921 110.034c30.291 0 54.86-24.569 54.86-54.86S85.212.314 54.921.314C26.042.314 2.128 22.678.079 51.334h72.102v7.396H.08c2.048 28.656 25.963 51.304 54.842 51.304z"/></svg>',
    ens: '<svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor"><path d="M10.502 6.748c.509-.841 1.437-1.322 2.382-1.322a2.7 2.7 0 011.404.403l18.09 11.19a3.4 3.4 0 011.467 2.292c.088.491.04.898.04 1.475l-.002 8.99c-.022.55-.088 1.16-.44 1.74l-5.854 9.678a.32.32 0 01-.556-.025l-.027-.072-5.476-17.52a3.74 3.74 0 01.02-2.213l3.62-10.72a.26.26 0 00-.347-.327l-12.98 6.067a.32.32 0 01-.465-.295l.002-8.56c.001-.32.041-.545.122-.782zm26.996 34.504c-.509.841-1.437 1.322-2.382 1.322a2.7 2.7 0 01-1.404-.403l-18.09-11.19a3.4 3.4 0 01-1.467-2.292c-.088-.491-.04-.898-.04-1.475l.002-8.99c.022-.55.088-1.16.44-1.74l5.854-9.678a.32.32 0 01.556.025l.027.072 5.476 17.52a3.74 3.74 0 01-.02 2.213l-3.62 10.72a.26.26 0 00.347.327l12.98-6.067a.32.32 0 01.465.295l-.002 8.56c-.001.32-.041.545-.122.782z"/></svg>',
    youtube: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
    globe: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>'
  },

  /**
   * Get block explorer URL for a transaction
   * @param {string} network - Network name
   * @param {string} txHash - Transaction hash
   * @returns {string|null} Explorer URL
   */
  getExplorerUrl(network, txHash) {
    if (!txHash) return null;

    const normalized = (network || '').toLowerCase().replace(/_/g, '-');

    if (normalized.includes('base')) {
      const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
      const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
      return `${baseUrl}/tx/${txHash}`;
    }

    if (normalized.includes('solana') || normalized.includes('sol')) {
      const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
      const cluster = isDevnet ? '?cluster=devnet' : '';
      return `https://solscan.io/tx/${txHash}${cluster}`;
    }

    return `https://basescan.org/tx/${txHash}`;
  },

  /**
   * Get block explorer URL for an address
   * @param {string} network - Network name
   * @param {string} address - Wallet address
   * @returns {string|null} Explorer URL
   */
  getAddressExplorerUrl(network, address) {
    if (!address) return null;

    const normalized = (network || '').toLowerCase().replace(/_/g, '-');

    if (normalized.includes('base')) {
      const isTestnet = normalized.includes('sepolia') || normalized.includes('testnet');
      const baseUrl = isTestnet ? 'https://sepolia.basescan.org' : 'https://basescan.org';
      return `${baseUrl}/address/${address}`;
    }

    if (normalized.includes('solana') || normalized.includes('sol')) {
      const isDevnet = normalized.includes('devnet') || normalized.includes('testnet');
      const cluster = isDevnet ? '?cluster=devnet' : '';
      return `https://solscan.io/account/${address}${cluster}`;
    }

    return `https://basescan.org/address/${address}`;
  },

  /**
   * Get URL for the tipped content
   * @param {string} destination - Destination string
   * @returns {string|null} Full URL
   */
  getDestinationUrl(destination) {
    if (!destination) return null;

    if (destination.startsWith('http://') || destination.startsWith('https://')) {
      return destination;
    }

    return `https://${destination}`;
  },

  /**
   * Check if URL is Twitter/X
   * @param {string} url - URL to check
   * @returns {boolean}
   */
  isTwitterUrl(url) {
    return url && (url.includes('x.com') || url.includes('twitter.com'));
  },

  /**
   * Build platform link HTML (X icon for Twitter)
   * @param {string} url - Platform URL
   * @param {boolean} isTwitter - Whether it's a Twitter link
   * @returns {string} HTML string
   */
  buildPlatformLink(url, isTwitter) {
    if (isTwitter && url) {
      return `<a href="${FormatUtils.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="history-platform-link" title="View on X">${this.icons.xPlatform}</a>`;
    }
    return '<span class="history-platform-link history-platform-link-empty"></span>';
  },

  /**
   * Build transaction link HTML
   * @param {string} network - Network name
   * @param {string} txHash - Transaction hash
   * @returns {string} HTML string
   */
  buildTxLink(network, txHash) {
    const explorerUrl = this.getExplorerUrl(network, txHash);
    if (explorerUrl) {
      return `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="history-tx-link" title="View transaction">${this.icons.link}</a>`;
    }
    return '<span class="history-tx-link history-tx-link-empty"></span>';
  },

  /**
   * Format address with shorter truncation (8 chars total)
   * @param {string} address - Wallet address
   * @returns {string} Shortened address (4...4)
   */
  formatAddressShort(address) {
    if (!address) return 'Unknown';
    if (address.length <= 10) return address;
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  },

  /**
   * Detect platform from URL or destination
   * @param {string} destination - URL or destination string
   * @returns {string} Platform name or null
   */
  detectPlatform(destination) {
    if (!destination) return null;
    const lower = destination.toLowerCase();
    if (lower.includes('x.com') || lower.includes('twitter.com')) return 'x';
    if (lower.includes('youtube.com')) return 'youtube';
    if (lower.includes('substack.com')) return 'substack';
    if (lower.includes('soundcloud.com')) return 'soundcloud';
    if (lower.includes('github.com')) return 'github';
    if (lower.includes('tiktok.com')) return 'tiktok';
    if (lower.includes('twitch.tv')) return 'twitch';
    if (lower.includes('t.me') || lower.includes('telegram.me') || lower.includes('telegram.org')) return 'telegram';
    if (lower.includes('facebook.com') || lower.includes('fb.com')) return 'facebook';
    if (lower.includes('discord.com') || lower.includes('discord.gg')) return 'discord';
    if (lower.includes('instagram.com')) return 'instagram';
    if (lower.includes('linkedin.com')) return 'linkedin';
    if (lower.includes('medium.com')) return 'medium';
    if (lower.includes('reddit.com')) return 'reddit';
    if (lower.includes('bsky.app') || lower.includes('bsky.social')) return 'bluesky';
    if (lower.includes('grove.city')) return 'grove';
    if (lower.includes('base.org') || lower.includes('basescan.org')) return 'base';
    if (lower.includes('ens.domains') || lower.endsWith('.eth')) return 'ens';
    if (lower.includes('http') || lower.includes('www.') || lower.includes('.com') || lower.includes('.org') || lower.includes('.io')) {
      return 'website';
    }
    return null;
  },

  /**
   * Get platform icon HTML with link
   * @param {string} platform - Platform name
   * @param {string} url - URL to link to
   * @returns {string} HTML string
   */
  getPlatformIcon(platform, url) {
    const iconMap = {
      'x': { icon: this.icons.xPlatform, title: 'View on X', cssClass: 'platform-x' },
      'youtube': { icon: this.icons.youtube, title: 'View on YouTube', cssClass: 'platform-youtube' },
      'substack': { icon: this.icons.substack, title: 'View on Substack', cssClass: 'platform-substack' },
      'soundcloud': { icon: this.icons.soundcloud, title: 'View on SoundCloud', cssClass: 'platform-soundcloud' },
      'github': { icon: this.icons.github, title: 'View on GitHub', cssClass: 'platform-github' },
      'tiktok': { icon: this.icons.tiktok, title: 'View on TikTok', cssClass: 'platform-tiktok' },
      'twitch': { icon: this.icons.twitch, title: 'View on Twitch', cssClass: 'platform-twitch' },
      'telegram': { icon: this.icons.telegram, title: 'View on Telegram', cssClass: 'platform-telegram' },
      'facebook': { icon: this.icons.facebook, title: 'View on Facebook', cssClass: 'platform-facebook' },
      'discord': { icon: this.icons.discord, title: 'View on Discord', cssClass: 'platform-discord' },
      'instagram': { icon: this.icons.instagram, title: 'View on Instagram', cssClass: 'platform-instagram' },
      'linkedin': { icon: this.icons.linkedin, title: 'View on LinkedIn', cssClass: 'platform-linkedin' },
      'medium': { icon: this.icons.medium, title: 'View on Medium', cssClass: 'platform-medium' },
      'reddit': { icon: this.icons.reddit, title: 'View on Reddit', cssClass: 'platform-reddit' },
      'bluesky': { icon: this.icons.bluesky, title: 'View on Bluesky', cssClass: 'platform-bluesky' },
      'grove': { icon: this.icons.grove, title: 'View on Grove', cssClass: 'platform-grove' },
      'base': { icon: this.icons.base, title: 'View on Base', cssClass: 'platform-base' },
      'ens': { icon: this.icons.ens, title: 'View on ENS', cssClass: 'platform-ens' },
      'website': { icon: this.icons.globe, title: 'Visit website', cssClass: 'platform-website' }
    };

    const config = iconMap[platform];
    if (!config || !url) {
      return '<span class="history-platform-link history-platform-link-empty"></span>';
    }

    return `<a href="${FormatUtils.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="history-platform-link platform-icon ${config.cssClass}" title="${FormatUtils.escapeHtml(config.title)}">${config.icon}</a>`;
  },

  /**
   * Get display name for leaderboard entry with priority logic
   * Priority: handle > base_name > ens_name > context username > parsed handle > address
   * @param {Object} entry - Leaderboard entry
   * @param {boolean} isEarner - Whether this is an earner entry (affects context field name)
   * @returns {Object} { displayName, url, platform }
   */
  getDisplayName(entry, isEarner = false) {
    const ctx = entry.lastTipContext || {};
    const parsed = entry.lastTipDestination ? parseDestination(entry.lastTipDestination) : {};

    // 1. Grove handle (from API)
    if (entry.handle) {
      return {
        displayName: entry.handle,
        url: `https://grove.city/${encodeURIComponent(entry.handle)}`,
        platform: 'grove'
      };
    }

    // 2. Base name
    if (entry.base_name) {
      return {
        displayName: entry.base_name,
        url: `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`,
        platform: 'base'
      };
    }

    // 3. ENS name
    if (entry.ens_name) {
      return {
        displayName: entry.ens_name,
        url: `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`,
        platform: 'ens'
      };
    }

    // 4. Context username (recipient for earners, sender for tippers)
    const username = isEarner ? ctx.recipient_username : ctx.sender_username;
    const profileUrl = isEarner ? ctx.recipient_profile_url : ctx.sender_profile_url;
    if (username) {
      const url = profileUrl || `https://x.com/${encodeURIComponent(username)}`;
      return {
        displayName: `@${username}`,
        url: url,
        platform: 'x'
      };
    }

    // 5. Parsed profile handle from destination
    if (parsed.profileHandle && parsed.profileUrl) {
      const platform = this.detectPlatform(parsed.profileUrl);
      return {
        displayName: parsed.profileHandle,
        url: parsed.profileUrl,
        platform: platform
      };
    }

    // 6. Fallback to address (shorter truncation)
    const addressUrl = this.getAddressExplorerUrl(entry.network, entry.address);
    return {
      displayName: this.formatAddressShort(entry.address),
      url: addressUrl,
      platform: null
    };
  },

  /**
   * Render a top tipper entry
   * @param {Object} entry - Tipper entry data
   * @param {number} index - Rank index (0-based)
   * @returns {string} HTML string
   */
  renderTipperEntry(entry, index) {
    const ctx = entry.topTipContext || entry.lastTipContext || {};
    const tipDest = entry.topTipDestination || entry.lastTipDestination;
    const parsed = tipDest ? parseDestination(tipDest) : {};

    const rankIcon = `<span class="rank-number">${index + 1}</span>`;

    // Get display name for the tipper
    const display = this.getDisplayName(entry, false);
    const labelHtml = display.url
      ? `<a href="${FormatUtils.escapeHtml(display.url)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(display.displayName)}</a>`
      : FormatUtils.escapeHtml(display.displayName);

    // Platform icon for the tipper
    const platformLinkHtml = this.getPlatformIcon(display.platform, display.url);

    const tipLabel = entry.topTipContext ? 'Top tip' : 'Latest tip';
    let descriptionHtml;
    if (ctx.recipient_username) {
      const postUrl = ctx.source_post_url || parsed.postUrl;
      const profileUrl = ctx.recipient_profile_url || `https://x.com/${ctx.recipient_username}`;
      const linkUrl = postUrl || profileUrl;
      const linkText = postUrl ? `@${FormatUtils.escapeHtml(ctx.recipient_username)}'s post` : `@${FormatUtils.escapeHtml(ctx.recipient_username)}`;
      descriptionHtml = `${tipLabel}: <a href="${FormatUtils.escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else if (parsed.profileHandle) {
      const linkUrl = parsed.postUrl || parsed.profileUrl;
      const linkText = parsed.postUrl ? `${FormatUtils.escapeHtml(parsed.profileHandle)}'s post` : FormatUtils.escapeHtml(parsed.profileHandle);
      descriptionHtml = `${tipLabel}: <a href="${FormatUtils.escapeHtml(linkUrl)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${linkText}</a>`;
    } else {
      descriptionHtml = `${entry.tipCount.toLocaleString()} tips sent`;
    }

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a top earner entry
   * @param {Object} entry - Earner entry data
   * @param {number} index - Rank index (0-based)
   * @returns {string} HTML string
   */
  renderEarnerEntry(entry, index) {
    const rankIcon = `<span class="rank-number">${index + 1}</span>`;

    // Get display name for the earner
    const display = this.getDisplayName(entry, true);
    const labelHtml = display.url
      ? `<a href="${FormatUtils.escapeHtml(display.url)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(display.displayName)}</a>`
      : FormatUtils.escapeHtml(display.displayName);

    const descriptionHtml = `${entry.tipCount.toLocaleString()} tips received`;

    // Platform icon for the earner
    const platformLinkHtml = this.getPlatformIcon(display.platform, display.url);

    return `
      <div class="transaction-item">
        <div class="transaction-item-icon rank-icon">${rankIcon}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">${descriptionHtml}</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.totalUSD)}</div>
          <div class="transaction-item-time">${entry.tipCount} tips</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a live tip entry
   * @param {Object} entry - Live tip entry data
   * @param {boolean} isNew - Whether this is a new entry (for animation)
   * @returns {string} HTML string
   */
  renderLiveTipEntry(entry, isNew = false) {
    const parsed = parseDestination(entry.destination);
    const ctx = entry.context || {};

    // Build display info for recipient using similar priority logic
    let displayName, displayUrl, displayPlatform;

    // 1. Grove handle
    if (entry.handle) {
      displayName = entry.handle;
      displayUrl = `https://grove.city/${encodeURIComponent(entry.handle)}`;
      displayPlatform = 'grove';
    }
    // 2. Base name
    else if (entry.base_name) {
      displayName = entry.base_name;
      displayUrl = `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`;
      displayPlatform = 'base';
    }
    // 3. ENS name
    else if (entry.ens_name) {
      displayName = entry.ens_name;
      displayUrl = `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`;
      displayPlatform = 'ens';
    }
    // 4. Context recipient username
    else if (ctx.recipient_username) {
      displayName = `@${ctx.recipient_username}`;
      displayUrl = ctx.recipient_profile_url || `https://x.com/${encodeURIComponent(ctx.recipient_username)}`;
      displayPlatform = 'x';
    }
    // 5. Parsed handle
    else if (parsed.profileHandle && parsed.profileUrl) {
      displayName = parsed.profileHandle;
      displayUrl = parsed.profileUrl;
      displayPlatform = this.detectPlatform(parsed.profileUrl);
    }
    // 6. Address fallback
    else {
      displayName = this.formatAddressShort(entry.address);
      displayUrl = this.getAddressExplorerUrl(entry.network, entry.address);
      displayPlatform = null;
    }

    const labelHtml = displayUrl
      ? `<a href="${FormatUtils.escapeHtml(displayUrl)}" target="_blank" rel="noopener noreferrer" class="transaction-item-desc-link">${FormatUtils.escapeHtml(displayName)}</a>`
      : FormatUtils.escapeHtml(displayName);

    const platformLinkHtml = this.getPlatformIcon(displayPlatform, displayUrl);
    const txLinkHtml = this.buildTxLink(entry.network, entry.txHash);

    return `
      <div class="transaction-item${isNew ? ' new' : ''}">
        <div class="transaction-item-icon tip_received">${this.icons.dollar}</div>
        <div class="transaction-item-details">
          <div class="transaction-item-label">${labelHtml}</div>
          <div class="transaction-item-description">Earned</div>
        </div>
        <div class="transaction-item-right">
          <div class="transaction-item-amount received">${FormatUtils.formatUSD(entry.amountUSD)}</div>
          <div class="transaction-item-time">${FormatUtils.formatTimeAgo(entry.confirmedAt)}</div>
        </div>
        <div class="transaction-item-links">
          ${platformLinkHtml}
          ${txLinkHtml}
        </div>
      </div>
    `;
  },

  /**
   * Render a list of tipper entries
   * @param {Array} entries - Array of tipper entries
   * @returns {string} HTML string
   */
  renderTippersList(entries) {
    return this.renderTippersTable(entries);
  },

  /**
   * Render a list of earner entries
   * @param {Array} entries - Array of earner entries
   * @returns {string} HTML string
   */
  renderEarnersList(entries) {
    return this.renderEarnersTable(entries);
  },

  /**
   * Render a list of live tip entries
   * @param {Array} entries - Array of live tip entries
   * @param {Set} newTxHashes - Set of new transaction hashes (for animation)
   * @returns {string} HTML string
   */
  renderLiveTipsList(entries, newTxHashes = new Set()) {
    return this.renderLiveTipsTable(entries, newTxHashes);
  },

  // ---- Table-based rendering ----

  /**
   * Get rank class for top 3 positions
   * @param {number} index - 0-based rank index
   * @returns {string} CSS class name
   */
  getRankClass(index) {
    if (index === 0) return 'rank1';
    if (index === 1) return 'rank2';
    if (index === 2) return 'rank3';
    return '';
  },

  /**
   * Build platform icon cell HTML for table
   * @param {string} platform - Platform name
   * @param {string} url - URL to link to
   * @returns {string} HTML string for td content
   */
  buildPlatformIconCell(platform, url) {
    const iconMap = {
      'x': { icon: this.icons.xPlatform, title: 'View on X' },
      'substack': { icon: this.icons.substack, title: 'View on Substack' },
      'youtube': { icon: this.icons.youtube, title: 'View on YouTube' },
      'grove': { icon: this.icons.grove, title: 'View on Grove' },
      'base': { icon: this.icons.base, title: 'View on Base' },
      'ens': { icon: this.icons.ens, title: 'View on ENS' },
      'website': { icon: this.icons.globe, title: 'Visit website' }
    };

    const config = iconMap[platform];
    if (!config || !url) return '';

    return `<a href="${FormatUtils.escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${config.title}">${config.icon}</a>`;
  },

  /**
   * Get the tipped content platform and URL from entry context/destination
   * @param {Object} entry - Leaderboard entry with lastTipContext/lastTipDestination or context/destination
   * @returns {{ platform: string|null, url: string|null }}
   */
  getContentPlatform(entry) {
    // Only surface actual content platforms, not identity platforms
    const contentPlatforms = new Set(['x', 'substack', 'youtube', 'website']);
    // Prefer top tip (highest volume) over last tip for more meaningful display
    const ctx = entry.topTipContext || entry.lastTipContext || entry.context || {};
    const destination = entry.topTipDestination || entry.lastTipDestination || entry.destination;

    // Prefer source post URL (most specific content link)
    const contentUrl = ctx.source_post_url || destination;
    if (contentUrl) {
      const url = this.getDestinationUrl(contentUrl);
      const platform = this.detectPlatform(contentUrl);
      if (contentPlatforms.has(platform) && url) return { platform, url };
    }

    // Fall back to profile URL from context
    const profileUrl = ctx.recipient_profile_url || ctx.sender_profile_url;
    if (profileUrl) {
      const platform = this.detectPlatform(profileUrl);
      if (contentPlatforms.has(platform)) return { platform, url: profileUrl };
    }

    return { platform: null, url: null };
  },

  /**
   * Render tippers as a table
   * @param {Array} entries - Array of tipper entries
   * @returns {string} HTML table string
   */
  renderTippersTable(entries) {
    const rows = entries.map((entry, i) => {
      const display = this.getDisplayName(entry, false);
      const rankClass = this.getRankClass(i);
      const nameHtml = display.url
        ? `<a href="${FormatUtils.escapeHtml(display.url)}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(display.displayName)}</a>`
        : FormatUtils.escapeHtml(display.displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      return `<tr>
        <td class="lb-col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">${entry.tipCount.toLocaleString()} tips sent</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.totalUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render earners as a table
   * @param {Array} entries - Array of earner entries
   * @returns {string} HTML table string
   */
  renderEarnersTable(entries) {
    const rows = entries.map((entry, i) => {
      const display = this.getDisplayName(entry, true);
      const rankClass = this.getRankClass(i);
      const nameHtml = display.url
        ? `<a href="${FormatUtils.escapeHtml(display.url)}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(display.displayName)}</a>`
        : FormatUtils.escapeHtml(display.displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      return `<tr>
        <td class="lb-col-rank"><span class="lb-rank ${rankClass}">${i + 1}</span></td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">${entry.tipCount.toLocaleString()} tips earned</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.totalUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render live tips as a table
   * @param {Array} entries - Array of live tip entries
   * @param {Set} newTxHashes - Set of new transaction hashes (for animation)
   * @returns {string} HTML table string
   */
  renderLiveTipsTable(entries, newTxHashes = new Set()) {
    const rows = entries.map(entry => {
      const isNew = newTxHashes.has(entry.txHash);
      const parsed = parseDestination(entry.destination);
      const ctx = entry.context || {};

      // Build display info for recipient
      let displayName, displayUrl, displayPlatform;
      if (entry.handle) {
        displayName = entry.handle;
        displayUrl = `https://grove.city/${encodeURIComponent(entry.handle)}`;
        displayPlatform = 'grove';
      } else if (entry.base_name) {
        displayName = entry.base_name;
        displayUrl = `https://www.base.org/name/${encodeURIComponent(entry.base_name)}`;
        displayPlatform = 'base';
      } else if (entry.ens_name) {
        displayName = entry.ens_name;
        displayUrl = `https://app.ens.domains/${encodeURIComponent(entry.ens_name)}`;
        displayPlatform = 'ens';
      } else if (ctx.recipient_username) {
        displayName = `@${ctx.recipient_username}`;
        displayUrl = ctx.recipient_profile_url || `https://x.com/${encodeURIComponent(ctx.recipient_username)}`;
        displayPlatform = 'x';
      } else if (parsed.profileHandle && parsed.profileUrl) {
        displayName = parsed.profileHandle;
        displayUrl = parsed.profileUrl;
        displayPlatform = this.detectPlatform(parsed.profileUrl);
      } else {
        displayName = this.formatAddressShort(entry.address);
        displayUrl = this.getAddressExplorerUrl(entry.network, entry.address);
        displayPlatform = null;
      }

      const nameHtml = displayUrl
        ? `<a href="${FormatUtils.escapeHtml(displayUrl)}" target="_blank" rel="noopener noreferrer">${FormatUtils.escapeHtml(displayName)}</a>`
        : FormatUtils.escapeHtml(displayName);
      const content = this.getContentPlatform(entry);
      const platformCell = this.buildPlatformIconCell(content.platform, content.url);

      // Time column: tx-linked "Xm ago"
      const timeText = FormatUtils.formatTimeAgo(entry.confirmedAt);
      const explorerUrl = this.getExplorerUrl(entry.network, entry.txHash);
      const timeHtml = explorerUrl
        ? `<a href="${explorerUrl}" target="_blank" rel="noopener noreferrer" class="lb-time-link">${timeText}</a>`
        : `<span class="lb-time-link">${timeText}</span>`;

      return `<tr${isNew ? ' class="lb-new"' : ''}>
        <td class="lb-col-time">${timeHtml}</td>
        <td class="lb-col-user">
          <span class="lb-user-name">${nameHtml}</span>
          <span class="lb-user-meta">earned tip</span>
        </td>
        <td class="lb-col-amount">${FormatUtils.formatUSD(entry.amountUSD)}</td>
        <td class="lb-col-content">${platformCell}</td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  /**
   * Render a skeleton loading table
   * @param {boolean} isLive - Whether this is the live view (uses time column instead of rank)
   * @param {number} rowCount - Number of skeleton rows
   * @returns {string} HTML table string
   */
  renderSkeletonTable(isLive = false, rowCount = 5) {
    const rows = Array.from({ length: rowCount }, () => {
      const firstCol = isLive
        ? `<td class="lb-col-time"><span class="lb-shimmer lb-skeleton-amount">&nbsp;</span></td>`
        : `<td class="lb-col-rank"><span class="lb-shimmer lb-skeleton-rank">&nbsp;</span></td>`;

      return `<tr>
        ${firstCol}
        <td class="lb-col-user">
          <span class="lb-shimmer lb-skeleton-name">&nbsp;</span>
          <span class="lb-shimmer lb-skeleton-meta">&nbsp;</span>
        </td>
        <td class="lb-col-amount"><span class="lb-shimmer lb-skeleton-amount">&nbsp;</span></td>
        <td class="lb-col-content"><span class="lb-shimmer lb-skeleton-icon">&nbsp;</span></td>
      </tr>`;
    }).join('');

    return `<table class="lb-table"><tbody>${rows}</tbody></table>`;
  },

  // ─── Front Page Feed ──────────────────────────────────────────────────────

  /**
   * Format a relative time string from an ISO timestamp
   * @param {string|null} iso
   * @returns {string}
   */
  timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  },

  /**
   * Build a platform icon badge (reuses existing icon set)
   * @param {string|null} platform
   * @returns {string}
   */
  feedPlatformBadge(platform) {
    if (!platform || platform === 'x') return '';
    const icon = this.icons[platform] || this.icons.globe;
    const label = platform.charAt(0).toUpperCase() + platform.slice(1);
    return `<span class="feed-platform-badge">${icon}<span>${label}</span></span>`;
  },

  /**
   * Render a single Front Page feed card
   * @param {Object} item - Feed item from /v1/feed/items
   * @param {string} appUrl - Base app URL for profile links
   * @returns {string} HTML
   */
  renderFeedCard(item, appUrl = 'https://grove.city') {
    const handle = item.creator_handle;
    const avatarUrl = item.creator_avatar_url;
    const title = item.content?.title || item.content?.description || null;
    const amount = parseFloat(item.total_amount_usd || '0');
    const tipCount = item.tip_count || 0;
    const ago = this.timeAgo(item.last_tipped_at || item.content?.published_at);
    const platform = item.platform;

    // Show avatar image when available; fall back to initial letter circle when null
    const initial = handle ? handle.charAt(0).toUpperCase() : '?';
    const avatarHtml = avatarUrl
      ? `<img src="${FormatUtils.escapeHtml(avatarUrl)}" alt="" class="feed-card-avatar" loading="eager" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      + `<span class="feed-card-avatar-fallback" style="display:none">${FormatUtils.escapeHtml(initial)}</span>`
      : `<span class="feed-card-avatar-fallback">${FormatUtils.escapeHtml(initial)}</span>`;

    // Use span (not <a>) to avoid nested anchors inside the outer <a class="feed-card">
    const handleHtml = handle
      ? `<span class="feed-card-handle">@${FormatUtils.escapeHtml(handle)}</span>`
      : '';

    const platformBadge = this.feedPlatformBadge(platform);
    const agoHtml = ago ? `<span class="feed-card-time">${FormatUtils.escapeHtml(ago)}</span>` : '';

    // Skip title if it duplicates the creator handle (e.g. content.title = "@mrbeast" or "mrbeast")
    const normalizedTitle = title ? title.replace(/^@/, '').toLowerCase().trim() : null;
    const normalizedHandle = handle ? handle.toLowerCase().trim() : null;
    const deduplicatedTitle = (normalizedTitle && normalizedTitle !== normalizedHandle) ? title : null;
    const titleHtml = deduplicatedTitle
      ? `<div class="feed-card-title">${FormatUtils.escapeHtml(deduplicatedTitle)}</div>`
      : '';

    const amountFmt = amount >= 1000 ? `$${(amount / 1000).toFixed(1)}K` : `$${amount.toFixed(2)}`;
    const tipsLabel = tipCount === 1 ? '1 tip' : `${tipCount} tips`;

    const contentUrl = item.url || (handle ? `${appUrl}/${encodeURIComponent(handle)}` : null);
    const cardLink = contentUrl ? `href="${FormatUtils.escapeHtml(contentUrl)}" target="_blank" rel="noopener noreferrer"` : '';

    return `<a class="feed-card" ${cardLink}>
      <div class="feed-card-meta">
        <div class="feed-card-avatar-wrap">${avatarHtml}</div>
        <div class="feed-card-meta-text">
          <div class="feed-card-meta-row">
            ${handleHtml}
            ${platformBadge}
            ${agoHtml}
          </div>
          ${titleHtml}
        </div>
      </div>
      <div class="feed-card-stats">
        <span class="feed-card-amount">${FormatUtils.escapeHtml(amountFmt)}</span>
        <span class="feed-card-tip-count">${FormatUtils.escapeHtml(tipsLabel)}</span>
      </div>
    </a>`;
  },

  /**
   * Render a full feed list
   * @param {Array} items
   * @param {string} appUrl
   * @returns {string} HTML
   */
  renderFeedList(items, appUrl = 'https://grove.city') {
    if (!items || items.length === 0) return '';
    return items.map(item => this.renderFeedCard(item, appUrl)).join('');
  },

  /**
   * Render feed skeleton placeholders
   * @param {number} count
   * @returns {string} HTML
   */
  renderFeedSkeleton(count = 5) {
    return Array.from({ length: count }, () => `
      <div class="feed-card feed-card-skeleton">
        <div class="feed-card-meta">
          <div class="feed-card-avatar-wrap"><span class="feed-card-avatar feed-card-avatar-fallback lb-shimmer">&nbsp;</span></div>
          <div class="feed-card-meta-text">
            <div class="feed-card-meta-row">
              <span class="lb-shimmer" style="width:80px;height:12px;border-radius:4px;display:inline-block">&nbsp;</span>
              <span class="lb-shimmer" style="width:30px;height:10px;border-radius:4px;display:inline-block;margin-left:6px">&nbsp;</span>
            </div>
            <div class="lb-shimmer" style="width:90%;height:12px;border-radius:4px;margin-top:5px">&nbsp;</div>
          </div>
        </div>
        <div class="lb-shimmer" style="width:60%;height:11px;border-radius:4px;margin-top:6px">&nbsp;</div>
      </div>`).join('');
  }
};

// Make globally available
if (typeof window !== 'undefined') {
  window.LeaderboardRenderer = LeaderboardRenderer;
}
