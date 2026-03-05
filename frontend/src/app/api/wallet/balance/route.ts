import { NextRequest, NextResponse } from 'next/server';
import { createServerClobClient, getBuilderConfig } from '@/lib/server-signer';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/wallet/balance?telegram_id=<id>
 * Returns the user's USDC balance on Polymarket (from Safe wallet).
 */
export async function GET(req: NextRequest) {
  try {
    const telegramId = req.nextUrl.searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: user } = await supabase
      .from('synth_users')
      .select('encrypted_private_key, clob_api_key, clob_api_secret, clob_api_passphrase, wallet_address, safe_address')
      .eq('telegram_id', parseInt(telegramId))
      .single();

    if (!user?.encrypted_private_key) {
      return NextResponse.json({ error: 'No wallet found', balance: 0 }, { status: 404 });
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

    // Route through proxy since CLOB is geoblocked
    const proxyUrl = process.env.CLOB_PROXY_URL;
    let balanceData: any;

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
        const { AssetType } = await import('@polymarket/clob-client');
        balanceData = await clobClient.getBalanceAllowance({
          asset_type: AssetType.COLLATERAL,
        });
      } finally {
        setGlobalDispatcher(original);
      }
    } else {
      const { AssetType } = await import('@polymarket/clob-client');
      balanceData = await clobClient.getBalanceAllowance({
        asset_type: AssetType.COLLATERAL,
      });
    }

    // USDC has 6 decimals
    const balance = parseFloat(balanceData.balance) / 1e6;

    return NextResponse.json({
      balance,
      wallet_address: user.safe_address || user.wallet_address,
    });
  } catch (err: any) {
    console.error('[Wallet] Balance error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch balance' },
      { status: 500 }
    );
  }
}
