"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { playBetPlaced, playChipToss, warmUpAudio } from "@/lib/sounds";
import { showConfirm, haptic } from "@/lib/telegram";

type FeaturedMarket = {
  slug: string;
  question: string;
  description: string;
  image: string;
  endDate: string;
  volume: number;
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  clobTokenIds: string[];
  conditionId: string;
  category: string;
  yesLabel: string;
  noLabel: string;
  noSlug: string | null;
};

type Props = {
  walletAddress: string | null;
  balance: number | null;
  selectedCategory: string;
  markets: FeaturedMarket[];
  loading: boolean;
  onBetPlaced: (info: {
    asset: string;
    direction: string;
    amount: number;
    timeframe: string;
    entryPrice?: number;
    endTime?: string;
    dbId?: number;
  }) => void;
};

const AMOUNTS = [5, 10, 25, 50];

// ── Helpers ──

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

// ── Live Countdown Hook ──

function useCountdown(endDate: string) {
  const [text, setText] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    if (!endDate) return;

    function tick() {
      const ms = new Date(endDate).getTime() - Date.now();
      if (ms <= 0) {
        setText("Ended");
        setUrgent(true);
        return;
      }
      const hours = Math.floor(ms / 3600000);
      const days = Math.floor(hours / 24);
      const mins = Math.floor((ms % 3600000) / 60000);
      const secs = Math.floor((ms % 60000) / 1000);

      if (days > 0) {
        setText(`${days}d ${hours % 24}h`);
        setUrgent(false);
      } else if (hours > 0) {
        setText(`${hours}h ${mins}m`);
        setUrgent(hours < 6);
      } else {
        setText(`${mins}:${secs.toString().padStart(2, "0")}`);
        setUrgent(true);
      }
    }

    tick();
    // Update every second when < 1 hour, else every minute
    const ms = new Date(endDate).getTime() - Date.now();
    const interval = setInterval(tick, ms < 3600000 ? 1000 : 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return { text, urgent };
}

// ── Category Pills (exported for use in page.tsx) ──

export function CategoryPills({
  categories,
  selected,
  onSelect,
}: {
  categories: { name: string; count: number }[];
  selected: string;
  onSelect: (cat: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
      {categories.map((cat) => (
        <button
          key={cat.name}
          onClick={() => {
            haptic("selection");
            onSelect(cat.name);
          }}
          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            selected === cat.name
              ? "bg-amber text-charcoal"
              : "bg-card border border-amber/10 text-white/70 active:bg-amber/10"
          }`}
        >
          {cat.name}
          <span
            className={`text-[9px] font-mono ${
              selected === cat.name ? "text-charcoal/60" : "text-white/30"
            }`}
          >
            {cat.count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Share Button ──

function ShareButton({ market }: { market: FeaturedMarket }) {
  function share() {
    haptic("light");
    const yPct = Math.round(market.yesPrice * 100);
    const nPct = Math.round(market.noPrice * 100);
    const text = `${market.question}\n\n${yPct}% ${market.yesLabel} / ${nPct}% ${market.noLabel}\n\nTrade on Déja. 👉`;
    const url = "https://t.me/synthbet_bot/app";
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`
    );
  }

  return (
    <button
      onClick={share}
      className="p-1 rounded-md text-white/30 hover:text-amber active:scale-90 transition-all"
      title="Share"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  );
}

// ── Market Card ──

function MarketBetCard({
  market,
  walletAddress,
  balance,
  onBetPlaced,
  isHot,
}: {
  market: FeaturedMarket;
  walletAddress: string | null;
  balance: number | null;
  onBetPlaced: Props["onBetPlaced"];
  isHot: boolean;
}) {
  const [side, setSide] = useState<"UP" | "DOWN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const countdown = useCountdown(market.endDate);

  const noWallet = !walletAddress;
  const noBalance = balance !== null && balance !== undefined && balance < 1;

  async function placeBet(amount: number) {
    if (!side || !walletAddress) return;

    const pickedLabel = side === "UP" ? market.yesLabel : market.noLabel;
    const confirmed = await showConfirm(
      `Bet $${amount} on ${pickedLabel}:\n"${market.question}"?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;

      const isTeamVsTeam = !!market.noSlug;
      const betSlug =
        side === "DOWN" && isTeamVsTeam ? market.noSlug! : market.slug;
      const betDirection = isTeamVsTeam ? "UP" : side;
      const betPrice = side === "UP" ? market.yesPrice : market.noPrice;

      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user?.id || 0,
          username: user?.username || null,
          first_name: user?.first_name || "Guest",
          asset: market.question.slice(0, 60),
          direction: betDirection,
          timeframe: "event",
          amount,
          synth_prob_up: market.yesPrice,
          poly_prob_up: market.yesPrice,
          entry_price: betPrice,
          event_slug: betSlug,
          slippage: 0.1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      playBetPlaced();
      haptic("success");
      setDone(true);

      onBetPlaced({
        asset: market.question.slice(0, 30),
        direction: pickedLabel,
        amount,
        timeframe: "event",
        entryPrice: betPrice,
        endTime: market.endDate,
        dbId: data.bet?.id,
      });
    } catch (err: any) {
      setError(err.message || "Bet failed");
      haptic("error");
    } finally {
      setLoading(false);
    }
  }

  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = Math.round(market.noPrice * 100);

  return (
    <div className="bg-card rounded-2xl p-4 border border-amber/10 space-y-3">
      {/* Question + meta */}
      <div className="flex gap-3">
        {market.image && (
          <img
            src={market.image}
            alt=""
            className="w-12 h-12 rounded-xl object-cover shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 flex-1">
              {market.question}
            </h3>
            <ShareButton market={market} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Live countdown */}
            {countdown.text && (
              <span
                className={`text-[10px] font-mono font-bold ${
                  countdown.urgent ? "text-down" : "text-amber-light"
                }`}
              >
                {countdown.urgent && countdown.text !== "Ended" ? "⏱ " : ""}
                {countdown.text}
              </span>
            )}
            <span className="text-[10px] text-white/40">
              Vol {formatVolume(market.volume)}
            </span>
            {isHot && (
              <span className="inline-flex items-center gap-0.5 bg-down/15 text-down text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                🔥 HOT
              </span>
            )}
            <span className="text-[9px] text-white/25 font-mono">
              {market.category}
            </span>
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-up-dark">
            {market.yesLabel} {yesPercent}%
          </span>
          <span className="text-down">
            {market.noLabel} {noPercent}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-down/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-up transition-all"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Side buttons */}
      {!done && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              warmUpAudio();
              playChipToss();
              haptic("medium");
              setSide("UP");
              setError(null);
            }}
            disabled={loading || noWallet}
            className={`py-2.5 rounded-xl font-bold text-sm transition-all truncate px-2 ${
              side === "UP"
                ? "bg-up text-charcoal scale-[1.02] shadow-lg shadow-up/30 ring-2 ring-up/40"
                : "bg-up text-charcoal shadow-sm hover:shadow-md"
            } ${noWallet ? "opacity-50" : ""}`}
          >
            {market.yesLabel} {yesPercent}c
          </button>
          <button
            onClick={() => {
              warmUpAudio();
              playChipToss();
              haptic("medium");
              setSide("DOWN");
              setError(null);
            }}
            disabled={loading || noWallet}
            className={`py-2.5 rounded-xl font-bold text-sm transition-all truncate px-2 ${
              side === "DOWN"
                ? "bg-down text-white scale-[1.02] shadow-lg shadow-down/30 ring-2 ring-down/40"
                : "bg-down/90 text-white shadow-sm hover:shadow-md"
            } ${noWallet ? "opacity-50" : ""}`}
          >
            {market.noLabel} {noPercent}c
          </button>
        </div>
      )}

      {/* Amount grid */}
      {side && !done && (
        <div className="space-y-2 animate-fade-up">
          {noBalance && (
            <p className="text-xs text-down text-center font-medium">
              Deposit USDC to trade
            </p>
          )}
          <div className="grid grid-cols-4 gap-2">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  playChipToss();
                  haptic("light");
                  placeBet(amt);
                }}
                disabled={loading || noBalance}
                className="py-2 bg-ink/5 hover:bg-amber/10 text-white rounded-lg text-sm font-mono font-bold transition-all border border-amber/10 disabled:opacity-50 active:scale-95"
              >
                {loading ? "..." : `$${amt}`}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-xs text-down text-center font-medium">
              {error}
            </p>
          )}
        </div>
      )}

      {/* Done state */}
      {done && (
        <div className="text-center py-2 text-up-dark text-sm font-bold animate-fade-up">
          Bet placed!
        </div>
      )}
    </div>
  );
}

// ── Main Component ──

// Hook to fetch featured markets + derive categories (used in page.tsx)
export function useFeaturedMarkets() {
  const [markets, setMarkets] = useState<FeaturedMarket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`/api/markets/featured?t=${Date.now()}`);
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err) {
      console.error("Failed to fetch featured markets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, 5 * 60_000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  const categories = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of markets) {
      counts[m.category] = (counts[m.category] || 0) + 1;
    }
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
    // "All" count includes the 3 synth crypto markets
    return [{ name: "All", count: markets.length + 3 }, ...sorted.map(c => c.name === "Crypto" ? { ...c, count: c.count + 3 } : c)];
  }, [markets]);

  return { markets, loading, categories };
}

export function FeaturedMarkets({ walletAddress, balance, selectedCategory, markets, loading, onBetPlaced }: Props) {
  // Filter by selected category
  const filtered = useMemo(() => {
    if (selectedCategory === "All") return markets;
    return markets.filter((m) => m.category === selectedCategory);
  }, [markets, selectedCategory]);

  // Compute "hot" threshold: markets with volume > 2x the median
  const hotThreshold = useMemo(() => {
    if (markets.length < 3) return Infinity;
    const vols = markets.map((m) => m.volume).sort((a, b) => a - b);
    const median = vols[Math.floor(vols.length / 2)];
    return median * 2;
  }, [markets]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Trending Markets
        </h2>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-2xl p-4 animate-pulse h-36"
          />
        ))}
      </div>
    );
  }

  if (markets.length === 0) return null;
  // If filtering shows nothing and we're on a specific category, show empty state
  // But if it's Crypto, the BTC/ETH/SOL cards handle that above — skip entirely
  if (filtered.length === 0 && selectedCategory === "Crypto") return null;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          {selectedCategory === "All" ? "Trending Markets" : selectedCategory}
        </h2>
        <span className="text-[10px] text-white/40 font-mono">
          {filtered.length} live
        </span>
      </div>

      {/* Market cards */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-2xl p-6 text-center border border-amber/10">
          <p className="text-white/40 text-sm">
            No {selectedCategory} markets right now
          </p>
        </div>
      ) : (
        filtered.map((m) => (
          <MarketBetCard
            key={m.slug}
            market={m}
            walletAddress={walletAddress}
            balance={balance}
            onBetPlaced={onBetPlaced}
            isHot={m.volume >= hotThreshold}
          />
        ))
      )}
    </div>
  );
}
