const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mm = require('music-metadata');
const { scanLocal } = require('./localScanner');

function getDirectoryHash(directories) {
  const hash = crypto.createHash('sha1');
  const fileEntries = [];

  for (const dir of directories) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (!file.endsWith('.mp3') && !file.endsWith('.ogg') && !file.endsWith('.flac') && !file.endsWith('.wav') && !file.endsWith('.m4a')) continue;
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isFile()) {
        fileEntries.push(`${filePath}:${stat.mtimeMs}`);
      }
    }
  }

  fileEntries.sort();
  for (const entry of fileEntries) {
    hash.update(entry + '\n');
  }
  
  return hash.digest('hex');
}

async function loadOrBuildIndex(songsDir, cacheTracksDir) {
  const cacheDir = path.dirname(cacheTracksDir);
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  const indexPath = path.join(cacheDir, 'library-index.json');
  const currentHash = getDirectoryHash([songsDir, cacheTracksDir]);

  if (fs.existsSync(indexPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
      if (data.version === 1 && data.songsDirHash === currentHash) {
        return data.tracks;
      }
    } catch (e) {
      // Corrupt JSON or read error, ignore and rebuild
    }
  }

  // Need to rebuild
  const localTracks = scanLocal(songsDir, 'local');
  const cachedTracks = scanLocal(cacheTracksDir, 'online-cached');
  const allTracks = [...localTracks, ...cachedTracks];
  
  // Sort alphabetically by title
  allTracks.sort((a, b) => a.title.localeCompare(b.title));

  // Enrich with music-metadata
  for (const track of allTracks) {
    try {
      const metadata = await mm.parseFile(track.filePath, { duration: true });
      if (metadata.common.title) track.title = metadata.common.title;
      if (metadata.common.artist) track.artist = metadata.common.artist;
      if (metadata.common.album) track.album = metadata.common.album;
      if (metadata.format.duration) track.duration = Math.floor(metadata.format.duration);
    } catch (e) {
      // Fallback gracefully if parsing fails
    }
  }

  const indexData = {
    version: 1,
    songsDirHash: currentHash,
    tracks: allTracks
  };

  fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2), 'utf-8');
  return allTracks;
}

module.exports = { loadOrBuildIndex, getDirectoryHash };
