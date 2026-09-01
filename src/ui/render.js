function render(state) {
  console.clear();

  if (state.status === 'SEARCHING') {
    console.log(`Search: ${state.query}`);
    if (state.searchError) {
      console.log(`Error: ${state.searchError}`);
    } else if (state.searchResults.length > 0) {
      state.searchResults.forEach((t, i) => {
        console.log(`${i === 0 ? '>' : ' '} ☁ ${t.title} — ${t.artist}`);
      });
    }
    console.log('\n[Enter] Play  [Esc] Cancel');
  } else {
    console.log('--- TermPlayer ---');
    console.log(`Volume: ${state.volume || 50}%`);
    if (state.status === 'PLAYING' || state.status === 'LOADING' || state.status === 'PAUSED') {
      const track = state.tracks ? state.tracks[state.selectedIndex || 0] : null;
      if (track) {
        let display = `${track.title} — ${track.artist || 'Unknown Artist'}`;
        if (track.album) {
          display += ` (${track.album})`;
        }
        console.log(`Now Playing: ${display} [${state.status}]`);
      }
    }
    console.log('Press / to search online. Press +/- to adjust volume.');
  }
}

module.exports = { render };
