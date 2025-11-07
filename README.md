# Grove Tip Extension <!-- omit in toc -->

Chrome extension that enables cryptocurrency tipping on social platforms.

- [Development](#development)
- [Production](#production)
- [TODOs](#todos)

## Development

1. Go to [chrome://extensions/](chrome://extensions/)
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select the `grove_extension` directory
5. Install [Extensions Reloader](https://chromewebstore.google.com/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid) to quickly reload extension after code changes (click `Reload` button)

## Production

1. `make build_zip_extension`
2. Go to [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole)
3. Upload `./grove_extension/build/grove-extension-v1.0.0.zip`

## TODOs

### Extension Popup <!-- omit in toc -->

- [ ] Create popup UI when clicking chrome extension icon
  - [ ] Check if `GROVE_API_JWT` is loaded
  - [ ] If JWT exists: Display current balance
  - [ ] If no JWT: Link to [grove.city/api](https://grove.city/api) to create one
  - [ ] Add button to create EVM wallet in app OR link to external wallet creation

### Tip Button Enhancement <!-- omit in toc -->

- [ ] Extract and refine the Tip button component
- [ ] Enhance styling to make it an "internet standard" quality button
- [ ] Ensure reusability across platforms

### Platform Adapters <!-- omit in toc -->

Build adapters for the following platforms:

- [x] Twitter/X
- [ ] YouTube
- [ ] Reddit
- [ ] Instagram
- [ ] TikTok
- [ ] PornHub
- [ ] OnlyFans
- [ ] GitHub (placeholder exists, needs implementation)

### User Experience <!-- omit in toc -->

- [ ] Move PROD/localhost toggle to a better location
- [ ] Link users to explorer: [x402scan.com/server/170d2ee7-73b4-457f-aa48-dbab753f6d5f](https://www.x402scan.com/server/170d2ee7-73b4-457f-aa48-dbab753f6d5f)
- [ ] Link users to ecosystem: [x402.org/ecosystem](https://www.x402.org/ecosystem?category=services-endpoints)

### Future Considerations <!-- omit in toc -->

- Wallet management integration
- Balance display and refresh mechanism
- Multi-wallet support
- Tip history tracking
