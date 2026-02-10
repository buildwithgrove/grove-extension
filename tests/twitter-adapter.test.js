import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { loadBrowserScript } from './helpers/load-script.js';

let document;
let TwitterAdapter;
let context;

beforeEach(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: 'https://x.com/home'
  });
  document = dom.window.document;

  // Prepare context with JSDOM globals
  context = {
    window: dom.window,
    document: document,
    console: console,
    MutationObserver: dom.window.MutationObserver,
    URL: dom.window.URL,
    NodeList: dom.window.NodeList,
    Element: dom.window.Element,
    HTMLElement: dom.window.HTMLElement,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
  };
  context.window = context; // Circular reference for window.window

  // Load scripts
  loadBrowserScript('src/adapters/base.js', context);
  loadBrowserScript('src/adapters/twitter.js', context);

  TwitterAdapter = context.TwitterAdapter;
});

describe('TwitterAdapter', () => {
  describe('getApiPlatformName', () => {
    it('should return "x"', () => {
      const adapter = new TwitterAdapter();
      expect(adapter.getApiPlatformName()).toBe('x');
    });
  });

  describe('detectTippablePage', () => {
    it('should return true for profile pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return true for tweet pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky/status/123456789'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.detectTippablePage()).toBe(true);
    });

    it('should return false for system pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/home'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.detectTippablePage()).toBe(false);
    });
  });

  describe('isProfilePage', () => {
    it('should return true for profile pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.isProfilePage()).toBe(true);
    });

    it('should return false for tweet pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky/status/123456789'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.isProfilePage()).toBe(false);
    });
  });

  describe('isTweetPage', () => {
    it('should return true for tweet pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky/status/123456789'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.isTweetPage()).toBe(true);
    });

    it('should return false for profile pages', () => {
      const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
        url: 'https://x.com/olshansky'
      });
      const ctx = {
        window: dom.window,
        document: dom.window.document,
        console: console,
        MutationObserver: dom.window.MutationObserver,
        URL: dom.window.URL,
        NodeList: dom.window.NodeList,
        Element: dom.window.Element,
        HTMLElement: dom.window.HTMLElement,
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        location: dom.window.location,
      };
      ctx.window = ctx;
      loadBrowserScript('src/adapters/base.js', ctx);
      loadBrowserScript('src/adapters/twitter.js', ctx);
      const adapter = new ctx.TwitterAdapter();
      expect(adapter.isTweetPage()).toBe(false);
    });
  });

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
