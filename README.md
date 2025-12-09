# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms and any website.

- [Installation](#installation)
- [Development](#development)
- [Release](#release)
- [Features](#features)
  - [Tipping](#tipping)
  - [Extension Popup](#extension-popup)
  - [X (Twitter) Integration](#x-twitter-integration)
  - [Developer Features](#developer-features)
- [Design System](#design-system)
  - [Setup (After Cloning)](#setup-after-cloning)
  - [Updating Design Tokens](#updating-design-tokens)
  - [Token Location](#token-location)

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
- **Upload release**: `make build_zip_upload` — uploads zip to [grove-releases](https://github.com/buildwithgrove/grove-releases) (requires `gh` CLI)
- **Chrome Web Store**: Upload the zip at the [Chrome Web Store console](https://chrome.google.com/webstore/devconsole/21d27706-ef22-4f83-8ddc-9f6109acef7d/jheejecmpfgifgdodgipilpgfaiecndm/edit/package)

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
