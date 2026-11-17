// The player's receiver: a bracket that slides along the dial. It eases
// toward the input target (fast enough to feel immediate, heavy enough to
// feel like equipment), and it can be stunned by static, which leaves it
// unable to hold a lock for a moment.

import { FIELD_TOP, FIELD_BOTTOM } from './field.js';

export class Tuner {
  constructor() {
    this.y = (FIELD_TOP + FIELD_BOTTOM) / 2;
    this.stun = 0; // seconds of static stun remaining
    this.amplifier = 0; // seconds of widened tuning window remaining
    this.locking = false; // set by the game while a lock is progressing
  }

  reset() {
    this.y = (FIELD_TOP + FIELD_BOTTOM) / 2;
    this.stun = 0;
    this.amplifier = 0;
    this.locking = false;
  }

  update(dt, targetY) {
    if (this.stun > 0) this.stun -= dt;
    if (this.amplifier > 0) this.amplifier -= dt;
    // Exponential approach: covers most of the distance in about 90 ms.
    const ease = 1 - Math.exp(-dt * 16);
    const jitter = this.stun > 0 ? (Math.random() - 0.5) * 7 : 0;
    this.y += (targetY - this.y) * ease + jitter;
    this.y = Math.max(FIELD_TOP + 14, Math.min(FIELD_BOTTOM - 14, this.y));
  }

  // The half-height of the window within which a signal counts as tuned.
  tolerance(base) {
    return this.amplifier > 0 ? base * 1.8 : base;
  }

  get canLock() {
    return this.stun <= 0;
  }
}
