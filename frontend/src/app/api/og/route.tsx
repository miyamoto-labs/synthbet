import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const title = searchParams.get("title") || "Signal Detected";
  const subtitle = searchParams.get("subtitle") || "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f4f2ee",
          backgroundImage:
            "radial-gradient(circle, #c8c4bc 0.8px, transparent 0.8px)",
          backgroundSize: "24px 24px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 60px",
          }}
        >
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#111111",
              letterSpacing: "-2px",
              lineHeight: 1,
            }}
          >
            SynthBet
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#111111",
              marginTop: 24,
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 20,
                color: "#6b6b6b",
                marginTop: 12,
                textAlign: "center",
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    ),
    {
      width: 800,
      height: 400,
    }
  );
}
