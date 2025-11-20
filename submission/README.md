# Submission

## Links

- [Chrome Web Store](https://chrome.google.com/webstore/devconsole/e92086f1-e57f-4c07-8c4e-0c31fda2395a/dlebkjfkgbobnfhdjkkmfllelijafkpn/edit/listing)

## Description

```markdown
## Tip Anyone, Anywhere on the Web

Grove Extension lets you send instant micro-tips (as low as $0.10) to creators across your favorite platforms: X (Twitter), Reddit, YouTube, and more.

## Why Install Grove?

- Show appreciation instantly: Tip creators you love without leaving the page you're on
- Truly micro: Send $0.10, $0.50, $1.00; amounts that match the value of a great tweet or helpful comment
- Universal: Tip anyone on supported platforms, whether they're crypto-native or not
- Seamless experience: Powered by stablecoin rails and trusted wallet providers, but you never see the complexity

## How It Works

Grove integrates directly into the websites you already use. See a creator's post you love? Click the Grove tip button that appears on their profile or content, choose your amount, and send. The creator receives real money they can withdraw, and you've supported someone who made your day better.

## The Future of Creator Support

We're building toward a world where AI agents can tip humans for valuable contributions, starting with human-to-human micro-tipping because that’s where the need is strongest. Traditional tipping platforms take large cuts and require minimums. Grove changes that.

Install Grove to start supporting creators the way you've always wanted to; small amounts, big impact, zero friction.
```

## Privacy

### Q1: Single Purpose

Grove Extension has a single, narrow purpose: Enable users to send micro-tips to content creators across social media platforms.

The extension identifies creator profiles on supported websites (X/Twitter, Reddit, YouTube) and adds a tip button to their pages. When clicked, users can select a tip amount and send payment directly to the creator using stablecoin infrastructure. All functionality serves this one purpose—facilitating quick, low-friction monetary appreciation for online creators.

### Q2: ActiveTab Permission

The extension no longer requests the `activeTab` permission. All functionality runs inside declaratively registered `content_scripts` that already have access to the specified host domains, so runtime tab access is unnecessary.

### Q3: Storage Justification

The storage permission is required to:

- Save the user's connected wallet address and authentication state (so users don't need to reconnect their wallet on every page)
- Cache tipping preferences (default tip amounts, preferred payment methods)
- Store transaction history for the user to review their past tips
- Maintain platform-specific settings (which social networks the user wants Grove enabled on)

This data persistence is essential for providing a seamless tipping experience without requiring repeated authentication.

### Q4: Host Permission Justification

Host permissions for specific domains (twitter.com/x.com, reddit.com, youtube.com) are required to:

- Identify creator profiles and content on these platforms by accessing page structure
- Inject the tip button UI element at the appropriate location for each platform's layout
- Extract creator identifiers (usernames, channel IDs) necessary to route tips to the correct recipients
- Monitor page navigation to update tip buttons when users browse between different creator profiles

Each requested host corresponds to a supported tipping platform. The extension cannot fulfill its single purpose—enabling tips to creators across these platforms—without access to these specific domains.

## Testing Instructions

1. Install the chrome extension.

2. Insert this into your API token:
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMWY1YWRiZDktZjA1Mi00ZjQ0LWI4ODgtNTE4YjIyOTk5NjM5IiwiZXhwIjoxNzk0OTQ2NDU2LCJpYXQiOjE3NjM0MTA0NTZ9.xUAjVkTrNJbRd3xvwOPHDHdb01Z00WEE9po9Kq1Dd1E

3. Go to one of these accounts:

- https://x.com/ArtSabintsev
- https://x.com/olshansky
- https://x.com/fredt_io

4. Tip us!

## Videos

- https://youtu.be/stTdShTiNjA
- https://drive.google.com/file/d/1IPwEMbypqSai7ElMroJOeACSJtV3xylB/view?usp=drive_link
