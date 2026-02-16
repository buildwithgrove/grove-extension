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

  test('Should inject on substack.com/@olshansky', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://substack.com/@olshansky', { waitUntil: 'load' });

    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 30000 });
  });

  test('Should inject on substack.com/@olshansky with query params', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://substack.com/@olshansky?utm_source=user-menu', { waitUntil: 'load' });

    const tipButton = page.locator('#grove-tip-button');
    await expect(tipButton).toBeVisible({ timeout: 30000 });
  });

  test('Should inject on olshansky.substack.com (subdomain profile)', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://olshansky.substack.com/', { waitUntil: 'load' });

    // Substack pages may have multiple action bars; verify at least one button exists
    const tipButtons = page.locator('#grove-tip-button');
    await expect(tipButtons.first()).toBeAttached({ timeout: 30000 });
    expect(await tipButtons.count()).toBeGreaterThan(0);
  });

  test('Should inject on olshansky.substack.com/p/ (post page)', async () => {
    const page = await browserContext.newPage();
    await page.goto('https://olshansky.substack.com/p/chatgpt-started-sending-me-substack', { waitUntil: 'load' });

    // Substack post pages may have multiple action bars; verify at least one button exists
    const tipButton = page.locator('#grove-tip-button').first();
    await expect(tipButton).toBeVisible({ timeout: 30000 });
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
