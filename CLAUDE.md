# Deja. — AI-Powered Prediction Market Trading

Hackathon submission for **Synthdata Predictive Intelligence Hackathon 2026**. Solo dev: Erik Austheim.

## What It Is

Telegram Mini App that uses Synthdata's Monte Carlo simulations to find edges in Polymarket prediction markets, then trades with real USDC via Gnosis Safe wallets.

## Project Structure

```
frontend/   — Next.js 15, React 19, TypeScript, Tailwind. Deployed on Vercel.
bot/        — Telegram bot (Node.js + Telegraf). Runs locally, NOT deployed.
docs/       — Hackathon documentation.
engine/     — Placeholder (unused).
```

## Deployment

**Frontend** deploys from `frontend/` directory to Vercel.
- Vercel project: `frontend` (prj_GV3ZNsta72JHkQmUcOwU9yhx5JzV)
- URL: `frontend-three-phi-40.vercel.app`
- To deploy: push to `main` branch (auto-deploys via GitHub integration)

**NEVER deploy from the repo root.** There is an accidental root-level `.vercel/` config pointing to a wrong project (`synthbet`). Ignore it. The real Vercel project config lives in `frontend/.vercel/`.

## Telegram Bot

- Bot username: `@Synthbet_bot`
- Bot link: `https://t.me/Synthbet_bot`
- Runs **locally** via `cd bot && npm start`. Uses long-polling (not webhooks). No cloud hosting.
- Requires `TELEGRAM_BOT_TOKEN` and `WEBAPP_URL` env vars (see `bot/.env.example`)

## Environment Variables

- `frontend/.env.local` — all secrets for local dev
- Vercel dashboard — production env vars (mirrors .env.local)
- `bot/.env` — bot-specific env vars (TOKEN + WEBAPP_URL)

## DRY_MODE

`process.env.DRY_MODE?.trim() === 'true'` enables paper trading. When false, real USDC trading is active. Real trading IS fully implemented.

## Commands

```bash
# Frontend dev
cd frontend && npm run dev          # starts on port 3000
cd frontend && npm run build        # production build (needs .env.local)
cd frontend && npx tsc --noEmit     # type-check without env vars

# Bot
cd bot && npm start                 # run bot (needs .env)
cd bot && npm run dev               # run with --watch
```

## Key Files

- `frontend/src/app/page.tsx` — Main app (4 tabs: markets/feed/portfolio/leaderboard)
- `frontend/src/app/pitch/page.tsx` — Hackathon pitch page
- `frontend/src/app/api/` — API route handlers
- `frontend/src/components/` — React components
- `bot/src/bot.js` — Telegram bot (minimal Telegraf wrapper)
- `docs/HACKATHON.md` — Hackathon submission doc

## Important Notes

- `deja.market` is a SEPARATE unrelated project. Do not reference it in this repo.
- The root `.vercel/` directory is accidental. Do not use it. Do not deploy from root.
- `npm run build` fails without `.env.local` (Supabase URL required at build time). Use `npx tsc --noEmit` for type-checking.
