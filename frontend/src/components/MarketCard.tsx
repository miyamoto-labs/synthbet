"use client";

import { useState, useEffect } from "react";
import type { SynthInsight } from "@/lib/synth";
import { formatPrice, formatProb, computeEdge } from "@/lib/synth";
import { ProbabilityBar } from "./ProbabilityBar";
import { ProbChart } from "./ProbChart";
import { BetButtons } from "./BetButtons";

const ASSET_ICONS: Record<string, string> = {
  BTC: "\u20bf",
  ETH: "\u039e",
  SOL: "\u25ce",
};

const ASSET_BG_COLORS: Record<string, string> = {
  BTC: "#fff3e0",
  ETH: "#e8eaf6",
  SOL: "#f3e5f5",
};

const ASSET_TEXT_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
};

type MarketCardProps = {
  asset: string;
  min15: SynthInsight | null;
  hourly: SynthInsight | null;
  daily: SynthInsight | null;
  onBetPlaced: (info: { asset: string; direction: string; amount: number; timeframe: string }) => void;
  onMarketExpired?: () => void;
  walletAddress?: string | null;
  balance?: number | null;
  initialTimeframe?: "15m" | "1h" | "daily";
};

function Countdown({ endTime }: { endTime: string }) {
  const [remaining, setRemaining] = useState("");
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    function update() {
      const end = new Date(endTime).getTime();
      const diff = end - Date.now();

      if (diff <= 0) {
        setRemaining("Expired");
        setUrgent(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setRemaining(`${hrs}h ${remainMins}m`);
        setUrgent(false);
      } else {
        setRemaining(`${mins}:${secs.toString().padStart(2, "0")}`);
        setUrgent(diff < 120000); // urgent when < 2 min
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (!remaining) return null;

  return (
    <span
      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
        urgent
          ? "bg-down/15 text-down animate-pulse"
          : "bg-ink/8 text-muted"
      }`}
    >
      {remaining === "Expired" ? "Expired" : `${remaining}`}
    </span>
  );
}

export function MarketCard({ asset, min15, hourly, daily, onBetPlaced, onMarketExpired, walletAddress, balance, initialTimeframe }: MarketCardProps) {
  const [timeframe, setTimeframe] = useState<"15m" | "1h" | "daily">(initialTimeframe || "15m");
  const [showSuccess, setShowSuccess] = useState(false);

  const insightForTf = timeframe === "15m" ? min15 : timeframe === "1h" ? hourly : daily;
  // Fall back to any available timeframe instead of hiding the card
  const insight = insightForTf || min15 || hourly || daily;
  if (!insight) return null;
  // Track which timeframe is actually showing (may differ from selected if data is missing)
  const activeTf = insightForTf ? timeframe
    : min15 ? "15m" as const
    : hourly ? "1h" as const
    : "daily" as const;

  // Check if the market window has expired
  const isExpired = insight.event_end_time
    ? Date.now() >= new Date(insight.event_end_time).getTime()
    : false;

  const edge = computeEdge(insight.synth_probability_up, insight.polymarket_probability_up);
  const absEdge = Math.abs(edge);
  const priceChange = ((insight.current_price - insight.start_price) / insight.start_price) * 100;

  const EDGE_THRESHOLD = 15;
  const hasTradeableEdge = absEdge >= EDGE_THRESHOLD;
  const recommendedDirection: "UP" | "DOWN" | null = hasTradeableEdge
    ? (edge > 0 ? "UP" : "DOWN")
    : null;
  const signalStrength = absEdge >= 25 ? "Strong" : absEdge >= 15 ? "Moderate" : "Weak";

  const tfLabel = activeTf === "15m" ? "15 Min" : activeTf === "1h" ? "Hourly" : "Daily";

  return (
    <div className="bg-card rounded-2xl p-4 space-y-4 animate-fade-up shadow-sm border border-ink/5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: ASSET_BG_COLORS[asset] || "#f5f5f5", color: ASSET_TEXT_COLORS[asset] || "#333" }}
          >
            {ASSET_ICONS[asset] || asset[0]}
          </div>
          <div>
            <div className="font-bold text-lg text-ink">{asset}</div>
            <div className="text-muted text-xs font-mono">{formatPrice(insight.current_price)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Countdown timer */}
          {insight.event_end_time && !isExpired && (
            <Countdown endTime={insight.event_end_time} />
          )}
          <div className="text-right">
            <div
              className={`text-sm font-bold font-mono ${
                priceChange >= 0 ? "text-up-dark" : "text-down"
              }`}
            >
              {priceChange >= 0 ? "+" : ""}
              {priceChange.toFixed(2)}%
            </div>
            <div className="text-[11px] text-muted">
              from {formatPrice(insight.start_price)}
            </div>
          </div>
        </div>
      </div>

      {/* Signal badge */}
      {hasTradeableEdge ? (
        <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${
          recommendedDirection === "UP"
            ? "bg-up/8 border border-up/15"
            : "bg-down/8 border border-down/15"
        }`}>
          <span className={`w-2 h-2 rounded-full animate-pulse-dot ${
            recommendedDirection === "UP" ? "bg-up" : "bg-down"
          }`} />
          <span className="text-sm font-semibold text-ink">
            Edge says {recommendedDirection} — {signalStrength} ({absEdge.toFixed(0)}% edge)
          </span>
        </div>
      ) : (
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 bg-ink/5 border border-ink/8">
          <span className="w-2 h-2 rounded-full bg-muted/40" />
          <span className="text-sm font-medium text-muted">
            No edge — models agree ({absEdge.toFixed(0)}% diff)
          </span>
        </div>
      )}

      {/* Timeframe toggle */}
      <div className="flex gap-2">
        {(["15m", "1h", "daily"] as const).map((tf) => {
          const hasData = tf === "15m" ? !!min15 : tf === "1h" ? !!hourly : !!daily;
          return (
            <button
              key={tf}
              onClick={() => hasData && setTimeframe(tf)}
              disabled={!hasData}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTf === tf
                  ? "bg-card text-ink shadow-sm border border-ink/10"
                  : hasData
                  ? "bg-ink/5 text-muted"
                  : "bg-ink/3 text-muted/30 cursor-not-allowed"
              }`}
            >
              {tf === "15m" ? "15 Min" : tf === "1h" ? "1 Hour" : "Daily"}
              {!hasData && <span className="block text-[8px]">loading</span>}
            </button>
          );
        })}
      </div>

      {/* Probability chart */}
      <ProbChart
        slug={insight.slug}
        synthProb={insight.synth_probability_up}
        label={`${asset} ${tfLabel} — UP Probability`}
      />

      {/* Probability bars */}
      <ProbabilityBar
        synthProb={insight.synth_probability_up}
        polyProb={insight.polymarket_probability_up}
        label={`${asset} ${tfLabel} Prediction`}
      />

      {/* Model comparison */}
      <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
        <span className="text-muted">Synth:</span>
        <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
          insight.synth_outcome === "Up" ? "bg-up/10 text-up-dark" : "bg-down/10 text-down"
        }`}>
          {insight.synth_outcome.toUpperCase()} {formatProb(
            insight.synth_outcome === "Up" ? insight.synth_probability_up : 1 - insight.synth_probability_up
          )}
        </span>
        {recommendedDirection ? (
          <>
            <span className="text-muted">→ Bet</span>
            <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
              recommendedDirection === "UP" ? "bg-up/15 text-up-dark" : "bg-down/15 text-down"
            }`}>
              {recommendedDirection}
            </span>
          </>
        ) : (
          <span className="text-muted">→ Skip (no edge)</span>
        )}
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-up/10 border border-up/20 rounded-xl px-3 py-2 text-center text-up-dark text-sm font-medium animate-fade-up">
          Bet placed!
        </div>
      )}

      {/* Bet buttons or expired state */}
      {isExpired ? (
        <div className="rounded-xl px-3 py-3 bg-ink/5 border border-ink/8 text-center">
          <span className="text-sm text-muted font-medium">
            Market window ended — waiting for next {activeTf === "15m" ? "15-min" : activeTf === "1h" ? "hourly" : "daily"} window
          </span>
        </div>
      ) : (
        <BetButtons
          asset={asset}
          timeframe={activeTf}
          synthProbUp={insight.synth_probability_up}
          polyProbUp={insight.polymarket_probability_up}
          entryPrice={insight.current_price}
          eventSlug={insight.slug}
          walletAddress={walletAddress}
          balance={balance}
          recommendedDirection={recommendedDirection}
          onBetPlaced={({ direction, amount }) => {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            onBetPlaced({ asset, direction, amount, timeframe: activeTf });
          }}
          onMarketExpired={onMarketExpired}
        />
      )}
    </div>
  );
}
