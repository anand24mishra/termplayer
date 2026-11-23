const test = require('node:test');
const assert = require('node:assert');
const {
  renderVisualizer,
  renderBpmBox,
  generateSpectrum,
  generateWaveform,
  generateMultiRowSpectrum,
  generateMultiRowWaveform
} = require('../src/dj/visualizer');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');

test('Live Waveform / Spectrum Visualizer module', async (t) => {
  await t.test('generateSpectrum generates expected width and reacts to play state', () => {
    const width = 24;
    const playingSpec = generateSpectrum(2.5, 120, 70, true, width);
    assert.strictEqual(playingSpec.length, width);
    assert.notStrictEqual(playingSpec, '—'.repeat(width));

    const stoppedSpec = generateSpectrum(2.5, 120, 70, false, width);
    assert.strictEqual(stoppedSpec, '—'.repeat(width));
  });

  await t.test('generateWaveform generates expected width and reacts to play state', () => {
    const width = 20;
    const playingWave = generateWaveform(1.0, 128, 50, true, width);
    assert.strictEqual(playingWave.length, width);

    const stoppedWave = generateWaveform(1.0, 128, 50, false, width);
    assert.strictEqual(stoppedWave, '~'.repeat(width));
  });

  await t.test('generateMultiRowSpectrum and generateMultiRowWaveform return 3 colorful rows', () => {
    const rows = generateMultiRowSpectrum(1.5, 128, 70, true, 30, 3);
    assert.strictEqual(rows.length, 3);
    assert.ok(rows[0].includes('\x1b['), 'Should contain ANSI color codes for top peak row');
    assert.ok(rows[1].includes('\x1b['), 'Should contain ANSI color codes for mid row');
    assert.ok(rows[2].includes('\x1b['), 'Should contain ANSI color codes for bass row');

    const waveRows = generateMultiRowWaveform(1.5, 128, 70, true, 30, 3);
    assert.strictEqual(waveRows.length, 3);
  });

  await t.test('renderBpmBox renders 3-line framed box with BPM number and icon', () => {
    const bpmBox = renderBpmBox(161, true);
    assert.strictEqual(bpmBox.length, 3);
    assert.ok(bpmBox[0].includes('╭────────────────╮'));
    assert.ok(bpmBox[1].includes('161 BPM'));
    assert.ok(bpmBox[1].includes('⚡'));
    assert.ok(bpmBox[2].includes('╰────────────────╯'));

  });

  await t.test('renderVisualizer supports modes: bars, waveform, and off', () => {
    const statePlaying = {
      status: 'PLAYING',
      progress: { time: 5, length: 180 },
      volume: 60,
      visualizerMode: 'bars',
      currentTrack: { bpm: 161 }
    };

    const barsRes = renderVisualizer(statePlaying, 30);
    assert.ok(barsRes.includes('161 BPM'));
    assert.ok(barsRes.includes('╭────────────────╮'));
    const lines = barsRes.split('\n');
    assert.strictEqual(lines.length, 3);

    const stateWave = { ...statePlaying, visualizerMode: 'waveform' };
    const waveRes = renderVisualizer(stateWave, 30);
    assert.ok(waveRes.includes('161 BPM'));
    assert.strictEqual(waveRes.split('\n').length, 3);

    const stateOff = { ...statePlaying, visualizerMode: 'off' };
    assert.strictEqual(renderVisualizer(stateOff, 30), null);
  });

  await t.test('Store handles SET_VISUALIZER_MODE action', () => {
    const store = new Store();
    assert.strictEqual(store.getState().visualizerMode, 'bars');

    store.dispatch({ type: 'SET_VISUALIZER_MODE', payload: 'waveform' });
    assert.strictEqual(store.getState().visualizerMode, 'waveform');

    store.dispatch({ type: 'SET_VISUALIZER_MODE', payload: 'off' });
    assert.strictEqual(store.getState().visualizerMode, 'off');
  });

  await t.test('Keymap "v" key cycles visualizer modes', () => {
    const store = new Store();
    store.state.visualizerMode = 'bars';
    const config = { jamendoClientId: null };

    // bars -> waveform
    handleKeypress('v', {}, store, config);
    assert.strictEqual(store.getState().visualizerMode, 'waveform');
    assert.strictEqual(store.getState().flashMessage, 'Visualizer: Waveform');

    // waveform -> off
    handleKeypress('v', {}, store, config);
    assert.strictEqual(store.getState().visualizerMode, 'off');
    assert.strictEqual(store.getState().flashMessage, 'Visualizer: OFF');

    // off -> bars
    handleKeypress('v', {}, store, config);
    assert.strictEqual(store.getState().visualizerMode, 'bars');
    assert.strictEqual(store.getState().flashMessage, 'Visualizer: Spectrum Bars');
  });
});
