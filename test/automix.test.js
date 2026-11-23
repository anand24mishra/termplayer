const { describe, it } = require('node:test');
const assert = require('node:assert');
const { AutoMixer } = require('../src/dj/autoMixer');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

describe('Auto-Mix Queue Mode module', () => {
  it('AutoMixer shouldTransition behaves according to conditions', () => {
    const autoMixer = new AutoMixer();

    const sampleTracks = [
      { id: '1', title: 'Song A', filePath: '/path/to/a.mp3' },
      { id: '2', title: 'Song B', filePath: '/path/to/b.mp3' }
    ];

    const baseState = {
      autoMix: false,
      status: 'PLAYING',
      currentTrack: sampleTracks[0],
      tracks: sampleTracks,
      selectedIndex: 0
    };

    // False when autoMix is off
    assert.strictEqual(autoMixer.shouldTransition({ time: 98, length: 100 }, baseState), false);

    const activeState = { ...baseState, autoMix: true };

    // False when not PLAYING
    assert.strictEqual(autoMixer.shouldTransition({ time: 98, length: 100 }, { ...activeState, status: 'PAUSED' }), false);

    // False when only 1 track
    assert.strictEqual(autoMixer.shouldTransition({ time: 98, length: 100 }, { ...activeState, tracks: [sampleTracks[0]] }), false);

    // False when remaining time > lead time (length 100, time 90 -> remaining 10s)
    assert.strictEqual(autoMixer.shouldTransition({ time: 90, length: 100 }, activeState), false);

    // False while still more than 1.5s remain, true once <= 1.5s remain
    assert.strictEqual(autoMixer.shouldTransition({ time: 98, length: 100 }, activeState), false);
    assert.strictEqual(autoMixer.shouldTransition({ time: 98.6, length: 100 }, activeState), true);
  });

  it('AutoMixer prevents duplicate transitions and resets for new tracks', () => {
    const autoMixer = new AutoMixer();

    const sampleTracks = [
      { id: '1', title: 'Song A', filePath: '/path/to/a.mp3' },
      { id: '2', title: 'Song B', filePath: '/path/to/b.mp3' }
    ];

    const state = {
      autoMix: true,
      status: 'PLAYING',
      currentTrack: sampleTracks[0],
      tracks: sampleTracks,
      selectedIndex: 0
    };

    let transitionCalled = false;
    let nextTrackTarget = null;

    const triggered = autoMixer.checkAutoMix({ time: 99, length: 100 }, state, (track, index) => {
      transitionCalled = true;
      nextTrackTarget = track;
    });

    assert.strictEqual(triggered, true);
    assert.strictEqual(transitionCalled, true);
    assert.strictEqual(nextTrackTarget.title, 'Song B');

    // Immediate next tick on same track should NOT trigger again
    const secondCall = autoMixer.checkAutoMix({ time: 99.5, length: 100 }, state, () => {
      assert.fail('Should not trigger duplicate transition on the same track');
    });
    assert.strictEqual(secondCall, false);

    // Switching to Song B allows new transition when nearing its end
    const stateTrackB = {
      ...state,
      currentTrack: sampleTracks[1],
      selectedIndex: 1
    };

    let secondTrackTransitioned = false;
    const triggeredB = autoMixer.checkAutoMix({ time: 119, length: 120 }, stateTrackB, (track, index) => {
      secondTrackTransitioned = true;
      assert.strictEqual(index, 0); // Wraps around to Song A
      assert.strictEqual(track.title, 'Song A');
    });

    assert.strictEqual(triggeredB, true);
    assert.strictEqual(secondTrackTransitioned, true);
  });

  it('Store handles SET_AUTO_MIX and SELECT_TRACK actions', () => {
    const store = new Store();
    assert.strictEqual(store.getState().autoMix, false);

    store.dispatch({ type: 'SET_AUTO_MIX', payload: true });
    assert.strictEqual(store.getState().autoMix, true);

    store.dispatch({ type: 'SELECT_TRACK', payload: 3 });
    assert.strictEqual(store.getState().selectedIndex, 3);
  });

  it('Keymap "a" toggles autoMix mode and updates flash message', () => {
    const store = new Store();
    const config = {};

    assert.strictEqual(store.getState().autoMix, false);

    handleKeypress('a', { name: 'a' }, store, config);
    assert.strictEqual(store.getState().autoMix, true);
    assert.match(store.getState().flashMessage, /Auto-Mix: ON/);

    handleKeypress('a', { name: 'a' }, store, config);
    assert.strictEqual(store.getState().autoMix, false);
    assert.match(store.getState().flashMessage, /Auto-Mix: OFF/);
  });
});
