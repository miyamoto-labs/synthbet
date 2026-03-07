import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { decrypt } from '@/lib/crypto';
import { Wallet } from 'ethers';
import { encodeFunctionData, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const dynamic = 'force-dynamic';

const GAMMA_URL = 'https://gamma-api.polymarket.com';
const CRON_SECRET = process.env.CRON_SECRET;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const DRY_MODE = process.env.DRY_MODE?.trim() === 'true';

const CTF_TOKEN = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const NEG_RISK_ADPT = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';
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

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[Resolve] Telegram notification failed:', err);
  }
}

async function redeemPositions(encryptedPrivateKey: string, conditionId: string) {
  try {
    const privateKey = decrypt(encryptedPrivateKey) as `0x${string}`;
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

    // Standard CTF redeem — works for up/down markets
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
    console.log(`[Resolve] Redeem tx submitted: ${response.transactionID}`);

    // Poll for confirmation (max 30s)
    const result = await relayClient.pollUntilState(
      response.transactionID,
      ['STATE_MINED', 'STATE_CONFIRMED'],
      'STATE_FAILED',
      10,
      3000
    );

    console.log(`[Resolve] Redeem result: ${(result as any)?.state}`);
    return true;
  } catch (err) {
    console.error('[Resolve] Redeem failed:', err);
    return false;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseServer();

  const { data: pendingBets, error: fetchErr } = await supabase
    .from('synth_bets')
    .select('id, user_id, asset, direction, timeframe, amount, event_slug, entry_price, result')
    .or('result.eq.pending,and(result.eq.lost,pnl.eq.0)')
    .order('created_at', { ascending: true })
    .limit(100);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (!pendingBets || pendingBets.length === 0) {
    return NextResponse.json({ resolved: 0, message: 'No pending bets' });
  }

  let resolved = 0;
  let errors = 0;
  let redeemed = 0;
  const results: { id: number; result: string; pnl: number }[] = [];

  const userNotifications = new Map<number, { won: number; lost: number; totalPnl: number; details: string[] }>();

  // Track condition IDs that need redemption per user
  const userRedemptions = new Map<string, { encryptedPrivateKey: string; conditionIds: Set<string> }>();

  const slugMap = new Map<string, typeof pendingBets>();
  for (const bet of pendingBets) {
    if (!bet.event_slug) continue;
    const existing = slugMap.get(bet.event_slug) || [];
    existing.push(bet);
    slugMap.set(bet.event_slug, existing);
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

        const { error: updateErr } = await supabase
          .from('synth_bets')
          .update({ result: won ? 'won' : 'lost', pnl })
          .eq('id', bet.id);

        if (updateErr) { errors++; continue; }

        const { data: user } = await supabase
          .from('synth_users')
          .select('total_pnl, telegram_id, encrypted_private_key')
          .eq('id', bet.user_id)
          .single();

        if (user) {
          await supabase
            .from('synth_users')
            .update({ total_pnl: (user.total_pnl || 0) + pnl })
            .eq('id', bet.user_id);

          // Queue redemption for winners
          if (won && conditionId && user.encrypted_private_key) {
            const key = bet.user_id;
            const existing = userRedemptions.get(key) || {
              encryptedPrivateKey: user.encrypted_private_key,
              conditionIds: new Set<string>(),
            };
            existing.conditionIds.add(conditionId);
            userRedemptions.set(key, existing);
          }

          if (user.telegram_id) {
            const existing = userNotifications.get(user.telegram_id) || { won: 0, lost: 0, totalPnl: 0, details: [] };
            if (won) existing.won++;
            else existing.lost++;
            existing.totalPnl += pnl;
            const emoji = won ? '✅' : '❌';
            existing.details.push(
              `${emoji} ${bet.asset} ${bet.direction} (${bet.timeframe}) $${bet.amount} → ${won ? '+' : ''}$${pnl}`
            );
            userNotifications.set(user.telegram_id, existing);
          }
        }

        resolved++;
        results.push({ id: bet.id, result: won ? 'won' : 'lost', pnl });
      }
    } catch (err) {
      console.error(`[Resolve] Error for slug ${slug}:`, err);
      errors++;
    }
  }

  // Auto-redeem winning positions (skip in dry mode)
  if (!DRY_MODE) {
    for (const [userId, redemption] of userRedemptions) {
      for (const conditionId of redemption.conditionIds) {
        const success = await redeemPositions(redemption.encryptedPrivateKey, conditionId);
        if (success) redeemed++;
      }
    }
  } else {
    console.log(`[Resolve] DRY MODE: skipping redeem for ${userRedemptions.size} users`);
  }

  // Send Telegram notifications
  for (const [telegramId, notif] of userNotifications) {
    const pnlStr = notif.totalPnl >= 0 ? `+$${notif.totalPnl.toFixed(2)}` : `-$${Math.abs(notif.totalPnl).toFixed(2)}`;
    const emoji = notif.totalPnl >= 0 ? '🎉' : '📉';
    const msg =
      `${emoji} <b>Bet Results</b>\n\n` +
      notif.details.join('\n') +
      `\n\n<b>Net: ${pnlStr}</b>` +
      `\n(${notif.won} won, ${notif.lost} lost)` +
      (redeemed > 0 ? `\n\n💰 Winnings redeemed to USDC` : '');

    await sendTelegramMessage(telegramId.toString(), msg);
  }

  return NextResponse.json({
    resolved, errors, redeemed,
    pending: pendingBets.length,
    notifications: userNotifications.size,
    results,
  });
}
