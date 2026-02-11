# Grove Extension Review <!-- omit in toc -->

<!--
  Local slash command: /grove_extension_review
  Usage: Run `/grove_extension_review` to invoke this command
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
  - [Change Metrics Dashboard](#change-metrics-dashboard)
  - [Pre-Review Checklist Status](#pre-review-checklist-status)
  - [Detailed Findings](#detailed-findings)
  - [Required Actions](#required-actions)
  - [Suggestions for Future (TODO Comments)](#suggestions-for-future-todo-comments)

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
| `make test_e2e_substack`   | Changes to Substack adapter, handler, or selectors                        |
| `make test_e2e_twitter`    | Changes to Twitter adapter, handler, or selectors                         |
| `make test_e2e_soundcloud` | Changes to SoundCloud adapter or selectors                                |

**If any tests fail, tell the user to run:**

```bash
make test_unit    # Fix and re-run unit tests
make test_e2e     # Fix and re-run E2E tests
```

Then re-run the review.

### Phase 3: Code Review

Apply relevant architecture checklists based on changed file types (see below).

### Phase 4: Reporting

Provide structured report with metrics, findings, and actions (see Output Format below).

**After reporting, ask the user:**

> Want me to handle everything automatically?
>
> Say **"DO ALL THE THINGS"** and I'll:
> 1. Run all unit tests (`make test_unit`)
> 2. Run all E2E tests (`make test_e2e`)
> 3. Fix any issues found in review
> 4. Add TODOs for deferred improvements
>
> Or choose specific actions from the list above.

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

### Change Metrics Dashboard

```
Branch: <current_branch> (comparing to <detected_branch>)
SHA: <current_sha>

Files Changed: X total
├─ Adapters:        X files (src/adapters/)
├─ Content Scripts: X files (src/content/)
├─ Utils:           X files (src/utils/)
├─ Tests:           X files (tests/)
└─ Other:           X files

Lines Changed: +X -Y (~Z net)
Complexity: [Low/Medium/High]
```

### Pre-Review Checklist Status

Current SHA: `<sha>`

| Command              | Status | Description                      |
| -------------------- | ------ | -------------------------------- |
| `make test_unit`     | pass/fail  | All Vitest unit tests (574+)     |
| `make test_e2e`      | pass/fail  | All Playwright E2E tests (15+)   |

**Platform-specific (if applicable):**

| Command                     | Status | Description                     |
| --------------------------- | ------ | ------------------------------- |
| `make test_unit_substack`   | pass/fail  | Substack adapter unit tests     |
| `make test_unit_twitter`    | pass/fail  | Twitter adapter unit tests      |
| `make test_unit_soundcloud` | pass/fail  | SoundCloud adapter unit tests   |
| `make test_e2e_substack`    | pass/fail  | Substack E2E tests              |
| `make test_e2e_twitter`     | pass/fail  | Twitter/X E2E tests             |
| `make test_e2e_soundcloud`  | pass/fail  | SoundCloud E2E tests            |

### Detailed Findings

**Blocking Issues:**

List critical issues that MUST be fixed before merge.

Format: `[Category] file.js:line - Issue description`

**Warnings:**

List issues that should be addressed but don't block merge.

**Strengths:**

Highlight what was done well.

### Required Actions

Numbered list of specific actions needed before merge:

1. **Action description**
   - File: `path/to/file.js`
   - What to do: Specific instructions
   - Command (if applicable): `make <target>`

### Suggestions for Future (TODO Comments)

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
