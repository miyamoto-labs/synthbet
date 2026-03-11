"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { playBetPlaced, playChipToss, warmUpAudio } from "@/lib/sounds";
import {
  showConfirm,
  haptic,
  setHeaderColor,
  setBackgroundColor,
  setBottomBarColor,
  showBackButton,
} from "@/lib/telegram";

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

const TIMEFRAME_TABS = ["1H", "6H", "1D", "1W", "All"] as const;
const TIMEFRAME_CONFIG: Record<string, { interval: string; fidelity: number }> = {
  "1H": { interval: "1h", fidelity: 1 },
  "6H": { interval: "6h", fidelity: 5 },
  "1D": { interval: "1d", fidelity: 60 },
  "1W": { interval: "1w", fidelity: 60 },
  All: { interval: "max", fidelity: 600 },
};

// ── Helpers ──

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function formatChartTime(ts: number, timeframe: string): string {
  const d = new Date(ts * 1000);
  if (timeframe === "1H" || timeframe === "6H") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
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
      onClick={(e) => {
        e.stopPropagation();
        share();
      }}
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

// ── Price History Chart ──

function PriceHistoryChart({
  data,
  timeframe,
}: {
  data: { t: number; p: number }[];
  timeframe: string;
}) {
  if (data.length < 2) return null;

  const startT = data[0].t;
  const rangeT = data[data.length - 1].t - startT || 1;
  const prices = data.map((d) => d.p);
  const minP = Math.max(0, Math.min(...prices) - 0.05);
  const maxP = Math.min(1, Math.max(...prices) + 0.05);
  const rangeP = maxP - minP || 0.1;

  const toX = (t: number) => 32 + ((t - startT) / rangeT) * 280;
  const toY = (p: number) => 8 + (1 - (p - minP) / rangeP) * 132;

  const points = data.map((d) => ({ x: toX(d.t), y: toY(d.p) }));
  const line = points
    .map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1].x.toFixed(1)},140.0 L${points[0].x.toFixed(1)},140.0 Z`;

  const gridLines = [minP, minP + rangeP / 2, maxP];
  const last = data[data.length - 1];

  return (
    <svg
      viewBox={`0 0 320 160`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {gridLines.map((p) => (
        <line
          key={p}
          x1={32}
          y1={toY(p)}
          x2={312}
          y2={toY(p)}
          stroke="currentColor"
          strokeOpacity={0.06}
          strokeWidth={0.5}
        />
      ))}
      {gridLines.map((p) => (
        <text
          key={`y-${p}`}
          x={28}
          y={toY(p) + 3}
          textAnchor="end"
          className="fill-muted"
          fontSize={8}
          fontFamily="monospace"
        >
          {(p * 100).toFixed(0)}%
        </text>
      ))}
      <text
        x={toX(data[0].t)}
        y={158}
        textAnchor="start"
        className="fill-muted"
        fontSize={8}
        fontFamily="monospace"
      >
        {formatChartTime(data[0].t, timeframe)}
      </text>
      <text
        x={toX(last.t)}
        y={158}
        textAnchor="end"
        className="fill-muted"
        fontSize={8}
        fontFamily="monospace"
      >
        {formatChartTime(last.t, timeframe)}
      </text>
      <path d={area} fill="#C8843A" fillOpacity={0.08} />
      <path
        d={line}
        fill="none"
        stroke="#C8843A"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={toX(last.t)}
        cy={toY(last.p)}
        r={3}
        fill="#C8843A"
        stroke="white"
        strokeWidth={1}
      />
    </svg>
  );
}

// ── Order Book ──

type OrderBookData = {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
};

function OrderBook({ book }: { book: OrderBookData }) {
  const bids = book.bids.slice(0, 8);
  const asks = book.asks.slice(0, 8);

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="text-center text-white/30 text-xs py-4">
        Order book unavailable
      </div>
    );
  }

  const maxSize = Math.max(
    ...bids.map((b) => parseFloat(b.size)),
    ...asks.map((a) => parseFloat(a.size)),
    1
  );
  const bestBid = bids[0] ? parseFloat(bids[0].price) : 0;
  const bestAsk = asks[0] ? parseFloat(asks[0].price) : 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white">Order Book</span>
        {spread > 0 && (
          <span className="text-[10px] text-white/40 font-mono">
            Spread: {(spread * 100).toFixed(1)}c | Mid:{" "}
            {(((bestBid + bestAsk) / 2) * 100).toFixed(1)}c
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        <span className="text-[9px] text-white/30 font-mono">ASKS</span>
        {[...asks].reverse().map((a, i) => {
          const size = parseFloat(a.size);
          const pct = (size / maxSize) * 100;
          return (
            <div key={`a-${i}`} className="relative h-6 flex items-center">
              <div
                className="absolute right-0 top-0 h-full bg-down/15 rounded-sm"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-10 text-[10px] font-mono text-down ml-1">
                {(parseFloat(a.price) * 100).toFixed(1)}c
              </span>
              <span className="relative z-10 text-[10px] font-mono text-white/50 ml-auto mr-1">
                {size >= 1000 ? `${(size / 1000).toFixed(1)}K` : size.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-0.5">
        <span className="text-[9px] text-white/30 font-mono">BIDS</span>
        {bids.map((b, i) => {
          const size = parseFloat(b.size);
          const pct = (size / maxSize) * 100;
          return (
            <div key={`b-${i}`} className="relative h-6 flex items-center">
              <div
                className="absolute left-0 top-0 h-full bg-up/15 rounded-sm"
                style={{ width: `${pct}%` }}
              />
              <span className="relative z-10 text-[10px] font-mono text-up-dark ml-1">
                {(parseFloat(b.price) * 100).toFixed(1)}c
              </span>
              <span className="relative z-10 text-[10px] font-mono text-white/50 ml-auto mr-1">
                {size >= 1000 ? `${(size / 1000).toFixed(1)}K` : size.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Expanded Market Detail View ──

function ExpandedMarketView({
  market,
  walletAddress,
  balance,
  onClose,
  onBetPlaced,
}: {
  market: FeaturedMarket;
  walletAddress: string | null;
  balance: number | null;
  onClose: () => void;
  onBetPlaced: Props["onBetPlaced"];
}) {
  const [chartData, setChartData] = useState<{ t: number; p: number }[] | null>(null);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("6H");
  const [orderBook, setOrderBook] = useState<OrderBookData | null>(null);
  const [bookLoading, setBookLoading] = useState(true);
  const [side, setSide] = useState<"UP" | "DOWN" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const countdown = useCountdown(market.endDate);

  const noWallet = !walletAddress;
  const noBalance = balance !== null && balance < 1;
  const yesPercent = Math.round(market.yesPrice * 100);
  const noPercent = Math.round(market.noPrice * 100);

  // Set Telegram theme colors for full-screen overlay
  useEffect(() => {
    setHeaderColor("#1C1611");
    setBackgroundColor("#1C1611");
    setBottomBarColor("#1C1611");
    const cleanup = showBackButton(onClose);
    return () => {
      cleanup();
      setHeaderColor("#1C1611");
      setBackgroundColor("#1C1611");
      setBottomBarColor("#2C1F14");
    };
  }, [onClose]);

  const fetchChart = useCallback(
    async (tf: string) => {
      setChartLoading(true);
      try {
        const { interval, fidelity } = TIMEFRAME_CONFIG[tf];
        const res = await fetch(
          `/api/synth/price-history?slug=${encodeURIComponent(market.slug)}&interval=${interval}&fidelity=${fidelity}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setChartData(data.history);
        } else {
          setChartData(null);
        }
      } catch {
        setChartData(null);
      } finally {
        setChartLoading(false);
      }
    },
    [market.slug]
  );

  const fetchOrderBook = useCallback(async () => {
    if (!market.clobTokenIds?.[0]) {
      setBookLoading(false);
      return;
    }
    setBookLoading(true);
    try {
      const res = await fetch(
        `/api/polymarket/order-book?token_id=${market.clobTokenIds[0]}`
      );
      const data = await res.json();
      setOrderBook(data);
    } catch {
      setOrderBook(null);
    } finally {
      setBookLoading(false);
    }
  }, [market.clobTokenIds]);

  useEffect(() => {
    fetchChart(timeframe);
    fetchOrderBook();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchChart(timeframe);
  }, [timeframe, fetchChart]);

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

  return (
    <div className="fixed inset-0 bg-bg z-50 flex flex-col animate-scale-in">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 border-b border-amber/10">
        <button
          onClick={() => {
            haptic("light");
            onClose();
          }}
          className="text-white/60 text-sm font-medium active:text-amber"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-[10px] text-white/30 font-mono uppercase">
          {market.category}
        </span>
        <div className="w-5" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-44">
        {/* Question + image */}
        <div className="px-4 pt-4 pb-3 space-y-3">
          <div className="flex gap-3">
            {market.image && (
              <img
                src={market.image}
                alt=""
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white leading-snug">
                {market.question}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {countdown.text && (
                  <span
                    className={`text-[10px] font-mono font-bold ${
                      countdown.urgent ? "text-down" : "text-amber-light"
                    }`}
                  >
                    {countdown.urgent && countdown.text !== "Ended"
                      ? "Ends "
                      : ""}
                    {countdown.text}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Yes / No price cards */}
        <div className="px-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl p-3 bg-up/8 border border-up/15 text-center">
            <div className="text-[10px] text-white/50 mb-1">
              Buy {market.yesLabel}
            </div>
            <div className="text-2xl font-bold font-mono text-up-dark">
              {yesPercent}c
            </div>
          </div>
          <div className="rounded-xl p-3 bg-down/8 border border-down/15 text-center">
            <div className="text-[10px] text-white/50 mb-1">
              Buy {market.noLabel}
            </div>
            <div className="text-2xl font-bold font-mono text-down">
              {noPercent}c
            </div>
          </div>
        </div>

        {/* Volume / Liquidity / Bid-Ask stats */}
        <div className="px-4 mt-3 grid grid-cols-3 gap-2">
          <div className="bg-card rounded-xl px-3 py-2 text-center border border-amber/10">
            <div className="text-[9px] text-white/40 mb-0.5">Volume</div>
            <div className="text-xs font-bold font-mono text-white">
              {formatVolume(market.volume)}
            </div>
          </div>
          <div className="bg-card rounded-xl px-3 py-2 text-center border border-amber/10">
            <div className="text-[9px] text-white/40 mb-0.5">Liquidity</div>
            <div className="text-xs font-bold font-mono text-white">
              {formatVolume(market.liquidity)}
            </div>
          </div>
          <div className="bg-card rounded-xl px-3 py-2 text-center border border-amber/10">
            <div className="text-[9px] text-white/40 mb-0.5">Bid / Ask</div>
            <div className="text-xs font-bold font-mono text-white">
              {yesPercent}c / {Math.min(yesPercent + 1, 99)}c
            </div>
          </div>
        </div>

        {/* Price History */}
        <div className="px-4 mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">Price History</span>
            <span className="text-[10px] text-white/40 font-mono">
              {market.yesLabel} prob.
            </span>
          </div>
          <div className="flex gap-1 mb-3">
            {TIMEFRAME_TABS.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                  timeframe === tf
                    ? "bg-amber text-charcoal"
                    : "bg-card text-white/50 border border-amber/10"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <div className="bg-card rounded-xl p-2 border border-amber/10">
            {chartLoading ? (
              <div className="h-[140px] flex items-center justify-center animate-shimmer rounded-lg">
                <span className="text-[10px] text-muted font-mono">
                  Loading chart...
                </span>
              </div>
            ) : chartData && chartData.length >= 2 ? (
              <PriceHistoryChart data={chartData} timeframe={timeframe} />
            ) : (
              <div className="h-[140px] flex items-center justify-center">
                <span className="text-[10px] text-white/30 font-mono">
                  No chart data available
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Order Book */}
        <div className="px-4 mt-5">
          <div className="bg-card rounded-xl p-3 border border-amber/10">
            {bookLoading ? (
              <div className="h-[120px] flex items-center justify-center animate-shimmer rounded-lg">
                <span className="text-[10px] text-muted font-mono">
                  Loading order book...
                </span>
              </div>
            ) : orderBook ? (
              <OrderBook book={orderBook} />
            ) : (
              <div className="text-center text-white/30 text-xs py-4">
                Order book unavailable
              </div>
            )}
          </div>
        </div>

        {/* Market Info / Description */}
        {market.description && (
          <div className="px-4 mt-5">
            <h3 className="text-xs font-bold text-white mb-1">Market Info</h3>
            <p className="text-xs text-white/40 leading-relaxed">
              {market.description}
            </p>
          </div>
        )}
      </div>

      {/* Bottom bet bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg/95 backdrop-blur-md border-t border-amber/10 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-2">
        {done ? (
          <div className="text-center py-2 text-up-dark text-sm font-bold animate-fade-up">
            Bet placed!
          </div>
        ) : (
          <>
            {/* Side selection */}
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
                className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                  side === "UP"
                    ? "bg-up text-charcoal scale-[1.02] shadow-lg shadow-up/30 ring-2 ring-up/40"
                    : "bg-up text-charcoal shadow-sm"
                } ${noWallet ? "opacity-50" : ""}`}
              >
                Buy {market.yesLabel} {yesPercent}c
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
                className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
                  side === "DOWN"
                    ? "bg-down text-white scale-[1.02] shadow-lg shadow-down/30 ring-2 ring-down/40"
                    : "bg-down/90 text-white shadow-sm"
                } ${noWallet ? "opacity-50" : ""}`}
              >
                Buy {market.noLabel} {noPercent}c
              </button>
            </div>

            {/* Amount grid */}
            {side && (
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
          </>
        )}
      </div>
    </div>
  );
}

// ── Market Card ──

function MarketBetCard({
  market,
  walletAddress,
  balance,
  onBetPlaced,
  isHot,
  onExpand,
}: {
  market: FeaturedMarket;
  walletAddress: string | null;
  balance: number | null;
  onBetPlaced: Props["onBetPlaced"];
  isHot: boolean;
  onExpand: () => void;
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
    <div
      className="bg-card rounded-2xl p-4 border border-amber/10 space-y-3 cursor-pointer active:scale-[0.98] transition-transform"
      onClick={() => {
        if (!side && !done) {
          haptic("light");
          onExpand();
        }
      }}
    >
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
            onClick={(e) => {
              e.stopPropagation();
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
            onClick={(e) => {
              e.stopPropagation();
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
        <div className="space-y-2 animate-fade-up" onClick={(e) => e.stopPropagation()}>
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
  const [expandedMarket, setExpandedMarket] = useState<FeaturedMarket | null>(null);

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
    <>
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
              onExpand={() => setExpandedMarket(m)}
            />
          ))
        )}
      </div>

      {/* Expanded market detail overlay */}
      {expandedMarket && (
        <ExpandedMarketView
          market={expandedMarket}
          walletAddress={walletAddress}
          balance={balance}
          onClose={() => setExpandedMarket(null)}
          onBetPlaced={onBetPlaced}
        />
      )}
    </>
  );
}
