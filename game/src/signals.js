// The things that travel the dial. A Signal is a transmission drifting in
// from the right edge: it carries a waveform family (which sets its colour
// and the shape of the ribbon it trails), and it must be held inside the
// tuner's window long enough to decode. A Wisp is drifting static: it
// wobbles as it comes and zaps a tuner that sits in its lane. An amplifier
// is a rare golden signal that widens the tuning window when decoded.

import { COLORS } from './palette.js';
import { FIELD_TOP, FIELD_BOTTOM, WIDTH } from './field.js';

// Seconds of held alignment a signal needs before it decodes.
export const LOCK_TIME = 0.55;

export const WAVE_COLORS = {
  sine: COLORS.waveSine,
  triangle: COLORS.waveTriangle,
  square: COLORS.waveSquare,
};

// The vertical offset of a waveform at phase t; render.js walks this along
// a signal's trail to draw its ribbon.
export function waveOffset(wave, t) {
  if (wave === 'triangle') {
    const p = ((t / Math.PI) % 2 + 2) % 2;
    return (p < 1 ? p - 0.5 : 1.5 - p) * 20;
  }
  if (wave === 'square') return Math.sign(Math.sin(t)) * 7;
  return Math.sin(t) * 10; // sine
}

const WAVES = ['sine', 'triangle', 'square'];

export class Signal {
  constructor(x, y, wave, speed, kind = 'voice') {
    this.x = x;
    this.y = y;
    this.wave = wave;
    this.speed = speed;
    this.kind = kind; // 'voice' counts toward the quota; 'amp' is a pickup
    this.progress = 0; // 0..1 of the lock held so far
    this.phase = Math.random() * Math.PI * 2;
    this.color = kind === 'amp' ? COLORS.gold : WAVE_COLORS[wave];
  }

  update(dt) {
    this.x -= this.speed * dt;
    this.phase += dt * 7;
  }

  get inZone() {
    return this.x >= 60 && this.x <= 268;
  }
}

export class Wisp {
  constructor(x, y, speed) {
    this.x = x;
    this.baseY = y;
    this.y = y;
    this.speed = speed;
    this.phase = Math.random() * Math.PI * 2;
    this.spent = false; // a wisp zaps once, then burns out
  }

  update(dt) {
    this.x -= this.speed * dt;
    this.phase += dt * 3.2;
    this.y = this.baseY + Math.sin(this.phase) * 24;
  }

  get inZone() {
    return this.x >= 92 && this.x <= 298;
  }
}

function randomLane() {
  return FIELD_TOP + 36 + Math.random() * (FIELD_BOTTOM - FIELD_TOP - 72);
}

// Factories used by the game's spawner; speed jitter keeps arrivals uneven.
export function spawnSignal(cfg) {
  const wave = WAVES[Math.floor(Math.random() * WAVES.length)];
  const speed = cfg.speed * (0.88 + Math.random() * 0.3);
  return new Signal(WIDTH + 60, randomLane(), wave, speed);
}

export function spawnAmplifier(cfg) {
  const speed = cfg.speed * 0.8;
  return new Signal(WIDTH + 60, randomLane(), 'sine', speed, 'amp');
}

export function spawnWisp(cfg) {
  return new Wisp(WIDTH + 60, randomLane(), cfg.speed * 1.35);
}
