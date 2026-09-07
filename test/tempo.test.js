const test = require('node:test');
const assert = require('node:assert');
const { Mixer } = require('../src/dj/mixer');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

test('Tempo / Pitch Control module', async (t) => {
  await t.test('Mixer initializes with default 1.0 playback rate and handles setRate', () => {
    const mixer = new Mixer();
    assert.strictEqual(mixer.getRate(), 1.0);

    mixer.setRate(1.05);
    assert.strictEqual(mixer.getRate(), 1.05);

    mixer.setRate(0.95);
    assert.strictEqual(mixer.getRate(), 0.95);

    // Clamping checks
    mixer.setRate(0.2);
    assert.strictEqual(mixer.getRate(), 0.5);

    mixer.setRate(3.5);
    assert.strictEqual(mixer.getRate(), 2.0);
  });

  await t.test('Store handles SET_RATE action and resets on PLAY_TRACK', () => {
    const store = new Store();
    assert.strictEqual(store.getState().playbackRate, 1.0);

    store.dispatch({ type: 'SET_RATE', payload: 1.15 });
    assert.strictEqual(store.getState().playbackRate, 1.15);

    store.dispatch({ type: 'PLAY_TRACK', payload: { title: 'New Track' } });
    assert.strictEqual(store.getState().playbackRate, 1.0);
  });

  await t.test('Keymap nudges playback speed with > and <, and resets with r / 0', () => {
    const store = new Store();
    store.state.playbackRate = 1.0;
    const config = { jamendoClientId: null };

    // Nudge up by 5% ('>')
    handleKeypress('>', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 1.05);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 105% (+5%)');

    // Nudge up again by 5% ('.')
    handleKeypress('.', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 1.10);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 110% (+10%)');

    // Nudge down by 5% ('<')
    handleKeypress('<', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 1.05);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 105% (+5%)');

    // Nudge down by 5% (',')
    handleKeypress(',', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 1.0);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 100% (Normal)');

    // Nudge down below 100%
    handleKeypress('<', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 0.95);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 95% (-5%)');

    // Reset with '0'
    handleKeypress('0', {}, store, config);
    assert.strictEqual(store.getState().playbackRate, 1.0);
    assert.strictEqual(store.getState().flashMessage, 'Tempo: 100% (Normal)');
  });
});
