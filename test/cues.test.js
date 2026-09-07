const test = require('node:test');
const assert = require('node:assert');
const { CueController } = require('../src/dj/cueController');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

test('Hot Cues & Loops module', async (t) => {
  await t.test('CueController sets and jumps to cues (1-4)', () => {
    const cueCtrl = new CueController();
    let seekedTime = null;
    const mockMixer = {
      seek: (t) => { seekedTime = t; }
    };

    // First press: set Cue 1 at 35 seconds
    const setRes = cueCtrl.handleCueKey(1, 35, mockMixer);
    assert.strictEqual(setRes.action, 'SET');
    assert.strictEqual(setRes.num, 1);
    assert.strictEqual(setRes.time, 35);
    assert.strictEqual(setRes.formatted, '0:35');
    assert.strictEqual(seekedTime, null);

    // Second press: jump to Cue 1
    const jumpRes = cueCtrl.handleCueKey(1, 80, mockMixer);
    assert.strictEqual(jumpRes.action, 'JUMP');
    assert.strictEqual(jumpRes.time, 35);
    assert.strictEqual(seekedTime, 35);

    // Force overwrite (Shift + 1)
    const overwriteRes = cueCtrl.handleCueKey(1, 90, mockMixer, true);
    assert.strictEqual(overwriteRes.action, 'SET');
    assert.strictEqual(overwriteRes.time, 90);

    // Jump now goes to 90
    cueCtrl.handleCueKey(1, 100, mockMixer);
    assert.strictEqual(seekedTime, 90);
  });

  await t.test('CueController toggleLoop between cues or 4s window', () => {
    const cueCtrl = new CueController();
    let seekedTime = null;
    const mockMixer = {
      seek: (t) => { seekedTime = t; }
    };

    // Set Cue 1 at 20s and Cue 2 at 36s
    cueCtrl.setCue(1, 20);
    cueCtrl.setCue(2, 36);

    const onRes = cueCtrl.toggleLoop(25);
    assert.strictEqual(onRes.active, true);
    assert.strictEqual(onRes.start, 20);
    assert.strictEqual(onRes.end, 36);

    // At 35s: no loop seek
    cueCtrl.checkLoop(35, mockMixer);
    assert.strictEqual(seekedTime, null);

    // At 36s: loop seeks back to 20
    cueCtrl.checkLoop(36, mockMixer);
    assert.strictEqual(seekedTime, 20);

    // Toggle off
    const offRes = cueCtrl.toggleLoop(30);
    assert.strictEqual(offRes.active, false);

    // Once off, does not seek
    seekedTime = null;
    cueCtrl.checkLoop(40, mockMixer);
    assert.strictEqual(seekedTime, null);
  });

  await t.test('Store handles SET_CUE, CLEAR_CUE, and SET_LOOP actions', () => {
    const store = new Store();
    assert.strictEqual(store.getState().cues[1], null);
    assert.strictEqual(store.getState().loopActive, false);

    store.dispatch({ type: 'SET_CUE', payload: { num: 1, time: 42 } });
    assert.strictEqual(store.getState().cues[1], 42);

    store.dispatch({ type: 'SET_LOOP', payload: { active: true, start: 42, end: 50 } });
    assert.strictEqual(store.getState().loopActive, true);
    assert.strictEqual(store.getState().loopStart, 42);
    assert.strictEqual(store.getState().loopEnd, 50);

    store.dispatch({ type: 'CLEAR_CUE', payload: 1 });
    assert.strictEqual(store.getState().cues[1], null);
  });

  await t.test('Keymap handles 1-4 cue keys and l loop key', () => {
    const store = new Store();
    store.state.progress = { time: 45, length: 200 };
    const config = { jamendoClientId: null };

    // Press '1' to set Cue 1
    handleKeypress('1', {}, store, config);
    assert.strictEqual(store.getState().cues[1], 45);
    assert.strictEqual(store.getState().flashMessage, 'Cue 1 set to 0:45');

    // Advance time, press '1' to jump to Cue 1
    store.state.progress.time = 85;
    handleKeypress('1', {}, store, config);
    assert.strictEqual(store.getState().flashMessage, 'Jumped to Cue 1 (0:45)');

    // Press 'l' to toggle loop ON
    handleKeypress('l', {}, store, config);
    assert.strictEqual(store.getState().loopActive, true);
    assert.ok(store.getState().flashMessage.includes('Loop: ON'));

    // Press 'l' again to toggle loop OFF
    handleKeypress('l', {}, store, config);
    assert.strictEqual(store.getState().loopActive, false);
    assert.strictEqual(store.getState().flashMessage, 'Loop: OFF');
  });
});
