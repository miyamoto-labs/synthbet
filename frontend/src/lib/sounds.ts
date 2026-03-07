// Web Audio API sound effects — no audio files needed
let ctx: AudioContext | null = null;
let unlocked = false;

// Warm up audio on first user tap (required by mobile browsers)
export function warmUpAudio() {
  if (unlocked) return;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") {
      ctx.resume().then(() => { unlocked = true; });
    } else {
      unlocked = true;
    }
    // Play a silent buffer to fully unlock on iOS/Android
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch {}
}

// Auto-attach warmup to first touch/click (runs once)
if (typeof window !== "undefined") {
  const handler = () => {
    warmUpAudio();
    document.removeEventListener("touchstart", handler, true);
    document.removeEventListener("click", handler, true);
  };
  document.addEventListener("touchstart", handler, true);
  document.addEventListener("click", handler, true);
}

function getCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

// Chip Toss — poker chip on the table (bet placed)
export function playBetPlaced() {
  const c = getCtx();
  if (!c) return;
  playTone(1800, 0.03, "sawtooth", 0.2);
  setTimeout(() => playTone(2400, 0.05, "square", 0.15), 30);
  setTimeout(() => playTone(1200, 0.04, "sawtooth", 0.08), 60);
}

// Chip Toss — also for direction select
export function playChipToss() {
  playBetPlaced();
}

// Win — Retro 8-bit victory jingle
export function playWin() {
  const c = getCtx();
  if (!c) return;
  const notes = [660, 660, 660, 880, 784, 880, 1047];
  const times = [0, 80, 160, 280, 400, 480, 600];
  const durs = [0.06, 0.06, 0.1, 0.1, 0.08, 0.1, 0.3];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, durs[i], "square", 0.12), times[i]);
  });
}

// Lose — Wah Wah sad trombone
export function playLose() {
  const c = getCtx();
  if (!c) return;
  const notes = [494, 466, 440, 370];
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.35, "triangle", 0.12), i * 250);
  });
}

// Countdown tick — last 30 seconds urgency
export function playTick() {
  playTone(1000, 0.05, "square", 0.08);
}

// Urgent tick — last 10 seconds
export function playUrgentTick() {
  playTone(1200, 0.03, "square", 0.12);
  setTimeout(() => playTone(1200, 0.03, "square", 0.1), 60);
}

// Price moved in your favor
export function playPriceUp() {
  playTone(880, 0.08, "sine", 0.08);
}

// Price moved against you
export function playPriceDown() {
  playTone(330, 0.08, "triangle", 0.06);
}
