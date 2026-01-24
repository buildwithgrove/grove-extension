# Grove Extension - Development Guidelines <!-- omit in toc -->

- [Color Palette](#color-palette)
  - [Brand Colors](#brand-colors)
  - [Semantic Colors](#semantic-colors)
  - [UI Colors (Dark Theme)](#ui-colors-dark-theme)
  - [Text Colors](#text-colors)
  - [Transaction History Colors](#transaction-history-colors)
  - [Content Script Colors (`src/ui/constants.js`)](#content-script-colors-srcuiconstantsjs)
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
- [Adding Support for New Platforms](#adding-support-for-new-platforms)
  - [Step 1: Capture Platform Structure](#step-1-capture-platform-structure)
  - [Step 2: Use AI to Generate the Adapter](#step-2-use-ai-to-generate-the-adapter)
  - [Step 3: Integration Checklist](#step-3-integration-checklist)

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

## Chain/Network Configuration

### Default Chain

The default chain is `base` (mainnet). This should be consistent across:

- `popup.js`: `DEFAULT_CHAIN = 'base'`
- `content.js`: Default fallback should be `'base'`

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
- `{grove_link}` - Link to Grove website (grove.city)

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
User visits a Twitter profile page (e.g., `x.com/vitalikbuterin`).

```
Profile URL → initializeProfileButton() → extractBio() → AddressParser.resolveAddress()
                                                                    ↓
                                                          resolvedAddress (global)
                                                                    ↓
Click → handleTipClick() → sendTip() → tipDestination = ENS name or profile URL
```

- Bio is extracted from the visible profile page
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

### Why Feed Tweets Pass Address Directly

For profile pages and hover cards, the backend receives a profile URL and can look up the user's bio to find the address. But for feed tweets, the backend only receives a tweet URL - it doesn't know to look in the author's bio.

The bio fetch feature solves this by:
1. Client-side fetches the bio via Twitter's GraphQL API
2. Extracts and caches the address
3. Passes the address directly to the tip API

### Key Files

- `src/content/content.js` - Main orchestrator with all tip flows
- `src/adapters/twitter.js` - Twitter-specific DOM extraction
- `src/parsers/address.js` - Address detection (0x, ENS patterns)
- `tests/bio-fetch.test.js` - Tests for bio fetch logic

## Adding Support for New Platforms

### Architecture Overview

Each platform requires three main components:

1. **Adapter** (`src/adapters/[platform].js`) - DOM extraction and page detection
2. **Handler** (`src/content/[platform]Handler.js`) - Business logic for button injection
3. **Integration** - manifest.json, content.js, and styles.css updates

### Component Patterns

#### Adapters

Adapters extend `BaseAdapter` and handle platform-specific DOM operations:

```javascript
window.PlatformAdapter = class PlatformAdapter extends window.BaseAdapter {
  // Required methods
  detectProfilePage() { }     // Returns true if on a tippable page
  extractBio() { }            // Extract text that may contain crypto addresses
  getButtonPlacement() { }    // Return element to insert tip button near
  getPlatformName() { }       // Return platform identifier (e.g., 'substack')

  // Optional: DRY pattern for parameterized methods
  getButtonPlacement() {
    const container = document.querySelector('.container');
    return this.getButtonPlacementInContainer(container);
  }

  getButtonPlacementInContainer(container) {
    // Reusable logic
  }
};
```

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
  detectProfilePage() {
    // Return true if on a tippable page
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

```bash
npm test
```

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

### Browser Script Testing

Since content scripts run in a browser context, tests use a helper to load scripts into a simulated DOM environment:

```javascript
import { loadBrowserScript } from './helpers/load-script.js';

// Load dependencies first, then the script under test
loadBrowserScript('src/ui/constants.js', context);
loadBrowserScript('src/ui/tipModal.js', context);
```
