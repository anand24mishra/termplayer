const initialState = {
  status: 'IDLE', // IDLE, LOADING, PLAYING, PAUSED, SEARCHING
  previousStatus: 'IDLE',
  currentTrack: null,
  query: '',
  searchResults: [],
  searchError: null,
  tracks: [],
  volume: 50,
  crossfadeDuration: 3,
  playbackRate: 1.0,
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
    case 'CANCEL_SEARCH':
      return { ...state, status: state.previousStatus || 'IDLE', query: '', searchResults: [], searchError: null, selectedIndex: 0 };
    case 'PLAY_TRACK': {
      const playingTrack = action.payload || (state.status === 'SEARCHING' ? state.searchResults[state.selectedIndex] : state.tracks[state.selectedIndex]) || state.currentTrack;
      return {
        ...state,
        status: 'LOADING',
        previousStatus: 'IDLE',
        currentTrack: playingTrack,
        playbackRate: 1.0,
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
      return { ...state, status: 'PAUSED' };
    case 'RESUME_TRACK':
      return { ...state, status: 'PLAYING' };
    case 'STOP_TRACK':
      return { ...state, status: 'IDLE', progress: { time: 0, length: 0 } };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'SET_CROSSFADE':
      return { ...state, crossfadeDuration: action.payload };
    case 'SET_RATE':
      return { ...state, playbackRate: action.payload };
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
      return { ...state, progress: action.payload };
    case 'SET_FLASH_MESSAGE':
      return { ...state, flashMessage: action.payload };
    case 'CLEAR_FLASH_MESSAGE':
      return { ...state, flashMessage: null };
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
