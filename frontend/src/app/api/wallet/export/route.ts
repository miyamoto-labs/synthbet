import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/crypto';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/wallet/export
 * Returns the user's decrypted private key so they can import into MetaMask etc.
 * Body: { telegram_id: number }
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
      .select('encrypted_private_key, wallet_address, safe_address')
      .eq('telegram_id', telegram_id)
      .single();

    if (!user?.encrypted_private_key) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 404 });
    }

    const privateKey = decrypt(user.encrypted_private_key);

    return NextResponse.json({
      wallet_address: user.wallet_address,
      safe_address: user.safe_address,
      private_key: privateKey,
    });
  } catch (err: any) {
    console.error('[Wallet] Export error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to export wallet' },
      { status: 500 }
    );
  }
}
