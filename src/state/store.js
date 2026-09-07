const initialState = {
  status: 'IDLE', // IDLE, LOADING, PLAYING, PAUSED, SEARCHING
  previousStatus: 'IDLE',
  currentTrack: null,
  query: '',
  searchResults: [],
  searchError: null,
  tracks: [],
  volume: 50,
  selectedIndex: 0,
  progress: { time: 0, length: 0 },
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
      return { ...state, status: 'LOADING', previousStatus: 'IDLE', currentTrack: playingTrack, progress: { time: 0, length: 0 } };
    }
    case 'PLAYBACK_STARTED':
      return { ...state, status: 'PLAYING' };
    case 'PAUSE_TRACK':
      return { ...state, status: 'PAUSED' };
    case 'RESUME_TRACK':
      return { ...state, status: 'PLAYING' };
    case 'STOP_TRACK':
      return { ...state, status: 'IDLE', progress: { time: 0, length: 0 } };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
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
