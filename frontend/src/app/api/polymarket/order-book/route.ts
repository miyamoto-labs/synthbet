import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOB_URL = 'https://clob.polymarket.com';

/**
 * GET /api/polymarket/order-book?token_id=<token_id>
 * Fetches the order book (bids + asks) for a Polymarket token.
 */
export async function GET(req: NextRequest) {
  try {
    const tokenId = req.nextUrl.searchParams.get('token_id');
    if (!tokenId) {
      return NextResponse.json({ error: 'Missing token_id' }, { status: 400 });
    }

    const res = await fetch(`${CLOB_URL}/book?token_id=${tokenId}`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[OrderBook] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to fetch order book' },
      { status: 500 }
    );
  }
}
