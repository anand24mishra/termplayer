const { filterStations } = require('../library/radioProvider');

const initialState = {
  status: 'IDLE', // IDLE, LOADING, PLAYING, PAUSED, SEARCHING, RADIO
  previousStatus: 'IDLE',
  currentTrack: null,
  query: '',
  searchResults: [],
  searchError: null,
  tracks: [],
  volume: 50,
  visualizerMode: 'bars', // 'bars', 'waveform', 'off'
  cues: { 1: null, 2: null, 3: null, 4: null },
  loopActive: false,
  loopStart: null,
  loopEnd: null,
  selectedIndex: 0,
  progress: { time: 0, length: 0 },
  autoMix: false,
  filterMode: 'off',
  flashMessage: null,
  flashAt: 0,
  progressAt: 0,
  themeOverride: 'auto', // auto | dawn | day | golden | dusk | night
  showHelp: false,
  pauseIntent: false, // true only when the user paused; VLC is then kept paused
  transportAt: 0, // time of the last user pause/resume (used to ignore stale status polls)
  streamTitle: null, // ICY "now on air" title of the live radio station being played
  radio: { stations: [], loading: false, error: null, genre: 'All', filter: '', selected: 0 },
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'START_SEARCH':
      return { ...state, previousStatus: state.status, status: 'SEARCHING', query: '', searchResults: [], searchError: null, selectedIndex: 0 };
    case 'UPDATE_QUERY':
      return { ...state, query: action.payload };
    case 'SEARCH_SUCCESS':
      return { ...state, searchResults: action.payload, searchError: null, selectedIndex: 0 };
    case 'SEARCH_ERROR':
      return { ...state, searchError: action.payload, searchResults: [], selectedIndex: 0 };
    case 'OPEN_RADIO':
      return {
        ...state,
        previousStatus: state.status === 'RADIO' ? state.previousStatus : state.status,
        status: 'RADIO',
        radio: { ...state.radio, filter: '', selected: 0, error: null, loading: state.radio.stations.length === 0 },
      };
    case 'CLOSE_RADIO':
      return { ...state, status: state.previousStatus || 'IDLE', radio: { ...state.radio, filter: '', selected: 0 } };
    case 'RADIO_LOADED':
      return { ...state, radio: { ...state.radio, stations: action.payload, loading: false, error: null, selected: 0 } };
    case 'RADIO_ERROR':
      return { ...state, radio: { ...state.radio, loading: false, error: action.payload } };
    case 'RADIO_LOADING':
      return { ...state, radio: { ...state.radio, loading: true, error: null } };
    case 'RADIO_SET_GENRE':
      return { ...state, radio: { ...state.radio, genre: action.payload, selected: 0 } };
    case 'RADIO_SET_FILTER':
      return { ...state, radio: { ...state.radio, filter: action.payload, selected: 0 } };
    case 'RADIO_MOVE': {
      const n = filterStations(state.radio.stations, state.radio.genre, state.radio.filter).length;
      const selected = Math.max(0, Math.min(Math.max(0, n - 1), state.radio.selected + action.payload));
      return { ...state, radio: { ...state.radio, selected } };
    }
    case 'UPDATE_STREAM_TITLE':
      return { ...state, streamTitle: action.payload };
    case 'CANCEL_SEARCH':
      return { ...state, status: state.previousStatus || 'IDLE', query: '', searchResults: [], searchError: null, selectedIndex: 0 };
    case 'PLAY_TRACK': {
      const playingTrack = action.payload || (state.status === 'SEARCHING' ? state.searchResults[state.selectedIndex] : state.tracks[state.selectedIndex]) || state.currentTrack;
      return {
        ...state,
        status: 'LOADING',
        previousStatus: 'IDLE',
        currentTrack: playingTrack,
        streamTitle: null,
        pauseIntent: false,
        progress: { time: 0, length: 0 },
        cues: { 1: null, 2: null, 3: null, 4: null },
        loopActive: false,
        loopStart: null,
        loopEnd: null,
        filterMode: 'off'
      };
    }
    case 'PLAYBACK_STARTED':
      return { ...state, status: 'PLAYING' };
    case 'SET_BPM':
      if (!state.currentTrack) return state;
      return {
        ...state,
        currentTrack: { ...state.currentTrack, bpm: action.payload }
      };
    case 'SET_CUE':
      return {
        ...state,
        cues: { ...state.cues, [action.payload.num]: action.payload.time }
      };
    case 'CLEAR_CUE':
      return {
        ...state,
        cues: { ...state.cues, [action.payload]: null }
      };
    case 'SET_LOOP':
      return {
        ...state,
        loopActive: action.payload.active,
        loopStart: action.payload.start !== undefined ? action.payload.start : state.loopStart,
        loopEnd: action.payload.end !== undefined ? action.payload.end : state.loopEnd
      };
    case 'PAUSE_TRACK':
      // action.user is set by the Space key; a pause merely observed from VLC is not an intent
      return action.user
        ? { ...state, status: 'PAUSED', pauseIntent: true, transportAt: action.at || Date.now() }
        : { ...state, status: 'PAUSED' };
    case 'RESUME_TRACK':
      return { ...state, status: 'PLAYING', pauseIntent: false, transportAt: action.at || Date.now() };
    case 'STOP_TRACK':
      return { ...state, status: 'IDLE', pauseIntent: false, progress: { time: 0, length: 0 } };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_VISUALIZER_MODE':
      return { ...state, visualizerMode: action.payload };
    case 'SET_AUTO_MIX':
      return { ...state, autoMix: Boolean(action.payload) };
    case 'SET_FILTER_MODE':
      return { ...state, filterMode: action.payload };
    case 'SELECT_TRACK':
      return { ...state, selectedIndex: action.payload };
    case 'MOVE_UP':
      return { ...state, selectedIndex: Math.max(0, state.selectedIndex - 1) };
    case 'MOVE_DOWN':
      const maxIndex = state.status === 'SEARCHING' ? state.searchResults.length - 1 : state.tracks.length - 1;
      return { ...state, selectedIndex: Math.min(Math.max(0, maxIndex), state.selectedIndex + 1) };
    case 'UPDATE_PROGRESS':
      return { ...state, progress: action.payload, progressAt: action.at || Date.now() };
    case 'SET_FLASH_MESSAGE':
      return { ...state, flashMessage: action.payload, flashAt: action.at || Date.now() };
    case 'CLEAR_FLASH_MESSAGE':
      return { ...state, flashMessage: null, flashAt: 0 };
    case 'SET_THEME':
      return { ...state, themeOverride: action.payload };
    case 'TOGGLE_HELP':
      return { ...state, showHelp: !state.showHelp };
    case 'HIDE_HELP':
      return { ...state, showHelp: false };
    default:
      return state;
  }
}

class Store {
  constructor() {
    this.state = initialState;
  }
  dispatch(action) {
    this.state = reducer(this.state, action);
  }
  getState() {
    return this.state;
  }
}

module.exports = { Store, reducer };
