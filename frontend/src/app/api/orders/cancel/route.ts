import { NextRequest, NextResponse } from 'next/server';
import { createServerClobClient, getBuilderConfig } from '@/lib/server-signer';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/orders/cancel
 * Cancel all open orders for a user on the Polymarket CLOB.
 * Also marks pending bets in synth_bets as 'cancelled'.
 */
export async function POST(req: NextRequest) {
  try {
    const { telegram_id } = await req.json();

    if (!telegram_id) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: user } = await supabase
      .from('synth_users')
      .select('id, encrypted_private_key, clob_api_key, clob_api_secret, clob_api_passphrase, wallet_address, safe_address')
      .eq('telegram_id', parseInt(telegram_id))
      .single();

    if (!user?.encrypted_private_key) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
    }

    const builderConfig = await getBuilderConfig();
    const clobClient = await createServerClobClient(
      user.encrypted_private_key,
      user.clob_api_key,
      user.clob_api_secret,
      user.clob_api_passphrase,
      builderConfig,
      user.safe_address,
    );

    // Cancel all open orders via proxy (CLOB is geoblocked)
    const proxyUrl = process.env.CLOB_PROXY_URL;
    let result: any;

    if (proxyUrl) {
      const { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher } = await import('undici');
      const parsed = new URL(proxyUrl);
      const proxyOrigin = `${parsed.protocol}//${parsed.host}`;
      const proxyToken = parsed.username
        ? `Basic ${Buffer.from(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`).toString('base64')}`
        : undefined;
      const agent = new ProxyAgent({ uri: proxyOrigin, token: proxyToken });
      const original = getGlobalDispatcher();
      setGlobalDispatcher(agent);
      try {
        result = await clobClient.cancelAll();
      } finally {
        setGlobalDispatcher(original);
      }
    } else {
      result = await clobClient.cancelAll();
    }

    // Mark all pending bets as cancelled in the database
    let { data: cancelled, error: dbErr } = await supabase
      .from('synth_bets')
      .update({ result: 'cancelled', pnl: 0 })
      .eq('user_id', user.id)
      .eq('result', 'pending')
      .select('id');

    if (dbErr) {
      console.error('[Cancel] DB update error:', dbErr);
      // If 'cancelled' isn't allowed, add it to the table:
      // ALTER TABLE synth_bets DROP CONSTRAINT IF EXISTS synth_bets_result_check;
      // Or: ALTER TABLE synth_bets ADD CONSTRAINT synth_bets_result_check CHECK (result IN ('pending', 'won', 'lost', 'cancelled'));
    }

    return NextResponse.json({
      success: true,
      cancelled_bets: cancelled?.length || 0,
      clob_result: result,
      db_error: dbErr?.message || null,
      user_id: user.id,
    });
  } catch (error: any) {
    console.error('[Cancel] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel orders' },
      { status: 500 }
    );
  }
}
