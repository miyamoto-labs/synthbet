"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Candle = {
  t: number; // open time (ms)
  o: number;
  h: number;
  l: number;
  c: number;
};

type CandleChartProps = {
  asset: string;
  timeframe: "15m" | "1h" | "daily";
};

// Hyperliquid uses these coin names
const HL_COINS: Record<string, string> = {
  BTC: "BTC",
  ETH: "ETH",
  SOL: "SOL",
};

// Map our timeframes to Hyperliquid kline intervals + candle count
const TF_CONFIG: Record<string, { interval: string; limit: number }> = {
  "15m": { interval: "1m", limit: 30 },
  "1h": { interval: "5m", limit: 24 },
  "daily": { interval: "1h", limit: 24 },
};

const HL_API = "https://api.hyperliquid.xyz/info";
const HL_WS = "wss://api.hyperliquid.xyz/ws";

const W = 320;
const H = 120;
const PAD_T = 4;
const PAD_B = 16;
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
  const [connected, setConnected] = useState(false);
  const candlesRef = useRef<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const coin = HL_COINS[asset];
  const config = TF_CONFIG[timeframe] || TF_CONFIG["15m"];

  // Fetch initial candles via Hyperliquid REST
  useEffect(() => {
    if (!coin) return;

    setLoading(true);

    // Calculate time range based on interval and limit
    const now = Date.now();
    const intervalMs: Record<string, number> = {
      "1m": 60_000, "5m": 300_000, "1h": 3_600_000,
    };
    const ms = intervalMs[config.interval] || 60_000;
    const startTime = now - ms * config.limit;

    fetch(HL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "candleSnapshot",
        req: {
          coin,
          interval: config.interval,
          startTime,
          endTime: now,
        },
      }),
    })
      .then((r) => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const parsed = data.slice(-config.limit).map((k) => ({
          t: k.t,
          o: parseFloat(k.o),
          h: parseFloat(k.h),
          l: parseFloat(k.l),
          c: parseFloat(k.c),
        }));
        candlesRef.current = parsed;
        setCandles([...parsed]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [coin, config.interval, config.limit]);

  // WebSocket for live candle updates
  const handleWsMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.channel !== "candle") return;
        const d = msg.data;
        if (!d || d.s !== coin) return;

        const incoming: Candle = {
          t: d.t,
          o: parseFloat(d.o),
          h: parseFloat(d.h),
          l: parseFloat(d.l),
          c: parseFloat(d.c),
        };

        const arr = candlesRef.current;
        if (arr.length === 0) return;

        const lastIdx = arr.length - 1;

        if (arr[lastIdx].t === incoming.t) {
          // Update current candle in-place
          arr[lastIdx] = incoming;
        } else if (incoming.t > arr[lastIdx].t) {
          // New candle
          arr.push(incoming);
          if (arr.length > config.limit) arr.shift();
        }

        candlesRef.current = arr;
        setCandles([...arr]);
      } catch {}
    },
    [coin, config.limit]
  );

  useEffect(() => {
    if (!coin) return;

    const ws = new WebSocket(HL_WS);

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        method: "subscribe",
        subscription: {
          type: "candle",
          coin,
          interval: config.interval,
        },
      }));
    };

    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = handleWsMessage;
    wsRef.current = ws;

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [coin, config.interval, handleWsMessage]);

  // Crosshair/tooltip state
  const [tooltip, setTooltip] = useState<{ x: number; candle: Candle } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function handleTouch(clientX: number) {
    if (!candles || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const idx = Math.round(relX * (candles.length - 1));
    const clamped = Math.max(0, Math.min(candles.length - 1, idx));
    const candleW = W / candles.length;
    setTooltip({ x: clamped * candleW + candleW / 2, candle: candles[clamped] });
  }

  if (loading) {
    return (
      <div className="h-[120px] bg-ink/3 rounded-xl flex items-center justify-center animate-shimmer">
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

  const candleW = W / candles.length;
  const bodyW = Math.max(candleW * 0.55, 2);

  const toX = (i: number) => i * candleW + candleW / 2;
  const toY = (p: number) => PAD_T + (1 - (p - minPrice) / priceRange) * PLOT_H;

  const last = candles[candles.length - 1];
  const first = candles[0];
  const totalChange = ((last.c - first.o) / first.o) * 100;
  const isUp = totalChange >= 0;

  const gridPrices = [minPrice, minPrice + priceRange / 2, maxPrice];
  const firstTime = formatTime(candles[0].t);
  const lastTime = formatTime(last.t);

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted font-semibold">{asset} Price</span>
          {connected && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-up animate-pulse" />
              <span className="text-[8px] text-up-dark font-mono font-bold">LIVE</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {tooltip ? (
            <>
              <span className="text-[10px] font-mono text-muted">
                {formatTime(tooltip.candle.t)}
              </span>
              <span className="text-[10px] font-mono font-bold text-ink">
                {formatPrice(tooltip.candle.c)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] font-mono font-bold text-ink">
                {formatPrice(last.c)}
              </span>
              <span className={`text-[9px] font-mono font-bold ${isUp ? "text-up-dark" : "text-down"}`}>
                {isUp ? "+" : ""}{totalChange.toFixed(2)}%
              </span>
            </>
          )}
        </div>
      </div>

      {/* Chart */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        preserveAspectRatio="xMidYMid meet"
        onTouchStart={(e) => handleTouch(e.touches[0].clientX)}
        onTouchMove={(e) => { e.preventDefault(); handleTouch(e.touches[0].clientX); }}
        onTouchEnd={() => setTooltip(null)}
        onMouseMove={(e) => handleTouch(e.clientX)}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines + price labels */}
        {gridPrices.map((p, i) => (
          <g key={i}>
            <line
              x1={0} y1={toY(p)} x2={W} y2={toY(p)}
              stroke="currentColor" strokeOpacity={0.06} strokeWidth={0.5}
            />
            <text
              x={W - 2} y={toY(p) - 2}
              textAnchor="end" fill="#6b6b6b" fontSize={6.5} fontFamily="monospace" opacity={0.5}
            >
              {formatPrice(p)}
            </text>
          </g>
        ))}

        {/* Candles */}
        {candles.map((c, i) => {
          const x = toX(i);
          const bullish = c.c >= c.o;
          const color = bullish ? "#00c853" : "#ff3d57";
          const bodyTop = toY(Math.max(c.o, c.c));
          const bodyBot = toY(Math.min(c.o, c.c));
          const bodyH = Math.max(bodyBot - bodyTop, 0.5);
          const isLast = i === candles.length - 1;

          return (
            <g key={i} style={isLast ? { filter: `drop-shadow(0 0 3px ${color}40)` } : undefined}>
              {/* Wick */}
              <line
                x1={x} y1={toY(c.h)} x2={x} y2={toY(c.l)}
                stroke={color} strokeWidth={0.8} strokeOpacity={isLast ? 0.9 : 0.5}
              />
              {/* Body */}
              <rect
                x={x - bodyW / 2} y={bodyTop}
                width={bodyW} height={bodyH}
                fill={color} rx={0.5}
                opacity={isLast ? 1 : 0.85}
              >
                {isLast && (
                  <animate
                    attributeName="opacity"
                    values="1;0.7;1" dur="1.5s" repeatCount="indefinite"
                  />
                )}
              </rect>
            </g>
          );
        })}

        {/* Current price dashed line + label */}
        <line
          x1={0} y1={toY(last.c)} x2={W} y2={toY(last.c)}
          stroke={isUp ? "#00c853" : "#ff3d57"}
          strokeWidth={0.5} strokeDasharray="3,2" strokeOpacity={0.6}
        />
        <rect
          x={W - 42} y={toY(last.c) - 6}
          width={42} height={12} rx={2}
          fill={isUp ? "#00c853" : "#ff3d57"} opacity={0.9}
        />
        <text
          x={W - 21} y={toY(last.c) + 3}
          textAnchor="middle" fill="white" fontSize={7} fontFamily="monospace" fontWeight="bold"
        >
          {formatPrice(last.c)}
        </text>

        {/* Crosshair on touch */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x} y1={PAD_T} x2={tooltip.x} y2={H - PAD_B}
              stroke="#6b6b6b" strokeWidth={0.5} strokeDasharray="2,2" opacity={0.5}
            />
            <circle
              cx={tooltip.x} cy={toY(tooltip.candle.c)} r={3}
              fill={tooltip.candle.c >= tooltip.candle.o ? "#00c853" : "#ff3d57"}
              stroke="white" strokeWidth={1}
            />
            {/* OHLC tooltip box */}
            <rect
              x={Math.min(tooltip.x + 6, W - 70)} y={PAD_T}
              width={66} height={36} rx={3}
              fill="#111" opacity={0.85}
            />
            <text
              x={Math.min(tooltip.x + 10, W - 66)} y={PAD_T + 10}
              fill="#999" fontSize={6} fontFamily="monospace"
            >
              O {formatPrice(tooltip.candle.o)} H {formatPrice(tooltip.candle.h)}
            </text>
            <text
              x={Math.min(tooltip.x + 10, W - 66)} y={PAD_T + 20}
              fill="#999" fontSize={6} fontFamily="monospace"
            >
              L {formatPrice(tooltip.candle.l)} C {formatPrice(tooltip.candle.c)}
            </text>
            <text
              x={Math.min(tooltip.x + 10, W - 66)} y={PAD_T + 30}
              fill="#ccc" fontSize={6.5} fontFamily="monospace" fontWeight="bold"
            >
              {formatTime(tooltip.candle.t)}
            </text>
          </>
        )}

        {/* Time labels */}
        <text
          x={2} y={H - 2}
          textAnchor="start" className="fill-muted" fontSize={7.5} fontFamily="monospace"
        >
          {firstTime}
        </text>
        <text
          x={W - 2} y={H - 2}
          textAnchor="end" className="fill-muted" fontSize={7.5} fontFamily="monospace"
        >
          {lastTime}
        </text>
      </svg>
    </div>
  );
}
