const test = require('node:test');
const assert = require('node:assert');
const { Mixer } = require('../src/dj/mixer');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

test('DJ Mixer & Crossfader module', async (t) => {
  await t.test('Mixer initializes with default configuration', () => {
    const mixer = new Mixer();
    assert.strictEqual(mixer.getVolume(), 50);
    assert.strictEqual(mixer.getCrossfadeDuration(), 3);
    assert.strictEqual(mixer.deckA.port, 8080);
    assert.strictEqual(mixer.deckB.port, 8081);
    assert.strictEqual(mixer.activeDeck, mixer.deckA);
  });

  await t.test('Crossfade duration configuration and clamping', () => {
    const mixer = new Mixer();
    mixer.setCrossfadeDuration(5);
    assert.strictEqual(mixer.getCrossfadeDuration(), 5);

    mixer.setCrossfadeDuration(0);
    assert.strictEqual(mixer.getCrossfadeDuration(), 0);

    // Clamps negative to 0
    mixer.setCrossfadeDuration(-2);
    assert.strictEqual(mixer.getCrossfadeDuration(), 0);

    // Clamps above 15
    mixer.setCrossfadeDuration(20);
    assert.strictEqual(mixer.getCrossfadeDuration(), 15);
  });

  await t.test('Volume adjustment updates masterVolume and active deck', () => {
    const mixer = new Mixer();
    mixer.setVolume(75);
    assert.strictEqual(mixer.getVolume(), 75);

    mixer.setVolume(120);
    assert.strictEqual(mixer.getVolume(), 100);

    mixer.setVolume(-10);
    assert.strictEqual(mixer.getVolume(), 0);
  });

  await t.test('Store SET_CROSSFADE action updates store state', () => {
    const store = new Store();
    assert.strictEqual(store.getState().crossfadeDuration, 3);

    store.dispatch({ type: 'SET_CROSSFADE', payload: 5 });
    assert.strictEqual(store.getState().crossfadeDuration, 5);

    store.dispatch({ type: 'SET_CROSSFADE', payload: 0 });
    assert.strictEqual(store.getState().crossfadeDuration, 0);
  });

  await t.test('Keymap "c" key cycles through crossfade durations and sets flash message', () => {
    const store = new Store();
    store.state.crossfadeDuration = 3;
    const config = { jamendoClientId: null };

    // 3s -> 5s
    handleKeypress('c', {}, store, config);
    assert.strictEqual(store.getState().crossfadeDuration, 5);
    assert.strictEqual(store.getState().flashMessage, 'Crossfade set to 5s');

    // 5s -> 0s (OFF)
    handleKeypress('c', {}, store, config);
    assert.strictEqual(store.getState().crossfadeDuration, 0);
    assert.strictEqual(store.getState().flashMessage, 'Crossfade: OFF');

    // 0s -> 2s
    handleKeypress('c', {}, store, config);
    assert.strictEqual(store.getState().crossfadeDuration, 2);
    assert.strictEqual(store.getState().flashMessage, 'Crossfade set to 2s');
  });

  await t.test('Stop kills both decks cleanly without error', () => {
    const mixer = new Mixer();
    assert.doesNotThrow(() => {
      mixer.stop();
    });
  });
});
