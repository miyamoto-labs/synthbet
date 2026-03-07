"use client";

import { useEffect, useState } from "react";

type Candle = {
  t: number;    // open time (ms)
  o: number;    // open
  h: number;    // high
  l: number;    // low
  c: number;    // close
};

type CandleChartProps = {
  asset: string;
  timeframe: "15m" | "1h" | "daily";
};

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
};

// Map our timeframes to Binance kline intervals + candle count
const TF_CONFIG: Record<string, { interval: string; limit: number }> = {
  "15m": { interval: "1m", limit: 30 },    // 30 x 1min candles
  "1h":  { interval: "5m", limit: 24 },    // 24 x 5min candles = 2 hours
  "daily": { interval: "1h", limit: 24 },  // 24 x 1h candles = 24 hours
};

const W = 320;
const H = 100;
const PAD_L = 0;
const PAD_R = 0;
const PAD_T = 4;
const PAD_B = 16;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

function formatPrice(p: number): string {
  if (p >= 1000) return `$${p.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (p >= 1) return `$${p.toFixed(2)}`;
  return `$${p.toFixed(4)}`;
}

function formatTime(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function CandleChart({ asset, timeframe }: CandleChartProps) {
  const [candles, setCandles] = useState<Candle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const symbol = BINANCE_SYMBOLS[asset];
    if (!symbol) return;

    const config = TF_CONFIG[timeframe] || TF_CONFIG["15m"];

    setLoading(true);
    fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${config.interval}&limit=${config.limit}`
    )
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setCandles(
          data.map((k) => ({
            t: k[0],
            o: parseFloat(k[1]),
            h: parseFloat(k[2]),
            l: parseFloat(k[3]),
            c: parseFloat(k[4]),
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [asset, timeframe]);

  if (loading) {
    return (
      <div className="h-[100px] bg-ink/3 rounded-xl flex items-center justify-center">
        <span className="text-[10px] text-muted font-mono">Loading chart...</span>
      </div>
    );
  }

  if (!candles || candles.length < 2) return null;

  const allLows = candles.map((c) => c.l);
  const allHighs = candles.map((c) => c.h);
  const minPrice = Math.min(...allLows);
  const maxPrice = Math.max(...allHighs);
  const priceRange = maxPrice - minPrice || 1;

  const candleW = PLOT_W / candles.length;
  const bodyW = Math.max(candleW * 0.6, 2);

  const toX = (i: number) => PAD_L + i * candleW + candleW / 2;
  const toY = (p: number) => PAD_T + (1 - (p - minPrice) / priceRange) * PLOT_H;

  // Last candle for summary
  const last = candles[candles.length - 1];
  const first = candles[0];
  const totalChange = ((last.c - first.o) / first.o) * 100;
  const isUp = totalChange >= 0;

  // Time labels
  const firstTime = formatTime(candles[0].t);
  const lastTime = formatTime(candles[candles.length - 1].t);

  // Price grid — 3 lines
  const gridPrices = [
    minPrice,
    minPrice + priceRange / 2,
    maxPrice,
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted font-semibold">
          {asset} Price
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-ink">
            {formatPrice(last.c)}
          </span>
          <span
            className={`text-[9px] font-mono font-bold ${
              isUp ? "text-up-dark" : "text-down"
            }`}
          >
            {isUp ? "+" : ""}
            {totalChange.toFixed(2)}%
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {gridPrices.map((p, i) => (
          <line
            key={i}
            x1={PAD_L}
            y1={toY(p)}
            x2={W - PAD_R}
            y2={toY(p)}
            stroke="currentColor"
            strokeOpacity={0.05}
            strokeWidth={0.5}
          />
        ))}

        {/* Candles */}
        {candles.map((c, i) => {
          const x = toX(i);
          const bullish = c.c >= c.o;
          const color = bullish ? "#00c853" : "#ff3d57";
          const bodyTop = toY(Math.max(c.o, c.c));
          const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 0.5);

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                y1={toY(c.h)}
                x2={x}
                y2={toY(c.l)}
                stroke={color}
                strokeWidth={0.8}
                strokeOpacity={0.6}
              />
              {/* Body */}
              <rect
                x={x - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
                fill={bullish ? color : color}
                rx={0.5}
                opacity={0.9}
              />
            </g>
          );
        })}

        {/* Time labels */}
        <text
          x={PAD_L + 2}
          y={H - 2}
          textAnchor="start"
          className="fill-muted"
          fontSize={8}
          fontFamily="monospace"
        >
          {firstTime}
        </text>
        <text
          x={W - PAD_R - 2}
          y={H - 2}
          textAnchor="end"
          className="fill-muted"
          fontSize={8}
          fontFamily="monospace"
        >
          {lastTime}
        </text>
      </svg>
    </div>
  );
}
