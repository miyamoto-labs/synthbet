"use client";

import { useEffect, useState, useCallback } from "react";

type FeedItem = {
  id: number;
  username: string;
  asset: string;
  direction: string;
  timeframe: string;
  amount: number;
  result: string;
  pnl: number;
  createdAt: string;
  isPaper?: boolean;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function tfLabel(tf: string) {
  if (tf === "15m" || tf === "15min") return "15m";
  if (tf === "1h" || tf === "hourly") return "1h";
  if (tf === "event") return "event";
  return tf;
}

function FeedEntry({ item }: { item: FeedItem }) {
  const isUp = item.direction === "UP";
  const won = item.result === "won";
  const lost = item.result === "lost";
  const pending = item.result === "pending";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          won ? "bg-up/15 text-up" : lost ? "bg-down/15 text-down" : "bg-amber/10 text-amber"
        }`}
      >
        {item.username.slice(0, 2).toUpperCase()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white truncate">
            {item.username}
          </span>
          <span className="text-white/30 text-[10px]">·</span>
          <span className="text-[10px] text-white/30 font-mono shrink-0">
            {timeAgo(item.createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              isUp ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {item.direction}
          </span>
          <span className="text-xs text-white/60 truncate">
            {item.asset}
          </span>
          <span className="text-[10px] text-white/25 font-mono">
            {tfLabel(item.timeframe)}
          </span>
        </div>
      </div>

      {/* Amount / result */}
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1">
          {item.isPaper && (
            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-white/10 text-white/40 uppercase">
              Paper
            </span>
          )}
          <span className="text-sm font-bold font-mono text-white">
            ${item.amount}
          </span>
        </div>
        {won && (
          <div className="text-[10px] font-bold font-mono text-up">
            +${item.pnl.toFixed(2)}
          </div>
        )}
        {lost && (
          <div className="text-[10px] font-bold font-mono text-down">
            -${Math.abs(item.pnl).toFixed(2)}
          </div>
        )}
        {pending && (
          <div className="text-[10px] font-mono text-amber animate-pulse">
            live
          </div>
        )}
      </div>
    </div>
  );
}

export function Feed() {
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeed = useCallback(async () => {
    try {
      const res = await fetch(`/api/feed?t=${Date.now()}`);
      const data = await res.json();
      setFeed(data.feed || []);
    } catch (err) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30_000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 bg-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (feed.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center border border-amber/10">
        <div className="text-2xl mb-2">📡</div>
        <div className="text-white/40 text-sm">
          No activity yet. Be the first to trade!
        </div>
      </div>
    );
  }

  // Split into live (pending) and resolved
  const live = feed.filter((f) => f.result === "pending");
  const resolved = feed.filter((f) => f.result !== "pending");

  return (
    <div className="space-y-4">
      {/* Live bets section */}
      {live.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-up animate-pulse" />
            <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">
              Live Now
            </h3>
            <span className="text-[10px] font-mono text-white/25">
              {live.length}
            </span>
          </div>
          <div className="bg-card rounded-2xl px-4 border border-amber/10">
            {live.map((item) => (
              <FeedEntry key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider">
            Recent Activity
          </h3>
          <span className="text-[10px] font-mono text-white/25">
            {resolved.length}
          </span>
        </div>
        <div className="bg-card rounded-2xl px-4 border border-amber/10">
          {resolved.map((item) => (
            <FeedEntry key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
