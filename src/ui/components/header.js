const { text, gradientText } = require('../engine/draw');
const { mix } = require('../engine/color');
const { strWidth } = require('../engine/width');

const TITLE = '◉ T E R M P L A Y E R';

function pad2(n) { return String(n).padStart(2, '0'); }

function drawHeader(scr, r, ctx) {
  const { theme, now, state, beat } = ctx;
  const glow = 0.15 * beat.kick;
  gradientText(scr, r.x + 1, r.y, TITLE, theme.accents.map((c) => mix(c, 0xffffff, glow)), { bold: true });

  const clock = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const right = `${theme.icon} ${theme.label} · ${clock}`;
  const rx = r.x + r.w - strWidth(right) - 1;
  text(scr, rx, r.y, right, { fg: theme.accents[1], bold: true });

  const live = state.currentTrack && state.currentTrack.isLive;
  const mode = state.status === 'PLAYING' && live ? '◉ LIVE'
    : { PLAYING: '▶ PLAYING', PAUSED: '❚❚ PAUSED', LOADING: '… LOADING', SEARCHING: '⌕ SEARCH', RADIO: '◉ RADIO', IDLE: '■ READY' }[state.status] || '';
  const mx = r.x + 1 + strWidth(TITLE) + 3;
  const lineEnd = rx - 2;
  if (mx < lineEnd) {
    text(scr, mx, r.y, mode, { fg: state.status === 'PLAYING' ? (live ? theme.accents[2] : theme.accents[0]) : theme.dim, bold: true });
    for (let x = mx + strWidth(mode) + 2; x < lineEnd; x++) {
      const t = (x - mx) / Math.max(1, lineEnd - mx);
      scr.set(x, r.y, '─', mix(theme.dim, theme.accents[1], 0.15 + 0.25 * (1 - t)));
    }
  }
}

module.exports = { drawHeader };
