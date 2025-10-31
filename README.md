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

- `content.js:31` - Platform detection logic
- `address.js:14` - Address parsing regex
- `twitter.js:32` - Twitter bio extraction
- `button.js:48` - Button injection logic
- `api.js:16` - API placeholder (TODO)

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

## Adding New Platforms

1. Create new adapter in `src/adapters/platform.js`
2. Extend `BaseAdapter` class
3. Implement required methods
4. Add platform detection in `content.js:31`
5. Update manifest.json with new URL patterns

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
