🇺🇸 [한국어](./README.ko.md)

# 갱신체크 — RenewWindow

갱신체크 is a mini-app for Korean renters to understand lease renewal laws and verify rent increase proposals. Users enter their lease end date and current rent/deposit to instantly calculate the legal renewal request deadline and maximum allowed rent increases under the Housing Lease Protection Act.

The app calculates the 6-month-to-2-month renewal window, applies the 5% rent increase cap, and checks whether landlord notifications comply with legal timing requirements. All calculations are performed locally in the browser with no server required.

## Features

- 📋 **Lease Contract Management** — Register and store lease contracts with nickname, end date, deposit, and monthly rent
- 📅 **Renewal Window Calculator** — Automatically computes the legal 6-month-to-2-month notice period with month-end adjustments per Housing Lease Protection Act §6(3)
- 💰 **Rent Increase Verification** — Applies the 5% legal cap on deposit and monthly rent increases (§7) and checks if landlord's notice exceeds limits
- 🕐 **Landlord Notice Timeline Check** — Verifies whether the landlord's notification falls within the legal 6-month-to-2-month window (§6(1))
- 📊 **Comparison & Negotiation Checklist** — Gated behind reward ads; shows scenario comparisons and negotiation points with legal citations
- 💾 **Local-First Storage** — All data persists in browser localStorage with automatic recovery on error
- 📱 **In-App Ads** — Banner and reward ad support via Toss Ads

## Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Design System**: @toss/tds-mobile (Toss Design System)
- **Routing**: React Router 7
- **Styling**: Emotion (via TDS) + CSS variables (dark mode support)
- **Storage**: Browser localStorage (max 20 contracts)
- **Ads & SDK**: @apps-in-toss/web-framework (Toss App-in-Toss platform)
- **Icons**: lucide-react
- **Testing**: vitest + @testing-library/react + Playwright (visual smoke tests)

## Getting Started

### Install dependencies
```bash
npm install
```

### Production build
```bash
npm run build
```

### Build for Toss Apps-in-Toss platform
```bash
npx ait build
```
Then submit via the Apps-in-Toss developer console for review.

### Run tests
```bash
npx vitest run          # Unit & integration tests
npm run test:visual     # Playwright visual smoke tests
```

### Type check
```bash
npx tsc --noEmit
```

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VITE_TOSS_AD_SLOT_ID` | Reward ad slot ID (Apps-in-Toss console) | No* |
| `VITE_TOSS_AD_GROUP_ID` | Banner ad group ID (Apps-in-Toss console) | No* |
| `VITE_SHARE_OG_URL` | Open Graph image URL for share preview (KakaoTalk, SMS) | No |

*Ad slots degrade gracefully if not configured (fail-open: reward gate unlocks, banner area hidden).

Copy `.env.example` to `.env` and fill in values from the Apps-in-Toss developer console. **Do not hardcode test values like `"test_slot"` or `"demo_123"`** — leave empty if not available.

## Project Structure

```
src/
├── pages/              # Route components (Home, Result, ContractEdit, Notice)
├── components/         # Reusable TDS-based components
│   ├── ScreenScaffold.tsx
│   ├── SubmitFooter.tsx
│   ├── Card.tsx
│   ├── SummaryHero.tsx
│   ├── StateView.tsx (EmptyState, LoadingState)
│   ├── AdSlot.tsx
│   └── result/         # Result page subcomponents
├── hooks/              # useContracts (localStorage sync)
├── lib/
│   ├── types.ts        # Shared types (Contract, RenewalWindow, etc.)
│   ├── renewal.ts      # Lease renewal math
│   ├── format.ts       # Display formatting (dates, KRW amounts)
│   ├── date.ts         # Date utilities
│   ├── analytics.ts    # SDK analytics wrapper
│   ├── share.ts        # SDK share wrapper
│   └── storage.ts      # localStorage helpers
├── constants/
│   ├── routes.ts       # Route paths
│   └── law.ts          # Legal constants
└── __tests__/          # Unit & integration tests

e2e/
├── visual-smoke.spec.ts    # Playwright visual tests
└── __shots__/              # Screenshot baselines
```

## Deployment

### Apps-in-Toss Pipeline

1. **Build**
   ```bash
   npm run build
   ```

2. **Bundle for Toss**
   ```bash
   npx ait build
   ```

3. **Submit for review** via [Apps-in-Toss developer console](https://console.tossmini.com)

### Pre-submission Checklist
- ✅ No console.error in production build
- ✅ No external domain navigation
- ✅ No test ad codes hardcoded (use env vars)
- ✅ Android 7+, iOS 16+ compatible
- ✅ Zero CORS errors (apps run on both `*.web.tossmini.com` and `*.private-web.tossmini.com`)

## License

MIT
