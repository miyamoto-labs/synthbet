import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STARTING_BALANCE = 10000; // $10k paper money

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { telegram_id, username, first_name, asset, direction, timeframe, amount, synth_prob_up, poly_prob_up, entry_price, event_slug } = body;

    if (!telegram_id || !asset || !direction || !timeframe || !amount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["BTC", "ETH", "SOL"].includes(asset)) {
      return NextResponse.json({ error: "Invalid asset" }, { status: 400 });
    }
    if (!["UP", "DOWN"].includes(direction)) {
      return NextResponse.json({ error: "Invalid direction" }, { status: 400 });
    }
    if (!["1h", "daily"].includes(timeframe)) {
      return NextResponse.json({ error: "Invalid timeframe" }, { status: 400 });
    }
    if (amount < 1 || amount > 1000) {
      return NextResponse.json({ error: "Amount must be $1-$1000" }, { status: 400 });
    }

    // Get or create user
    let { data: user } = await supabase
      .from("synth_users")
      .select("*")
      .eq("telegram_id", telegram_id)
      .single();

    if (!user) {
      const { data: newUser, error: createErr } = await supabase
        .from("synth_users")
        .insert({
          telegram_id,
          username: username || null,
          first_name: first_name || null,
          balance: STARTING_BALANCE,
          total_bets: 0,
          total_pnl: 0,
        })
        .select()
        .single();

      if (createErr) throw createErr;
      user = newUser;
    }

    // Check balance
    if (user.balance < amount) {
      return NextResponse.json(
        { error: "Insufficient balance", balance: user.balance },
        { status: 400 }
      );
    }

    // Place bet — deduct from balance
    const { error: updateErr } = await supabase
      .from("synth_users")
      .update({
        balance: user.balance - amount,
        total_bets: user.total_bets + 1,
      })
      .eq("id", user.id);

    if (updateErr) throw updateErr;

    // Create bet record
    const { data: bet, error: betErr } = await supabase
      .from("synth_bets")
      .insert({
        user_id: user.id,
        asset,
        direction,
        timeframe,
        amount,
        synth_prob_up: synth_prob_up || 0,
        poly_prob_up: poly_prob_up || 0,
        entry_price: entry_price || 0,
        result: "pending",
        pnl: 0,
        event_slug: event_slug || null,
      })
      .select()
      .single();

    if (betErr) throw betErr;

    return NextResponse.json({
      bet,
      new_balance: user.balance - amount,
    });
  } catch (error) {
    console.error("Bet error:", error);
    return NextResponse.json({ error: "Failed to place bet" }, { status: 500 });
  }
}
