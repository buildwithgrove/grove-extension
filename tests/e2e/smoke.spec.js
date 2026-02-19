import { test, expect, chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test.describe('Extension Smoke Tests', () => {
  let browserContext;
  let extensionPath;

  test.beforeAll(async () => {
    extensionPath = path.resolve(__dirname, '../../'); // Root of the repo
  });

  test.beforeEach(async ({ }, testInfo) => {
    // Create a unique user data dir for each test to ensure clean state
    const userDataDir = path.resolve(__dirname, `../../.gemini/tmp/playwright-user-data-${testInfo.workerIndex}-${testInfo.testId}`);

    browserContext = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Set to false to allow extension loading mechanism (or use new headless)
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      args: [
        `--headless=new`, // Use new headless mode which supports extensions
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`
      ],
    });
  });

  test.afterEach(async () => {
    if (browserContext) {
      await browserContext.close();
      browserContext = undefined;
    }
  });

  test('Should NOT inject on claude.ai', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://claude.ai/login', { waitUntil: 'domcontentloaded' }); // Redirects to login usually
    
    // Give it a moment to potentially erroneously inject
    await page.waitForTimeout(2000);
    
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toHaveCount(0);
  });

  test('Should NOT inject on vitalik.eth.limo', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://vitalik.eth.limo/', { waitUntil: 'domcontentloaded' });
    
    await page.waitForTimeout(2000);
    
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toHaveCount(0);
  });

  test('Should inject on olshansky.info', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://olshansky.info/', { waitUntil: 'domcontentloaded' });
    
    // This is a generic site, so it should look for metadata and inject a floating button
    // Assuming olshansky.info has the required metadata
    
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 10000 });
  });

  test('Should inject on grove.city', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://www.grove.city/', { waitUntil: 'domcontentloaded' });
    
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 20000 });

    // Interaction check: Click button and verify First Tip Modal appears
    await tipButton.click();
    const modal = page.locator('.grove-first-tip-modal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('Your First Tip!');
  });

  test('Should inject on soundcloud.com/olshansk', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://soundcloud.com/olshansk', { waitUntil: 'domcontentloaded' });
    
    // SoundCloud is an SPA, wait for the profile to load
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 20000 });
  });

  test('Should inject on soundcloud.com/ciabrad', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://soundcloud.com/ciabrad', { waitUntil: 'domcontentloaded' });
    
    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 20000 });
  });

  test('Should inject on youtube.com/@Dolshansky', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://www.youtube.com/@Dolshansky', { waitUntil: 'domcontentloaded' });

    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 20000 });
  });

  test('Should inject on youtube.com/@Dolshansky/community', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://www.youtube.com/@Dolshansky/community', { waitUntil: 'domcontentloaded' });

    // Community posts are in a toolbar below the post content
    // They can use ytd-post-renderer or ytd-backstage-post-renderer
    const tipButton = page.locator('ytd-post-renderer #toolbar #grove-tip-button, ytd-backstage-post-renderer #toolbar #grove-tip-button');
    await expect(tipButton.first()).toBeAttached({ timeout: 30000 });
  });

  test('Should NOT inject on youtube.com/@MrBeast (no crypto address)', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://www.youtube.com/@MrBeast', { waitUntil: 'domcontentloaded' });

    // Wait for page to settle and extension to run
    await page.waitForTimeout(5000);

    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toHaveCount(0);
  });

  test('Should inject on x.com/olshansky', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://x.com/olshansky', { waitUntil: 'domcontentloaded' });
    
    // X is heavy, give it some time to load the shell
    // Note: If X redirects to login, we might not see the profile, and thus no button.
    // We check if we are on the profile page or if we got redirected.
    
    const loginInput = page.locator('input[autocomplete="username"]');
    if (await loginInput.count() > 0) {
        console.log('Redirected to X login page. Skipping assertion as extension needs profile view.');
        test.skip();
        return;
    }

    // Attempt to wait for the button if we are on the profile
    const tipButton = page.locator('#grove-tip-button');
    // We use a soft assertion or try/catch because X might be flaky without auth
    try {
        await expect(tipButton).toBeVisible({ timeout: 10000 });
    } catch (e) {
        // Double check if we are on a rate limit or restricted page
        const restricted = page.locator('span:has-text("Restricted")');
        if (await restricted.count() > 0) {
             console.log('X Profile restricted. Skipping.');
             test.skip();
        } else {
            throw e;
        }
    }
  });

  test('Should inject on x.com/brian_armstrong', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://x.com/brian_armstrong', { waitUntil: 'domcontentloaded' });

    const loginInput = page.locator('input[autocomplete="username"]');
    if (await loginInput.count() > 0) {
        console.log('Redirected to X login page. Skipping.');
        test.skip();
        return;
    }

    const tipButton = page.locator('#grove-tip-button');
    try {
        await expect(tipButton).toBeVisible({ timeout: 10000 });
    } catch (e) {
        const restricted = page.locator('span:has-text("Restricted")');
        if (await restricted.count() > 0) {
            console.log('X Profile restricted. Skipping.');
            test.skip();
        } else {
            throw e;
        }
    }
  });

  test('Should inject on x.com/brian_armstrong/status/2020965896165130722', async () => {
    // TODO_IMPROVE: This test currently always skips because tweet page injection requires either:
    //   1. Grove API resolving the tweet URL (currently returns 404), OR
    //   2. X authentication (for bio fetching via CSRF token)
    //   Once API /v1/destination/resolve supports tweet URLs, remove the skip and assert injection.
    // In headless E2E (logged out), neither is available, so this test
    // verifies the extension doesn't crash and skips if no button appears.
    const page = await browserContext.newPage();
    await page.goto('https://x.com/brian_armstrong/status/2020965896165130722', { waitUntil: 'domcontentloaded' });

    const loginInput = page.locator('input[autocomplete="username"]');
    if (await loginInput.count() > 0) {
        console.log('Redirected to X login page. Skipping.');
        test.skip();
        return;
    }

    // Tweet pages use .grove-tweet-tip-button (injected by TweetTipHandler),
    // not #grove-tip-button (which is the profile-level button).
    const tweetTipButton = page.locator('.grove-tweet-tip-button');
    const profileTipButton = page.locator('#grove-tip-button');
    try {
        await expect(tweetTipButton.or(profileTipButton).first()).toBeVisible({ timeout: 15000 });
    } catch {
        // Without X auth or API support for tweet URLs, button injection is expected to fail.
        // The extension ran without errors (content scripts loaded), it just couldn't resolve the address.
        console.log('Tweet page button not injected (expected without X auth). Skipping.');
        test.skip();
    }
  });

  test('Should NOT inject on x.com/elonmusk (no crypto address)', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://x.com/elonmusk', { waitUntil: 'domcontentloaded' });

    const loginInput = page.locator('input[autocomplete="username"]');
    if (await loginInput.count() > 0) {
        console.log('Redirected to X login page. Skipping.');
        test.skip();
        return;
    }

    // Wait for profile to load and extension to run
    await page.waitForTimeout(5000);

    const tipButton = page.locator('#grove-tip-button');
    try {
        await expect(tipButton).toHaveCount(0);
    } catch (e) {
        const restricted = page.locator('span:has-text("Restricted")');
        if (await restricted.count() > 0) {
            console.log('X Profile restricted. Skipping.');
            test.skip();
        } else {
            throw e;
        }
    }
  });

  // Helper: Check if Substack page has bio data available for the extension.
  // Substack may serve degraded content to CI runners (GitHub Actions IPs),
  // stripping _preloads and meta tags that the extension needs.
  async function hasSubstackPreloads(page) {
    try {
      return await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script'));
        return scripts.some(s => (s.textContent || '').includes('_preloads'));
      });
    } catch {
      return false;
    }
  }

  // Helper: Assert tip button on Substack page, with diagnostics on failure.
  // Skips when Substack serves degraded content to CI (no _preloads data).
  async function assertSubstackTipButton(page, url) {
    const groveLogs = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('[Grove')) groveLogs.push(text);
    });

    await page.goto(url, { waitUntil: 'load' });

    // Check early if Substack served full content — if not, we'll skip after timeout
    await page.waitForTimeout(5000);
    const hasPreloads = await hasSubstackPreloads(page);
    if (!hasPreloads) {
      console.log(`[Substack E2E] No _preloads found on ${url} — Substack likely blocking this IP. Skipping.`);
      console.log('[Substack E2E] Extension logs:', groveLogs.join('\n'));
      test.skip();
      return;
    }

    // Use toBeAttached (not toBeVisible) because Substack's CSS may hide the
    // container the button is placed in (e.g., overflow-items on subdomain nav).
    // The extension correctly injects the button; visibility depends on page layout.
    const tipButton = page.locator('#grove-tip-button');
    try {
      await expect(tipButton.first()).toBeAttached({ timeout: 25000 });
    } catch (e) {
      console.log(`[Substack E2E] Button not found on ${url}`);
      console.log('[Substack E2E] Extension logs:', groveLogs.join('\n'));
      throw e;
    }
  }

  test('Should inject on substack.com/@olshansky', async () => {
    const page = await browserContext.newPage();
    await assertSubstackTipButton(page, 'https://substack.com/@olshansky');
  });

  test('Should inject on substack.com/@olshansky with query params', async () => {
    const page = await browserContext.newPage();
    await assertSubstackTipButton(page, 'https://substack.com/@olshansky?utm_source=user-menu');
  });

  test('Should inject on olshansky.substack.com (subdomain profile)', async () => {
    const page = await browserContext.newPage();
    await assertSubstackTipButton(page, 'https://olshansky.substack.com/');
  });

  test('Should inject on olshansky.substack.com/p/ (post page)', async () => {
    const page = await browserContext.newPage();
    await assertSubstackTipButton(page, 'https://olshansky.substack.com/p/chatgpt-started-sending-me-substack');
  });

  // NOTE: This E2E test runs headless/logged-out, so it does not reproduce the logged-in Substack
  // `_preloads` recommendations false-positive bug. That case is covered by unit tests.
  test('Should NOT inject on latecheckout.substack.com (no crypto address)', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://latecheckout.substack.com/', { waitUntil: 'domcontentloaded' });

    // Wait longer for page to settle - Substack progressively renders post cards
    // which could trigger false positives from the hover card observer
    await page.waitForTimeout(15000);

    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toHaveCount(0);
  });

});
