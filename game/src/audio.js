// Every sound is synthesised with WebAudio at the moment it is needed: the
// game ships no audio files. A short decode blip, a low thud for a lost
// signal, a burst of static for a wisp zap, and small jingles for the night
// and the ending. The context is created lazily on the first user gesture,
// as browsers require.

let ctx = null;
let master = null;
let muted = false;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function toggleMuted() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.16;
  return muted;
}

function tone(freq, start, dur, type = 'sine', vol = 1, slideTo = null) {
  const c = ensureContext();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(start, dur, vol = 1, lowpass = 2400) {
  const c = ensureContext();
  if (!c || muted) return;
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

// A decoded transmission: two bright notes, the second a fifth above.
export function playDecode(combo = 1) {
  const base = 520 + Math.min(combo, 8) * 30;
  tone(base, 0, 0.12, 'sine', 0.9);
  tone(base * 1.5, 0.07, 0.16, 'sine', 0.7);
}

// An amplifier pickup: a quick rising sweep, like the set warming up.
export function playAmplifier() {
  tone(300, 0, 0.28, 'triangle', 0.8, 900);
}

// A signal slipped past undecided: one low, dull thud.
export function playLost() {
  tone(110, 0, 0.25, 'sine', 1.0, 55);
  noiseBurst(0, 0.08, 0.25, 500);
}

// A static wisp caught the tuner: raw noise and a falling whine.
export function playZap() {
  noiseBurst(0, 0.3, 1.0, 3200);
  tone(880, 0, 0.3, 'sawtooth', 0.35, 120);
}

// Night cleared: a small four-note signature tune.
export function playNightClear() {
  [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.22, 'triangle', 0.75));
}

// The whole message heard: the signature tune, resolved and held.
export function playWin() {
  [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.5, 'triangle', 0.8));
  tone(131, 0, 1.1, 'sine', 0.5);
}

// The station goes silent: the signature tune, falling apart downward.
export function playGameOver() {
  [523, 440, 349, 262].forEach((f, i) => tone(f, i * 0.16, 0.34, 'triangle', 0.7));
  noiseBurst(0.5, 0.7, 0.5, 900);
}
