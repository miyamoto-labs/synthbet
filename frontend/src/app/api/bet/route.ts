import { NextRequest, NextResponse } from 'next/server';
import { createServerClobClient, getBuilderConfig } from '@/lib/server-signer';
import { decrypt } from '@/lib/crypto';
import { submitOrderToCLOB } from '@/lib/clob-proxy';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const GAMMA_URL = 'https://gamma-api.polymarket.com';
const CLOB_URL = 'https://clob.polymarket.com';
const DEFAULT_SLIPPAGE = 0.15;
const DRY_MODE = process.env.DRY_MODE?.trim() === 'true';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      telegram_id,
      asset,
      direction,
      timeframe,
      amount,
      synth_prob_up,
      poly_prob_up,
      entry_price,
      event_slug,
      slippage,
    } = body;

    // --- Validation ---
    if (!telegram_id || !asset || !direction || !timeframe || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['BTC', 'ETH', 'SOL'].includes(asset)) {
      return NextResponse.json({ error: 'Invalid asset' }, { status: 400 });
    }
    if (!['UP', 'DOWN'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
    }
    if (!['15m', '1h', 'daily'].includes(timeframe)) {
      return NextResponse.json({ error: 'Invalid timeframe' }, { status: 400 });
    }
    if (amount < 5 || amount > 100) {
      return NextResponse.json({ error: 'Amount must be $5-$100' }, { status: 400 });
    }
    if (!event_slug) {
      return NextResponse.json({ error: 'Missing event_slug — cannot resolve market' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // --- Look up user ---
    const { data: user } = await supabase
      .from('synth_users')
      .select('*')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user?.encrypted_private_key) {
      return NextResponse.json(
        { error: 'No wallet found. Please set up your wallet first.' },
        { status: 400 }
      );
    }

    // --- Resolve market via Gamma API ---
    const gammaRes = await fetch(`${GAMMA_URL}/markets/slug/${event_slug}`);
    if (!gammaRes.ok) {
      return NextResponse.json(
        { error: `Market not found on Polymarket (slug: ${event_slug})` },
        { status: 404 }
      );
    }

    const market = await gammaRes.json();

    const clobIds =
      typeof market.clobTokenIds === 'string'
        ? JSON.parse(market.clobTokenIds)
        : market.clobTokenIds || [];

    const outcomePrices =
      typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices || [];

    if (clobIds.length < 2) {
      return NextResponse.json({ error: 'Market missing CLOB token IDs' }, { status: 500 });
    }

    // YES (index 0) = UP, NO (index 1) = DOWN
    const tokenId = direction === 'UP' ? clobIds[0] : clobIds[1];

    // Fetch REAL best ask from CLOB orderbook (not Gamma's stale prices)
    let currentPrice: number;
    try {
      const bookRes = await fetch(`${CLOB_URL}/book?token_id=${tokenId}`, { cache: 'no-store' });
      if (bookRes.ok) {
        const book = await bookRes.json();
        const bestAsk = book?.asks?.[0]?.price;
        if (bestAsk) {
          currentPrice = parseFloat(bestAsk);
          console.log(`[Bet] CLOB best ask for ${asset} ${direction}: ${currentPrice}`);
        } else {
          // Fallback to Gamma if no asks on book
          currentPrice = direction === 'UP'
            ? parseFloat(outcomePrices[0] || '0.5')
            : parseFloat(outcomePrices[1] || '0.5');
          console.log(`[Bet] No asks on book, using Gamma price: ${currentPrice}`);
        }
      } else {
        currentPrice = direction === 'UP'
          ? parseFloat(outcomePrices[0] || '0.5')
          : parseFloat(outcomePrices[1] || '0.5');
        console.log(`[Bet] CLOB book fetch failed, using Gamma price: ${currentPrice}`);
      }
    } catch {
      currentPrice = direction === 'UP'
        ? parseFloat(outcomePrices[0] || '0.5')
        : parseFloat(outcomePrices[1] || '0.5');
    }

    // --- Check if market has expired ---
    if (market.endDate) {
      const endTime = new Date(market.endDate).getTime();
      const now = Date.now();
      if (now >= endTime) {
        return NextResponse.json(
          { error: 'This market has expired. Loading latest markets...' },
          { status: 400 }
        );
      }
      // Warn if less than 60s left — order likely won't fill
      if (endTime - now < 60000) {
        return NextResponse.json(
          { error: 'Market closes in less than 1 minute — too risky to trade. Wait for the next window.' },
          { status: 400 }
        );
      }
    }

    // --- Apply slippage and calculate shares ---
    const effectiveSlippage = Math.min(Math.max(slippage || DEFAULT_SLIPPAGE, 0.01), 0.20);
    const limitPrice = Math.ceil(currentPrice * (1 + effectiveSlippage) * 100) / 100;
    const cappedPrice = Math.min(limitPrice, 0.99); // Never pay more than $0.99/share
    // Use whole-number shares so that shares × price stays within 2-decimal USDC precision
    const shares = Math.floor(amount / cappedPrice);

    if (shares <= 0) {
      return NextResponse.json({ error: 'Calculated shares is zero — price too high' }, { status: 400 });
    }

    let orderId: string | null = null;

    if (DRY_MODE) {
      // --- DRY MODE: skip real CLOB order, simulate success ---
      orderId = `dry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      console.log(`[Bet] DRY MODE: ${asset} ${direction} $${amount} @ ${cappedPrice} (${shares} shares) slug=${event_slug}`);
    } else {
      // --- Create CLOB client ---
      const builderConfig = await getBuilderConfig();
      const clobClient = await createServerClobClient(
        user.encrypted_private_key,
        user.clob_api_key,
        user.clob_api_secret,
        user.clob_api_passphrase,
        builderConfig,
        user.safe_address,
      );

      // --- Place order ---
      const { Side } = await import('@polymarket/clob-client');
      const { ProxyAgent, setGlobalDispatcher, getGlobalDispatcher } = await import('undici');

      const proxyUrl = process.env.CLOB_PROXY_URL;
      let signedOrder: any;

      if (proxyUrl) {
        const parsed = new URL(proxyUrl);
        const proxyOrigin = `${parsed.protocol}//${parsed.host}`;
        const proxyToken = parsed.username
          ? `Basic ${Buffer.from(`${decodeURIComponent(parsed.username)}:${decodeURIComponent(parsed.password)}`).toString('base64')}`
          : undefined;
        const agent = new ProxyAgent({ uri: proxyOrigin, token: proxyToken });
        const originalDispatcher = getGlobalDispatcher();
        setGlobalDispatcher(agent);
        try {
          signedOrder = await clobClient.createOrder({
            tokenID: tokenId,
            side: Side.BUY,
            size: shares,
            price: cappedPrice,
          });
        } finally {
          setGlobalDispatcher(originalDispatcher);
        }
      } else {
        signedOrder = await clobClient.createOrder({
          tokenID: tokenId,
          side: Side.BUY,
          size: shares,
          price: cappedPrice,
        });
      }

      // Submit via residential proxy to bypass geoblock
      const apiKey = decrypt(user.clob_api_key);
      const apiSecret = decrypt(user.clob_api_secret);
      const apiPassphrase = decrypt(user.clob_api_passphrase);

      const result = await submitOrderToCLOB({
        signedOrder,
        apiKey,
        apiSecret,
        apiPassphrase,
        walletAddress: user.wallet_address,
        orderType: 'GTC',
      });

      if (!result.ok) {
        console.error('[Bet] CLOB order failed:', result.status, result.data);
        return NextResponse.json(
          { error: `Order rejected: ${result.data?.error || result.data?.message || 'unknown error'}` },
          { status: 400 }
        );
      }

      orderId = result.data?.orderID || result.data?.id || null;
    }

    // --- Log trade ---
    const { data: bet, error: betErr } = await supabase
      .from('synth_bets')
      .insert({
        user_id: user.id,
        asset,
        direction,
        timeframe,
        amount,
        synth_prob_up: synth_prob_up || 0,
        poly_prob_up: poly_prob_up || 0,
        entry_price: entry_price || 0,
        result: 'pending',
        pnl: 0,
        event_slug,
        order_id: orderId,
      })
      .select()
      .single();

    if (betErr) {
      console.error('[Bet] Failed to log trade:', betErr);
      // Order was placed successfully, just logging failed — don't fail the request
    }

    // Update total_bets counter
    await supabase
      .from('synth_users')
      .update({ total_bets: (user.total_bets || 0) + 1 })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      order_id: orderId,
      token_id: tokenId,
      price: cappedPrice,
      shares,
      amount,
      bet: bet || null,
    });
  } catch (error: any) {
    console.error('[Bet] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to place bet' },
      { status: 500 }
    );
  }
}
