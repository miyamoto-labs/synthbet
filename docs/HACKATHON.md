# Synthdata Predictive Intelligence Hackathon 2026

## Deja. — You knew it all along.

**AI-powered prediction market trading on Polymarket, inside Telegram.**

**Team:** Erik Austheim (Founder & Developer) + Miyamoto Labs (AI Systems)

**Category:** Developer / Trading Application

**Live:** [@synthbet_bot on Telegram](https://t.me/synthbet_bot) | [Pitch Page](https://synthbet.vercel.app/pitch) | [GitHub](https://github.com/miyamoto-labs/synthbet)

---

## How Deja. Uses the Synthdata API

The Synthdata Predictive Intelligence API is the core of every decision in Deja. Every trade signal, every bet recommendation, and every Kelly-sized position originates from Synth's Monte Carlo simulations.

### 1. Monte Carlo Edge Detection

Synth runs 1,000 Monte Carlo price path simulations for BTC, ETH, and SOL. We compare Synth's probability distribution against Polymarket's implied odds. When they diverge by 15%+, that's a tradeable edge.

```
Edge = synth_probability_up - polymarket_probability_up
If |Edge| >= 15% -> Signal detected -> Trade executed
```

### 2. Multi-Timeframe Analysis

We query the Synth API across three timeframes for each asset (9 parallel API calls per refresh cycle):

```
GET /insights/polymarket/up-down/15min?asset=BTC
GET /insights/polymarket/up-down/hourly?asset=ETH
GET /insights/polymarket/up-down/daily?asset=SOL
Authorization: Apikey {SYNTH_API_KEY}
```

Response fields used: `synth_probability_up`, `polymarket_probability_up`, `current_price`, `start_price`, `event_start_time`, `event_end_time`, `slug`, `synth_outcome`

### 3. Kelly Criterion Bet Sizing

Synth's probability estimate feeds directly into a half-Kelly formula:

```
f* = (bp - q) / 2b
```

Where `b` = payout odds from Polymarket, `p` = Synth probability, `q` = 1-p. This recommends optimal bet amounts capped at $5-$100 for safety.

### 4. Signal Classification & Strength

- **Strong signal**: Edge >= 25% (Synth highly divergent from market)
- **Moderate signal**: Edge 15-25%
- Direction determined by sign: positive = UP underpriced, negative = DOWN underpriced

### 5. Automated Alert Pipeline

A cron job queries all 9 asset/timeframe combinations via Synth API every 15 minutes. Signals exceeding the 15% threshold trigger Telegram photo notifications with:
- Dynamic OG image showing the edge visualization
- Deep-link URL for one-tap trading directly from the notification
- Full signal context (Synth %, Market %, edge strength, asset, timeframe)

### API Request Volume
- **Per refresh cycle:** 9 API calls (3 assets x 3 timeframes)
- **Per day (active user):** ~130+ API calls
- **Cron alerts:** 96 scans/day (every 15 min x 24h)
- **Server-side caching:** 30s for 15min markets, 120s for hourly/daily

---

## Technical Implementation

### Full-Stack Architecture

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | Next.js 15 on Vercel | Telegram Mini App with real-time data, haptic feedback, programmatic sound design |
| Trading | Polymarket CLOB + Gamma API | Real USDC order placement with configurable slippage, gasless via relayer |
| Wallets | Gnosis Safe (auto-provisioned) | Non-custodial per Telegram user, export private keys, deposit/withdraw in-app |
| Charts | Hyperliquid WebSocket | Real-time candlestick charts, live price tracking during active bets |
| Alerts | Cron + Telegram Bot API | Edge alerts every 15 min with dynamic OG images and deep-link URLs |
| Database | Supabase (Postgres) | Users, bets, wallets, portfolio, leaderboard with RLS policies |
| AI Chat | Claude API (Anthropic) | In-app AI assistant for market analysis questions |

### Data Flow

```
Telegram Bot -> User opens Mini App -> Auto-wallet creation (Gnosis Safe)
-> Frontend fetches /api/synth -> Synthdata API (BTC/ETH/SOL x 3 timeframes)
-> Edge detection (Synth prob vs Market prob)
-> User places bet -> POST /api/bet -> Polymarket CLOB order (real USDC)
-> Live bet tracking with price feeds + countdown
-> Bet resolves -> Win: confetti + sound + USDC credit / Lose: loss sound
-> Leaderboard updates in real-time
```

### Key Technical Features

- **21 API route handlers** covering trading, wallet management, portfolio, leaderboard, feed, notifications, and AI chat
- **80+ live Polymarket markets** across Crypto, Politics, Sports, Entertainment, Tech, Culture
- **Category filtering** with horizontal pill navigation
- **Sound design** via Web Audio API (bet placed, win, lose effects)
- **Native haptic feedback** via Telegram WebApp SDK
- **Visibility-aware polling** — stops market refresh when app is backgrounded
- **Deep linking** — trade directly from notification with pre-populated signal data
- **Live bet tracking** with real-time price sparklines and countdown timers

---

## Practical Market Relevance

Deja. is not a demo or prototype. It executes real USDC trades on Polymarket's Central Limit Order Book.

**What makes it real:**
- Real USDC trading on Polymarket (toggleable DRY_MODE for testing)
- One-tap trading from Telegram with native confirmation dialogs
- Live bet tracking with real-time price feeds and countdown timers
- 80+ trending Polymarket markets (sports, politics, entertainment) with category filtering
- Social activity feed showing all user trades in real-time
- Portfolio management with P&L tracking
- Leaderboard with profit ranking and win rate stats
- Wallet management: deposit, withdraw, export private key — all in-app

**Target Users:**
- Retail Polymarket traders who want AI-powered edge detection
- Casual bettors interested in trending prediction markets
- Telegram-native users (900M+ potential reach) who want zero-friction trading

---

## Innovation

### 1. Telegram-Native Prediction Market
First prediction market trading app built as a Telegram Mini App. 900M+ Telegram users can trade Polymarket from their chat app — no browser, no MetaMask, no seed phrases.

### 2. AI Edge + Fun Markets
Two experiences in one: AI-powered edge detection for crypto traders AND trending Polymarket markets (sports, politics, entertainment) for casual bettors. Categories, hot badges, and share-to-chat for viral distribution.

### 3. Zero-Friction Onboarding
Open bot -> auto-wallet creation -> deposit USDC -> trade. No KYC, no browser extensions, no wallet apps. Under 30 seconds from first tap to first trade.

### 4. Probabilistic Trading UX
The entire UI is designed around probability: edge visualization bars, Synth vs Market comparison, Kelly-recommended bet sizes, live probability charts. Users see exactly why the AI recommends a trade.

### 5. Notification-to-Trade Pipeline
Cron-powered edge alerts with dynamically generated OG images. Users can execute trades directly from their Telegram notification via deep-link — trade from your lock screen.

---

## Post-Hackathon Roadmap

| Phase | Features |
|-------|----------|
| **Q2 2026** | Smart timing engine (ML-optimized entry), referral system, multi-market aggregation (Kalshi, Azuro) |
| **Q3 2026** | Portfolio analytics (win rate by asset, edge accuracy), weekly competitions with USDC prizes |
| **Q4 2026** | Telegram inline mode (share bets in any chat), mobile app, institutional tier |

---

## Tech Stack

| Technology | Role |
|-----------|------|
| Synthdata Predictive Intelligence API | Core — Monte Carlo simulations, edge detection |
| Polymarket CLOB + Gamma API | Order execution + market data |
| Gnosis Safe | Non-custodial wallets (gasless via relayer) |
| Hyperliquid WebSocket | Real-time price charts |
| Next.js 15 on Vercel | App framework + deployment |
| Telegram Mini App SDK | Native mobile integration + haptics |
| Supabase (Postgres) | Database + auth + real-time |
| Claude API (Anthropic) | In-app AI chat assistant |
| Web Audio API | Programmatic sound effects |

---

## Contact

**Erik Austheim** — Founder & Developer
- 3+ years Polymarket trading experience
- Built multiple profitable trading bots
- Norway-based trader & builder
- GitHub: [miyamoto-labs](https://github.com/miyamoto-labs)
- Email: dostoyevskyai@gmail.com

---

**Deja. — Built for the Synthdata Predictive Intelligence Hackathon 2026**
