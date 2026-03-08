import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAMMA_URL = "https://gamma-api.polymarket.com";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Exclude crypto up/down markets (shown via Synth)
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
  category: string;
  description: string;
  yesLabel: string;
  noLabel: string;
  noSlug: string | null;
  convictionScore?: number;
  tier?: string;
  reasoning?: string;
};

function normalizeCategory(raw: string, question: string): string {
  const lower = (raw || "").toLowerCase();
  const q = (question || "").toLowerCase();

  // Sports
  if (lower.includes("sport") || lower.includes("nba") || lower.includes("nfl") || lower.includes("mlb") || lower.includes("soccer") || lower.includes("mma") || lower.includes("ufc") || lower.includes("nhl") || lower.includes("epl") || lower.includes("f1") || lower.includes("tennis") || lower.includes("golf") || lower.includes("boxing") || lower.includes("racing") || lower.includes("atp") || lower.includes("wta")) return "Sports";
  if (/\bvs\.?\s/i.test(q) && !q.includes("roe v")) return "Sports";

  // Politics & World
  if (lower.includes("politic") || lower.includes("elect") || lower.includes("geopolit")) return "Politics";
  if (/trump|biden|congress|president|senate|governor|republican|democrat|white house|executive order|legislation|impeach|cabinet|supreme court/i.test(q)) return "Politics";
  if (/iran|israel|ukraine|russia|nato|ceasefire|war |military|invasion|strike |houthi|cuba|taiwan|china|regime|sanctions|tariff/i.test(q)) return "Politics";

  // Crypto
  if (lower.includes("crypto") || lower.includes("bitcoin") || lower.includes("defi") || lower.includes("nft")) return "Crypto";
  if (/bitcoin|btc|ethereum|eth|solana|sol|crypto|blockchain|defi|token|airdrop|halving|memecoin|doge|xrp|microstrategy/i.test(q)) return "Crypto";

  // Finance
  if (lower.includes("finance") || lower.includes("econ") || lower.includes("business")) return "Finance";
  if (/fed |interest rate|inflation|gdp|s&p|nasdaq|dow |crude oil|gold price|stock|ipo|earnings|recession|unemployment/i.test(q)) return "Finance";

  // Entertainment & Pop Culture
  if (lower.includes("pop culture") || lower.includes("entertainment") || lower.includes("celeb") || lower.includes("movie") || lower.includes("music") || lower.includes("award") || lower.includes("gaming")) return "Entertainment";
  if (/gta|album|movie|oscar|grammy|emmy|netflix|spotify|youtube|tiktok|elon musk|tweet|rihanna|drake|taylor swift|carti|playboi/i.test(q)) return "Entertainment";

  // Tech & Science
  if (lower.includes("science") || lower.includes("tech") || lower.includes("space")) return "Tech";
  if (/\bai\b|openai|google|apple|tesla|spacex|nasa|launch|fda|climate|weather/i.test(q)) return "Tech";

  return "Other";
}

function parseVsMatch(question: string): { teamA: string; teamB: string } | null {
  const match = question.match(/^(.+?)\s+vs\.?\s+(.+?)$/i);
  if (!match) return null;
  return { teamA: match[1].trim(), teamB: match[2].trim() };
}

// Parse a Gamma market into a FeaturedMarket (shared logic)
function parseGammaMarket(
  m: any,
  seenEvents: Set<string>,
  scannerData?: { convictionScore: number; tier: string; reasoning: string }
): FeaturedMarket | null {
  const question = m.question || "";

  if (EXCLUDE_PATTERNS.some((p) => p.test(question))) return null;
  if (EXCLUDE_PATTERNS.some((p) => p.test(m.groupItemTitle || ""))) return null;
  if (/O\/U\s/i.test(question)) return null;
  if (/spread/i.test(question)) return null;
  if (/over\/under/i.test(question)) return null;
  if (/total (kills|points|goals)/i.test(question)) return null;

  const clobIds =
    typeof m.clobTokenIds === "string"
      ? JSON.parse(m.clobTokenIds)
      : m.clobTokenIds || [];
  if (clobIds.length < 2) return null;

  if (m.resolved || m.closed) return null;
  if (m.endDate && new Date(m.endDate).getTime() <= Date.now()) return null;

  const prices =
    typeof m.outcomePrices === "string"
      ? JSON.parse(m.outcomePrices)
      : m.outcomePrices || [];
  const yesPrice = parseFloat(prices[0] || "0.5");
  const noPrice = parseFloat(prices[1] || "0.5");
  if (yesPrice > 0.92 || noPrice > 0.92) return null;

  const eventSlug = m.eventSlug || m.slug;
  if (seenEvents.has(eventSlug)) return null;
  seenEvents.add(eventSlug);

  const vol = parseFloat(m.volume24hr || m.volume || "0");

  let yesLabel = "Yes";
  let noLabel = "No";
  const vsMatch = parseVsMatch(question);
  if (vsMatch) {
    yesLabel = vsMatch.teamA;
    noLabel = vsMatch.teamB;
  }

  return {
    slug: m.slug,
    question,
    description: (m.description || scannerData?.reasoning || "").slice(0, 120),
    image: m.image || "",
    endDate: m.endDate || "",
    volume: vol,
    liquidity: parseFloat(m.liquidity || "0"),
    yesPrice,
    noPrice,
    clobTokenIds: clobIds,
    conditionId: m.conditionId || "",
    category: normalizeCategory(m.groupItemTitle || m.category || "", question),
    yesLabel,
    noLabel,
    noSlug: null,
    ...(scannerData && {
      convictionScore: scannerData.convictionScore,
      tier: scannerData.tier,
      reasoning: scannerData.reasoning,
    }),
  };
}

export async function GET() {
  try {
    // Step 1: Fetch scanner picks from Supabase (ranked by conviction)
    const { data: picks } = await supabase
      .from("ep_curated_picks")
      .select("slug, conviction_score, tier, reasoning")
      .eq("status", "active")
      .order("conviction_score", { ascending: false })
      .limit(100);

    // Build a lookup map: slug → scanner data
    const scannerMap = new Map<string, { convictionScore: number; tier: string; reasoning: string }>();
    for (const p of picks || []) {
      if (p.slug) {
        scannerMap.set(p.slug, {
          convictionScore: p.conviction_score,
          tier: p.tier,
          reasoning: p.reasoning,
        });
      }
    }

    console.log(`[Featured] ${scannerMap.size} scanner picks loaded`);

    // Step 2: Fetch markets from Gamma — two batches for coverage
    const [volRes, liqRes] = await Promise.all([
      fetch(`${GAMMA_URL}/markets?active=true&closed=false&order=volume24hr&ascending=false&limit=500`, { cache: "no-store" }),
      fetch(`${GAMMA_URL}/markets?active=true&closed=false&order=liquidityNum&ascending=false&limit=200`, { cache: "no-store" }),
    ]);

    if (!volRes.ok) {
      console.error("[Featured] Gamma fetch failed:", volRes.status);
      return NextResponse.json({ markets: [], source: "error" }, { status: 500 });
    }

    const volMarkets = await volRes.json();
    const liqMarkets = liqRes.ok ? await liqRes.json() : [];

    // Merge and deduplicate by slug
    const slugSeen = new Set<string>();
    const allGammaMarkets: any[] = [];
    for (const m of [...volMarkets, ...liqMarkets]) {
      if (!m.slug || slugSeen.has(m.slug)) continue;
      slugSeen.add(m.slug);
      allGammaMarkets.push(m);
    }

    // Step 3: Parse all Gamma markets, tagging scanner picks with scores
    const seenEvents = new Set<string>();
    const scannerMatched: FeaturedMarket[] = [];
    const volumeOnly: FeaturedMarket[] = [];

    for (const m of allGammaMarkets) {
      const scannerData = scannerMap.get(m.slug);
      const parsed = parseGammaMarket(m, seenEvents, scannerData || undefined);
      if (!parsed) continue;

      if (scannerData) {
        scannerMatched.push(parsed);
      } else {
        volumeOnly.push(parsed);
      }
    }

    // Step 4: Merge — scanner picks first (sorted by conviction), then volume backfill
    scannerMatched.sort((a, b) => (b.convictionScore || 0) - (a.convictionScore || 0));
    const markets = [...scannerMatched, ...volumeOnly].slice(0, 100);

    const source = scannerMatched.length > 0 ? "scanner+gamma" : "gamma";
    console.log(`[Featured] Returning ${markets.length} markets (${scannerMatched.length} scanner, ${volumeOnly.length} volume)`);

    return NextResponse.json(
      { markets, source },
      { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch (err) {
    console.error("[Featured] Error:", err);
    return NextResponse.json({ markets: [], source: "error" }, { status: 500 });
  }
}
