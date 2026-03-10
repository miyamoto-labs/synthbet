# Deja.

> **You knew it all along.**
>
> AI-powered prediction market trading on Polymarket, inside Telegram.
>
> **Synthdata Predictive Intelligence Hackathon 2026**

**Live:** [@synthbet_bot on Telegram](https://t.me/synthbet_bot) | [Pitch Page](https://synthbet.vercel.app/pitch) | [GitHub](https://github.com/miyamoto-labs/synthbet)

---

## What is Deja.?

Deja. is a Telegram Mini App that lets 900M+ Telegram users trade prediction markets with AI-powered edge detection. Synth's Monte Carlo simulations find mispriced Polymarket markets. You trade them with one tap. Real USDC.

**How it works:**

1. **Synth Simulates** — 1,000 Monte Carlo price paths predict BTC, ETH & SOL outcomes via the Synthdata Predictive Intelligence API
2. **Edge Detected** — When Synth's probability diverges from Polymarket's implied odds by 15%+, that's a tradeable signal
3. **You Trade** — One tap places a real USDC order on Polymarket's CLOB. Gasless via Gnosis Safe. Live tracking until resolution.

---

## Architecture

```
synthbet/
├── frontend/          # Next.js 15 Telegram Mini App (TypeScript)
├── bot/               # Telegram bot (Node.js) — /start, /play commands
├── docs/              # Hackathon documentation
└── README.md
```

| Layer | Technology | Details |
|-------|-----------|---------|
| Frontend | Next.js 15 on Vercel | Telegram Mini App with real-time data, haptic feedback, programmatic sound design |
| Trading | Polymarket CLOB + Gamma API | Real USDC order placement with configurable slippage, gasless via relayer |
| Wallets | Gnosis Safe (auto-provisioned) | Non-custodial per Telegram user, export private keys, deposit/withdraw in-app |
| Charts | Hyperliquid WebSocket | Real-time candlestick charts, live price tracking during active bets |
| Alerts | Cron + Telegram Bot API | Edge alerts every 15 min with dynamic OG images and deep-link URLs |
| Database | Supabase (Postgres) | Users, bets, wallets, portfolio, leaderboard with RLS policies |
| AI Chat | Claude API (Anthropic) | In-app AI assistant for market analysis questions |

---

## Features

- **80+ live Polymarket markets** across Crypto, Politics, Sports, Entertainment, Tech, Culture
- **AI edge detection** — Synth vs Market probability comparison with strength classification
- **One-tap trading** from Telegram with native confirmation dialogs
- **Live bet tracking** with real-time price feeds, sparklines, and countdown timers
- **Kelly Criterion bet sizing** — optimal position sizes from Synth's probability output
- **Category filtering** with horizontal pill navigation
- **Social activity feed** showing all user trades in real-time
- **Portfolio management** with P&L tracking and claim-to-USDC
- **Leaderboard** with profit ranking and win rate stats
- **Wallet management** — deposit, withdraw, export private key, all in-app
- **Edge alert notifications** with deep-link to trade from your lock screen
- **Sound design** via Web Audio API (bet placed, win, lose effects)
- **Native haptic feedback** via Telegram WebApp SDK
- **DRY_MODE toggle** — paper trading for testing, real USDC for production

---

## How We Use the Synthdata API

Every trade signal originates from Synth's Monte Carlo simulations.

**API calls per refresh cycle:** 9 (3 assets x 3 timeframes)

```
GET /insights/polymarket/up-down/15min?asset=BTC
GET /insights/polymarket/up-down/hourly?asset=ETH
GET /insights/polymarket/up-down/daily?asset=SOL
Authorization: Apikey {SYNTH_API_KEY}
```

**Edge detection:**
```
Edge = synth_probability_up - polymarket_probability_up
If |Edge| >= 15% -> Signal detected -> Trade executed
```

**Signal classification:**
- Strong: Edge >= 25%
- Moderate: Edge 15-25%
- Direction: positive = UP underpriced, negative = DOWN underpriced

**Bet sizing:** Half-Kelly formula `f* = (bp - q) / 2b` capped at $5-$100.

---

## Quick Start

### Prerequisites
- Node.js 18+
- Synthdata API key
- Polymarket API access (for trading)
- Supabase project (for database)

### Installation

```bash
# Clone the repo
git clone https://github.com/miyamoto-labs/synthbet.git
cd synthbet

# Install frontend
cd frontend
npm install
cp .env.example .env.local
# Add your API keys to .env.local
npm run dev
```

Frontend: http://localhost:3000

### Environment Variables

```
SYNTH_API_KEY=             # Synthdata Predictive Intelligence API key
NEXT_PUBLIC_SUPABASE_URL=  # Supabase project URL
SUPABASE_SERVICE_KEY=      # Supabase service role key
DRY_MODE=true              # Set to 'false' for real USDC trading
```

---

## Roadmap

| Phase | Features |
|-------|----------|
| **Q2 2026** | Smart timing engine (ML-optimized entry), referral system, multi-market aggregation (Kalshi, Azuro) |
| **Q3 2026** | Portfolio analytics (win rate by asset, edge accuracy), weekly competitions with USDC prizes |
| **Q4 2026** | Telegram inline mode (share bets in any chat), mobile app, institutional tier |

---

## Team

**Erik Austheim** — Founder & Developer
- 3+ years Polymarket trading experience
- Built multiple profitable trading bots
- Norway-based trader & builder
- GitHub: [miyamoto-labs](https://github.com/miyamoto-labs)

**Miyamoto Labs** — AI Systems

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

## License

MIT

---

**Deja. — Built for the Synthdata Predictive Intelligence Hackathon 2026**
