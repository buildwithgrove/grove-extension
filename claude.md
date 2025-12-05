# Grove Extension - Development Guidelines

## Color Palette

All colors should be used via CSS variables in `popup.css` or the `GROVE_COLORS` object in `src/ui/constants.js`.

### Brand Colors
| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Primary | `--color-primary` | `#389f58` | Main brand green, buttons, links, success states |
| Primary Hover | `--color-primary-hover` | `#2f8549` | Hover state for primary elements |
| Primary Light | `--color-primary-light` | `rgba(56, 159, 88, 0.15)` | Light backgrounds, subtle highlights |
| Accent | `--color-accent` | `#f0ad4e` | Gold/amber for rankings, special highlights |

### Semantic Colors
| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Danger/Error | `--color-danger` | `#ef4444` | Errors, failed states, destructive actions, disconnect buttons |
| Warning | `--color-warning` | `#f97316` | Warnings, tip sent amounts (orange) |

### UI Colors (Dark Theme)
| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Background | `--color-bg` | `#1a1a1a` | Main background |
| Surface | `--color-surface` | `#2d2d2d` | Cards, elevated surfaces |
| Surface Hover | `--color-surface-hover` | `#363636` | Hover state for surfaces |
| Border | `--color-border` | `#404040` | Borders, dividers |

### Text Colors
| Name | Variable | Hex | Usage |
|------|----------|-----|-------|
| Primary | `--color-text-primary` | `#ffffff` | Main text, headings |
| Secondary | `--color-text-secondary` | `#a3a3a3` | Descriptions, labels |
| Tertiary | `--color-text-tertiary` | `#737373` | Timestamps, muted text |

### Transaction History Colors
| Type | Icon Background | Icon Color | Amount Color |
|------|-----------------|------------|--------------|
| Tip Sent | `rgba(249, 115, 22, 0.1)` | `#f97316` (orange) | `#f97316` |
| Tip Received | `rgba(56, 159, 88, 0.1)` | `--color-primary` | `--color-primary` |
| Deposit | `rgba(56, 159, 88, 0.1)` | `--color-primary` | `--color-primary` |

### Content Script Colors (`src/ui/constants.js`)
```javascript
GROVE_COLORS = {
  primary: '#389f58',
  primaryHover: '#2f8549',
  primaryLight: '#4fb76d',
  shadow: 'rgba(56, 159, 88, 0.3)',
  shadowHover: 'rgba(56, 159, 88, 0.5)',
  error: '#ef4444',
  errorShadow: 'rgba(239, 68, 68, 0.55)',
  warning: '#f59e0b',
  warningShadow: 'rgba(245, 158, 11, 0.45)',
};
```

## Chain/Network Configuration

### Default Chain
The default chain is `base` (mainnet). This should be consistent across:
- `popup.js`: `DEFAULT_CHAIN = 'base'`
- `content.js`: Default fallback should be `'base'`

### Network Naming
API may return network names with underscores (e.g., `base_sepolia`). Always normalize:
```javascript
const chain = rawChain.toLowerCase().replace(/_/g, '-');
```

### Block Explorers
| Chain | Explorer URL |
|-------|-------------|
| `base` | `https://basescan.org` |
| `base-sepolia` | `https://sepolia.basescan.org` |
| `solana` | `https://solscan.io` |
| `solana-devnet` | `https://solscan.io?cluster=devnet` |

## Destination URL Parsing

The `parseDestination()` function handles different destination types:

| Type | Example | Links To |
|------|---------|----------|
| Twitter/X Tweet | `x.com/user/status/123` | Profile: `x.com/user`, Post: full URL |
| Twitter/X Profile | `x.com/user` | Profile URL |
| ENS Name | `vitalik.eth` | `https://app.ens.domains/vitalik.eth` |
| Base Name | `name.base.eth` | `https://www.base.org/name/name` |
| Other URLs | `example.com/page` | Full URL |

## Button Patterns

### Danger/Disconnect Buttons
- Use `.btn-danger` for bordered danger buttons (e.g., "Disconnect" with background)
- Use `.btn-danger-text` for text-only buttons that perform destructive actions (e.g., X disconnect)
- Both use `--color-danger` (#ef4444)

### Confirming State
For destructive actions requiring confirmation, add `.confirming` class to pulse the button:
```css
.btn-danger.confirming {
  background-color: var(--color-danger);
  color: white;
  animation: pulse-danger 0.5s ease-in-out infinite alternate;
}
```

## Tipping Currency

All tips are sent in **USDC** on both Base and Base Sepolia networks. The currency is currently hardcoded as "USDC" in the auto-reply message (`src/content/content.js`). If additional currencies are supported in the future, consider adding a `currency` property to the chain config in `src/config/networks.js`.

## Auto-Reply Message

The default auto-reply message template is defined in two places (must be kept in sync):
- `popup.js`: `DEFAULT_AUTO_REPLY_MESSAGE`
- `src/content/content.js`: `DEFAULT_AUTO_REPLY_MESSAGE`

Available placeholders:
- `{username}` - Twitter username of the tip recipient
- `{amount}` - Tip amount with currency (e.g., "$0.10 USDC")
- `{chain}` - Network name (e.g., "Base", "Base Sepolia")
- `{tx_link}` - Block explorer link to the transaction
- `{grove_link}` - Link to Grove website (grove.city)
