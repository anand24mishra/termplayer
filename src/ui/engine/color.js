// Colors are packed 0xRRGGBB integers. -1 means "terminal default".
const clamp255 = (v) => Math.max(0, Math.min(255, Math.round(v)));
const hex = (s) => parseInt(String(s).replace('#', ''), 16);
const unpack = (c) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const pack = (r, g, b) => (clamp255(r) << 16) | (clamp255(g) << 8) | clamp255(b);

function mix(a, b, t) {
  if (a < 0) return b;
  if (b < 0) return a;
  t = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = unpack(a);
  const [br, bg, bb] = unpack(b);
  return pack(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function scale(c, k) {
  if (c < 0) return c;
  const [r, g, b] = unpack(c);
  return pack(r * k, g * k, b * k);
}

// Blend a color with white (k>0) or black (k<0).
function brighten(c, k) {
  return k >= 0 ? mix(c, 0xffffff, k) : mix(c, 0x000000, -k);
}

function gradient(stops, t) {
  if (stops.length === 1) return stops[0];
  t = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return mix(stops[i], stops[i + 1], t - i);
}

function rgbTo256(c) {
  const [r, g, b] = unpack(c);
  if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10) {
    const gray = Math.round(((r + g + b) / 3 - 8) / 10);
    if (gray <= 0) return 16;
    if (gray >= 24) return 231;
    return 232 + gray;
  }
  const q = (v) => Math.round(v / 255 * 5);
  return 16 + 36 * q(r) + 6 * q(g) + q(b);
}

function detectColorMode(env = process.env) {
  if (env.NO_COLOR) return 'none';
  const ct = String(env.COLORTERM || '').toLowerCase();
  if (ct.includes('truecolor') || ct.includes('24bit')) return 'true';
  if (['iTerm.app', 'vscode', 'WezTerm', 'ghostty', 'Hyper'].includes(env.TERM_PROGRAM)) return 'true';
  if (/kitty|alacritty|wezterm|ghostty/i.test(env.TERM || '')) return 'true';
  return '256';
}

function fgSeq(c, mode) {
  if (c < 0 || mode === 'none') return '';
  if (mode === 'true') { const [r, g, b] = unpack(c); return `\x1b[38;2;${r};${g};${b}m`; }
  return `\x1b[38;5;${rgbTo256(c)}m`;
}

function bgSeq(c, mode) {
  if (c < 0 || mode === 'none') return '';
  if (mode === 'true') { const [r, g, b] = unpack(c); return `\x1b[48;2;${r};${g};${b}m`; }
  return `\x1b[48;5;${rgbTo256(c)}m`;
}

module.exports = { hex, unpack, pack, mix, scale, brighten, gradient, rgbTo256, detectColorMode, fgSeq, bgSeq };
