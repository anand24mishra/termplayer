const initialState = {
  status: 'IDLE', // IDLE, LOADING, PLAYING, PAUSED, SEARCHING
  query: '',
  searchResults: [],
  searchError: null,
  tracks: [],
  volume: 50,
};

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'START_SEARCH':
      return { ...state, status: 'SEARCHING', query: '', searchResults: [], searchError: null };
    case 'UPDATE_QUERY':
      return { ...state, query: action.payload };
    case 'SEARCH_SUCCESS':
      return { ...state, searchResults: action.payload, searchError: null };
    case 'SEARCH_ERROR':
      return { ...state, searchError: action.payload, searchResults: [] };
    case 'CANCEL_SEARCH':
      return { ...state, status: 'IDLE', query: '', searchResults: [], searchError: null };
    case 'PLAY_TRACK':
      return { ...state, status: 'LOADING' };
    case 'PLAYBACK_STARTED':
      return { ...state, status: 'PLAYING' };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
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
