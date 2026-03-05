import { NextRequest, NextResponse } from 'next/server';
import { Wallet } from 'ethers';
import { encrypt } from '@/lib/crypto';
import { getSupabaseServer } from '@/lib/supabase-server';
import {
  getCreate2Address,
  keccak256,
  encodeAbiParameters,
  encodeFunctionData,
  erc20Abi,
  createWalletClient,
  http,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygon } from 'viem/chains';

export const dynamic = 'force-dynamic';

/* ── Polymarket contract addresses (Polygon mainnet) ── */
const RELAYER_URL = 'https://relayer-v2.polymarket.com/';
const SAFE_FACTORY = '0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b' as const;
const SAFE_INIT_CODE_HASH = '0x2bce2127ff07fb632d16c8347c4ebf501f4841168bed00d9e6ef715ddb6fcecf' as const;

const USDC_TOKEN    = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
const CTF_TOKEN     = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
const EXCHANGE      = '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E';
const NEG_RISK_EXCH = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
const NEG_RISK_ADPT = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';
const MAX_UINT256 = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

const erc1155Abi = [{
  name: 'setApprovalForAll',
  type: 'function',
  inputs: [
    { name: 'operator', type: 'address' },
    { name: 'approved', type: 'bool' },
  ],
  outputs: [],
  stateMutability: 'nonpayable',
}] as const;

/**
 * Deterministically derive the Safe proxy address for an EOA.
 * Same as @polymarket/builder-relayer-client's internal derivation.
 */
function deriveSafeAddress(eoaAddress: `0x${string}`): `0x${string}` {
  return getCreate2Address({
    bytecodeHash: SAFE_INIT_CODE_HASH,
    from: SAFE_FACTORY,
    salt: keccak256(
      encodeAbiParameters(
        [{ name: 'address', type: 'address' }],
        [eoaAddress]
      )
    ),
  });
}

/**
 * Create ethers v6 → v5 shim for Polymarket SDK compatibility.
 */
function createSignerShim(wallet: Wallet) {
  return new Proxy(wallet, {
    get(target, prop, receiver) {
      if (prop === '_signTypedData') {
        return target.signTypedData.bind(target);
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

/**
 * Set up proxy for all CLOB/relayer API calls from Vercel.
 */
async function withProxy<T>(fn: () => Promise<T>): Promise<T> {
  const proxyUrl = process.env.CLOB_PROXY_URL;
  if (!proxyUrl) return fn();

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
    return await fn();
  } finally {
    setGlobalDispatcher(original);
  }
}

/**
 * POST /api/wallet/create
 *
 * Full Polymarket builder wallet setup:
 * 1. Generate EOA
 * 2. Derive Safe address (deterministic)
 * 3. Deploy Safe via Polymarket relayer
 * 4. Set all token approvals (USDC + CTF → 4 contracts)
 * 5. Derive CLOB API credentials
 * 6. Encrypt & store everything
 */
export async function POST(req: NextRequest) {
  try {
    const { telegram_id, username, first_name } = await req.json();

    if (!telegram_id) {
      return NextResponse.json({ error: 'Missing telegram_id' }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Check if user already has a fully set up wallet
    const { data: existing } = await supabase
      .from('synth_users')
      .select('wallet_address, safe_address')
      .eq('telegram_id', telegram_id)
      .single();

    if (existing?.safe_address) {
      return NextResponse.json({
        wallet_address: existing.safe_address,
        eoa_address: existing.wallet_address,
        is_new: false,
      });
    }

    // ── Step 1: Generate EOA ──
    const hdWallet = Wallet.createRandom();
    const privateKey = hdWallet.privateKey as `0x${string}`;
    const ethersWallet = new Wallet(privateKey);
    const signerShim = createSignerShim(ethersWallet);
    const eoaAddress = ethersWallet.address.toLowerCase() as `0x${string}`;

    // Create viem WalletClient for RelayClient (it needs .transport.config)
    const account = privateKeyToAccount(privateKey);
    const viemWalletClient = createWalletClient({
      account,
      chain: polygon,
      transport: http('https://polygon-rpc.com'),
    });

    // ── Step 2: Derive Safe address ──
    const safeAddress = deriveSafeAddress(eoaAddress);
    console.log(`[Wallet] EOA: ${eoaAddress}, Safe: ${safeAddress}`);

    // ── Step 3: Deploy Safe via relayer ──
    const { RelayClient } = await import('@polymarket/builder-relayer-client');
    const { getBuilderConfig } = await import('@/lib/server-signer');
    const builderConfig = await getBuilderConfig();

    const relayClient = new RelayClient(
      RELAYER_URL,
      137,
      viemWalletClient as any,
      builderConfig as any,
    );

    let isSafeDeployed = false;
    try {
      isSafeDeployed = await relayClient.getDeployed(safeAddress);
    } catch {
      isSafeDeployed = false;
    }

    if (!isSafeDeployed) {
      console.log('[Wallet] Deploying Safe...');
      const deployResponse = await relayClient.deploy();

      const result = await relayClient.pollUntilState(
        deployResponse.transactionID,
        ['STATE_MINED', 'STATE_CONFIRMED'],
        'STATE_FAILED',
        20,
        3000
      );

      if ((result as any)?.state === 'STATE_FAILED') {
        throw new Error('Safe deployment failed');
      }
      console.log('[Wallet] Safe deployed');
    }

    // ── Step 4: Set token approvals via relayer ──
    console.log('[Wallet] Setting approvals...');
    const approvalTxs = [
      // USDC approve → CTF Contract, Exchange, NegRisk Exchange, NegRisk Adapter
      ...[CTF_TOKEN, EXCHANGE, NEG_RISK_EXCH, NEG_RISK_ADPT].map(spender => ({
        to: USDC_TOKEN,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [spender as `0x${string}`, MAX_UINT256],
        }),
        value: '0',
      })),
      // CTF setApprovalForAll → Exchange, NegRisk Exchange, NegRisk Adapter
      ...[EXCHANGE, NEG_RISK_EXCH, NEG_RISK_ADPT].map(operator => ({
        to: CTF_TOKEN,
        data: encodeFunctionData({
          abi: erc1155Abi,
          functionName: 'setApprovalForAll',
          args: [operator as `0x${string}`, true],
        }),
        value: '0',
      })),
    ];

    const approvalResponse = await relayClient.execute(approvalTxs);
    const approvalResult = await relayClient.pollUntilState(
      approvalResponse.transactionID,
      ['STATE_MINED', 'STATE_CONFIRMED'],
      'STATE_FAILED',
      20,
      3000
    );

    if ((approvalResult as any)?.state === 'STATE_FAILED') {
      throw new Error('Token approvals failed');
    }
    console.log('[Wallet] Approvals set');

    // ── Step 5: Derive CLOB API credentials ──
    const creds = await withProxy(async () => {
      const { ClobClient } = await import('@polymarket/clob-client');
      const tempClient = new ClobClient(
        'https://clob.polymarket.com',
        137,
        signerShim as any,
      );
      return tempClient.createOrDeriveApiKey();
    });

    if (!creds.key || !creds.secret || !creds.passphrase) {
      throw new Error('Failed to derive CLOB API credentials');
    }

    // Sync CLOB's cached view of approvals
    try {
      const { ClobClient } = await import('@polymarket/clob-client');
      const authedClient = new ClobClient(
        'https://clob.polymarket.com',
        137,
        signerShim as any,
        { key: creds.key, secret: creds.secret, passphrase: creds.passphrase },
        2, // POLY_GNOSIS_SAFE
        safeAddress,
        undefined,
        false,
        builderConfig as any,
      );
      await withProxy(() => authedClient.updateBalanceAllowance({ asset_type: 'COLLATERAL' as any }));
    } catch (syncErr: any) {
      console.warn('[Wallet] CLOB cache sync failed (non-fatal):', syncErr?.message);
    }

    // ── Step 6: Encrypt & store ──
    const encryptedPrivateKey = encrypt(privateKey);
    const encryptedApiKey = encrypt(creds.key);
    const encryptedApiSecret = encrypt(creds.secret);
    const encryptedApiPassphrase = encrypt(creds.passphrase);

    const { error } = await supabase
      .from('synth_users')
      .upsert(
        {
          telegram_id,
          username: username || null,
          first_name: first_name || null,
          wallet_address: eoaAddress,
          safe_address: safeAddress.toLowerCase(),
          encrypted_private_key: encryptedPrivateKey,
          clob_api_key: encryptedApiKey,
          clob_api_secret: encryptedApiSecret,
          clob_api_passphrase: encryptedApiPassphrase,
        },
        { onConflict: 'telegram_id' }
      );

    if (error) throw error;

    return NextResponse.json({
      wallet_address: safeAddress.toLowerCase(),
      eoa_address: eoaAddress,
      is_new: true,
    });
  } catch (err: any) {
    console.error('[Wallet] Create error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to create wallet' },
      { status: 500 }
    );
  }
}
