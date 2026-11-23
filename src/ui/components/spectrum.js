const { mix, gradient } = require('../engine/color');
const { computeBarLevels } = require('../../dj/visualizer');

const BLOCKS = [' ', '▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

// Draws the visualizer into rect r. Bars (spectrum) or waveform; mode 'off' draws nothing.
function drawSpectrum(scr, r, ctx) {
  const { state, theme, beat, displayTime, playing, t } = ctx;
  const mode = state.visualizerMode || 'bars';
  if (mode === 'off' || r.h < 1 || r.w < 1) return;
  const bpm = state.currentTrack && state.currentTrack.bpm;
  const vol = state.volume !== undefined ? state.volume : 50;
  const accents = theme.accents;

  if (mode === 'waveform') {
    const vn = Math.max(0.25, vol / 100);
    const pxRows = r.h * 2;
    for (let i = 0; i < r.w; i++) {
      const amp = playing
        ? Math.sin(displayTime * 4 + i * 0.3) * Math.cos(displayTime * 2 - i * 0.2) * vn * (1 + 0.35 * beat.kick)
        : Math.sin(t * 0.8 + i * 0.25) * 0.12;
      const py = Math.max(0, Math.min(pxRows - 1, Math.round((0.5 - amp * 0.5) * (pxRows - 1))));
      const row = Math.floor(py / 2);
      const color = gradient(accents, i / Math.max(1, r.w - 1));
      scr.set(r.x + i, r.y + row, py % 2 === 0 ? '▀' : '▄', color, undefined, true);
    }
    return;
  }

  const levels = playing
    ? computeBarLevels(displayTime, bpm || 120, vol, r.w)
    : Array.from({ length: r.w }, (_, i) => 0.05 + 0.035 * (1 + Math.sin(t * 1.2 + i * 0.4)));
  const lift = playing ? 1 + 0.22 * beat.kick : 1;
  const maxUnits = r.h * 8;
  for (let i = 0; i < r.w; i++) {
    const units = Math.round(Math.min(1, levels[i] * lift) * maxUnits);
    const xf = i / Math.max(1, r.w - 1);
    for (let row = 0; row < r.h; row++) {
      const bottom = row * 8;
      const cell = Math.max(0, Math.min(8, units - bottom));
      if (cell === 0) continue;
      const rowFrac = (row + 1) / r.h;
      const color = mix(gradient(accents, 0.55 * xf + 0.45 * rowFrac), 0xffffff, playing ? 0.12 * beat.kick * rowFrac : 0);
      scr.set(r.x + i, r.y + r.h - 1 - row, BLOCKS[cell], playing ? color : mix(color, theme.panel, 0.55));
    }
  }
}

module.exports = { drawSpectrum };
