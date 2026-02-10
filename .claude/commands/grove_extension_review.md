# Grove Extension Review

Guide for reviewing changes to the Grove Browser Extension logic, resolution strategies, and testing patterns.

## 1. Address Resolution Strategy

**Why**: We are moving from fragile DOM-based bio parsing to a robust API-first resolution strategy using the Grove Backend.

**How**:
- **Full Page Views**: Use `GroveAPI.resolveDestination(url)` in `ProfilePageHandler`.
- **Fallbacks**: Only use `AddressParser.resolveAddress(bio)` if the API resolution fails or returns no results.
- **Tippable Pages**: Use `detectTippablePage()` in adapters to identify any page that should trigger a resolution check (including Twitter status pages).

**Verify**:
- Ensure `ProfilePageHandler.initialize()` is called on all tippable pages.
- Check that API resolution happens before DOM fallback.

## 2. Address Caching & Inline Injection

**Why**: To avoid redundant API calls and rate limits, we resolve once per page load and cache the result for inline components.

**How**:
- **Caching**: Always call `setCachedAddress(username, result)` after a successful resolution.
- **Consumption**: `TweetProcessor` and `HoverCardHandler` must check the cache before attempting any async bio fetches.
- **Username Matching**: Ensure `extractUsernameFromUrl` is consistent across all handlers.

**Verify**:
- Verify address cache TTL and expiration logic in `src/utils/addressCache.js`.
- Confirm `TweetProcessor` injects buttons immediately if the cache is hit.

## 3. Testing Layers

**Why**: E2E smoke tests are prone to flakiness due to X.com's rate limits. We use multi-layered testing for better confidence.

**How**:
- **Integration (Logical Truth)**: Use Vitest + JSDOM (`tests/integration/`) to simulate full flows with mocked network/storage.
- **Smoke (Visual Truth)**: Use Playwright (`tests/e2e/`) to verify DOM selectors against live sites.
- **Unit (Functional Truth)**: Use Vitest for isolated utility testing.

**Verify**:
- Logic changes MUST be accompanied by a Vitest integration test.
- Selector changes MUST be verified by a smoke test run.

## 4. Common Gotchas

- **SPA Navigation**: Ensure `cleanup()` and re-`init()` work correctly on SPA route changes (Twitter/SoundCloud).
- **Wait Logic**: `waitForProfileLoad` must wait for the correct element based on the page type (profile vs status).
- **Extension Context**: Always wrap async storage/API calls in `isExtensionContextValid()` checks.
- **Button IDs**: Profile buttons use `#grove-tip-button`; inline tweet buttons use `.grove-tweet-tip-button`.
