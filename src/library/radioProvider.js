const fs = require('fs');
const path = require('path');
const { ProviderError } = require('../utils/errors');

// Radio Browser (radio-browser.info): a free, key-less, community-run directory of internet radio stations.
const HOSTS = ['de1', 'nl1', 'at1'].map((h) => `https://${h}.api.radio-browser.info`);
const TAGS = ['bollywood', 'hindi'];
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;
const GENRES = ['All', '90s', 'Retro', 'Romantic', 'Remix', 'Hits', 'Sufi', 'Devotional'];

const GENRE_RULES = {
  '90s': /\b(90'?s|nineties|1990)/i,
  Retro: /(retro|\bold\b|classic|golden|vintage|nostalg|rafi|lata|kishore|asha|mukesh|\b(60|70|80)'?s)/i,
  Romantic: /(romantic|romance|\blove\b|pyar|ishq|dil)/i,
  Remix: /(remix|\bdj\b|club|dance|edm|party)/i,
  Hits: /(\bhits?\b|\btop\b|chart|superhit|latest|new)/i,
  Sufi: /(sufi|ghazal|qawwali|qawali)/i,
  Devotional: /(bhajan|devotional|kirtan|aarti|spiritual|gurbani)/i,
};

let preferredHost = null;

function userAgent() {
  let version = '0';
  try { version = require('../../package.json').version; } catch (e) {}
  return `TermPlayer/${version}`;
}

function genresOf(station) {
  const hay = `${station.name || ''} ${station.tags || ''}`;
  return Object.entries(GENRE_RULES).filter(([, re]) => re.test(hay)).map(([g]) => g);
}

function toTrack(s) {
  const name = String(s.name || '').replace(/\s+/g, ' ').trim();
  return {
    id: `radio:${s.stationuuid}`,
    stationuuid: s.stationuuid,
    title: name || 'Unknown station',
    artist: 'Live radio',
    album: s.country || null,
    country: s.countrycode || null,
    duration: 0,
    source: 'radio',
    isLive: true,
    filePath: null,
    streamUrl: s.url_resolved,
    codec: s.codec || null,
    bitrate: Number(s.bitrate) || 0,
    votes: Number(s.votes) || 0,
    clickcount: Number(s.clickcount) || 0,
    tags: s.tags || '',
    genres: genresOf(s),
  };
}

// Dedupe by station uuid and stream URL, drop entries without a playable URL, most-listened first.
function normalizeStations(lists) {
  const seenId = new Set();
  const seenUrl = new Set();
  const out = [];
  for (const s of lists.flat()) {
    if (!s || !s.stationuuid || !s.url_resolved) continue;
    if (seenId.has(s.stationuuid) || seenUrl.has(s.url_resolved)) continue;
    seenId.add(s.stationuuid);
    seenUrl.add(s.url_resolved);
    out.push(toTrack(s));
  }
  return out.sort((a, b) => b.clickcount - a.clickcount);
}

function filterStations(stations, genre = 'All', filter = '') {
  const q = String(filter).trim().toLowerCase();
  return stations.filter((s) => {
    if (genre && genre !== 'All' && !s.genres.includes(genre)) return false;
    if (q && !`${s.title} ${s.tags} ${s.album || ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

async function fetchJson(url, { signal, fetchImpl }) {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => timeout.abort();
  if (signal) {
    if (signal.aborted) timeout.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  try {
    const res = await fetchImpl(url, { signal: timeout.signal, headers: { 'User-Agent': userAgent() } });
    if (!res.ok) throw new ProviderError(`Radio directory returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

function readCache(cachePath) {
  try {
    const data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    if (data && Array.isArray(data.stations)) return data;
  } catch (e) {}
  return null;
}

function writeCache(cachePath, stations, now) {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(cachePath, JSON.stringify({ fetchedAt: now, stations }));
  } catch (e) {}
}

async function fetchBollywoodStations({ signal, fetchImpl = globalThis.fetch, cachePath, now = Date.now(), force = false } = {}) {
  const cached = cachePath ? readCache(cachePath) : null;
  if (cached && !force && now - cached.fetchedAt < CACHE_TTL_MS && cached.stations.length) return cached.stations;

  const hosts = preferredHost ? [preferredHost, ...HOSTS.filter((h) => h !== preferredHost)] : HOSTS;
  let lastError = null;
  for (const host of hosts) {
    try {
      const lists = await Promise.all(TAGS.map((tag) => fetchJson(
        `${host}/json/stations/search?tag=${tag}&hidebroken=true&order=clickcount&reverse=true&limit=200`,
        { signal, fetchImpl }
      )));
      const stations = normalizeStations(lists);
      if (!stations.length) throw new ProviderError('No stations found');
      preferredHost = host;
      if (cachePath) writeCache(cachePath, stations, now);
      return stations;
    } catch (err) {
      if (signal && signal.aborted) throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
      lastError = err;
    }
  }
  if (cached && cached.stations.length) return cached.stations; // stale cache beats nothing when offline
  if (lastError instanceof ProviderError) throw lastError;
  throw new ProviderError(`Network error: ${lastError ? lastError.message : 'unknown'}`);
}

// Radio Browser asks clients to count a "click" when a station is played. Fire and forget.
function registerClick(uuid, { fetchImpl = globalThis.fetch } = {}) {
  if (!uuid) return Promise.resolve(false);
  const host = preferredHost || HOSTS[0];
  return Promise.resolve()
    .then(() => fetchImpl(`${host}/json/url/${encodeURIComponent(uuid)}`, { headers: { 'User-Agent': userAgent() } }))
    .then(() => true)
    .catch(() => false);
}

// Genres that actually have stations (so the UI never offers an empty tab).
function availableGenres(stations) {
  return GENRES.filter((g) => g === 'All' || stations.some((s) => s.genres.includes(g)));
}

function _resetForTests() { preferredHost = null; }

module.exports = { fetchBollywoodStations, filterStations, availableGenres, registerClick, genresOf, normalizeStations, GENRES, HOSTS, _resetForTests };
