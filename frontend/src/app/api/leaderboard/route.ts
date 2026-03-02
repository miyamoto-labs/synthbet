import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");

    const { data: users, error } = await supabase
      .from("synth_users")
      .select("telegram_id, username, first_name, balance, total_bets, total_pnl")
      .gt("total_bets", 0)
      .order("total_pnl", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const leaderboard = (users || []).map((u, i) => ({
      rank: i + 1,
      username: u.username || u.first_name || `User ${u.telegram_id}`,
      total_pnl: u.total_pnl,
      total_bets: u.total_bets,
      balance: u.balance,
      win_rate: null as number | null, // computed below
    }));

    // Compute win rates
    for (const entry of leaderboard) {
      const user = users?.find(
        (u) =>
          (u.username || u.first_name || `User ${u.telegram_id}`) ===
          entry.username
      );
      if (user) {
        const { count: wins } = await supabase
          .from("synth_bets")
          .select("*", { count: "exact", head: true })
          .eq("result", "won")
          .in(
            "user_id",
            (
              await supabase
                .from("synth_users")
                .select("id")
                .eq("telegram_id", user.telegram_id)
            ).data?.map((u) => u.id) || []
          );
        entry.win_rate =
          user.total_bets > 0 ? ((wins || 0) / user.total_bets) * 100 : 0;
      }
    }

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error("Leaderboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
