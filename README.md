# EasyPoly

> AI-powered Polymarket analytics & copy trading platform
> 
> **Synthdata Predictive Intelligence Hackathon 2026**

## 🎯 What is EasyPoly?

EasyPoly democratizes access to Polymarket alpha by combining **Synthdata's probabilistic forecasts** with algorithmic trader discovery and one-click copy trading.

While most traders struggle to identify mispriced markets and winning strategies, EasyPoly does three things:

1. **Find Alpha** — Uses Synthdata API to identify mispriced Polymarket markets
2. **Discover Winners** — Algorithmic ranking of top-performing traders (multi-dimensional scoring)
3. **Copy Trades** — One-click copy trading with position sizing and risk controls

### The Problem

- **Retail traders can't compete** with quants and whales on Polymarket
- **Prediction markets are inefficient** — mispricing opportunities exist but are hard to spot
- **Top traders are invisible** — no easy way to find and follow winning strategies

### The Solution

EasyPoly layers Synthdata intelligence on top of Polymarket to give retail traders institutional-grade tools:

- **Synthdata-powered predictions** — Real-time probability forecasts vs. market odds
- **Conviction scoring** — Multi-signal analysis (Synthdata + volume + trader behavior)
- **Automated trader discovery** — Find hot traders before they're famous
- **Copy trading interface** — Follow winners with one click

---

## 🏗️ Architecture

```
easypoly/
├── frontend/          # Next.js web app (TypeScript)
├── engine/            # AI prediction & trader analysis (Python)
├── bot/               # Trading automation (JavaScript)
└── docs/              # Hackathon documentation
```

### Tech Stack

- **Frontend:** Next.js 15, React, TailwindCSS, shadcn/ui
- **Backend:** Python (FastAPI), Node.js
- **AI/ML:** Synthdata API, custom conviction scoring
- **Blockchain:** Polymarket API, wallet integration
- **Database:** PostgreSQL (planned), JSON storage (MVP)

---

## 🚀 Features

### Phase 1: Beta (Hackathon MVP)
- ✅ Synthdata API integration
- ✅ Market analysis dashboard
- ✅ Top trader leaderboard (manual curation)
- ✅ Basic copy trade UI
- ⏳ Wallet connection (in progress)

### Phase 2: Post-Hackathon
- Real-time Synthdata predictions
- Automated trader scanning (6-hour cycles)
- Multi-metric trader ranking (ROI, win rate, recency, red flags)
- Push notifications for alpha signals
- Social features (trader profiles, comments)

### Phase 3: Scale
- Portfolio optimization
- Risk management tools
- Mobile app
- Premium tiers

---

## 📊 How We Use Synthdata

**1. Market Analysis**
- Query Synthdata API for BTC/ETH up/down probabilities
- Compare Synthdata probability vs. Polymarket market odds
- Flag markets where edge > 5% (mispricing opportunity)

**2. Conviction Scoring**
- Combine Synthdata predictions with volume, liquidity, trader sentiment
- Weight signals (Synthdata = 40%, volume = 30%, trader behavior = 30%)
- Generate conviction score (0-100) for each market

**3. Trader Evaluation**
- Analyze trader performance on markets where Synthdata was accurate
- Identify traders who consistently align with Synthdata signals
- Rank traders by "Synthdata alpha correlation"

**Example API Usage:**
```python
import requests

response = requests.get(
    "https://api.synthdata.co/insights/polymarket/up-down/hourly",
    headers={"Authorization": f"Apikey {API_KEY}"},
    params={"asset": "BTC"}
)

data = response.json()
synth_prob = data['synth_probability_up']
poly_prob = data['polymarket_probability_up']
edge = synth_prob - poly_prob

if abs(edge) > 0.05:
    print(f"ALPHA: Synthdata={synth_prob:.1%}, Market={poly_prob:.1%}, Edge={edge:.1%}")
```

---

## 🎨 Screenshots

*(Coming soon — screenshots of dashboard, trader leaderboard, copy trade UI)*

---

## 🏃 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Synthdata API key
- Polymarket API access

### Installation

```bash
# Clone the repo
git clone https://github.com/miyamoto-labs/easypoly.git
cd easypoly

# Install frontend
cd frontend
npm install
cp .env.example .env.local
# Add your Synthdata API key to .env.local
npm run dev

# Install engine (separate terminal)
cd ../engine
pip install -r requirements.txt
cp .env.example .env
# Add your Synthdata API key to .env
python main.py
```

Frontend: http://localhost:3000
Engine API: http://localhost:8000

---

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Engine tests
cd engine
pytest
```

---

## 📈 Roadmap

**Q1 2026 (Hackathon)**
- Beta launch with manual trader curation
- Synthdata API integration
- Basic copy trade interface

**Q2 2026**
- Automated trader discovery
- Real-time notifications
- Mobile-responsive design

**Q3 2026**
- Portfolio management
- Risk controls
- Premium features

**Q4 2026**
- Mobile app
- Social features
- Institutional tier

---

## 🤝 Team

**Erik Austheim** — Founder, Developer
- Norway-based trader & builder
- 3+ years Polymarket experience
- Built multiple trading bots (SuperBTCBot, polymarket-trader)

**Miyamoto** — AI Co-Founder
- Autonomous AI systems specialist
- Built EasyPoly engine & automation
- MIYAMOTO LABS

---

## 📜 License

MIT

---

## 🔗 Links

- **Landing Page:** [easypoly.io](https://easypoly.io) *(coming soon)*
- **Twitter:** [@easypoly_lol](https://twitter.com/easypoly_lol)
- **Demo:** [app.easypoly.io](https://app.easypoly.io) *(coming soon)*

---

## 🙏 Acknowledgments

Built with:
- **Synthdata** — Probabilistic forecasting API
- **Polymarket** — Prediction market platform
- **MIYAMOTO LABS** — Autonomous AI systems

---

**Made for the Synthdata Predictive Intelligence Hackathon 2026**
