const path = require('path');
const { loadOrBuildIndex } = require('./library/libraryIndex');

module.exports = async function start(cliOptions) {
  const songsDir = path.resolve(cliOptions.songsDir || './songs');
  const cacheTracksDir = path.resolve('./.cache/tracks');

  try {
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    console.log(`Loaded ${tracks.length} tracks into library index.`);
  } catch (err) {
    console.error('Failed to load index:', err);
  }
};
