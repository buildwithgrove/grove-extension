# Codebase Analysis & Refactoring Plan

**Date:** 2024-12-18
**Branch:** `refactor/code-analysis`

## 1. Overview
The Grove Extension codebase is functional but suffers from technical debt, primarily in the form of a monolithic `popup.js`, code duplication, and unused legacy modules. The current architecture relies heavily on global variables and script tags in `popup.html`, which makes dependency management and testing difficult.

## 2. Key Findings

### 2.1. Monolithic `popup.js`
*   **Issue:** `popup.js` is over 3,500 lines long. It handles everything: UI rendering for 5 tabs (Home, History, Leaderboard, Earn, Settings), API interactions, storage management, and authentication flow.
*   **Impact:** High cognitive load for developers, difficult to test individual components, prone to regression bugs.
*   **Recommendation:** Split `popup.js` into modular controllers and services.

### 2.2. Code Duplication & Consistency
*   **Issue:** `parseDestination` logic is duplicated.
    *   Defined in `src/parsers/destination.js` (exported as `window.parseDestination`).
    *   **Re-implemented** in `popup.js` (line 3128) with identical logic.
    *   `popup.html` does NOT load `src/parsers/destination.js`.
*   **Impact:** Changes to parsing logic must be made in two places. Tests run against `destination.js` but the app uses the inline logic in `popup.js`.
*   **Recommendation:** Remove the inline function in `popup.js` and include `src/parsers/destination.js` in `popup.html`.

### 2.3. Dead & Unused Code
*   **`src/utils/balance.js`**: Contains logic for direct RPC calls (`getEthBalance`, `getUsdcBalance`, `getBalances`). `popup.js` uses `GroveAPI.getAccount` (REST API) instead. This file appears unused in the active extension flow.
*   **`src/adapters/reddit.js` & `src/adapters/youtube.js`**: Commented out "future features". While preservation is requested, they clutter the codebase if not actively developed.
*   **`src/adapters/generic.js`**: Instantiated in `content.js` but relies on `MetadataFetcher`. Needs to be verified if it's actually working as intended since `content.js` logic handles most things.

### 2.4. Auth Flow Fragmentation
*   **Issue:** Auth logic is split:
    *   `popup.js`: Triggers login, handles UI state updates.
    *   `background.js`: Handles `chrome.identity` flow.
    *   `src/auth/xAuth.js`: utility class for token management.
*   **Impact:** Race conditions (as seen in the recent bug fix) where popup closes during auth and loses state.
*   **Recommendation:** Centralize state management. The `background.js` should be the source of truth for auth state, and `popup.js` should merely subscribe to it.

## 3. Refactoring Plan

### Phase 1: Cleanup & De-duplication (Immediate)
1.  **Remove `src/utils/balance.js`** if confirmed unused (check `content.js` one last time).
2.  **Fix `parseDestination`**:
    *   Delete the `parseDestination` function from `popup.js`.
    *   Add `<script src="src/parsers/destination.js"></script>` to `popup.html`.
3.  **Audit Exports**: Ensure all `src/utils/*.js` files properly export to `window` if they are to be used via script tags, or move to a bundler (Phase 3).

### Phase 2: Modularize `popup.js` (High Impact)
Break `popup.js` into:
*   `src/ui/controllers/HomeTab.js`
*   `src/ui/controllers/HistoryTab.js`
*   `src/ui/controllers/LeaderboardTab.js`
*   `src/ui/controllers/SettingsTab.js`
*   `src/ui/controllers/EarnTab.js`
*   `src/ui/NavigationController.js` (Handles tab switching)

Update `popup.html` to load these new scripts.

### Phase 3: Modern Build System (Strategic)
*   **Issue:** Current reliance on `<script>` order in HTML is fragile.
*   **Recommendation:** Introduce a bundler (Vite, Webpack, or Esbuild).
    *   Allow using `import` / `export` statements.
    *   Tree-shaking for dead code.
    *   Type safety (JSDoc or TypeScript).

## 4. Actionable Next Steps
1.  Create a PR to deduplicate `parseDestination`.
2.  Create a PR to remove `src/utils/balance.js`.
3.  Start extracting the `HistoryTab` logic from `popup.js` as a proof-of-concept for modularization.
