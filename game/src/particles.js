// A small pool of short-lived particles: ink sparks when a signal decodes,
// grey static motes when a wisp bursts or a signal is lost. Particles are
// pure decoration — they never affect the game's state.

import { COLORS } from './palette.js';

const MAX_PARTICLES = 420;

export class Particles {
  constructor() {
    this.items = [];
  }

  // A ring of sparks flying outward from a decoded signal's head.
  burst(x, y, color, count = 16) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 190;
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        life: 0.55 + Math.random() * 0.4,
        age: 0,
        size: 1.6 + Math.random() * 2.4,
        color,
        gravity: 130,
      });
    }
  }

  // A puff of static: slow grey squares that jitter as they fade.
  fizzle(x, y, count = 22) {
    for (let i = 0; i < count; i++) {
      if (this.items.length >= MAX_PARTICLES) return;
      this.items.push({
        x: x + (Math.random() - 0.5) * 46,
        y: y + (Math.random() - 0.5) * 46,
        vx: (Math.random() - 0.5) * 60,
        vy: (Math.random() - 0.5) * 60,
        life: 0.4 + Math.random() * 0.35,
        age: 0,
        size: 2 + Math.random() * 4,
        color: COLORS.inkSoft,
        gravity: 0,
        jitter: true,
      });
    }
  }

  update(dt) {
    const keep = [];
    for (const p of this.items) {
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.jitter) {
        p.x += (Math.random() - 0.5) * 5;
        p.y += (Math.random() - 0.5) * 5;
      }
      keep.push(p);
    }
    this.items = keep;
  }

  draw(g) {
    for (const p of this.items) {
      g.globalAlpha = Math.max(0, 1 - p.age / p.life);
      g.fillStyle = p.color;
      g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    g.globalAlpha = 1;
  }
}
