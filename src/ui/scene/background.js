const { mix, gradient } = require('../engine/color');

function hash(x, y) {
  let h = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

// Ambient layer: drifting aurora/glow tint, twinkling stars (at night) and the odd shooting star.
function drawBackground(scr, ctx) {
  const { theme, t, animate } = ctx;
  const { cols, rows } = scr;
  // Ambient layer updates at ~3 Hz so steady-state frames only repaint the foreground (cheap over SSH).
  const tt = animate ? Math.floor(t * 2) / 2 : 0;
  const glow = theme.glow * 0.16;
  for (let y = 0; y < rows; y++) {
    const fall = 1 - y / rows;
    const vert = mix(theme.bg, theme.panel, (y / rows) * 0.45);
    for (let x = 0; x < cols; x++) {
      const wave = (Math.sin(x * 0.07 + tt * 0.25 + Math.sin(y * 0.25 + tt * 0.15) * 1.8) + 1) / 2;
      const hue = gradient(theme.accents, Math.max(0, Math.min(1, x / cols + Math.sin(tt * 0.1) * 0.2)));
      const i = y * cols + x;
      // snap channels to steps of 8 so a slow drift only repaints cells that cross a step
      scr.bg[i] = mix(vert, hue, glow * wave * (0.35 + 0.65 * fall)) & 0xf8f8f8;
      const h = hash(x, y);
      if (h % 1000 < theme.nightness * 14) {
        const tw = 0.5 + 0.5 * Math.sin(tt * (0.8 + (h % 7) * 0.3) + (h % 13));
        scr.ch[i] = h % 11 === 0 ? '✦' : h % 3 === 0 ? '∙' : '·';
        scr.fg[i] = mix(scr.bg[i], theme.text, 0.2 + 0.65 * tw);
      }
    }
  }
  if (animate && theme.nightness > 0.5) drawShootingStar(scr, theme, t);
}

function drawShootingStar(scr, theme, t) {
  const period = 11;
  const slot = Math.floor(t / period);
  const p = ((t % period) / 0.9);
  if (p >= 1) return;
  const h = hash(slot, 7);
  const x0 = (h % Math.max(1, scr.cols - 20)) + 10;
  const y0 = (h >>> 8) % Math.max(1, Math.floor(scr.rows / 3));
  for (let k = 0; k < 7; k++) {
    const x = Math.round(x0 + p * 28 - k * 2);
    const y = Math.round(y0 + p * 9 - k * 0.7);
    scr.set(x, y, k === 0 ? '✦' : k < 3 ? '•' : '·', mix(scr.bg[Math.max(0, y) * scr.cols + Math.max(0, x)] || theme.bg, theme.text, 1 - k / 8));
  }
}

module.exports = { drawBackground, hash };
