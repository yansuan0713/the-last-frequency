// Keyboard and mouse state for the tuner. The mouse sets a target height
// directly; the W/S and arrow keys nudge the same target, so both control
// schemes drive one value and never fight. Discrete presses (confirm,
// restart, mute) are queued as events the game state machine consumes.

export class Input {
  constructor(canvas) {
    this.targetY = null; // null until the player first moves the mouse
    this.upHeld = false;
    this.downHeld = false;
    this.events = [];
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.targetY = (e.clientY - rect.top) * (canvas.height / rect.height);
    });
    canvas.addEventListener('mousedown', () => this.events.push('confirm'));
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') { this.upHeld = true; e.preventDefault(); }
      if (k === 's' || k === 'arrowdown') { this.downHeld = true; e.preventDefault(); }
      if (k === 'enter' || k === ' ') { this.events.push('confirm'); e.preventDefault(); }
      if (k === 'r') this.events.push('restart');
      if (k === 'm') this.events.push('mute');
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.upHeld = false;
      if (k === 's' || k === 'arrowdown') this.downHeld = false;
    });
  }

  // Move the keyboard-driven target; called once per frame with the field
  // bounds so the target can never leave the dial.
  steer(dt, currentY, minY, maxY) {
    if (this.targetY === null) this.targetY = currentY;
    const speed = 560;
    if (this.upHeld) this.targetY -= speed * dt;
    if (this.downHeld) this.targetY += speed * dt;
    this.targetY = Math.max(minY, Math.min(maxY, this.targetY));
    return this.targetY;
  }

  // Drain the queued discrete events ('confirm' | 'restart' | 'mute').
  takeEvents() {
    const out = this.events;
    this.events = [];
    return out;
  }
}
