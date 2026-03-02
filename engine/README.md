# EasyPoly Engine

Python-based AI engine for market analysis, trader discovery, and conviction scoring.

## Structure

```
engine/
├── api/                  # FastAPI REST API
│   ├── main.py
│   └── routes/
├── scanner/              # Market scanner (Synthdata + Polymarket)
│   ├── synthdata.py      # Synthdata API client
│   ├── polymarket.py     # Polymarket API client
│   └── analyzer.py       # Market analysis
├── conviction/           # Conviction scoring engine
│   ├── scorer.py         # Multi-signal scoring
│   └── weights.py        # Signal weights config
├── traders/              # Trader discovery & ranking
│   ├── discovery.py      # Automated trader scanning
│   └── ranking.py        # Multi-metric ranking
├── db/                   # Database models & migrations
└── config/               # Configuration files
```

## Development

```bash
pip install -r requirements.txt
python api/main.py
```

## Environment Variables

```env
SYNTHDATA_API_KEY=your_key_here
POLYMARKET_API_KEY=your_key_here
DATABASE_URL=postgresql://localhost/easypoly
```

## Key Components

### 1. Market Scanner
Queries Synthdata API + Polymarket API, identifies mispricing.

### 2. Conviction Engine
Combines multiple signals:
- Synthdata probability (40%)
- Trading volume (30%)
- Trader behavior (30%)

Output: Conviction score (0-100) for each market.

### 3. Trader Discovery
Scans Polymarket for high-performing traders:
- Multi-dimensional scoring (ROI, win rate, recency)
- Red flag detection (wash trading, sample size)
- Market-specific rankings

## Tech Stack

- Python 3.11+
- FastAPI
- Synthdata API
- Polymarket API
- PostgreSQL (planned)
