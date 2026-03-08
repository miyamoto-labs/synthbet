import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAMMA_URL = "https://gamma-api.polymarket.com";

// Exclude crypto markets (we already show those via Synth)
const EXCLUDE_PATTERNS = [
  /will (bitcoin|btc|ethereum|eth|solana|sol).*(up|down|above|below)/i,
  /up-?down/i,
  /price of (bitcoin|btc|ethereum|eth|solana|sol)/i,
  /will bitcoin/i,
  /will ethereum/i,
  /will solana/i,
  /btc.*\$\d/i,
  /eth.*\$\d/i,
];

export type FeaturedMarket = {
  slug: string;
  question: string;
  image: string;
  endDate: string;
  volume: number;
  liquidity: number;
  yesPrice: number;
  noPrice: number;
  clobTokenIds: string[];
  conditionId: string;
  // Labels for the two sides (e.g., "Celtics" / "Cavaliers" or "Yes" / "No")
  yesLabel: string;
  noLabel: string;
  // For head-to-head markets, the NO side is a separate market slug
  noSlug: string | null;
};

// Try to detect head-to-head sports markets from the question
// e.g., "Celtics vs. Cavaliers", "India vs New Zealand"
function parseVsMatch(question: string): { teamA: string; teamB: string } | null {
  const match = question.match(/^(.+?)\s+vs\.?\s+(.+?)$/i);
  if (!match) return null;
  return { teamA: match[1].trim(), teamB: match[2].trim() };
}

async function fetchTrendingMarkets(): Promise<FeaturedMarket[]> {
  try {
    // Fetch individual markets sorted by 24h volume
    const res = await fetch(
      `${GAMMA_URL}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=50`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      console.error("[Featured] Gamma markets fetch failed:", res.status);
      return [];
    }

    const allMarkets = await res.json();
    const results: FeaturedMarket[] = [];
    // Track event slugs we've already added to avoid duplicates from same event
    const seenEvents = new Set<string>();

    for (const m of allMarkets) {
      const question = m.question || "";

      // Skip crypto markets
      if (EXCLUDE_PATTERNS.some((p) => p.test(question))) continue;
      if (EXCLUDE_PATTERNS.some((p) => p.test(m.groupItemTitle || ""))) continue;

      // Skip spread/over-under/prop bet sub-markets — keep main outcomes only
      if (/O\/U\s/i.test(question)) continue;
      if (/spread/i.test(question)) continue;
      if (/over\/under/i.test(question)) continue;
      if (/total (kills|points|goals)/i.test(question)) continue;

      // Need CLOB token IDs
      const clobIds =
        typeof m.clobTokenIds === "string"
          ? JSON.parse(m.clobTokenIds)
          : m.clobTokenIds || [];
      if (clobIds.length < 2) continue;

      // Skip ended/resolved
      if (m.resolved || m.closed) continue;
      if (m.endDate) {
        const endMs = new Date(m.endDate).getTime();
        if (endMs <= Date.now()) continue;
      }

      const prices =
        typeof m.outcomePrices === "string"
          ? JSON.parse(m.outcomePrices)
          : m.outcomePrices || [];

      const yesPrice = parseFloat(prices[0] || "0.5");
      const noPrice = parseFloat(prices[1] || "0.5");

      // Skip settled markets (>92% one way)
      if (yesPrice > 0.92 || noPrice > 0.92) continue;

      const vol = parseFloat(m.volume24hr || m.volume || "0");

      // Deduplicate by event (avoid showing 5 markets from same sports event)
      const eventSlug = m.eventSlug || m.slug;
      if (seenEvents.has(eventSlug)) continue;
      seenEvents.add(eventSlug);

      // Determine labels
      let yesLabel = "Yes";
      let noLabel = "No";
      let noSlug: string | null = null;
      let displayQuestion = question;

      // Check if it's a "Team A vs Team B" style market
      const vsMatch = parseVsMatch(question);
      if (vsMatch) {
        // Head-to-head — use team names as labels
        yesLabel = vsMatch.teamA;
        noLabel = vsMatch.teamB;
        displayQuestion = question;
      } else {
        // Binary market — keep Yes / No
        yesLabel = "Yes";
        noLabel = "No";
      }

      results.push({
        slug: m.slug,
        question: displayQuestion,
        image: m.image || "",
        endDate: m.endDate || "",
        volume: vol,
        liquidity: parseFloat(m.liquidity || "0"),
        yesPrice,
        noPrice,
        clobTokenIds: clobIds,
        conditionId: m.conditionId || "",
        yesLabel,
        noLabel,
        noSlug,
      });

      if (results.length >= 10) break;
    }

    return results;
  } catch (err) {
    console.error("[Featured] Error fetching markets:", err);
    return [];
  }
}

export async function GET() {
  const markets = await fetchTrendingMarkets();
  return NextResponse.json({ markets }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
  });
}
