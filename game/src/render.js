// All drawing. The scene is composed like a journal page taped above a
// shortwave dial: paper background with a faint graph grid, hairline rules,
// the dial band with its frequency ticks, and panels for the title, the
// night breaks and the endings. Nothing here changes game state; render
// only reads the view the game hands it.

import { COLORS, FONTS } from './palette.js';
import {
  WIDTH, HEIGHT, HUD_BOTTOM, FIELD_TOP, FIELD_BOTTOM, TICKER_TOP,
  ZONE_LEFT, ZONE_RIGHT, ZONE_CENTER,
} from './field.js';
import { FRAGMENTS, NIGHTS, MAX_INTEGRITY, frequencyAt } from './story.js';
import { waveOffset } from './signals.js';

function hairline(g, x0, y0, x1, y1, color = COLORS.ink, width = 1) {
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
}

function drawPaper(g) {
  g.fillStyle = COLORS.paper;
  g.fillRect(0, 0, WIDTH, HEIGHT);
  g.strokeStyle = COLORS.grid;
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 32; x < WIDTH; x += 32) { g.moveTo(x, 0); g.lineTo(x, HEIGHT); }
  for (let y = 32; y < HEIGHT; y += 32) { g.moveTo(0, y); g.lineTo(WIDTH, y); }
  g.stroke();
  // The page frame: a double rule, like a plate in a journal.
  g.strokeStyle = COLORS.ink;
  g.lineWidth = 2.5;
  g.strokeRect(14, 14, WIDTH - 28, HEIGHT - 28);
  g.lineWidth = 1;
  g.strokeRect(22, 22, WIDTH - 44, HEIGHT - 44);
}

function drawDial(g, view) {
  // Frequency ticks: every 2 MHz a labelled line, every 1 MHz a short tick.
  g.font = `11px ${FONTS.mono}`;
  g.textAlign = 'left';
  for (let mhz = 88; mhz <= 108; mhz += 1) {
    const t = (108 - mhz) / 20;
    const y = FIELD_TOP + t * (FIELD_BOTTOM - FIELD_TOP);
    if (mhz % 2 === 0) {
      hairline(g, 64, y, WIDTH - 48, y, COLORS.inkFaint, 1);
      g.fillStyle = COLORS.inkSoft;
      g.fillText(mhz.toFixed(1), 26, y + 4);
    } else {
      hairline(g, 64, y, 92, y, COLORS.inkFaint, 1);
    }
  }
  hairline(g, 64, FIELD_TOP, 64, FIELD_BOTTOM, COLORS.inkSoft, 1);
  hairline(g, 64, HUD_BOTTOM + 8, WIDTH - 48, HUD_BOTTOM + 8, COLORS.ink, 1.5);
  hairline(g, 64, TICKER_TOP - 10, WIDTH - 48, TICKER_TOP - 10, COLORS.ink, 1.5);

  // The tuner's zone, tinted so the eye learns where decoding happens.
  g.fillStyle = 'rgba(200, 67, 43, 0.055)';
  g.fillRect(ZONE_LEFT, FIELD_TOP, ZONE_RIGHT - ZONE_LEFT, FIELD_BOTTOM - FIELD_TOP);
  hairline(g, ZONE_LEFT, FIELD_TOP, ZONE_LEFT, FIELD_BOTTOM, COLORS.inkSoft, 1);
  hairline(g, ZONE_RIGHT, FIELD_TOP, ZONE_RIGHT, FIELD_BOTTOM, COLORS.inkSoft, 1);
  g.save();
  g.translate(ZONE_CENTER, FIELD_BOTTOM + 16);
  g.rotate(0);
  g.font = `10px ${FONTS.mono}`;
  g.textAlign = 'center';
  g.fillStyle = COLORS.inkSoft;
  g.fillText('TUNER', 0, 0);
  g.restore();
}

function drawSignal(g, s, isLocking) {
  // Ribbon: the waveform trailing behind the head, to the right.
  g.beginPath();
  const TRAIL = 118;
  for (let dx = 0; dx <= TRAIL; dx += 6) {
    const px = s.x + dx;
    const py = s.y + waveOffset(s.wave, s.phase - dx * 0.085);
    if (dx === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.strokeStyle = s.color;
  g.globalAlpha = 0.22;
  g.lineWidth = 8;
  g.stroke();
  g.globalAlpha = 0.95;
  g.lineWidth = 2.6;
  g.stroke();
  g.globalAlpha = 1;

  // Head: a paper disc ringed in the signal's colour.
  g.beginPath();
  g.arc(s.x, s.y, 10, 0, Math.PI * 2);
  g.fillStyle = COLORS.paper;
  g.fill();
  g.strokeStyle = s.color;
  g.lineWidth = 3;
  g.stroke();
  g.beginPath();
  g.arc(s.x, s.y, 3.4, 0, Math.PI * 2);
  g.fillStyle = s.color;
  g.fill();

  if (s.kind === 'amp') {
    g.beginPath();
    g.arc(s.x, s.y, 16, 0, Math.PI * 2);
    g.strokeStyle = COLORS.gold;
    g.lineWidth = 1.6;
    g.stroke();
    g.font = `700 10px ${FONTS.mono}`;
    g.textAlign = 'center';
    g.fillStyle = COLORS.gold;
    g.fillText('AMP', s.x, s.y - 24);
  }

  // Lock progress: an ink arc closing around the head.
  if (s.progress > 0.02) {
    g.beginPath();
    g.arc(s.x, s.y, 17, -Math.PI / 2, -Math.PI / 2 + s.progress * Math.PI * 2);
    g.strokeStyle = isLocking ? COLORS.vermillion : COLORS.ink;
    g.lineWidth = isLocking ? 3.4 : 2.4;
    g.stroke();
  }
}

function drawWisp(g, w) {
  // A jagged static star; its spikes breathe with its phase.
  g.beginPath();
  const spikes = 9;
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const r = i % 2 === 0
      ? 15 + Math.sin(w.phase * 2 + i * 1.7) * 4
      : 6 + Math.cos(w.phase * 3 + i) * 2;
    const px = w.x + Math.cos(angle) * r;
    const py = w.y + Math.sin(angle) * r;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = COLORS.vermillion;
  g.globalAlpha = 0.88;
  g.fill();
  g.globalAlpha = 1;
  g.font = `10px ${FONTS.mono}`;
  g.textAlign = 'center';
  g.fillStyle = COLORS.vermillion;
  g.fillText('STATIC', w.x, w.y - 26);
}

function drawTuner(g, view) {
  const t = view.tuner;
  const halfH = 30;
  const x0 = ZONE_LEFT - 16;
  const x1 = ZONE_RIGHT + 16;
  g.strokeStyle = t.stun > 0 ? COLORS.inkSoft : COLORS.ink;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(x0, t.y - halfH); g.lineTo(x0, t.y + halfH);
  g.moveTo(x1, t.y - halfH); g.lineTo(x1, t.y + halfH);
  g.moveTo(x0, t.y - halfH); g.lineTo(x0 + 18, t.y - halfH);
  g.moveTo(x0, t.y + halfH); g.lineTo(x0 + 18, t.y + halfH);
  g.moveTo(x1, t.y - halfH); g.lineTo(x1 - 18, t.y - halfH);
  g.moveTo(x1, t.y + halfH); g.lineTo(x1 - 18, t.y + halfH);
  g.stroke();
  // The needle: vermillion, thickening while a lock is being held.
  g.strokeStyle = COLORS.vermillion;
  g.lineWidth = t.locking ? 4.5 : 2.6;
  g.beginPath();
  g.moveTo(x0 - 6, t.y);
  g.lineTo(x1 + 6, t.y);
  g.stroke();
  // Frequency readout beside the bracket.
  const mhz = frequencyAt(t.y, FIELD_TOP, FIELD_BOTTOM).toFixed(1);
  g.font = `700 15px ${FONTS.mono}`;
  g.textAlign = 'left';
  g.fillStyle = COLORS.ink;
  g.fillText(`${mhz} MHz`, x1 + 14, t.y - 8);
  if (t.amplifier > 0) {
    g.font = `700 11px ${FONTS.mono}`;
    g.fillStyle = COLORS.gold;
    g.fillText(`WIDE BAND ${Math.ceil(t.amplifier)}s`, x1 + 14, t.y + 12);
  }
  if (t.stun > 0) {
    g.font = `700 11px ${FONTS.mono}`;
    g.fillStyle = COLORS.vermillion;
    g.fillText('STATIC HIT', x1 + 14, t.y + 12);
  }
}

function drawHUD(g, view) {
  const top = 44;
  g.textAlign = 'left';
  g.font = `11px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText('SCORE', 48, top);
  g.font = `700 30px ${FONTS.mono}`;
  g.fillStyle = COLORS.ink;
  g.fillText(String(view.score).padStart(6, '0'), 48, top + 32);
  if (view.combo >= 2) {
    g.font = `700 15px ${FONTS.mono}`;
    g.fillStyle = COLORS.vermillion;
    g.fillText(`COMBO x${Math.min(view.combo, 8)}`, 196, top + 32);
  }

  const cfg = NIGHTS[view.nightIdx];
  g.textAlign = 'center';
  g.font = `11px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText(`NIGHT ${view.nightIdx + 1} OF ${NIGHTS.length}`, WIDTH / 2, top);
  g.font = `700 19px ${FONTS.body}`;
  g.fillStyle = COLORS.ink;
  g.fillText(`decoded ${view.decodedThisNight} / ${cfg.quota}`, WIDTH / 2, top + 30);
  // Quota squares: filled per decode this night.
  const sq = 11;
  const totalW = cfg.quota * (sq + 5) - 5;
  for (let i = 0; i < cfg.quota; i++) {
    const x = WIDTH / 2 - totalW / 2 + i * (sq + 5);
    if (i < view.decodedThisNight) {
      g.fillStyle = COLORS.ink;
      g.fillRect(x, top + 40, sq, sq);
    } else {
      g.strokeStyle = COLORS.inkSoft;
      g.lineWidth = 1;
      g.strokeRect(x, top + 40, sq, sq);
    }
  }

  g.textAlign = 'right';
  g.font = `11px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText('SIGNAL INTEGRITY', WIDTH - 48, top);
  for (let i = 0; i < MAX_INTEGRITY; i++) {
    const x = WIDTH - 48 - (MAX_INTEGRITY - i) * 26 + 6;
    if (i < view.integrity) {
      g.fillStyle = COLORS.ink;
      g.fillRect(x, top + 14, 19, 19);
    } else {
      g.strokeStyle = COLORS.vermillion;
      g.lineWidth = 1.6;
      g.strokeRect(x, top + 14, 19, 19);
    }
  }
  if (view.muted) {
    g.font = `11px ${FONTS.mono}`;
    g.fillStyle = COLORS.inkSoft;
    g.fillText('SOUND OFF (M)', WIDTH - 48, top + 52);
  }
}

function drawTicker(g, view) {
  g.textAlign = 'left';
  g.font = `700 11px ${FONTS.mono}`;
  g.fillStyle = COLORS.vermillion;
  g.fillText('INCOMING MESSAGE', 48, TICKER_TOP + 26);
  g.font = `italic 21px ${FONTS.body}`;
  const heard = FRAGMENTS.slice(0, view.fragmentsHeard).join(' ');
  const missing = FRAGMENTS.slice(view.fragmentsHeard).map(() => '· · ·').join('  ');
  g.fillStyle = COLORS.ink;
  const text = heard ? (missing ? `${heard}  ${missing}` : heard) : '— nothing but static, so far —';
  g.fillText(text, 48, TICKER_TOP + 56, WIDTH - 96);
}

function panel(g, w, h) {
  const x = (WIDTH - w) / 2;
  const y = (HEIGHT - h) / 2;
  g.fillStyle = 'rgba(243, 233, 210, 0.94)';
  g.fillRect(x, y, w, h);
  g.strokeStyle = COLORS.ink;
  g.lineWidth = 2;
  g.strokeRect(x, y, w, h);
  g.lineWidth = 1;
  g.strokeRect(x + 6, y + 6, w - 12, h - 12);
  return { x, y, w, h };
}

function blinkOn(view) {
  return (view.time % 1.4) < 0.9;
}

function drawTitle(g, view) {
  const p = panel(g, 860, 520);
  g.textAlign = 'center';
  g.font = `13px ${FONTS.mono}`;
  g.fillStyle = COLORS.vermillion;
  g.fillText('A  S H O R T  G A M E  A B O U T  L I S T E N I N G', WIDTH / 2, p.y + 74);
  g.font = `700 96px ${FONTS.display}`;
  g.fillStyle = COLORS.ink;
  g.fillText('THE LAST', WIDTH / 2, p.y + 168);
  g.fillStyle = COLORS.vermillion;
  g.fillText('FREQUENCY', WIDTH / 2, p.y + 262);
  hairline(g, WIDTH / 2 - 210, p.y + 292, WIDTH / 2 + 210, p.y + 292, COLORS.ink, 1.5);
  g.font = `italic 22px ${FONTS.body}`;
  g.fillStyle = COLORS.ink;
  g.fillText('Five nights. One failing set. A voice that has waited nine years.', WIDTH / 2, p.y + 334);
  g.font = `15px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText('MOUSE or W / S — tune the dial', WIDTH / 2, p.y + 386);
  g.fillText('hold a signal inside the bracket to decode it', WIDTH / 2, p.y + 412);
  g.fillText('keep the needle clear of the red static', WIDTH / 2, p.y + 438);
  if (blinkOn(view)) {
    g.font = `700 19px ${FONTS.mono}`;
    g.fillStyle = COLORS.ink;
    g.fillText('PRESS ENTER TO TUNE IN', WIDTH / 2, p.y + 486);
  }
}

function drawNightClear(g, view) {
  const p = panel(g, 820, 430);
  g.textAlign = 'center';
  g.font = `13px ${FONTS.mono}`;
  g.fillStyle = COLORS.vermillion;
  g.fillText(`N I G H T  ${view.nightIdx + 1}  C L E A R`, WIDTH / 2, p.y + 72);
  g.font = `italic 21px ${FONTS.body}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText('the voice continues:', WIDTH / 2, p.y + 122);
  g.font = `italic 700 33px ${FONTS.body}`;
  g.fillStyle = COLORS.ink;
  g.fillText(`“${FRAGMENTS[view.nightIdx]}”`, WIDTH / 2, p.y + 182, p.w - 90);
  // Fragment dots: one per night, filled as the message assembles.
  for (let i = 0; i < FRAGMENTS.length; i++) {
    const x = WIDTH / 2 + (i - (FRAGMENTS.length - 1) / 2) * 30;
    g.beginPath();
    g.arc(x, p.y + 238, 6, 0, Math.PI * 2);
    if (i <= view.nightIdx) { g.fillStyle = COLORS.vermillion; g.fill(); }
    else { g.strokeStyle = COLORS.inkSoft; g.lineWidth = 1.4; g.stroke(); }
  }
  g.font = `16px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText(`score ${view.score}`, WIDTH / 2, p.y + 300);
  if (blinkOn(view)) {
    g.font = `700 18px ${FONTS.mono}`;
    g.fillStyle = COLORS.ink;
    g.fillText(`PRESS ENTER FOR NIGHT ${view.nightIdx + 2}`, WIDTH / 2, p.y + 366);
  }
}

function wrapText(g, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (g.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

function drawWin(g, view) {
  const p = panel(g, 880, 540);
  g.textAlign = 'center';
  g.font = `13px ${FONTS.mono}`;
  g.fillStyle = COLORS.vermillion;
  g.fillText('T H E  M E S S A G E  I S  C O M P L E T E', WIDTH / 2, p.y + 70);
  g.font = `italic 29px ${FONTS.body}`;
  g.fillStyle = COLORS.ink;
  const lines = wrapText(g, FRAGMENTS.join(' '), p.w - 130);
  lines.forEach((line, i) => g.fillText(line, WIDTH / 2, p.y + 138 + i * 42));
  const after = p.y + 138 + lines.length * 42 + 26;
  hairline(g, WIDTH / 2 - 180, after, WIDTH / 2 + 180, after, COLORS.ink, 1.2);
  g.font = `700 24px ${FONTS.mono}`;
  g.fillText(`FINAL SCORE ${String(view.score).padStart(6, '0')}`, WIDTH / 2, after + 52);
  g.font = `15px ${FONTS.mono}`;
  g.fillStyle = COLORS.inkSoft;
  g.fillText('best combo x' + Math.min(view.bestCombo, 8), WIDTH / 2, after + 84);
  if (blinkOn(view)) {
    g.font = `700 18px ${FONTS.mono}`;
    g.fillStyle = COLORS.ink;
    g.fillText('PRESS R TO LISTEN AGAIN', WIDTH / 2, p.y + p.h - 42);
  }
}

function drawGameOver(g, view) {
  // Static wash behind the panel: scattered grey flecks, denser at the edges.
  for (let i = 0; i < 260; i++) {
    const x = 30 + Math.random() * (WIDTH - 60);
    const y = 30 + Math.random() * (HEIGHT - 60);
    g.fillStyle = Math.random() < 0.24 ? COLORS.vermillion : COLORS.inkSoft;
    g.globalAlpha = 0.12 + Math.random() * 0.2;
    g.fillRect(x, y, 3 + Math.random() * 7, 2 + Math.random() * 3);
  }
  g.globalAlpha = 1;
  const p = panel(g, 820, 430);
  g.textAlign = 'center';
  g.font = `700 44px ${FONTS.display}`;
  g.fillStyle = COLORS.ink;
  g.fillText('THE FREQUENCY', WIDTH / 2, p.y + 108);
  g.fillStyle = COLORS.vermillion;
  g.fillText('GOES SILENT', WIDTH / 2, p.y + 162);
  g.font = `italic 21px ${FONTS.body}`;
  g.fillStyle = COLORS.ink;
  g.fillText(
    `You heard ${view.fragmentsHeard} of ${FRAGMENTS.length} fragments before the set gave out.`,
    WIDTH / 2, p.y + 226,
  );
  g.font = `700 22px ${FONTS.mono}`;
  g.fillText(`SCORE ${String(view.score).padStart(6, '0')}`, WIDTH / 2, p.y + 286);
  if (blinkOn(view)) {
    g.font = `700 18px ${FONTS.mono}`;
    g.fillText('PRESS R TO TRY AGAIN', WIDTH / 2, p.y + 356);
  }
}

function drawFlash(g, view) {
  if (view.flash <= 0.01) return;
  g.fillStyle = `rgba(200, 67, 43, ${view.flash * 0.16})`;
  g.fillRect(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < 90 * view.flash; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * HEIGHT;
    g.fillStyle = `rgba(29, 26, 22, ${view.flash * 0.35})`;
    g.fillRect(x, y, 4 + Math.random() * 9, 2);
  }
}

// The one entry point main.js calls each frame.
export function drawScene(g, view) {
  g.save();
  if (view.shake > 0.2) {
    g.translate((Math.random() - 0.5) * view.shake, (Math.random() - 0.5) * view.shake);
  }
  drawPaper(g);
  drawDial(g, view);
  for (const s of view.signals) drawSignal(g, s, view.lockTarget === s);
  for (const w of view.wisps) drawWisp(g, w);
  drawTuner(g, view);
  view.particles.draw(g);
  drawHUD(g, view);
  drawTicker(g, view);
  if (view.state === 'title') drawTitle(g, view);
  if (view.state === 'nightclear') drawNightClear(g, view);
  if (view.state === 'win') drawWin(g, view);
  if (view.state === 'gameover') drawGameOver(g, view);
  drawFlash(g, view);
  g.restore();
}
