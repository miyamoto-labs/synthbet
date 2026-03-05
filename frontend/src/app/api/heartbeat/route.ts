import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/heartbeat
 * Updates the user's last_active timestamp.
 * Body: { telegram_id }
 */
export async function POST(req: NextRequest) {
  try {
    const { telegram_id } = await req.json();
    if (!telegram_id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    await supabase
      .from('synth_users')
      .update({ last_active: new Date().toISOString() })
      .eq('telegram_id', telegram_id);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
