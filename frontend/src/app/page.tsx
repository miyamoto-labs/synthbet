"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MarketData } from "@/lib/synth";
import { MarketCard } from "@/components/MarketCard";
import { Portfolio } from "@/components/Portfolio";
import { Leaderboard } from "@/components/Leaderboard";
import { playBetPlaced, playWin, playLose } from "@/lib/sounds";
import { Confetti } from "@/components/Confetti";
import { Onboarding } from "@/components/Onboarding";
import { FeaturedMarkets, CategoryPills, useFeaturedMarkets } from "@/components/FeaturedMarkets";
import { Feed } from "@/components/Feed";
import { LiveBetView, LiveBet } from "@/components/LiveBetView";
import {
  getTelegramWebApp,
  haptic,
  setHeaderColor,
  setBackgroundColor,
  setBottomBarColor,
  disableVerticalSwipes,
  showConfirm,
} from "@/lib/telegram";

type Tab = "markets" | "feed" | "portfolio" | "leaderboard";

const MARKET_POLL_MS = 60_000; // 60s — matches server cache for 15-min markets

type DeepLink = {
  asset: string | null;
  tf: string | null;
  edge: number | null;
  dir: string | null;
  synthPct: number | null;
  polyPct: number | null;
  slug: string | null;
  entryPrice: number | null;
  ts: number | null;
};

function getDeepLinkParams(): DeepLink {
  if (typeof window === "undefined") return { asset: null, tf: null, edge: null, dir: null, synthPct: null, polyPct: null, slug: null, entryPrice: null, ts: null };
  const params = new URLSearchParams(window.location.search);
  const edge = params.get("edge");
  const synthPct = params.get("synthPct");
  const polyPct = params.get("polyPct");
  const ts = params.get("ts");
  const entryPrice = params.get("entryPrice");
  return {
    asset: params.get("asset")?.toUpperCase() || null,
    tf: params.get("tf") || null,
    edge: edge ? parseInt(edge) : null,
    dir: params.get("dir") || null,
    synthPct: synthPct ? parseInt(synthPct) : null,
    polyPct: polyPct ? parseInt(polyPct) : null,
    slug: params.get("slug") || null,
    entryPrice: entryPrice ? parseFloat(entryPrice) : null,
    ts: ts ? parseInt(ts) : null,
  };
}

function SignalBanner({ deepLink, walletAddress, balance, onBetPlaced }: {
  deepLink: DeepLink;
  walletAddress: string | null;
  balance: number | null;
  onBetPlaced: (info: { asset: string; direction: string; amount: number; timeframe: string; entryPrice?: number; dbId?: number }) => void;
}) {
  const { asset, tf, edge, dir, synthPct, polyPct, slug, entryPrice, ts } = deepLink;
  const [betting, setBetting] = useState(false);
  const [betError, setBetError] = useState<string | null>(null);
  const [betDone, setBetDone] = useState(false);

  if (!edge || !asset || !dir) return null;

  const ageMs = ts ? Date.now() - ts : 0;
  const ageMins = Math.floor(ageMs / 60000);
  const ageStr = ageMins < 1 ? "just now" : ageMins < 60 ? `${ageMins}m ago` : `${Math.floor(ageMins / 60)}h ago`;
  const tfLabel = tf === "15m" ? "15 Min" : tf === "1h" ? "1 Hour" : tf === "daily" ? "Daily" : tf;
  const isStale = ageMins > 10;

  async function quickBet(amount: number) {
    if (!slug || !walletAddress || betting) return;
    setBetting(true);
    setBetError(null);

    try {
      const tg = (window as any).Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;

      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user?.id || 0,
          username: user?.username || null,
          first_name: user?.first_name || "Guest",
          asset,
          direction: dir,
          timeframe: tf || "15m",
          amount,
          synth_prob_up: (synthPct || 50) / 100,
          poly_prob_up: (polyPct || 50) / 100,
          entry_price: entryPrice || 0,
          event_slug: slug,
          slippage: 0.15,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setBetDone(true);
      playBetPlaced();
      onBetPlaced({ asset: asset!, direction: dir!, amount, timeframe: tf || "15m", entryPrice: entryPrice || 0, dbId: data.bet?.id });
      haptic("success");
    } catch (err: any) {
      setBetError(err.message || "Trade failed");
      haptic("error");
    } finally {
      setBetting(false);
    }
  }

  return (
    <div className={`rounded-xl px-3 py-3 border ${
      dir === "UP" ? "bg-up/10 border-up/20" : "bg-down/10 border-down/20"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full animate-pulse ${dir === "UP" ? "bg-up" : "bg-down"}`} />
          <span className="text-sm font-bold text-ink">
            Signal: {asset} {tfLabel} {dir}
          </span>
        </div>
        <span className="text-[10px] text-muted font-mono">{ageStr}</span>
      </div>
      <div className="text-xs text-muted mt-1">
        {edge}% edge (Synth {synthPct}% vs Market {polyPct}%)
      </div>

      {/* Quick trade buttons */}
      {slug && walletAddress && !betDone && !isStale && (
        <div className="mt-2.5 space-y-2">
          <div className="grid grid-cols-4 gap-1.5">
            {[5, 10, 25, 50].map((amt) => (
              <button
                key={amt}
                onClick={() => quickBet(amt)}
                disabled={betting || (balance !== null && balance < amt)}
                className={`py-2 rounded-lg text-xs font-bold font-mono transition-all active:translate-y-px disabled:opacity-40 ${
                  dir === "UP"
                    ? "bg-up text-ink shadow-sm"
                    : "bg-down text-white shadow-sm"
                }`}
              >
                {betting ? "..." : `$${amt}`}
              </button>
            ))}
          </div>
          {betError && <p className="text-[10px] text-down font-medium">{betError}</p>}
        </div>
      )}

      {betDone && (
        <div className="mt-2 text-xs font-semibold text-up-dark">
          Trade placed!
        </div>
      )}

      {isStale && (
        <div className="mt-1 text-[10px] text-muted">
          Signal is {ageMins}m old — market may have moved. Check current data below.
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("markets");
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const deepLink = useRef(getDeepLinkParams());
  const [balance, setBalance] = useState<number | null>(null);
  const [lastBet, setLastBet] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExportKey, setShowExportKey] = useState(false);
  const [privateKey, setPrivateKey] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAddr, setWithdrawAddr] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<string | null>(null);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("synthbet_onboarded");
  });
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { markets: featuredMarkets, loading: featuredLoading, categories: featuredCategories } = useFeaturedMarkets();
  const [resultToast, setResultToast] = useState<{ type: "won" | "lost"; text: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [portfolioRefreshKey, setPortfolioRefreshKey] = useState(0);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [liveBetOpen, setLiveBetOpen] = useState(false);
  const knownResolvedIds = useRef(new Set<number>(
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("deja_resolved_ids") || "[]")
      : []
  ));

  const getTelegramUser = useCallback(() => {
    try {
      return getTelegramWebApp()?.initDataUnsafe?.user || null;
    } catch {
      return null;
    }
  }, []);

  const fetchMarkets = useCallback(async () => {
    try {
      const res = await fetch(`/api/synth?t=${Date.now()}`);
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err) {
      console.error("Failed to fetch markets:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const initWallet = useCallback(async () => {
    const user = getTelegramUser();
    if (!user?.id) return;

    setWalletLoading(true);
    try {
      const res = await fetch("/api/wallet/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user.id,
          username: user.username || null,
          first_name: user.first_name || null,
        }),
      });
      const data = await res.json();
      if (data.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    } catch (err) {
      console.error("Failed to init wallet:", err);
    } finally {
      setWalletLoading(false);
    }
  }, [getTelegramUser]);

  const fetchBalance = useCallback(async () => {
    const user = getTelegramUser();
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/wallet/balance?telegram_id=${user.id}`);
      const data = await res.json();
      if (typeof data.balance === "number") {
        setBalance(data.balance);
      }
      if (data.wallet_address) {
        setWalletAddress(data.wallet_address);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    }
  }, [getTelegramUser]);

  useEffect(() => {
    // Initialize Telegram Web App
    try {
      const tg = getTelegramWebApp();
      if (tg) {
        tg.ready();
        tg.expand();
        // Prevent pull-to-close — we want full control of the viewport
        disableVerticalSwipes();
        // Set brand colors for the native chrome
        setHeaderColor("#1C1611");
        setBackgroundColor("#1C1611");
        setBottomBarColor("#2C1F14");
      }
    } catch {}

    fetchMarkets();
    initWallet();

    // Heartbeat — tell backend we're active (every 5 min while visible)
    function sendHeartbeat() {
      try {
        const tg = (window as any).Telegram?.WebApp;
        const user = tg?.initDataUnsafe?.user;
        if (user?.id) {
          fetch("/api/heartbeat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telegram_id: user.id }),
          }).catch(() => {});
        }
      } catch {}
    }
    sendHeartbeat(); // initial heartbeat on open

    // Minimum splash duration
    const splashTimer = setTimeout(() => setSplashDone(true), 2200);

    // Auto-refresh markets every 5 min, only when app is visible
    let marketInterval: ReturnType<typeof setInterval> | null = null;
    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    function startPolling() {
      if (!marketInterval) {
        marketInterval = setInterval(fetchMarkets, MARKET_POLL_MS);
      }
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(sendHeartbeat, MARKET_POLL_MS);
      }
    }
    function stopPolling() {
      if (marketInterval) {
        clearInterval(marketInterval);
        marketInterval = null;
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }

    startPolling();

    function handleVisibility() {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchMarkets();
        sendHeartbeat();
        startPolling();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stopPolling();
      clearTimeout(splashTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchMarkets, initWallet]);

  // Fetch balance once wallet is ready, then poll every 60s
  useEffect(() => {
    if (!walletAddress) return;

    fetchBalance();
    const balanceInterval = setInterval(fetchBalance, 60000);
    return () => clearInterval(balanceInterval);
  }, [walletAddress, fetchBalance]);

  // Poll for resolved bets — play win/lose sounds globally
  const checkResolvedBets = useCallback(async () => {
    const user = getTelegramUser();
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/bets?telegram_id=${user.id}&status=resolved&limit=5`);
      if (!res.ok) return;
      const data = await res.json();
      const bets = data.bets || [];
      for (const bet of bets) {
        if (knownResolvedIds.current.has(bet.id)) continue;
        knownResolvedIds.current.add(bet.id);
        // Persist so we don't replay on next app open
        try { localStorage.setItem("deja_resolved_ids", JSON.stringify([...knownResolvedIds.current])); } catch {}
        const won = bet.result === "won";
        const pnl = Math.abs(bet.pnl || bet.amount);
        const text = won
          ? `${bet.asset} ${bet.direction} WON! +$${pnl}`
          : `${bet.asset} ${bet.direction} lost -$${pnl}`;
        if (won) {
          playWin();
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3500);
        } else {
          playLose();
        }
        setResultToast({ type: won ? "won" : "lost", text });
        setTimeout(() => setResultToast(null), 4000);
        haptic(won ? "success" : "error");
        break; // one at a time so sounds don't overlap
      }
    } catch {}
  }, [getTelegramUser]);

  useEffect(() => {
    if (!walletAddress) return;
    // Initial check after short delay
    const initial = setTimeout(checkResolvedBets, 5000);
    const interval = setInterval(checkResolvedBets, 30_000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [walletAddress, checkResolvedBets]);

  const showSplash = loading || !splashDone;

  const refreshMarkets = useCallback(async () => {
    setRefreshing(true);
    await fetchMarkets();
    setRefreshing(false);
  }, [fetchMarkets]);

  function handleBetPlaced(info: {
    asset: string;
    direction: string;
    amount: number;
    timeframe: string;
    entryPrice?: number;
    endTime?: string;
    dbId?: number;
  }) {
    setLastBet(
      `${info.direction} ${info.asset} $${info.amount} (${info.timeframe})`
    );
    // Refresh balance after trade
    setTimeout(fetchBalance, 2000);
    setTimeout(() => setLastBet(null), 3000);

    // Open LiveBetView for synth bets (have real-time price feeds)
    if (info.entryPrice && info.timeframe !== "event") {
      const newBet: LiveBet = {
        id: `${info.asset}-${Date.now()}`,
        dbId: info.dbId,
        asset: info.asset,
        direction: info.direction as "UP" | "DOWN",
        amount: info.amount,
        timeframe: info.timeframe,
        entryPrice: info.entryPrice,
        endTime: info.endTime,
      };
      setLiveBets([newBet]);
      setLiveBetOpen(true);
    }

    // For event bets, switch to Portfolio tab so user can sell
    if (info.timeframe === "event") {
      setResultToast({ type: "won", text: "Position opened! Sell anytime in Portfolio" });
      setTimeout(() => setResultToast(null), 4000);
      setTimeout(() => {
        setTab("portfolio");
        setPortfolioRefreshKey((k) => k + 1);
      }, 1500);
    }
  }

  async function handleCashOut(bet: LiveBet, currentPrice: number) {
    const user = getTelegramUser();
    if (!user?.id || !bet.dbId) return;

    try {
      const res = await fetch("/api/bet/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user.id,
          bet_id: bet.dbId,
          current_price: currentPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Close failed");

      const pnl = data.pnl || 0;

      setResultToast({
        type: pnl >= 0 ? "won" : "lost",
        text: `Sold — ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
      });
      setTimeout(() => setResultToast(null), 4000);

      if (pnl >= 0) {
        playWin();
        haptic("success");
      } else {
        playLose();
        haptic("error");
      }

      setTimeout(fetchBalance, 1000);
      setPortfolioRefreshKey((k) => k + 1);

      // Close the live view after selling
      setLiveBetOpen(false);
      setLiveBets([]);
    } catch (err: any) {
      console.error("[CashOut] Error:", err);
      haptic("error");
      setResultToast({ type: "lost", text: err.message || "Sell failed" });
      setTimeout(() => setResultToast(null), 4000);
    }
  }

  async function handlePortfolioSell(betId: number, currentPrice: number): Promise<{ pnl: number } | null> {
    const user = getTelegramUser();
    if (!user?.id) return null;

    try {
      const res = await fetch("/api/bet/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user.id,
          bet_id: betId,
          current_price: currentPrice,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Close failed");

      const pnl = data.pnl || 0;

      // Show result toast
      setResultToast({
        type: pnl >= 0 ? "won" : "lost",
        text: `Sold — ${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`,
      });
      setTimeout(() => setResultToast(null), 4000);

      // Play sound + haptic
      if (pnl >= 0) {
        playWin();
        haptic("success");
      } else {
        playLose();
        haptic("error");
      }

      // Refresh balance
      setTimeout(fetchBalance, 1000);

      return { pnl };
    } catch (err: any) {
      console.error("[Sell] Error:", err);
      haptic("error");
      setResultToast({ type: "lost", text: err.message || "Sell failed" });
      setTimeout(() => setResultToast(null), 4000);
      return null;
    }
  }

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    haptic("light");
  }

  async function exportPrivateKey() {
    const user = getTelegramUser();
    if (!user?.id) return;

    setExportLoading(true);
    try {
      const res = await fetch("/api/wallet/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_id: user.id }),
      });
      const data = await res.json();
      if (data.private_key) {
        setPrivateKey(data.private_key);
      }
    } catch (err) {
      console.error("Failed to export key:", err);
    } finally {
      setExportLoading(false);
    }
  }

  function copyPrivateKey() {
    if (!privateKey) return;
    navigator.clipboard.writeText(privateKey);
    haptic("light");
  }

  async function withdraw() {
    const user = getTelegramUser();
    if (!user?.id) return;

    setWithdrawLoading(true);
    setWithdrawError(null);
    setWithdrawResult(null);

    try {
      const amt = parseFloat(withdrawAmt);
      if (!amt || amt < 1) throw new Error("Minimum withdrawal is $1");
      if (!/^0x[a-fA-F0-9]{40}$/.test(withdrawAddr)) throw new Error("Invalid address");

      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_id: user.id,
          to_address: withdrawAddr,
          amount: amt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setWithdrawResult(`Sent $${amt} USDC`);
      setWithdrawAddr("");
      setWithdrawAmt("");
      setTimeout(fetchBalance, 3000);
    } catch (err: any) {
      setWithdrawError(err.message || "Withdrawal failed");
    } finally {
      setWithdrawLoading(false);
    }
  }

  function shortAddr(addr: string) {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50 overflow-hidden">
        {/* Amber glow behind logo */}
        <div
          className="absolute w-64 h-64 rounded-full opacity-0 animate-splash-glow"
          style={{ background: "radial-gradient(circle, rgba(200,132,58,0.15) 0%, transparent 70%)" }}
        />

        {/* Animated line */}
        <svg
          viewBox="0 0 400 120"
          className="absolute w-[120%] opacity-0 animate-splash-line"
          style={{ top: "38%" }}
          preserveAspectRatio="none"
        >
          <path
            d="M0 90 Q40 85 80 70 T160 55 T240 35 T320 50 T400 20"
            fill="none"
            stroke="url(#splashGrad)"
            strokeWidth="2"
            strokeLinecap="round"
            className="animate-splash-draw"
          />
          <defs>
            <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#C8843A" stopOpacity="0" />
              <stop offset="30%" stopColor="#C8843A" stopOpacity="0.4" />
              <stop offset="70%" stopColor="#E4A95A" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#C8843A" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Logo */}
        <h1 className="font-serif text-6xl tracking-tight text-ink animate-scale-in relative">
          <span className="relative">
            D&eacute;ja<span className="text-amber">.</span>
            <span className="absolute inset-0 animate-splash-shimmer bg-gradient-to-r from-transparent via-amber/10 to-transparent bg-[length:200%_100%]" />
          </span>
        </h1>

        {/* Tagline */}
        <p
          className="font-display italic text-sm text-rose mt-3 opacity-0 animate-fade-up"
          style={{ animationDelay: "0.4s", animationFillMode: "forwards" }}
        >
          You knew it all along.
        </p>

        {/* Sub */}
        <p
          className="text-[10px] font-mono text-muted/60 mt-2 opacity-0 animate-fade-up tracking-widest uppercase"
          style={{ animationDelay: "0.7s", animationFillMode: "forwards" }}
        >
          Prediction markets
        </p>

        {/* Loading bar */}
        <div
          className="mt-8 w-32 h-0.5 rounded-full bg-ink/10 overflow-hidden opacity-0 animate-fade-up"
          style={{ animationDelay: "0.9s", animationFillMode: "forwards" }}
        >
          <div className="h-full rounded-full bg-amber animate-splash-progress" />
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <Onboarding
        onComplete={() => {
          localStorage.setItem("synthbet_onboarded", "1");
          setShowOnboarding(false);
        }}
      />
    );
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Global confetti */}
      <Confetti active={showConfetti} />

      {/* Global result toast */}
      {resultToast && (
        <div className={`fixed top-6 left-4 right-4 z-[70] rounded-xl px-4 py-3 shadow-lg border animate-slide-down text-center ${
          resultToast.type === "won"
            ? "bg-sage/90 border-sage text-ink"
            : "bg-rose/90 border-rose text-charcoal"
        }`}>
          <div className="text-sm font-bold">{resultToast.type === "won" ? "You Won!" : "You Lost"}</div>
          <div className="text-xs font-mono mt-0.5 opacity-80">{resultToast.text}</div>
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl tracking-tight text-ink">
              D&eacute;ja<span className="text-amber">.</span>
            </h1>
            <p className="text-[10px] font-mono text-muted mt-0.5 tracking-wider uppercase">
              Prediction markets
            </p>
          </div>
          <div className="text-right">
            {balance !== null && (
              <div className="bg-card rounded-xl px-3 py-1.5 text-sm border border-amber/10">
                <span className="text-muted text-[10px] font-mono">$ </span>
                <span className="font-mono text-amber-light font-normal">
                  {balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {walletLoading && (
          <p className="text-xs text-muted mt-2 font-mono">Setting up wallet...</p>
        )}

        {/* Last bet toast */}
        {lastBet && (
          <div className="mt-2 bg-up/10 border border-up/20 rounded-xl px-3 py-2 text-center text-up-dark text-xs font-medium animate-fade-up">
            Order placed: {lastBet}
          </div>
        )}
      </div>

      {/* Top: no tab bar — bottom tabs instead */}

      {/* Refresh indicator */}
      {tab === "markets" && refreshing && (
        <div className="px-4 mb-2">
          <div className="text-center text-[10px] font-mono text-amber animate-pulse">Refreshing...</div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 space-y-4">
        {tab === "markets" && (
          <>
            {/* Signal banner from notification — trade directly from signal */}
            {deepLink.current.edge && deepLink.current.asset && (
              <SignalBanner
                deepLink={deepLink.current}
                walletAddress={walletAddress}
                balance={balance}
                onBetPlaced={handleBetPlaced}
              />
            )}

            {/* Category filter pills — above everything */}
            {featuredCategories.length > 2 && (
              <CategoryPills
                categories={featuredCategories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            )}

            {/* BTC / ETH / SOL up-down markets (show for All or Crypto) */}
            {(selectedCategory === "All" || selectedCategory === "Crypto") && (
              <>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="bg-card rounded-2xl p-4 animate-pulse h-64 shadow-sm"
                      />
                    ))}
                  </div>
                ) : markets.length === 0 ? (
                  <div className="bg-card rounded-2xl p-8 text-center shadow-sm space-y-3">
                    <div className="text-muted">
                      Failed to load markets.
                    </div>
                    <button
                      onClick={refreshMarkets}
                      disabled={refreshing}
                      className="px-4 py-2 bg-ink/10 hover:bg-ink/15 text-ink rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {refreshing ? "Refreshing..." : "Refresh"}
                    </button>
                  </div>
                ) : (
                  [...markets]
                    .sort((a, b) => {
                      // Put the deep-linked asset first
                      const dl = deepLink.current.asset;
                      if (!dl) return 0;
                      if (a.asset === dl && b.asset !== dl) return -1;
                      if (b.asset === dl && a.asset !== dl) return 1;
                      return 0;
                    })
                    .map((m, i) => (
                    <MarketCard
                      key={m.asset}
                      asset={m.asset}
                      index={i}
                      min15={m["15min"]}
                      hourly={m.hourly}
                      daily={m.daily}
                      onBetPlaced={handleBetPlaced}
                      onMarketExpired={refreshMarkets}
                      walletAddress={walletAddress}
                      balance={balance}
                      initialTimeframe={
                        m.asset === deepLink.current.asset
                          ? (deepLink.current.tf as "15m" | "1h" | "daily") || undefined
                          : undefined
                      }
                    />
                  ))
                )}
              </>
            )}

            {/* Featured / Trending Markets */}
            <FeaturedMarkets
              walletAddress={walletAddress}
              balance={balance}
              selectedCategory={selectedCategory}
              markets={featuredMarkets}
              loading={featuredLoading}
              onBetPlaced={handleBetPlaced}
            />

            {/* Powered by */}
            <div className="text-center text-[10px] font-mono text-muted/50 py-6 tracking-wider uppercase">
              Powered by{" "}
              <span className="text-amber">Synth</span> Monte Carlo
              &middot; Real USDC on Polymarket
              <br />
              <span className="text-muted/30">deja.market</span>
            </div>
          </>
        )}

        {tab === "feed" && <Feed />}
        {tab === "portfolio" && (
          <>
            {/* Wallet controls */}
            {walletAddress && (
              <div className="bg-card rounded-2xl p-4 border border-amber/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted font-mono">{shortAddr(walletAddress)}</div>
                  <button
                    onClick={copyAddress}
                    className="text-[10px] font-semibold text-amber active:scale-95 transition-transform"
                  >
                    {copied ? "Copied!" : "Copy Address"}
                  </button>
                </div>
                {balance !== null && (
                  <div className="text-2xl font-bold font-mono text-white">
                    ${balance.toFixed(2)}
                    <span className="text-xs text-muted ml-1.5 font-normal">USDC</span>
                  </div>
                )}
                {balance !== null && balance < 1 && (
                  <p className="text-[10px] text-down font-medium">
                    Deposit USDC (Polygon) to your wallet to trade
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowWithdraw(true); setWithdrawResult(null); setWithdrawError(null); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-ink/5 text-white border border-amber/10 active:scale-[0.98] transition-transform"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => setShowExportKey(true)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-ink/5 text-white border border-amber/10 active:scale-[0.98] transition-transform"
                  >
                    Export Key
                  </button>
                </div>
              </div>
            )}
            <Portfolio refreshKey={portfolioRefreshKey} markets={markets} featuredMarkets={featuredMarkets} onSell={handlePortfolioSell} />
          </>
        )}
        {tab === "leaderboard" && <Leaderboard />}
      </div>

      {/* LiveBetView overlay */}
      {liveBetOpen && liveBets.length > 0 && (
        <LiveBetView
          bets={liveBets}
          onClose={() => setLiveBetOpen(false)}
          onCashOut={handleCashOut}
        />
      )}

      {/* Floating pill — tap to reopen live view */}
      {liveBets.length > 0 && !liveBetOpen && (
        <button
          onClick={() => setLiveBetOpen(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 rounded-full bg-amber/90 text-charcoal font-bold text-xs shadow-lg animate-pulse active:scale-95 transition-transform"
        >
          <span className="w-2 h-2 rounded-full bg-up animate-ping" />
          {liveBets.length} active bet{liveBets.length > 1 ? "s" : ""} · Tap to watch
        </button>
      )}

      {/* Export Private Key Modal */}
      {showExportKey && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl animate-scale-in border border-amber/10">
            <h2 className="text-lg font-bold text-ink">Export Private Key</h2>

            {!privateKey ? (
              <>
                <p className="text-xs text-muted leading-relaxed">
                  Your private key gives full control of your wallet. Never share it with anyone. You can import it into MetaMask or any Polygon-compatible wallet.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowExportKey(false); setPrivateKey(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink/5 text-muted"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={exportPrivateKey}
                    disabled={exportLoading}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-down text-white disabled:opacity-50"
                  >
                    {exportLoading ? "..." : "Reveal Key"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-ink/5 rounded-xl p-3 break-all">
                  <p className="text-[11px] font-mono text-ink leading-relaxed select-all">
                    {privateKey}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowExportKey(false); setPrivateKey(null); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink/5 text-muted"
                  >
                    Close
                  </button>
                  <button
                    onClick={copyPrivateKey}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink text-white"
                  >
                    Copy Key
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Bottom Tab Bar — hide when LiveBetView is open */}
      <nav className={`fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-amber/10 ${liveBetOpen ? "hidden" : ""}`}>
        <div className="flex items-center justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {(
            [
              { key: "markets" as Tab, label: "Markets", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              )},
              { key: "feed" as Tab, label: "Feed", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
                </svg>
              )},
              { key: "portfolio" as Tab, label: "Portfolio", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              )},
              { key: "leaderboard" as Tab, label: "Ranks", icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0" />
                </svg>
              )},
            ]
          ).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => { haptic("selection"); setTab(key); if (key === "portfolio") { checkResolvedBets(); setPortfolioRefreshKey((k) => k + 1); } }}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                tab === key
                  ? "text-amber"
                  : "text-muted/60"
              }`}
            >
              {tab === key && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-amber" />
              )}
              {icon}
              <span className="text-[10px] font-mono tracking-wider">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl animate-scale-in border border-amber/10">
            <h2 className="text-lg font-bold text-ink">Withdraw USDC</h2>
            <p className="text-xs text-muted">Send USDC from your Safe wallet to any Polygon address. Gasless via Polymarket relayer.</p>

            <input
              type="text"
              placeholder="Destination address (0x...)"
              value={withdrawAddr}
              onChange={(e) => setWithdrawAddr(e.target.value)}
              disabled={withdrawLoading}
              className="w-full py-2.5 px-3 bg-ink/5 text-ink rounded-xl text-sm font-mono border border-ink/8 placeholder:text-muted/50 disabled:opacity-50 outline-none focus:ring-2 focus:ring-ink/20"
            />
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                placeholder="Amount (USDC)"
                min={1}
                value={withdrawAmt}
                onChange={(e) => setWithdrawAmt(e.target.value)}
                disabled={withdrawLoading}
                className="w-full py-2.5 px-3 pr-14 bg-ink/5 text-ink rounded-xl text-sm font-mono border border-ink/8 placeholder:text-muted/50 disabled:opacity-50 outline-none focus:ring-2 focus:ring-ink/20"
              />
              {balance !== null && balance > 0 && (
                <button
                  onClick={() => setWithdrawAmt(balance.toFixed(2))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-amber px-2 py-1 rounded-md active:bg-amber/10"
                >
                  MAX
                </button>
              )}
            </div>

            {withdrawError && (
              <p className="text-xs text-down font-medium">{withdrawError}</p>
            )}
            {withdrawResult && (
              <p className="text-xs text-up-dark font-medium">{withdrawResult}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setShowWithdraw(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-ink/5 text-muted"
              >
                {withdrawResult ? "Done" : "Cancel"}
              </button>
              {!withdrawResult && (
                <button
                  onClick={withdraw}
                  disabled={withdrawLoading || !withdrawAddr || !withdrawAmt}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-down text-white disabled:opacity-50"
                >
                  {withdrawLoading ? "Sending..." : "Send"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
