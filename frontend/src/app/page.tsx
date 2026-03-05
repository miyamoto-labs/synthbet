"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MarketData } from "@/lib/synth";
import { MarketCard } from "@/components/MarketCard";
import { Portfolio } from "@/components/Portfolio";
import { Leaderboard } from "@/components/Leaderboard";

type Tab = "markets" | "portfolio" | "leaderboard";

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
  onBetPlaced: (info: { asset: string; direction: string; amount: number; timeframe: string }) => void;
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
      onBetPlaced({ asset: asset!, direction: dir!, amount, timeframe: tf || "15m" });
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
    } catch (err: any) {
      setBetError(err.message || "Trade failed");
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error"); } catch {}
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

  const getTelegramUser = useCallback(() => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      return tg?.initDataUnsafe?.user || null;
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
      const tg = (window as any).Telegram?.WebApp;
      tg?.ready();
      tg?.expand();
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
  }) {
    setLastBet(
      `${info.direction} ${info.asset} $${info.amount} (${info.timeframe})`
    );
    // Refresh balance after trade
    setTimeout(fetchBalance, 2000);
    setTimeout(() => setLastBet(null), 3000);
  }

  function copyAddress() {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    try {
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch {}
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
    try {
      (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred("light");
    } catch {}
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
      <div className="fixed inset-0 bg-bg flex flex-col items-center justify-center z-50">
        <h1 className="text-4xl font-bold tracking-tight text-ink animate-scale-in">
          SynthBet
        </h1>
        <p className="text-sm font-mono text-muted mt-2 animate-fade-up" style={{ animationDelay: "0.2s" }}>
          AI-powered predictions
        </p>
        <div className="flex gap-1.5 mt-6">
          <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse-dot" />
          <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse-dot" style={{ animationDelay: "0.3s" }} />
          <span className="w-2 h-2 rounded-full bg-ink/30 animate-pulse-dot" style={{ animationDelay: "0.6s" }} />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-20">
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              SynthBet
            </h1>
            <p className="text-xs font-mono text-muted mt-0.5">
              AI-powered crypto predictions
            </p>
          </div>
          <div className="text-right">
            {balance !== null && (
              <div className="bg-card rounded-xl px-3 py-1.5 text-sm border border-ink/5 shadow-sm">
                <span className="text-muted text-xs">USDC </span>
                <span className="font-bold font-mono text-ink">
                  ${balance.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Wallet address + deposit info */}
        {walletAddress && (
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={copyAddress}
              className="flex items-center gap-1.5 bg-ink/5 rounded-lg px-2.5 py-1.5 text-xs font-mono text-muted hover:bg-ink/10 transition-colors border border-ink/5"
            >
              <span>{shortAddr(walletAddress)}</span>
              <span className="text-[10px]">{copied ? "Copied!" : "Copy"}</span>
            </button>
            <button
              onClick={() => { setShowWithdraw(true); setWithdrawResult(null); setWithdrawError(null); }}
              className="bg-ink/5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-muted hover:bg-ink/10 transition-colors border border-ink/5"
            >
              Withdraw
            </button>
            <button
              onClick={() => setShowExportKey(true)}
              className="bg-ink/5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold text-muted hover:bg-ink/10 transition-colors border border-ink/5"
            >
              Export Key
            </button>
            {balance !== null && balance < 1 && (
              <span className="text-[11px] text-down font-medium">
                Deposit USDC (Polygon) to trade
              </span>
            )}
          </div>
        )}
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

      {/* Tab bar */}
      <div className="px-4 mb-4">
        <div className="flex bg-ink/5 rounded-xl p-1">
          {(
            [
              { key: "markets", label: "Markets" },
              { key: "portfolio", label: "My Bets" },
              { key: "leaderboard", label: "Leaderboard" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === key
                  ? "bg-card text-ink shadow-sm"
                  : "text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Refresh bar for markets */}
      {tab === "markets" && !loading && markets.length > 0 && (
        <div className="px-4 mb-3 flex justify-end">
          <button
            onClick={refreshMarkets}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ink/5 hover:bg-ink/10 rounded-lg text-xs font-semibold text-muted transition-colors border border-ink/5 disabled:opacity-50"
          >
            <svg
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0113.29-3.29L20 9M20 15a8 8 0 01-13.29 3.29L4 15" />
            </svg>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
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
                .map((m) => (
                <MarketCard
                  key={m.asset}
                  asset={m.asset}
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

            {/* Powered by */}
            <div className="text-center text-[11px] font-mono text-muted py-4">
              Powered by{" "}
              <span className="text-edge font-bold">Synth</span> Monte Carlo
              simulations (1,000 paths)
              <br />
              Real USDC trading on Polymarket
            </div>
          </>
        )}

        {tab === "portfolio" && <Portfolio />}
        {tab === "leaderboard" && <Leaderboard />}
      </div>

      {/* Export Private Key Modal */}
      {showExportKey && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-4 shadow-xl animate-scale-in">
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
      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="bg-card rounded-2xl p-5 w-full max-w-sm space-y-3 shadow-xl animate-scale-in">
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
            <input
              type="number"
              inputMode="decimal"
              placeholder="Amount (USDC)"
              min={1}
              value={withdrawAmt}
              onChange={(e) => setWithdrawAmt(e.target.value)}
              disabled={withdrawLoading}
              className="w-full py-2.5 px-3 bg-ink/5 text-ink rounded-xl text-sm font-mono border border-ink/8 placeholder:text-muted/50 disabled:opacity-50 outline-none focus:ring-2 focus:ring-ink/20"
            />

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
