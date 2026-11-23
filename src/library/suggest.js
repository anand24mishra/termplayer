// Random "surprise me" suggestions. `rng` is injectable so tests are deterministic.
function sameTrack(a, b) {
  if (!a || !b) return false;
  return (a.filePath && a.filePath === b.filePath) || (a.id && a.id === b.id) || (a.title === b.title && a.artist === b.artist);
}

// Returns an index into `items` different from the currently playing one (when there is a choice), or -1 if empty.
function pickRandomIndex(items, current, rng = Math.random) {
  if (!Array.isArray(items) || items.length === 0) return -1;
  const candidates = [];
  items.forEach((it, i) => { if (!sameTrack(it, current)) candidates.push(i); });
  const pool = candidates.length ? candidates : items.map((_, i) => i);
  return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

module.exports = { pickRandomIndex, sameTrack };
