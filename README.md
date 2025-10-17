# Grove Tip Chrome Extension <!-- omit in toc -->

A polished demo extension that lets agents tip humans via the Grove API and the x402 protocol. Highlights:

- Encrypted vault for private keys with passphrase unlock
- Account switcher with chain badges (POKT, Zcash, Ethereum, USDC on Base)
- Drag-and-drop key importer with validation and derived EVM addresses
- Tip workflow that calls Grove, negotiates x402, and signs the payment
- Quick-tip presets plus a confirmation modal for custom amounts
- Background service worker that resolves domains and handles settlement headers

> [!NOTE]
> POKT and Zcash signing are surfaced but still marked _coming soon_. Keys stay in the Chrome profile (AES-256-GCM). Treat the extension as a demo only.

## Table of Contents <!-- omit in toc -->

- [Quick Start](#quick-start)
- [Project Layout](#project-layout)
- [Implementation Notes](#implementation-notes)
- [Make Targets](#make-targets)
- [TODO](#todo)
- [Manual QA Checklist](#manual-qa-checklist)
- [Next Steps](#next-steps)

## Quick Start

> [!TIP]
> Start the Grove API from `../grove_api` before loading the extension so `/v1/tip` responses come back successfully.

1. **Run the Grove API**

   ```bash
   cd ../grove_api
   cp .env.example .env        # configure collector keys
   make env_install_dev        # install dependencies (first time)
   make api_dev                # starts FastAPI on http://localhost:8000
   ```

2. **Install and build the extension**

   ```bash
   npm install
   npm run dev   # optional: open http://localhost:5173/popup.html or /options.html
   npm run build # emits production bundle in dist/
   ```

3. **Load the unpacked extension**

   - Open `chrome://extensions` and toggle **Developer mode**.
   - Click **Load unpacked** and select the `dist/` directory.
   - Pin “Grove Tipper” to the toolbar and open the popup.

4. **Configure the popup**

   - Set a vault passphrase the first time you open it (keys stay encrypted in `chrome.storage`).
   - Add a demo account via `+`—Base/USDC flows end-to-end today.
   - Confirm the footer points at `http://localhost:8000` or change it to your Grove API URL.

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

## Implementation Notes

- **Encryption** – passphrases derive an AES-256-GCM key via PBKDF2 (150k iterations). We persist encrypted payloads in `chrome.storage.local` and sync API preferences in `chrome.storage.sync`.
- **x402** – the background worker handles the 402 challenge, builds an EIP-3009 authorization with `viem`, and replays the request with the `X-PAYMENT` header. Settlement headers from Grove are decoded and surfaced to the UI.
- **Tip UX** – quick preset chips set the working amount; pressing the primary "Tip" button opens a confirmation modal where you can fine-tune the USD amount before the payment fires. Successful tips show contextual toasts with chain info and transaction hashes when available.
- **Chain support** – metadata for POKT, Zcash, Ethereum, and Base USDC is defined up front. Non-x402-ready chains are displayed with "coming soon" hints but still allow vault storage so testers can preload keys.

## Make Targets

Run `make help` to see the streamlined task list:

**🚀 Quickstart**
- `make quickstart` – Install dependencies and run an initial build
- `make setup` – Alias for `make quickstart`

**🛠️ Development**
- `make dev` – Start Vite on `http://localhost:5173`
- `make run_dev` – Print the popup/options URLs served by Vite
- `make preview` – Preview the production build locally

**📦 Build**
- `make build` – Generate the production bundle in `dist/`
- `make clean` – Remove the `dist/` output directory

**✅ Quality**
- `make lint` – Run ESLint across the codebase
- `make test` – Placeholder hook (tests pending)

## TODO

- [ ] Wire native POKT and Zcash signing once x402 client tooling lands.
- [ ] Add rename/delete flows for stored accounts outside of the import modal.
- [ ] Build automated tests for the background tipping flow (mock Grove API).
- [ ] Introduce audit logging or export options for tipping history inside the popup.

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
