"use client";

import { useState } from "react";
import { playBetPlaced, playChipToss, warmUpAudio } from "@/lib/sounds";
import { showConfirm, haptic } from "@/lib/telegram";

const AMOUNTS = [5, 10, 25, 50];
const SLIPPAGE_OPTIONS = [
  { label: "5%", value: 0.05 },
  { label: "10%", value: 0.10 },
  { label: "15%", value: 0.15 },
  { label: "20%", value: 0.20 },
];

type BetButtonsProps = {
  asset: string;
  timeframe: "15m" | "1h" | "daily";
  synthProbUp: number;
  polyProbUp: number;
  entryPrice: number;
  eventSlug: string | null;
  walletAddress?: string | null;
  balance?: number | null;
  recommendedDirection?: "UP" | "DOWN" | null;
  onBetPlaced: (bet: { direction: string; amount: number }) => void;
  onMarketExpired?: () => void;
  disabled?: boolean;
};

export function BetButtons({
  asset,
  timeframe,
  synthProbUp,
  polyProbUp,
  entryPrice,
  eventSlug,
  walletAddress,
  balance,
  recommendedDirection,
  onBetPlaced,
  onMarketExpired,
  disabled,
}: BetButtonsProps) {
  const [direction, setDirection] = useState<"UP" | "DOWN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [slippage, setSlippage] = useState(0.10);
  const [chipFly, setChipFly] = useState(false);
  const [bounceDir, setBounceDir] = useState<"UP" | "DOWN" | null>(null);

  const noWallet = !walletAddress;
  const noBalance = balance !== null && balance !== undefined && balance < 1;

  async function placeBet(amount: number) {
    if (!direction || disabled || noWallet) return;

    // Native Telegram confirmation dialog
    const confirmed = await showConfirm(
      `Bet $${amount} on ${asset} ${direction} (${timeframe})?`
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      // Get Telegram user data
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;

      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user?.id || 0,
          username: user?.username || null,
          first_name: user?.first_name || "Guest",
          asset,
          direction,
          timeframe,
          amount,
          synth_prob_up: synthProbUp,
          poly_prob_up: polyProbUp,
          entry_price: entryPrice,
          event_slug: eventSlug,
          slippage,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onBetPlaced({ direction, amount });

      // Sound + haptic feedback
      playBetPlaced();
      haptic("success");

      setDirection(null);
    } catch (err: any) {
      console.error("Bet failed:", err);
      const msg = err.message || "Order failed";
      // Auto-refresh markets if expired
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("loading latest")) {
        setError("Market expired — loading latest markets...");
        setDirection(null);
        onMarketExpired?.();
        setTimeout(() => setError(null), 3000);
      } else {
        setError(msg);
      }
      haptic("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Direction buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => { warmUpAudio(); playChipToss(); haptic("medium"); setDirection("UP"); setBounceDir("UP"); setTimeout(() => setBounceDir(null), 400); setError(null); }}
          disabled={disabled || loading || noWallet}
          className={`relative py-3.5 rounded-xl font-bold text-sm transition-all ${
            bounceDir === "UP" ? "animate-spring" : ""
          } ${
            direction === "UP"
              ? "bg-up text-ink scale-[1.02] shadow-lg shadow-up/30 ring-2 ring-up/40"
              : "bg-up text-ink shadow-sm hover:shadow-md hover:shadow-up/20"
          } ${disabled || noWallet ? "opacity-50" : ""}`}
        >
          UP
          {recommendedDirection === "UP" && (
            <span className="absolute -top-1.5 -right-1.5 bg-up-dark text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              EDGE
            </span>
          )}
        </button>
        <button
          onClick={() => { warmUpAudio(); playChipToss(); haptic("medium"); setDirection("DOWN"); setBounceDir("DOWN"); setTimeout(() => setBounceDir(null), 400); setError(null); }}
          disabled={disabled || loading || noWallet}
          className={`relative py-3.5 rounded-xl font-bold text-sm transition-all ${
            bounceDir === "DOWN" ? "animate-spring" : ""
          } ${
            direction === "DOWN"
              ? "bg-down text-white scale-[1.02] shadow-lg shadow-down/30 ring-2 ring-down/40"
              : "bg-down/90 text-white shadow-sm hover:shadow-md hover:shadow-down/20"
          } ${disabled || noWallet ? "opacity-50" : ""}`}
        >
          DOWN
          {recommendedDirection === "DOWN" && (
            <span className="absolute -top-1.5 -right-1.5 bg-down text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
              EDGE
            </span>
          )}
        </button>
      </div>

      {/* No wallet message */}
      {noWallet && (
        <p className="text-xs text-muted text-center">Setting up wallet...</p>
      )}

      {/* No balance warning */}
      {!noWallet && noBalance && direction && (
        <p className="text-xs text-down text-center font-medium">
          Deposit USDC (Polygon) to your wallet to trade
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-down text-center font-medium">{error}</p>
      )}

      {/* Amount + slippage — show only when direction selected */}
      {direction && !noWallet && (
        <div className="space-y-2 animate-fade-up">
          {/* Slippage selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted font-semibold">Slippage:</span>
            <div className="flex gap-1 flex-1">
              {SLIPPAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSlippage(opt.value)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${
                    slippage === opt.value
                      ? "bg-ink text-white"
                      : "bg-ink/5 text-muted border border-ink/8"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 relative">
            {AMOUNTS.map((amt) => (
              <button
                key={amt}
                onClick={() => { playChipToss(); haptic("light"); setChipFly(true); setTimeout(() => setChipFly(false), 600); placeBet(amt); }}
                disabled={loading || noBalance}
                className="py-2 bg-ink/5 hover:bg-ink/10 text-ink rounded-lg text-sm font-mono font-bold transition-all border border-ink/8 disabled:opacity-50 active:scale-95"
              >
                {loading ? "..." : `$${amt}`}
              </button>
            ))}
            {/* Flying chip */}
            {chipFly && (
              <div className="absolute left-1/2 bottom-0 -translate-x-1/2 pointer-events-none">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold animate-chip-fly ${
                  direction === "UP" ? "bg-up text-ink" : "bg-down text-white"
                }`}>
                  $
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              placeholder="Custom $"
              min={5}
              max={100}
              value={customAmount}
              onChange={(e) => { playChipToss(); setCustomAmount(e.target.value); }}
              disabled={loading || noBalance}
              className="flex-1 py-2 px-3 bg-ink/5 text-ink rounded-lg text-sm font-mono font-bold border border-ink/8 placeholder:text-muted/50 disabled:opacity-50 outline-none focus:ring-2 focus:ring-ink/20"
            />
            <button
              onClick={() => {
                const amt = parseFloat(customAmount);
                if (amt >= 5 && amt <= 100) { playChipToss(); placeBet(amt); }
                else setError("Custom amount must be $5\u2013$100");
              }}
              disabled={loading || noBalance || !customAmount}
              className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-bold disabled:opacity-50 active:translate-y-px"
            >
              {loading ? "..." : "Go"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
