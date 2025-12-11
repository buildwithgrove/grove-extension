# Grove Extension - AI Development Guide

This document explains the tip button surfacing logic for AI assistants working on this codebase.

## Tip Button Flows

The extension shows tip buttons in different contexts on X/Twitter. Each context has a different flow for determining what gets sent to the tip API.

### Quick Reference

| Button Location | Tip Destination Sent to API | Why |
|----------------|----------------------------|-----|
| Profile page | ENS name or profile URL | Backend resolves from profile |
| Hover card | Profile URL | Backend resolves from profile |
| Feed tweet | Cached address (0x/ENS) directly | Backend can't find address in bio from tweet URL |
| Quote tweet | Cached address (0x/ENS) directly | Same as feed tweet |

### The Key Insight

**Profile pages and hover cards** send URLs to the backend because the backend can look up the user's profile and find the address.

**Feed tweets** must send the address directly because:
1. The backend only receives a tweet URL
2. The backend doesn't know to look in the tweet author's bio
3. The extension already fetched the bio client-side, so it passes the address directly

### Flow 1: Profile Page

```
User visits x.com/username
         ↓
initializeProfileButton() extracts bio from page
         ↓
AddressParser.resolveAddress(bio) finds address
         ↓
Stored in global `resolvedAddress`
         ↓
On click: sendTip() sends ENS name (if found) or profile URL
```

### Flow 2: Hover Card

```
User hovers over @username
         ↓
injectButtonIntoTwitterHoverCard() checks display name and bio
         ↓
Address cached via setCachedAddress()
         ↓
On click: sendTweetTip() sends profile URL (not cached address)
```

### Flow 3: Feed Tweet (Display Name Has Address)

```
Tweet appears in feed
         ↓
processTweet() → checkTippableAddress(username, displayName)
         ↓
Address found in display name → cached
         ↓
Button injected
         ↓
On click: sendTweetTip() gets cached address → sends it directly to API
```

### Flow 4: Feed Tweet (Bio Fetch)

```
Tweet appears in feed
         ↓
processTweet() → checkTippableAddress() returns false (no address in display name)
         ↓
queueBioFetch(username, ...)
         ↓
fetchTwitterUserBio() calls Twitter GraphQL API (UserByScreenName)
         ↓
Bio parsed → address extracted → cached
         ↓
injectPendingButtons() adds button to tweet
         ↓
On click: sendTweetTip() gets cached address → sends it directly to API
```

## Bio Fetch Technical Details

- **API**: Twitter's GraphQL endpoint `UserByScreenName`
- **Auth**: Uses user's ct0 cookie (CSRF token) + public bearer token
- **Rate limiting**: 300ms between fetches, max 3 concurrent
- **Caching**: Results cached for 10 minutes
- **Query ID**: `BQ6xjFU6Mgm-WhEP3OiT9w` (Twitter rotates these periodically)

## Key Code Locations

| Function | File | Purpose |
|----------|------|---------|
| `processTweet()` | content.js:1012 | Entry point for feed tweet processing |
| `queueBioFetch()` | content.js:1213 | Queues username for bio fetch |
| `fetchTwitterUserBio()` | content.js:1272 | Calls Twitter GraphQL API |
| `sendTweetTip()` | content.js:1732 | Sends tip, uses cached address |
| `getCachedAddress()` | content.js:1180 | Retrieves cached address for username |
| `AddressParser` | parsers/address.js | Detects 0x and ENS addresses |

## Address Detection

Supported address formats:
- **0x addresses**: `0x` + 40 hex characters
- **ENS names**: `*.eth` including subdomains like `name.base.eth`

The `AddressParser.resolveAddress()` function returns:
```javascript
{ address: string, type: 'raw'|'ens', original: string }
```

## Testing

Bio fetch tests are in `tests/bio-fetch.test.js` covering:
- Address detection from bio text
- Username extraction from URLs
- Tip destination resolution
- Cache TTL expiration
- Queue management
- Twitter API response parsing
- CSRF token extraction
