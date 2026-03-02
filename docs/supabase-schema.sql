-- SynthBet Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/ljseawnwxbkrejwysrey/sql)

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS synth_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  balance NUMERIC(12, 2) DEFAULT 10000.00 NOT NULL,
  total_bets INTEGER DEFAULT 0 NOT NULL,
  total_pnl NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast lookups by telegram_id
CREATE INDEX IF NOT EXISTS idx_synth_users_telegram_id ON synth_users(telegram_id);

-- ============================================================================
-- BETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS synth_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES synth_users(id) ON DELETE CASCADE NOT NULL,
  asset TEXT NOT NULL CHECK (asset IN ('BTC', 'ETH', 'SOL')),
  direction TEXT NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  timeframe TEXT NOT NULL CHECK (timeframe IN ('1h', 'daily')),
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  synth_prob_up NUMERIC(6, 4) DEFAULT 0,
  poly_prob_up NUMERIC(6, 4) DEFAULT 0,
  entry_price NUMERIC(20, 8) DEFAULT 0,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'won', 'lost')),
  pnl NUMERIC(12, 2) DEFAULT 0.00,
  event_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  resolved_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_synth_bets_user_id ON synth_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_synth_bets_result ON synth_bets(result);
CREATE INDEX IF NOT EXISTS idx_synth_bets_created_at ON synth_bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_synth_bets_event_slug ON synth_bets(event_slug);

-- ============================================================================
-- LEADERBOARD VIEW
-- ============================================================================
CREATE OR REPLACE VIEW synth_leaderboard AS
SELECT
  u.telegram_id,
  u.username,
  u.first_name,
  u.balance,
  u.total_bets,
  u.total_pnl,
  COALESCE(
    ROUND(
      (SELECT COUNT(*) FROM synth_bets b WHERE b.user_id = u.id AND b.result = 'won')::NUMERIC
      / NULLIF(u.total_bets, 0) * 100,
      1
    ),
    0
  ) AS win_rate
FROM synth_users u
WHERE u.total_bets > 0
ORDER BY u.total_pnl DESC;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE synth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE synth_bets ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read/write for hackathon (simplify auth)
-- In production, you'd restrict this to authenticated users
CREATE POLICY "Allow all operations on synth_users"
  ON synth_users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on synth_bets"
  ON synth_bets FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- FUNCTION: Resolve bets (called by a cron job or webhook)
-- ============================================================================
CREATE OR REPLACE FUNCTION resolve_bet(
  bet_id UUID,
  final_outcome TEXT  -- 'UP' or 'DOWN'
)
RETURNS VOID AS $$
DECLARE
  v_bet synth_bets%ROWTYPE;
  v_won BOOLEAN;
  v_payout NUMERIC;
BEGIN
  SELECT * INTO v_bet FROM synth_bets WHERE id = bet_id AND result = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bet not found or already resolved';
  END IF;

  v_won := (v_bet.direction = final_outcome);

  IF v_won THEN
    -- Payout = bet amount * (1 / probability) capped at 2x
    -- Simplified: win = +amount (double your money)
    v_payout := v_bet.amount;
  ELSE
    v_payout := -v_bet.amount;
  END IF;

  -- Update bet
  UPDATE synth_bets
  SET result = CASE WHEN v_won THEN 'won' ELSE 'lost' END,
      pnl = v_payout,
      resolved_at = NOW()
  WHERE id = bet_id;

  -- Update user balance and PnL
  UPDATE synth_users
  SET balance = balance + CASE WHEN v_won THEN v_bet.amount * 2 ELSE 0 END,
      total_pnl = total_pnl + v_payout,
      updated_at = NOW()
  WHERE id = v_bet.user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Bulk resolve bets by event slug
-- ============================================================================
CREATE OR REPLACE FUNCTION resolve_bets_by_slug(
  p_event_slug TEXT,
  p_outcome TEXT  -- 'UP' or 'DOWN'
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_bet RECORD;
BEGIN
  FOR v_bet IN
    SELECT id FROM synth_bets
    WHERE event_slug = p_event_slug AND result = 'pending'
  LOOP
    PERFORM resolve_bet(v_bet.id, p_outcome);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
