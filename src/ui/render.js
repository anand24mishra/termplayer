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
    console.log('Press / to search online');
  }
}

module.exports = { render };
