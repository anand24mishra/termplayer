const { searchTracks } = require('../library/onlineProvider');
const { detectBpm } = require('../dj/bpmDetector');
const { defaultCueController } = require('../dj/cueController');
const path = require('path');
const { fetchBollywoodStations, filterStations, availableGenres, registerClick } = require('../library/radioProvider');
const { pickRandomIndex } = require('../library/suggest');

let abortController = null;
let radioAbort = null;

const LIVE_ONLY_MSG = 'Not available on live radio';

function isLiveNow(state) {
  return !!(state.currentTrack && state.currentTrack.isLive && ['PLAYING', 'PAUSED', 'LOADING'].includes(state.status));
}

// Shared "play this track now" path used by Enter, random pick and radio.
function startPlayback(track, store) {
  const { play } = require('../playback/vlcController');
  defaultCueController.reset();
  store.dispatch({ type: 'PLAY_TRACK', payload: track });
  startBpmDetection(track, store);
  play(track.filePath || track.streamUrl);
}

function loadRadio(store, config, force = false) {
  if (radioAbort) radioAbort.abort();
  radioAbort = new AbortController();
  store.dispatch({ type: 'RADIO_LOADING' });
  const cachePath = config.cacheDir ? path.resolve(config.cacheDir, '..', 'radio-stations.json') : undefined;
  const { render } = require('./render');
  return fetchBollywoodStations({ signal: radioAbort.signal, cachePath, fetchImpl: config.fetchImpl, force })
    .then((stations) => store.dispatch({ type: 'RADIO_LOADED', payload: stations }))
    .catch((err) => {
      if (err.name !== 'AbortError') store.dispatch({ type: 'RADIO_ERROR', payload: err.message });
    })
    .then(() => render(store.getState()));
}

function tuneIn(station, store) {
  startPlayback(station, store);
  registerClick(station.stationuuid);
  store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `Tuned in: ${station.title}` });
}

function startBpmDetection(track, store) {
  if (!track || track.isLive) return; // an endless stream cannot be analysed
  detectBpm(track)
    .then(bpm => {
      if (bpm) {
        store.dispatch({ type: 'SET_BPM', payload: bpm });
        const { render } = require('./render');
        render(store.getState());
      }
    })
    .catch(() => {});
}

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

  // Any key dismisses the help overlay
  if (state.showHelp) {
    store.dispatch({ type: 'HIDE_HELP' });
    return;
  }

  if (state.status === 'RADIO') {
    const radio = state.radio;
    const list = filterStations(radio.stations, radio.genre, radio.filter);
    const genres = availableGenres(radio.stations);
    if (key && key.name === 'escape') {
      if (radioAbort) radioAbort.abort();
      store.dispatch({ type: 'CLOSE_RADIO' });
    } else if (key && key.name === 'up') {
      store.dispatch({ type: 'RADIO_MOVE', payload: -1 });
    } else if (key && key.name === 'down') {
      store.dispatch({ type: 'RADIO_MOVE', payload: 1 });
    } else if (key && (key.name === 'left' || key.name === 'right')) {
      const i = Math.max(0, genres.indexOf(radio.genre));
      const next = genres[(i + (key.name === 'right' ? 1 : genres.length - 1)) % genres.length];
      store.dispatch({ type: 'RADIO_SET_GENRE', payload: next });
    } else if (key && (key.name === 'return' || key.name === 'enter')) {
      const station = list[radio.selected || 0];
      if (station) tuneIn(station, store);
    } else if (key && key.name === 'tab') {
      const idx = pickRandomIndex(list, state.currentTrack);
      if (idx >= 0) tuneIn(list[idx], store);
    } else if (key && key.name === 'backspace') {
      store.dispatch({ type: 'RADIO_SET_FILTER', payload: radio.filter.slice(0, -1) });
    } else if (str && str.length === 1 && str >= ' ') {
      store.dispatch({ type: 'RADIO_SET_FILTER', payload: radio.filter + str });
    }
    return;
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
        defaultCueController.reset();
        store.dispatch({ type: 'PLAY_TRACK', payload: selectedTrack });
        startBpmDetection(selectedTrack, store);
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
    if (config.jamendoClientId && config.onlineEnabled !== false) {
      store.dispatch({ type: 'START_SEARCH' });
    } else {
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: config.onlineEnabled === false ? 'Online search is disabled (--no-online)' : 'Set JAMENDO_CLIENT_ID to enable online search — see README.md' });
    }
    return;
  }

  if (str === '?') {
    store.dispatch({ type: 'TOGGLE_HELP' });
    return;
  }

  // Bollywood radio browser [b]
  if (str === 'b' || str === 'B') {
    store.dispatch({ type: 'OPEN_RADIO' });
    if (store.getState().radio.stations.length === 0) loadRadio(store, config);
    return;
  }

  // Random pick [n]: "surprise me" from the local library
  if (str === 'n' || str === 'N') {
    const tracks = state.tracks || [];
    const idx = pickRandomIndex(tracks, state.currentTrack);
    if (idx < 0) {
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: 'No tracks to pick from — press b for Bollywood radio' });
      return;
    }
    const pick = tracks[idx];
    store.dispatch({ type: 'SELECT_TRACK', payload: idx });
    startPlayback(pick, store);
    store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `Random pick: ${pick.title || pick.filename}${pick.artist ? ' — ' + pick.artist : ''}` });
    return;
  }

  // Theme cycle [t]: auto -> dawn -> day -> golden -> dusk -> night
  if (str === 't' || str === 'T') {
    const { nextTheme } = require('./theme/timeOfDay');
    const next = nextTheme(state.themeOverride || 'auto');
    store.dispatch({ type: 'SET_THEME', payload: next });
    store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: next === 'auto' ? 'Theme: Auto (follows the clock)' : `Theme: ${next[0].toUpperCase()}${next.slice(1)}` });
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
    if (selectedTrack) startPlayback(selectedTrack, store);
    return;
  }
  
  if (key && key.name === 'space') {
    const { pause, resume } = require('../playback/vlcController');
    if (state.status === 'PLAYING' || state.status === 'LOADING') {
      store.dispatch({ type: 'PAUSE_TRACK', user: true });
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

  // Cues and loops need a seekable timeline, which live radio does not have
  const cueKeys = ['1', '2', '3', '4', '!', '@', '#', '$', 'l', 'L'];
  if (str && cueKeys.includes(str) && isLiveNow(state)) {
    store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: LIVE_ONLY_MSG });
    return;
  }

  // Hot Cues (1-4 to set/jump, Shift+1-4 to overwrite)
  const cueMap = { '1': 1, '2': 2, '3': 3, '4': 4, '!': 1, '@': 2, '#': 3, '$': 4 };
  if (str && cueMap[str]) {
    const num = cueMap[str];
    const isOverwrite = ['!', '@', '#', '$'].includes(str);
    const { defaultMixer } = require('../dj/mixer');
    const curTime = (state.progress && state.progress.time) ? state.progress.time : 0;
    const result = defaultCueController.handleCueKey(num, curTime, defaultMixer, isOverwrite);
    if (result) {
      if (result.action === 'SET') {
        store.dispatch({ type: 'SET_CUE', payload: { num: result.num, time: result.time } });
        store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `Cue ${result.num} set to ${result.formatted}` });
      } else if (result.action === 'JUMP') {
        store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `Jumped to Cue ${result.num} (${result.formatted})` });
      }
    }
    return;
  }

  // Loop toggle [l]
  if (str === 'l' || str === 'L') {
    const curTime = (state.progress && state.progress.time) ? state.progress.time : 0;
    const loopRes = defaultCueController.toggleLoop(curTime);
    store.dispatch({
      type: 'SET_LOOP',
      payload: { active: loopRes.active, start: loopRes.start, end: loopRes.end }
    });
    if (loopRes.active) {
      store.dispatch({
        type: 'SET_FLASH_MESSAGE',
        payload: `Loop: ON (${loopRes.startFormatted} - ${loopRes.endFormatted})`
      });
    } else {
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: 'Loop: OFF' });
    }
    return;
  }

  // Visualizer mode toggle [v]
  if (str === 'v' || str === 'V') {
    const modes = ['bars', 'waveform', 'off'];
    const curMode = state.visualizerMode || 'bars';
    const nextIdx = (modes.indexOf(curMode) + 1) % modes.length;
    const nextMode = modes[nextIdx >= 0 ? nextIdx : 0];

    store.dispatch({ type: 'SET_VISUALIZER_MODE', payload: nextMode });
    const label = nextMode === 'bars' ? 'Spectrum Bars' : nextMode === 'waveform' ? 'Waveform' : 'OFF';
    store.dispatch({
      type: 'SET_FLASH_MESSAGE',
      payload: `Visualizer: ${label}`
    });
    return;
  }

  // Auto-mix queue mode toggle [a]
  if (str === 'a' || str === 'A') {
    const newAutoMix = !state.autoMix;
    store.dispatch({ type: 'SET_AUTO_MIX', payload: newAutoMix });
    store.dispatch({
      type: 'SET_FLASH_MESSAGE',
      payload: newAutoMix ? 'Auto-Mix: ON (Continuous Queue)' : 'Auto-Mix: OFF'
    });
    return;
  }

  // Filter / Low-pass effect [f] (cycle modes) or [F] (trigger sweep)
  if (str === 'f') {
    const { defaultEffectsController } = require('../dj/effects');
    const { defaultMixer } = require('../dj/mixer');
    const mode = defaultEffectsController.cycleFilter(defaultMixer);
    store.dispatch({ type: 'SET_FILTER_MODE', payload: mode.id });
    store.dispatch({
      type: 'SET_FLASH_MESSAGE',
      payload: `Filter: ${mode.label}`
    });
    return;
  }

  if (str === 'F') {
    const { defaultEffectsController } = require('../dj/effects');
    const { defaultMixer } = require('../dj/mixer');
    const { render } = require('./render');
    store.dispatch({
      type: 'SET_FLASH_MESSAGE',
      payload: 'Filter: Sweeping LPF...'
    });
    defaultEffectsController.sweepFilter(defaultMixer, (step) => {
      store.dispatch({ type: 'SET_FILTER_MODE', payload: step.id });
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: `Filter Sweep: ${step.label}` });
      render(store.getState());
    }).then(() => {
      store.dispatch({ type: 'SET_FILTER_MODE', payload: 'off' });
      store.dispatch({ type: 'SET_FLASH_MESSAGE', payload: 'Filter Sweep: Done (Flat)' });
      render(store.getState());
    });
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

module.exports = { handleKeypress, startBpmDetection };
