const path = require('path');
const readline = require('readline');
const { loadOrBuildIndex } = require('./library/libraryIndex');
const { log } = require('./utils/logger');
const loadConfig = require('./config');
const { Store } = require('./state/store');
const { handleKeypress } = require('./ui/keymap');
const { render } = require('./ui/render');

function cleanup() {
  try {
    const { stop } = require('./playback/vlcController');
    stop();
  } catch (e) {}
  if (process.stdin.isTTY) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {}
  }
}

process.on('uncaughtException', (err) => {
  cleanup();
  log(`Uncaught Exception: ${err.message}`, 'FATAL');
  console.error('\nFatal Error:', err);
  process.exit(1);
});

process.on('exit', () => cleanup());
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});

module.exports = async function start(cliOptions) {
  const config = loadConfig(cliOptions);
  const songsDir = path.resolve(config.songsDir);
  const cacheTracksDir = path.resolve(config.cacheDir);

  const store = new Store();

  try {
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    log(`Loaded ${tracks.length} tracks into library index.`);
    store.state.tracks = tracks;

    const { onStatus } = require('./playback/vlcController');
    onStatus((status) => {
      store.dispatch({ type: 'UPDATE_PROGRESS', payload: { time: status.time, length: status.length } });
      const currentStatus = store.getState().status;
      if (status.state === 'playing' && currentStatus !== 'PLAYING' && currentStatus !== 'SEARCHING') {
        store.dispatch({ type: 'PLAYBACK_STARTED' });
      } else if (status.state === 'paused' && currentStatus !== 'PAUSED' && currentStatus !== 'SEARCHING') {
        store.dispatch({ type: 'PAUSE_TRACK' });
      } else if (status.state === 'stopped' && currentStatus !== 'IDLE' && currentStatus !== 'SEARCHING') {
        store.dispatch({ type: 'STOP_TRACK' });
      }
      render(store.getState());
    });

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      try {
        handleKeypress(str, key, store, config);
        render(store.getState());
      } catch (err) {
        log(`Keypress error: ${err.message}`, 'ERROR');
      }
    });

    // Initial render
    render(store.getState());

  } catch (err) {
    log(`Startup error: ${err.message}`, 'ERROR');
    console.error('Failed to start application:', err);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  }
};
