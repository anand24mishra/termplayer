const { fgSeq, bgSeq, detectColorMode } = require('./color');
const { charWidth } = require('./width');

// Cell buffer with frame diffing: only changed runs are written to the terminal.
class Screen {
  constructor(out = process.stdout, opts = {}) {
    this.out = out;
    this.mode = opts.mode || detectColorMode();
    this.active = false;
    this.resize(opts.cols || out.columns || 80, opts.rows || out.rows || 24);
  }

  resize(cols, rows) {
    this.cols = Math.max(1, cols);
    this.rows = Math.max(1, rows);
    const n = this.cols * this.rows;
    this.ch = new Array(n).fill(' ');
    this.fg = new Int32Array(n).fill(-1);
    this.bg = new Int32Array(n).fill(-1);
    this.bold = new Uint8Array(n);
    this.pch = null; // previous frame; null forces full repaint
    this.pfg = new Int32Array(n);
    this.pbg = new Int32Array(n);
    this.pbold = new Uint8Array(n);
  }

  begin(bg = -1) {
    this.ch.fill(' ');
    this.fg.fill(-1);
    this.bg.fill(bg);
    this.bold.fill(0);
  }

  // `undefined` keeps the existing value of a field; ch === null keeps the glyph.
  set(x, y, ch, fg, bg, bold) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
    const i = y * this.cols + x;
    if (ch !== null && ch !== undefined) this.ch[i] = ch;
    if (fg !== undefined) this.fg[i] = fg;
    if (bg !== undefined) this.bg[i] = bg;
    if (bold !== undefined) this.bold[i] = bold ? 1 : 0;
  }

  get(x, y) {
    const i = y * this.cols + x;
    return { ch: this.ch[i], fg: this.fg[i], bg: this.bg[i], bold: this.bold[i] };
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.pch = null;
    this.out.write('\x1b[?1049h\x1b[?25l\x1b[?7l\x1b[2J');
  }

  leave() {
    if (!this.active) return;
    this.active = false;
    this.out.write('\x1b[0m\x1b[?7h\x1b[?25h\x1b[?1049l');
  }

  // Returns the escape sequence for the changes since the previous flush ('' if none).
  diff() {
    const { cols, rows, ch, fg, bg, bold, mode } = this;
    const full = this.pch === null;
    if (full) this.pch = new Array(cols * rows).fill(null);
    const parts = [];
    let curFg = -2, curBg = -2, curBold = -1;
    let cx = -1, cy = -1;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        const c = ch[i];
        const changed = (j) =>
          this.pch[j] !== ch[j] || this.pfg[j] !== fg[j] || this.pbg[j] !== bg[j] || this.pbold[j] !== bold[j];
        if (!changed(i) && !(c === '' && x > 0 && changed(i - 1))) continue;
        if (c === '') continue; // continuation cell of a wide glyph, written with its head
        if (cy !== y || cx !== x) parts.push(`\x1b[${y + 1};${x + 1}H`);
        if (bold[i] !== curBold || fg[i] !== curFg || bg[i] !== curBg) {
          if (mode === 'none') {
            if (bold[i] !== curBold) parts.push(bold[i] ? '\x1b[1m' : '\x1b[22m');
          } else {
            parts.push('\x1b[0m' + (bold[i] ? '\x1b[1m' : '') + fgSeq(fg[i], mode) + bgSeq(bg[i], mode));
          }
          curBold = bold[i]; curFg = fg[i]; curBg = bg[i];
        }
        parts.push(c);
        cx = x + charWidth(c);
        cy = y;
      }
    }
    for (let i = 0; i < ch.length; i++) {
      this.pch[i] = ch[i]; this.pfg[i] = fg[i]; this.pbg[i] = bg[i]; this.pbold[i] = bold[i];
    }
    return parts.length ? parts.join('') + '\x1b[0m' : '';
  }

  flush() {
    const s = this.diff();
    if (s) this.out.write('\x1b[?2026h' + s + '\x1b[?2026l');
    return s.length;
  }
}

module.exports = { Screen };
