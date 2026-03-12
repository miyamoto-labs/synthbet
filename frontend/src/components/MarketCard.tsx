"use client";

import { useState, useEffect } from "react";
import type { SynthInsight } from "@/lib/synth";
import { formatPrice, formatProb, computeEdge } from "@/lib/synth";
import { ProbabilityBar } from "./ProbabilityBar";
import { ProbChart } from "./ProbChart";
import { CandleChart } from "./CandleChart";
import { BetButtons } from "./BetButtons";

const ASSET_ICONS: Record<string, string> = {
  BTC: "\u20bf",
  ETH: "\u039e",
  SOL: "\u25ce",
};

const ASSET_BG_COLORS: Record<string, string> = {
  BTC: "rgba(200,132,58,0.15)",
  ETH: "rgba(98,126,234,0.15)",
  SOL: "rgba(153,69,255,0.15)",
};

const ASSET_TEXT_COLORS: Record<string, string> = {
  BTC: "#E4A95A",
  ETH: "#8b9fe6",
  SOL: "#b87fff",
};

type MarketCardProps = {
  asset: string;
  min15: SynthInsight | null;
  hourly: SynthInsight | null;
  daily: SynthInsight | null;
  onBetPlaced: (info: { asset: string; direction: string; amount: number; timeframe: string; entryPrice?: number; endTime?: string; dbId?: number }) => void;
  onMarketExpired?: () => void;
  walletAddress?: string | null;
  balance?: number | null;
  initialTimeframe?: "15m" | "1h" | "daily";
  index?: number;
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
          : "bg-amber/10 text-amber-light"
      }`}
    >
      {remaining === "Expired" ? "Expired" : `${remaining}`}
    </span>
  );
}

export function MarketCard({ asset, min15, hourly, daily, onBetPlaced, onMarketExpired, walletAddress, balance, initialTimeframe, index = 0 }: MarketCardProps) {
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

  // Check if the market window has expired — auto-refresh to get new market
  const isExpired = insight.event_end_time
    ? Date.now() >= new Date(insight.event_end_time).getTime()
    : false;

  useEffect(() => {
    if (isExpired && onMarketExpired) {
      // New market should already be live — refresh after short delay
      const timer = setTimeout(() => onMarketExpired(), 2000);
      return () => clearTimeout(timer);
    }
  }, [isExpired, onMarketExpired]);

  const edge = computeEdge(insight.synth_probability_up, insight.polymarket_probability_up);
  const absEdge = Math.abs(edge);
  const priceChange = ((insight.current_price - insight.start_price) / insight.start_price) * 100;

  const EDGE_THRESHOLD = 10;
  const hasTradeableEdge = absEdge >= EDGE_THRESHOLD;
  const recommendedDirection: "UP" | "DOWN" | null = hasTradeableEdge
    ? (edge > 0 ? "UP" : "DOWN")
    : null;
  const signalStrength = absEdge >= 25 ? "Strong" : absEdge >= 15 ? "Moderate" : "Weak";

  const tfLabel = activeTf === "15m" ? "15 Min" : activeTf === "1h" ? "Hourly" : "Daily";

  return (
    <div
      className="bg-card rounded-2xl p-4 space-y-4 animate-card-enter border border-amber/10 lg:rounded-xl lg:p-3 lg:space-y-2.5"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold lg:w-8 lg:h-8 lg:text-sm"
            style={{ backgroundColor: ASSET_BG_COLORS[asset] || "rgba(200,132,58,0.1)", color: ASSET_TEXT_COLORS[asset] || "#E4A95A" }}
          >
            {ASSET_ICONS[asset] || asset[0]}
          </div>
          <div>
            <div className="font-bold text-lg text-ink lg:text-base">{asset}</div>
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
            ? "bg-up/8 border border-up/15 animate-edge-glow-up"
            : "bg-down/8 border border-down/15 animate-edge-glow-down"
        }`}>
          <span className={`w-2 h-2 rounded-full animate-pulse-dot ${
            recommendedDirection === "UP" ? "bg-up" : "bg-down"
          }`} />
          <span className="text-sm font-semibold text-ink lg:text-xs">
            Edge says {recommendedDirection} — {signalStrength} ({absEdge.toFixed(0)}% edge)
          </span>
        </div>
      ) : (
        <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5 bg-ink/4 border border-ink/8">
          <span className="w-2 h-2 rounded-full bg-muted/40" />
          <span className="text-sm font-medium text-muted lg:text-xs">
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
                  ? "bg-amber text-charcoal"
                  : hasData
                  ? "bg-ink/8 text-ink/60 hover:bg-ink/12"
                  : "bg-ink/4 text-muted/30 cursor-not-allowed"
              }`}
            >
              {tf === "15m" ? "15 Min" : tf === "1h" ? "1 Hour" : "Daily"}
              {!hasData && <span className="block text-[8px]">loading</span>}
            </button>
          );
        })}
      </div>

      {/* Price candle chart */}
      <CandleChart asset={asset} timeframe={activeTf} />

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

      {/* Market prices — what you're actually buying */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-up/8 border border-up/15 rounded-xl px-3 py-2 text-center lg:px-2 lg:py-1.5">
          <div className="text-[10px] text-up-dark font-semibold uppercase tracking-wider">Up</div>
          <div className="text-lg font-bold font-mono text-up-dark lg:text-base">
            {Math.round(insight.polymarket_probability_up * 100)}¢
          </div>
          <div className="text-[10px] text-muted font-mono">
            Synth: {Math.round(insight.synth_probability_up * 100)}¢
          </div>
        </div>
        <div className="bg-down/8 border border-down/15 rounded-xl px-3 py-2 text-center lg:px-2 lg:py-1.5">
          <div className="text-[10px] text-down font-semibold uppercase tracking-wider">Down</div>
          <div className="text-lg font-bold font-mono text-down lg:text-base">
            {Math.round((1 - insight.polymarket_probability_up) * 100)}¢
          </div>
          <div className="text-[10px] text-muted font-mono">
            Synth: {Math.round((1 - insight.synth_probability_up) * 100)}¢
          </div>
        </div>
      </div>

      {/* Edge indicator */}
      {recommendedDirection && (
        <div className="flex items-center justify-center gap-2 text-xs">
          <span className="text-muted">Edge:</span>
          <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
            recommendedDirection === "UP" ? "bg-up/15 text-up-dark" : "bg-down/15 text-down"
          }`}>
            {recommendedDirection} is underpriced by {absEdge.toFixed(0)}¢
          </span>
        </div>
      )}

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-up/10 border border-up/20 rounded-xl px-3 py-2 text-center text-up-dark text-sm font-medium animate-fade-up">
          Bet placed!
        </div>
      )}

      {/* Bet buttons or expired state */}
      {isExpired ? (
        <div className="rounded-xl px-3 py-3 bg-amber/5 border border-amber/10 text-center animate-pulse">
          <span className="text-sm text-muted font-medium">
            Loading next market...
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
          onBetPlaced={({ direction, amount, dbId }) => {
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            onBetPlaced({ asset, direction, amount, timeframe: activeTf, entryPrice: insight.current_price, endTime: insight.event_end_time, dbId });
          }}
          onMarketExpired={onMarketExpired}
        />
      )}
    </div>
  );
}
