# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms and any website.

- [Features](#features)
- [Installation](#installation)
- [Development](#development)
- [Release](#release)
- [Architecture](#architecture)
- [Adding Support for New Platforms](#adding-support-for-new-platforms)

## Features

### Tipping
- **Tip on X (Twitter)** - Tip buttons on tweets, profiles, and hover cards
- **Tip on any website** - Floating tip button for sites with `llms.txt` or `ai.txt` containing a crypto address
- **ENS support** - Resolves `.eth` and `.base.eth` names to addresses
- **Tip confirmation** - Optional popover to edit tip amount before sending
- **Like on tip** - Automatically like tweets when you tip them (requires X connection)
- **Auto-reply** - Post a customizable reply when you tip a tweet

### Extension Popup
- **Balance display** - View your USDC tipping balance
- **Chain selector** - Switch between Base (mainnet) and Base Sepolia (testnet)
- **Earn tab** - View your tipping address and ENS name
- **Settings** - Configure default tip amount, X integration, and developer options
- **Secret key management** - Store and switch between multiple accounts

### X (Twitter) Integration
- **OAuth login** - Connect your X account for enhanced features
- **Auto-like** - Automatically like tweets you tip
- **Auto-reply** - Post a reply with tip details and transaction link
- **Custom message** - Customize the auto-reply with placeholders: `{username}`, `{amount}`, `{chain}`, `{tx_link}`, `{grove_link}`

### Developer Features
- **Developer mode** - Toggle between production, testnet, and localhost APIs
- **Web app sync** - The Grove web app can sync your JWT via external messaging

## Installation

1. Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/grove-tip-extension/cailijeophmjabfnilbhajbegndlhelf)
2. Click the extension icon and connect your account at [app.grove.city](https://app.grove.city)

## Development

1. Clone this repository
2. Go to [chrome://extensions/](chrome://extensions/)
3. Enable `Developer mode`
4. Click `Load unpacked`
5. Select this directory

To reload after changes: click the refresh icon on the extension card or use [Extensions Reloader](https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid).

## Release

- **Bump version**: `make build_release` — increments patch version, updates `manifest.json` and `build.mk`, prompts to commit
- **Build zip**: `make build_zip_extension` — creates `build/grove-extension-vX.Y.Z.zip`
- **Upload to GitHub**: `make build_upload_release` — builds zip and creates a GitHub release (requires `gh` CLI)
- **Chrome Web Store**: Upload the zip at the [Chrome Web Store console](https://chrome.google.com/webstore/devconsole/21d27706-ef22-4f83-8ddc-9f6109acef7d/jheejecmpfgifgdodgipilpgfaiecndm/edit/package)

## Architecture

```
├── manifest.json          # Extension manifest (v3)
├── background.js          # Service worker for external messaging
├── popup.html/js/css      # Extension popup UI
└── src/
    ├── adapters/          # Platform-specific adapters
    │   ├── base.js        # Base adapter class
    │   ├── twitter.js     # X/Twitter adapter
    │   ├── youtube.js     # YouTube adapter
    │   ├── reddit.js      # Reddit adapter
    │   └── generic.js     # Generic website adapter
    ├── auth/
    │   └── xAuth.js       # X OAuth 2.0 with PKCE
    ├── config/
    │   └── networks.js    # Chain configurations
    ├── content/
    │   └── content.js     # Main content script
    ├── parsers/
    │   └── address.js     # Address detection & ENS resolution
    ├── storage/
    │   └── keyManager.js  # Secret key management
    ├── ui/
    │   ├── button.js      # Tip button component
    │   ├── constants.js   # Colors and styling constants
    │   ├── popover.js     # Tip confirmation popover
    │   ├── prevKeysUI.js  # Previous keys management UI
    │   └── styles.css     # Injected styles
    └── utils/
        ├── api.js         # Grove API client
        ├── balance.js     # Balance utilities
        ├── metadata.js    # llms.txt/ai.txt fetcher
        └── tipErrors.js   # Error handling utilities
```

## Adding Support for New Platforms

Adapters extend `BaseAdapter` and implement these methods:
- `detectProfilePage()` - Returns true if on a tippable page
- `extractBio()` - Extract text that may contain crypto addresses
- `getButtonPlacement()` - Return the element to insert the tip button near
- `getPlatformName()` - Return the platform identifier

To add a new platform, follow this workflow:

### Step 1: Capture Platform Structure

1. **Take a screenshot** of where you want the button to appear
   - Navigate to a profile/video/post page on the target platform
   - Take a screenshot showing the action buttons area (Share, Like, etc.)
   - This helps visualize the desired button placement

2. **Extract the HTML structure**
   - Right-click on the target area → Inspect
   - Find the container element that holds the action buttons
   - Copy the entire HTML structure (including parent containers)
   - Look for:
     - Class names and IDs of button containers
     - Button structure and styling patterns
     - Data attributes used by the platform

### Step 2: Use AI to Generate the Adapter

Provide the following prompt to Claude (or similar AI):

```
I need you to create a platform adapter for the Grove Tip Extension to add a tip button on [PLATFORM_NAME].

Reference the existing adapters for Twitter, Reddit, and YouTube as examples:
- src/adapters/twitter.js
- src/adapters/reddit.js
- src/adapters/youtube.js

Here's a screenshot showing where the button should appear:
[Attach screenshot]

Here's the HTML structure of the target area:
[Paste HTML]

Please create:
1. A new adapter file: src/adapters/[platform].js that extends BaseAdapter
2. Update src/content/content.js to detect and use this adapter
3. Add platform-specific button styling in src/ui/button.js (create[Platform]Button method)
4. Add CSS styles in src/ui/styles.css for the new button
5. Update manifest.json to include the new platform's content scripts

The adapter should:
- Detect the correct page type (profile, video, post, etc.)
- Extract bio/description text to check for crypto addresses
- Find the correct button placement location
- Match the platform's native button style and structure
```

### Step 3: Integration Checklist

After generating the adapter code:

- [ ] Create `src/adapters/[platform].js` with the adapter class
- [ ] Add platform detection in `src/content/content.js`
- [ ] Add button creation method in `src/ui/button.js`
- [ ] Add platform-specific styles in `src/ui/styles.css`
- [ ] Update `manifest.json` with URL patterns and content scripts
- [ ] Test on multiple pages/profiles on the platform

## Design System

This project uses the [Grove Design System](https://github.com/buildwithgrove/design-system) via git submodule.

### Setup (After Cloning)

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/buildwithgrove/grove-extension.git

# Or initialize submodules after cloning
git submodule update --init
```

### Updating Design Tokens

When design tokens are updated in the design-system repo:

```bash
# Pull latest design system changes
git submodule update --remote

# Commit the updated reference
git add design-system
git commit -m "chore: update design-system tokens"
git push
```

### Token Location

Design tokens are imported from `design-system/tokens.css` in `popup.css`.
