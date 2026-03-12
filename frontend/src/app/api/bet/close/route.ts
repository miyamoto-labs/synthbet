import { NextRequest, NextResponse } from 'next/server';
import { createServerClobClient, getBuilderConfig } from '@/lib/server-signer';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const DRY_MODE = process.env.DRY_MODE?.trim() === 'true';

/**
 * POST /api/bet/close
 * Close a single pending bet early (cash out).
 * Body: { telegram_id, bet_id, current_price }
 * OR:   { telegram_id, asset, direction, timeframe, current_price } (fallback lookup)
 */
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, bet_id, current_price, asset, direction, timeframe, sell_fraction } = await req.json();

    // sell_fraction: 0 < fraction <= 1 (default 1 = full close)
    const fraction = typeof sell_fraction === 'number' ? Math.min(1, Math.max(0.01, sell_fraction)) : 1;

    if (!telegram_id || typeof current_price !== 'number') {
      return NextResponse.json(
        { error: 'Missing telegram_id or current_price' },
        { status: 400 }
      );
    }

    // Need either bet_id or asset+direction+timeframe for lookup
    if (!bet_id && !(asset && direction && timeframe)) {
      return NextResponse.json(
        { error: 'Provide bet_id or asset+direction+timeframe' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();

    // Look up user
    const { data: user } = await supabase
      .from('synth_users')
      .select('id, encrypted_private_key, clob_api_key, clob_api_secret, clob_api_passphrase, wallet_address, safe_address, balance')
      .eq('telegram_id', parseInt(telegram_id))
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Look up the bet — by ID if available, otherwise by asset/direction/timeframe
    let betQuery = supabase
      .from('synth_bets')
      .select('*')
      .eq('user_id', user.id)
      .eq('result', 'pending');

    if (bet_id) {
      betQuery = betQuery.eq('id', bet_id);
    } else {
      betQuery = betQuery
        .eq('asset', asset)
        .eq('direction', direction)
        .eq('timeframe', timeframe)
        .order('created_at', { ascending: false })
        .limit(1);
    }

    const { data: betRows, error: betErr } = await betQuery;
    const bet = betRows?.[0];

    if (betErr || !bet) {
      return NextResponse.json(
        { error: 'Bet not found or already resolved' },
        { status: 404 }
      );
    }

    // Calculate P&L based on direction and price movement
    const entryPrice = bet.entry_price || 0;
    const sellAmount = Math.round(bet.amount * fraction * 100) / 100; // portion being sold
    let pnl = 0;
    if (entryPrice > 0 && current_price > 0) {
      if (bet.direction === 'UP') {
        pnl = sellAmount * ((current_price - entryPrice) / entryPrice);
      } else {
        pnl = sellAmount * ((entryPrice - current_price) / entryPrice);
      }
      // Cap loss at the sold amount
      pnl = Math.max(-sellAmount, pnl);
      // Round to 2 decimals
      pnl = Math.round(pnl * 100) / 100;
    }

    // In real mode, try to cancel the CLOB order
    let clobResult: any = null;
    if (!DRY_MODE && bet.order_id && !bet.order_id.startsWith('dry-') && user.encrypted_private_key) {
      try {
        const builderConfig = await getBuilderConfig();
        const clobClient = await createServerClobClient(
          user.encrypted_private_key,
          user.clob_api_key,
          user.clob_api_secret,
          user.clob_api_passphrase,
          builderConfig,
          user.safe_address,
        );

        // Cancel via proxy if needed
        const proxyUrl = process.env.CLOB_PROXY_URL;
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
            clobResult = await clobClient.cancelOrder({ orderID: bet.order_id });
          } finally {
            setGlobalDispatcher(original);
          }
        } else {
          clobResult = await clobClient.cancelOrder({ orderID: bet.order_id });
        }
      } catch (err: any) {
        console.error('[BetClose] CLOB cancel error:', err.message);
        // Continue anyway — order might already be filled/cancelled
      }
    }

    // Update bet in database
    const isFullSell = fraction >= 0.99; // treat 99%+ as full close
    const remainingAmount = Math.round(bet.amount * (1 - fraction) * 100) / 100;

    if (isFullSell) {
      // Full close — mark as closed with total PnL
      const { error: updateErr } = await supabase
        .from('synth_bets')
        .update({
          result: 'closed',
          pnl: (bet.pnl || 0) + pnl, // accumulate any previous partial PnL
        })
        .eq('id', bet.id);
      if (updateErr) console.error('[BetClose] DB update error:', updateErr);
    } else {
      // Partial sell — reduce amount, keep pending, track cumulative PnL
      const { error: updateErr } = await supabase
        .from('synth_bets')
        .update({
          amount: remainingAmount,
          pnl: (bet.pnl || 0) + pnl,
        })
        .eq('id', bet.id);
      if (updateErr) console.error('[BetClose] DB partial update error:', updateErr);
    }

    // Credit/debit balance (return sold portion + pnl on that portion)
    const returnAmount = sellAmount + pnl;
    const newBalance = Math.max(0, (user.balance || 0) + returnAmount);
    const newBalanceRounded = Math.round(newBalance * 100) / 100;

    await supabase
      .from('synth_users')
      .update({ balance: newBalanceRounded })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      pnl,
      fraction,
      sell_amount: sellAmount,
      remaining_amount: isFullSell ? 0 : remainingAmount,
      return_amount: returnAmount,
      new_balance: newBalanceRounded,
      clob_result: clobResult,
    });
  } catch (error: any) {
    console.error('[BetClose] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to close bet' },
      { status: 500 }
    );
  }
}
