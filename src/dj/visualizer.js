const BARS = [' ', ' ', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
const WAVE_CHARS = ['_', '.', '-', '~', '=', 'x', '#', '@'];

// Vibrant ANSI 256 color codes for premium DJ look
const COLORS = {
  top: '\x1b[1;38;5;198m',    // Neon Hot Pink (Peaks)
  mid: '\x1b[1;38;5;220m',    // Electric Gold (Mids)
  bot: '\x1b[1;38;5;45m',     // Vibrant Cyan (Bass)
  magenta: '\x1b[1;38;5;201m',// Neon Magenta (BPM Frame)
  yellow: '\x1b[1;38;5;226m', // Bright Yellow (BPM Text)
  cyan: '\x1b[1;38;5;51m',    // Neon Aqua
  idle: '\x1b[38;5;37m',      // Muted Cyan for stopped/paused
  rst: '\x1b[0m'
};

/**
 * Raw single-line spectrum generator (kept for backward compatibility)
 */
function generateSpectrum(time, bpm = 120, volume = 50, isPlaying = true, width = 30) {
  if (!isPlaying) {
    return '—'.repeat(width);
  }

  const volNorm = Math.max(0.15, volume / 100);
  const safeBpm = bpm > 0 ? bpm : 120;
  const beatPeriod = 60 / safeBpm;
  const phase = ((time % beatPeriod) + beatPeriod) % beatPeriod / beatPeriod;

  const chars = [];
  for (let i = 0; i < width; i++) {
    const freq = (i + 1) / width;
    const wave1 = Math.sin(time * 5 + i * 0.45);
    const wave2 = Math.cos(time * 9 - i * 0.75);
    const beatPulse = Math.pow(Math.cos(phase * Math.PI), 4) * (1 - freq * 0.5);

    let level = (0.25 + 0.3 * wave1 + 0.2 * wave2 + 0.55 * beatPulse) * volNorm;
    level = Math.max(0, Math.min(1, level));
    const idx = Math.floor(level * (BARS.length - 1));
    chars.push(BARS[idx]);
  }
  return chars.join('');
}

/**
 * Raw single-line waveform generator (kept for backward compatibility)
 */
function generateWaveform(time, bpm = 120, volume = 50, isPlaying = true, width = 30) {
  if (!isPlaying) {
    return '~'.repeat(width);
  }

  const volNorm = Math.max(0.2, volume / 100);
  const chars = [];
  for (let i = 0; i < width; i++) {
    const s = Math.sin(time * 4 + i * 0.3) * Math.cos(time * 2 - i * 0.2) * volNorm;
    const norm = Math.max(0, Math.min(1, (s + 1) / 2));
    const idx = Math.floor(norm * (WAVE_CHARS.length - 1));
    chars.push(WAVE_CHARS[idx]);
  }
  return chars.join('');
}

/**
 * Synthetic spectrum levels (0.04..1) per column; shared by the legacy renderer and the TUI.
 */
function computeBarLevels(time, bpm = 120, volume = 50, width = 38) {
  const safeBpm = bpm > 0 ? bpm : 120;
  const beatPeriod = 60 / safeBpm;
  const phase = ((time % beatPeriod) + beatPeriod) % beatPeriod / beatPeriod;
  const volNorm = Math.max(0.2, volume / 100);
  const levels = [];
  for (let i = 0; i < width; i++) {
    const freq = i / Math.max(1, width - 1);
    const kick = Math.pow(Math.cos(phase * Math.PI), 6) * Math.max(0, 1 - freq * 1.5);
    const snarePhase = (phase + 0.5) % 1.0;
    const snare = Math.pow(Math.cos(snarePhase * Math.PI), 8) * Math.sin(freq * Math.PI) * 0.7;
    const hihat = Math.abs(Math.sin(time * 18 + i * 1.5)) * (freq > 0.4 ? freq : 0) * 0.45;
    const wave = 0.25 * Math.sin(time * 6 + i * 0.45) + 0.2 * Math.cos(time * 12 - i * 0.7);
    const raw = (0.15 + wave + 0.6 * kick + 0.4 * snare + 0.3 * hihat) * volNorm;
    levels.push(Math.max(0.04, Math.min(1.0, raw)));
  }
  return levels;
}

/**
 * Multi-row colorful spectrum equalizer
 */
function generateMultiRowSpectrum(time, bpm = 120, volume = 50, isPlaying = true, width = 38, height = 3) {
  if (!isPlaying) {
    const idleLine = ' '.repeat(width);
    const restingLine = COLORS.idle + '▄'.repeat(width) + COLORS.rst;
    return [idleLine, idleLine, restingLine];
  }

  const safeBpm = bpm > 0 ? bpm : 120;

  const maxUnits = height * 8;
  const barUnits = computeBarLevels(time, safeBpm, volume, width).map((raw) => Math.round(raw * maxUnits));

  const rows = [];
  for (let r = 0; r < height; r++) {
    const rowBottom = (height - 1 - r) * 8;
    const rowTop = rowBottom + 8;
    const color = (r === 0) ? COLORS.top : (r === 1) ? COLORS.mid : COLORS.bot;
    let line = '';
    for (let i = 0; i < width; i++) {
      const u = barUnits[i];
      if (u >= rowTop) {
        line += '█';
      } else if (u > rowBottom) {
        line += BARS[u - rowBottom];
      } else {
        line += ' ';
      }
    }
    rows.push(color + line + COLORS.rst);
  }
  return rows;
}

/**
 * Multi-row colorful animated waveform
 */
function generateMultiRowWaveform(time, bpm = 120, volume = 50, isPlaying = true, width = 38, height = 3) {
  if (!isPlaying) {
    const idleLine = ' '.repeat(width);
    const restingLine = COLORS.idle + '~'.repeat(width) + COLORS.rst;
    return [idleLine, restingLine, idleLine];
  }

  const volNorm = Math.max(0.2, volume / 100);
  const rows = ['', '', ''];

  for (let i = 0; i < width; i++) {
    const angle = time * 8 + i * 0.35;
    const s = Math.sin(angle) * volNorm;
    
    if (s > 0.35) {
      rows[0] += COLORS.top + '⌢' + COLORS.rst;
      rows[1] += COLORS.mid + '│' + COLORS.rst;
      rows[2] += ' ';
    } else if (s < -0.35) {
      rows[0] += ' ';
      rows[1] += COLORS.mid + '│' + COLORS.rst;
      rows[2] += COLORS.bot + '⌣' + COLORS.rst;
    } else {
      rows[0] += ' ';
      rows[1] += COLORS.yellow + '─' + COLORS.rst;
      rows[2] += ' ';
    }
  }

  return rows;
}

/**
 * Renders a bold, colorful 3-line framed BPM box for the right side
 */
function renderBpmBox(bpm, isPlaying = true) {
  const bpmNum = (bpm && bpm > 0) ? `${bpm} BPM` : '--- BPM';
  const icon = isPlaying ? '⚡' : '❚❚';
  const text = `${icon} ${bpmNum}`;

  // Pad text to 14 chars
  const padTotal = 14 - text.length;
  const padLeft = Math.max(0, Math.floor(padTotal / 2));
  const padRight = Math.max(0, padTotal - padLeft);
  const centered = ' '.repeat(padLeft) + text + ' '.repeat(padRight);

  return [
    `${COLORS.magenta}╭────────────────╮${COLORS.rst}`,
    `${COLORS.cyan}│${COLORS.yellow} ${centered} ${COLORS.cyan}│${COLORS.rst}`,
    `${COLORS.magenta}╰────────────────╯${COLORS.rst}`
  ];
}

/**
 * Main visualizer deck: displays the colorful multi-row equalizer on the left
 * and the prominent colorful BPM box on the right.
 */
function renderVisualizer(state, width = 30) {
  const mode = state.visualizerMode || 'bars';
  if (mode === 'off') return null;

  const isPlaying = state.status === 'PLAYING';
  const time = (state.progress && state.progress.time) ? state.progress.time : 0;
  const bpm = (state.currentTrack && state.currentTrack.bpm) ? state.currentTrack.bpm : 120;
  const volume = state.volume !== undefined ? state.volume : 50;

  // Adapt width based on terminal width if possible
  const termCols = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80;
  const bpmBoxWidth = 18;
  const gap = 3;
  const targetEqWidth = Math.max(20, Math.min(termCols - bpmBoxWidth - gap - 2, 44));

  const eqRows = (mode === 'waveform')
    ? generateMultiRowWaveform(time, bpm, volume, isPlaying, targetEqWidth, 3)
    : generateMultiRowSpectrum(time, bpm, volume, isPlaying, targetEqWidth, 3);

  const bpmRows = renderBpmBox(bpm, isPlaying);

  const combinedLines = [];
  for (let r = 0; r < 3; r++) {
    combinedLines.push(eqRows[r] + ' '.repeat(gap) + bpmRows[r]);
  }

  return combinedLines.join('\n');
}

module.exports = {
  computeBarLevels,
  renderVisualizer,
  renderBpmBox,
  generateSpectrum,
  generateWaveform,
  generateMultiRowSpectrum,
  generateMultiRowWaveform,
  COLORS
};
