const { searchTracks } = require('../library/onlineProvider');

let abortController = null;

function handleKeypress(str, key, store, config) {
  const state = store.getState();

  // Clear flash message on any keypress
  if (state.flashMessage) {
    store.dispatch({ type: 'CLEAR_FLASH_MESSAGE' });
  }

  if (key && key.ctrl && key.name === 'c') {
    const { stop } = require('../playback/vlcController');
    stop();
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
    process.exit(0);
  }

  if (state.status === 'SEARCHING') {
    if (key && key.name === 'escape') {
      if (abortController) abortController.abort();
      store.dispatch({ type: 'CANCEL_SEARCH' });
    } else if (key && key.name === 'up') {
      store.dispatch({ type: 'MOVE_UP' });
    } else if (key && key.name === 'down') {
      store.dispatch({ type: 'MOVE_DOWN' });
    } else if (key && (key.name === 'return' || key.name === 'enter')) {
      const selectedTrack = state.searchResults[state.selectedIndex || 0];
      if (selectedTrack) {
        store.dispatch({ type: 'PLAY_TRACK', payload: selectedTrack });
        const { play } = require('../playback/vlcController');
        play(selectedTrack.filePath || selectedTrack.streamUrl);
        // Kick off track download in background if it's an online stream
        if (selectedTrack.source === 'online-stream') {
          const { downloadTrack } = require('../cache/trackCache');
          const { upsertTrack } = require('../library/libraryIndex');
          downloadTrack(selectedTrack, config)
            .then(filePath => {
              if (filePath) {
                const newTrack = {
                  ...selectedTrack,
                  source: 'online-cached',
                  filePath,
                  // T4.2: keep license_ccurl and maybe attribution string (if needed)
                };
                upsertTrack(config.cacheDir, newTrack);
              }
            })
            .catch(err => {
              // Failed to download or save, ignore in background
            });
        }
      }
    } else if (key && key.name === 'backspace') {
      const newQuery = state.query.slice(0, -1);
      store.dispatch({ type: 'UPDATE_QUERY', payload: newQuery });
      triggerSearch(newQuery, store, config);
    } else if (str && str.length === 1) {
      const newQuery = state.query + str;
      store.dispatch({ type: 'UPDATE_QUERY', payload: newQuery });
      triggerSearch(newQuery, store, config);
    }
    return;
  }

  if (str === '/' || (key && key.name === '/')) {
    if (config.jamendoClientId) {
      store.dispatch({ type: 'START_SEARCH' });
    } else {
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: 'Set JAMENDO_CLIENT_ID to enable online search — see README.md' });
    }
    return;
  }

  // Navigation
  if (key && key.name === 'up') {
    store.dispatch({ type: 'MOVE_UP' });
    return;
  }
  if (key && key.name === 'down') {
    store.dispatch({ type: 'MOVE_DOWN' });
    return;
  }

  // Playback Controls
  if (key && (key.name === 'return' || key.name === 'enter')) {
    const selectedTrack = state.tracks[state.selectedIndex || 0];
    if (selectedTrack) {
      store.dispatch({ type: 'PLAY_TRACK', payload: selectedTrack });
      const { play } = require('../playback/vlcController');
      play(selectedTrack.filePath || selectedTrack.streamUrl);
    }
    return;
  }
  
  if (key && key.name === 'space') {
    const { pause, resume } = require('../playback/vlcController');
    if (state.status === 'PLAYING' || state.status === 'LOADING') {
      store.dispatch({ type: 'PAUSE_TRACK' });
      pause();
    } else if (state.status === 'PAUSED') {
      store.dispatch({ type: 'RESUME_TRACK' });
      resume();
    }
    return;
  }
  
  if (str === 's' || str === 'S') {
    store.dispatch({ type: 'STOP_TRACK' });
    const { stop } = require('../playback/vlcController');
    stop();
    return;
  }

  // Volume control keys
  if (str === '+' || str === '=') {
    const newVol = Math.min(100, (state.volume || 50) + 5);
    store.dispatch({ type: 'SET_VOLUME', payload: newVol });
    const { setVolume } = require('../playback/vlcController');
    setVolume(newVol);
    return;
  }
  
  if (str === '-') {
    const newVol = Math.max(0, (state.volume || 50) - 5);
    store.dispatch({ type: 'SET_VOLUME', payload: newVol });
    const { setVolume } = require('../playback/vlcController');
    setVolume(newVol);
    return;
  }
}

async function triggerSearch(query, store, config) {
  if (!query || query.trim() === '') {
    if (abortController) abortController.abort();
    store.dispatch({ type: 'SEARCH_SUCCESS', payload: [] });
    return;
  }
  if (abortController) abortController.abort();
  abortController = new AbortController();

  try {
    const results = await searchTracks(query.trim(), config.jamendoClientId, { signal: abortController.signal });
    store.dispatch({ type: 'SEARCH_SUCCESS', payload: results });
  } catch (err) {
    if (err.name !== 'AbortError') {
      store.dispatch({ type: 'SEARCH_ERROR', payload: err.message });
    }
  }
}

module.exports = { handleKeypress };
