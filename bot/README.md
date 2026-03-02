# EasyPoly Bot

JavaScript/Node.js trading automation for copy trading execution.

## Structure

```
bot/
├── src/
│   ├── copyTrader.js     # Copy trade executor
│   ├── wallet.js         # Wallet management
│   ├── orderManager.js   # Order placement & tracking
│   └── riskManager.js    # Risk controls
├── config/
│   └── settings.json     # Bot configuration
└── package.json
```

## Development

```bash
npm install
node src/index.js
```

## Environment Variables

```env
POLYMARKET_PRIVATE_KEY=your_private_key
POLYMARKET_API_KEY=your_api_key
ENGINE_API_URL=http://localhost:8000
```

## Features

- **Copy Trading** — Replicate trader positions with custom sizing
- **Risk Management** — Position limits, stop losses
- **Order Execution** — Market/limit orders
- **Portfolio Tracking** — Real-time P&L

## Tech Stack

- Node.js
- Polymarket SDK
- WebSocket (real-time updates)
