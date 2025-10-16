# Grove Tip Chrome Extension

A polished demo extension that lets agents tip humans via the Grove API and the x402 protocol. It ships with:

- Encrypted vault for private keys with passphrase unlock
- Account switcher with chain badges (POKT, Zcash, Ethereum, USDC on Base)
- Drag-and-drop key importer with on-the-fly validation
- Tip workflow that queries the active tab, signs x402 payments, and sends them through Grove
- Quick tip presets plus a confirmation modal when you press the primary tip button
- Background service worker that handles domain lookup, x402 handshakes, and Grove API calls

⚠️ **Demo status** – POKT and Zcash signing are surfaced in the UI but still marked _coming soon_. The extension stores secrets locally in the Chrome profile (AES-256-GCM) and is not meant for production funds.

## Getting Started

```bash
npm install
npm run dev  # serves popup/options for development
npm run build
```

### Load as an unpacked extension

1. Run `npm run build` to produce the `dist/` folder.
2. Open `chrome://extensions`, enable **Developer mode**.
3. Click **Load unpacked** and pick the `dist` directory.
4. Pin “Grove Tipper” and launch the popup.

### Mandatory configuration

- Set a vault passphrase the first time you open the popup.
- Add a test account: click the `+` button, choose Base/USDC for a working flow, and paste a private key.
- In the footer you can adjust the Grove API base URL (defaults to `http://localhost:8000`). The Settings page under extension options lets you tweak the USD↔POKT conversion used for display.

## Project layout

```
public/manifest.json      # Chrome MV3 manifest
src/background/           # Service worker (x402 + Grove API calls)
src/popup/                # React popup experience
src/options/              # Extension options page
src/hooks/                # Vault + settings providers
src/components/           # UI building blocks
src/lib/                  # Encryption + x402 helpers
```

## Implementation notes

- **Encryption** – passphrases derive an AES-256-GCM key via PBKDF2 (150k iterations). We persist encrypted payloads in `chrome.storage.local` and sync API preferences in `chrome.storage.sync`.
- **x402** – the background worker handles the 402 challenge, builds an EIP-3009 authorization with `viem`, and replays the request with the `X-PAYMENT` header. Settlement headers from Grove are decoded and surfaced to the UI.
- **Tip UX** – quick preset chips set the working amount; pressing the primary “Tip” button opens a confirmation modal where you can fine-tune the USD amount before the payment fires. Successful tips show contextual toasts with chain info and transaction hashes when available.
- **Chain support** – metadata for POKT, Zcash, Ethereum, and Base USDC is defined up front. Non-x402-ready chains are displayed with “coming soon” hints but still allow vault storage so testers can preload keys.

## Manual QA checklist

- Launch the popup, create a vault passphrase, lock and unlock to verify encryption flow.
- Import a Base/USDC private key via drag-and-drop and confirm the derived address matches expectations.
- Switch between accounts using the dropdown and ensure the chain badge updates.
- Click the primary **Tip** button and confirm the modal opens to select a custom amount; submit to exercise the background tip flow against the Grove API.
- Change the API base URL from the footer and from the options page, then retest tipping.

## Next steps

- Wire native POKT/Zcash signing logic once x402 clients land for those networks.
- Add account management (rename/delete) surfaces outside the modal.
- Ship an automated test harness that exercises the background service worker against a mocked Grove API.
