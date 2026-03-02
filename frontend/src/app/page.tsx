"use client";

import { useEffect, useState, useCallback } from "react";
import type { MarketData } from "@/lib/synth";
import { MarketCard } from "@/components/MarketCard";
import { Leaderboard } from "@/components/Leaderboard";

type Tab = "markets" | "leaderboard";

export default function Home() {
  const [tab, setTab] = useState<Tab>("markets");
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<string | null>(null);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch("/api/synth");
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err) {
      console.error("Failed to fetch markets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize Telegram Web App
    try {
      const tg = (window as unknown as { Telegram?: { WebApp?: { ready: () => void; expand: () => void } } })
        .Telegram?.WebApp;
      tg?.ready();
      tg?.expand();
    } catch {}

    fetchMarkets();

    // Auto-refresh every 30s
    const interval = setInterval(fetchMarkets, 30000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  function handleBetPlaced(info: {
    asset: string;
    direction: string;
    amount: number;
    timeframe: string;
  }) {
    setLastBet(
      `${info.direction} ${info.asset} $${info.amount} (${info.timeframe})`
    );
    // Refresh balance from next fetch
    setBalance((prev) => (prev !== null ? prev - info.amount : null));
    setTimeout(() => setLastBet(null), 3000);
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">SynthBet</h1>
            <p className="text-xs text-tg-hint">
              AI-powered crypto predictions
            </p>
          </div>
          {balance !== null && (
            <div className="bg-tg-secondary rounded-xl px-3 py-1.5 text-sm">
              <span className="text-tg-hint">Balance: </span>
              <span className="font-bold">
                ${balance.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Last bet toast */}
        {lastBet && (
          <div className="mt-2 bg-up/10 border border-up/20 rounded-xl px-3 py-2 text-center text-up text-xs font-medium animate-slide-up">
            Bet placed: {lastBet}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="px-4 mb-4">
        <div className="flex bg-tg-secondary rounded-xl p-1">
          {(
            [
              { key: "markets", label: "Markets" },
              { key: "leaderboard", label: "Leaderboard" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-tg-button text-tg-button-text"
                  : "text-tg-hint"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 space-y-4">
        {tab === "markets" && (
          <>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-tg-secondary rounded-2xl p-4 animate-pulse h-64"
                  />
                ))}
              </div>
            ) : markets.length === 0 ? (
              <div className="bg-tg-secondary rounded-2xl p-8 text-center">
                <div className="text-tg-hint">
                  Failed to load markets. Pull down to refresh.
                </div>
              </div>
            ) : (
              markets.map((m) => (
                <MarketCard
                  key={m.asset}
                  asset={m.asset}
                  hourly={m.hourly}
                  daily={m.daily}
                  onBetPlaced={handleBetPlaced}
                />
              ))
            )}

            {/* Powered by */}
            <div className="text-center text-[11px] text-tg-hint py-4">
              Powered by{" "}
              <span className="text-tg-link">Synth</span> Monte Carlo
              simulations (1,000 paths)
              <br />
              Paper trading only — no real money
            </div>
          </>
        )}

        {tab === "leaderboard" && <Leaderboard />}
      </div>
    </main>
  );
}
