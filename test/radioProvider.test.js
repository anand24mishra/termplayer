const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const radio = require('../src/library/radioProvider');
const { ProviderError } = require('../src/utils/errors');

const st = (id, name, extra = {}) => ({
  stationuuid: id, name, url_resolved: `http://stream.example/${id}`, codec: 'MP3', bitrate: 128,
  votes: 10, clickcount: 100, country: 'India', countrycode: 'IN', tags: '', ...extra,
});

const okResponse = (data) => ({ ok: true, status: 200, json: async () => data });

function tmpCache() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'termplayer-radio-')), 'radio-stations.json');
}

test('radio provider', async (t) => {
  t.beforeEach(() => radio._resetForTests());

  await t.test('maps, de-duplicates by uuid/url, drops unplayable and sorts by popularity', () => {
    const out = radio.normalizeStations([
      [st('a', 'Hits Of Bollywood', { clickcount: 5 }), st('b', 'No url', { url_resolved: '' }), st('c', 'Zed', { clickcount: 50 })],
      [st('a', 'Hits Of Bollywood (dup)'), st('d', 'Same stream', { url_resolved: 'http://stream.example/c' })],
    ]);
    assert.deepStrictEqual(out.map((s) => s.stationuuid), ['c', 'a']);
    assert.strictEqual(out[0].source, 'radio');
    assert.strictEqual(out[0].isLive, true);
    assert.strictEqual(out[0].id, 'radio:c');
    assert.strictEqual(out[0].streamUrl, 'http://stream.example/c');
  });

  await t.test('genre classification from name and tags', () => {
    assert.ok(radio.genresOf({ name: 'Nostalgic Bollywood 90s' }).includes('90s'));
    assert.ok(radio.genresOf({ name: 'Hits Of Mohammed Rafi' }).includes('Retro'));
    assert.ok(radio.genresOf({ name: 'Club Mix', tags: 'dj,remix' }).includes('Remix'));
    assert.ok(radio.genresOf({ name: 'Radio X', tags: 'sufi,ghazal' }).includes('Sufi'));
    assert.deepStrictEqual(radio.genresOf({ name: 'Plain Station' }), []);
  });

  await t.test('filterStations and availableGenres', () => {
    const stations = radio.normalizeStations([[st('a', 'Hits Of Rafi'), st('b', '90s Gold'), st('c', 'Plain')]]);
    assert.strictEqual(radio.filterStations(stations, 'All', '').length, 3);
    assert.strictEqual(radio.filterStations(stations, 'All', 'plain').length, 1);
    assert.ok(radio.filterStations(stations, 'Retro', '').every((s) => s.genres.includes('Retro')));
    const g = radio.availableGenres(stations);
    assert.strictEqual(g[0], 'All');
    assert.ok(!g.includes('Devotional'));
  });

  await t.test('fetches both tags and fails over to the next host', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      if (url.startsWith(radio.HOSTS[0])) throw new Error('connect ECONNREFUSED');
      return okResponse(url.includes('tag=bollywood') ? [st('a', 'Bolly')] : [st('b', 'Hindi')]);
    };
    const stations = await radio.fetchBollywoodStations({ fetchImpl });
    assert.strictEqual(stations.length, 2);
    assert.ok(calls.some((u) => u.startsWith(radio.HOSTS[1]) && u.includes('tag=hindi')));
    assert.ok(calls.every((u) => u.includes('hidebroken=true')));

    // the working host is remembered: next call goes straight to it
    calls.length = 0;
    await radio.fetchBollywoodStations({ fetchImpl });
    assert.ok(calls[0].startsWith(radio.HOSTS[1]));
  });

  await t.test('sends a generic user agent and nothing user specific', async () => {
    let headers;
    const fetchImpl = async (url, opts) => { headers = opts.headers; return okResponse([st('a', 'A')]); };
    await radio.fetchBollywoodStations({ fetchImpl });
    assert.match(headers['User-Agent'], /^TermPlayer\//);
    assert.deepStrictEqual(Object.keys(headers), ['User-Agent']);
  });

  await t.test('uses a fresh cache without touching the network', async () => {
    const cachePath = tmpCache();
    await radio.fetchBollywoodStations({ fetchImpl: async () => okResponse([st('a', 'A')]), cachePath, now: 1000 });
    let called = false;
    const out = await radio.fetchBollywoodStations({ fetchImpl: async () => { called = true; return okResponse([]); }, cachePath, now: 2000 });
    assert.strictEqual(called, false);
    assert.strictEqual(out.length, 1);
  });

  await t.test('falls back to a stale cache when every host fails', async () => {
    const cachePath = tmpCache();
    await radio.fetchBollywoodStations({ fetchImpl: async () => okResponse([st('a', 'A')]), cachePath, now: 1000 });
    const day = 24 * 60 * 60 * 1000;
    const out = await radio.fetchBollywoodStations({ fetchImpl: async () => { throw new Error('offline'); }, cachePath, now: 1000 + 2 * day });
    assert.strictEqual(out[0].title, 'A');
  });

  await t.test('throws a ProviderError when offline with no cache', async () => {
    await assert.rejects(
      radio.fetchBollywoodStations({ fetchImpl: async () => { throw new Error('offline'); } }),
      (err) => err instanceof ProviderError && /Network error/.test(err.message)
    );
  });

  await t.test('HTTP errors surface as ProviderError', async () => {
    await assert.rejects(
      radio.fetchBollywoodStations({ fetchImpl: async () => ({ ok: false, status: 503 }) }),
      (err) => err instanceof ProviderError && /503/.test(err.message)
    );
  });

  await t.test('registerClick hits /json/url/<uuid> and never throws', async () => {
    let url;
    assert.strictEqual(await radio.registerClick('abc-123', { fetchImpl: async (u) => { url = u; return okResponse({}); } }), true);
    assert.match(url, /\/json\/url\/abc-123$/);
    assert.strictEqual(await radio.registerClick('x', { fetchImpl: async () => { throw new Error('down'); } }), false);
    assert.strictEqual(await radio.registerClick(''), false);
  });
});
