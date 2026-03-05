export type SynthInsight = {
  slug: string;
  start_price: number;
  current_price: number;
  current_time: string;
  synth_probability_up: number;
  polymarket_probability_up: number;
  synth_outcome: "Up" | "Down";
  current_outcome: "Up" | "Down";
  polymarket_outcome: "Up" | "Down";
  event_end_time: string;
  event_start_time: string;
  event_outcome_prices: [string, string];
  event_last_trade_price: number;
  polymarket_last_trade_price: number;
  polymarket_last_trade_time: string;
  best_bid_price: number;
  best_ask_price: number;
};

export type MarketData = {
  asset: string;
  "15min": SynthInsight | null;
  hourly: SynthInsight | null;
  daily: SynthInsight | null;
};

export function computeEdge(synthProb: number, polyProb: number): number {
  return Math.round((synthProb - polyProb) * 1000) / 10; // percentage points
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatProb(prob: number): string {
  return `${(prob * 100).toFixed(1)}%`;
}
