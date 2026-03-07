"use client";

import { useEffect, useState, useRef } from "react";

type LiveBetViewProps = {
  asset: string;
  direction: "UP" | "DOWN";
  amount: number;
  timeframe: string;
  entryPrice: number;
  endTime?: string;
  onClose: () => void;
  telegramId?: number;
};

const BINANCE_SYMBOLS: Record<string, string> = {
  BTC: "btcusdt",
  ETH: "ethusdt",
  SOL: "solusdt",
};

function formatPrice(price: number): string {
  return price >= 1000
    ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`;
}

export function LiveBetView({
  asset,
  direction,
  amount,
  timeframe,
  entryPrice,
  endTime,
  onClose,
  telegramId,
}: LiveBetViewProps) {
  const [currentPrice, setCurrentPrice] = useState(entryPrice);
  const [connected, setConnected] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const historyRef = useRef<number[]>([entryPrice]);

  // Connect to Binance WebSocket for live price
  useEffect(() => {
    const symbol = BINANCE_SYMBOLS[asset];
    if (!symbol) return;

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`
    );
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c); // 'c' = close price
        if (price > 0) {
          setCurrentPrice(price);
          historyRef.current = [...historyRef.current.slice(-59), price];
          setPriceHistory([...historyRef.current]);
        }
      } catch {}
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [asset]);

  // Calculate P&L
  const priceDiff = currentPrice - entryPrice;
  const pricePct = (priceDiff / entryPrice) * 100;
  const isWinning =
    (direction === "UP" && priceDiff > 0) ||
    (direction === "DOWN" && priceDiff < 0);
  // Rough P&L estimate: if price moves in your direction, you win proportionally
  const estimatedPnl = isWinning ? amount : -amount;

  // Countdown
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);

  const resolvedRef = useRef(false);

  // Trigger resolve+redeem once market expires (60s delay for settlement)
  useEffect(() => {
    if (!expired || resolvedRef.current || !telegramId) return;
    resolvedRef.current = true;

    const timer = setTimeout(async () => {
      try {
        await fetch(`/api/resolve-mine?telegram_id=${telegramId}`);
      } catch {}
    }, 60_000);
    return () => clearTimeout(timer);
  }, [expired, telegramId]);

  useEffect(() => {
    if (!endTime) return;

    function update() {
      const end = new Date(endTime!).getTime();
      const diff = end - Date.now();

      if (diff <= 0) {
        const ago = Math.abs(diff);
        const agoMins = Math.floor(ago / 60000);
        if (agoMins < 1) {
          setRemaining("00:00");
        } else {
          setRemaining(`${agoMins}m ago`);
        }
        setExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setRemaining(`${hrs}h ${remainMins}m ${secs}s`);
      } else {
        setRemaining(
          `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
        );
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  // Mini sparkline from price history
  function Sparkline() {
    if (priceHistory.length < 2) return null;

    const width = 280;
    const height = 80;
    const padding = 4;
    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;

    const points = priceHistory.map((p, i) => {
      const x = padding + (i / (priceHistory.length - 1)) * (width - padding * 2);
      const y = height - padding - ((p - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    });

    // Entry price line
    const entryY =
      height - padding - ((entryPrice - min) / range) * (height - padding * 2);

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-20"
        preserveAspectRatio="none"
      >
        {/* Entry price dashed line */}
        <line
          x1={padding}
          y1={entryY}
          x2={width - padding}
          y2={entryY}
          stroke="#6b6b6b"
          strokeWidth="0.5"
          strokeDasharray="4,4"
          opacity="0.5"
        />
        <text
          x={width - padding}
          y={entryY - 4}
          textAnchor="end"
          fill="#6b6b6b"
          fontSize="7"
          fontFamily="monospace"
        >
          entry
        </text>

        {/* Price line */}
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke={isWinning ? "#00e676" : "#ff3d57"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Glow effect on latest point */}
        {priceHistory.length > 0 && (
          <>
            <circle
              cx={parseFloat(points[points.length - 1].split(",")[0])}
              cy={parseFloat(points[points.length - 1].split(",")[1])}
              r="3"
              fill={isWinning ? "#00e676" : "#ff3d57"}
              className="animate-pulse"
            />
            <circle
              cx={parseFloat(points[points.length - 1].split(",")[0])}
              cy={parseFloat(points[points.length - 1].split(",")[1])}
              r="6"
              fill={isWinning ? "#00e676" : "#ff3d57"}
              opacity="0.3"
              className="animate-pulse"
            />
          </>
        )}
      </svg>
    );
  }

  const tfLabel =
    timeframe === "15m"
      ? "15 Min"
      : timeframe === "1h"
        ? "1 Hour"
        : "Daily";

  return (
    <div className="fixed inset-0 bg-ink z-50 flex flex-col animate-scale-in overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-2">
        <button
          onClick={onClose}
          className="text-white/60 text-sm font-medium hover:text-white transition-colors"
        >
          Close
        </button>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${connected ? "bg-up animate-pulse" : "bg-down"}`}
          />
          <span className="text-white/40 text-[10px] font-mono">
            {connected ? "LIVE" : "CONNECTING..."}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-10">
        {/* Direction badge */}
        <div
          className={`px-4 py-1.5 rounded-full text-sm font-bold mb-4 ${
            direction === "UP"
              ? "bg-up/20 text-up"
              : "bg-down/20 text-down"
          }`}
        >
          {asset} {direction} · {tfLabel} · ${amount}
        </div>

        {/* Big price */}
        <div className="text-5xl font-bold font-mono text-white tracking-tight mb-1">
          {formatPrice(currentPrice)}
        </div>

        {/* Price change */}
        <div
          className={`text-lg font-bold font-mono mb-6 ${
            isWinning ? "text-up" : priceDiff === 0 ? "text-white/40" : "text-down"
          }`}
        >
          {priceDiff >= 0 ? "+" : ""}
          {pricePct.toFixed(3)}%
          <span className="text-sm ml-2">
            ({priceDiff >= 0 ? "+" : ""}
            {formatPrice(Math.abs(priceDiff))})
          </span>
        </div>

        {/* Sparkline */}
        <div className="w-full max-w-xs mb-8">
          <Sparkline />
        </div>

        {/* Countdown */}
        {(remaining || !endTime) && (
          <div className="text-center mb-6">
            <div className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">
              {expired ? "Waiting for Result" : "Time Remaining"}
            </div>
            <div
              className={`text-4xl font-bold font-mono tracking-wider ${
                expired
                  ? "text-gold"
                  : remaining.startsWith("00:")
                    ? "text-down animate-pulse"
                    : "text-white"
              }`}
            >
              {remaining || "--:--"}
            </div>
          </div>
        )}

        {/* Entry vs Current */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
          <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
            <div className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1">
              Entry
            </div>
            <div className="text-white font-bold font-mono text-sm">
              {formatPrice(entryPrice)}
            </div>
          </div>
          <div
            className={`rounded-xl p-3 text-center border ${
              isWinning
                ? "bg-up/10 border-up/20"
                : priceDiff === 0
                  ? "bg-white/5 border-white/10"
                  : "bg-down/10 border-down/20"
            }`}
          >
            <div className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1">
              Status
            </div>
            <div
              className={`font-bold font-mono text-sm ${
                isWinning ? "text-up" : priceDiff === 0 ? "text-white/60" : "text-down"
              }`}
            >
              {isWinning ? "WINNING" : priceDiff === 0 ? "EVEN" : "LOSING"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom note */}
      <div className="px-6 pb-8 text-center">
        <p className="text-white/30 text-[10px] font-mono">
          Live price from Binance · Final result from Polymarket
        </p>
      </div>
    </div>
  );
}
