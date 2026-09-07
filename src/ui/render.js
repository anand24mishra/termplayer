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
    const xfadeSec = state.crossfadeDuration !== undefined ? state.crossfadeDuration : 3;
    const xfadeStatus = xfadeSec > 0 ? `[c] X-Fade: ${xfadeSec}s` : '[c] X-Fade: OFF';
    console.log(`Controls: [Up/Down] Navigate | [Enter] Play | [Space] Pause | [s] Stop | [/] Search | [1-4] Cues | [l] Loop | [</>] Pitch | [f] LPF | [v] Viz | [a] Auto-Mix | [+/-] Vol | ${xfadeStatus} | [Ctrl+C] Exit\n`);
    
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
      const ratePct = Math.round((state.playbackRate !== undefined ? state.playbackRate : 1.0) * 100);
      const rateStr = ratePct !== 100 ? `  Speed: ${ratePct}%` : '';

      const termCols = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80;
      let bpmBadge = '';
      if (currentTrack && currentTrack.bpm) {
        bpmBadge = `\x1b[1;38;5;201m⚡ \x1b[1;38;5;226m${currentTrack.bpm} BPM\x1b[0m`;
      }
      const nowPlayingLeft = `Now Playing: ${trackName}`;
      const visibleBpmLen = (currentTrack && currentTrack.bpm) ? `${currentTrack.bpm} BPM   `.length : 0;
      const padLen = Math.max(2, termCols - nowPlayingLeft.length - visibleBpmLen);

      console.log(`\n${nowPlayingLeft}${' '.repeat(padLen)}${bpmBadge}`);
      console.log(`${bar} ${formatTime(t)} / ${formatTime(l)} ${statusStr}   Vol: ${volStr}%${rateStr}`);

      const { renderVisualizer } = require('../dj/visualizer');
      const vizBlock = renderVisualizer(state);
      if (vizBlock) {
        console.log(`\n${vizBlock}`);
      }

      const activeCues = [];
      if (state.cues) {
        for (let i = 1; i <= 4; i++) {
          if (state.cues[i] !== null && state.cues[i] !== undefined) {
            activeCues.push(`[Cue ${i}: ${formatTime(state.cues[i])}]`);
          }
        }
      }
      const cuesDisplay = activeCues.length > 0 ? activeCues.join(' ') : '';
      const loopDisplay = state.loopActive ? `🔁 Loop: ON (${formatTime(state.loopStart || 0)} - ${formatTime(state.loopEnd || 0)})` : '';
      const autoMixDisplay = state.autoMix ? '🤖 Auto-Mix: ON' : '';
      const filterDisplay = (state.filterMode && state.filterMode !== 'off') ? `🎛️ Filter: ${state.filterMode.toUpperCase()}` : '';
      const djInfo = [cuesDisplay, loopDisplay, filterDisplay, autoMixDisplay].filter(Boolean).join('  |  ');
      if (djInfo) {
        console.log(`${djInfo}`);
      }
    }

    if (state.flashMessage) {
      console.log(`\n\x1b[33m*** ${state.flashMessage} ***\x1b[0m`);
    }
  }
}

module.exports = { render };
