import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { encodeFunctionData, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const GAMMA_URL = 'https://gamma-api.polymarket.com';
const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const CTF_TOKEN = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const USDC_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const ZERO_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

const ctfRedeemAbi = [{
  name: 'redeemPositions',
  type: 'function',
  inputs: [
    { name: 'collateralToken', type: 'address' },
    { name: 'parentCollectionId', type: 'bytes32' },
    { name: 'conditionId', type: 'bytes32' },
    { name: 'indexSets', type: 'uint256[]' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}] as const;

/**
 * GET /api/resolve-mine?telegram_id=<id>
 *
 * Resolves and redeems bets for a single user. No auth needed since
 * it only processes the requesting user's own pending bets.
 * Called from the frontend when a market expires or user opens portfolio.
 */
export async function GET(req: NextRequest) {
  const telegramId = req.nextUrl.searchParams.get('telegram_id');
  if (!telegramId) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  // Get user
  const { data: user } = await supabase
    .from('synth_users')
    .select('id, encrypted_private_key, telegram_id')
    .eq('telegram_id', parseInt(telegramId))
    .single();

  if (!user) {
    return NextResponse.json({ resolved: 0, redeemed: 0, message: 'User not found' });
  }

  // Get this user's pending bets
  const { data: pendingBets } = await supabase
    .from('synth_bets')
    .select('id, asset, direction, timeframe, amount, event_slug, entry_price, result')
    .eq('user_id', user.id)
    .eq('result', 'pending')
    .order('created_at', { ascending: true })
    .limit(50);

  // Also get recent won bets — their positions may need redemption
  const { data: wonBets } = await supabase
    .from('synth_bets')
    .select('event_slug')
    .eq('user_id', user.id)
    .eq('result', 'won')
    .order('created_at', { ascending: false })
    .limit(20);

  let resolved = 0;
  let redeemed = 0;
  const conditionIdsToRedeem = new Set<string>();

  // Collect condition IDs from already-won bets (may not have been redeemed)
  if (wonBets && wonBets.length > 0) {
    const wonSlugs = [...new Set(wonBets.map(b => b.event_slug).filter(Boolean))];
    for (const slug of wonSlugs) {
      try {
        const res = await fetch(`${GAMMA_URL}/markets/slug/${slug}`, { cache: 'no-store' });
        if (!res.ok) continue;
        const market = await res.json();
        if (market.conditionId) conditionIdsToRedeem.add(market.conditionId);
      } catch {}
    }
  }

  if (!pendingBets || pendingBets.length === 0) {
    // No pending bets, but still try to redeem won positions
    if (conditionIdsToRedeem.size === 0) {
      return NextResponse.json({ resolved: 0, redeemed: 0, message: 'Nothing to do' });
    }
    // Skip to redemption below
  }

  // Group pending bets by slug
  const slugMap = new Map<string, NonNullable<typeof pendingBets>>();
  if (pendingBets) {
    for (const bet of pendingBets) {
      if (!bet.event_slug) continue;
      const existing = slugMap.get(bet.event_slug) || [];
      existing.push(bet);
      slugMap.set(bet.event_slug, existing);
    }
  }

  for (const [slug, bets] of slugMap) {
    try {
      const gammaRes = await fetch(`${GAMMA_URL}/markets/slug/${slug}`, { cache: 'no-store' });
      if (!gammaRes.ok) continue;

      const market = await gammaRes.json();
      const outcomePrices =
        typeof market.outcomePrices === 'string'
          ? JSON.parse(market.outcomePrices)
          : market.outcomePrices || [];

      const yesPrice = parseFloat(outcomePrices[0] || '0');
      const noPrice = parseFloat(outcomePrices[1] || '0');

      const marketEnded = market.endDate && new Date(market.endDate).getTime() < Date.now();
      const pricesSettled = (yesPrice > 0.9 || noPrice > 0.9) && (yesPrice < 0.1 || noPrice < 0.1);
      const isResolved = market.resolved || (marketEnded && pricesSettled);

      if (!isResolved) continue;

      let winningDirection: 'UP' | 'DOWN' | null = null;
      if (yesPrice > 0.9) winningDirection = 'UP';
      else if (noPrice > 0.9) winningDirection = 'DOWN';
      else continue;

      const conditionId = market.conditionId;

      for (const bet of bets) {
        const won = bet.direction === winningDirection;
        const pnl = won ? bet.amount : -bet.amount;

        await supabase
          .from('synth_bets')
          .update({ result: won ? 'won' : 'lost', pnl })
          .eq('id', bet.id);

        // Update user total_pnl
        const { data: userData } = await supabase
          .from('synth_users')
          .select('total_pnl')
          .eq('id', user.id)
          .single();

        if (userData) {
          await supabase
            .from('synth_users')
            .update({ total_pnl: (userData.total_pnl || 0) + pnl })
            .eq('id', user.id);
        }

        if (won && conditionId) {
          conditionIdsToRedeem.add(conditionId);
        }

        resolved++;
      }
    } catch (err) {
      console.error(`[ResolveMine] Error for slug ${slug}:`, err);
    }
  }

  // Auto-redeem winning positions
  if (conditionIdsToRedeem.size > 0 && user.encrypted_private_key) {
    try {
      const privateKey = decrypt(user.encrypted_private_key) as `0x${string}`;
      const account = privateKeyToAccount(privateKey);
      const viemWalletClient = createWalletClient({
        account,
        chain: polygon,
        transport: http('https://polygon-bor-rpc.publicnode.com'),
      });

      const { RelayClient } = await import('@polymarket/builder-relayer-client');
      const { getBuilderConfig } = await import('@/lib/server-signer');
      const builderConfig = await getBuilderConfig();

      const relayClient = new RelayClient(
        RELAYER_URL, 137, viemWalletClient as any, builderConfig as any,
      );

      for (const conditionId of conditionIdsToRedeem) {
        try {
          const redeemTx = {
            to: CTF_TOKEN,
            data: encodeFunctionData({
              abi: ctfRedeemAbi,
              functionName: 'redeemPositions',
              args: [
                USDC_TOKEN as `0x${string}`,
                ZERO_HASH as `0x${string}`,
                conditionId as `0x${string}`,
                [BigInt(1), BigInt(2)],
              ],
            }),
            value: '0',
          };

          const response = await relayClient.execute([redeemTx]);
          await relayClient.pollUntilState(
            response.transactionID,
            ['STATE_MINED', 'STATE_CONFIRMED'],
            'STATE_FAILED',
            10,
            3000
          );
          redeemed++;
        } catch (err) {
          console.error(`[ResolveMine] Redeem failed for ${conditionId}:`, err);
        }
      }
    } catch (err) {
      console.error('[ResolveMine] Relayer setup failed:', err);
    }
  }

  return NextResponse.json({ resolved, redeemed, pending: pendingBets?.length || 0 });
}
