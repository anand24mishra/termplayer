const test = require('node:test');
const assert = require('node:assert');
const { reconcileStatus, GRACE_MS } = require('../src/playback/reconcile');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

const base = { status: 'PAUSED', previousStatus: 'PLAYING', pauseIntent: true, transportAgeMs: GRACE_MS + 1 };

test('pause stays paused', async (t) => {
  await t.test('VLC playing while the user paused -> force pause again', () => {
    assert.strictEqual(reconcileStatus({ ...base, vlcState: 'playing' }), 'FORCE_PAUSE');
  });
  await t.test('stale poll right after the keypress is ignored (no pause/resume flip-flop)', () => {
    assert.strictEqual(reconcileStatus({ ...base, vlcState: 'playing', transportAgeMs: 300 }), null);
    assert.strictEqual(reconcileStatus({ ...base, status: 'PLAYING', pauseIntent: false, vlcState: 'paused', transportAgeMs: 300 }), null);
  });
  await t.test('also enforced while the search / radio overlay is open', () => {
    assert.strictEqual(reconcileStatus({ ...base, status: 'RADIO', previousStatus: 'PAUSED', vlcState: 'playing' }), 'FORCE_PAUSE');
  });
  await t.test('normal sync still works without a pause intent', () => {
    const play = { status: 'LOADING', previousStatus: 'IDLE', pauseIntent: false, transportAgeMs: 99999 };
    assert.strictEqual(reconcileStatus({ ...play, vlcState: 'playing' }), 'PLAYBACK_STARTED');
    assert.strictEqual(reconcileStatus({ ...play, status: 'PLAYING', vlcState: 'paused' }), 'PAUSE_TRACK');
    assert.strictEqual(reconcileStatus({ ...play, status: 'PLAYING', vlcState: 'stopped' }), 'STOP_TRACK');
    assert.strictEqual(reconcileStatus({ ...play, status: 'PLAYING', vlcState: 'playing' }), null);
    assert.strictEqual(reconcileStatus({ ...play, status: 'SEARCHING', vlcState: 'playing' }), null);
  });
  await t.test('Space records pause intent, resume clears it, a new track clears it', () => {
    const store = new Store();
    store.state = { ...store.state, status: 'PLAYING', tracks: [{ title: 'A' }], currentTrack: { title: 'A' } };
    handleKeypress(' ', { name: 'space' }, store, {});
    assert.strictEqual(store.getState().status, 'PAUSED');
    assert.strictEqual(store.getState().pauseIntent, true);
    assert.ok(store.getState().transportAt > 0);
    handleKeypress(' ', { name: 'space' }, store, {});
    assert.strictEqual(store.getState().status, 'PLAYING');
    assert.strictEqual(store.getState().pauseIntent, false);
    handleKeypress(' ', { name: 'space' }, store, {});
    store.dispatch({ type: 'PLAY_TRACK', payload: { title: 'B' } });
    assert.strictEqual(store.getState().pauseIntent, false);
    require('../src/playback/vlcController').stop();
  });
  await t.test('a pause observed from VLC is not treated as a user intent', () => {
    const store = new Store();
    store.dispatch({ type: 'PAUSE_TRACK' });
    assert.strictEqual(store.getState().pauseIntent, false);
  });
  await t.test('deck uses idempotent VLC commands', async () => {
    const { Mixer } = require('../src/dj/mixer');
    const mixer = new Mixer();
    const sent = [];
    mixer.deck.request = (cmd) => { sent.push(cmd); return Promise.resolve({}); };
    await mixer.deck.pause();
    await mixer.deck.resume();
    assert.deepStrictEqual(sent, ['pl_forcepause', 'pl_forceresume']);
  });
});
