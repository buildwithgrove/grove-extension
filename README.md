# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms.

## Table of Contents <!-- omit in toc -->

- [Features](#features)
- [Supported Platforms](#supported-platforms)
- [Installation](#installation)
- [Development](#development)
- [Architecture](#architecture)
- [Adding New Platforms](#adding-new-platforms)

## Features

- Shows "Tip" button on all profile pages
- Sleek, Apple-like button design with glowing animation
- Modular adapter system for easy platform integration
- Integrated with Grove API for tip processing
- Default tip amount: $0.05
- Simple: Add JWT, press tip
- **Developer Mode**: Toggle between localhost and production (bottom right)

## Supported Platforms

### Active <!-- omit in toc -->
- **Twitter/X**: Fully implemented

### Planned <!-- omit in toc -->
- GitHub (placeholder)
- Reddit (placeholder)
- Instagram
- TikTok

## Installation

### Load Unpacked Extension <!-- omit in toc -->

```bash
# Navigate to chrome://extensions in Chrome
# Enable "Developer mode" (top right)
# Click "Load unpacked"
# Select the grove_extension directory
```

## Development

### Project Structure <!-- omit in toc -->

```
grove_extension/
├── manifest.json           # Chrome extension configuration
├── src/
│   ├── content/
│   │   └── content.js     # Main orchestrator
│   ├── adapters/
│   │   ├── base.js        # Base adapter interface
│   │   ├── twitter.js     # Twitter implementation
│   │   ├── github.js      # Placeholder
│   │   └── reddit.js      # Placeholder
│   ├── ui/
│   │   ├── button.js      # Tip button component
│   │   └── styles.css     # Button styling
│   └── utils/
│       └── api.js         # API communication
└── icons/                  # Extension icons
```

### Key Files <!-- omit in toc -->

- `content.js:69` - Platform detection logic
- `content.js:93` - Tip button click handler (sends URL)
- `twitter.js:32` - Twitter profile detection
- `button.js:20` - Simplified button component
- `api.js:40` - Grove API tip endpoint
- `api.js:20` - URL to tip domain converter

## Architecture

### Adapters <!-- omit in toc -->

Each platform has an adapter that extends `BaseAdapter` and implements:

- `detectProfilePage()` - Detect if on a profile page
- `getButtonPlacement()` - Return DOM element for button placement
- `getPlatformName()` - Return platform name

### API Integration <!-- omit in toc -->

The extension sends tips via the Grove API:

```bash
POST https://api.grove.city/v1/tip/{TIP_DOMAIN}/{TIP_AMOUNT}
Authorization: Bearer {GROVE_API_JWT}
```

**How it works**:
1. Extension detects profile page
2. Shows tip button on all profiles
3. User adds JWT and clicks tip
4. Sends current page URL to API
5. Backend determines if profile is tippable and processes payment

**Tip Domain Format** (`api.js:20`):
- Extracts from URL: `https://twitter.com/olshansky` → `twitter.com/olshansky`
- Removes protocol, www, and trailing slashes

**Default Tip Amount**: $0.05

**Authentication**: JWT token (TODO: Store in `chrome.storage.local`)

**Simplicity**: No frontend address parsing. Just show button, add JWT, press tip.

### Developer Mode <!-- omit in toc -->

A small toggle appears in the bottom right corner of any page where the extension is active.

**Toggle Behavior**:
- Click to switch between `🏠 LOCAL` and `🌍 PROD`
- Setting persists across sessions (stored in `chrome.storage.local`)
- Shows toast notification when environment changes

**API Endpoints**:
- **Production**: `https://api.grove.city`
- **Localhost**: `http://localhost:3000`

**Location**: `env-toggle.js:1` and `api.js:19`

## Adding New Platforms

1. Create new adapter in `src/adapters/platform.js`
2. Extend `BaseAdapter` class
3. Implement required methods
4. Add platform detection in `content.js:69`
5. Update manifest.json with new URL patterns

**Note**: No need to modify API logic - it automatically extracts domain from any URL. No address parsing needed - backend handles everything.

### Example <!-- omit in toc -->

```javascript
class MyPlatformAdapter extends BaseAdapter {
  detectProfilePage() {
    // Return true if on profile page
    const url = window.location.href;
    return /^https:\/\/myplatform\.com\/[^\/]+\/?$/.test(url);
  }

  getButtonPlacement() {
    // Return DOM element for button placement
    return document.querySelector('.profile-actions');
  }

  getPlatformName() {
    return 'myplatform';
  }
}
```
