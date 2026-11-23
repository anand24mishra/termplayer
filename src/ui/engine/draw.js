const { mix, scale, gradient } = require('./color');
const { charWidth, strWidth } = require('./width');

// Draw text; returns the x after the last drawn cell. opts: fg, bg, bold, max (max cells)
function text(scr, x, y, str, opts = {}) {
  const max = opts.max === undefined ? Infinity : opts.max;
  let used = 0;
  for (const ch of String(str)) {
    const w = charWidth(ch);
    if (w === 0) continue;
    if (used + w > max || x + used >= scr.cols) break;
    scr.set(x + used, y, ch, opts.fg, opts.bg, opts.bold);
    if (w === 2) scr.set(x + used + 1, y, '', opts.fg, opts.bg, opts.bold);
    used += w;
  }
  return x + used;
}

// Text whose per-character color follows a gradient (t0..t1 across the string).
function gradientText(scr, x, y, str, stops, opts = {}, t0 = 0, t1 = 1) {
  const chars = Array.from(String(str));
  let cx = x;
  chars.forEach((ch, i) => {
    const t = chars.length > 1 ? t0 + (t1 - t0) * (i / (chars.length - 1)) : t0;
    cx = text(scr, cx, y, ch, { ...opts, fg: gradient(stops, t) });
  });
  return cx;
}

function fillRect(scr, r, bg, ch = ' ') {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) scr.set(x, y, ch, undefined, bg);
  }
}

// Blend a color into the background of a rect, keeping whatever glyphs are already there.
function tint(scr, r, color, amount) {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) {
      if (x < 0 || y < 0 || x >= scr.cols || y >= scr.rows) continue;
      const i = y * scr.cols + x;
      scr.bg[i] = mix(scr.bg[i], color, amount);
    }
  }
}

function dimAll(scr, k) {
  for (let i = 0; i < scr.bg.length; i++) {
    scr.bg[i] = scale(scr.bg[i], k);
    if (scr.fg[i] >= 0) scr.fg[i] = scale(scr.fg[i], k);
  }
}

// Rounded box. opts: colorAt(t) -> color for t in 0..1 left to right, title, titleColor
function box(scr, r, opts) {
  const { colorAt, title, titleColor } = opts;
  if (r.w < 2 || r.h < 2) return;
  const x1 = r.x + r.w - 1;
  const y1 = r.y + r.h - 1;
  const tAt = (x) => (r.w > 1 ? (x - r.x) / (r.w - 1) : 0);
  for (let x = r.x + 1; x < x1; x++) {
    scr.set(x, r.y, '─', colorAt(tAt(x)));
    scr.set(x, y1, '─', colorAt(tAt(x)));
  }
  for (let y = r.y + 1; y < y1; y++) {
    scr.set(r.x, y, '│', colorAt(0));
    scr.set(x1, y, '│', colorAt(1));
  }
  scr.set(r.x, r.y, '╭', colorAt(0));
  scr.set(x1, r.y, '╮', colorAt(1));
  scr.set(r.x, y1, '╰', colorAt(0));
  scr.set(x1, y1, '╯', colorAt(1));
  if (title && r.w > 8) {
    const label = ` ${title} `;
    text(scr, r.x + 2, r.y, label, { fg: titleColor, bold: true, max: r.w - 4 });
  }
}

module.exports = { text, gradientText, fillRect, tint, dimAll, box, strWidth };
