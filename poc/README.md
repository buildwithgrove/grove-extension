# Grove Tip Chrome Extension <!-- omit in toc -->

## Table of Contents <!-- omit in toc -->

- [Development Quick Start](#development-quick-start)
- [Implementation Notes](#implementation-notes)

## Development Quick Start

**Install and build the extension**:

```bash
npm install
npm run dev
npm run build
```

**Load the unpacked extension**:

- Open `chrome://extensions` and toggle **Developer mode**.
- Click **Load unpacked** and select the `dist/` directory.
- Pin “Grove Tipper” to the toolbar and open the popup.

**Configure the popup**:

- Set a vault passphrase the first time you open it (keys stay encrypted in `chrome.storage`).
- Add a demo account via `+`—Base/USDC flows end-to-end today.
- Confirm the footer points at `http://localhost:8000` or change it to your Grove API URL.

## Implementation Notes

- **Encryption** – passphrases derive an AES-256-GCM key via PBKDF2 (150k iterations). We persist encrypted payloads in `chrome.storage.local` and sync API preferences in `chrome.storage.sync`.
- **x402** – the background worker handles the 402 challenge, builds an EIP-3009 authorization with `viem`, and replays the request with the `X-PAYMENT` header. Settlement headers from Grove are decoded and surfaced to the UI.
- **Tip UX** – quick preset chips set the working amount; pressing the primary "Tip" button opens a confirmation modal where you can fine-tune the USD amount before the payment fires. Successful tips show contextual toasts with chain info and transaction hashes when available.
- **Chain support** – metadata for POKT, Zcash, Ethereum, and Base USDC is defined up front. Non-x402-ready chains are displayed with "coming soon" hints but still allow vault storage so testers can preload keys.
