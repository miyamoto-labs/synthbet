"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Confetti } from "./Confetti";
import { playTick, playUrgentTick, playWin, playLose } from "@/lib/sounds";

export type LiveBet = {
  id: string; // unique key per bet
  asset: string;
  direction: "UP" | "DOWN";
  amount: number;
  timeframe: string;
  entryPrice: number;
  endTime?: string;
};

type LiveBetViewProps = {
  bets: LiveBet[];
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

// Hook: subscribe to Binance live price for an asset
function useLivePrice(asset: string, entryPrice: number) {
  const [currentPrice, setCurrentPrice] = useState(entryPrice);
  const [connected, setConnected] = useState(false);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const historyRef = useRef<number[]>([entryPrice]);

  useEffect(() => {
    const symbol = BINANCE_SYMBOLS[asset];
    if (!symbol) return;

    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol}@miniTicker`
    );

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const price = parseFloat(data.c);
        if (price > 0) {
          setCurrentPrice(price);
          historyRef.current = [...historyRef.current.slice(-59), price];
          setPriceHistory([...historyRef.current]);
        }
      } catch {}
    };

    return () => ws.close();
  }, [asset]);

  return { currentPrice, connected, priceHistory };
}

function useCountdown(endTime?: string) {
  const [remaining, setRemaining] = useState("");
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!endTime) return;

    function update() {
      const end = new Date(endTime!).getTime();
      const diff = end - Date.now();

      if (diff <= 0) {
        const ago = Math.abs(diff);
        const agoMins = Math.floor(ago / 60000);
        setRemaining(agoMins < 1 ? "00:00" : `${agoMins}m ago`);
        setExpired(true);
        return;
      }

      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);

      if (mins >= 60) {
        const hrs = Math.floor(mins / 60);
        const remainMins = mins % 60;
        setRemaining(`${hrs}h ${remainMins}m`);
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

  return { remaining, expired };
}

function Sparkline({
  priceHistory,
  entryPrice,
  isWinning,
}: {
  priceHistory: number[];
  entryPrice: number;
  isWinning: boolean;
}) {
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

  const entryY =
    height - padding - ((entryPrice - min) / range) * (height - padding * 2);

  const lastPoint = points[points.length - 1].split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-20"
      preserveAspectRatio="none"
    >
      <line
        x1={padding} y1={entryY} x2={width - padding} y2={entryY}
        stroke="#6b6b6b" strokeWidth="0.5" strokeDasharray="4,4" opacity="0.5"
      />
      <text x={width - padding} y={entryY - 4} textAnchor="end" fill="#6b6b6b" fontSize="7" fontFamily="monospace">
        entry
      </text>
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={isWinning ? "#00e676" : "#ff3d57"}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      <circle cx={parseFloat(lastPoint[0])} cy={parseFloat(lastPoint[1])} r="3"
        fill={isWinning ? "#00e676" : "#ff3d57"} className="animate-pulse" />
      <circle cx={parseFloat(lastPoint[0])} cy={parseFloat(lastPoint[1])} r="6"
        fill={isWinning ? "#00e676" : "#ff3d57"} opacity="0.3" className="animate-pulse" />
    </svg>
  );
}

function SingleBetView({ bet, telegramId, onStatusChange }: {
  bet: LiveBet;
  telegramId?: number;
  onStatusChange?: (winning: boolean, expired: boolean) => void;
}) {
  const { currentPrice, connected, priceHistory } = useLivePrice(bet.asset, bet.entryPrice);
  const { remaining, expired } = useCountdown(bet.endTime);
  const resolvedRef = useRef(false);
  const prevWinningRef = useRef<boolean | null>(null);
  const [flash, setFlash] = useState<"green" | "red" | null>(null);
  const [showResult, setShowResult] = useState(false);
  const resultShownRef = useRef(false);

  // Trigger resolve+redeem once market expires
  useEffect(() => {
    if (!expired || resolvedRef.current || !telegramId) return;
    resolvedRef.current = true;
    const timer = setTimeout(async () => {
      try { await fetch(`/api/resolve-mine?telegram_id=${telegramId}`); } catch {}
    }, 60_000);
    return () => clearTimeout(timer);
  }, [expired, telegramId]);

  const priceDiff = currentPrice - bet.entryPrice;
  const pricePct = (priceDiff / bet.entryPrice) * 100;
  const isWinning =
    (bet.direction === "UP" && priceDiff > 0) ||
    (bet.direction === "DOWN" && priceDiff < 0);

  // Flash screen + haptic when status flips winning <-> losing
  useEffect(() => {
    if (prevWinningRef.current === null) {
      prevWinningRef.current = isWinning;
      return;
    }
    if (prevWinningRef.current !== isWinning) {
      prevWinningRef.current = isWinning;
      setFlash(isWinning ? "green" : "red");
      setTimeout(() => setFlash(null), 400);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred(isWinning ? "medium" : "light"); } catch {}
    }
  }, [isWinning]);

  // Notify parent of status (for confetti) + show big result
  useEffect(() => {
    onStatusChange?.(isWinning, expired);
    if (expired && !resultShownRef.current) {
      resultShownRef.current = true;
      setShowResult(true);
      setTimeout(() => setShowResult(false), 3000);
    }
  }, [isWinning, expired, onStatusChange]);

  // Countdown sound effects
  useEffect(() => {
    if (!bet.endTime || expired) return;
    const end = new Date(bet.endTime).getTime();
    const secsLeft = Math.floor((end - Date.now()) / 1000);
    if (secsLeft <= 10 && secsLeft > 0) {
      playUrgentTick();
    } else if (secsLeft <= 30 && secsLeft > 10 && secsLeft % 5 === 0) {
      playTick();
    }
  }, [remaining, bet.endTime, expired]);

  const tfLabel = bet.timeframe === "15m" ? "15 Min" : bet.timeframe === "1h" ? "1 Hour" : "Daily";

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
      {/* Screen flash overlay */}
      {flash && (
        <div className={`absolute inset-0 pointer-events-none ${
          flash === "green" ? "bg-up/30 animate-flash-green" : "bg-down/30 animate-flash-red"
        }`} />
      )}

      {/* Big result reveal */}
      {showResult && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className={`text-6xl font-black font-mono animate-result-reveal ${
            isWinning ? "text-up" : "text-down"
          }`}>
            {isWinning ? "WIN" : "LOSS"}
          </div>
        </div>
      )}

      {/* Connection indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-up animate-pulse" : "bg-down"}`} />
        <span className="text-white/30 text-[9px] font-mono">
          {connected ? "LIVE" : "..."}
        </span>
      </div>

      {/* Direction badge */}
      <div className={`px-4 py-1.5 rounded-full text-sm font-bold mb-4 ${
        bet.direction === "UP" ? "bg-up/20 text-up" : "bg-down/20 text-down"
      }`}>
        {bet.asset} {bet.direction} · {tfLabel} · ${bet.amount}
      </div>

      {/* Big price with color flash on change */}
      <div className={`text-5xl font-bold font-mono tracking-tight mb-1 transition-colors duration-300 ${
        priceDiff > 0 ? "text-up" : priceDiff < 0 ? "text-down" : "text-white"
      }`}>
        {formatPrice(currentPrice)}
      </div>

      {/* Price change */}
      <div className={`text-lg font-bold font-mono mb-6 ${
        isWinning ? "text-up" : priceDiff === 0 ? "text-white/40" : "text-down"
      }`}>
        {priceDiff >= 0 ? "+" : ""}{pricePct.toFixed(3)}%
        <span className="text-sm ml-2 opacity-70">
          ({priceDiff >= 0 ? "+" : ""}{formatPrice(Math.abs(priceDiff))})
        </span>
      </div>

      {/* Sparkline */}
      <div className="w-full max-w-xs mb-8">
        <Sparkline priceHistory={priceHistory} entryPrice={bet.entryPrice} isWinning={isWinning} />
      </div>

      {/* Countdown */}
      {(remaining || !bet.endTime) && (
        <div className="text-center mb-6">
          <div className="text-white/40 text-[10px] font-mono uppercase tracking-widest mb-1">
            {expired ? "Waiting for Result" : "Time Remaining"}
          </div>
          <div className={`text-4xl font-bold font-mono tracking-wider ${
            expired ? "text-gold" : remaining.startsWith("00:") ? "text-down animate-pulse" : "text-white"
          }`}>
            {remaining || "--:--"}
          </div>
        </div>
      )}

      {/* Entry vs Current */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
        <div className="bg-white/5 rounded-xl p-3 text-center border border-white/10">
          <div className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1">Entry</div>
          <div className="text-white font-bold font-mono text-sm">{formatPrice(bet.entryPrice)}</div>
        </div>
        <div className={`rounded-xl p-3 text-center border ${
          isWinning ? "bg-up/10 border-up/20" : priceDiff === 0 ? "bg-white/5 border-white/10" : "bg-down/10 border-down/20"
        }`}>
          <div className="text-white/40 text-[9px] font-mono uppercase tracking-wider mb-1">Status</div>
          <div className={`font-bold font-mono text-sm ${
            isWinning ? "text-up" : priceDiff === 0 ? "text-white/60" : "text-down"
          }`}>
            {isWinning ? "WINNING" : priceDiff === 0 ? "EVEN" : "LOSING"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveBetView({ bets, onClose, telegramId }: LiveBetViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiPlayedRef = useRef(false);

  // Swipe handling
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleSwipe = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (Math.abs(diff) < threshold) return;

    if (diff > 0 && activeIndex < bets.length - 1) {
      setActiveIndex((i) => i + 1);
    } else if (diff < 0 && activeIndex > 0) {
      setActiveIndex((i) => i - 1);
    }
  }, [activeIndex, bets.length]);

  // Clamp index if bets array shrinks
  useEffect(() => {
    if (activeIndex >= bets.length) setActiveIndex(Math.max(0, bets.length - 1));
  }, [bets.length, activeIndex]);

  if (bets.length === 0) return null;

  const activeBet = bets[activeIndex];

  return (
    <div
      className="fixed inset-0 bg-ink z-50 flex flex-col animate-scale-in overflow-hidden"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchMove={(e) => { touchEndX.current = e.touches[0].clientX; }}
      onTouchEnd={handleSwipe}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="text-white/60 text-sm font-medium active:text-white transition-colors px-3 py-2 -ml-3 rounded-xl active:bg-white/10"
        >
          &larr; Back
        </button>
        <span className="text-white/30 text-[10px] font-mono">
          {bets.length} bet{bets.length > 1 ? "s" : ""} live
        </span>
      </div>

      {/* Bet switcher tabs */}
      {bets.length > 1 && (
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
          {bets.map((b, i) => {
            const isActive = i === activeIndex;
            const isUp = b.direction === "UP";
            return (
              <button
                key={b.id}
                onClick={() => setActiveIndex(i)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all shrink-0 border ${
                  isActive
                    ? isUp
                      ? "bg-up/20 border-up/40 text-up"
                      : "bg-down/20 border-down/40 text-down"
                    : "bg-white/5 border-white/10 text-white/40"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isActive
                    ? isUp ? "bg-up animate-pulse" : "bg-down animate-pulse"
                    : "bg-white/25"
                }`} />
                {b.asset}
                <span className={`text-[10px] font-mono ${isActive ? "" : "opacity-50"}`}>
                  {isUp ? "\u2191" : "\u2193"} ${b.amount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Active bet */}
      <SingleBetView
        key={activeBet.id}
        bet={activeBet}
        telegramId={telegramId}
        onStatusChange={(winning, isExpired) => {
          // Confetti + sound when winning at expiry
          if (isExpired && winning && !confettiPlayedRef.current) {
            confettiPlayedRef.current = true;
            setShowConfetti(true);
            playWin();
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
            setTimeout(() => setShowConfetti(false), 3500);
          } else if (isExpired && !winning && !confettiPlayedRef.current) {
            confettiPlayedRef.current = true;
            playLose();
            try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error"); } catch {}
          }
        }}
      />

      <Confetti active={showConfetti} />

      {/* Bottom */}
      <div className="px-6 pb-8 space-y-3">
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="w-full py-3 rounded-xl text-sm font-semibold text-white/50 bg-white/5 border border-white/10 active:bg-white/10 transition-colors"
        >
          Minimize
        </button>
        <p className="text-white/30 text-[10px] font-mono text-center">
          Live price from Binance · Final result from Polymarket
        </p>
      </div>
    </div>
  );
}
