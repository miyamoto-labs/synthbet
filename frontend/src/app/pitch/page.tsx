import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Déja. — Technical Overview | Synthdata Hackathon 2026",
  description:
    "AI-powered prediction market trading on Polymarket, inside Telegram. 20 API routes, 80+ live markets, real USDC trading. Built with Synthdata Predictive Intelligence API.",
  openGraph: {
    title: "Déja. — Synthdata Hackathon 2026",
    description: "AI-powered prediction market trading. Synth finds the edge. You trade it. Real USDC. One tap.",
  },
};

// ── Structured around the 4 judging criteria ──

const ARCHITECTURE = [
  {
    layer: "Frontend",
    detail: "Next.js 15 Telegram Mini App with real-time WebSocket data, programmatic sound design, and native haptic feedback. Deployed on Vercel.",
  },
  {
    layer: "Trading Engine",
    detail: "Polymarket CLOB integration via Gamma API. Real USDC order placement with configurable slippage. Gasless execution via Polymarket relayer.",
  },
  {
    layer: "Wallet System",
    detail: "Auto-provisioned Gnosis Safe wallets per Telegram user. Non-custodial — users can export private keys. Deposit, withdraw, and trade entirely in-app.",
  },
  {
    layer: "Live Data",
    detail: "Hyperliquid WebSocket for real-time candlestick charts. Live price tracking during active bets with sparkline visualization and countdown timers.",
  },
  {
    layer: "Notifications",
    detail: "Cron-powered edge alerts every 15 minutes. Telegram photo messages with dynamic OG images and deep-link URLs for one-tap trading from notifications.",
  },
  {
    layer: "Database",
    detail: "Supabase (Postgres) for user accounts, bet tracking, wallet mappings, portfolio history, and leaderboard rankings.",
  },
];

const SYNTH_USAGE = [
  {
    title: "Monte Carlo Edge Detection",
    detail: "Synth runs 1,000 Monte Carlo price path simulations for BTC, ETH, and SOL. We compare Synth's probability distribution against Polymarket's implied odds. When they diverge by 15%+, that's a tradeable edge.",
  },
  {
    title: "Multi-Timeframe Analysis",
    detail: "We query Synth across three timeframes (15-minute, hourly, daily) for each asset. The API endpoint /insights/polymarket/up-down/{timeframe}?asset={asset} returns synth_probability_up, polymarket_probability_up, current_price, and market window times.",
  },
  {
    title: "Kelly Criterion Sizing",
    detail: "Synth's probability estimate feeds directly into a half-Kelly bet sizing formula: f* = (bp - q) / 2b. This recommends optimal bet amounts based on the AI's confidence vs. market odds, capped at $5–$100 for safety.",
  },
  {
    title: "Signal Classification",
    detail: "Edge strength is classified as Strong (25%+) or Moderate (15-25%). The direction (UP/DOWN) is determined by the sign of the edge: positive = Synth thinks UP is underpriced, negative = DOWN is underpriced.",
  },
  {
    title: "Automated Alert Pipeline",
    detail: "A cron job queries all asset/timeframe combinations via Synth API every 15 minutes. Signals exceeding the 15% threshold trigger Telegram notifications with the full signal context and a deep-link to execute the trade instantly.",
  },
];

const MARKET_FEATURES = [
  "Real USDC trading on Polymarket — not paper money, not simulated",
  "One-tap trading from Telegram with native confirmation dialogs",
  "Live bet tracking with real-time price feeds and countdown timers",
  "Trending Polymarket markets (sports, politics, entertainment) with category filtering",
  "Social activity feed showing all user trades in real-time",
  "Portfolio management with claim-to-USDC for winning positions",
  "Leaderboard with P&L ranking and win rate tracking",
  "Edge alert notifications with deep-link to trade — trade from your lock screen",
];

const INNOVATIONS = [
  {
    title: "Telegram-Native Prediction Market",
    detail: "First prediction market trading app built as a Telegram Mini App. 900M+ Telegram users can trade Polymarket from their chat app — no browser, no MetaMask, no seed phrases.",
  },
  {
    title: "AI Edge + Fun Markets",
    detail: "Two experiences in one: AI-powered edge detection for crypto traders AND trending Polymarket fun markets (sports, politics, entertainment) for casual bettors. Categories, hot badges, and share-to-chat for viral distribution.",
  },
  {
    title: "Zero-Friction Onboarding",
    detail: "Open bot → auto-wallet creation → deposit USDC → trade. No KYC, no browser extensions, no wallet apps. Under 30 seconds from first tap to first trade.",
  },
  {
    title: "Probabilistic Trading UX",
    detail: "The entire UI is designed around probability: edge visualization bars, Synth vs Market comparison, Kelly-recommended bet sizes, live probability charts. Users see exactly why the AI recommends a trade.",
  },
  {
    title: "Notification-to-Trade Pipeline",
    detail: "Cron-powered edge alerts with dynamically generated OG images. Users receive Telegram photo notifications and can execute trades directly via deep-link — trade from your lock screen in one tap.",
  },
];

const TECH_STACK = [
  { name: "Synthdata Predictive Intelligence API", role: "Core — Monte Carlo simulations" },
  { name: "Polymarket CLOB + Gamma API", role: "Order execution + market data" },
  { name: "Gnosis Safe", role: "Non-custodial wallets (gasless via relayer)" },
  { name: "Hyperliquid WebSocket", role: "Real-time price charts" },
  { name: "Next.js 15 on Vercel", role: "App framework + deployment" },
  { name: "Telegram Mini App SDK", role: "Native mobile integration" },
  { name: "Supabase (Postgres)", role: "Database + auth + real-time" },
  { name: "Claude API (Anthropic)", role: "In-app AI chat assistant" },
  { name: "Web Audio API", role: "Programmatic sound effects" },
];

export default function PitchPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#1C1611",
        color: "#F5EFE0",
        fontFamily: "'Jost', -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Hero */}
      <section className="px-6 pt-16 pb-16 max-w-3xl mx-auto text-center">
        <div className="inline-block mb-6">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "#C8843A20", color: "#C8843A", border: "1px solid #C8843A30" }}
          >
            Synthdata Hackathon 2026
          </span>
        </div>
        <h1
          className="text-5xl sm:text-7xl font-bold tracking-tight leading-[1.1] mb-4"
          style={{ color: "#fff", fontFamily: "'DM Serif Display', Georgia, serif" }}
        >
          D&eacute;ja<span style={{ color: "#C8843A" }}>.</span>
        </h1>
        <p
          className="text-lg sm:text-xl leading-relaxed mb-2"
          style={{ color: "#C4A882", fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}
        >
          You knew it all along.
        </p>
        <p className="text-sm sm:text-base font-light leading-relaxed mb-4" style={{ color: "#aaa" }}>
          AI-powered prediction market trading on Polymarket.
          <br />
          Synth finds the edge. You trade it. Real USDC. One tap.
        </p>
        <p className="text-xs mb-10" style={{ color: "#666" }}>
          Telegram Mini App &middot; BTC / ETH / SOL + Trending Markets &middot; 15min / 1hr / Daily
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://t.me/synthbet_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#C8843A", color: "#1C1611" }}
          >
            Open in Telegram
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
          <a
            href="https://github.com/miyamoto-labs/synthbet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#ffffff08", color: "#C4A882", border: "1px solid #C8843A20" }}
          >
            GitHub Repo
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </section>

      {/* Numbers at a glance */}
      <section className="px-6 py-12 max-w-3xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "20", label: "API Routes" },
            { value: "80+", label: "Live Markets" },
            { value: "9", label: "Synth API Calls / Refresh" },
            { value: "12", label: "React Components" },
          ].map((s) => (
            <div key={s.label} className="text-center rounded-xl p-4" style={{ background: "#2C1F14", border: "1px solid #C8843A10" }}>
              <div className="text-2xl font-bold" style={{ color: "#C8843A", fontFamily: "'DM Mono', monospace" }}>{s.value}</div>
              <div className="text-[11px] mt-1 font-medium" style={{ color: "#888" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)" }} />
      </div>

      {/* ── CRITERIA 1: Technical Implementation (30%) ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#C8843A20", color: "#C8843A" }}>30%</span>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#666" }}>Technical Implementation</h2>
        </div>
        <h3 className="text-2xl font-bold mb-8" style={{ color: "#fff" }}>
          Full-Stack Architecture
        </h3>

        <div className="grid gap-4">
          {ARCHITECTURE.map((a) => (
            <div
              key={a.layer}
              className="rounded-xl p-5"
              style={{ background: "#2C1F14", border: "1px solid #C8843A15" }}
            >
              <h4 className="text-sm font-bold mb-1.5" style={{ color: "#C8843A" }}>
                {a.layer}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                {a.detail}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="mt-10 rounded-2xl p-6" style={{ background: "#2C1F14", border: "1px solid #C8843A20" }}>
          <h4 className="text-lg font-bold mb-4" style={{ color: "#fff" }}>How It Works</h4>
          <div className="grid gap-6">
            {[
              { num: "01", title: "Synth Simulates", desc: "1,000 Monte Carlo price paths predict BTC, ETH & SOL outcomes every 15 minutes via the Synthdata Predictive Intelligence API." },
              { num: "02", title: "Edge Detected", desc: "When Synth's probability diverges from Polymarket's implied odds by 15%+, we surface it as a tradeable signal with strength classification." },
              { num: "03", title: "User Trades", desc: "One tap places a real USDC order on Polymarket's CLOB. Gasless via Gnosis Safe. Live tracking until market resolution. Auto-redeem on win." },
            ].map((s) => (
              <div key={s.num} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: "#C8843A15", color: "#C8843A", fontFamily: "monospace" }}>
                  {s.num}
                </div>
                <div>
                  <h5 className="font-bold mb-1" style={{ color: "#fff" }}>{s.title}</h5>
                  <p className="text-sm leading-relaxed" style={{ color: "#888" }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)" }} />
      </div>

      {/* ── CRITERIA 2: Use of Synth Probabilistic Modeling (30%) ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#C8843A20", color: "#C8843A" }}>30%</span>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#666" }}>Use of Synth Probabilistic Modeling</h2>
        </div>
        <h3 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>
          Synth API Is the Core of Everything
        </h3>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#888" }}>
          Déja. doesn&apos;t just use the Synth API — it&apos;s built entirely around it. Every trade signal, every bet recommendation, every Kelly-sized position comes from Synth&apos;s probabilistic output.
        </p>

        {/* Edge visualization */}
        <div className="rounded-2xl p-6 text-center mb-8" style={{ background: "#2C1F14", border: "1px solid #C8843A20" }}>
          <h4 className="text-sm font-bold mb-4" style={{ color: "#C4A882" }}>Edge = Synth Probability − Market Probability</h4>
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-4">
            <div className="rounded-xl p-4" style={{ background: "#00e67610" }}>
              <div className="text-2xl font-bold" style={{ color: "#00e676", fontFamily: "monospace" }}>68%</div>
              <div className="text-[11px] mt-1" style={{ color: "#888" }}>Synth says UP</div>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-lg" style={{ color: "#444" }}>vs</span>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#ff3d5710" }}>
              <div className="text-2xl font-bold" style={{ color: "#ff3d57", fontFamily: "monospace" }}>52%</div>
              <div className="text-[11px] mt-1" style={{ color: "#888" }}>Market says UP</div>
            </div>
          </div>
          <div className="inline-block rounded-full px-5 py-2 text-sm font-bold" style={{ background: "#C8843A20", color: "#C8843A" }}>
            16% Edge → Bet UP → Half-Kelly: $12
          </div>
        </div>

        <div className="grid gap-4">
          {SYNTH_USAGE.map((s) => (
            <div
              key={s.title}
              className="rounded-xl p-5"
              style={{ background: "#2C1F14", border: "1px solid #C8843A15" }}
            >
              <h4 className="text-sm font-bold mb-1.5" style={{ color: "#C8843A" }}>
                {s.title}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                {s.detail}
              </p>
            </div>
          ))}
        </div>

        {/* API integration code snippet */}
        <div className="mt-6 rounded-xl p-5" style={{ background: "#161110", border: "1px solid #C8843A10" }}>
          <h4 className="text-xs font-bold mb-3 uppercase tracking-wider" style={{ color: "#666" }}>API Integration</h4>
          <pre className="text-xs leading-relaxed overflow-x-auto" style={{ color: "#C4A882", fontFamily: "monospace" }}>
{`GET /insights/polymarket/up-down/{timeframe}?asset={asset}
Authorization: Apikey {SYNTH_API_KEY}

Response: {
  slug, current_price, start_price,
  synth_probability_up,      // ← Synth's Monte Carlo output
  polymarket_probability_up,  // ← Market's implied odds
  synth_outcome,             // "Up" or "Down"
  event_start_time, event_end_time
}

Edge = synth_probability_up - polymarket_probability_up
If |Edge| ≥ 15% → Signal detected → Trade executed`}
          </pre>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)" }} />
      </div>

      {/* ── CRITERIA 3: Practical Market Relevance (25%) ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#C8843A20", color: "#C8843A" }}>25%</span>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#666" }}>Practical Market Relevance</h2>
        </div>
        <h3 className="text-2xl font-bold mb-4" style={{ color: "#fff" }}>
          Real Money, Real Markets, Real Users
        </h3>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: "#888" }}>
          Déja. is not a demo or prototype. It executes real USDC trades on Polymarket&apos;s Central Limit Order Book. Every bet shown in the app is a real on-chain position.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MARKET_FEATURES.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl p-4"
              style={{ background: "#2C1F14", border: "1px solid #C8843A10" }}
            >
              <span style={{ color: "#C8843A" }}>✓</span>
              <span className="text-sm leading-relaxed" style={{ color: "#ccc" }}>{f}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)" }} />
      </div>

      {/* ── CRITERIA 4: Innovation (15%) ── */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#C8843A20", color: "#C8843A" }}>15%</span>
          <h2 className="text-sm font-bold tracking-widest uppercase" style={{ color: "#666" }}>Innovation</h2>
        </div>
        <h3 className="text-2xl font-bold mb-8" style={{ color: "#fff" }}>
          What Makes Déja. Different
        </h3>
        <div className="grid gap-4">
          {INNOVATIONS.map((inv) => (
            <div
              key={inv.title}
              className="rounded-xl p-5"
              style={{ background: "#2C1F14", border: "1px solid #C8843A15" }}
            >
              <h4 className="text-sm font-bold mb-1.5" style={{ color: "#fff" }}>
                {inv.title}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>
                {inv.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)" }} />
      </div>

      {/* Tech Stack */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-8 text-center" style={{ color: "#666" }}>
          Tech Stack
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {TECH_STACK.map((t) => (
            <div
              key={t.name}
              className="flex items-center justify-between rounded-lg px-4 py-3"
              style={{ background: "#2C1F14", border: "1px solid #C8843A10" }}
            >
              <span className="text-sm font-medium" style={{ color: "#fff" }}>{t.name}</span>
              <span className="text-[10px] font-mono" style={{ color: "#666" }}>{t.role}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Phase Two Roadmap */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "#E4A95A20", color: "#E4A95A", border: "1px solid #E4A95A30" }}
          >
            Roadmap
          </span>
          <h2 className="text-2xl font-bold mt-4" style={{ color: "#fff" }}>Post-Hackathon</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { title: "Smart Timing Engine", desc: "ML model learns optimal entry timing per asset within each market window." },
            { title: "Referral System", desc: "Invite friends, earn % of volume. Viral Telegram sharing built in." },
            { title: "Multi-Market Expansion", desc: "Aggregate Kalshi, Azuro, Polymarket. Cross-market arb detection." },
            { title: "Portfolio Analytics", desc: "Win rate by asset, edge accuracy, Kelly performance tracking." },
            { title: "Weekly Competitions", desc: "Leaderboard resets weekly. Top traders win bonus USDC." },
            { title: "Telegram Inline Mode", desc: "Share live bets in any chat. Friends tap to copy the trade." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-4"
              style={{ background: "#2C1F14", border: "1px solid #E4A95A15" }}
            >
              <h4 className="text-sm font-bold mb-1" style={{ color: "#E4A95A" }}>{f.title}</h4>
              <p className="text-xs leading-relaxed" style={{ color: "#888" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pt-10 pb-20 max-w-3xl mx-auto text-center">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #C8843A40, transparent)", marginBottom: 40 }} />
        <h2 className="text-2xl font-bold mb-3" style={{ color: "#fff" }}>
          Try it now
        </h2>
        <p className="text-sm mb-8" style={{ color: "#666" }}>
          Open in Telegram, get a wallet, start trading in under 30 seconds.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://t.me/synthbet_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#C8843A", color: "#1C1611" }}
          >
            Open Déja.
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </a>
          <a
            href="https://github.com/miyamoto-labs/synthbet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#ffffff08", color: "#C4A882", border: "1px solid #C8843A20" }}
          >
            GitHub
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 pb-10 text-center">
        <p className="text-xs" style={{ color: "#444", fontFamily: "monospace" }}>
          Déja. &middot; Synthdata Predictive Intelligence Hackathon 2026
          <br />
          Erik Austheim &middot; Miyamoto Labs
          <br />
          dostoyevskyai@gmail.com
        </p>
      </footer>
    </div>
  );
}
