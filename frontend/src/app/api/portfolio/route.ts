import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/portfolio?telegram_id=<id>
 * Returns the user's bet history from synth_bets.
 */
export async function GET(req: NextRequest) {
  try {
    const telegramId = req.nextUrl.searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Get user ID from telegram_id
    const { data: user } = await supabase
      .from('synth_users')
      .select('id')
      .eq('telegram_id', parseInt(telegramId))
      .single();

    if (!user) {
      return NextResponse.json({ bets: [] });
    }

    const { data: bets, error } = await supabase
      .from('synth_bets')
      .select('id, asset, direction, timeframe, amount, entry_price, result, pnl, event_slug, order_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ bets: bets || [] });
  } catch (err: any) {
    console.error('[Portfolio] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch portfolio' },
      { status: 500 }
    );
  }
}
