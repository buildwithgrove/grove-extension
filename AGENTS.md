# Grove Extension - Development Guidelines <!-- omit in toc -->

- [Color Palette](#color-palette)
  - [Brand Colors](#brand-colors)
  - [Semantic Colors](#semantic-colors)
  - [UI Colors (Dark Theme)](#ui-colors-dark-theme)
  - [Text Colors](#text-colors)
  - [Transaction History Colors](#transaction-history-colors)
  - [Content Script Colors (`src/ui/constants.js`)](#content-script-colors-srcuiconstantsjs)
- [Environment Configuration](#environment-configuration)
  - [Environment Resolution](#environment-resolution)
  - [Script Load Order](#script-load-order)
  - [Adding a New Environment](#adding-a-new-environment)
- [Chain/Network Configuration](#chainnetwork-configuration)
  - [Default Chain](#default-chain)
  - [Network Naming](#network-naming)
  - [Block Explorers](#block-explorers)
- [Destination URL Parsing](#destination-url-parsing)
- [Button Patterns](#button-patterns)
  - [Danger/Disconnect Buttons](#dangerdisconnect-buttons)
  - [Confirming State](#confirming-state)
- [Tipping Currency](#tipping-currency)
- [Auto-Reply Message](#auto-reply-message)
- [Design System](#design-system)
  - [Tokens](#tokens)
  - [Keeping Tokens Updated](#keeping-tokens-updated)
  - [After Cloning](#after-cloning)
  - [Making Token Changes](#making-token-changes)
- [Tip Button Flows](#tip-button-flows)
  - [Button Types and Tip Destinations](#button-types-and-tip-destinations)
  - [Flow Details](#flow-details)
  - [API-First Resolution Pattern](#api-first-resolution-pattern)
  - [Why Feed Tweets Pass Address Directly](#why-feed-tweets-pass-address-directly)
  - [Key Files](#key-files)
- [Bio Extraction Safety](#bio-extraction-safety)
- [Adding Support for New Platforms](#adding-support-for-new-platforms)
  - [Architecture Overview](#architecture-overview)
  - [Component Patterns](#component-patterns)
  - [Step 1: Capture Platform Structure](#step-1-capture-platform-structure)
  - [Step 2: Create the Adapter](#step-2-create-the-adapter)
  - [Step 3: Create the Handler (if needed)](#step-3-create-the-handler-if-needed)
  - [Step 4: Integration Checklist](#step-4-integration-checklist)
- [Testing](#testing)
  - [Running Tests](#running-tests)
  - [Testing Requirements](#testing-requirements)
  - [Test File Naming](#test-file-naming)
  - [E2E Limitations](#e2e-limitations)
  - [Browser Script Testing](#browser-script-testing)

## Color Palette

All colors should be used via CSS variables in `popup.css` or the `GROVE_COLORS` object in `src/ui/constants.js`.

### Brand Colors

| Name          | Variable                | Hex                       | Usage                                            |
| ------------- | ----------------------- | ------------------------- | ------------------------------------------------ |
| Primary       | `--color-primary`       | `#389f58`                 | Main brand green, buttons, links, success states |
| Primary Hover | `--color-primary-hover` | `#2f8549`                 | Hover state for primary elements                 |
| Primary Light | `--color-primary-light` | `rgba(56, 159, 88, 0.15)` | Light backgrounds, subtle highlights             |
| Accent        | `--color-accent`        | `#f0ad4e`                 | Gold/amber for rankings, special highlights      |

### Semantic Colors

| Name         | Variable          | Hex       | Usage                                                          |
| ------------ | ----------------- | --------- | -------------------------------------------------------------- |
| Danger/Error | `--color-danger`  | `#ef4444` | Errors, failed states, destructive actions, disconnect buttons |
| Warning      | `--color-warning` | `#f97316` | Warnings, tip sent amounts (orange)                            |

### UI Colors (Dark Theme)

| Name          | Variable                | Hex       | Usage                    |
| ------------- | ----------------------- | --------- | ------------------------ |
| Background    | `--color-bg`            | `#1a1a1a` | Main background          |
| Surface       | `--color-surface`       | `#2d2d2d` | Cards, elevated surfaces |
| Surface Hover | `--color-surface-hover` | `#363636` | Hover state for surfaces |
| Border        | `--color-border`        | `#404040` | Borders, dividers        |

### Text Colors

| Name      | Variable                 | Hex       | Usage                  |
| --------- | ------------------------ | --------- | ---------------------- |
| Primary   | `--color-text-primary`   | `#ffffff` | Main text, headings    |
| Secondary | `--color-text-secondary` | `#a3a3a3` | Descriptions, labels   |
| Tertiary  | `--color-text-tertiary`  | `#737373` | Timestamps, muted text |

### Transaction History Colors

| Type         | Icon Background           | Icon Color         | Amount Color      |
| ------------ | ------------------------- | ------------------ | ----------------- |
| Tip Sent     | `rgba(249, 115, 22, 0.1)` | `#f97316` (orange) | `#f97316`         |
| Tip Received | `rgba(56, 159, 88, 0.1)`  | `--color-primary`  | `--color-primary` |
| Deposit      | `rgba(59, 130, 246, 0.1)` | `#3b82f6` (blue)   | `#3b82f6`         |

### Content Script Colors (`src/ui/constants.js`)

```javascript
GROVE_COLORS = {
  primary: "#389f58",
  primaryHover: "#2f8549",
  primaryLight: "#4fb76d",
  shadow: "rgba(56, 159, 88, 0.3)",
  shadowHover: "rgba(56, 159, 88, 0.5)",
  error: "#ef4444",
  errorShadow: "rgba(239, 68, 68, 0.55)",
  warning: "#f59e0b",
  warningShadow: "rgba(245, 158, 11, 0.45)",
};
```

## Environment Configuration

`src/config/environments.js` is the **single source of truth** for API URLs, app URLs, JWT keys, chain defaults, and dev-mode flags. Do not hardcode these elsewhere — use `GroveEnv` helpers.

| Environment  | API URL                          | App URL                          | Default Chain  | Dev Mode |
| ------------ | -------------------------------- | -------------------------------- | -------------- | -------- |
| `production` | `https://api.grove.city`         | `https://app.grove.city`         | `base`         | No       |
| `testnet`    | `https://api.testnet.grove.city` | `https://app.testnet.grove.city` | `base-sepolia` | Yes      |
| `localhost`  | `http://localhost:8000`          | `http://localhost:3000`          | `base`         | Yes      |

**Localhost uses mainnet chains (`base`), not testnet chains.** Localhost = production chain, local API.

### Environment Resolution

The extension stores `groveEnvironment` (`'local'`/`'prod'`) and `groveEndpoint` (`'production'`/`'testnet'`/`'localhost'`) in `chrome.storage.local`. **Always use `GroveEnv.resolveActiveEnvId(groveEnvironment, groveEndpoint)`** to resolve these to a canonical env ID — never write your own if/else chain.

Key `GroveEnv` helpers: `get(envId)`, `defaultChain(envId)`, `allowedChains(envId)`, `jwtKeyForEnv(envId)`, `topUpUrl(envId)`, `isTestChains(envId)`.

### Script Load Order

In `manifest.json` and `popup.html`, `environments.js` must load first:

1. `src/config/environments.js`
2. `src/config/storageKeys.js`
3. `src/config/chains.js`
4. Everything else

### Adding a New Environment

1. Add entry to `GROVE_ENVIRONMENTS` in `src/config/environments.js`
2. Add label in `GroveEnv.apiLabel()`
3. Update `GroveEnv.isTestChains()` / `allowedChains()` if needed
4. Add radio button in `popup.html`
5. Add tests in `tests/environments.test.js`

## Chain/Network Configuration

### Default Chain

Default chain is `base` (mainnet), defined per environment in `src/config/environments.js` and as `DEFAULT_CHAIN` in `src/config/chains.js`. Use `GroveEnv.defaultChain(envId)` to get the correct default for the active environment.

### Network Naming

API may return network names with underscores (e.g., `base_sepolia`). Always normalize:

```javascript
const chain = rawChain.toLowerCase().replace(/_/g, "-");
```

### Block Explorers

| Chain           | Explorer URL                        |
| --------------- | ----------------------------------- |
| `base`          | `https://basescan.org`              |
| `base-sepolia`  | `https://sepolia.basescan.org`      |
| `solana`        | `https://solscan.io`                |
| `solana-devnet` | `https://solscan.io?cluster=devnet` |

## Destination URL Parsing

The `parseDestination()` function handles different destination types:

| Type              | Example                 | Links To                              |
| ----------------- | ----------------------- | ------------------------------------- |
| Twitter/X Tweet   | `x.com/user/status/123` | Profile: `x.com/user`, Post: full URL |
| Twitter/X Profile | `x.com/user`            | Profile URL                           |
| ENS Name          | `vitalik.eth`           | `https://app.ens.domains/vitalik.eth` |
| Base Name         | `name.base.eth`         | `https://www.base.org/name/name`      |
| Other URLs        | `example.com/page`      | Full URL                              |

## Button Patterns

### Danger/Disconnect Buttons

- Use `.btn-danger` for bordered danger buttons (e.g., "Disconnect" with background)
- Use `.btn-danger-text` for text-only buttons that perform destructive actions (e.g., X disconnect)
- Both use `--color-danger` (#ef4444)

### Confirming State

For destructive actions requiring confirmation, add `.confirming` class to pulse the button:

```css
.btn-danger.confirming {
  background-color: var(--color-danger);
  color: white;
  animation: pulse-danger 0.5s ease-in-out infinite alternate;
}
```

## Tipping Currency

All tips are sent in **USDC** on both Base and Base Sepolia networks. The currency is currently hardcoded as "USDC" in the auto-reply message (`src/content/content.js`). If additional currencies are supported in the future, consider adding a `currency` property to the chain config in `src/config/networks.js`.

## Auto-Reply Message

The default auto-reply message template is defined in two places (must be kept in sync):

- `popup.js`: `DEFAULT_AUTO_REPLY_MESSAGE`
- `src/content/content.js`: `DEFAULT_AUTO_REPLY_MESSAGE`

Available placeholders:

- `{username}` - Twitter username of the tip recipient
- `{chain}` - Network name (e.g., "Base", "Base Sepolia")
- `{tx_link}` - Block explorer link to the transaction
- `{referral_link}` - User's referral link (falls back to grove.city if no referral code)
- `{grove_link}` - Link to Grove website (grove.city) [legacy, still supported]

## Design System

This project uses the Grove Design System via git submodule at `./design-system/`.

### Tokens

Design tokens are imported from `design-system/tokens.css` at the top of `popup.css`. These provide canonical CSS variables for colors, typography, spacing, etc.

Token naming: `--grove-colors-brand-primary`, `--grove-colors-accent-orange`, etc.

### Keeping Tokens Updated

```bash
# Pull latest design system changes
git submodule update --remote

# Commit the updated reference
git add design-system
git commit -m "chore: update design-system tokens"
git push
```

### After Cloning

```bash
# Clone with submodules
git clone --recurse-submodules <repo-url>

# Or initialize after cloning
git submodule update --init
```

### Making Token Changes

1. Make changes in the `design-system` repo (not the submodule copy)
2. Push to design-system
3. In this repo, run `git submodule update --remote` to pull latest

## Tip Button Flows

The extension surfaces tip buttons in different contexts, each with its own flow for determining the tip destination sent to the API.

### Button Types and Tip Destinations

| Button Location | Tip Destination | Reason |
|----------------|-----------------|--------|
| Profile page | ENS name or profile URL | Backend can resolve address from profile |
| Hover card | Profile URL | Backend can resolve address from profile |
| Feed tweet (display name) | Cached address (0x/ENS) | Address found client-side, passed directly |
| Feed tweet (bio fetch) | Cached address (0x/ENS) | Address found via API, passed directly |
| Quote tweet | Cached address (0x/ENS) | Same as feed tweet |

### Flow Details

#### 1. Profile Page Button
User visits a profile page (e.g., `x.com/vitalikbuterin`).

Uses `ProfilePageHandler.initialize()` with the [API-First Resolution Pattern](#api-first-resolution-pattern):

```
Profile URL → ProfilePageHandler.initialize() → GroveAPI.resolveDestination(url)
                                                        ↓ (success)           ↓ (404 / error)
                                                 Use API address        extractBio() → AddressParser
                                                        ↓                        ↓
                                                 resolvedAddress (global)  resolvedAddress (global)
                                                        ↓
Click → handleTipClick() → sendTip() → tipDestination = ENS name or profile URL
```

- API resolution is attempted first (preferred path)
- Falls back to DOM bio extraction if API returns 404 or errors
- If ENS name found, it's sent directly to API
- Otherwise, the profile URL is sent (backend resolves from profile)

#### 2. Hover Card Button
User hovers over a username, popup card appears.

```
Hover → injectButtonIntoTwitterHoverCard() → check displayName/bio → cache address
                                                                          ↓
Click → handleTweetTipClick(profileUrl) → sendTweetTip() → tipDestination = profileUrl
```

- Address is cached for future use
- Tip destination is the profile URL (backend resolves)

#### 3. Feed Tweet Button (Display Name)
Tweet in feed where author has address in their display name.

```
Tweet detected → processTweet() → checkTippableAddress(username, displayName)
                                           ↓
                              AddressParser.resolveAddress(displayName)
                                           ↓
                              setCachedAddress(username, result) → inject button
                                                                        ↓
Click → sendTweetTip() → getCachedAddress(username) → tipDestination = cached.address
```

- Address found in display name is cached
- On click, cached address (0x or ENS) is sent directly to API

#### 4. Feed Tweet Button (Bio Fetch)
Tweet in feed where author has address only in their bio (not display name).

```
Tweet detected → processTweet() → checkTippableAddress() returns false
                                           ↓
                              queueBioFetch(username, tweetElement, ...)
                                           ↓
                              fetchTwitterUserBio(username) [Twitter GraphQL API]
                                           ↓
                              parse response → setCachedAddress() → injectPendingButtons()
                                                                          ↓
Click → sendTweetTip() → getCachedAddress(username) → tipDestination = cached.address
```

- Uses Twitter's `UserByScreenName` GraphQL endpoint
- Runs in content script context with user's cookies (ct0 CSRF token)
- Rate limited: 300ms interval, max 3 concurrent fetches
- Results cached for 10 minutes
- On click, cached address is sent directly to API

#### 5. Quote Tweet Button
The quoted tweet inside a quote tweet has a tippable author.

Same flow as #3 or #4, but uses `extractQuotedTweetAuthor()` and injects button into the quoted tweet element.

### API-First Resolution Pattern

`ProfilePageHandler` uses an API-first strategy for all full page views:

```
Page Load → GroveAPI.resolveDestination(url)
                    ↓ (success)           ↓ (404 / error)
             Use API address        Fall back to DOM parsing
                    ↓                        ↓
             Cache + inject          extractBio() → AddressParser
```

- API resolution is the preferred path (consistent, server-side)
- DOM fallback handles cases where the API doesn't yet support the URL
- Substack full pages (profiles/posts) also use `ProfilePageHandler`; `SubstackHandler` is used for Substack hover cards

Reference: `src/content/profilePageHandler.js:initialize()`

### Why Feed Tweets Pass Address Directly

For profile pages and hover cards, the backend receives a profile URL and can look up the user's bio to find the address. But for feed tweets, the backend only receives a tweet URL - it doesn't know to look in the author's bio.

The bio fetch feature solves this by:
1. Client-side fetches the bio via Twitter's GraphQL API
2. Extracts and caches the address
3. Passes the address directly to the tip API

### Key Files

- `src/content/content.js` - Main orchestrator with all tip flows
- `src/content/profilePageHandler.js` - API-first page resolution with DOM fallback
- `src/content/substackHandler.js` - Substack-specific hover card handler
- `src/adapters/twitter.js` - Twitter-specific DOM extraction
- `src/adapters/substack.js` - Substack DOM extraction and bio preload parsing
- `src/parsers/address.js` - Address detection (0x, ENS patterns)
- `src/utils/addressCache.js` - Address caching with TTL
- `src/utils/api.js` - Grove API client (resolveDestination, etc.)
- `tests/bio-fetch.test.js` - Tests for bio fetch logic

## Bio Extraction Safety

When extracting author bios from preloaded JSON (e.g., Substack `_preloads`):

- **Always use specific author paths** (e.g., `preloads.post.author.bio`, `preloads.profile.bio`)
- **Never use broad regex** matching generic keys like `"bio":` across all `<script>` tags
- **Logged-in platforms inject personalized data** (recommendations, sidebar authors) that contains OTHER authors' bios — broad matching causes false-positive tip button injection
- **Check `window._preloads` (parsed object) and parsed script JSON only** — avoid regex matching across raw script text to prevent false positives

Reference: `src/adapters/substack.js:extractBioFromPreloads()`

## Adding Support for New Platforms

### Architecture Overview

Each platform requires three main components:

1. **Adapter** (`src/adapters/[platform].js`) - DOM extraction and page detection
2. **Handler** (`src/content/[platform]Handler.js`) - Business logic for button injection
3. **Integration** - manifest.json, content.js, and styles.css updates

### Component Patterns

#### Adapters

Adapters extend `BaseAdapter` and handle platform-specific DOM operations. See [Step 2: Create the Adapter](#step-2-create-the-adapter) for the template.

Required methods: `detectTippablePage()`, `extractBio()`, `getButtonPlacement()`, `getPlatformName()`

Reference examples:
- Simple: `src/adapters/soundcloud.js`
- Complex (with hover cards): `src/adapters/substack.js`
- Feature-rich: `src/adapters/twitter.js`

#### Handlers

Handlers use the module pattern with callbacks for dependency injection:

```javascript
const PlatformHandler = {
  callbacks: {
    hasAddresses: null,      // (text) => boolean
    resolveAddress: null,    // (text) => { address, type }
    onTipClick: null,        // (buttonInstance) => void
    createTipButton: null,   // (onClick, platform) => TipButton
  },

  init(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  },

  async initialize(adapter) {
    // Platform-specific initialization logic
  },

  getButton() { },
  getResolvedAddress() { },
  reset() { }
};
```

Reference examples:
- `src/content/substackHandler.js`
- `src/content/hoverCardHandler.js`
- `src/content/profilePageHandler.js`

#### CSS Styling

Use CSS classes instead of inline styles. Define platform-specific classes in `src/ui/styles.css`:

```css
/* Platform-specific button styles */
.grove-[platform]-tip-button { }
.grove-[platform]-tip-button:hover { }
.grove-[platform]-hover-button { }
```

### Step 1: Capture Platform Structure

1. **Take a screenshot** of where you want the button to appear
   - Navigate to a profile/video/post page on the target platform
   - Screenshot the action buttons area (Share, Like, etc.)

2. **Extract the HTML structure**
   - Right-click on the target area → Inspect
   - Copy the container element structure
   - Note class names, IDs, and data attributes

### Step 2: Create the Adapter

Create `src/adapters/[platform].js`:

```javascript
window.PlatformAdapter = class PlatformAdapter extends window.BaseAdapter {
  detectTippablePage() {
    // Return true if on a tippable page (profiles AND posts)
  }

  extractBio() {
    // Combine display name + bio for address detection
    const parts = [];
    const displayName = this.extractDisplayName();
    if (displayName) parts.push(displayName);
    const bio = document.querySelector('.bio')?.textContent;
    if (bio) parts.push(bio);
    return parts.join(' ') || null;
  }

  getButtonPlacement() {
    // Return element to insert button near
  }

  getPlatformName() {
    return 'platform';
  }
};
```

### Step 3: Create the Handler (if needed)

For simple platforms, use `ProfilePageHandler`. For complex platforms (hover cards, multiple button locations), create `src/content/[platform]Handler.js`.

### Step 4: Integration Checklist

- [ ] Create `src/adapters/[platform].js`
- [ ] Create `src/content/[platform]Handler.js` (if complex)
- [ ] Add platform detection in `src/content/content.js`:
  ```javascript
  if (hostname.includes('[platform].com')) {
    return new window.PlatformAdapter();
  }
  ```
- [ ] Add handler initialization in `src/content/content.js`:
  ```javascript
  if (currentAdapter.getPlatformName() === '[platform]') {
    // Initialize handler with callbacks
  }
  ```
- [ ] Add CSS styles in `src/ui/styles.css`
- [ ] Update `manifest.json`:
  ```json
  {
    "matches": ["https://[platform].com/*"],
    "js": ["src/adapters/[platform].js", "src/content/[platform]Handler.js", ...]
  }
  ```
- [ ] Add tests in `tests/[platform]-adapter.test.js`
- [ ] Test on multiple pages/profiles

## Testing

Tests are located in the `tests/` directory and use Vitest.

### Running Tests

**All unit tests (Vitest):**

```bash
make test_unit
```

**All E2E tests (Playwright):**

```bash
make test_e2e
```

**Platform-specific:**

| Command                     | Description                     |
| --------------------------- | ------------------------------- |
| `make test_unit_substack`   | Substack adapter unit tests     |
| `make test_unit_twitter`    | Twitter adapter unit tests      |
| `make test_unit_soundcloud` | SoundCloud adapter unit tests   |
| `make test_e2e_substack`    | Substack E2E tests              |
| `make test_e2e_twitter`     | Twitter/X E2E tests             |
| `make test_e2e_soundcloud`  | SoundCloud E2E tests            |
| `make test_watch`           | Run tests in watch mode         |
| `make test_coverage`        | Run tests with coverage         |

### Testing Requirements

**Every PR should include appropriate test changes:**

- When adding new features: Add tests for the new functionality
- When modifying existing code: Update relevant tests to match new behavior
- When removing code: Remove or update tests that depended on the removed code
- When fixing bugs: Add a test that would have caught the bug

### Test File Naming

Test files should match their source files:
- `src/ui/tipModal.js` → `tests/tipModal.test.js`
- `src/parsers/address.js` → `tests/address.test.js`

### E2E Limitations

Playwright E2E tests run headless and **logged out**. This means:

- Bugs triggered by **personalized/recommendation data** (logged-in Substack, authenticated X/Twitter) are NOT caught
- Platform-specific features requiring auth (CSRF tokens, GraphQL bio fetching) will be skipped
- **Unit tests mocking the DOM** are needed to cover logged-in scenarios (e.g., mock a `<script>` tag with recommendation data containing other authors' bios)
- E2E negative tests (e.g., "should NOT inject on latecheckout.substack.com") may pass for the wrong reason — the bug path isn't exercised without auth

### Browser Script Testing

Since content scripts run in a browser context, tests use a helper to load scripts into a simulated DOM environment:

```javascript
import { loadBrowserScript } from './helpers/load-script.js';

// Load dependencies first, then the script under test
loadBrowserScript('src/ui/constants.js', context);
loadBrowserScript('src/ui/tipModal.js', context);
```

## Cross-Repo Sync with Grove App

The extension and the [Grove web app](https://github.com/buildwithgrove/grove-app) share API surfaces, deep links, and a message-passing contract. Changes to either repo can silently break the other. **Always cross-check the sibling repo when touching shared interfaces.**

Sibling repo location: `~/Developer/app`

See also: [GitHub Issue #103](https://github.com/buildwithgrove/grove-extension/issues/103)

### When to Cross-Check the App

- Adding/removing/renaming API response fields (giveaway model, leaderboard entries, tip history, etc.)
- Changing deep-link URL paths or query params
- Modifying `chrome.runtime` message types or response shapes
- Updating `externally_connectable` in `manifest.json`
- Changing storage key names or JWT slot logic

### Deep Links (Extension → App)

URLs the extension opens in the app. Defined statically in `popup.html` (fallback) and dynamically in `popup.js` via `GroveEnv.get(envId).appUrl`.

| Feature | URL Pattern | Files |
|---------|-------------|-------|
| Top Up | `{appUrl}/wallets?action=topup` | `popup.html:225`, `popup.js` via `GroveEnv.topUpUrl()` |
| Wallet Sign-In | `{appUrl}/extension` | `popup.html:979`, `popup.js` via `GroveEnv.extensionUrl()` |
| Create Giveaway | `{appUrl}/dashboard?tab=giveaways` | `popup.html:559`, `popup.js:2331` |
| General Settings | `{appUrl}` | `popup.html:1064` |
| Referral Link | `https://app.grove.city/?ref={code}` | `popup.js:3997` (hardcoded to production — intentional) |

**App URL values** (from `src/config/environments.js`):

| Environment | `appUrl` |
|-------------|----------|
| production | `https://app.grove.city` |
| testnet | `https://app.testnet.grove.city` |
| localhost | `http://localhost:3000` |

### chrome.runtime Message Passing

The app sends messages to the extension via `chrome.runtime.sendMessage(extensionId, ...)`. The extension handles them in `background.js` via `onMessageExternal`.

**Extension ID**: `jheejecmpfgifgdodgipilpgfaiecndm` (hardcoded in app at `src/lib/constants.ts`)

| Message Type | Direction | Request | Response |
|-------------|-----------|---------|----------|
| `SET_JWT` | App → Ext | `{ type, jwt, environment }` | `{ success, environment, devModeEnabled }` |
| `GET_JWT` | App → Ext | `{ type, environment? }` | `{ jwt, isDevMode, environment }` |
| `PING` | App → Ext | `{ type, environment? }` | `{ hasKey, isDevMode, environment }` |
| `OPEN_POPUP` | App → Ext | `{ type }` | `{ success, opened, reason? }` |
| `OPEN_POPUP_TO_X_SETTINGS` | App → Ext | `{ type }` | `{ success, opened, reason? }` |

`environment` values: `'production'`, `'testnet'`, `'localhost'` (app sends `'local'` which is normalized to `'localhost'`)

### externally_connectable (manifest.json)

Origins allowed to message the extension:

```json
"externally_connectable": {
  "matches": [
    "http://localhost:*/*",
    "https://app.grove.city/*",
    "https://app.testnet.grove.city/*"
  ]
}
```

### Shared API Endpoints

Both the extension and app call these Grove API endpoints. When the API response shape changes, both consumers must be updated.

**Account & Auth:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `GET /v1/account` | JWT | `api.js` |
| `POST /v1/auth/exchange-cdp-token` | None | `src/auth/cdpAuth.js` |
| `POST /v1/account/handle` | JWT | `api.js` |

**Tipping:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `POST /v1/tip` | JWT | `api.js` |
| `GET /v1/tip/resolve?destination=` | None | `api.js` |

**Activity & Earnings:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `GET /v1/account/tip_history?limit=&offset=` | JWT | `api.js` |
| `GET /v1/account/fund_history?limit=&offset=` | JWT | `api.js` |
| `GET /v1/account/earnings/summary?window=` | JWT | `api.js` |

**Giveaways:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `GET /v1/giveaways?browseable=&limit=&offset=` | None | `api.js` |
| `GET /v1/giveaway/{id}` | None | `api.js` |

**Leaderboard:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `GET /v1/leaderboard/tippers?window=&limit=` | None | `api.js` |
| `GET /v1/leaderboard/tippees?window=&limit=` | None | `api.js` |
| `GET /v1/leaderboard/tippers/recent?limit=` | None | `api.js` |
| `GET /v1/leaderboard/tippees/recent?limit=` | None | `api.js` |
| `GET /v1/leaderboard/funders?window=&limit=` | None | `api.js` |
| `GET /v1/leaderboard/funds/total` | None | `api.js` |
| `GET /v1/leaderboard/tips/total` | None | `api.js` |

**Referrals:**

| Endpoint | Auth | Extension File |
|----------|------|----------------|
| `GET /v1/referrals?limit=&offset=` | JWT | `api.js` |
| `GET /v1/referrals/earnings?window=` | JWT | `api.js` |

### Key App Files (for cross-reference)

| App File | What It Does |
|----------|-------------|
| `src/lib/constants.ts` | Extension ID constant |
| `src/lib/config.ts` | `getExtensionEnvironment()` — env mapping |
| `src/components/SecretKeyCard.tsx` | All `chrome.runtime` message sends |
| `src/app/extension/page.tsx` | `/extension` route, inline `SET_JWT` |
| `src/app/wallets/page.tsx` | `/wallets?action=topup` handler |
| `src/app/dashboard/page.tsx` | `?tab=` routing for all dashboard tabs |
| `src/modules/api/groveApiClient.ts` | App-side API client (canonical field names) |
