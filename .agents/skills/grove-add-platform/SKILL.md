---
name: grove-add-platform
description: >-
  Guided workflow for adding a new social platform to the Grove extension. Use
  when adding support for YouTube, SoundCloud, or other social sites. Covers
  research, implementation, and ecosystem integration.
---

# Add New Social Graph <!-- omit in toc -->

<!--
  Local slash command: /grove_add_social_graph
  Usage: Run `/grove_add_social_graph` to start a guided workflow for adding a new social platform
-->

Your goal is to guide the user through adding support for a new social platform to the Grove extension. This is a multi-phase process that starts with research, then implementation, then ecosystem integration.

- [Phase 1: Platform Discovery](#phase-1-platform-discovery)
- [Phase 2: DOM Research](#phase-2-dom-research)
- [Phase 3: Core Implementation](#phase-3-core-implementation)
- [Phase 4: Ecosystem Integration](#phase-4-ecosystem-integration)
- [Phase 5: Verification](#phase-5-verification)

## Phase 1: Platform Discovery

Ask the user the following questions to understand the platform before writing any code.

**Question 1 — Platform basics:**

- What is the platform name? (e.g., "YouTube", "SoundCloud")
- What is the domain? (e.g., `youtube.com`)
- Does it use subdomains for profiles? (e.g., `author.substack.com` vs `youtube.com/@author`)

**Question 2 — Tippable page types:**

- Which page types should show the tip button? Select all that apply:
  - Profile/Channel pages
  - Individual content pages (posts, videos, tracks)
  - Hover cards / popups
  - Feed/timeline items (inline buttons)

**Question 3 — URL patterns:**

For each tippable page type, what are the URL patterns? Examples:

| Page Type | URL Pattern |
|-----------|-------------|
| Profile | `youtube.com/@username` |
| Video | `youtube.com/watch?v=ID` |
| Shorts | `youtube.com/shorts/ID` |

**Question 4 — Where does the crypto address live?**

- Display name / username field?
- Bio / description / about section?
- External links section?
- Other metadata?

**Question 5 — SPA behavior:**

- Is the platform an SPA (Single Page Application)?
- Does navigation between pages trigger full page reloads or client-side routing?
- If SPA: does YouTube's `yt-navigate-finish` pattern apply, or does it use `popstate` / `pushState`?

**Question 6 — API & auth:**

- Does the Grove backend API already support `/resolve` for this platform's URLs?
- Is there a public API for fetching user bios? (If so, what's the endpoint?)
- Does fetching bios require authentication? (API key, CSRF token, cookies?)

**Question 7 — Test accounts:**

- Provide at least 1 profile URL with a crypto address (positive test case)
- Provide at least 1 profile URL without a crypto address (negative test case)

**Question 8 — Dark mode:**

- Does the platform have a dark mode?
- How is dark mode indicated in the DOM? (CSS class, HTML attribute, CSS variable, background color?)

---

After gathering answers, summarize them in a **Platform Spec** table before proceeding:

```
Platform:       [name]
Domain:         [domain.com]
Subdomains:     [yes/no]
SPA:            [yes/no]
Page types:     [profile, video, ...]
Address source: [bio, display name, ...]
Dark mode:      [attribute, class, CSS var, generic]
API /resolve:   [supported/not yet]
Bio API:        [endpoint or N/A]
Auth required:  [yes (key name) / no]
Positive test:  [URL]
Negative test:  [URL]
```

Wait for user confirmation before proceeding.

## Phase 2: DOM Research

For each tippable page type, inspect the platform's HTML structure:

1. **Visit each page type** from the test URLs provided
2. **Identify these DOM elements:**
   - Bio/description container (CSS selector)
   - Display name element (CSS selector)
   - Button placement target — where should the tip button go? (near subscribe, follow, like, etc.)
   - Wait-for element — what element signals the page has loaded? (for `waitForProfileLoad()`)
3. **Identify system routes** that should NOT be tippable (search, feed, settings, etc.)

Document findings:

```
Page Type: [e.g., Channel Page]
  Bio selector:       [e.g., #description-container]
  Display name:       [e.g., ytd-channel-name #text]
  Button placement:   [e.g., #subscribe-button]
  Wait-for element:   [e.g., ytd-channel-name #text]
  System routes:      [feed, results, playlist, ...]
```

Present findings and wait for user confirmation.

## Phase 3: Core Implementation

Implement these files in order. Reference `AGENTS.md` section "Adding Support for New Platforms" for patterns.

### 3A. Create the adapter

Create `src/adapters/[platform].js` extending `BaseAdapter`.

Required methods (see `src/adapters/base.js` for interface):
- `detectTippablePage()` — URL-based page type detection
- `extractBio()` — Combine display name + bio text
- `extractDisplayName()` — Display name extraction
- `getButtonPlacement()` — DOM element to place button near
- `waitForProfileLoad()` — Wait for page-specific elements
- `getPlatformName()` — Return platform string identifier
- `extractUsernameFromUrl(url)` — Parse username from URL
- `getProfileUrl(username)` — Build profile URL from username

Reference adapters:
- Simple: `src/adapters/soundcloud.js`, `src/adapters/youtube.js`
- Complex: `src/adapters/substack.js`, `src/adapters/twitter.js`

### 3B. Create handler (if needed)

- **Simple platforms** (profile-only, no hover cards): Use `ProfilePageHandler` directly. No handler needed.
- **Complex platforms** (hover cards, inline buttons, multiple injection points): Create `src/content/[platform]Handler.js`

Reference: `src/content/substackHandler.js`, `src/content/hoverCardHandler.js`

### 3C. Update content.js

In `src/content/content.js`:

1. Add platform detection in adapter factory:
   ```javascript
   if (hostname.includes('[platform].com')) {
     return new window.[Platform]Adapter();
   }
   ```

2. Add handler initialization (if custom handler created):
   ```javascript
   if (currentAdapter.getPlatformName() === '[platform]') {
     // Initialize handler with callbacks
   }
   ```

### 3D. Update manifest.json

Add content script entry:
```json
{
  "matches": ["https://[platform].com/*"],
  "js": [
    "src/parsers/address.js",
    "src/utils/darkMode.js",
    "src/utils/addressCache.js",
    "src/utils/api.js",
    "src/ui/constants.js",
    "src/ui/button.js",
    "src/ui/tipModal.js",
    "src/ui/styles.js",
    "src/adapters/base.js",
    "src/adapters/[platform].js",
    "src/content/profilePageHandler.js",
    "src/content/content.js"
  ],
  "css": ["src/ui/styles.css"],
  "run_at": "document_idle"
}
```

If subdomains: use `"matches": ["https://*.platform.com/*", "https://platform.com/*"]`

### 3E. Add CSS styles

Add platform-specific button styles in `src/ui/styles.css`:
```css
.grove-[platform]-tip-button { }
.grove-[platform]-tip-button:hover { }
```

### 3F. Add dark mode detection

If the platform has non-generic dark mode detection, add a block in `src/utils/darkMode.js`:
```javascript
if (platform === '[platform]') {
  // Platform-specific detection
}
```

### 3G. Write unit tests

Create `tests/[platform]-adapter.test.js` covering:
- `detectTippablePage()` — positive and negative URL patterns
- `extractBio()` — with and without bio content
- `extractDisplayName()` — element present and missing
- `getButtonPlacement()` — element present and missing
- `getPlatformName()` — returns correct string
- `extractUsernameFromUrl()` — various URL formats
- `getProfileUrl()` — builds correct URL

Reference: `tests/youtube-adapter.test.js`, `tests/soundcloud-adapter.test.js`

## Phase 4: Ecosystem Integration

After core implementation works, add the platform to all surrounding systems.

### 4A. Leaderboard renderer (`src/ui/leaderboardRenderer.js`)

- Add SVG icon to `icons` object
- Add detection in `detectPlatform()` (before the generic `.com` fallback)
- Add entry in `getPlatformIcon()` icon map
- Add entry in `buildPlatformIconCell()` icon map
- Add platform to `contentPlatforms` set in `getContentPlatform()`
- Update `detectPlatform()` JSDoc `@returns`

### 4B. History renderer (`src/ui/historyRenderer.js`)

- Add SVG icon to `icons` object
- Add `is[Platform]Url()` helper
- Add platform branch in `buildPlatformLink()`

### 4C. README.md

Add row to the Address Resolution Matrix table.

### 4D. Review command (`.claude/commands/grove_extension_review.md`)

- Add `make test-unit-[platform]` to platform-specific test triggers table
- Add `make test-unit-[platform]` and `make test-e2e-[platform]` to test status table
- Add manual testing checklist section

### 4E. E2E tests (`tests/e2e/smoke.spec.js`)

Add at minimum:
- Positive test: page with crypto address shows tip button
- Negative test: page without crypto address does NOT show tip button

### 4F. Makefile (`makefiles/test.mk`)

Add targets:
```makefile
.PHONY: test-e2e-[platform]
test-e2e-[platform]: ## Run [Platform] E2E tests
	$(call print_info_section,Running [Platform] E2E tests)
	$(Q)$(NPM) exec playwright -- test --grep "[platform]"
```

### 4G. AGENTS.md

- Add `make test-e2e-[platform]` to the E2E testing table in the Testing section
- Add adapter to the reference examples list in "Adding Support for New Platforms > Adapters"

## Phase 5: Verification

Run these checks in order:

1. **Unit tests (all):**
   ```bash
   make test-unit
   ```

2. **Platform-specific unit tests:**
   ```bash
   make test-unit-[platform]
   ```

3. **Platform-specific E2E tests:**
   ```bash
   make test-e2e-[platform]
   ```

4. **Manual smoke test:**
   - Load extension unpacked in Chrome
   - Visit positive test URL — tip button appears
   - Visit negative test URL — no tip button
   - If SPA: navigate between pages — button updates correctly

Report results and any issues found.
