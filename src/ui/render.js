function render(state) {
  console.clear();

  if (state.status === 'SEARCHING') {
    console.log(`Search: ${state.query}`);
    if (state.searchError) {
      console.log(`Error: ${state.searchError}`);
    } else if (state.searchResults.length > 0) {
      state.searchResults.forEach((t, i) => {
        const prefix = (i === (state.selectedIndex || 0)) ? '>' : ' ';
        console.log(`${prefix} ☁ ${t.title} — ${t.artist || 'Unknown Artist'}`);
      });
    }
    console.log('\n[Enter] Play  [Esc] Cancel');
  } else {
    console.log('--- TermPlayer ---');
    console.log(`Controls: [Up/Down] Navigate | [Enter] Play | [Space] Pause/Resume | [s] Stop | [/] Search online | [+/-] Volume | [Ctrl+C] Exit\n`);
    
    if (state.tracks && state.tracks.length > 0) {
      state.tracks.forEach((track, i) => {
        const prefix = (i === (state.selectedIndex || 0)) ? '>' : ' ';
        let display = `${track.title} — ${track.artist || 'Unknown Artist'}`;
        if (track.album) display += ` (${track.album})`;
        const cacheIndicator = (track.source === 'online-cached') ? ' ☁ cached' : '';
        console.log(`${prefix} ${display}${cacheIndicator}`);
      });
      console.log('');
    } else {
      console.log('  (No local tracks found in songs/)\n');
    }

    if (state.status === 'PLAYING' || state.status === 'LOADING' || state.status === 'PAUSED') {
      const currentTrack = state.currentTrack || state.tracks[state.selectedIndex] || null;
      let trackName = 'No track selected';
      if (currentTrack) {
        trackName = currentTrack.title || currentTrack.filename || 'Unknown';
        if (currentTrack.artist) {
          trackName += ` — ${currentTrack.artist}`;
        }
        if (currentTrack.album) {
          trackName += ` (${currentTrack.album})`;
        }
      }
      const volStr = (state.volume !== undefined ? state.volume : 50).toString().padStart(3, ' ');

      const t = state.progress.time || 0;
      const l = state.progress.length || 0;
      
      const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      const progressPct = l > 0 ? t / l : 0;
      const barLen = 30;
      const filled = Math.round(progressPct * barLen);
      const bar = '[' + '█'.repeat(filled) + '-'.repeat(barLen - filled) + ']';
      
      const statusStr = state.status === 'PLAYING' ? '(Playing)' : state.status === 'LOADING' ? '(Loading...)' : state.status === 'PAUSED' ? '(Paused)' : '(Stopped)';
      console.log(`\nNow Playing: ${trackName}`);
      console.log(`${bar} ${formatTime(t)} / ${formatTime(l)} ${statusStr}   Vol: ${volStr}%`);
    }

    if (state.flashMessage) {
      console.log(`\n\x1b[33m*** ${state.flashMessage} ***\x1b[0m`);
    }
  }
}

module.exports = { render };
