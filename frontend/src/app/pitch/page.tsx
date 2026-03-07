import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SynthBet — AI Edge Trading on Polymarket",
  description:
    "Trade crypto predictions on Polymarket using AI-powered edge detection. Built with Synth Monte Carlo simulations.",
};

const STEPS = [
  {
    num: "01",
    title: "Synth Simulates",
    desc: "1,000 Monte Carlo price paths predict BTC, ETH & SOL outcomes every 15 minutes using Synthdata's Predictive Intelligence API.",
  },
  {
    num: "02",
    title: "We Find the Edge",
    desc: "When Synth's probability diverges from Polymarket's odds by 15%+, that's alpha. The model sees what the market hasn't priced in yet.",
  },
  {
    num: "03",
    title: "You Trade It",
    desc: "One tap to place a real USDC bet on Polymarket. Gnosis Safe wallet, gasless transactions, live price tracking, instant results.",
  },
];

const FEATURES = [
  {
    title: "Live Hyperliquid Charts",
    desc: "Real-time candlestick charts with WebSocket streaming. Touch to inspect any candle.",
  },
  {
    title: "Multi-Bet Live View",
    desc: "Watch all your active bets simultaneously with live prices, sparklines, and countdown timers.",
  },
  {
    title: "Sound & Haptics",
    desc: "Chip toss on bet, retro 8-bit jingle on wins, haptic feedback throughout. Feels native.",
  },
  {
    title: "Telegram Native",
    desc: "BackButton, confirmation dialogs, header theming, closing confirmation — fully integrated with Telegram WebApp APIs.",
  },
  {
    title: "Real USDC Trading",
    desc: "Gnosis Safe wallets on Polygon. Real orders on Polymarket CLOB. Gasless via relayer. Auto-redeem on win.",
  },
  {
    title: "Edge Alerts",
    desc: "Cron-powered notifications when the AI spots a 15%+ edge. Deep-link straight to the trade.",
  },
];

const TECH = [
  "Synthdata Predictive Intelligence API",
  "Polymarket CLOB + Gamma API",
  "Gnosis Safe (gasless via Polymarket relayer)",
  "Hyperliquid WebSocket (live charts)",
  "Next.js 15 on Vercel",
  "Telegram Mini App (WebApp SDK)",
  "Web Audio API (programmatic sounds)",
  "Supabase (Postgres)",
];

export default function PitchPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily:
          "'Instrument Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-3xl mx-auto text-center">
        <div className="inline-block mb-6">
          <span
            className="text-xs font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "#00e67620", color: "#00e676", border: "1px solid #00e67630" }}
          >
            Synthdata Hackathon 2026
          </span>
        </div>
        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
          style={{ color: "#ffffff" }}
        >
          SynthBet
        </h1>
        <p className="text-xl sm:text-2xl font-medium leading-relaxed mb-4" style={{ color: "#a0a0a0" }}>
          AI finds when Polymarket misprices crypto.
          <br />
          You trade the edge. Real USDC. One tap.
        </p>
        <p className="text-sm mb-10" style={{ color: "#666" }}>
          Telegram Mini App &middot; BTC / ETH / SOL &middot; 15min / 1hr / Daily markets
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <a
            href="https://t.me/synthbet_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-transform hover:scale-105 active:scale-95"
            style={{ background: "#00e676", color: "#0a0a0a" }}
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
            style={{ background: "#ffffff10", color: "#e5e5e5", border: "1px solid #ffffff15" }}
          >
            GitHub
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto px-6">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #333, transparent)" }} />
      </div>

      {/* How it works */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-12 text-center" style={{ color: "#666" }}>
          How it works
        </h2>
        <div className="grid gap-10">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-6">
              <div
                className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: "#00e67615", color: "#00e676", fontFamily: "'Space Mono', monospace" }}
              >
                {step.num}
              </div>
              <div>
                <h3 className="text-lg font-bold mb-1.5" style={{ color: "#fff" }}>
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#888" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Edge explanation */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "#111", border: "1px solid #222" }}
        >
          <h3 className="text-lg font-bold mb-4" style={{ color: "#fff" }}>
            What is &quot;Edge&quot;?
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6 max-w-md mx-auto">
            <div className="rounded-xl p-4" style={{ background: "#00e67610" }}>
              <div className="text-2xl font-bold" style={{ color: "#00e676", fontFamily: "'Space Mono', monospace" }}>
                68%
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#888" }}>
                Synth says UP
              </div>
            </div>
            <div className="flex items-center justify-center">
              <span className="text-lg" style={{ color: "#444" }}>vs</span>
            </div>
            <div className="rounded-xl p-4" style={{ background: "#ff3d5710" }}>
              <div className="text-2xl font-bold" style={{ color: "#ff3d57", fontFamily: "'Space Mono', monospace" }}>
                52%
              </div>
              <div className="text-[11px] mt-1" style={{ color: "#888" }}>
                Market says UP
              </div>
            </div>
          </div>
          <div
            className="inline-block rounded-full px-5 py-2 text-sm font-bold"
            style={{ background: "#00e67620", color: "#00e676" }}
          >
            16% Edge — Bet UP
          </div>
          <p className="text-xs mt-4 max-w-sm mx-auto leading-relaxed" style={{ color: "#666" }}>
            When the AI model and the market disagree by 15%+, one of them is wrong.
            Historically, the model has the edge.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 max-w-3xl mx-auto">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-12 text-center" style={{ color: "#666" }}>
          Features
        </h2>
        <div className="grid sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl p-5"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}
            >
              <h3 className="text-sm font-bold mb-2" style={{ color: "#fff" }}>
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: "#777" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-sm font-bold tracking-widest uppercase mb-8 text-center" style={{ color: "#666" }}>
          Built with
        </h2>
        <div className="flex flex-wrap gap-2 justify-center">
          {TECH.map((t) => (
            <span
              key={t}
              className="px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "#ffffff08", color: "#999", border: "1px solid #ffffff10" }}
            >
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pt-10 pb-20 max-w-3xl mx-auto text-center">
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #333, transparent)", marginBottom: 40 }} />
        <h2 className="text-2xl font-bold mb-3" style={{ color: "#fff" }}>
          Try it now
        </h2>
        <p className="text-sm mb-8" style={{ color: "#666" }}>
          Open in Telegram, get a wallet, and start trading in under 30 seconds.
        </p>
        <a
          href="https://t.me/synthbet_bot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#00e676", color: "#0a0a0a" }}
        >
          Open SynthBet
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7V17" />
          </svg>
        </a>
      </section>

      {/* Footer */}
      <footer className="px-6 pb-10 text-center">
        <p className="text-xs" style={{ color: "#444", fontFamily: "'Space Mono', monospace" }}>
          SynthBet &middot; Synthdata Predictive Intelligence Hackathon 2026
          <br />
          Built by Miyamoto Labs
        </p>
      </footer>
    </div>
  );
}
