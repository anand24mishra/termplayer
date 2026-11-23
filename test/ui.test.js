const test = require('node:test');
const assert = require('node:assert');
const { mix, gradient, rgbTo256, hex } = require('../src/ui/engine/color');
const { Screen } = require('../src/ui/engine/screen');
const { strWidth, truncate } = require('../src/ui/engine/width');
const { getTheme, nextTheme } = require('../src/ui/theme/timeOfDay');
const { getBeat } = require('../src/ui/theme/beat');
const { computeLayout } = require('../src/ui/layout');
const { drawFrame, displayTimeOf } = require('../src/ui/app');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

const fakeOut = { write() {}, on() {}, removeListener() {} };
const mkScreen = (cols, rows) => new Screen(fakeOut, { cols, rows, mode: 'true' });
const at = (h, m = 0) => new Date(2026, 0, 1, h, m, 0);

function playingState() {
  const store = new Store();
  const tracks = [{ title: 'Strobe', artist: 'deadmau5' }, { title: '日本語のタイトル', artist: 'X' }];
  store.state = {
    ...store.state, tracks, status: 'PLAYING', currentTrack: { ...tracks[0], bpm: 128 },
    progress: { time: 30, length: 200 }, progressAt: at(12).getTime(), cues: { 1: 10, 2: null, 3: null, 4: null },
    loopActive: true, loopStart: 50, loopEnd: 80, flashMessage: 'hi', flashAt: at(12).getTime(),
  };
  return store.getState();
}

test('color helpers', async (t) => {
  await t.test('mix endpoints and midpoint', () => {
    assert.strictEqual(mix(0x000000, 0xffffff, 0), 0x000000);
    assert.strictEqual(mix(0x000000, 0xffffff, 1), 0xffffff);
    assert.strictEqual(mix(0x000000, 0xfefefe, 0.5), 0x7f7f7f);
    assert.strictEqual(mix(0x102030, 0xffffff, 5), 0xffffff); // clamped
  });
  await t.test('gradient hits stops', () => {
    const stops = [0xff0000, 0x00ff00, 0x0000ff];
    assert.strictEqual(gradient(stops, 0), 0xff0000);
    assert.strictEqual(gradient(stops, 0.5), 0x00ff00);
    assert.strictEqual(gradient(stops, 1), 0x0000ff);
  });
  await t.test('256 fallback maps into the palette', () => {
    assert.strictEqual(rgbTo256(0x000000), 16);
    assert.ok(rgbTo256(0x808080) >= 232);
    const c = rgbTo256(hex('#ff0000'));
    assert.strictEqual(c, 196);
  });
});

test('text width helpers', () => {
  assert.strictEqual(strWidth('abc'), 3);
  assert.strictEqual(strWidth('日本'), 4);
  assert.strictEqual(truncate('abcdefghij', 5), 'abcd…');
  assert.ok(strWidth(truncate('日本語日本語', 7)) <= 7);
});

test('time of day theme', async (t) => {
  await t.test('picks the expected phase', () => {
    assert.strictEqual(getTheme(at(23)).name, 'night');
    assert.strictEqual(getTheme(at(7)).name, 'dawn');
    assert.strictEqual(getTheme(at(12)).name, 'day');
    assert.strictEqual(getTheme(at(19, 30)).name, 'dusk');
  });
  await t.test('colors blend smoothly (no jumps minute to minute)', () => {
    let prev = getTheme(at(0, 0)).bg;
    for (let m = 1; m < 1440; m++) {
      const cur = getTheme(at(Math.floor(m / 60), m % 60)).bg;
      const d = Math.abs(((cur >> 16) & 255) - ((prev >> 16) & 255)) + Math.abs(((cur >> 8) & 255) - ((prev >> 8) & 255)) + Math.abs((cur & 255) - (prev & 255));
      assert.ok(d < 20, `bg jumped by ${d} at minute ${m}`);
      prev = cur;
    }
  });
  await t.test('override pins the theme, nextTheme cycles back to auto', () => {
    assert.strictEqual(getTheme(at(12), 'night').name, 'night');
    let cur = 'auto';
    const seen = [];
    for (let i = 0; i < 6; i++) { cur = nextTheme(cur); seen.push(cur); }
    assert.deepStrictEqual(seen, ['dawn', 'day', 'golden', 'dusk', 'night', 'auto']);
  });
});

test('beat envelope', () => {
  assert.strictEqual(getBeat(1, 120, false).kick, 0);
  const onBeat = getBeat(0.5, 120, true); // exactly on a beat at 120 BPM
  const offBeat = getBeat(0.35, 120, true);
  assert.ok(onBeat.kick > offBeat.kick);
  assert.ok(onBeat.kick <= 1);
});

test('screen diffing', async (t) => {
  await t.test('identical frames write nothing', () => {
    const s = mkScreen(20, 5);
    s.begin(0x101010);
    s.set(2, 2, 'x', 0xffffff);
    assert.ok(s.diff().length > 0);
    s.begin(0x101010);
    s.set(2, 2, 'x', 0xffffff);
    assert.strictEqual(s.diff(), '');
  });
  await t.test('only changed cells are emitted', () => {
    const s = mkScreen(20, 5);
    s.begin(0);
    s.diff();
    s.begin(0);
    s.set(3, 1, 'Z', 0xff0000);
    const out = s.diff();
    assert.ok(out.includes('\x1b[2;4H'));
    assert.ok(out.includes('Z'));
    assert.ok(out.length < 60);
  });
  await t.test('wide glyph writes head once and skips continuation', () => {
    const s = mkScreen(10, 2);
    s.begin(0);
    s.set(0, 0, '日', 0xffffff);
    s.set(1, 0, '', 0xffffff);
    const out = s.diff();
    assert.strictEqual(out.split('日').length - 1, 1);
  });
});

test('layout', () => {
  assert.ok(computeLayout(40, 10).tooSmall);
  const w = computeLayout(160, 50);
  assert.strictEqual(w.mode, 'wide');
  assert.strictEqual(w.library.w + w.now.w, 160);
  const n = computeLayout(80, 24);
  assert.strictEqual(n.mode, 'stacked');
  assert.strictEqual(n.library.h + n.now.h, 22);
});

test('drawFrame renders every state at several sizes without throwing or leaking', async (t) => {
  for (const [cols, rows] of [[60, 18], [80, 24], [100, 30], [160, 50], [40, 10]]) {
    await t.test(`${cols}x${rows}`, () => {
      const s = mkScreen(cols, rows);
      const base = playingState();
      for (const state of [
        base,
        { ...base, status: 'PAUSED' },
        { ...base, status: 'IDLE', currentTrack: null },
        { ...base, status: 'LOADING', progress: { time: 0, length: 0 } },
        { ...base, status: 'SEARCHING', query: 'abc', searchResults: base.tracks, selectedIndex: 1 },
        { ...base, status: 'SEARCHING', query: 'abc', searchError: 'boom' },
        { ...base, showHelp: true },
        { ...base, visualizerMode: 'waveform' },
        { ...base, visualizerMode: 'off' },
        { ...base, tracks: [] },
      ]) {
        drawFrame(s, state, { now: at(12) });
        drawFrame(s, state, { now: at(23), animate: false });
      }
      assert.strictEqual(s.ch.length, cols * rows);
    });
  }
  await t.test('a drawn frame contains the track title and theme label', () => {
    const s = mkScreen(120, 30);
    drawFrame(s, playingState(), { now: at(23) });
    const rowsText = [];
    for (let y = 0; y < 30; y++) rowsText.push(s.ch.slice(y * 120, (y + 1) * 120).join(''));
    const all = rowsText.join('\n');
    assert.ok(all.includes('Strobe'));
    assert.ok(all.includes('Night'));
  });
  await t.test('too-small terminals get a friendly message', () => {
    const s = mkScreen(40, 10);
    drawFrame(s, playingState(), { now: at(12) });
    assert.ok(s.ch.join('').includes('Enlarge'));
  });
  await t.test('steady animation frames stay small', () => {
    const s = mkScreen(120, 40);
    const state = playingState();
    drawFrame(s, state, { now: new Date(at(23).getTime()) });
    s.diff();
    drawFrame(s, state, { now: new Date(at(23).getTime() + 33) });
    assert.ok(s.diff().length < 12000);
  });
});

test('progress interpolation', () => {
  const state = { status: 'PLAYING', progress: { time: 10, length: 100 }, progressAt: 1000 };
  assert.strictEqual(displayTimeOf(state, 1500), 10.5);
  assert.strictEqual(displayTimeOf({ ...state, status: 'PAUSED' }, 1500), 10);
  assert.strictEqual(displayTimeOf({ ...state, progress: { time: 99.9, length: 100 } }, 2400), 100);
});

test('store + keymap: theme and help', async (t) => {
  await t.test('t cycles theme and flashes', () => {
    const store = new Store();
    handleKeypress('t', { name: 't' }, store, {});
    assert.strictEqual(store.getState().themeOverride, 'dawn');
    assert.ok(store.getState().flashMessage.includes('Dawn'));
    assert.ok(store.getState().flashAt > 0);
  });
  await t.test('? toggles help and any key closes it', () => {
    const store = new Store();
    handleKeypress('?', { name: '?' }, store, {});
    assert.strictEqual(store.getState().showHelp, true);
    handleKeypress('x', { name: 'x' }, store, {});
    assert.strictEqual(store.getState().showHelp, false);
  });
  await t.test('UPDATE_PROGRESS records arrival time', () => {
    const store = new Store();
    store.dispatch({ type: 'UPDATE_PROGRESS', payload: { time: 1, length: 2 } });
    assert.ok(store.getState().progressAt > 0);
  });
});

// ---- Bollywood radio ----
const radioLib = require('../src/library/radioProvider');
const mkStation = (id, name, extra = {}) => radioLib.normalizeStations([[{
  stationuuid: id, name, url_resolved: `http://s/${id}`, codec: 'MP3', bitrate: 128, votes: 5, clickcount: 9, country: 'India', countrycode: 'IN', tags: '', ...extra,
}]])[0];
const stations = [mkStation('1', 'Hits Of Bollywood'), mkStation('2', 'Hits Of Mohammed Rafi'), mkStation('3', 'Nostalgic Bollywood 90s')];
const rowsOf = (s) => Array.from({ length: s.rows }, (_, y) => s.ch.slice(y * s.cols, (y + 1) * s.cols).join(''));

test('radio UI', async (t) => {
  const baseRadio = { stations, loading: false, error: null, genre: 'All', filter: '', selected: 1 };
  const withRadio = (radio, extra = {}) => ({ ...playingState(), status: 'RADIO', previousStatus: 'PLAYING', radio, ...extra });

  for (const [cols, rows] of [[60, 18], [80, 24], [160, 50]]) {
    await t.test(`radio browser states render at ${cols}x${rows}`, () => {
      const s = mkScreen(cols, rows);
      for (const radio of [
        baseRadio,
        { ...baseRadio, loading: true, stations: [] },
        { ...baseRadio, error: 'Network error: offline', stations: [] },
        { ...baseRadio, filter: 'zzz' },
        { ...baseRadio, genre: 'Retro', filter: 'rafi' },
        { ...baseRadio, stations: [] },
      ]) {
        drawFrame(s, withRadio(radio), { now: at(20) });
      }
    });
    await t.test(`live now-playing renders at ${cols}x${rows}`, () => {
      const s = mkScreen(cols, rows);
      const live = { ...playingState(), currentTrack: stations[0], streamTitle: 'Tum Hi Ho', progress: { time: 12, length: 0 } };
      drawFrame(s, live, { now: at(20) });
      drawFrame(s, { ...live, status: 'PAUSED' }, { now: at(20) });
    });
  }

  await t.test('browser shows title, stations and the filter', () => {
    const s = mkScreen(100, 30);
    drawFrame(s, withRadio({ ...baseRadio, filter: 'raf' }), { now: at(20) });
    const all = rowsOf(s).join('\n');
    assert.ok(all.includes('BOLLYWOOD RADIO'));
    assert.ok(all.includes('Hits Of Mohammed Rafi'));
    assert.ok(all.includes('raf'));
    assert.ok(!all.includes('Nostalgic Bollywood 90s')); // filtered out
  });

  await t.test('live screen shows LIVE, the on-air title and the station', () => {
    const s = mkScreen(120, 30);
    drawFrame(s, { ...playingState(), currentTrack: stations[0], streamTitle: 'Tum Hi Ho', progress: { time: 95, length: 0 }, progressAt: at(20).getTime() }, { now: at(20) });
    const all = rowsOf(s).join('\n');
    assert.ok(all.includes('● LIVE'));
    assert.ok(all.includes('Tum Hi Ho'));
    assert.ok(all.includes('Hits Of Bollywood'));
    assert.ok(all.includes('listening 1:35'));
  });

  await t.test('the deck keeps animating underneath an open overlay', () => {
    const s = mkScreen(100, 30);
    const state = withRadio(baseRadio);
    drawFrame(s, state, { now: at(20) });
    s.diff();
    drawFrame(s, state, { now: new Date(at(20).getTime() + 200) });
    assert.ok(s.diff().length > 0);
  });
});

test('radio keymap and store', async (t) => {
  const mkStore = () => {
    const store = new Store();
    store.state = { ...store.state, tracks: [{ title: 'Local', artist: 'x', filePath: '/l.mp3' }] };
    return store;
  };
  const okFetch = async (url) => ({
    ok: true, status: 200,
    json: async () => (url.includes('tag=bollywood')
      ? [{ stationuuid: '1', name: 'Hits Of Bollywood', url_resolved: 'http://s/1', codec: 'MP3', bitrate: 128 },
         { stationuuid: '2', name: 'Hits Of Mohammed Rafi', url_resolved: 'http://s/2', codec: 'MP3', bitrate: 128 }]
      : []),
  });
  const press = (store, str, name, config) => handleKeypress(str, { name: name || str }, store, config);
  const tick = () => new Promise((r) => setTimeout(r, 20));

  await t.test('b opens the browser, loads stations, esc restores the previous status', async () => {
    radioLib._resetForTests();
    const store = mkStore();
    const config = { fetchImpl: okFetch };
    press(store, 'b', 'b', config);
    assert.strictEqual(store.getState().status, 'RADIO');
    assert.strictEqual(store.getState().radio.loading, true);
    await tick();
    assert.strictEqual(store.getState().radio.stations.length, 2);
    assert.strictEqual(store.getState().radio.loading, false);
    press(store, undefined, 'escape', config);
    assert.strictEqual(store.getState().status, 'IDLE');
  });

  await t.test('typing filters, arrows move, left/right change genre, backspace edits', async () => {
    radioLib._resetForTests();
    const store = mkStore();
    const config = { fetchImpl: okFetch };
    press(store, 'b', 'b', config);
    await tick();
    press(store, 'r', 'r', config);
    press(store, 'a', 'a', config);
    press(store, 'f', 'f', config);
    assert.strictEqual(store.getState().radio.filter, 'raf');
    press(store, undefined, 'backspace', config);
    assert.strictEqual(store.getState().radio.filter, 'ra');
    press(store, undefined, 'down', config);
    assert.strictEqual(store.getState().radio.selected, 0); // only one station matches "ra"
    press(store, undefined, 'right', config);
    assert.notStrictEqual(store.getState().radio.genre, 'All');
    press(store, undefined, 'left', config);
    assert.strictEqual(store.getState().radio.genre, 'All');
    assert.strictEqual(store.getState().status, 'RADIO'); // typing "r"/"a"/"f" must not trigger shortcuts
  });

  await t.test('enter tunes in: live track, no BPM scan, browser closes, click registered', async () => {
    radioLib._resetForTests();
    const store = mkStore();
    const clicks = [];
    const origFetch = globalThis.fetch;
    globalThis.fetch = async (url) => { clicks.push(url); return { ok: true, json: async () => ({}) }; };
    try {
      const config = { fetchImpl: okFetch };
      press(store, 'b', 'b', config);
      await tick();
      press(store, undefined, 'return', config);
      const s = store.getState();
      assert.strictEqual(s.status, 'LOADING');
      assert.strictEqual(s.currentTrack.isLive, true);
      assert.strictEqual(s.currentTrack.source, 'radio');
      assert.match(s.flashMessage, /Tuned in/);
      await tick();
      assert.ok(clicks.some((u) => /\/json\/url\//.test(u)));
    } finally {
      globalThis.fetch = origFetch;
      require('../src/playback/vlcController').stop();
    }
  });

  await t.test('tab tunes into a random station', async () => {
    radioLib._resetForTests();
    const store = mkStore();
    const config = { fetchImpl: okFetch };
    const origFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: true, json: async () => ({}) });
    try {
      press(store, 'b', 'b', config);
      await tick();
      press(store, '\t', 'tab', config);
      assert.strictEqual(store.getState().currentTrack.isLive, true);
    } finally {
      globalThis.fetch = origFetch;
      require('../src/playback/vlcController').stop();
    }
  });

  await t.test('load failure shows an error in the browser', async () => {
    radioLib._resetForTests();
    const store = mkStore();
    press(store, 'b', 'b', { fetchImpl: async () => { throw new Error('offline'); } });
    await tick();
    assert.match(store.getState().radio.error, /Network error/);
  });

  await t.test('cue and loop keys are blocked on live radio', () => {
    const store = mkStore();
    store.state = { ...store.state, status: 'PLAYING', currentTrack: stations[0], progress: { time: 20, length: 0 } };
    for (const k of ['1', '!', 'l']) {
      press(store, k, k, {});
      assert.strictEqual(store.getState().flashMessage, 'Not available on live radio');
      store.dispatch({ type: 'CLEAR_FLASH_MESSAGE' });
    }
    assert.strictEqual(store.getState().cues[1], null);
    assert.strictEqual(store.getState().loopActive, false);
  });

  await t.test('stream title updates and resets on a new track', () => {
    const store = mkStore();
    store.dispatch({ type: 'UPDATE_STREAM_TITLE', payload: 'Song X' });
    assert.strictEqual(store.getState().streamTitle, 'Song X');
    store.dispatch({ type: 'PLAY_TRACK', payload: { title: 'Next' } });
    assert.strictEqual(store.getState().streamTitle, null);
  });
});
