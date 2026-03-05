# Grove Extension Review Results <!-- omit in toc -->

- [Change Metrics](#change-metrics)
- [Test Results](#test-results)
- [Findings](#findings)
  - [Critical](#critical)
  - [High](#high)
  - [Medium](#medium)
  - [Low](#low)
- [Strengths](#strengths)
- [Required Actions](#required-actions)
- [Manual Testing Checklist](#manual-testing-checklist)

## Change Metrics

| Metric | Value |
|--------|-------|
| Branch | `wallet_address_refactor_client_embedded_external` → `main` |
| SHA | `98c9396` |
| Files changed | 26 |
| Lines | +1512 / -781 |
| Adapters | 0 |
| Content scripts | 3 |
| Utils | 1 |
| Tests | 6 |

## Test Results

| Suite | Command | Result |
|-------|---------|--------|
| Unit tests (657) | `make test_unit` | ✅ All pass |
| E2E tests (16 passed, 2 skipped) | `make test_e2e` | ✅ All pass |

## Findings

### Critical

#### 1. Duplicate `migrateWalletStorageKeys` function — merge artifact

**[Bug] `popup.js:1768` and `popup.js:1803`**

The function `migrateWalletStorageKeys` is declared twice. Both are nearly identical — the second copy (line 1803) has one extra comment ("Always clean up old keys regardless"). In non-module browser JS, the second declaration silently wins. This is a rebase/merge artifact that should be cleaned up.

**Fix:** Delete the first copy (lines 1762–1795) and keep only the second (lines 1797–1832).

---

#### 2. `externally_connectable` domain change — verify app deployment domain

**[Bug/Security] `manifest.json:29-31`**

Changed from `https://app.grove.city/*` to `https://grove.city/*`. If the Grove web app still deploys at `app.grove.city`, Chrome will silently block all `SET_JWT`, `GET_JWT`, `PING`, and `OPEN_POPUP` messages from the app, completely breaking the JWT auth flow.

Per `AGENTS.md:634`, the documented domain is still `https://app.grove.city/*`.

**Fix:** Cross-check the `grove-app` deployment URL. If the app moved to `grove.city`, this is correct. If not, revert to `app.grove.city`.

---

### High

#### 3. `clearAllKeys` missing `SMART_ACCOUNT_ADDRESS` and `EXTERNAL_LINKED_WALLETS`

**[Bug] `popup.js:1379-1385`**

`disconnectSlot()` (line 1280) correctly clears all four address keys (`EARNING_ADDRESS`, `TIPPING_ADDRESS`, `SMART_ACCOUNT_ADDRESS`, `EXTERNAL_LINKED_WALLETS`). But `clearAllKeys()` only clears two (`EARNING_ADDRESS`, `TIPPING_ADDRESS`), leaving stale smart account and linked wallet data in storage after "Clear All Keys".

**Fix:** Add the two missing keys to `clearAllKeys()`:

```javascript
await chrome.storage.local.remove([
  STORAGE_KEYS.EARNING_ADDRESS,
  STORAGE_KEYS.TIPPING_ADDRESS,
  STORAGE_KEYS.SMART_ACCOUNT_ADDRESS,
  STORAGE_KEYS.EXTERNAL_LINKED_WALLETS,
  STORAGE_KEYS.ENS_NAME,
  STORAGE_KEYS.CDP_IDENTITY_TYPE,
  STORAGE_KEYS.CDP_IDENTITY_VALUE,
]);
```

---

#### 4. `{tweet_url}` placeholder left as literal text when empty

**[Bug] `src/content/content.js:843` + `src/content/xFeatures.js:33`**

`content.js` passes `tweet_url: ''` to `buildAutoReplyMessage()`. Since `buildAutoReplyMessage` guards with `if (data.tweet_url)`, the empty string is falsy and the `{tweet_url}` placeholder stays in the output literally. The auto-reply template is:

```
Hey @{username}, I enjoyed your post {tweet_url} so I tipped you...
```

This produces: `"Hey @user, I enjoyed your post {tweet_url} so I tipped you..."` — the raw placeholder is visible in the tweet.

**Fix:** Update `buildAutoReplyMessage` to strip the placeholder when empty:

```javascript
if (data.tweet_url) {
  message = message.replace(/{tweet_url}/g, data.tweet_url);
} else {
  message = message.replace(/\s*\{tweet_url\}\s*/g, ' ');
}
```

---

#### 5. `handleEarnAddSocialLink` pushes `result.data` without shape validation

**[Bug] `popup.js:~2217`**

After `GroveAPI.addSocialLink()` succeeds, `result.data` is pushed directly into `earnSocialLinksCache`. The `renderEarnSocialLinks()` function immediately calls `.platform.localeCompare()` on each entry. If `result.data` is `null`, missing `platform`, or an unexpected shape, this will throw an uncaught error and crash the render.

**Fix:** Guard the push:

```javascript
if (result.data && result.data.platform) {
  earnSocialLinksCache.push(result.data);
} else {
  await loadEarnSocialLinks();
  return;
}
```

---

### Medium

#### 6. `AGENTS.md` still references old `app.grove.city` URLs in 4 places

**[Consistency] `AGENTS.md:115, 600, 606, 634`**

The PR updates `environments.js` to use `grove.city`, but `AGENTS.md` — the documented single source of truth — still shows `app.grove.city` in the environment table, deep links table, referral link, and `externally_connectable` block.

**Fix:** Update all 4 references in `AGENTS.md` to match the new domain (or revert `environments.js` if finding #2 determines the app hasn't moved).

---

#### 7. Discord `normalizeSocialUrl` returns raw handle, not URL

**[Bug] `popup.js:~1607`**

```javascript
case 'discord': return handle; // No URL normalization for Discord
```

Returns the raw Discord username (e.g., `myname#1234`). This is passed to `GroveAPI.addSocialLink(platform, url, jwt)` as the `url` field. If the API validates URL format, this will fail. The display function `socialDisplayLabel()` handles this gracefully via try/catch but shows the raw input, inconsistent with other platforms.

**Fix:** Ensure the API accepts raw handles for Discord, or normalize to a URL like `https://discord.com/users/{handle}`.

---

### Low

#### 8. `updateEnsNameDisplay` is a no-op called in 6+ places

**[Dead Code] `popup.js:~2397`**

The function body is now an intentional no-op comment, but it's still called from `fetchBalance`, `disconnectSlot`, `clearAllKeys`, `handleDevModeToggle`, etc. These are harmless no-op calls but add confusion.

**Fix (optional):** Either remove the function and all call sites, or add a `TODO_TECHDEBT` comment explaining why the calls are preserved.

---

#### 9. `AGENTS.md:600` stale line number for referral link

**[Docs] `AGENTS.md:600`**

References `popup.js:3997` for the referral link, but line numbers have shifted significantly in this PR (+300 lines). The URL also still says `app.grove.city`.

**Fix:** Update the line reference and URL.

---

## Strengths

- **Clean storage key migration**: `migrateWalletStorageKeys` properly handles fallback from `EMBEDDED_WALLET_ADDRESS` → `EARNING_ADDRESS` and cleans up old keys
- **Comprehensive test coverage**: 657 unit tests and 18 E2E tests all pass, including new tests for wallet migration and environment changes
- **Consistent naming convention**: The rename from `CLIENT_ADDRESS`/`EMBEDDED_WALLET_ADDRESS`/`ONCHAIN_ADDRESS` to `EARNING_ADDRESS`/`TIPPING_ADDRESS` is applied consistently across storage keys, API calls, and UI
- **New `storageKeys.js` config**: Centralizes all storage key definitions, reducing magic strings scattered across files

## Required Actions

| # | Action | File | Description |
|---|--------|------|-------------|
| 1 | 🔧 Remove duplicate function | `popup.js:1762-1795` | Delete first `migrateWalletStorageKeys` copy (rebase artifact) |
| 2 | ✅ Verify `externally_connectable` | `manifest.json:29-31` | Cross-check `grove-app` deployment domain. Revert to `app.grove.city` if app hasn't moved |
| 3 | 🔧 Add missing keys to `clearAllKeys` | `popup.js:1379` | Add `SMART_ACCOUNT_ADDRESS` and `EXTERNAL_LINKED_WALLETS` |
| 4 | 🔧 Fix `{tweet_url}` placeholder | `src/content/xFeatures.js:33` | Strip placeholder when `tweet_url` is empty instead of leaving literal text |
| 5 | 🔧 Validate `result.data` shape | `popup.js:~2217` | Guard `earnSocialLinksCache.push(result.data)` against malformed responses |
| 6 | 📝 Update `AGENTS.md` URLs | `AGENTS.md:115,600,606,634` | Sync `app.grove.city` → `grove.city` (or vice versa based on #2) |
| 7 | 🔧 Discord URL normalization | `popup.js:~1607` | Verify API accepts raw handles or normalize to URL |

## Manual Testing Checklist

### Environment Switching <!-- omit in toc -->

- [ ] Open popup → toggle Developer Mode ON → confirm endpoint switches to testnet
- [ ] Toggle Developer Mode OFF → confirm endpoint switches back to production
- [ ] In dev mode, switch between testnet/localhost endpoints → chain selector updates correctly
- [ ] Verify the "Top Up" link points to the correct app URL for each environment
- [ ] Verify all "Open App" links point to the correct app URL

### JWT / Auth <!-- omit in toc -->

- [ ] Sign in via the Grove web app (production) → extension receives JWT and activates
- [ ] Switch to testnet → sign in via testnet app → testnet JWT stored separately
- [ ] Switch back to production → production JWT still works (not overwritten)

### API Resolution <!-- omit in toc -->

- [ ] Visit a tippable profile → check console for `[Grove Extension] [Resolve]` logs → API resolution succeeds
- [ ] Visit a non-tippable profile → no button injected, no errors in console

### Background / Storage <!-- omit in toc -->

- [ ] Fresh install (no previous data) → open popup → defaults load correctly
- [ ] Existing install with legacy storage keys (`GROVE_CLIENT_ADDRESS`, `GROVE_EMBEDDED_WALLET_ADDRESS`, `GROVE_ONCHAIN_ADDRESS`) → verify migration to new keys works (check console for `[Grove Extension] Migrated wallet storage keys`)
- [ ] Inspect `chrome.storage.local` → keys match expected new format (`GROVE_EARNING_ADDRESS`, `GROVE_TIPPING_ADDRESS`, etc.)

### Twitter/X <!-- omit in toc -->

- [ ] Visit `x.com/<user_with_crypto_in_bio>` — tip button appears on profile
- [ ] Hover over a username in the feed — hover card shows tip button (if address found)
- [ ] Navigate between profiles (SPA) — old button cleans up, new button injects

### Smoke Test <!-- omit in toc -->

- [ ] Load extension unpacked in Chrome (`chrome://extensions` → Load unpacked)
- [ ] No errors on the extensions page
- [ ] Open popup → UI renders without errors
- [ ] Open DevTools console on a content script page → no uncaught errors
