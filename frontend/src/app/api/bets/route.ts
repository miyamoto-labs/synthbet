import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get('telegram_id');
  if (!telegramId) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
  }

  const status = req.nextUrl.searchParams.get('status'); // "resolved" = won+lost
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

  const supabase = getSupabaseServer();

  const { data: user } = await supabase
    .from('synth_users')
    .select('id')
    .eq('telegram_id', parseInt(telegramId))
    .single();

  if (!user) {
    return NextResponse.json({ bets: [] });
  }

  let query = supabase
    .from('synth_bets')
    .select('id, asset, direction, timeframe, amount, result, pnl, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (status === 'resolved') {
    query = query.in('result', ['won', 'lost']);
  } else if (status === 'pending') {
    query = query.eq('result', 'pending');
  }

  const { data: bets } = await query;

  return NextResponse.json({ bets: bets || [] });
}
