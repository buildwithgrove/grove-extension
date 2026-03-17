---
name: grove-extension-review
description: >-
  Comprehensive review protocol for the Grove extension. Covers PR checklist,
  test verification, manual smoke tests, and ecosystem sync.
---

# Grove Extension Review <!-- omit in toc -->

<!--
  Local slash command: /grove-extension-review
  Usage: Run `/grove-extension-review` to invoke this command
-->

Your goal is to review code changes in this branch before merging.

- [Review Process](#review-process)
  - [Phase 1: Context Gathering](#phase-1-context-gathering)
  - [Phase 2: Test Validation](#phase-2-test-validation)
  - [Phase 3: Code Review](#phase-3-code-review)
  - [Phase 4: Reporting](#phase-4-reporting)
- [Architecture Checklists](#architecture-checklists)
  - [Address Resolution Strategy](#address-resolution-strategy)
  - [Address Caching & Inline Injection](#address-caching--inline-injection)
  - [Adapter Changes](#adapter-changes)
  - [Common Gotchas](#common-gotchas)
- [Output Format](#output-format)
  - [Full Report File](#full-report-file)
  - [Terminal Summary](#terminal-summary)

## Review Process

Follow these phases in order:

### Phase 1: Context Gathering

1. **Detect Default Branch**:

   ```bash
   git remote show origin | sed -n '/HEAD branch/s/.*: //p'
   ```

   Use the detected branch name in all git diff commands below.

2. **Get Current SHA**:

   ```bash
   git rev-parse --short HEAD
   ```

3. **Analyze Changed Files** (use detected branch):

   ```bash
   git diff --name-only <detected_branch>...HEAD
   ```

4. **Get Full Diff**:

   ```bash
   git diff <detected_branch>...HEAD
   ```

5. **Get Change Stats**:

   ```bash
   git diff --shortstat <detected_branch>...HEAD
   ```

6. **Count Changes by Type**:
   - Adapters: `git diff --name-only <detected_branch>...HEAD | grep -c 'src/adapters/'`
   - Content Scripts: `git diff --name-only <detected_branch>...HEAD | grep -c 'src/content/'`
   - Utils: `git diff --name-only <detected_branch>...HEAD | grep -c 'src/utils/'`
   - Tests: `git diff --name-only <detected_branch>...HEAD | grep -c 'tests/'`

### Phase 2: Test Validation

Run all test suites and verify they pass:

**Unit Tests (Vitest):**

```bash
make test_unit
```

**E2E Tests (Playwright):**

```bash
make test_e2e
```

**Platform-specific tests** (run if changes touch that platform):

| Command                    | When to Run                          |
| -------------------------- | ------------------------------------ |
| `make test_unit_substack`  | Changes to `src/adapters/substack.js` or `src/content/substackHandler.js` |
| `make test_unit_twitter`   | Changes to `src/adapters/twitter.js` or Twitter-related content scripts   |
| `make test_unit_soundcloud`| Changes to `src/adapters/soundcloud.js` or SoundCloud-related logic       |
| `make test_unit_youtube`   | Changes to `src/adapters/youtube.js` or YouTube-related content scripts   |
| `make test_e2e_substack`   | Changes to Substack adapter, handler, or selectors                        |
| `make test_e2e_twitter`    | Changes to Twitter adapter, handler, or selectors                         |
| `make test_e2e_soundcloud` | Changes to SoundCloud adapter or selectors                                |
| `make test_e2e_youtube`    | Changes to YouTube adapter or selectors                                   |

### Phase 3: Code Review

Apply relevant architecture checklists based on changed file types (see below).

### Phase 4: Reporting

1. **Write the full report** to `DO_NOT_COMMIT_GROVE_EXTENSION_REVIEW_RESULTS.md` (see [Full Report File](#full-report-file))
2. **Print a compact terminal summary** (see [Terminal Summary](#terminal-summary))

## Architecture Checklists

### Address Resolution Strategy

**Triggers**: Changes to `src/content/profilePageHandler.js`, `src/content/substackHandler.js`, `src/utils/api.js`

**Why**: We are moving from fragile DOM-based bio parsing to a robust API-first resolution strategy using the Grove Backend.

**How**:
- **Full Page Views**: Use `GroveAPI.resolveDestination(url)` in `ProfilePageHandler`
- **Fallbacks**: Only use `AddressParser.resolveAddress(bio)` if the API resolution fails or returns no results
- **Tippable Pages**: Use `detectTippablePage()` in adapters to identify any page that should trigger a resolution check (including Twitter status pages)

**Verify**:
- [ ] `ProfilePageHandler.initialize()` is called on all tippable pages
- [ ] API resolution happens before DOM fallback
- [ ] Bio extraction only returns the **page author's** bio, not recommended/sidebar authors

### Address Caching & Inline Injection

**Triggers**: Changes to `src/utils/addressCache.js`, `src/content/content.js`

**Why**: To avoid redundant API calls and rate limits, we resolve once per page load and cache the result for inline components.

**How**:
- **Caching**: Always call `setCachedAddress(username, result)` after a successful resolution
- **Consumption**: `TweetProcessor` and `HoverCardHandler` must check the cache before attempting any async bio fetches
- **Username Matching**: Ensure `extractUsernameFromUrl` is consistent across all handlers

**Verify**:
- [ ] Address cache TTL and expiration logic in `src/utils/addressCache.js`
- [ ] `TweetProcessor` injects buttons immediately if the cache is hit

### Adapter Changes

**Triggers**: Changes to any file in `src/adapters/`

**For each modified adapter, verify:**

- [ ] `detectTippablePage()` correctly identifies all tippable page types
- [ ] `extractBio()` only returns the page author's bio (not other authors on the page)
- [ ] `getButtonPlacement()` returns valid DOM elements for button injection
- [ ] `waitForProfileLoad()` waits for the correct elements based on page type
- [ ] Unit tests cover the changed behavior (`make test_unit_<platform>`)
- [ ] E2E tests verify selectors against live sites (`make test_e2e_<platform>`)

### Common Gotchas

- **SPA Navigation**: Ensure `cleanup()` and re-`init()` work correctly on SPA route changes (Twitter/SoundCloud)
- **Wait Logic**: `waitForProfileLoad` must wait for the correct element based on the page type (profile vs status)
- **Extension Context**: Always wrap async storage/API calls in `isExtensionContextValid()` checks
- **Button IDs**: Profile buttons use `#grove-tip-button`; inline tweet buttons use `.grove-tweet-tip-button`
- **Bio Extraction**: `extractBioFromPreloads()` must only match the page author's data, NOT recommended/sidebar authors that Substack injects for logged-in users

## Output Format

### Full Report File

Write the complete review to `DO_NOT_COMMIT_GROVE_EXTENSION_REVIEW_RESULTS.md`. Include:

- Change metrics (branch, SHA, files changed, lines changed)
- Test results table (all commands run, pass/fail status)
- Blocking issues with `[Category] file.js:line - description` format
- Warnings
- Strengths
- Numbered required actions with file paths and specific instructions
- Manual testing checklist (only sections relevant to changed files — see [Manual Testing Sections](#manual-testing-sections) below)
- TODO suggestions with appropriate prefixes

### Terminal Summary

After writing the full report, print ONLY this compact summary to the terminal:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Full report written to: DO_NOT_COMMIT_GROVE_EXTENSION_REVIEW_RESULTS.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Review Summary

Branch: <branch> → <base> | SHA: <sha> | <N> files changed

<1-2 sentence summary of the changes and overall quality.>

Checks: unit tests ✅/❌ | e2e ✅/❌/🔴

<If failures exist, one line explaining root cause.>

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Here's everything I found. What would you like me to fix?   ┃
┃                                                              ┃
┃  Say "DO ALL THE THINGS" to fix everything                   ┃
┃  Or pick specific numbers (e.g., "1, 3, 5")                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

1. <emoji> <Short action description> - <file or command>
2. <emoji> <Short action description> - <file or command>
...

(Numbers correspond to findings in full report)
```

Use these emojis for action types:
- `🔧` Fix / code change
- `🧪` Add / fix tests
- `🎨` Formatting / style
- `📝` Documentation / comments
- `✅` Verify / run checks

### Manual Testing Sections

Generate the manual testing checklist based on changed files. Only include sections relevant to the changed files. Skip sections where no files changed.

**If adapter or content script files changed for a platform, include that platform's section:**

#### Twitter/X (`src/adapters/twitter.js`, `src/content/content.js`) <!-- omit in toc -->

Load the extension unpacked in Chrome, then verify:

- [ ] Visit `x.com/<user_with_crypto_in_bio>` — tip button appears on profile
- [ ] Visit `x.com/<user>/status/<id>` — tip button appears on tweet page
- [ ] Hover over a username in the feed — hover card shows tip button (if address found)
- [ ] Scroll the feed — inline tip buttons appear on tweets from tippable authors
- [ ] Navigate between profiles (SPA) — old button cleans up, new button injects

#### Substack (`src/adapters/substack.js`, `src/content/substackHandler.js`) <!-- omit in toc -->

- [ ] Visit `<author>.substack.com` (subdomain profile) — tip button appears
- [ ] Visit `substack.com/@<author>` (bare domain profile) — tip button appears
- [ ] Visit `<author>.substack.com/p/<post>` (post page) — tip button appears
- [ ] Visit a Substack with NO crypto address — tip button does NOT appear
- [ ] While logged in to Substack, verify tip button targets the page author (not a recommended/sidebar author)

#### SoundCloud (`src/adapters/soundcloud.js`) <!-- omit in toc -->

- [ ] Visit `soundcloud.com/<artist_with_crypto>` — tip button appears
- [ ] Navigate between artists (SPA) — button updates correctly
- [ ] Visit an artist with no crypto address — no button appears

#### YouTube (`src/adapters/youtube.js`) <!-- omit in toc -->

- [ ] Visit `youtube.com/@<channel_with_crypto>` — tip button appears
- [ ] Visit `youtube.com/watch?v=<video_id>` — tip button appears near subscribe
- [ ] Navigate between channels (SPA) — button updates correctly
- [ ] Visit a channel with no crypto address — no button appears

---

**If environment/config files changed (`src/config/environments.js`, `src/config/chains.js`, `src/config/endpoints.js`, `popup.js`):**

#### Environment Switching <!-- omit in toc -->

- [ ] Open popup → toggle Developer Mode ON → confirm endpoint switches to testnet
- [ ] Toggle Developer Mode OFF → confirm endpoint switches back to production
- [ ] In dev mode, switch between testnet/localhost endpoints → chain selector updates correctly
- [ ] Verify the "Top Up" link points to the correct app URL for each environment
- [ ] Verify all "Open App" links point to the correct app URL

#### JWT / Auth <!-- omit in toc -->

- [ ] Sign in via the Grove web app (production) → extension receives JWT and activates
- [ ] Switch to testnet → sign in via testnet app → testnet JWT stored separately
- [ ] Switch back to production → production JWT still works (not overwritten)

---

**If `src/utils/api.js` or `src/content/profilePageHandler.js` changed:**

#### API Resolution <!-- omit in toc -->

- [ ] Visit a tippable profile → check console for `[Grove Extension] [Resolve]` logs → API resolution succeeds
- [ ] Visit a non-tippable profile → no button injected, no errors in console
- [ ] Disconnect internet → visit a tippable profile → graceful fallback, no crash

---

**If `background.js` or `src/storage/keyManager.js` changed:**

#### Background / Storage <!-- omit in toc -->

- [ ] Fresh install (no previous data) → open popup → defaults load correctly
- [ ] Existing install with legacy JWT → verify migration works (check console for `[KeyManager] Migrated`)
- [ ] Inspect `chrome.storage.local` → JWT keys match expected slots (`GROVE_JWT_PRODUCTION`, etc.)

---

**Always include (quick smoke test):**

#### Smoke Test <!-- omit in toc -->

- [ ] Load extension unpacked in Chrome (`chrome://extensions` → Load unpacked)
- [ ] No errors on the extensions page
- [ ] Open popup → UI renders without errors
- [ ] Open DevTools console on a content script page → no uncaught errors

### TODO Comment Prefixes

Use appropriate TODO prefixes:

- `TODO_IMPROVE:` - Code quality improvements, refactoring
- `TODO_OPTIMIZE:` - Performance improvements
- `TODO_TECHDEBT:` - Technical debt to address later
- `TODO_CONSIDERATION:` - Design decisions to revisit

Format:

```javascript
// TODO_IMPROVE: Extract helper function for bio validation
//   Why: Validation logic is duplicated across adapters
//   How: Create shared utility in src/utils/
```
