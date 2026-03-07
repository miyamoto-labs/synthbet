"use client";

import { useEffect, useState, useCallback } from "react";

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

export function Portfolio() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemResult, setRedeemResult] = useState<string | null>(null);

  const fetchBets = useCallback(async () => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      if (!user?.id) return;

      // Trigger resolve+redeem for any pending bets, then fetch
      await fetch(`/api/resolve-mine?telegram_id=${user.id}`).catch(() => {});

      const res = await fetch(`/api/portfolio?telegram_id=${user.id}`);
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
      <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-ink/5">
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
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-ink/5">
          <div className="text-lg font-bold font-mono text-ink">{totalBets}</div>
          <div className="text-[10px] text-muted font-medium">Bets</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-ink/5">
          <div className="text-lg font-bold font-mono text-ink">
            ${totalSpent.toFixed(0)}
          </div>
          <div className="text-[10px] text-muted font-medium">Wagered</div>
        </div>
        <div className="bg-card rounded-xl p-3 text-center shadow-sm border border-ink/5">
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
          className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-[0.98] bg-up text-ink shadow-sm disabled:opacity-50"
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
            {pendingCount} bet{pendingCount > 1 ? "s" : ""} awaiting market resolution
          </span>
        </div>
      )}

      {/* Bet list */}
      {bets.map((bet) => (
        <div
          key={bet.id}
          className="bg-card rounded-xl p-3 shadow-sm border border-ink/5"
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
              <span className="text-sm font-bold font-mono text-ink">
                ${bet.amount}
              </span>
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
                    : bet.result === "cancelled"
                    ? "bg-ink/5 text-muted/60"
                    : "bg-ink/8 text-muted"
                }`}
              >
                {bet.result === "pending" ? "Awaiting result" : bet.result === "cancelled" ? "Cancelled" : bet.result.toUpperCase()}
              </span>
              {bet.pnl !== 0 && (
                <span
                  className={`text-[11px] font-bold font-mono ${
                    bet.pnl > 0 ? "text-up-dark" : "text-down"
                  }`}
                >
                  {bet.pnl > 0 ? "+" : ""}${bet.pnl.toFixed(2)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted">
              {timeAgo(bet.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
