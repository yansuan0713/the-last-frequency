// The Last Frequency — a short game about listening.
//
// You are the night operator of the last analog station on the coast.
// Transmissions drift in across the dial from the right; slide the tuner
// (mouse, or W/S and the arrow keys) until a signal sits inside the bracket
// and hold it there to decode it. Each night you must decode a quota of
// signals to hear the next fragment of one stranger's message. Signals that
// slip past cost integrity, and so does the red static — keep the needle
// out of its lane. Clear all five nights to hear the whole message.
//
// This file owns the game's state machine and rules; input, the tuner, the
// travelling signals, particles, sound and drawing each live in their own
// module beside it.

import { Input } from './input.js';
import { Tuner } from './tuner.js';
import { Particles } from './particles.js';
import {
  Signal, Wisp, spawnSignal, spawnAmplifier, spawnWisp, LOCK_TIME,
} from './signals.js';
import { NIGHTS, MAX_INTEGRITY } from './story.js';
import { FIELD_TOP, FIELD_BOTTOM, ZONE_CENTER, LOST_X } from './field.js';
import { drawScene } from './render.js';
import {
  unlockAudio, toggleMuted, playDecode, playAmplifier, playLost, playZap,
  playNightClear, playWin, playGameOver,
} from './audio.js';
import { mulberry32 } from './random.js';

const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
const status = document.getElementById('status');

class Game {
  constructor() {
    this.input = new Input(canvas);
    this.tuner = new Tuner();
    this.particles = new Particles();
    this.state = 'title';
    this.time = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.integrity = MAX_INTEGRITY;
    this.nightIdx = 0;
    this.decodedThisNight = 0;
    this.fragmentsHeard = 0;
    this.signals = [];
    this.wisps = [];
    this.lockTarget = null;
    this.flash = 0;
    this.shake = 0;
    this.muted = false;
    this.signalTimer = 1;
    this.wispTimer = 3;
    this.ampTimer = -1;
    this.shotMode = false;
  }

  get cfg() {
    return NIGHTS[this.nightIdx];
  }

  startRun() {
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.integrity = MAX_INTEGRITY;
    this.nightIdx = 0;
    this.decodedThisNight = 0;
    this.fragmentsHeard = 0;
    this.tuner.reset();
    this.beginNight();
    this.setState('play');
  }

  beginNight() {
    this.signals = [];
    this.wisps = [];
    this.decodedThisNight = 0;
    this.combo = 0;
    this.signalTimer = 0.9;
    this.wispTimer = 2.6;
    this.ampTimer = 6 + Math.random() * 5; // one amplifier a night, mid-night
  }

  setState(next) {
    this.state = next;
    const lines = {
      title: 'The Last Frequency. Press Enter to tune in.',
      play: `Night ${this.nightIdx + 1}. Decode ${this.cfg.quota} signals.`,
      nightclear: `Night ${this.nightIdx + 1} clear. A new fragment of the message was heard.`,
      win: 'The message is complete. Press R to listen again.',
      gameover: 'The frequency goes silent. Press R to try again.',
    };
    if (status && lines[next]) status.textContent = lines[next];
  }

  endNight() {
    this.fragmentsHeard = this.nightIdx + 1;
    this.signals = [];
    this.wisps = [];
    this.lockTarget = null;
    if (this.nightIdx >= NIGHTS.length - 1) {
      playWin();
      this.setState('win');
    } else {
      playNightClear();
      this.setState('nightclear');
    }
  }

  nextNight() {
    this.nightIdx += 1;
    this.integrity = Math.min(MAX_INTEGRITY, this.integrity + 1);
    this.beginNight();
    this.setState('play');
  }

  gameOver() {
    playGameOver();
    this.setState('gameover');
  }

  handleEvents() {
    for (const ev of this.input.takeEvents()) {
      if (ev === 'mute') {
        this.muted = toggleMuted();
        continue;
      }
      unlockAudio();
      if (ev === 'restart' && this.state !== 'title') this.startRun();
      if (ev !== 'confirm') continue;
      if (this.state === 'title') this.startRun();
      else if (this.state === 'nightclear') this.nextNight();
      else if (this.state === 'win') this.setState('title');
      else if (this.state === 'gameover') this.startRun();
    }
  }

  decode(signal) {
    this.particles.burst(signal.x, signal.y, signal.color, 18);
    if (signal.kind === 'amp') {
      this.tuner.amplifier = 10;
      this.score += 50;
      playAmplifier();
      return;
    }
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.score += 100 * Math.min(this.combo, 8);
    this.decodedThisNight += 1;
    playDecode(this.combo);
    if (this.decodedThisNight >= this.cfg.quota) this.endNight();
  }

  loseSignal(signal) {
    if (signal.kind === 'amp') return; // an amplifier missed is just gone
    this.integrity -= 1;
    this.combo = 0;
    this.flash = Math.max(this.flash, 0.4);
    this.particles.fizzle(70, signal.y, 16);
    playLost();
    if (this.integrity <= 0) this.gameOver();
  }

  zap(wisp) {
    wisp.spent = true;
    this.integrity -= 1;
    this.combo = 0;
    this.tuner.stun = 0.6;
    this.flash = 0.85;
    this.shake = 13;
    this.particles.fizzle(ZONE_CENTER, this.tuner.y, 26);
    playZap();
    if (this.integrity <= 0) this.gameOver();
  }

  updatePlay(dt) {
    const targetY = this.input.steer(dt, this.tuner.y, FIELD_TOP + 14, FIELD_BOTTOM - 14);
    this.tuner.update(dt, targetY);
    const cfg = this.cfg;

    // Spawning: transmissions on their own timer, static on another, and
    // one amplifier per night on a slow fuse.
    this.signalTimer -= dt;
    if (this.signalTimer <= 0) {
      this.signals.push(spawnSignal(cfg));
      this.signalTimer = cfg.spawnEvery * (0.72 + Math.random() * 0.65);
    }
    this.ampTimer -= dt;
    if (this.ampTimer <= 0) {
      this.signals.push(spawnAmplifier(cfg));
      this.ampTimer = Number.POSITIVE_INFINITY;
    }
    this.wispTimer -= dt;
    if (this.wispTimer <= 0) {
      if (Math.random() < cfg.wispChance * 2.4 && this.wisps.length < 3) {
        this.wisps.push(spawnWisp(cfg));
      }
      this.wispTimer = 2.8 + Math.random() * 1.4;
    }

    for (const s of this.signals) s.update(dt);
    for (const w of this.wisps) w.update(dt);

    // Locking: a signal inside the zone, aligned with the needle and held,
    // fills its lock; anything else decays. The furthest-filled aligned
    // signal is the one the needle is shown holding.
    this.lockTarget = null;
    for (const s of this.signals) {
      if (!s.inZone) {
        s.progress = Math.max(0, s.progress - dt * 1.5);
        continue;
      }
      const aligned = Math.abs(s.y - this.tuner.y) <= this.tuner.tolerance(cfg.tolerance);
      if (aligned && this.tuner.canLock) {
        s.progress += dt / LOCK_TIME;
        if (!this.lockTarget || s.progress > this.lockTarget.progress) this.lockTarget = s;
      } else {
        s.progress = Math.max(0, s.progress - dt * 1.5);
      }
    }
    this.tuner.locking = this.lockTarget !== null;

    // Static: a wisp in the zone at the needle's height zaps it, once.
    for (const w of this.wisps) {
      if (!w.spent && w.inZone && this.tuner.stun <= 0
        && Math.abs(w.y - this.tuner.y) <= 30) {
        this.zap(w);
        if (this.state !== 'play') return;
      }
    }

    // Resolve finished signals, then drop everything that left the dial.
    const decoded = this.signals.filter((s) => s.progress >= 1);
    for (const s of decoded) {
      this.decode(s);
      if (this.state !== 'play') return;
    }
    const lost = this.signals.filter((s) => s.x < LOST_X && s.progress < 1);
    for (const s of lost) {
      this.loseSignal(s);
      if (this.state !== 'play') return;
    }
    this.signals = this.signals.filter((s) => s.progress < 1 && s.x >= LOST_X);
    this.wisps = this.wisps.filter((w) => !w.spent && w.x > 40);
  }

  update(dt) {
    this.handleEvents();
    if (this.state === 'play' && !this.shotMode) this.updatePlay(dt);
    this.particles.update(dt);
    this.flash = Math.max(0, this.flash - dt * 2.1);
    this.shake = Math.max(0, this.shake - dt * 26);
  }
}

// --- Screenshot staging -------------------------------------------------
// ?shot=start|play|end|over freezes a deterministic scene (the maker's
// screenshot harness loads these URLs). Gameplay time never advances in a
// staged scene; phases come from a seeded generator so every load renders
// the identical frame.
function stageFromQuery(game) {
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (!shot) return;
  game.shotMode = true;
  game.time = 0.5; // inside the blink-on window, so prompts are visible
  const rng = mulberry32(20261117);
  const place = (s) => { s.phase = rng() * Math.PI * 2; return s; };

  if (shot === 'start') {
    game.signals = [
      place(new Signal(700, 300, 'sine', 0)),
      place(new Signal(1020, 520, 'triangle', 0)),
    ];
    game.tuner.y = 430;
    game.setState('title');
  } else if (shot === 'play') {
    game.nightIdx = 1;
    game.score = 2400;
    game.combo = 5;
    game.bestCombo = 5;
    game.integrity = 4;
    game.decodedThisNight = 3;
    game.fragmentsHeard = 1;
    const held = place(new Signal(206, 392, 'sine', 0));
    held.progress = 0.72;
    game.signals = [
      held,
      place(new Signal(520, 246, 'triangle', 0)),
      place(new Signal(764, 528, 'square', 0)),
      place(new Signal(1015, 322, 'sine', 0)),
      place(new Signal(884, 168, 'sine', 0, 'amp')),
    ];
    game.wisps = [new Wisp(648, 470, 0)];
    game.tuner.y = 392;
    game.lockTarget = held;
    game.tuner.locking = true;
    game.setState('play');
  } else if (shot === 'night') {
    game.nightIdx = 0;
    game.score = 900;
    game.combo = 3;
    game.bestCombo = 4;
    game.integrity = 5;
    game.decodedThisNight = NIGHTS[0].quota;
    game.fragmentsHeard = 1;
    game.signals = [
      place(new Signal(760, 268, 'triangle', 0)),
      place(new Signal(1050, 500, 'sine', 0)),
    ];
    game.tuner.y = 448;
    game.setState('nightclear');
  } else if (shot === 'end') {
    game.score = 8650;
    game.combo = 7;
    game.bestCombo = 7;
    game.integrity = 3;
    game.nightIdx = NIGHTS.length - 1;
    game.decodedThisNight = NIGHTS[game.nightIdx].quota;
    game.fragmentsHeard = 5;
    game.signals = [place(new Signal(820, 300, 'sine', 0))];
    game.tuner.y = 470;
    game.setState('win');
  } else if (shot === 'over') {
    game.score = 3100;
    game.combo = 0;
    game.bestCombo = 6;
    game.integrity = 0;
    game.nightIdx = 2;
    game.decodedThisNight = 4;
    game.fragmentsHeard = 2;
    game.tuner.y = 380;
    game.setState('gameover');
  }
}

const game = new Game();
stageFromQuery(game);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  if (!game.shotMode) {
    game.time += dt;
    game.update(dt);
  }
  drawScene(g, game);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
