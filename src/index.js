const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { loadOrBuildIndex } = require('./library/libraryIndex');
const { log } = require('./utils/logger');
const loadConfig = require('./config');
const { Store } = require('./state/store');
const { reconcileStatus } = require('./playback/reconcile');
const { handleKeypress } = require('./ui/keymap');
const { render, startUI, stopUI } = require('./ui/render');

function cleanup() {
  try { stopUI(); } catch (e) {}
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

  if (cliOptions && cliOptions.clearCache) {
    fs.rmSync(path.resolve('.cache'), { recursive: true, force: true });
  }

  const store = new Store();

  try {
    const tracks = await loadOrBuildIndex(songsDir, cacheTracksDir);
    log(`Loaded ${tracks.length} tracks into library index.`);
    store.state.tracks = tracks;
    store.dispatch({ type: 'SET_THEME', payload: ['auto', 'dawn', 'day', 'golden', 'dusk', 'night'].includes(config.theme) ? config.theme : 'auto' });

    const { onStatus } = require('./playback/vlcController');
    onStatus((status) => {
      store.dispatch({ type: 'UPDATE_PROGRESS', payload: { time: status.time, length: status.length } });
      const cur = store.getState();
      const action = reconcileStatus({
        vlcState: status.state,
        status: cur.status,
        previousStatus: cur.previousStatus,
        pauseIntent: cur.pauseIntent,
        transportAgeMs: Date.now() - (cur.transportAt || 0),
      });
      if (action === 'FORCE_PAUSE') {
        require('./playback/vlcController').pause(); // user paused: do not let it play on by itself
      } else if (action) {
        store.dispatch({ type: action });
      }

      // Live radio: surface the song currently on air (ICY metadata) and toast when it changes
      const live = store.getState();
      if (live.currentTrack && live.currentTrack.isLive && status.nowPlaying && status.nowPlaying !== live.streamTitle) {
        store.dispatch({ type: 'UPDATE_STREAM_TITLE', payload: status.nowPlaying });
        store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `On air: ${status.nowPlaying}` });
      }

      const { defaultCueController } = require('./dj/cueController');
      const { defaultMixer } = require('./dj/mixer');
      defaultCueController.checkLoop(status.time, defaultMixer);

      const { defaultAutoMixer } = require('./dj/autoMixer');
      defaultAutoMixer.checkAutoMix(status, store.getState(), (nextTrack, nextIndex) => {
        const { play } = require('./playback/vlcController');
        const { startBpmDetection } = require('./ui/keymap');
        defaultCueController.reset();
        store.dispatch({ type: 'SELECT_TRACK', payload: nextIndex });
        store.dispatch({ type: 'PLAY_TRACK', payload: nextTrack });
        store.dispatch({
          type: 'SET_FLASH_MESSAGE',
          payload: `Auto-mixing into: ${nextTrack.title || nextTrack.filename || 'Next Track'}`
        });
        startBpmDetection(nextTrack, store);
        play(nextTrack.filePath || nextTrack.streamUrl);
      });

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

    // Start the full-screen UI
    startUI(store, { animate: config.animate });
    render(store.getState());

  } catch (err) {
    log(`Startup error: ${err.message}`, 'ERROR');
    console.error('Failed to start application:', err);
    if (process.stdin.isTTY) process.stdin.setRawMode(false);
  }
};
