import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/* ── Déja. brand palette ─────────────────────────────── */
const C = {
  bg: "#1C1611",
  card: "#2C1F14",
  amber: "#C8843A",
  amberLight: "#E4A95A",
  muted: "#C4A882",
  ink: "#FFFFFF",
  up: "#00e676",
  upDark: "#00c853",
  down: "#ff3d57",
  gold: "#E4A95A",
  brownMid: "#5C3D22",
};

/* ── Shared logo component ───────────────────────────── */
function Logo({ size = 48 }: { size?: number }) {
  return (
    <div
      style={{
        fontSize: size,
        fontWeight: 700,
        color: C.ink,
        letterSpacing: "-1.5px",
        lineHeight: 1,
        display: "flex",
        alignItems: "baseline",
      }}
    >
      Déja<span style={{ color: C.amber }}>.</span>
    </div>
  );
}

/* ── Decorative accent bar ───────────────────────────── */
function AccentBar({ color, width = 60 }: { color: string; width?: number }) {
  return (
    <div
      style={{
        width,
        height: 3,
        borderRadius: 2,
        background: color,
        display: "flex",
      }}
    />
  );
}

/* ── Banner type renderers ───────────────────────────── */

function EdgeBanner({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Top amber accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${C.amber}, transparent)`,
          display: "flex",
        }}
      />
      {/* Subtle corner accents */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 30,
          width: 24,
          height: 24,
          borderLeft: `2px solid ${C.amber}40`,
          borderTop: `2px solid ${C.amber}40`,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 20,
          right: 30,
          width: 24,
          height: 24,
          borderRight: `2px solid ${C.amber}40`,
          borderBottom: `2px solid ${C.amber}40`,
          display: "flex",
        }}
      />

      <Logo size={42} />
      <div style={{ marginTop: 8, display: "flex" }}>
        <AccentBar color={C.amber} width={40} />
      </div>
      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          color: C.ink,
          marginTop: 20,
          textAlign: "center",
          lineHeight: 1.2,
          display: "flex",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 18,
            color: C.muted,
            marginTop: 10,
            textAlign: "center",
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}
      {/* Bottom tagline */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          fontSize: 12,
          color: C.brownMid,
          letterSpacing: "2px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        AI Edge Detection · Polymarket
      </div>
    </div>
  );
}

function SportsBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Green accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${C.up}, transparent)`,
          display: "flex",
        }}
      />

      <Logo size={36} />
      <div style={{ marginTop: 12, display: "flex" }}>
        <AccentBar color={C.up} width={40} />
      </div>

      {/* Main title */}
      <div
        style={{
          fontSize: 40,
          fontWeight: 800,
          color: C.ink,
          marginTop: 20,
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 18,
            color: C.muted,
            marginTop: 12,
            textAlign: "center",
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 20,
          fontSize: 12,
          color: C.brownMid,
          letterSpacing: "2px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        Prediction Markets · Polymarket
      </div>
    </div>
  );
}

function LeaderboardBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Gold accent line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${C.gold}, transparent)`,
          display: "flex",
        }}
      />

      <Logo size={36} />
      <div style={{ marginTop: 12, display: "flex" }}>
        <AccentBar color={C.gold} width={40} />
      </div>

      {/* Rank decoration */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginTop: 24,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: `${C.gold}20`,
            border: `1.5px solid ${C.gold}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          🥇
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: C.ink,
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: "-0.5px",
            textTransform: "uppercase",
            display: "flex",
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            background: `${C.gold}20`,
            border: `1.5px solid ${C.gold}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
          }}
        >
          🥇
        </div>
      </div>

      {subtitle && (
        <div
          style={{
            fontSize: 18,
            color: C.gold,
            marginTop: 12,
            textAlign: "center",
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 20,
          fontSize: 12,
          color: C.brownMid,
          letterSpacing: "2px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        Top Traders · Déja.
      </div>
    </div>
  );
}

function MarketsBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        fontFamily: "system-ui, sans-serif",
        position: "relative",
      }}
    >
      {/* Amber gradient accent */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${C.amberLight}, transparent)`,
          display: "flex",
        }}
      />

      <Logo size={36} />
      <div style={{ marginTop: 12, display: "flex" }}>
        <AccentBar color={C.amberLight} width={40} />
      </div>

      {/* Category pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 20,
        }}
      >
        {["Crypto", "Politics", "Sports", "Culture"].map((cat) => (
          <div
            key={cat}
            style={{
              padding: "4px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              color: C.muted,
              background: C.card,
              border: `1px solid ${C.brownMid}`,
              display: "flex",
            }}
          >
            {cat}
          </div>
        ))}
      </div>

      <div
        style={{
          fontSize: 38,
          fontWeight: 800,
          color: C.ink,
          marginTop: 16,
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: "-0.5px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 18,
            color: C.muted,
            marginTop: 10,
            textAlign: "center",
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 20,
          fontSize: 12,
          color: C.brownMid,
          letterSpacing: "2px",
          textTransform: "uppercase",
          display: "flex",
        }}
      >
        80+ Markets · Polymarket
      </div>
    </div>
  );
}

function GenericBanner({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <Logo size={56} />
      <div style={{ marginTop: 10, display: "flex" }}>
        <AccentBar color={C.amber} width={40} />
      </div>
      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          color: C.ink,
          marginTop: 24,
          textAlign: "center",
          lineHeight: 1.2,
          display: "flex",
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 20,
            color: C.muted,
            marginTop: 12,
            textAlign: "center",
            display: "flex",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

/* ── Route handler ───────────────────────────────────── */

/**
 * Dynamic OG banner generator for Telegram notifications.
 *
 * Query params:
 *   type     = edge | sports | leaderboard | markets | generic  (default: generic)
 *   title    = main heading text
 *   subtitle = secondary text
 *
 * Examples:
 *   /api/og?type=edge&title=2 Edge Signals&subtitle=BTC UP · ETH DOWN
 *   /api/og?type=sports&title=Sports Markets Today&subtitle=UEFA Champions League
 *   /api/og?type=leaderboard&title=Top Traders&subtitle=This Week's Best
 *   /api/og?type=markets&title=Hot Markets&subtitle=12 Trending Now
 *   /api/og?title=Welcome to Déja.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get("type") || "generic";
  const title = searchParams.get("title") || "Signal Detected";
  const subtitle = searchParams.get("subtitle") || "";

  const props = { title, subtitle };

  let content;
  switch (type) {
    case "edge":
      content = <EdgeBanner {...props} />;
      break;
    case "sports":
      content = <SportsBanner {...props} />;
      break;
    case "leaderboard":
      content = <LeaderboardBanner {...props} />;
      break;
    case "markets":
      content = <MarketsBanner {...props} />;
      break;
    default:
      content = <GenericBanner {...props} />;
  }

  return new ImageResponse(content, { width: 800, height: 400 });
}
