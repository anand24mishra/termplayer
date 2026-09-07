const test = require('node:test');
const assert = require('node:assert');
const { detectBpm, detectBpmFromPcm, bpmCache } = require('../src/dj/bpmDetector');
const { Store } = require('../src/state/store');

test('BPM detection & display module', async (t) => {
  await t.test('detectBpmFromPcm detects tempo on synthetic 120 BPM signal', () => {
    const sr = 22050;
    const durationSec = 10;
    const totalSamples = sr * durationSec;
    const buf = Buffer.alloc(totalSamples * 2);

    // 120 BPM = pulse every 0.5s
    for (let t = 0; t < durationSec; t += 0.5) {
      const startSample = Math.floor(t * sr);
      for (let j = 0; j < 500 && startSample + j < totalSamples; j++) {
        buf.writeInt16LE(15000, (startSample + j) * 2);
      }
    }

    const bpm = detectBpmFromPcm(buf, sr);
    assert.ok(bpm !== null);
    // Should be close to 120 BPM (tolerance ±5)
    assert.ok(Math.abs(bpm - 120) <= 6, `Expected ~120, got ${bpm}`);
  });

  await t.test('detectBpmFromPcm handles empty, silent, or corrupt buffers gracefully', () => {
    assert.strictEqual(detectBpmFromPcm(null), null);
    assert.strictEqual(detectBpmFromPcm(Buffer.alloc(0)), null);
    assert.strictEqual(detectBpmFromPcm(Buffer.alloc(100)), null);

    // Silent buffer
    const silentBuf = Buffer.alloc(22050 * 5 * 2);
    assert.strictEqual(detectBpmFromPcm(silentBuf), null);
  });

  await t.test('detectBpm returns pre-tagged BPM immediately and caches it', async () => {
    bpmCache.clear();
    const mockTrack = { id: 'track-test-1', title: 'Tagged Song', bpm: 128 };
    const result = await detectBpm(mockTrack);
    assert.strictEqual(result, 128);
    assert.strictEqual(bpmCache.get('track-test-1'), 128);
  });

  await t.test('detectBpm returns null gracefully on invalid or non-existent audio track', async () => {
    const mockInvalidTrack = { id: 'invalid-track', filePath: '/non/existent/file.mp3' };
    const result = await detectBpm(mockInvalidTrack);
    assert.strictEqual(result, null);
  });

  await t.test('Store SET_BPM action updates currentTrack.bpm', () => {
    const store = new Store();
    store.state.currentTrack = { title: 'Test Track', artist: 'Test Artist' };
    store.dispatch({ type: 'SET_BPM', payload: 124 });
    assert.strictEqual(store.getState().currentTrack.bpm, 124);
  });
});
