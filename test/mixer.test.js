const test = require('node:test');
const assert = require('node:assert');
const { Mixer } = require('../src/dj/mixer');

test('Mixer module', async (t) => {
  await t.test('Mixer initializes with default configuration', () => {
    const mixer = new Mixer();
    assert.strictEqual(mixer.getVolume(), 50);
    assert.strictEqual(mixer.deck.port, 8080);
  });

  await t.test('Volume adjustment updates masterVolume and clamps', () => {
    const mixer = new Mixer();
    mixer.setVolume(75);
    assert.strictEqual(mixer.getVolume(), 75);

    mixer.setVolume(120);
    assert.strictEqual(mixer.getVolume(), 100);

    mixer.setVolume(-10);
    assert.strictEqual(mixer.getVolume(), 0);
  });

  await t.test('Stop kills the deck cleanly without error', () => {
    const mixer = new Mixer();
    assert.doesNotThrow(() => {
      mixer.stop();
    });
  });

  await t.test('Crossfade and tempo controls are gone', () => {
    const mixer = new Mixer();
    assert.strictEqual(mixer.setCrossfadeDuration, undefined);
    assert.strictEqual(mixer.setRate, undefined);
  });
});
