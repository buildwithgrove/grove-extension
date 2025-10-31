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

- Detects cryptocurrency addresses in user bios/descriptions
- Injects sleek, Apple-like "Tip" button on profiles
- Modular adapter system for easy platform integration
- Currently supports `TOKEN(network): 0xADDRESS` format
- Integrated with Grove API for tip processing
- Default tip amount: $0.05

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
│   ├── parsers/
│   │   └── address.js     # Address parsing logic
│   ├── ui/
│   │   ├── button.js      # Tip button component
│   │   └── styles.css     # Button styling
│   └── utils/
│       └── api.js         # API communication
└── icons/                  # Extension icons
```

### Key Files <!-- omit in toc -->

- `content.js:85` - Platform detection logic
- `content.js:109` - Tip button click handler (sends URL)
- `address.js:14` - Address detection regex (for showing button)
- `twitter.js:32` - Twitter bio extraction
- `button.js:20` - Simplified button component
- `api.js:40` - Grove API tip endpoint
- `api.js:20` - URL to tip domain converter

## Architecture

### Adapters <!-- omit in toc -->

Each platform has an adapter that extends `BaseAdapter` and implements:

- `detectProfilePage()` - Detect if on a profile page
- `extractBio()` - Extract bio/description text
- `getButtonPlacement()` - Return DOM element for button placement
- `getUserIdentifier()` - Extract username/handle
- `getPlatformName()` - Return platform name

### Address Format <!-- omit in toc -->

Currently supports: `TOKEN(network): 0xADDRESS`

Example: `USDC(base): 0x9ab39B84aC4DE6D705C5f051c07db8fE72890953`

### API Integration <!-- omit in toc -->

The extension sends tips via the Grove API:

```bash
POST https://api.grove.city/v1/tip/{TIP_DOMAIN}/{TIP_AMOUNT}
Authorization: Bearer {GROVE_API_JWT}
```

**How it works**:
1. Extension checks if bio contains `TOKEN(network): 0xADDRESS` pattern
2. If found, shows tip button
3. When clicked, sends current page URL to API
4. Backend extracts address from profile and processes tip

**Tip Domain Format** (`api.js:20`):
- Extracts from URL: `https://twitter.com/olshansky` → `twitter.com/olshansky`
- Removes protocol, www, and trailing slashes

**Default Tip Amount**: $0.05

**Authentication**: JWT token (TODO: Store in `chrome.storage.local`)

**Simplicity**: Frontend only checks for address presence and sends URL. Backend handles all address extraction and validation.

## Adding New Platforms

1. Create new adapter in `src/adapters/platform.js`
2. Extend `BaseAdapter` class
3. Implement required methods
4. Add platform detection in `content.js:85`
5. Update manifest.json with new URL patterns

**Note**: No need to modify API logic - it automatically extracts domain from any URL

### Example <!-- omit in toc -->

```javascript
class MyPlatformAdapter extends BaseAdapter {
  detectProfilePage() {
    // Return true if on profile page
  }

  extractBio() {
    // Return bio text
  }

  getButtonPlacement() {
    // Return DOM element for button
  }

  getUserIdentifier() {
    // Return username/handle
  }

  getPlatformName() {
    return 'myplatform';
  }
}
```
