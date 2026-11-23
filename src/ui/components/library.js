const { text, box, tint } = require('../engine/draw');
const { mix } = require('../engine/color');
const { strWidth, truncate, marquee } = require('../engine/width');
const { inner } = require('../layout');

const EQ = ['▁', '▃', '▅', '▇', '▅', '▃'];

function sameTrack(a, b) {
  if (!a || !b) return false;
  return (a.filePath && a.filePath === b.filePath) || (a.id && a.id === b.id) || (a.title === b.title && a.artist === b.artist);
}

function drawLibrary(scr, r, ctx) {
  const { theme, state, beat, t } = ctx;
  tint(scr, r, theme.panel, 0.78);
  const tracks = state.tracks || [];
  const sel = state.status === 'SEARCHING' ? ctx.libSel : (state.selectedIndex || 0);
  const count = tracks.length ? `${Math.min(tracks.length, sel + 1)}/${tracks.length}` : '0';
  const glow = 0.25 * beat.kick;
  box(scr, r, {
    colorAt: (u) => mix(theme.gradient(u), 0xffffff, glow),
    title: `LIBRARY · ${count}`,
    titleColor: theme.text,
  });

  const area = inner(r);
  if (!tracks.length) {
    text(scr, area.x, area.y + 1, 'No local tracks found.', { fg: theme.dim });
    text(scr, area.x, area.y + 2, 'Drop audio into ./songs', { fg: theme.dim });
    return;
  }

  // Keep the selection in view; scrolled window centered on it.
  const visible = area.h;
  let start = Math.max(0, Math.min(tracks.length - visible, sel - Math.floor(visible / 2)));
  if (tracks.length <= visible) start = 0;
  for (let row = 0; row < visible && start + row < tracks.length; row++) {
    const i = start + row;
    const track = tracks[i];
    const y = area.y + row;
    const isSel = i === sel;
    const isPlaying = (ctx.status === 'PLAYING' || ctx.status === 'PAUSED') && sameTrack(track, state.currentTrack);
    const bg = isSel ? mix(theme.panel, theme.accents[0], 0.28) : undefined;
    if (isSel) {
      for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        scr.set(x, y, ' ', undefined, mix(bg, theme.accents[2], (x - r.x) / r.w * 0.25));
      }
    }
    const marker = isPlaying ? (ctx.status === 'PLAYING' ? EQ[Math.floor(t * 8) % EQ.length] : '❚') : isSel ? '▸' : ' ';
    text(scr, area.x, y, marker, { fg: isPlaying ? theme.accents[0] : theme.accents[1], bold: true });

    const cloud = track.source === 'online-cached' ? ' ☁' : '';
    const artist = track.artist || '';
    const room = area.w - 2;
    const artistW = Math.min(strWidth(artist), Math.floor(room * 0.4));
    const titleRoom = Math.max(4, room - artistW - 2 - strWidth(cloud));
    const title = track.title || track.filename || 'Unknown';
    const shown = isSel ? marquee(title, titleRoom, t - 0, 5) : truncate(title, titleRoom);
    text(scr, area.x + 2, y, shown, { fg: isSel || isPlaying ? theme.text : mix(theme.text, theme.dim, 0.45), bold: isSel || isPlaying, bg });
    if (cloud) text(scr, area.x + 2 + Math.min(strWidth(shown), titleRoom), y, cloud, { fg: theme.accents[0], bg });
    if (artistW > 0) {
      const ax = area.x + area.w - artistW;
      text(scr, ax, y, truncate(artist, artistW), { fg: theme.dim, bg });
    }
  }

  // Scrollbar
  if (tracks.length > visible) {
    const sbH = area.h;
    const thumbH = Math.max(1, Math.round(sbH * visible / tracks.length));
    const thumbY = Math.round((sbH - thumbH) * (start / (tracks.length - visible)));
    for (let k = 0; k < sbH; k++) {
      const on = k >= thumbY && k < thumbY + thumbH;
      scr.set(r.x + r.w - 1, area.y + k, on ? '┃' : '│', on ? theme.accents[1] : mix(theme.dim, theme.panel, 0.6));
    }
  }
}

module.exports = { drawLibrary };
