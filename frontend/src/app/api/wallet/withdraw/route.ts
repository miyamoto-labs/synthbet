import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getBuilderConfig } from '@/lib/server-signer';
import {
  createWalletClient,
  http,
  encodeFunctionData,
  erc20Abi,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const dynamic = 'force-dynamic';

const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const USDC_TOKEN = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

/**
 * POST /api/wallet/withdraw
 * Withdraw USDC from Safe to any address via Polymarket relayer (gasless).
 *
 * Body: { telegram_id, to_address, amount }
 */
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, to_address, amount } = await req.json();

    if (!telegram_id || !to_address || !amount) {
      return NextResponse.json({ error: 'Missing telegram_id, to_address, or amount' }, { status: 400 });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(to_address)) {
      return NextResponse.json({ error: 'Invalid destination address' }, { status: 400 });
    }

    if (amount < 1) {
      return NextResponse.json({ error: 'Minimum withdrawal is $1' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: user } = await supabase
      .from('synth_users')
      .select('encrypted_private_key, safe_address, wallet_address')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user?.encrypted_private_key || !user?.safe_address) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
    }

    const privateKey = decrypt(user.encrypted_private_key) as `0x${string}`;

    // Create viem WalletClient for RelayClient
    const account = privateKeyToAccount(privateKey);
    const viemWalletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http('https://polygon-rpc.com'),
    });

    const { RelayClient } = await import('@polymarket/builder-relayer-client');
    const builderConfig = await getBuilderConfig();

    const relayClient = new RelayClient(
      RELAYER_URL,
      137,
      viemWalletClient as any,
      builderConfig as any,
    );

    // USDC has 6 decimals
    const usdcAmount = parseUnits(amount.toString(), 6);

    // Execute USDC transfer from Safe via relayer (gasless)
    const transferTx = [{
      to: USDC_TOKEN,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'transfer',
        args: [to_address as `0x${string}`, usdcAmount],
      }),
      value: '0',
    }];

    const txResponse = await relayClient.execute(transferTx);

    // Poll for confirmation
    const result = await relayClient.pollUntilState(
      txResponse.transactionID,
      ['STATE_MINED', 'STATE_CONFIRMED'],
      'STATE_FAILED',
      20,
      3000
    );

    if ((result as any)?.state === 'STATE_FAILED') {
      throw new Error('Withdrawal transaction failed on-chain');
    }

    return NextResponse.json({
      success: true,
      tx_id: txResponse.transactionID,
      amount,
      to_address,
    });
  } catch (err: any) {
    console.error('[Wallet] Withdraw error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to withdraw' },
      { status: 500 }
    );
  }
}
