const test = require('node:test');
const assert = require('node:assert');
const { pickRandomIndex } = require('../src/library/suggest');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

const tracks = [
  { title: 'A', artist: 'x', filePath: '/a.mp3' },
  { title: 'B', artist: 'y', filePath: '/b.mp3' },
  { title: 'C', artist: 'z', filePath: '/c.mp3' },
];

test('random suggestion', async (t) => {
  await t.test('empty list returns -1', () => {
    assert.strictEqual(pickRandomIndex([], null), -1);
  });
  await t.test('never picks the current track when there is a choice', () => {
    for (let i = 0; i < 200; i++) {
      const idx = pickRandomIndex(tracks, tracks[1]);
      assert.notStrictEqual(idx, 1);
    }
  });
  await t.test('rng bounds are respected', () => {
    assert.strictEqual(pickRandomIndex(tracks, null, () => 0), 0);
    assert.strictEqual(pickRandomIndex(tracks, null, () => 0.9999), 2);
  });
  await t.test('single track is picked even if it is current', () => {
    assert.strictEqual(pickRandomIndex([tracks[0]], tracks[0]), 0);
  });
  await t.test('keymap n selects a random track and flashes it', () => {
    const store = new Store();
    store.state = { ...store.state, tracks };
    const { stop } = require('../src/playback/vlcController');
    handleKeypress('n', { name: 'n' }, store, {});
    const s = store.getState();
    assert.strictEqual(s.status, 'LOADING');
    assert.ok(tracks.includes(tracks[s.selectedIndex]));
    assert.strictEqual(s.currentTrack.title, tracks[s.selectedIndex].title);
    assert.match(s.flashMessage, /Random pick/);
    stop();
  });
  await t.test('keymap n with an empty library only flashes', () => {
    const store = new Store();
    handleKeypress('n', { name: 'n' }, store, {});
    assert.strictEqual(store.getState().status, 'IDLE');
    assert.match(store.getState().flashMessage, /No tracks/);
  });
});
