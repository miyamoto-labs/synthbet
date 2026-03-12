import { NextResponse } from "next/server";

const SYNTH_API_KEY = process.env.SYNTH_API_KEY!;
const SYNTH_BASE_URL = "https://api.synthdata.co";
const ASSETS = ["BTC", "ETH", "SOL"] as const;

async function fetchSynthInsight(asset: string, timeframe: "15min" | "hourly" | "daily") {
  // Use Next.js fetch cache — persists across serverless invocations
  const revalidate = timeframe === "15min" ? 30 : 120;

  try {
    const res = await fetch(
      `${SYNTH_BASE_URL}/insights/polymarket/up-down/${timeframe}?asset=${asset}`,
      {
        headers: { Authorization: `Apikey ${SYNTH_API_KEY}` },
        next: { revalidate },
      } as any,
    );

    if (!res.ok) {
      console.error(`Synth API error for ${asset}/${timeframe}: ${res.status}`);
      return null;
    }

    const data = await res.json();
    // Synth API wraps the insight in a { message: "<json>" } envelope
    if (data && typeof data.message === "string") {
      try {
        return JSON.parse(data.message);
      } catch {
        return null;
      }
    }
    return data;
  } catch (err) {
    console.error(`Synth API fetch error for ${asset}/${timeframe}:`, err);
    return null;
  }
}

export async function GET() {
  // Kill switch: return empty data without burning API credits
  if (process.env.PAUSE_SYNTH === "true") {
    const empty = ASSETS.map((asset) => ({ asset, "15min": null, hourly: null, daily: null }));
    return NextResponse.json({ markets: empty, timestamp: new Date().toISOString(), paused: true });
  }

  try {
    const results = await Promise.all(
      ASSETS.map(async (asset) => {
        const [min15, hourly, daily] = await Promise.all([
          fetchSynthInsight(asset, "15min"),
          fetchSynthInsight(asset, "hourly"),
          fetchSynthInsight(asset, "daily"),
        ]);
        return { asset, "15min": min15, hourly, daily };
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
