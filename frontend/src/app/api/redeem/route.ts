import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { encodeFunctionData, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const CRON_SECRET = process.env.CRON_SECRET;
const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const GAMMA_URL = 'https://gamma-api.polymarket.com';
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
 * GET /api/redeem?telegram_id=<id>
 * Redeems all winning CTF positions for a user.
 */
export async function GET(req: NextRequest) {
  // Allow both cron (with CRON_SECRET) and direct app calls (with telegram_id)
  const authHeader = req.headers.get('authorization');
  const hasCronAuth = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const telegramId = req.nextUrl.searchParams.get('telegram_id');
  if (!telegramId) {
    return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
  }

  const supabase = getSupabaseServer();

  const { data: user } = await supabase
    .from('synth_users')
    .select('id, encrypted_private_key')
    .eq('telegram_id', parseInt(telegramId))
    .single();

  if (!user?.encrypted_private_key) {
    return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
  }

  // Get all won bets to find their condition IDs
  const { data: wonBets } = await supabase
    .from('synth_bets')
    .select('event_slug')
    .eq('user_id', user.id)
    .eq('result', 'won')
    .limit(50);

  if (!wonBets || wonBets.length === 0) {
    return NextResponse.json({ redeemed: 0, message: 'No winning bets to redeem' });
  }

  // Get unique slugs and their condition IDs
  const slugs = [...new Set(wonBets.map(b => b.event_slug).filter(Boolean))];
  const conditionIds = new Set<string>();

  for (const slug of slugs) {
    try {
      const res = await fetch(`${GAMMA_URL}/markets/slug/${slug}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const market = await res.json();
      if (market.conditionId) conditionIds.add(market.conditionId);
    } catch {}
  }

  if (conditionIds.size === 0) {
    return NextResponse.json({ redeemed: 0, message: 'No condition IDs found' });
  }

  // Set up relayer
  const privateKey = decrypt(user.encrypted_private_key) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);
  const viemWalletClient = createWalletClient({
    account, chain: polygon, transport: http('https://polygon-bor-rpc.publicnode.com'),
  });

  const { RelayClient } = await import('@polymarket/builder-relayer-client');
  const { getBuilderConfig } = await import('@/lib/server-signer');
  const builderConfig = await getBuilderConfig();

  const relayClient = new RelayClient(
    RELAYER_URL, 137, viemWalletClient as any, builderConfig as any,
  );

  // Redeem each condition individually to avoid batch failures
  const results: { conditionId: string; state: string }[] = [];
  let redeemed = 0;

  for (const conditionId of conditionIds) {
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

    try {
      const response = await relayClient.execute([redeemTx]);
      console.log(`[Redeem] Submitted for ${conditionId}, txID: ${response.transactionID}`);

      const result = await relayClient.pollUntilState(
        response.transactionID,
        ['STATE_MINED', 'STATE_CONFIRMED'],
        'STATE_FAILED',
        15,
        3000
      );

      const state = (result as any)?.state || 'unknown';
      console.log(`[Redeem] ${conditionId}: ${state}`);
      results.push({ conditionId, state });
      if (state === 'STATE_MINED' || state === 'STATE_CONFIRMED') redeemed++;
    } catch (err: any) {
      console.error(`[Redeem] Failed for ${conditionId}:`, err.message);
      results.push({ conditionId, state: `error: ${err.message}` });
    }
  }

  return NextResponse.json({
    redeemed,
    total: conditionIds.size,
    results,
  });
}
