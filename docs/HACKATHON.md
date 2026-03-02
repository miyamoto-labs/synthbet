# Synthdata Predictive Intelligence Hackathon Submission

## Project: EasyPoly

**Tagline:** Democratizing Polymarket Alpha via Synthdata Intelligence

**Team:** Erik Austheim + Miyamoto (AI Co-Founder)

**Category:** Developer / Trading Application

---

## Hackathon Criteria

### How We Use Synthdata API

**1. Market Analysis**
- Query hourly/daily BTC up/down predictions
- Compare Synthdata probability vs. Polymarket market odds
- Flag markets where edge > 5% (mispricing opportunity)

**2. Conviction Scoring**
- Synthdata predictions (40% weight)
- Trading volume signals (30% weight)
- Trader behavior patterns (30% weight)
- Output: 0-100 conviction score per market

**3. Trader Evaluation**
- Analyze trader performance on Synthdata-accurate markets
- Identify traders who align with Synthdata signals
- Rank by "Synthdata alpha correlation"

### API Integration Depth

- **Endpoints used:**
  - `/insights/polymarket/up-down/hourly`
  - `/insights/polymarket/up-down/daily`
  - `/insights/volatility` (planned)
  
- **Request volume:** ~100-200 API calls/day during beta
- **Real-time integration:** WebSocket support planned for Phase 2

### Technical Innovation

**Multi-Signal Conviction Engine:**
```python
def calculate_conviction(market):
    # Synthdata signal
    synthdata_edge = abs(synth_prob - market_prob)
    synthdata_score = min(synthdata_edge * 10, 40)  # Max 40 points
    
    # Volume signal
    volume_score = analyze_volume_patterns(market)  # Max 30 points
    
    # Trader behavior
    trader_score = analyze_trader_sentiment(market)  # Max 30 points
    
    return synthdata_score + volume_score + trader_score
```

### Business Viability

**Revenue Model:**
- Free tier: Basic market analysis
- Pro tier ($29/mo): Copy trading, real-time alerts
- Whale tier ($99/mo): Portfolio management, custom strategies

**Target Market:**
- Retail Polymarket traders (10K+ monthly active)
- Crypto traders expanding into prediction markets
- Synthdata API users looking for ready-made UI

**Go-to-Market:**
- Beta launch: 50 curated users (existing network)
- Twitter marketing via @easypoly_lol
- Partnerships with Polymarket influencers
- Hackathon exposure

---

## Demo

**Live Demo:** [Coming soon — app.easypoly.io]

**Video Demo:** [Link to demo video]

**GitHub:** https://github.com/miyamoto-labs/easypoly

---

## What We Built During Hackathon

- [x] Unified monorepo structure
- [x] Synthdata API integration (engine)
- [x] Market analysis dashboard (frontend)
- [x] Conviction scoring algorithm
- [x] Top trader leaderboard (manual curation)
- [x] Basic copy trade UI
- [ ] Wallet connection (in progress)
- [ ] Automated trader discovery (post-hackathon)

---

## Future Roadmap

**Q2 2026:**
- Automated 6-hour trader scanning
- Real-time push notifications
- Mobile-responsive UI

**Q3 2026:**
- Portfolio optimization tools
- Advanced risk management
- Social features (comments, trader profiles)

**Q4 2026:**
- Mobile app (iOS/Android)
- Institutional tier
- Multi-chain expansion

---

## Why EasyPoly Wins

**1. Retail-Focused**
Most Synthdata integrations are quant tools. EasyPoly brings institutional intelligence to everyday traders.

**2. Full-Stack Product**
Not just another trading bot — complete platform (analysis + discovery + execution).

**3. Proven Founder**
Erik has 3+ years Polymarket experience, multiple profitable bots (SuperBTCBot).

**4. AI-Native Development**
Built with AI co-founder (Miyamoto) — showcases future of agent-assisted product development.

**5. Scalable Business Model**
Clear path to revenue (freemium SaaS) + large addressable market (prediction market growth).

---

## Contact

**Erik Austheim**
- GitHub: miyamoto-labs
- Twitter: @miyamotolabs
- Email: dostoyevskyai@gmail.com

**Project Links:**
- Landing: easypoly.io
- Twitter: @easypoly_lol
- Demo: app.easypoly.io

---

**Thank you for considering EasyPoly for the Synthdata Predictive Intelligence Hackathon!**
