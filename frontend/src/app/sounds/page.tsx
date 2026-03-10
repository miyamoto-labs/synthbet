"use client";

import { warmUpAudio } from "@/lib/sounds";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

const sounds: { name: string; desc: string; play: () => void }[] = [
  {
    name: "Current Ka-Ching",
    desc: "What's deployed now — square+sawtooth metallic",
    play: () => {
      tone(3500, 0.06, "square", 0.2);
      tone(2200, 0.08, "sawtooth", 0.1);
      setTimeout(() => {
        tone(4200, 0.15, "square", 0.18);
        tone(5600, 0.2, "sine", 0.1);
        tone(3000, 0.12, "sawtooth", 0.06);
      }, 70);
    },
  },
  {
    name: "Coin Drop",
    desc: "Quick descending metallic bounce",
    play: () => {
      tone(6000, 0.04, "square", 0.15);
      setTimeout(() => tone(4500, 0.04, "square", 0.12), 40);
      setTimeout(() => tone(5500, 0.03, "square", 0.1), 70);
      setTimeout(() => tone(4800, 0.03, "square", 0.08), 95);
      setTimeout(() => tone(5200, 0.06, "square", 0.06), 115);
    },
  },
  {
    name: "Slot Machine",
    desc: "Bright triple ding like hitting jackpot",
    play: () => {
      tone(2600, 0.08, "square", 0.18);
      setTimeout(() => tone(2600, 0.08, "square", 0.18), 120);
      setTimeout(() => tone(3400, 0.15, "square", 0.2), 240);
    },
  },
  {
    name: "Cash Register",
    desc: "Mechanical click then bell ring",
    play: () => {
      // Click
      tone(800, 0.02, "sawtooth", 0.25);
      tone(200, 0.03, "square", 0.15);
      // Bell
      setTimeout(() => {
        tone(3800, 0.25, "sine", 0.2);
        tone(4800, 0.2, "sine", 0.08);
      }, 60);
    },
  },
  {
    name: "Power Up",
    desc: "Fast ascending sweep — game-style",
    play: () => {
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(400, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2000, c.currentTime + 0.15);
      g.gain.setValueAtTime(0.15, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.2);
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.2);
    },
  },
  {
    name: "Chip Toss",
    desc: "Poker chip tossed on the table",
    play: () => {
      tone(1800, 0.03, "sawtooth", 0.2);
      setTimeout(() => tone(2400, 0.05, "square", 0.15), 30);
      setTimeout(() => tone(1200, 0.04, "sawtooth", 0.08), 60);
    },
  },
  {
    name: "Swoosh + Ding",
    desc: "Whoosh then confirmation ding",
    play: () => {
      // Swoosh (noise-like via rapid frequency sweep)
      const c = getCtx();
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(4000, c.currentTime + 0.08);
      g.gain.setValueAtTime(0.1, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
      osc.connect(g).connect(c.destination);
      osc.start();
      osc.stop(c.currentTime + 0.1);
      // Ding
      setTimeout(() => {
        tone(2200, 0.2, "sine", 0.2);
        tone(3300, 0.15, "sine", 0.08);
      }, 100);
    },
  },
  {
    name: "Double Pop",
    desc: "Two quick pops — snappy and clean",
    play: () => {
      tone(1500, 0.04, "sine", 0.25);
      setTimeout(() => tone(2000, 0.06, "sine", 0.2), 80);
    },
  },
  {
    name: "Win Fanfare (current)",
    desc: "Ascending C-E-G-C arpeggio",
    play: () => {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.25, "sine", 0.15), i * 100);
      });
    },
  },
  {
    name: "Win — Big Fanfare",
    desc: "Triumphant with harmony",
    play: () => {
      [523, 659, 784].forEach((freq, i) => {
        setTimeout(() => {
          tone(freq, 0.3, "sine", 0.15);
          tone(freq * 1.5, 0.25, "sine", 0.06);
        }, i * 120);
      });
      setTimeout(() => {
        tone(1047, 0.5, "sine", 0.18);
        tone(1319, 0.4, "sine", 0.08);
        tone(1568, 0.35, "sine", 0.05);
      }, 360);
    },
  },
  {
    name: "Win — Retro",
    desc: "8-bit victory jingle",
    play: () => {
      const notes = [660, 660, 660, 880, 784, 880, 1047];
      const times = [0, 80, 160, 280, 400, 480, 600];
      const durs = [0.06, 0.06, 0.1, 0.1, 0.08, 0.1, 0.3];
      notes.forEach((freq, i) => {
        setTimeout(() => tone(freq, durs[i], "square", 0.12), times[i]);
      });
    },
  },
  {
    name: "Lose (current)",
    desc: "Descending triangle tones",
    play: () => {
      tone(400, 0.3, "triangle", 0.12);
      setTimeout(() => tone(300, 0.4, "triangle", 0.1), 200);
    },
  },
  {
    name: "Lose — Wah Wah",
    desc: "Classic sad trombone style",
    play: () => {
      const notes = [494, 466, 440, 370];
      notes.forEach((freq, i) => {
        setTimeout(() => tone(freq, 0.35, "triangle", 0.12), i * 250);
      });
    },
  },
  {
    name: "Countdown Tick",
    desc: "Plays in last 30s",
    play: () => { tone(1000, 0.05, "square", 0.08); },
  },
  {
    name: "Urgent Tick",
    desc: "Double-tick in last 10s",
    play: () => {
      tone(1200, 0.03, "square", 0.12);
      setTimeout(() => tone(1200, 0.03, "square", 0.1), 60);
    },
  },
];

export default function SoundsPage() {
  return (
    <div className="min-h-screen bg-[#111] text-white p-6 space-y-3">
      <h1 className="text-2xl font-bold mb-2">Déja. Sound Preview</h1>
      <p className="text-white/50 text-sm mb-6">Tap any button to preview. Pick your favorites and tell me!</p>

      <div className="space-y-2">
        {sounds.map((s, i) => (
          <button
            key={i}
            onClick={() => { warmUpAudio(); s.play(); }}
            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 active:bg-white/15 rounded-xl border border-white/10 transition-all active:scale-[0.98]"
          >
            <div className="font-bold text-sm">{s.name}</div>
            <div className="text-white/40 text-xs">{s.desc}</div>
          </button>
        ))}
      </div>

      <p className="text-white/30 text-xs text-center pt-4">
        All sounds generated with Web Audio API — no files
      </p>
    </div>
  );
}
