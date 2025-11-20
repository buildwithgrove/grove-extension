# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms.

- [Development](#development)
- [Production](#production)
- [Adding Support for New Platforms](#adding-support-for-new-platforms)
  - [Step 1: Capture Platform Structure](#step-1-capture-platform-structure)
  - [Step 2: Use AI to Generate the Adapter](#step-2-use-ai-to-generate-the-adapter)
  - [Step 3: Integration Checklist](#step-3-integration-checklist)
  - [Example Reference: YouTube Implementation](#example-reference-youtube-implementation)
- [TODOs](#todos)

## Development

1. Go to [chrome://extensions/](chrome://extensions/)
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `grove_extension` directory
5. Install [Extensions Reloader](https://chrome.google.com/webstore/devconsole/dae6b43a-3491-4dd0-8565-a29acfbd30f3/dlebkjfkgbobnfhdjkkmfllelijafkpn/edit) to quickly reload extension after code changes (click `Reload` button)

## Production

1. `make build_zip_extension`
2. Go to [the Grove package upload](https://chrome.google.com/webstore/devconsole/dae6b43a-3491-4dd0-8565-a29acfbd30f3/dlebkjfkgbobnfhdjkkmfllelijafkpn/edit/package)
3. Upload `./grove_extension/build/grove-extension-v1.0.0.zip`

## Adding Support for New Platforms

To add the Tip button to a new social platform, follow this workflow:

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
- [ ] Add platform detection in `src/content/content.js` (`detectPlatform()` function)
- [ ] Add button creation method in `src/ui/button.js` (`create[Platform]Button()`)
- [ ] Add platform-specific styles in `src/ui/styles.css`
- [ ] Update `manifest.json` with:
  - URL patterns in `content_scripts.matches`
  - Required script files in `content_scripts.js`
  - CSS files in `content_scripts.css`
- [ ] Test on multiple pages/profiles on the platform
- [ ] Update README platform checklist

### Example Reference: YouTube Implementation

Our YouTube conversation demonstrates this workflow:

1. Screenshot provided showing Like/Dislike/Share buttons
2. HTML structure shared from the `#top-level-buttons-computed` container
3. AI generated:
   - `src/adapters/youtube.js` - detects video pages, extracts descriptions, finds button placement
   - YouTube button creation in `src/ui/button.js` - matches YouTube's `yt-button-shape` structure
   - CSS styles matching YouTube's tonal button design
   - Manifest updates for youtube.com URLs

The complete implementation took ~10 minutes with AI assistance.

## TODOs

### Extension Popup <!-- omit in toc -->

- [ ] Create popup UI when clicking chrome extension icon
  - [ ] Check if `GROVE_API_JWT` is loaded
  - [ ] If JWT exists: Display current balance
  - [ ] If no JWT: Link to [grove.city/api](https://grove.city/api) to create one
  - [ ] Add button to create EVM wallet in app OR link to external wallet creation

### Tip Button Enhancement <!-- omit in toc -->

- [ ] Extract and refine the Tip button component
- [ ] Enhance styling to make it an "internet standard" quality button
- [ ] Ensure reusability across platforms

### Platform Adapters <!-- omit in toc -->

Build adapters for the following platforms:

- [x] Twitter/X
- [x] YouTube
- [x] Reddit
- [ ] Instagram
- [ ] TikTok
- [ ] PornHub
- [ ] OnlyFans
- [ ] GitHub (placeholder exists, needs implementation)

### User Experience <!-- omit in toc -->

- [ ] Move PROD/localhost toggle to a better location
- [ ] Link users to explorer: [x402scan.com/server/170d2ee7-73b4-457f-aa48-dbab753f6d5f](https://www.x402scan.com/server/170d2ee7-73b4-457f-aa48-dbab753f6d5f)
- [ ] Link users to ecosystem: [x402.org/ecosystem](https://www.x402.org/ecosystem?category=services-endpoints)

### Future Considerations <!-- omit in toc -->

- Wallet management integration
- Balance display and refresh mechanism
- Multi-wallet support
- Tip history tracking
