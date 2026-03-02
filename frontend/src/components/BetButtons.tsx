"use client";

import { useState } from "react";

const AMOUNTS = [10, 25, 50, 100];

type BetButtonsProps = {
  asset: string;
  timeframe: "1h" | "daily";
  synthProbUp: number;
  polyProbUp: number;
  entryPrice: number;
  eventSlug: string | null;
  onBetPlaced: (bet: { direction: string; amount: number }) => void;
  disabled?: boolean;
};

export function BetButtons({
  asset,
  timeframe,
  synthProbUp,
  polyProbUp,
  entryPrice,
  eventSlug,
  onBetPlaced,
  disabled,
}: BetButtonsProps) {
  const [direction, setDirection] = useState<"UP" | "DOWN" | null>(null);
  const [loading, setLoading] = useState(false);

  async function placeBet(amount: number) {
    if (!direction || disabled) return;
    setLoading(true);

    try {
      // Get Telegram user data
      const tg = (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe: { user?: { id: number; username?: string; first_name: string } } } } })
        .Telegram?.WebApp;
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
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      onBetPlaced({ direction, amount });

      // Haptic feedback
      try {
        (window as unknown as { Telegram?: { WebApp?: { HapticFeedback: { notificationOccurred: (t: string) => void } } } })
          .Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      } catch {}

      setDirection(null);
    } catch (err) {
      console.error("Bet failed:", err);
      try {
        (window as unknown as { Telegram?: { WebApp?: { HapticFeedback: { notificationOccurred: (t: string) => void } } } })
          .Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Direction buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setDirection("UP")}
          disabled={disabled || loading}
          className={`py-3 rounded-xl font-bold text-sm transition-all ${
            direction === "UP"
              ? "bg-up text-white scale-[1.02] shadow-lg shadow-up/30"
              : "bg-up/10 text-up border border-up/20"
          } ${disabled ? "opacity-50" : ""}`}
        >
          UP
        </button>
        <button
          onClick={() => setDirection("DOWN")}
          disabled={disabled || loading}
          className={`py-3 rounded-xl font-bold text-sm transition-all ${
            direction === "DOWN"
              ? "bg-down text-white scale-[1.02] shadow-lg shadow-down/30"
              : "bg-down/10 text-down border border-down/20"
          } ${disabled ? "opacity-50" : ""}`}
        >
          DOWN
        </button>
      </div>

      {/* Amount buttons — show only when direction selected */}
      {direction && (
        <div className="grid grid-cols-4 gap-2 animate-slide-up">
          {AMOUNTS.map((amt) => (
            <button
              key={amt}
              onClick={() => placeBet(amt)}
              disabled={loading}
              className="py-2 bg-tg-button/10 hover:bg-tg-button/20 text-tg-text rounded-lg text-sm font-medium transition-all border border-tg-button/20 disabled:opacity-50"
            >
              {loading ? "..." : `$${amt}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
