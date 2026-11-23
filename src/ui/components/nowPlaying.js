const { text, gradientText, box, tint } = require('../engine/draw');
const { mix, gradient } = require('../engine/color');
const { strWidth, truncate, marquee } = require('../engine/width');
const { drawSpectrum } = require('./spectrum');
const { inner } = require('../layout');

const fmt = (secs) => {
  secs = Math.max(0, secs || 0);
  return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
};

// 3x5 block font for the idle clock
const FONT = {
  0: ['███', '█ █', '█ █', '█ █', '███'], 1: [' █ ', '██ ', ' █ ', ' █ ', '███'],
  2: ['███', '  █', '███', '█  ', '███'], 3: ['███', '  █', '███', '  █', '███'],
  4: ['█ █', '█ █', '███', '  █', '  █'], 5: ['███', '█  ', '███', '  █', '███'],
  6: ['███', '█  ', '███', '█ █', '███'], 7: ['███', '  █', '  █', '  █', '  █'],
  8: ['███', '█ █', '███', '█ █', '███'], 9: ['███', '█ █', '███', '  █', '███'],
  ':': [' ', '█', ' ', '█', ' '],
};

function drawBigClock(scr, x, y, now, theme, t) {
  const str = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const blink = Math.floor(t) % 2 === 0;
  let cx = x;
  const widthTotal = Array.from(str).reduce((w, c) => w + FONT[c][0].length + 1, 0) - 1;
  for (const c of str) {
    const glyph = FONT[c];
    for (let row = 0; row < 5; row++) {
      for (let k = 0; k < glyph[row].length; k++) {
        if (glyph[row][k] !== '█') continue;
        if (c === ':' && !blink) continue;
        scr.set(cx + k, y + row, '█', gradient(theme.accents, (cx + k - x) / Math.max(1, widthTotal)));
      }
    }
    cx += glyph[0].length + 1;
  }
  return widthTotal;
}

function greeting(h) {
  if (h < 5) return 'Still up? Let the music carry you';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night, DJ';
}

function drawChips(scr, x, y, w, ctx) {
  const { state, theme, beat, playing } = ctx;
  const chips = [];
  const bpm = state.currentTrack && state.currentTrack.bpm;
  const pulse = mix(theme.accents[0], 0xffffff, 0.5 * beat.kick);
  const isLive = state.currentTrack && state.currentTrack.isLive;
  if (!isLive) chips.push([`⚡ ${bpm ? bpm + ' BPM' : 'BPM …'}`, playing ? pulse : theme.dim]);
  else chips.push([`◉ ${[state.currentTrack.codec, state.currentTrack.bitrate ? state.currentTrack.bitrate + 'k' : null].filter(Boolean).join(' ') || 'STREAM'}`, theme.accents[2]]);
  const vol = state.volume !== undefined ? state.volume : 50;
  const vb = Math.round(vol / 100 * 6);
  chips.push([`VOL ${'▮'.repeat(vb)}${'▯'.repeat(6 - vb)} ${vol}`, theme.accents[1]]);
  if (state.autoMix) chips.push(['⟳ AUTO-MIX', theme.accents[2]]);
  if (state.filterMode && state.filterMode !== 'off') chips.push([`LPF ${String(state.filterMode).toUpperCase()}`, theme.accents[2]]);
  if (state.loopActive) chips.push(['⟲ LOOP', theme.accents[0]]);
  chips.push([`VIZ ${(state.visualizerMode || 'bars').toUpperCase()}`, theme.dim]);
  let cx = x;
  for (const [label, color] of chips) {
    const need = strWidth(label) + 3;
    if (cx + need - 3 > x + w) break;
    text(scr, cx, y, label, { fg: color, bold: true });
    cx += need;
  }
}

function drawProgress(scr, x, y, w, ctx) {
  const { state, theme, beat, displayTime, playing, t } = ctx;
  const len = (state.progress && state.progress.length) || 0;
  const cur = Math.min(displayTime, len || displayTime);
  const left = fmt(cur);
  const right = fmt(len);
  const bx = x + left.length + 1;
  const bw = w - left.length - right.length - 2;
  text(scr, x, y, left, { fg: theme.text, bold: true });
  text(scr, x + w - right.length, y, right, { fg: theme.dim });
  if (bw < 4) return;

  if (len <= 0) { // loading shimmer
    for (let i = 0; i < bw; i++) {
      const d = Math.abs(i - ((t * 14) % (bw + 8)) + 4);
      scr.set(bx + i, y, '─', mix(theme.dim, theme.accents[0], Math.max(0, 1 - d / 5)));
    }
    return;
  }
  const frac = Math.max(0, Math.min(1, cur / len));
  const head = Math.min(bw - 1, Math.floor(frac * bw));
  const loopA = state.loopActive && state.loopStart != null ? Math.floor(state.loopStart / len * bw) : -1;
  const loopB = state.loopActive && state.loopEnd != null ? Math.floor(state.loopEnd / len * bw) : -1;
  for (let i = 0; i < bw; i++) {
    const inLoop = loopA >= 0 && i >= loopA && i <= loopB;
    if (i < head) scr.set(bx + i, y, inLoop ? '═' : '━', gradient(theme.accents, i / Math.max(1, bw - 1)), undefined, true);
    else if (i === head) scr.set(bx + i, y, '●', mix(theme.text, 0xffffff, 0.4 * beat.kick), undefined, true);
    else scr.set(bx + i, y, inLoop ? '═' : '─', inLoop ? theme.accents[2] : mix(theme.dim, theme.panel, 0.35));
  }
  // cue markers on the line below
  const cues = state.cues || {};
  for (let n = 1; n <= 4; n++) {
    if (cues[n] == null) continue;
    const cx = bx + Math.min(bw - 2, Math.floor(cues[n] / len * bw));
    text(scr, cx, y + 1, `◆${n}`, { fg: theme.accents[1], bold: true });
  }
}

// Live radio has no timeline: pulsing LIVE badge, listening time and a flowing signal line.
function drawLive(scr, x, y, w, ctx) {
  const { theme, beat, displayTime, playing, t } = ctx;
  const pulse = playing ? 0.5 + 0.5 * Math.sin(t * 4) : 0.2;
  const badge = '● LIVE';
  text(scr, x, y, badge, { fg: mix(theme.accents[2], 0xffffff, 0.35 * pulse + 0.3 * beat.kick), bold: true });
  const right = `listening ${fmt(displayTime)}`;
  text(scr, x + w - strWidth(right), y, right, { fg: theme.dim });
  const bx = x + strWidth(badge) + 1;
  const bw = w - strWidth(badge) - strWidth(right) - 2;
  for (let i = 0; i < bw; i++) {
    const wave = playing ? (Math.sin(i * 0.5 - t * 6) + 1) / 2 : 0.1;
    scr.set(bx + i, y, wave > 0.66 ? '━' : wave > 0.33 ? '─' : '┄', mix(theme.dim, gradient(theme.accents, i / Math.max(1, bw - 1)), wave));
  }
}

function drawNowPlaying(scr, r, ctx) {
  const { theme, state, beat, t, now, playing } = ctx;
  tint(scr, r, theme.panel, 0.78);
  const glow = 0.3 * beat.kick;
  const status = ctx.status;
  const active = ['PLAYING', 'PAUSED', 'LOADING'].includes(status);
  box(scr, r, {
    colorAt: (u) => mix(theme.gradient(1 - u), 0xffffff, glow),
    title: active ? 'NOW PLAYING' : 'WELCOME',
    titleColor: theme.text,
  });
  const a = inner(r);
  if (a.w < 10 || a.h < 4) return;

  if (!active) {
    const clockH = 5;
    const cw = 4 * 3 + 1 + 4;
    const cx = a.x + Math.max(0, Math.floor((a.w - cw) / 2));
    const top = a.y + Math.max(0, Math.floor((a.h - 15) / 3));
    drawBigClock(scr, cx, top, now, theme, t);
    const g = greeting(now.getHours());
    text(scr, a.x + Math.max(0, Math.floor((a.w - strWidth(g)) / 2)), top + clockH + 1, g, { fg: theme.text, bold: true });
    const hint = `${(state.tracks || []).length} tracks · ⏎ play · n random · b radio`;
    text(scr, a.x + Math.max(0, Math.floor((a.w - strWidth(hint)) / 2)), top + clockH + 2, hint, { fg: theme.dim });
    const vh = Math.min(4, Math.max(0, a.h - (top - a.y) - clockH - 4));
    if (vh > 0) drawSpectrum(scr, { x: a.x, y: a.y + a.h - vh, w: a.w, h: vh }, ctx);
    return;
  }

  const track = state.currentTrack || {};
  const isLive = !!track.isLive;
  const title = (isLive && state.streamTitle) || track.title || track.filename || 'Unknown';
  gradientText(scr, a.x, a.y, `♫ ${marquee(title, a.w - 2, t, 6)}`, theme.accents, { bold: true }, 0, 0.7);
  const sub = isLive
    ? `◉ ${track.title}${track.album ? ' · ' + track.album : ''}`
    : [track.artist, track.album].filter(Boolean).join(' · ') || 'Unknown Artist';
  text(scr, a.x + 2, a.y + 1, truncate(sub, a.w - 2), { fg: theme.dim });

  const footerRows = 4; // progress, cues, blank, chips
  const mode = state.visualizerMode || 'bars';
  const vizH = mode === 'off' ? 0 : Math.max(0, Math.min(8, a.h - 3 - footerRows));
  if (vizH > 0) drawSpectrum(scr, { x: a.x, y: a.y + 3, w: a.w, h: vizH }, ctx);
  const py = a.y + a.h - footerRows;
  if (isLive) drawLive(scr, a.x, py, a.w, ctx);
  else drawProgress(scr, a.x, py, a.w, ctx);
  drawChips(scr, a.x, py + 3, a.w, ctx);
  if (status === 'PAUSED') {
    const msg = '❚❚ PAUSED';
    if (Math.floor(t * 1.5) % 2 === 0) text(scr, a.x + a.w - strWidth(msg), a.y, msg, { fg: theme.accents[2], bold: true });
  }
}

module.exports = { drawNowPlaying, fmt };
