import { NextResponse } from "next/server";

const SYNTH_API_KEY = process.env.SYNTH_API_KEY!;
const SYNTH_BASE_URL = "https://api.synthdata.co";
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://frontend-three-phi-40.vercel.app").trim();
const EDGE_THRESHOLD = 10; // notify on edge (10%+)
const ASSETS = ["BTC", "ETH", "SOL"] as const;
const TIMEFRAMES = ["15min", "hourly", "daily"] as const;
const CRON_SECRET = process.env.CRON_SECRET;

type Insight = {
  slug: string;
  current_price: number;
  synth_probability_up: number;
  polymarket_probability_up: number;
  synth_outcome: "Up" | "Down";
  event_start_time: string;
  event_end_time: string;
};

async function fetchInsight(asset: string, timeframe: string): Promise<Insight | null> {
  try {
    const res = await fetch(
      `${SYNTH_BASE_URL}/insights/polymarket/up-down/${timeframe}?asset=${asset}`,
      {
        headers: { Authorization: `Apikey ${SYNTH_API_KEY}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.message === "string") {
      try { return JSON.parse(data.message); } catch { return null; }
    }
    return data;
  } catch {
    return null;
  }
}

function formatPrice(price: number): string {
  return price >= 1000
    ? `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${price.toFixed(2)}`;
}

function tfLabel(tf: string): string {
  if (tf === "15min") return "15m";
  if (tf === "hourly") return "1h";
  return tf;
}

async function sendTelegramPhoto(imageUrl: string, caption: string, appUrl: string) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      photo: imageUrl,
      caption,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [{ text: "Open Déja.", web_app: { url: appUrl } }],
        ],
      },
    }),
  });
  return res.json();
}

export async function GET(req: Request) {
  // Protect with cron secret
  const authHeader = req.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BOT_TOKEN || !CHAT_ID) {
    return NextResponse.json(
      { error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID" },
      { status: 500 }
    );
  }

  // Fire-and-forget: resolve pending bets
  fetch(`${APP_URL}/api/resolve`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  }).catch(() => {});


  // Fetch all insights
  const signals: {
    asset: string;
    timeframe: string;
    absEdge: number;
    tradeDirection: "UP" | "DOWN";
    synthPct: number;
    polyPct: number;
    price: string;
    strength: string;
    slug: string;
    entryPrice: number;
    window: string;
  }[] = [];

  await Promise.all(
    ASSETS.map(async (asset) => {
      const insights = await Promise.all(
        TIMEFRAMES.map((tf) => fetchInsight(asset, tf))
      );

      for (let i = 0; i < TIMEFRAMES.length; i++) {
        const insight = insights[i];
        if (!insight) continue;

        // Edge = Synth UP prob - Polymarket UP prob
        // Positive edge → UP is underpriced → bet UP
        // Negative edge → DOWN is underpriced → bet DOWN
        const edge = (insight.synth_probability_up - insight.polymarket_probability_up) * 100;
        const absEdge = Math.abs(edge);

        if (absEdge >= EDGE_THRESHOLD) {
          // Guard 1: Require event_end_time — skip signals without it
          if (!insight.event_end_time) {
            console.log(`[Notify] Skipping ${asset} ${TIMEFRAMES[i]}: missing event_end_time`);
            continue;
          }

          // Guard 2: Skip if market window has expired or nearly expired
          // 15min markets: need 5+ min remaining, hourly/daily: need 15+ min
          const msRemaining = new Date(insight.event_end_time).getTime() - Date.now();
          const minRequired = TIMEFRAMES[i] === "15min" ? 5 * 60_000 : 15 * 60_000;
          if (msRemaining < minRequired) {
            console.log(`[Notify] Skipping ${asset} ${TIMEFRAMES[i]}: only ${Math.round(msRemaining / 60000)}m remaining (need ${minRequired / 60000}m)`);
            continue;
          }

          // Guard 3: Skip if market window started too long ago (stale data from API)
          // Catches cases where API returns old windows even if end_time hasn't passed
          if (insight.event_start_time) {
            const msSinceStart = Date.now() - new Date(insight.event_start_time).getTime();
            const maxAge = TIMEFRAMES[i] === "15min" ? 20 * 60_000
                         : TIMEFRAMES[i] === "hourly" ? 75 * 60_000
                         : 36 * 60 * 60_000; // daily: 36h max
            if (msSinceStart > maxAge) {
              console.log(`[Notify] Skipping ${asset} ${TIMEFRAMES[i]}: started ${Math.round(msSinceStart / 60000)}m ago (stale)`);
              continue;
            }
          }

          const tradeDirection = edge > 0 ? "UP" : "DOWN";
          // Format market window times (e.g., "14:00–14:15")
          const startTime = insight.event_start_time
            ? new Date(insight.event_start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
            : "";
          const endTime = insight.event_end_time
            ? new Date(insight.event_end_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })
            : "";
          const window = startTime && endTime ? `${startTime}–${endTime} UTC` : "";

          signals.push({
            asset,
            timeframe: tfLabel(TIMEFRAMES[i]),
            absEdge,
            tradeDirection,
            synthPct: Math.round(insight.synth_probability_up * 100),
            polyPct: Math.round(insight.polymarket_probability_up * 100),
            price: formatPrice(insight.current_price),
            strength: absEdge >= 25 ? "Strong" : "Moderate",
            slug: insight.slug,
            entryPrice: insight.current_price,
            window,
          });
        }
      }
    })
  );

  // Test mode: send a fake signal to verify Telegram works
  const isTest = new URL(req.url).searchParams.get("test") === "true";
  if (isTest) {
    signals.push({
      asset: "BTC",
      timeframe: "15m",
      absEdge: 22,
      tradeDirection: "UP",
      synthPct: 68,
      polyPct: 46,
      price: "$104,250",
      strength: "Moderate",
      slug: "test",
      entryPrice: 104250,
      window: "14:00–14:15 UTC",
    });
  }

  if (signals.length === 0) {
    return NextResponse.json({ sent: false, reason: "No edges above 10% threshold" });
  }

  // Sort by edge strength descending
  signals.sort((a, b) => b.absEdge - a.absEdge);

  // Build message
  const lines = signals.map(
    (s) =>
      `<b>${s.tradeDirection === "UP" ? "🟢" : "🔴"} ${s.asset} (${s.timeframe}) — Bet ${s.tradeDirection}</b>\n` +
      (s.window ? `Market: ${s.window}\n` : "") +
      `Synth: ${s.synthPct}% UP vs Market: ${s.polyPct}% UP\n` +
      `Edge: <b>${s.absEdge.toFixed(0)}%</b> ${s.strength} · ${s.price}`
  );

  const caption =
    `⚡ <b>Déja. Edge Alert — ${signals.length} trade signal${signals.length > 1 ? "s" : ""}</b>\n\n` +
    lines.join("\n\n") +
    `\n\n<i>Powered by Synth Monte Carlo · Real USDC on Polymarket</i>`;

  // Static banner hosted on GitHub (Vercel URLs are auth-protected)
  const bannerUrl = `https://raw.githubusercontent.com/miyamoto-labs/synthbet/main/frontend/public/banner-signal.png`;

  // Deep-link to the strongest signal with original signal data
  const top = signals[0];
  const signalParams = new URLSearchParams({
    asset: top.asset,
    tf: top.timeframe,
    edge: top.absEdge.toFixed(0),
    dir: top.tradeDirection,
    synthPct: top.synthPct.toString(),
    polyPct: top.polyPct.toString(),
    slug: top.slug,
    entryPrice: top.entryPrice.toString(),
    ts: Date.now().toString(),
  });
  const deepLinkUrl = `${APP_URL}?${signalParams.toString()}`;

  const result = await sendTelegramPhoto(bannerUrl, caption, deepLinkUrl);

  return NextResponse.json({ sent: true, signals: signals.length, telegram: result });
}
