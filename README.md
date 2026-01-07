# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms and any website.

- [Installation](#installation)
  - [Chrome Web Store](#chrome-web-store)
  - [Beta Side-loading](#beta-side-loading)
  - [Updating the Beta Extension](#updating-the-beta-extension)
- [Development](#development)
  - [Setup](#setup)
  - [Local Development](#local-development)
  - [Manifest Key](#manifest-key)
- [Build \& Release](#build--release)
  - [Chrome Web Store](#chrome-web-store-1)
  - [Beta Side Loading (i.e. GitHub Release)](#beta-side-loading-ie-github-release)
- [Features](#features)
  - [Tipping](#tipping)
  - [How Tip Buttons Appear on X/Twitter](#how-tip-buttons-appear-on-xtwitter)
  - [Extension Popup](#extension-popup)
  - [X (Twitter) Integration](#x-twitter-integration)
  - [Developer Features](#developer-features)
- [Design System](#design-system)
  - [Updating Design Tokens](#updating-design-tokens)

## Installation

### Chrome Web Store

1. Install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/grove-tip-extension/jheejecmpfgifgdodgipilpgfaiecndm)
2. Click the extension icon and connect your account at [app.grove.city](https://app.grove.city)

### Beta Side-loading

For early access to new features, install the beta version from GitHub:

1. Download the latest zip from [grove-releases](https://github.com/buildwithgrove/grove-releases/releases/latest)
2. Unzip to a folder
3. Go to `chrome://extensions`
4. Enable "Developer mode"
5. Click "Load unpacked" and select the unzipped folder

**Auto-updates:** Beta installs automatically check for new releases every hour. When an update is available, a red badge appears on the extension icon and a banner shows in the popup.

### Updating the Beta Extension

When you see the update notification:

1. Download the new zip from the link in the banner (or [grove-releases](https://github.com/buildwithgrove/grove-releases/releases/latest))
2. Unzip to a folder (can replace the old folder or use a new one)
3. Go to `chrome://extensions`
4. Click the refresh icon on the Grove extension card, OR remove and re-add via "Load unpacked"

Note: Chrome Web Store installs are auto-updated by Chrome and won't see beta release notifications.

## Development

### Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/buildwithgrove/grove-extension.git

# Or initialize submodules after cloning
git submodule update --init

# Install dev dependencies (for testing)
npm install
```

### Local Development

1. Go to [chrome://extensions/](chrome://extensions/)
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select this directory

To reload after changes: click the refresh icon on the extension card or use [Extensions Reloader](https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid).

### Testing

```bash
npm test           # Run tests once
npm run test:watch # Run tests in watch mode
```

### Manifest Key

The `manifest.json` includes a `key` field for local development. This ensures a consistent extension ID so `externally_connectable` works with the Grove web app. The build process automatically strips this key when creating zips for the Chrome Web Store.

## Build & Release

Both build commands prompt for a version bump with options: **Major**, **Minor**, **Patch**, **Build**, or **Skip**.

### Chrome Web Store

```bash
make build_release
```

1. Prompt to bump version and optionally commit/push
2. Create `build/grove-extension-vX.Y.Z-<sha>.zip` with the `key` field removed
3. Display upload instructions for the [Chrome Web Store console](https://chrome.google.com/webstore/devconsole/21d27706-ef22-4f83-8ddc-9f6109acef7d/jheejecmpfgifgdodgipilpgfaiecndm/edit/package)

### Beta (GitHub Release)

```bash
make build_beta
```

1. Prompt to bump version and optionally commit/push
2. Build zip with public key for stable extension ID
3. Create git tag (e.g., `v1.0.8`) and push
4. Upload to [grove-releases](https://github.com/buildwithgrove/grove-releases)

Requires `gh` CLI (`brew install gh`).

## Features

### Tipping

- **Tip on X (Twitter)** - Tip buttons on tweets, profiles, and hover cards
- **Tip on any website** - Floating tip button for sites with `llms.txt` or `ai.txt` containing a crypto address
- **ENS support** - Resolves `.eth` and `.base.eth` names to addresses
- **Tip confirmation** - Confirm amount before sending (on by default, can be disabled in settings)
- **Like & reply on tip** - When X is connected, the confirmation modal lets you like and/or reply to the tweet

### How Tip Buttons Appear on X/Twitter

Tip buttons are shown when a user has a tippable address (0x or ENS) in their profile:

| Location         | How Address is Found                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| **Profile page** | Extracted from visible bio on the page                                      |
| **Hover card**   | Extracted from popup card's display name/bio                                |
| **Feed tweets**  | Display name checked first; if no address, bio is fetched via Twitter's API |
| **Quote tweets** | Same as feed tweets, for the quoted author                                  |

For feed tweets, the extension fetches user bios in the background using Twitter's GraphQL API, enabling tip buttons for users who only have addresses in their bio (not their display name).

### Extension Popup

- **Balance display** - View your USDC tipping balance
- **Chain selector** - Switch between Base (mainnet) and Base Sepolia (testnet)
- **Earn tab** - View your tipping address and ENS name
- **Settings** - Configure default tip amount, X integration, and developer options
- **Tipping key management** - Store and switch between multiple accounts

### X (Twitter) Integration

- **OAuth login** - Connect your X account for enhanced features
- **Like & reply** - Choose to like and/or reply when tipping (shown in confirmation modal)
- **Custom reply message** - Customize the reply template with placeholders: `{username}`, `{chain}`, `{tx_link}`, `{grove_link}`

### Developer Features

- **Developer mode** - Toggle between production, testnet, and localhost APIs
- **Web app sync** - The Grove web app can sync your JWT via external messaging

## Design System

This project uses the [Grove Design System](https://github.com/buildwithgrove/design-system) via git submodule. Design tokens are imported from `design-system/tokens.css` in `popup.css`.

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
