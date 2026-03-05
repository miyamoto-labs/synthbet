import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_URL = 'https://clob.polymarket.com';
const GAMMA_URL = 'https://gamma-api.polymarket.com';

/**
 * GET /api/synth/price-history?slug=<slug>&interval=6h&fidelity=5
 * Resolves a Polymarket slug to its YES token ID, then fetches price history.
 */
export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');
    const interval = req.nextUrl.searchParams.get('interval') || '6h';
    const fidelity = req.nextUrl.searchParams.get('fidelity') || '5';

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    // Resolve slug to token ID via Gamma
    const gammaRes = await fetch(`${GAMMA_URL}/markets/slug/${slug}`, { cache: 'no-store' });
    if (!gammaRes.ok) {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    }

    const market = await gammaRes.json();
    const clobIds =
      typeof market.clobTokenIds === 'string'
        ? JSON.parse(market.clobTokenIds)
        : market.clobTokenIds || [];

    if (clobIds.length < 1) {
      return NextResponse.json({ error: 'No token IDs' }, { status: 500 });
    }

    // Use YES (UP) token — its price = probability of UP
    const tokenId = clobIds[0];

    const url = `${CLOB_URL}/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[PriceHistory] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch price history' },
      { status: 500 }
    );
  }
}
