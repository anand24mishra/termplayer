const { describe, it } = require('node:test');
const assert = require('node:assert');
const { EffectsController, FILTER_MODES } = require('../src/dj/effects');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

describe('Simple effects (Low-Pass Filter & EQ) module', () => {
  it('FILTER_MODES defines valid frequency band attenuations', () => {
    assert.strictEqual(FILTER_MODES.length, 4);
    const [off, mild, deep, sub] = FILTER_MODES;

    assert.strictEqual(off.id, 'off');
    assert.strictEqual(off.enabled, false);

    assert.strictEqual(mild.id, 'mild');
    assert.strictEqual(mild.enabled, true);
    assert.ok(mild.bands[9] <= -18, 'Mild should attenuate 16kHz band');

    assert.strictEqual(deep.id, 'deep');
    assert.strictEqual(deep.enabled, true);
    assert.ok(deep.bands[5] <= -14, 'Deep should attenuate 3kHz and above');
    assert.ok(deep.bands[0] >= 0, 'Deep should preserve or boost low bass');

    assert.strictEqual(sub.id, 'sub');
    assert.strictEqual(sub.enabled, true);
    assert.ok(sub.bands[2] <= -10, 'Sub should aggressively cut mid/high frequencies');
  });

  it('EffectsController cycles through filter modes and updates mixer', () => {
    const effects = new EffectsController();
    const calls = [];
    const mockMixer = {
      applyEqualizer: async (enabled, bands) => {
        calls.push({ enabled, bands });
      }
    };

    assert.strictEqual(effects.getCurrentMode().id, 'off');

    // Cycle 1: off -> mild
    const m1 = effects.cycleFilter(mockMixer);
    assert.strictEqual(m1.id, 'mild');
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].enabled, true);

    // Cycle 2: mild -> deep
    const m2 = effects.cycleFilter(mockMixer);
    assert.strictEqual(m2.id, 'deep');

    // Cycle 3: deep -> sub
    const m3 = effects.cycleFilter(mockMixer);
    assert.strictEqual(m3.id, 'sub');

    // Cycle 4: sub -> off
    const m4 = effects.cycleFilter(mockMixer);
    assert.strictEqual(m4.id, 'off');
    assert.strictEqual(calls[3].enabled, false);
  });

  it('EffectsController setFilter and reset apply correct modes', () => {
    const effects = new EffectsController();
    let lastApplied = null;
    const mockMixer = {
      applyEqualizer: async (enabled, bands) => {
        lastApplied = { enabled, bands };
      }
    };

    effects.setFilter('deep', mockMixer);
    assert.strictEqual(effects.getCurrentMode().id, 'deep');
    assert.strictEqual(lastApplied.enabled, true);

    effects.reset(mockMixer);
    assert.strictEqual(effects.getCurrentMode().id, 'off');
    assert.strictEqual(lastApplied.enabled, false);
  });

  it('Store handles SET_FILTER_MODE action and resets on PLAY_TRACK', () => {
    const store = new Store();
    assert.strictEqual(store.getState().filterMode, 'off');

    store.dispatch({ type: 'SET_FILTER_MODE', payload: 'deep' });
    assert.strictEqual(store.getState().filterMode, 'deep');

    store.dispatch({ type: 'PLAY_TRACK', payload: { title: 'New Track' } });
    assert.strictEqual(store.getState().filterMode, 'off');
  });

  it('Keymap "f" key cycles filter modes and displays flash message', () => {
    const store = new Store();
    const config = {};

    handleKeypress('f', { name: 'f' }, store, config);
    assert.notStrictEqual(store.getState().filterMode, 'off');
    assert.match(store.getState().flashMessage, /Filter:/);
  });
});
