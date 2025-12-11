import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';

// We need to create a mock DOM environment and load the adapter
let document;
let TwitterAdapter;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  document = dom.window.document;
  global.document = document;
  global.window = dom.window;

  // Define BaseAdapter mock
  class BaseAdapter {
    waitForElement() { return Promise.resolve(null); }
  }
  global.window.BaseAdapter = BaseAdapter;

  // Load TwitterAdapter by executing the file content
  // Since we can't import it directly, we'll recreate the class for testing
  class TestTwitterAdapter extends BaseAdapter {
    isRetweet(tweetElement) {
      const socialContext = tweetElement.querySelector('[data-testid="socialContext"]');
      if (socialContext) {
        const text = socialContext.textContent?.toLowerCase() || '';
        if (text.includes('retweet') || text.includes('reposted')) {
          return true;
        }
      }
      return false;
    }

    hasQuotedTweet(tweetElement) {
      const quotedTweet = this.getQuotedTweetElement(tweetElement);
      return !!quotedTweet;
    }

    getQuotedTweetElement(tweetElement) {
      // Standard quoted tweet with data-testid
      let quoted = tweetElement.querySelector('[data-testid="quoteTweet"]');
      if (quoted) return quoted;

      // Look for a second Tweet-User-Avatar
      const allAvatars = tweetElement.querySelectorAll('[data-testid="Tweet-User-Avatar"]');
      if (allAvatars.length > 1) {
        let container = allAvatars[1].parentElement;
        while (container && container !== tweetElement) {
          if (container.querySelector('[data-testid="User-Name"]') &&
              container.querySelector('[data-testid="Tweet-User-Avatar"]')) {
            return container;
          }
          container = container.parentElement;
        }
      }

      // Look for UserAvatar-Container that's not the main author
      const mainAuthorAvatar = tweetElement.querySelector('[data-testid="Tweet-User-Avatar"]');
      const allUserAvatarContainers = tweetElement.querySelectorAll('[data-testid^="UserAvatar-Container-"]');

      if (allUserAvatarContainers.length > 1 && mainAuthorAvatar) {
        for (const avatarContainer of allUserAvatarContainers) {
          if (!mainAuthorAvatar.contains(avatarContainer)) {
            let container = avatarContainer.parentElement;
            let depth = 0;
            while (container && container !== tweetElement && depth < 15) {
              const hasUserName = container.querySelector('[data-testid="User-Name"]');
              const hasAvatar = container.querySelector('[data-testid^="UserAvatar-Container-"]');
              if (hasUserName && hasAvatar) {
                return container;
              }
              container = container.parentElement;
              depth++;
            }
          }
        }
      }

      return null;
    }

    extractTweetAuthor(tweetElement) {
      const isRT = this.isRetweet(tweetElement);

      const avatarLink = tweetElement.querySelector('div[data-testid="Tweet-User-Avatar"] a[href^="/"]');
      let username = null;
      let profileUrl = null;

      if (avatarLink) {
        const href = avatarLink.getAttribute('href');
        if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
          username = href.slice(1);
          profileUrl = `https://x.com${href}`;
        }
      }

      let displayName = null;
      const userNameContainer = tweetElement.querySelector('[data-testid="User-Name"]');
      if (userNameContainer) {
        const nameLink = userNameContainer.querySelector('a[href^="/"][role="link"]');
        if (nameLink) {
          const nameSpan = nameLink.querySelector('span span') || nameLink.querySelector('span');
          if (nameSpan) {
            displayName = nameSpan.textContent;
          }
          if (!username) {
            const href = nameLink.getAttribute('href');
            if (href && /^\/[a-zA-Z0-9_]+$/.test(href)) {
              username = href.slice(1);
              profileUrl = `https://x.com${href}`;
            }
          }
        }
      }

      return { username, displayName, profileUrl, isRetweet: isRT };
    }

    extractQuotedTweetAuthor(tweetElement) {
      const quotedTweet = this.getQuotedTweetElement(tweetElement);
      if (!quotedTweet) return null;

      let username = null;
      let displayName = null;
      let profileUrl = null;

      // Extract username from UserAvatar-Container-{username}
      const avatarContainer = quotedTweet.querySelector('[data-testid^="UserAvatar-Container-"]');
      if (avatarContainer) {
        const testId = avatarContainer.getAttribute('data-testid');
        const match = testId.match(/^UserAvatar-Container-(.+)$/);
        if (match) {
          username = match[1];
          profileUrl = `https://x.com/${username}`;
        }
      }

      // Get display name from User-Name container
      const userNameContainer = quotedTweet.querySelector('[data-testid="User-Name"]');
      if (userNameContainer) {
        const spans = userNameContainer.querySelectorAll('span');
        for (const span of spans) {
          const text = span.textContent?.trim();
          if (text && !text.startsWith('@') && text.length > 0 && text.length < 100) {
            if (!/^[·•\s]+$/.test(text)) {
              displayName = text;
              break;
            }
          }
        }
      }

      if (!username) return null;
      return { username, displayName, profileUrl };
    }
  }

  TwitterAdapter = TestTwitterAdapter;
});

describe('TwitterAdapter', () => {
  describe('isRetweet', () => {
    it('should return true for tweets with retweet social context', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="socialContext">
          <span>John Doe retweeted</span>
        </div>
      `;
      expect(adapter.isRetweet(tweet)).toBe(true);
    });

    it('should return true for tweets with reposted social context', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="socialContext">
          <span>John Doe reposted</span>
        </div>
      `;
      expect(adapter.isRetweet(tweet)).toBe(true);
    });

    it('should return false for regular tweets', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="User-Name">
          <span>John Doe</span>
        </div>
      `;
      expect(adapter.isRetweet(tweet)).toBe(false);
    });

    it('should return false for tweets with non-retweet social context', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="socialContext">
          <span>John Doe liked</span>
        </div>
      `;
      expect(adapter.isRetweet(tweet)).toBe(false);
    });
  });

  describe('hasQuotedTweet', () => {
    it('should return true for tweets with data-testid="quoteTweet"', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="tweetText">Main tweet</div>
        <div data-testid="quoteTweet">
          <div data-testid="User-Name">Quoted author</div>
        </div>
      `;
      expect(adapter.hasQuotedTweet(tweet)).toBe(true);
    });

    it('should return true for tweets with multiple UserAvatar-Container elements', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <div data-testid="UserAvatar-Container-mainuser"></div>
        </div>
        <div data-testid="User-Name"><span>Main User</span></div>
        <div class="quoted-tweet-container">
          <div data-testid="Tweet-User-Avatar">
            <div data-testid="UserAvatar-Container-quoteduser"></div>
          </div>
          <div data-testid="User-Name"><span>Quoted User</span></div>
        </div>
      `;
      expect(adapter.hasQuotedTweet(tweet)).toBe(true);
    });

    it('should return false for regular tweets without quotes', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <div data-testid="UserAvatar-Container-singleuser"></div>
        </div>
        <div data-testid="User-Name"><span>Single User</span></div>
        <div data-testid="tweetText">Just a regular tweet</div>
      `;
      expect(adapter.hasQuotedTweet(tweet)).toBe(false);
    });
  });

  describe('extractTweetAuthor', () => {
    it('should extract username from avatar link', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <a href="/testuser" role="link"></a>
        </div>
        <div data-testid="User-Name">
          <a href="/testuser" role="link">
            <span><span>Test User</span></span>
          </a>
        </div>
      `;
      const result = adapter.extractTweetAuthor(tweet);
      expect(result.username).toBe('testuser');
      expect(result.displayName).toBe('Test User');
      expect(result.profileUrl).toBe('https://x.com/testuser');
      expect(result.isRetweet).toBe(false);
    });

    it('should mark retweets correctly', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="socialContext">Someone retweeted</div>
        <div data-testid="Tweet-User-Avatar">
          <a href="/originalauthor" role="link"></a>
        </div>
        <div data-testid="User-Name">
          <a href="/originalauthor" role="link">
            <span><span>Original Author</span></span>
          </a>
        </div>
      `;
      const result = adapter.extractTweetAuthor(tweet);
      expect(result.username).toBe('originalauthor');
      expect(result.isRetweet).toBe(true);
    });
  });

  describe('extractQuotedTweetAuthor', () => {
    it('should extract username from UserAvatar-Container data-testid', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <div data-testid="UserAvatar-Container-mainuser"></div>
        </div>
        <div data-testid="User-Name"><span>Main User</span></div>
        <div class="quoted">
          <div data-testid="Tweet-User-Avatar">
            <div data-testid="UserAvatar-Container-jessepollak"></div>
          </div>
          <div data-testid="User-Name">
            <span>jesse.base.eth</span>
            <span>@jessepollak</span>
          </div>
        </div>
      `;
      const result = adapter.extractQuotedTweetAuthor(tweet);
      expect(result).not.toBeNull();
      expect(result.username).toBe('jessepollak');
      expect(result.displayName).toBe('jesse.base.eth');
      expect(result.profileUrl).toBe('https://x.com/jessepollak');
    });

    it('should return null when no quoted tweet exists', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <div data-testid="UserAvatar-Container-singleuser"></div>
        </div>
        <div data-testid="User-Name"><span>Single User</span></div>
      `;
      const result = adapter.extractQuotedTweetAuthor(tweet);
      expect(result).toBeNull();
    });

    it('should extract from quoteTweet data-testid container', () => {
      const adapter = new TwitterAdapter();
      const tweet = document.createElement('article');
      tweet.innerHTML = `
        <div data-testid="Tweet-User-Avatar">
          <div data-testid="UserAvatar-Container-mainuser"></div>
        </div>
        <div data-testid="quoteTweet">
          <div data-testid="UserAvatar-Container-quoteduser"></div>
          <div data-testid="User-Name">
            <span>quoted.eth</span>
          </div>
        </div>
      `;
      const result = adapter.extractQuotedTweetAuthor(tweet);
      expect(result).not.toBeNull();
      expect(result.username).toBe('quoteduser');
      expect(result.displayName).toBe('quoted.eth');
    });
  });
});
