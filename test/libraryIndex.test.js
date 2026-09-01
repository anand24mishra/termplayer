const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const mm = require('music-metadata');
const crypto = require('crypto');

const { loadOrBuildIndex, getDirectoryHash } = require('../src/library/libraryIndex');

test('libraryIndex caching and metadata', async (t) => {
  const scratchDir = path.join(__dirname, 'scratch');
  const songsDir = path.join(scratchDir, 'songs');
  const cacheDir = path.join(scratchDir, '.cache');
  const cacheTracksDir = path.join(cacheDir, 'tracks');
  const indexPath = path.join(cacheDir, 'library-index.json');

  // Setup
  if (fs.existsSync(scratchDir)) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
  fs.mkdirSync(songsDir, { recursive: true });
  fs.mkdirSync(cacheTracksDir, { recursive: true });

  await t.test('builds initial index gracefully with untagged empty file', async () => {
    fs.writeFileSync(path.join(songsDir, 'test.mp3'), 'fake-mp3-content');
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    assert.strictEqual(tracks.length, 1);
    assert.strictEqual(tracks[0].title, 'test');
    assert.strictEqual(tracks[0].artist, null);
    
    assert.ok(fs.existsSync(indexPath));
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    assert.strictEqual(data.tracks.length, 1);
  });

  await t.test('reuses cache when hash is unchanged', async () => {
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    data.tracks[0].title = 'cached-title';
    fs.writeFileSync(indexPath, JSON.stringify(data));

    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    assert.strictEqual(tracks[0].title, 'cached-title');
  });

  await t.test('rebuilds when hash changes (new file added)', async () => {
    fs.writeFileSync(path.join(songsDir, 'test2.mp3'), 'fake-mp3-content');
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    assert.strictEqual(tracks.length, 2);
    // It should have rebuilt, so test.mp3 is 'test' again
    const testTrack = tracks.find(t => t.filePath.endsWith('test.mp3'));
    assert.strictEqual(testTrack.title, 'test');
  });

  await t.test('corrupt JSON triggers rebuild', async () => {
    fs.writeFileSync(indexPath, 'invalid-json{');
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    assert.strictEqual(tracks.length, 2);
    const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    assert.strictEqual(data.tracks.length, 2);
  });

  await t.test('tagged fixture produces expected fields', async () => {
    const tag = Buffer.alloc(128, 0);
    tag.write('TAG', 0, 3, 'ascii');
    tag.write('Mocked Title', 3, 30, 'ascii');
    tag.write('Mocked Artist', 33, 30, 'ascii');
    tag.write('Mocked Album', 63, 30, 'ascii');
    
    fs.writeFileSync(path.join(songsDir, 'test_tagged.mp3'), tag);

    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    const tagged = tracks.find(tr => tr.filePath.endsWith('test_tagged.mp3'));
    assert.strictEqual(tagged.title, 'Mocked Title');
    assert.strictEqual(tagged.artist, 'Mocked Artist');
    assert.strictEqual(tagged.album, 'Mocked Album');
    // duration will be 0 since there's no audio data, which is fine for this test
    assert.strictEqual(tagged.duration, 0);
  });

  // Teardown
  if (fs.existsSync(scratchDir)) {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
});
