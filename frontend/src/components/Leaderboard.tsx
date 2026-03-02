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
            className="bg-tg-secondary rounded-xl p-4 animate-pulse h-16"
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-tg-secondary rounded-2xl p-8 text-center">
        <div className="text-2xl mb-2">🏆</div>
        <div className="text-tg-hint text-sm">
          No bets placed yet. Be the first on the leaderboard!
        </div>
      </div>
    );
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.rank}
          className={`bg-tg-secondary rounded-xl p-3 flex items-center gap-3 ${
            entry.rank <= 3 ? "border border-edge/20" : ""
          }`}
        >
          <div className="w-8 text-center text-lg font-bold">
            {entry.rank <= 3 ? medals[entry.rank - 1] : entry.rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">
              {entry.username}
            </div>
            <div className="text-[11px] text-tg-hint">
              {entry.total_bets} bets
              {entry.win_rate !== null && ` · ${entry.win_rate.toFixed(0)}% win`}
            </div>
          </div>
          <div className="text-right">
            <div
              className={`font-bold text-sm ${
                entry.total_pnl >= 0 ? "text-up" : "text-down"
              }`}
            >
              {entry.total_pnl >= 0 ? "+" : ""}${entry.total_pnl.toFixed(0)}
            </div>
            <div className="text-[11px] text-tg-hint">
              ${entry.balance.toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
