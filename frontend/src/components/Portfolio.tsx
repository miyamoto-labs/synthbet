"use client";

import { useEffect, useState, useCallback } from "react";
import type { MarketData } from "@/lib/synth";

type Bet = {
  id: number;
  asset: string;
  direction: string;
  timeframe: string;
  amount: number;
  entry_price: number;
  result: string;
  pnl: number;
  event_slug: string | null;
  order_id: string | null;
  created_at: string;
};

type FeaturedMarketPrice = {
  slug: string;
  noSlug: string | null;
  yesPrice: number;
  noPrice: number;
};

type PortfolioProps = {
  refreshKey?: number;
  markets?: MarketData[];
  featuredMarkets?: FeaturedMarketPrice[];
  onSell?: (betId: number, currentPrice: number) => Promise<{ pnl: number } | null>;
};

export function Portfolio({ refreshKey, markets, featuredMarkets, onSell }: PortfolioProps) {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<string | null>(null);
  const [sellingId, setSellingId] = useState<number | null>(null);

  const fetchBets = useCallback(async () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      if (!user?.id) return;

      // Trigger resolve+redeem for any pending bets, then fetch
      await fetch(`/api/resolve-mine?telegram_id=${user.id}`).catch(() => {});

      const res = await fetch(`/api/portfolio?telegram_id=${user.id}&t=${Date.now()}`);
      const data = await res.json();
      setBets(data.bets || []);
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // Re-fetch when tab switches to portfolio
  useEffect(() => {
    if (refreshKey !== undefined && refreshKey > 0) {
      fetchBets();
    }
  }, [refreshKey, fetchBets]);

  // Get current price for a bet from markets data
  function getCurrentPrice(bet: Bet): number | null {
    // Featured/event market bets — look up from featuredMarkets
    if (bet.timeframe === "event" && bet.event_slug && featuredMarkets) {
      const fm = featuredMarkets.find(
        (m) => m.slug === bet.event_slug || m.noSlug === bet.event_slug
      );
      if (!fm) return null;
      // For UP/YES bets: current yesPrice. For DOWN/NO bets: current noPrice.
      return bet.direction === "UP" ? fm.yesPrice : fm.noPrice;
    }

    // Synth up/down markets (BTC/ETH/SOL)
    if (!markets) return null;
    const market = markets.find((m) => m.asset === bet.asset);
    if (!market) return null;
    const tfKey = bet.timeframe === "15m" ? "15min" : bet.timeframe === "1h" ? "hourly" : "daily";
    const insight = market[tfKey as keyof typeof market];
    if (!insight || typeof insight === "string") return null;
    return (insight as any).current_price ?? null;
  }

  // Calculate estimated P&L for a pending bet
  function getEstimatedPnl(bet: Bet): { pnl: number; currentPrice: number } | null {
    const currentPrice = getCurrentPrice(bet);
    if (currentPrice === null || bet.entry_price === 0) return null;

    let pnl: number;
    if (bet.direction === "UP") {
      pnl = bet.amount * ((currentPrice - bet.entry_price) / bet.entry_price);
    } else {
      pnl = bet.amount * ((bet.entry_price - currentPrice) / bet.entry_price);
    }
    // Cap loss at wagered amount
    pnl = Math.max(pnl, -bet.amount);
    return { pnl, currentPrice };
  }

  async function handleSell(bet: Bet) {
    if (!onSell || sellingId) return;
    const estimate = getEstimatedPnl(bet);
    if (!estimate) return;

    setSellingId(bet.id);
    try {
      const result = await onSell(bet.id, estimate.currentPrice);
      if (result) {
        // Re-fetch to show updated status
        await fetchBets();
      }
    } finally {
      setSellingId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl p-4 animate-pulse h-20 shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-amber/10">
        <div className="text-2xl mb-2">📊</div>
        <div className="text-muted text-sm">
          No bets placed yet. Pick a market and go!
        </div>
      </div>
    );
  }

  // Stats
  const totalBets = bets.length;
  const totalSpent = bets.reduce((s, b) => s + b.amount, 0);
  const totalPnl = bets.reduce((s, b) => s + b.pnl, 0);
  const wins = bets.filter((b) => b.result === "won").length;
  const resolved = bets.filter((b) => b.result !== "pending").length;
  const pendingCount = bets.filter((b) => b.result === "pending").length;
  const hasWins = bets.some((b) => b.result === "won");

  async function claimWinnings() {
    setRedeeming(true);
    setRedeemResult(null);
    try {
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      if (!user?.id) throw new Error("No user");

      const res = await fetch(`/api/redeem?telegram_id=${user.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Redeem failed");

      if (data.redeemed > 0) {
        setRedeemResult(`Claimed ${data.redeemed} position${data.redeemed > 1 ? "s" : ""} to USDC`);
        try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
      } else {
        setRedeemResult("No positions to claim right now");
      }
    } catch (err: any) {
      setRedeemResult(err.message || "Claim failed");
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error"); } catch {}
    } finally {
      setRedeeming(false);
    }
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  function tfLabel(tf: string) {
    if (tf === "15m") return "15min";
    if (tf === "1h") return "1hr";
    return tf;
  }

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-amber/10">
          <div className="text-lg font-bold font-mono text-ink">{totalBets}</div>
          <div className="text-[10px] text-muted font-medium">Bets</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-amber/10">
          <div className="text-lg font-bold font-mono text-ink">
            ${totalSpent.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted font-medium">Wagered</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-amber/10">
          <div
            className={`text-lg font-bold font-mono ${
              totalPnl >= 0 ? "text-up-dark" : "text-down"
            }`}
          >
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-muted font-medium">
            P&L {resolved > 0 && `(${wins}/${resolved} won)`}
          </div>
        </div>
      </div>

      {/* Claim winnings button */}
      {hasWins && (
        <button
          onClick={claimWinnings}
          disabled={redeeming}
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-amber text-charcoal shadow-sm disabled:opacity-50"
        >
          {redeeming ? "Claiming..." : "Claim Winnings to USDC"}
        </button>
      )}
      {redeemResult && (
        <div className={`rounded-xl px-3 py-2 text-center text-xs font-medium ${
          redeemResult.includes("Claimed") ? "bg-up/10 text-up-dark" : "bg-ink/5 text-muted"
        }`}>
          {redeemResult}
        </div>
      )}

      {/* Pending bets info */}
      {pendingCount > 0 && (
        <div className="bg-ink/5 rounded-xl px-3 py-2 text-center border border-ink/8">
          <span className="text-xs text-muted font-medium">
            {pendingCount} active position{pendingCount > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Bet list */}
      {bets.map((bet) => {
        const isPending = bet.result === "pending";
        const estimate = isPending ? getEstimatedPnl(bet) : null;
        const isSelling = sellingId === bet.id;

        return (
          <div
            key={bet.id}
            className={`bg-card rounded-xl p-3 shadow-sm border ${
              isPending ? "border-amber/20" : "border-amber/10"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">{bet.asset}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    bet.direction === "UP"
                      ? "bg-up/20 text-up-dark"
                      : "bg-down/20 text-down"
                  }`}
                >
                  {bet.direction}
                </span>
                <span className="text-[10px] text-muted font-mono">
                  {tfLabel(bet.timeframe)}
                </span>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {bet.order_id?.startsWith("dry-") && (
                    <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-ink/10 text-muted/60 uppercase">
                      Paper
                    </span>
                  )}
                  <span className="text-sm font-bold font-mono text-ink">
                    ${bet.amount}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    bet.result === "won"
                      ? "bg-up/15 text-up-dark"
                      : bet.result === "lost"
                      ? "bg-down/15 text-down"
                      : bet.result === "cancelled" || bet.result === "closed"
                      ? "bg-ink/5 text-muted/60"
                      : "bg-ink/8 text-muted"
                  }`}
                >
                  {bet.result === "pending"
                    ? "Active"
                    : bet.result === "cancelled"
                    ? "Cancelled"
                    : bet.result === "closed"
                    ? "Sold"
                    : bet.result.toUpperCase()}
                </span>
                {/* Show live P&L for pending bets, stored P&L for resolved */}
                {isPending && estimate ? (
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      estimate.pnl >= 0 ? "text-up-dark" : "text-down"
                    }`}
                  >
                    {estimate.pnl >= 0 ? "+" : ""}${estimate.pnl.toFixed(2)}
                  </span>
                ) : bet.pnl !== 0 ? (
                  <span
                    className={`text-[11px] font-bold font-mono ${
                      bet.pnl > 0 ? "text-up-dark" : "text-down"
                    }`}
                  >
                    {bet.pnl > 0 ? "+" : ""}${bet.pnl.toFixed(2)}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] text-muted">
                {timeAgo(bet.created_at)}
              </span>
            </div>

            {/* Sell button for pending bets */}
            {isPending && onSell && (
              <button
                onClick={() => handleSell(bet)}
                disabled={isSelling || !estimate}
                className={`w-full mt-2.5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${
                  !estimate
                    ? "bg-ink/10 text-muted"
                    : estimate.pnl >= 0
                    ? "bg-up/15 text-up-dark border border-up/20"
                    : "bg-down/15 text-down border border-down/20"
                }`}
              >
                {isSelling
                  ? "Selling..."
                  : !estimate
                  ? "Price unavailable"
                  : `Sell (${estimate.pnl >= 0 ? "+" : ""}$${Math.abs(estimate.pnl).toFixed(2)})`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
