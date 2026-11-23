const { text, box, fillRect, dimAll } = require('../engine/draw');
const { mix } = require('../engine/color');
const { strWidth, truncate } = require('../engine/width');
const { filterStations, availableGenres } = require('../../library/radioProvider');

function drawRadio(scr, ctx) {
  const { state, theme, t, beat } = ctx;
  const radio = state.radio;
  dimAll(scr, 0.5);
  const w = Math.min(scr.cols - 6, 76);
  const maxRows = Math.max(3, Math.min(12, scr.rows - 12));
  const list = filterStations(radio.stations, radio.genre, radio.filter);
  const genres = availableGenres(radio.stations);
  const h = 7 + Math.min(maxRows, Math.max(list.length, 3));
  const r = { x: Math.floor((scr.cols - w) / 2), y: Math.max(1, Math.floor((scr.rows - h) / 2)), w, h };
  const bg = theme.panel;
  fillRect(scr, r, bg);
  const glow = 0.3 * beat.kick;
  box(scr, r, {
    colorAt: (u) => mix(theme.gradient(u), 0xffffff, glow),
    title: `◉ BOLLYWOOD RADIO${radio.stations.length ? ` · ${radio.stations.length} stations` : ''}`,
    titleColor: theme.text,
  });

  // Genre chips (only genres that have stations)
  let x = r.x + 3;
  for (const g of genres) {
    const count = g === 'All' ? radio.stations.length : radio.stations.filter((s) => s.genres.includes(g)).length;
    const label = ` ${g} ${count} `;
    if (x + strWidth(label) > r.x + w - 2) break;
    const on = g === radio.genre;
    text(scr, x, r.y + 1, label, {
      fg: on ? theme.bg : theme.dim, bg: on ? theme.accents[0] : bg, bold: on,
    });
    x += strWidth(label) + 1;
  }

  // Filter line
  const caret = Math.floor(t * 2) % 2 === 0 ? '▏' : ' ';
  text(scr, r.x + 3, r.y + 2, '› ', { fg: theme.accents[0], bold: true, bg });
  text(scr, r.x + 5, r.y + 2, truncate(radio.filter, w - 9) + caret, { fg: theme.text, bold: true, bg });
  for (let i = r.x + 2; i < r.x + w - 2; i++) scr.set(i, r.y + 3, '─', mix(theme.dim, bg, 0.5), bg);

  const top = r.y + 4;
  if (radio.loading && !radio.stations.length) {
    const dots = '.'.repeat(1 + (Math.floor(t * 3) % 3));
    text(scr, r.x + 3, top, `Tuning the dial${dots}`, { fg: theme.accents[1], bg, bold: true });
  } else if (radio.error && !radio.stations.length) {
    text(scr, r.x + 3, top, truncate(`✗ ${radio.error}`, w - 6), { fg: theme.accents[2], bg });
    text(scr, r.x + 3, top + 1, 'Press esc, then b to try again', { fg: theme.dim, bg });
  } else if (!list.length) {
    text(scr, r.x + 3, top, 'No stations match your filter', { fg: theme.dim, bg });
  } else {
    const sel = Math.min(radio.selected || 0, list.length - 1);
    const start = Math.max(0, Math.min(list.length - maxRows, sel - Math.floor(maxRows / 2)));
    list.slice(start, start + maxRows).forEach((st, k) => {
      const i = start + k;
      const y = top + k;
      const isSel = i === sel;
      const rowBg = isSel ? mix(bg, theme.accents[0], 0.3) : bg;
      for (let xx = r.x + 1; xx < r.x + w - 1; xx++) scr.set(xx, y, ' ', undefined, rowBg);
      const playing = state.currentTrack && state.currentTrack.id === st.id && state.previousStatus !== 'IDLE';
      text(scr, r.x + 3, y, isSel ? '▸' : playing ? '♫' : ' ', { fg: theme.accents[0], bg: rowBg, bold: true });
      const info = [st.codec && st.bitrate ? `${st.codec} ${st.bitrate}` : st.codec, st.country, st.votes > 0 ? `♥ ${st.votes}` : null]
        .filter(Boolean).join(' · ');
      const infoW = Math.min(strWidth(info), Math.floor(w * 0.4));
      text(scr, r.x + w - 3 - infoW, y, truncate(info, infoW), { fg: theme.dim, bg: rowBg });
      text(scr, r.x + 5, y, truncate(st.title, w - 10 - infoW), {
        fg: isSel ? theme.text : mix(theme.text, theme.dim, 0.4), bg: rowBg, bold: isSel,
      });
    });
  }
  text(scr, r.x + 3, r.y + h - 2, '⏎ tune in   ←→ genre   ⇥ random   esc close', { fg: theme.dim, bg });
}

module.exports = { drawRadio };
