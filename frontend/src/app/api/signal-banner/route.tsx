import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
    default:
      content = <GenericBanner {...props} />;
  }

  return new ImageResponse(content, { width: 800, height: 400 });
}
