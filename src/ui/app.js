const { Screen } = require('./engine/screen');
const { text } = require('./engine/draw');
const { getTheme } = require('./theme/timeOfDay');
const { getBeat } = require('./theme/beat');
const { computeLayout } = require('./layout');
const { drawBackground } = require('./scene/background');
const { drawHeader } = require('./components/header');
const { drawLibrary } = require('./components/library');
const { drawNowPlaying } = require('./components/nowPlaying');
const { drawFooter } = require('./components/footer');
const { drawToast, drawSearch, drawHelp, TOAST_MS } = require('./components/overlays');
const { drawRadio } = require('./components/radioPanel');
const { strWidth } = require('./engine/width');

let lastLibSel = 0;

// Overlays (search / radio browser) sit on top of playback; the deck underneath keeps its status.
function effectiveStatus(state) {
  return state.status === 'SEARCHING' || state.status === 'RADIO' ? (state.previousStatus || 'IDLE') : state.status;
}

// Media time shown on screen: last polled time plus the wall time elapsed since the poll.
function displayTimeOf(state, nowMs) {
  const p = state.progress || { time: 0, length: 0 };
  let time = p.time || 0;
  if (effectiveStatus(state) === 'PLAYING' && state.progressAt) {
    time += Math.min(1.5, (nowMs - state.progressAt) / 1000);
    if (p.length > 0) time = Math.min(time, p.length);
  }
  return time;
}

// Pure drawing of one frame into `scr`. `now` (Date) is injectable for tests.
function drawFrame(scr, state, opts = {}) {
  const now = opts.now || new Date();
  const nowMs = now.getTime();
  const animate = opts.animate !== false;
  const theme = getTheme(now, state.themeOverride || 'auto');
  const status = effectiveStatus(state);
  const playing = status === 'PLAYING';
  const displayTime = displayTimeOf(state, nowMs);
  const bpm = state.currentTrack && state.currentTrack.bpm;
  const beat = animate ? getBeat(displayTime, bpm, playing) : getBeat(0, bpm, false);
  if (state.status !== 'SEARCHING' && state.status !== 'RADIO') lastLibSel = state.selectedIndex || 0;
  const ctx = { state, status, theme, beat, now, nowMs, t: animate ? nowMs / 1000 : 0, animate, displayTime, playing, libSel: lastLibSel };

  ctx.toastActive = !!(state.flashMessage && state.flashAt && nowMs - state.flashAt <= TOAST_MS);

  scr.begin(theme.bg);
  const layout = computeLayout(scr.cols, scr.rows);
  drawBackground(scr, ctx);
  if (layout.tooSmall) {
    const msg = 'Enlarge your terminal (min 60×18)';
    text(scr, Math.max(0, Math.floor((scr.cols - strWidth(msg)) / 2)), Math.floor(scr.rows / 2), msg, { fg: theme.text, bold: true });
    return;
  }
  drawHeader(scr, layout.header, ctx);
  drawLibrary(scr, layout.library, ctx);
  drawNowPlaying(scr, layout.now, ctx);
  if (!ctx.toastActive) drawFooter(scr, layout.footer, ctx);
  drawToast(scr, ctx);
  if (state.status === 'SEARCHING') drawSearch(scr, ctx);
  if (state.status === 'RADIO') drawRadio(scr, ctx);
  if (state.showHelp) drawHelp(scr, ctx);
}

function createApp({ store, out = process.stdout, animate = true }) {
  const scr = new Screen(out);
  let timer = null;
  let running = false;
  let dirty = true;
  let lastDraw = 0;

  const onResize = () => { scr.resize(out.columns || 80, out.rows || 24); dirty = true; };

  function frame() {
    const state = store.getState();
    const now = Date.now();
    const active = animate && (state.status === 'PLAYING' || state.status === 'LOADING');
    const interval = active ? 33 : animate ? 200 : 1000;
    if (dirty || now - lastDraw >= interval) {
      drawFrame(scr, state, { now: new Date(now), animate });
      scr.flush();
      lastDraw = now;
      dirty = false;
    }
    timer = setTimeout(frame, active ? 33 : 50);
  }

  return {
    screen: scr,
    start() {
      if (running) return;
      running = true;
      scr.enter();
      out.on('resize', onResize);
      frame();
    },
    request() { dirty = true; },
    stop() {
      if (!running) return;
      running = false;
      clearTimeout(timer);
      out.removeListener('resize', onResize);
      scr.leave();
    },
  };
}

module.exports = { drawFrame, createApp, displayTimeOf };
