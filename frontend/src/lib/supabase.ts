import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SynthUser = {
  id: string;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  balance: number;
  total_bets: number;
  total_pnl: number;
  created_at: string;
};

export type SynthBet = {
  id: string;
  user_id: string;
  asset: "BTC" | "ETH" | "SOL";
  direction: "UP" | "DOWN";
  timeframe: "1h" | "daily";
  amount: number;
  synth_prob_up: number;
  poly_prob_up: number;
  entry_price: number;
  result: "pending" | "won" | "lost";
  pnl: number;
  created_at: string;
  resolved_at: string | null;
  event_slug: string | null;
};
