const MIN_COLS = 60;
const MIN_ROWS = 18;

// Returns rects {x,y,w,h} for header, library, now (now-playing), footer.
function computeLayout(cols, rows) {
  if (cols < MIN_COLS || rows < MIN_ROWS) return { tooSmall: true };
  const header = { x: 0, y: 0, w: cols, h: 1 };
  const footer = { x: 0, y: rows - 1, w: cols, h: 1 };
  const body = { x: 0, y: 1, w: cols, h: rows - 2 };
  if (cols >= 100) {
    const lw = Math.max(34, Math.min(50, Math.floor(cols * 0.36)));
    return {
      mode: 'wide', header, footer,
      library: { x: 0, y: body.y, w: lw, h: body.h },
      now: { x: lw, y: body.y, w: cols - lw, h: body.h },
    };
  }
  const lh = Math.max(6, Math.floor(body.h * 0.4));
  return {
    mode: 'stacked', header, footer,
    library: { x: 0, y: body.y, w: cols, h: lh },
    now: { x: 0, y: body.y + lh, w: cols, h: body.h - lh },
  };
}

const inner = (r) => ({ x: r.x + 2, y: r.y + 1, w: Math.max(0, r.w - 4), h: Math.max(0, r.h - 2) });

module.exports = { computeLayout, inner, MIN_COLS, MIN_ROWS };
