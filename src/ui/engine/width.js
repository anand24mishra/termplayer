// Minimal display-width logic: wide (CJK / emoji) = 2, combining marks = 0, else 1.
function charWidth(ch) {
  const cp = ch.codePointAt(0);
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return 0;
  if ((cp >= 0x300 && cp <= 0x36f) || cp === 0x200b || cp === 0x200d || (cp >= 0xfe00 && cp <= 0xfe0f)) return 0;
  if (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0xa4cf) ||
    (cp >= 0xac00 && cp <= 0xd7a3) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe30 && cp <= 0xfe6f) ||
    (cp >= 0xff00 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x1f300 && cp <= 0x1faff) ||
    (cp >= 0x20000 && cp <= 0x3fffd)
  ) return 2;
  return 1;
}

function strWidth(str) {
  let w = 0;
  for (const ch of String(str)) w += charWidth(ch);
  return w;
}

function truncate(str, max) {
  str = String(str);
  if (max <= 0) return '';
  if (strWidth(str) <= max) return str;
  let out = '';
  let w = 0;
  for (const ch of str) {
    const cw = charWidth(ch);
    if (w + cw > max - 1) break;
    out += ch;
    w += cw;
  }
  return out + '…';
}

// Scrolling window over a long string (marquee). Falls back to truncation for wide glyphs.
function marquee(str, width, t, speed = 6) {
  str = String(str);
  if (strWidth(str) <= width) return str;
  const chars = Array.from(str + '   ·   ');
  if (chars.some((c) => charWidth(c) !== 1)) return truncate(str, width);
  const off = Math.floor(t * speed) % chars.length;
  let out = '';
  for (let i = 0; i < width; i++) out += chars[(off + i) % chars.length];
  return out;
}

module.exports = { charWidth, strWidth, truncate, marquee };
