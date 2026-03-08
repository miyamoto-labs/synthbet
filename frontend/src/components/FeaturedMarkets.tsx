"use client";

import { useEffect, useState, useCallback } from "react";
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
  noSlug: string | null; // different slug for 2-market events (team vs team)
};

type Props = {
  walletAddress: string | null;
  balance: number | null;
  onBetPlaced: (info: {
    asset: string;
    direction: string;
    amount: number;
    timeframe: string;
    entryPrice?: number;
    endTime?: string;
  }) => void;
};

const AMOUNTS = [5, 10, 25, 50];

function timeUntil(endDate: string): string {
  const ms = new Date(endDate).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function MarketBetCard({
  market,
  walletAddress,
  balance,
  onBetPlaced,
}: {
  market: FeaturedMarket;
  walletAddress: string | null;
  balance: number | null;
  onBetPlaced: Props["onBetPlaced"];
}) {
  const [side, setSide] = useState<"UP" | "DOWN" | null>(null); // UP=YES, DOWN=NO
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

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

      // For 2-market events (team vs team):
      // Picking the "NO" side means buying YES on the second market's slug
      const isTeamVsTeam = !!market.noSlug;
      const betSlug = (side === "DOWN" && isTeamVsTeam) ? market.noSlug! : market.slug;
      // Always buy YES (UP) when it's team-vs-team — we're buying YES on the chosen team
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
          slippage: 0.10,
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
    <div className="bg-card rounded-2xl p-4 shadow-sm border border-ink/5 space-y-3">
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
          <h3 className="text-sm font-bold text-ink leading-snug line-clamp-2">
            {market.question}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] text-muted font-mono">
              {timeUntil(market.endDate)}
            </span>
            <span className="text-[10px] text-muted">
              Vol {formatVolume(market.volume)}
            </span>
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-bold">
          <span className="text-up-dark">{market.yesLabel} {yesPercent}%</span>
          <span className="text-down">{market.noLabel} {noPercent}%</span>
        </div>
        <div className="h-2 rounded-full bg-down/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-up transition-all"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Side buttons — team names or YES/NO */}
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
                ? "bg-up text-ink scale-[1.02] shadow-lg shadow-up/30 ring-2 ring-up/40"
                : "bg-up/80 text-ink shadow-sm hover:shadow-md"
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
                : "bg-down/80 text-white shadow-sm hover:shadow-md"
            } ${noWallet ? "opacity-50" : ""}`}
          >
            {market.noLabel} {noPercent}c
          </button>
        </div>
      )}

      {/* Amount grid — show after picking side */}
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
                className="py-2 bg-ink/5 hover:bg-ink/10 text-ink rounded-lg text-sm font-mono font-bold transition-all border border-ink/8 disabled:opacity-50 active:scale-95"
              >
                {loading ? "..." : `$${amt}`}
              </button>
            ))}
          </div>
          {error && (
            <p className="text-xs text-down text-center font-medium">{error}</p>
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

export function FeaturedMarkets({ walletAddress, balance, onBetPlaced }: Props) {
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
    // Refresh every 5 minutes
    const interval = setInterval(fetchMarkets, 5 * 60_000);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <span className="text-base">Fun Markets</span>
        </h2>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-2xl p-4 animate-pulse h-36 shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (markets.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-ink">Fun Markets</h2>
        <span className="text-[10px] text-muted font-mono">
          Polymarket trending
        </span>
      </div>
      {markets.map((m) => (
        <MarketBetCard
          key={m.slug}
          market={m}
          walletAddress={walletAddress}
          balance={balance}
          onBetPlaced={onBetPlaced}
        />
      ))}
    </div>
  );
}
