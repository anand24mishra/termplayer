const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function scanLocal(directory, source = 'local') {
  if (!fs.existsSync(directory)) {
    return [];
  }
  const files = fs.readdirSync(directory);
  const tracks = [];

  for (const file of files) {
    if (!file.endsWith('.mp3') && !file.endsWith('.ogg') && !file.endsWith('.flac') && !file.endsWith('.wav') && !file.endsWith('.m4a')) continue;
    
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) continue;

    const hash = crypto.createHash('sha1').update(filePath).digest('hex');
    
    tracks.push({
      id: hash,
      title: path.basename(file, path.extname(file)),
      artist: null,
      album: null,
      duration: 0,
      source: source,
      filePath: filePath,
      streamUrl: null
    });
  }
  return tracks;
}

module.exports = { scanLocal };
