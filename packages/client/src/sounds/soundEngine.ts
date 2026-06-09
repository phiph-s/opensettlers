let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.25,
  startDelay = 0,
): void {
  const c = getCtx();
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.connect(g);
  g.connect(c.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + startDelay;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Pleasant two-note chime — played when you receive resources */
export function playResourceGain(): void {
  tone(523, 0.18, 'sine', 0.22);          // C5
  tone(659, 0.25, 'sine', 0.22, 0.14);    // E5
}

/** Upward three-note fanfare — played when your turn starts */
export function playYourTurn(): void {
  tone(440, 0.1,  'sine', 0.18);           // A4
  tone(554, 0.1,  'sine', 0.18, 0.11);     // C#5
  tone(659, 0.22, 'sine', 0.22, 0.22);     // E5
}

/** Low ominous pulse — played when a 7 is rolled */
export function playRobber(): void {
  tone(110, 0.35, 'sawtooth', 0.18);
  tone(82,  0.45, 'sawtooth', 0.14, 0.25);
}
