"use client";

import { useEffect, useState } from "react";

type DataPoint = { t: number; p: number };

type ProbChartProps = {
  slug: string | null;
  synthProb: number; // 0-1
  label: string;
};

const CHART_W = 320;
const CHART_H = 120;
const PAD_L = 32;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 20;
const PLOT_W = CHART_W - PAD_L - PAD_R;
const PLOT_H = CHART_H - PAD_T - PAD_B;

function toPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function ProbChart({ slug, synthProb, label }: ProbChartProps) {
  const [history, setHistory] = useState<DataPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);

    fetch(`/api/synth/price-history?slug=${encodeURIComponent(slug)}&interval=6h&fidelity=5`)
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.json();
      })
      .then((data) => {
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
          setHistory(data.history);
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (error) return null;

  if (!slug || loading) {
    return (
      <div className="h-[120px] bg-ink/3 rounded-xl flex items-center justify-center">
        <span className="text-[10px] text-muted font-mono">
          {loading ? "Loading chart..." : "No chart data"}
        </span>
      </div>
    );
  }

  if (!history || history.length < 2) {
    return null;
  }

  // Map data to SVG coordinates
  const minT = history[0].t;
  const maxT = history[history.length - 1].t;
  const tRange = maxT - minT || 1;

  // Y axis: probability 0-1, but zoom to data range for better visibility
  const probs = history.map((d) => d.p);
  const minP = Math.max(0, Math.min(...probs, synthProb) - 0.05);
  const maxP = Math.min(1, Math.max(...probs, synthProb) + 0.05);
  const pRange = maxP - minP || 0.1;

  const toX = (t: number) => PAD_L + ((t - minT) / tRange) * PLOT_W;
  const toY = (p: number) => PAD_T + (1 - (p - minP) / pRange) * PLOT_H;

  const polyPoints = history.map((d) => ({ x: toX(d.t), y: toY(d.p) }));
  const linePath = toPath(polyPoints);

  // Area fill under line
  const areaPath =
    linePath +
    ` L${polyPoints[polyPoints.length - 1].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)}` +
    ` L${polyPoints[0].x.toFixed(1)},${(PAD_T + PLOT_H).toFixed(1)} Z`;

  // Synth probability line (horizontal)
  const synthY = toY(synthProb);

  // Current market probability (last point)
  const lastPoint = history[history.length - 1];
  const currentProb = lastPoint.p;

  // Y axis labels
  const yTicks = [minP, minP + pRange / 2, maxP];

  // X axis: start and end times
  const xLabels = [
    { t: history[0].t, x: toX(history[0].t) },
    { t: history[history.length - 1].t, x: toX(history[history.length - 1].t) },
  ];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-muted font-semibold">{label}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-[#627eea] rounded-full inline-block" />
            <span className="text-[9px] text-muted">Market {(currentProb * 100).toFixed(0)}%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-0.5 bg-[#f7931a] rounded-full inline-block" />
            <span className="text-[9px] text-muted">Synth {(synthProb * 100).toFixed(0)}%</span>
          </span>
        </div>
      </div>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid lines */}
        {yTicks.map((p) => (
          <line
            key={p}
            x1={PAD_L}
            y1={toY(p)}
            x2={CHART_W - PAD_R}
            y2={toY(p)}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeWidth={0.5}
          />
        ))}

        {/* Y axis labels */}
        {yTicks.map((p) => (
          <text
            key={`label-${p}`}
            x={PAD_L - 4}
            y={toY(p) + 3}
            textAnchor="end"
            className="fill-muted"
            fontSize={8}
            fontFamily="monospace"
          >
            {(p * 100).toFixed(0)}%
          </text>
        ))}

        {/* X axis labels */}
        {xLabels.map((l, i) => (
          <text
            key={i}
            x={l.x}
            y={CHART_H - 2}
            textAnchor={i === 0 ? "start" : "end"}
            className="fill-muted"
            fontSize={8}
            fontFamily="monospace"
          >
            {formatTime(l.t)}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="#627eea" fillOpacity={0.08} />

        {/* Market probability line */}
        <path
          d={linePath}
          fill="none"
          stroke="#627eea"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Synth probability line (dashed) */}
        <line
          x1={PAD_L}
          y1={synthY}
          x2={CHART_W - PAD_R}
          y2={synthY}
          stroke="#f7931a"
          strokeWidth={1}
          strokeDasharray="4,3"
          strokeOpacity={0.8}
        />

        {/* Current price dot */}
        <circle
          cx={toX(lastPoint.t)}
          cy={toY(lastPoint.p)}
          r={3}
          fill="#627eea"
          stroke="white"
          strokeWidth={1}
        />

        {/* Synth dot on right edge */}
        <circle
          cx={CHART_W - PAD_R}
          cy={synthY}
          r={2.5}
          fill="#f7931a"
          stroke="white"
          strokeWidth={1}
        />
      </svg>
    </div>
  );
}
