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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-tg-hint">
        <span>{label}</span>
        {edge !== 0 && (
          <span
            className={`font-bold ${
              Math.abs(edge) >= 5 ? "text-edge" : "text-tg-hint"
            }`}
          >
            {edge > 0 ? "+" : ""}
            {edge}% edge
          </span>
        )}
      </div>

      {/* Synth bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-tg-link font-medium">Synth</span>
          <span className="font-mono">{synthPct}% UP</span>
        </div>
        <div className="h-2.5 bg-tg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${synthPct}%`,
              background: `linear-gradient(90deg, #00d48a ${Math.min(synthPct, 50)}%, #ff4757 100%)`,
            }}
          />
        </div>
      </div>

      {/* Polymarket bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px]">
          <span className="text-tg-hint">Polymarket</span>
          <span className="font-mono text-tg-hint">{polyPct}% UP</span>
        </div>
        <div className="h-2 bg-tg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-tg-hint/40 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${polyPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
