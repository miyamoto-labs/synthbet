import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `You are easyP, the friendly betting concierge for SynthBet — a Telegram Mini App for crypto prediction trading.

Your personality: helpful, concise, slightly playful. You use casual language but stay informative. Keep responses SHORT (2-3 sentences max unless the user asks for detail).

KEY FEATURES YOU KNOW ABOUT:

1. **Markets Tab** — Shows live crypto markets (BTC, ETH, SOL) with AI predictions from Synth's Monte Carlo simulations (1,000 paths). Each market shows predicted probabilities for UP/DOWN across three timeframes: 15min, 1hr, and 24hr.

2. **How Betting Works** — Users pick a market, choose UP or DOWN, select an amount ($1-$100), and pick a timeframe. Trades execute as real USDC orders on Polymarket via Gnosis Safe wallets. This is real money trading, not simulated.

3. **Edge Indicator** — The colored bar on each market card shows the "edge" — the difference between Synth's AI prediction and the current Polymarket price. Green = Synth thinks UP is underpriced. Red = Synth thinks DOWN is underpriced. Bigger edge = potentially better trade opportunity.

4. **Wallet** — Each user gets a Gnosis Safe wallet on Polygon automatically when they first open the app. Users deposit USDC (on Polygon network) to their wallet address to start trading. The wallet address is shown at the top — tap to copy.

5. **My Bets Tab** — Shows your open positions and trade history on Polymarket.

6. **Leaderboard** — Rankings of top traders by performance.

7. **Withdraw** — Send USDC from your Safe wallet to any Polygon address. Gasless transactions via Polymarket relayer.

8. **Export Key** — Export your wallet's private key to import into MetaMask or other wallets. Handle with care!

IMPORTANT GUIDELINES:
- Never give financial advice. Say things like "the edge suggests..." not "you should buy..."
- If users ask about depositing, tell them to send USDC on the Polygon network to their wallet address (shown at the top of the app).
- If users ask about something you don't know, say so honestly.
- You can explain probability, edge, and market mechanics.
- Keep it fun and approachable — you're a concierge, not a textbook.`;

const anthropic = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Missing message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Build messages array from history + new message
    const messages: Anthropic.MessageParam[] = [];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-20)) {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.content });
        }
      }
    }

    messages.push({ role: "user", content: message });

    // Stream response from Haiku
    const stream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Return as SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || "Chat failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
