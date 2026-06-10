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

/** Soft high chime — played when you receive resources */
export function playResourceGain(): void {
  tone(1047, 0.14, 'sine', 0.06);          // C6 — quiet, airy
  tone(1319, 0.18, 'sine', 0.05, 0.11);   // E6
}

/** Upward three-note fanfare — played when your turn starts */
export function playYourTurn(): void {
  tone(440, 0.1,  'sine', 0.18);           // A4
  tone(554, 0.1,  'sine', 0.18, 0.11);     // C#5
  tone(659, 0.22, 'sine', 0.22, 0.22);     // E5
}

/** Soft wooden thud — played when a road, settlement or city is placed */
export function playPiecePlaced(): void {
  tone(140, 0.07, 'sine', 0.13);
  tone(280, 0.04, 'sine', 0.05, 0.015);
}

/** Low ominous pulse — played when a 7 is rolled */
export function playRobber(): void {
  tone(110, 0.35, 'sawtooth', 0.18);
  tone(82,  0.45, 'sawtooth', 0.14, 0.25);
}

/** Short attention ping — played when a trade offer arrives */
export function playTradeProposed(): void {
  tone(880, 0.08, 'sine', 0.14);
  tone(1047, 0.12, 'sine', 0.12, 0.09);
}

/** Triumphant fanfare — played when longest road or largest army is awarded */
export function playTriumph(): void {
  tone(523,  0.12, 'sine', 0.22);          // C5
  tone(659,  0.12, 'sine', 0.22, 0.13);   // E5
  tone(784,  0.12, 'sine', 0.22, 0.26);   // G5
  tone(1047, 0.28, 'sine', 0.28, 0.39);   // C6
}
