"use client";

import { useState } from "react";
import type { SynthInsight } from "@/lib/synth";
import { formatPrice, formatProb, computeEdge } from "@/lib/synth";
import { ProbabilityBar } from "./ProbabilityBar";
import { BetButtons } from "./BetButtons";

const ASSET_ICONS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  SOL: "◎",
};

const ASSET_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  SOL: "#9945ff",
};

type MarketCardProps = {
  asset: string;
  hourly: SynthInsight | null;
  daily: SynthInsight | null;
  onBetPlaced: (info: { asset: string; direction: string; amount: number; timeframe: string }) => void;
};

export function MarketCard({ asset, hourly, daily, onBetPlaced }: MarketCardProps) {
  const [timeframe, setTimeframe] = useState<"1h" | "daily">("1h");
  const [showSuccess, setShowSuccess] = useState(false);

  const insight = timeframe === "1h" ? hourly : daily;
  if (!insight) return null;

  const edge = computeEdge(insight.synth_probability_up, insight.polymarket_probability_up);
  const hasSignificantEdge = Math.abs(edge) >= 5;
  const priceChange = ((insight.current_price - insight.start_price) / insight.start_price) * 100;

  return (
    <div className="bg-tg-secondary rounded-2xl p-4 space-y-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ backgroundColor: ASSET_COLORS[asset] + "20", color: ASSET_COLORS[asset] }}
          >
            {ASSET_ICONS[asset] || asset[0]}
          </div>
          <div>
            <div className="font-bold text-lg">{asset}</div>
            <div className="text-tg-hint text-xs">{formatPrice(insight.current_price)}</div>
          </div>
        </div>
        <div className="text-right">
          <div
            className={`text-sm font-bold ${
              priceChange >= 0 ? "text-up" : "text-down"
            }`}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChange.toFixed(2)}%
          </div>
          <div className="text-[11px] text-tg-hint">
            from {formatPrice(insight.start_price)}
          </div>
        </div>
      </div>

      {/* Edge callout */}
      {hasSignificantEdge && (
        <div className="bg-edge/10 border border-edge/20 rounded-xl px-3 py-2 text-center">
          <span className="text-edge text-sm font-bold">
            Synth says {formatProb(insight.synth_probability_up)} UP, market says{" "}
            {formatProb(insight.polymarket_probability_up)} — {Math.abs(edge).toFixed(1)}% edge
          </span>
        </div>
      )}

      {/* Timeframe toggle */}
      <div className="flex gap-2">
        {(["1h", "daily"] as const).map((tf) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
              timeframe === tf
                ? "bg-tg-button text-tg-button-text"
                : "bg-tg-bg text-tg-hint"
            }`}
          >
            {tf === "1h" ? "1 Hour" : "Daily"}
          </button>
        ))}
      </div>

      {/* Probability bars */}
      <ProbabilityBar
        synthProb={insight.synth_probability_up}
        polyProb={insight.polymarket_probability_up}
        label={`${asset} ${timeframe === "1h" ? "Hourly" : "Daily"} Prediction`}
      />

      {/* Synth outcome indicator */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <span className="text-tg-hint">Synth model says:</span>
        <span
          className={`font-bold px-2 py-0.5 rounded-full ${
            insight.synth_outcome === "Up"
              ? "bg-up/10 text-up"
              : "bg-down/10 text-down"
          }`}
        >
          {insight.synth_outcome.toUpperCase()}
        </span>
        <span className="text-tg-hint">
          ({formatProb(
            insight.synth_outcome === "Up"
              ? insight.synth_probability_up
              : 1 - insight.synth_probability_up
          )}{" "}
          confidence)
        </span>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="bg-up/10 border border-up/20 rounded-xl px-3 py-2 text-center text-up text-sm font-medium animate-slide-up">
          Bet placed!
        </div>
      )}

      {/* Bet buttons */}
      <BetButtons
        asset={asset}
        timeframe={timeframe}
        synthProbUp={insight.synth_probability_up}
        polyProbUp={insight.polymarket_probability_up}
        entryPrice={insight.current_price}
        eventSlug={insight.slug}
        onBetPlaced={({ direction, amount }) => {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 2000);
          onBetPlaced({ asset, direction, amount, timeframe });
        }}
      />
    </div>
  );
}
