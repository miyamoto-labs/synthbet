"use client";

export function ProbabilityBar({
  synthProb,
  polyProb,
  label,
}: {
  synthProb: number;
  polyProb: number;
  label: string;
}) {
  const synthPct = Math.round(synthProb * 100);
  const polyPct = Math.round(polyProb * 100);
  const edge = synthPct - polyPct;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        {edge !== 0 && (
          <span
            className={`font-bold font-mono ${
              Math.abs(edge) >= 5 ? "text-edge" : "text-muted"
            }`}
          >
            {edge > 0 ? "+" : ""}
            {edge}% edge
          </span>
        )}
      </div>

      {/* Label row */}
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-edge font-bold">Synth {synthPct}%</span>
        <span className="text-muted">Polymarket {polyPct}%</span>
      </div>

      {/* Single edge bar */}
      <div className="h-2.5 bg-ink/8 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${synthPct}%`,
            background: synthPct >= 50
              ? `linear-gradient(90deg, #00e676, #00c853)`
              : `linear-gradient(90deg, #ff3d57, #e53935)`,
          }}
        />
      </div>
    </div>
  );
}
