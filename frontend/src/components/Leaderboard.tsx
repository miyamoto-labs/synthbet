"use client";

import { useEffect, useState } from "react";

type LeaderboardEntry = {
  rank: number;
  username: string;
  total_pnl: number;
  total_bets: number;
  balance: number;
  win_rate: number | null;
};

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?limit=20")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card rounded-xl p-4 animate-pulse h-16 shadow-sm"
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-8 text-center shadow-sm border border-amber/10">
        <div className="text-2xl mb-2">🏆</div>
        <div className="text-muted text-sm">
          No bets placed yet. Be the first on the leaderboard!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.rank}
          className={`bg-card rounded-xl p-3 flex items-center gap-3 shadow-sm border ${
            entry.rank <= 3 ? "border-gold/30" : "border-ink/5"
          }`}
        >
          <div className="w-8 text-center text-lg font-bold font-mono text-ink">
            {entry.rank <= 3
              ? ["🥇", "🥈", "🥉"][entry.rank - 1]
              : entry.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-ink truncate">
              {entry.username}
            </div>
            <div className="text-[11px] text-muted">
              {entry.total_bets} bets
              {entry.win_rate !== null && ` · ${entry.win_rate.toFixed(0)}% win`}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`font-bold font-mono text-sm ${
                entry.total_pnl >= 0 ? "text-up-dark" : "text-down"
              }`}
            >
              {entry.total_pnl >= 0 ? "+" : ""}${entry.total_pnl.toFixed(0)}
            </div>
            <div className="text-[11px] text-muted font-mono">
              ${entry.balance.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
