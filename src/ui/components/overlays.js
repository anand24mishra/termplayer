const { text, box, fillRect, dimAll } = require('../engine/draw');
const { mix } = require('../engine/color');
const { strWidth, truncate } = require('../engine/width');

const TOAST_MS = 2600;
const FADE_MS = 600;

// Toast pill on the footer row; fades into the background before disappearing.
function drawToast(scr, ctx) {
  const { state, theme, nowMs } = ctx;
  if (!state.flashMessage || !state.flashAt) return;
  const age = nowMs - state.flashAt;
  if (age > TOAST_MS) return;
  const fade = age > TOAST_MS - FADE_MS ? (age - (TOAST_MS - FADE_MS)) / FADE_MS : 0;
  const msg = truncate(state.flashMessage, scr.cols - 10);
  const w = strWidth(msg) + 4;
  const x = Math.floor((scr.cols - w) / 2);
  const y = scr.rows - 1;
  const bg = mix(mix(theme.panel, theme.accents[0], 0.45), theme.bg, fade);
  for (let i = 0; i < w; i++) scr.set(x + i, y, ' ', undefined, bg);
  text(scr, x + 2, y, msg, { fg: mix(theme.text, bg, fade), bg, bold: true });
}

function drawSearch(scr, ctx) {
  const { state, theme, t } = ctx;
  dimAll(scr, 0.5);
  const w = Math.min(scr.cols - 6, 68);
  const results = state.searchResults || [];
  const maxRows = Math.max(3, Math.min(10, scr.rows - 10));
  const h = 5 + Math.min(maxRows, Math.max(results.length, 2));
  const r = { x: Math.floor((scr.cols - w) / 2), y: Math.max(1, Math.floor((scr.rows - h) / 2)), w, h };
  fillRect(scr, r, theme.panel);
  box(scr, r, { colorAt: (u) => theme.gradient(u), title: '⌕ SEARCH · Jamendo', titleColor: theme.text });
  const caret = Math.floor(t * 2) % 2 === 0 ? '▏' : ' ';
  text(scr, r.x + 3, r.y + 1, '› ', { fg: theme.accents[0], bold: true, bg: theme.panel });
  text(scr, r.x + 5, r.y + 1, truncate(state.query || '', w - 9) + caret, { fg: theme.text, bold: true, bg: theme.panel });
  for (let x = r.x + 2; x < r.x + w - 2; x++) scr.set(x, r.y + 2, '─', mix(theme.dim, theme.panel, 0.5), theme.panel);

  if (state.searchError) {
    text(scr, r.x + 3, r.y + 3, truncate(`✗ ${state.searchError}`, w - 6), { fg: theme.accents[2], bg: theme.panel });
  } else if (!results.length) {
    text(scr, r.x + 3, r.y + 3, state.query ? 'Searching…' : 'Type to find tracks online', { fg: theme.dim, bg: theme.panel });
  } else {
    const sel = state.selectedIndex || 0;
    const start = Math.max(0, Math.min(results.length - maxRows, sel - Math.floor(maxRows / 2)));
    results.slice(start, start + maxRows).forEach((tr, k) => {
      const i = start + k;
      const y = r.y + 3 + k;
      const isSel = i === sel;
      const bg = isSel ? mix(theme.panel, theme.accents[0], 0.3) : theme.panel;
      for (let x = r.x + 1; x < r.x + w - 1; x++) scr.set(x, y, ' ', undefined, bg);
      const label = `☁ ${tr.title || 'Unknown'} — ${tr.artist || 'Unknown Artist'}`;
      text(scr, r.x + 3, y, truncate(label, w - 6), { fg: isSel ? theme.text : mix(theme.text, theme.dim, 0.4), bg, bold: isSel });
    });
  }
  text(scr, r.x + 3, r.y + h - 2, '⏎ play   esc cancel', { fg: theme.dim, bg: theme.panel });
}

const HELP = [
  ['↑ ↓ / ⏎', 'browse / play'], ['space', 'pause · resume'], ['s', 'stop'], ['/', 'online search'], ['b', 'Bollywood radio browser'], ['n', 'play a random song'],
  ['+ -', 'volume'], ['1-4 · ⇧1-4', 'jump / overwrite hot cue'], ['l', 'loop in/out'],
  ['f · F', 'low-pass filter · sweep'], ['v', 'visualizer mode'],
  ['a', 'auto-mix queue'], ['t', 'cycle theme (auto/dawn/day/golden/dusk/night)'], ['?', 'this help'], ['ctrl+c', 'quit'],
];

function drawHelp(scr, ctx) {
  const { theme } = ctx;
  dimAll(scr, 0.5);
  const w = Math.min(scr.cols - 6, 64);
  const h = HELP.length + 4;
  const r = { x: Math.floor((scr.cols - w) / 2), y: Math.max(0, Math.floor((scr.rows - h) / 2)), w, h };
  fillRect(scr, r, theme.panel);
  box(scr, r, { colorAt: (u) => theme.gradient(u), title: 'KEYS', titleColor: theme.text });
  HELP.forEach(([k, d], i) => {
    text(scr, r.x + 3, r.y + 2 + i, k, { fg: theme.accents[0], bold: true, bg: theme.panel });
    text(scr, r.x + 18, r.y + 2 + i, truncate(d, w - 21), { fg: theme.text, bg: theme.panel });
  });
}

module.exports = { drawToast, drawSearch, drawHelp, TOAST_MS };
