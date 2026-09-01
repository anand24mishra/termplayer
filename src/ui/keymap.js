const { searchTracks } = require('../library/onlineProvider');

let abortController = null;

function handleKeypress(str, key, store, config) {
  const state = store.getState();

  if (key && key.ctrl && key.name === 'c') {
    process.exit(0);
  }

  if (state.status === 'SEARCHING') {
    if (key && key.name === 'escape') {
      if (abortController) abortController.abort();
      store.dispatch({ type: 'CANCEL_SEARCH' });
    } else if (key && (key.name === 'return' || key.name === 'enter')) {
      const selectedTrack = state.searchResults[state.selectedIndex || 0];
      if (selectedTrack) {
        store.dispatch({ type: 'PLAY_TRACK' });
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
      store.dispatch({ type: 'UPDATE_QUERY', payload: state.query.slice(0, -1) });
    } else if (str && str.length === 1) {
      store.dispatch({ type: 'UPDATE_QUERY', payload: state.query + str });
      triggerSearch(store.getState().query, store, config);
    }
    return;
  }

  if (key && key.name === '/') {
    if (config.jamendoClientId) {
      store.dispatch({ type: 'START_SEARCH' });
    } else {
      console.log('Set JAMENDO_CLIENT_ID to enable online search — see README.md');
    }
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
  if (!query) return;
  if (abortController) abortController.abort();
  abortController = new AbortController();

  try {
    const results = await searchTracks(query, config.jamendoClientId, { signal: abortController.signal });
    store.dispatch({ type: 'SEARCH_SUCCESS', payload: results });
  } catch (err) {
    if (err.name !== 'AbortError') {
      store.dispatch({ type: 'SEARCH_ERROR', payload: err.message });
    }
  }
}

module.exports = { handleKeypress };
