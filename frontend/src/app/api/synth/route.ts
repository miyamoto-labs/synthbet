import { NextResponse } from "next/server";

const SYNTH_API_KEY = process.env.SYNTH_API_KEY!;
const SYNTH_BASE_URL = "https://api.synthdata.co";
const ASSETS = ["BTC", "ETH", "SOL"] as const;

async function fetchSynthInsight(asset: string, timeframe: "hourly" | "daily") {
  const res = await fetch(
    `${SYNTH_BASE_URL}/insights/polymarket/up-down/${timeframe}?asset=${asset}`,
    {
      headers: { Authorization: `Apikey ${SYNTH_API_KEY}` },
      next: { revalidate: 30 }, // cache for 30s
    }
  );

  if (!res.ok) {
    console.error(`Synth API error for ${asset}/${timeframe}: ${res.status}`);
    return null;
  }

  return res.json();
}

export async function GET() {
  try {
    // Fetch all assets + timeframes in parallel
    const results = await Promise.all(
      ASSETS.map(async (asset) => {
        const [hourly, daily] = await Promise.all([
          fetchSynthInsight(asset, "hourly"),
          fetchSynthInsight(asset, "daily"),
        ]);
        return { asset, hourly, daily };
      })
    );

    return NextResponse.json({ markets: results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Synth API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch market data" },
      { status: 500 }
    );
  }
}
