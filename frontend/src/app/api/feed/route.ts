import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    // Fetch recent bets with user info
    const { data: bets, error } = await supabase
      .from("synth_bets")
      .select(`
        id,
        asset,
        direction,
        timeframe,
        amount,
        result,
        pnl,
        created_at,
        user_id
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!bets || bets.length === 0) {
      return NextResponse.json({ feed: [] });
    }

    // Get unique user IDs and fetch their info
    const userIds = [...new Set(bets.map((b) => b.user_id))];
    const { data: users } = await supabase
      .from("synth_users")
      .select("id, username, first_name")
      .in("id", userIds);

    const userMap = new Map(
      (users || []).map((u) => [
        u.id,
        u.username || u.first_name || "Anon",
      ])
    );

    const feed = bets.map((b) => ({
      id: b.id,
      username: userMap.get(b.user_id) || "Anon",
      asset: b.asset,
      direction: b.direction,
      timeframe: b.timeframe,
      amount: b.amount,
      result: b.result,
      pnl: b.pnl,
      createdAt: b.created_at,
    }));

    return NextResponse.json(
      { feed },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=10" } }
    );
  } catch (error) {
    console.error("Feed error:", error);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}
