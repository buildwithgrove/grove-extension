# Code Cleanup Plan

This document outlines the plan to remove dead code, consolidate redundant code, and improve maintainability.

---

## Phase 1: Remove Duplicate Functions

### 1.1 Consolidate `parseDestination()`
**Current state:** Identical function defined in two places
- `popup.js:3128-3182` (54 lines)
- `src/parsers/destination.js:11-65` (54 lines)

**Action:** Remove the definition from `popup.js` and import from `src/parsers/destination.js`

### 1.2 Consolidate `DEFAULT_AUTO_REPLY_MESSAGE`
**Current state:** Identical constant defined in two places
- `popup.js:153-157`
- `src/content/content.js:1809-1813`

**Action:** Move to `src/config/constants.js` (new file) and import in both places

---

## Phase 2: Consolidate Storage Keys

### 2.1 Create unified storage keys config
**Current state:** JWT and storage keys defined in 3 places
- `background.js:5-10` - `JWT_STORAGE` object
- `src/content/content.js:10-16` - `JWT_KEYS` object
- `popup.js:111-133` - `STORAGE_KEYS` object

**Action:** Create `src/config/storageKeys.js` with single source of truth, update all three files to import from it

---

## Phase 3: Remove Dark Mode Duplication

### 3.1 Consolidate dark mode detection
**Current state:** Similar logic in two places
- `src/ui/button.js:24-84` - `detectDarkMode()` and `isColorDark()` methods
- `src/content/content.js:2061-2073` - `detectDarkMode()` function

**Action:** Keep the more comprehensive version in `button.js`, remove from `content.js` and call the TipButton method or extract to shared utility

---

## Phase 4: Consolidate Button State Management

### 4.1 Extract ButtonStateManager
**Current state:** Nearly identical inline objects (~60 lines each)
- `src/content/content.js:912-970` - hover card button states
- `src/content/content.js:1640-1702` - tweet button states

**Action:** Create `src/ui/buttonState.js` with reusable `createButtonStateManager(button, options)` function

---

## Phase 5: Remove Reddit and YouTube Code

Delete all Reddit and YouTube related code entirely.

### 5.1 Delete adapter files
- `src/adapters/reddit.js` - Delete entire file (~160 lines)
- `src/adapters/youtube.js` - Delete entire file (~115 lines)

### 5.2 Clean up `src/ui/button.js`
Remove commented code:
- Lines 35-47: Reddit dark mode detection
- Lines 49-55: YouTube dark mode detection
- Lines 92-99: Reddit/YouTube button creation conditionals
- Lines 259-430: `createRedditButton()`, `createRedditHoverCardButton()`, `createRedditProfileButton()` methods
- Lines 431-550: `createYouTubeButton()` method
- Lines 771-772, 818-819, 883-884, 911-913: YouTube/Reddit checks in state methods

### 5.3 Clean up `src/content/content.js`
Remove commented code:
- Lines 202-204: Reddit hover card setup
- Lines 290-297: Reddit/YouTube adapter detection
- Lines 591-679: `setupRedditHoverCardObserver()` and related functions

### 5.4 Clean up `src/ui/styles.css`
Remove CSS rules:
- Lines 107-202: `.grove-tip-button-reddit` and `.grove-tip-button-reddit-profile` styles
- Lines 204-256: `.grove-tip-button-youtube` styles
- Lines 333-335: Reddit/YouTube disabled state comments

### 5.5 Clean up `src/utils/api.js`
Remove commented code:
- Lines 151-164: YouTube URL handling comments

### 5.6 Clean up `src/utils/tipErrors.js`
- Line 395: Remove Reddit/GitHub comment reference

### 5.7 Update `claude.md`
- Lines 341-344: Remove references to Reddit and YouTube adapters in "Adding Support for New Platforms" section

---

## Summary

| Phase | Files Changed | Lines Removed | Priority |
|-------|--------------|---------------|----------|
| 1.1 parseDestination | 2 | ~54 | High |
| 1.2 DEFAULT_AUTO_REPLY_MESSAGE | 3 | ~8 | High |
| 2.1 Storage keys | 4 | ~30 | Medium |
| 3.1 Dark mode | 2 | ~15 | Medium |
| 4.1 Button states | 2 | ~60 | Low |
| 5.1 Delete Reddit/YouTube adapters | 2 | ~275 | High |
| 5.2-5.7 Remove Reddit/YouTube refs | 5 | ~350 | High |

**Total estimated reduction:** ~790 lines of code

---

## Files to Delete

1. `src/adapters/reddit.js`
2. `src/adapters/youtube.js`

## Files to Create

1. `src/config/constants.js` - Shared constants (DEFAULT_AUTO_REPLY_MESSAGE)
2. `src/config/storageKeys.js` - Unified storage key definitions
3. `src/ui/buttonState.js` - Reusable button state management (optional)

---

## Approval Checklist

- [ ] Phase 1: Remove duplicate functions
- [ ] Phase 2: Consolidate storage keys
- [ ] Phase 3: Remove dark mode duplication
- [ ] Phase 4: Consolidate button state management
- [ ] Phase 5: Remove Reddit and YouTube code
