const test = require('node:test');
const assert = require('node:assert');
const { searchTracks } = require('../src/library/onlineProvider');
const { ProviderError } = require('../src/utils/errors');

test('onlineProvider.searchTracks', async (t) => {
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  await t.test('maps valid results to Track objects', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        results: [
          {
            id: '123',
            name: 'Test Song',
            artist_name: 'Test Artist',
            album_name: 'Test Album',
            duration: '180',
            audio: 'https://example.com/audio.mp3',
            audiodownload: 'https://example.com/download.mp3'
          }
        ]
      })
    });

    const tracks = await searchTracks('test', 'fake-client-id');
    assert.strictEqual(tracks.length, 1);
    assert.strictEqual(tracks[0].id, 'jamendo:123');
    assert.strictEqual(tracks[0].title, 'Test Song');
    assert.strictEqual(tracks[0].artist, 'Test Artist');
    assert.strictEqual(tracks[0].album, 'Test Album');
    assert.strictEqual(tracks[0].duration, 180);
    assert.strictEqual(tracks[0].source, 'online-stream');
    assert.strictEqual(tracks[0].filePath, null);
    assert.strictEqual(tracks[0].streamUrl, 'https://example.com/audio.mp3');
  });

  await t.test('throws ProviderError on non-200', async () => {
    global.fetch = async () => ({ ok: false, status: 500 });
    await assert.rejects(
      searchTracks('test', 'fake-client-id'),
      (err) => err instanceof ProviderError && err.message.includes('500')
    );
  });

  await t.test('throws ProviderError on empty results', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ results: [] })
    });
    await assert.rejects(
      searchTracks('test', 'fake-client-id'),
      (err) => err instanceof ProviderError && err.message.includes('No results found')
    );
  });

  await t.test('throws ProviderError on network reject', async () => {
    global.fetch = async () => { throw new Error('ECONNRESET'); };
    await assert.rejects(
      searchTracks('test', 'fake-client-id'),
      (err) => err instanceof ProviderError && err.message.includes('ECONNRESET')
    );
  });
});
