"use client";

import { useState } from "react";
import { haptic } from "@/lib/telegram";

const STEPS = [
  {
    title: "AI vs Market",
    body: "Synth runs 1,000 Monte Carlo simulations on BTC, ETH & SOL every 15 minutes. When it disagrees with Polymarket's odds, that's your edge.",
    visual: (
      <div className="flex items-center justify-center gap-4 py-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-up/15 flex items-center justify-center text-2xl font-bold font-mono text-up-dark mb-1.5">
            68%
          </div>
          <div className="text-[10px] text-muted font-medium">Synth</div>
        </div>
        <div className="text-muted text-lg font-mono">vs</div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-down/15 flex items-center justify-center text-2xl font-bold font-mono text-down mb-1.5">
            52%
          </div>
          <div className="text-[10px] text-muted font-medium">Market</div>
        </div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-edge/15 flex items-center justify-center text-lg font-bold font-mono text-edge mb-1.5">
            +16%
          </div>
          <div className="text-[10px] text-muted font-medium">Edge</div>
        </div>
      </div>
    ),
  },
  {
    title: "Pick Your Side",
    body: "Tap UP or DOWN, then choose your bet size. Kelly Criterion recommends the optimal amount based on your edge and bankroll.",
    visual: (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="grid grid-cols-2 gap-3 w-48">
          <div className="py-3 rounded-xl bg-up text-ink text-center text-sm font-bold shadow-sm">
            UP
          </div>
          <div className="py-3 rounded-xl bg-down/90 text-white text-center text-sm font-bold shadow-sm">
            DOWN
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 w-48">
          {[5, 10, 25, 50].map((a) => (
            <div key={a} className="py-1.5 rounded-lg bg-ink/5 text-ink text-center text-xs font-mono font-bold border border-ink/8">
              ${a}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "Watch It Live",
    body: "Real-time price from Hyperliquid, countdown to market close, sparkline charts. Win or lose — you'll know in minutes.",
    visual: (
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="bg-ink rounded-2xl px-6 py-5 text-center w-56">
          <div className="text-[10px] text-white/40 font-mono uppercase tracking-wider mb-1">Live Price</div>
          <div className="text-3xl font-bold font-mono text-up">$97,432</div>
          <div className="text-sm font-mono text-up mt-0.5">+0.34%</div>
          <div className="mt-3 flex justify-center gap-1">
            {[20, 35, 25, 40, 30, 45, 50, 42, 55].map((h, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full bg-up/60"
                style={{ height: h * 0.6 }}
              />
            ))}
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-3">04:32</div>
          <div className="text-[9px] text-white/40 font-mono uppercase">Time Left</div>
        </div>
      </div>
    ),
  },
  {
    title: "Real USDC",
    body: "Your bets are real trades on Polymarket via a Gnosis Safe wallet. Winnings auto-redeem to USDC. Deposit, trade, withdraw — all in-app.",
    visual: (
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="bg-card rounded-2xl px-5 py-4 w-52 text-center shadow-sm border border-ink/5">
          <div className="text-muted text-[10px] font-medium">Your Balance</div>
          <div className="text-3xl font-bold font-mono text-ink mt-1">$142.50</div>
          <div className="text-[10px] text-up-dark font-bold font-mono mt-0.5">+$42.50 profit</div>
        </div>
        <div className="flex gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-ink/5 text-[10px] font-semibold text-muted border border-ink/8">
            Deposit
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-ink/5 text-[10px] font-semibold text-muted border border-ink/8">
            Withdraw
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-ink/5 text-[10px] font-semibold text-muted border border-ink/8">
            Export Key
          </div>
        </div>
      </div>
    ),
  },
];

type OnboardingProps = {
  onComplete: () => void;
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function next() {
    haptic("light");
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }

  function skip() {
    haptic("light");
    onComplete();
  }

  return (
    <div className="fixed inset-0 bg-bg z-[60] flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-5 pt-5">
        <button
          onClick={skip}
          className="text-xs text-muted font-medium px-3 py-1.5 rounded-lg active:bg-ink/5"
        >
          Skip
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Visual */}
        <div className="animate-fade-up" key={step}>
          {current.visual}
        </div>

        {/* Text */}
        <div className="text-center mt-2 animate-fade-up" key={`text-${step}`}>
          <h2 className="text-2xl font-bold text-ink mb-2">{current.title}</h2>
          <p className="text-sm text-muted leading-relaxed max-w-xs">
            {current.body}
          </p>
        </div>
      </div>

      {/* Bottom */}
      <div className="px-6 pb-10 space-y-4">
        {/* Progress dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-ink" : "w-1.5 bg-ink/20"
              }`}
            />
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={next}
          className="w-full py-3.5 rounded-xl text-sm font-bold bg-ink text-white active:scale-[0.98] transition-transform"
        >
          {isLast ? "Start Trading" : "Next"}
        </button>
      </div>
    </div>
  );
}
