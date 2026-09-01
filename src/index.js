const path = require('path');
const { loadOrBuildIndex } = require('./library/libraryIndex');
const { log } = require('./utils/logger');
// Assume errors are defined in src/utils/errors.js
// const { ConfigError, ProviderError, PlaybackError } = require('./utils/errors');

process.on('uncaughtException', (err) => {
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(false);
  }
  log(`Uncaught Exception: ${err.message}`, 'FATAL');
  console.error('\nFatal Error:', err);
  process.exit(1);
});

module.exports = async function start(cliOptions) {
  const songsDir = path.resolve(cliOptions.songsDir || './songs');
  const cacheTracksDir = path.resolve('./.cache/tracks');

  try {
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    log(`Loaded ${tracks.length} tracks into library index.`);
    
    // Placeholder for dispatch loop
    // while (running) { ... try { dispatch() } catch (err) { ... } }
  } catch (err) {
    log(`Startup error: ${err.message}`, 'ERROR');
    console.error('Failed to start application:', err);
  }
};
