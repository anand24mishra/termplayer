/**
 * AutoMixer - Handles automatic playlist progression when the current track is about to end.
 */

// Playback status is polled every second, so advance when <= 1.5s remain (at most ~1.5s is clipped).
const AUTO_MIX_LEAD_SECONDS = 1.5;

class AutoMixer {
  constructor() {
    this.triggeredForTrack = null;
  }

  reset() {
    this.triggeredForTrack = null;
  }

  /**
   * Determine if an auto-mix transition should occur based on playback progress.
   */
  shouldTransition(status, state) {
    if (!state || !state.autoMix) return false;
    if (state.status !== 'PLAYING') return false;
    if (!state.tracks || state.tracks.length <= 1) return false;
    if (!status || typeof status.time !== 'number' || typeof status.length !== 'number') return false;
    if (status.length <= 0) return false;

    const trackId = state.currentTrack ? (state.currentTrack.filePath || state.currentTrack.id || state.currentTrack.title) : null;
    if (!trackId) return false;

    if (this.triggeredForTrack === trackId) return false;

    const remaining = status.length - status.time;

    return remaining <= AUTO_MIX_LEAD_SECONDS && status.time > 0;
  }

  /**
   * Determine next track index and Track object in state.tracks
   */
  getNextTrack(state) {
    if (!state.tracks || state.tracks.length === 0) return null;
    const currentId = state.currentTrack ? (state.currentTrack.filePath || state.currentTrack.id || state.currentTrack.title) : null;
    let currentIdx = -1;
    if (currentId) {
      currentIdx = state.tracks.findIndex(t => (t.filePath || t.id || t.title) === currentId);
    }
    const baseIdx = currentIdx !== -1 ? currentIdx : (state.selectedIndex || 0);
    const nextIndex = (baseIdx + 1) % state.tracks.length;
    return { track: state.tracks[nextIndex], index: nextIndex };
  }

  /**
   * Check playback status and trigger callback if transition conditions are met.
   */
  checkAutoMix(status, state, onTransition) {
    if (!this.shouldTransition(status, state)) return false;

    const currentId = state.currentTrack ? (state.currentTrack.filePath || state.currentTrack.id || state.currentTrack.title) : null;
    this.triggeredForTrack = currentId;

    const next = this.getNextTrack(state);
    if (!next || !next.track) return false;

    if (typeof onTransition === 'function') {
      onTransition(next.track, next.index);
    }
    return true;
  }
}

const defaultAutoMixer = new AutoMixer();

module.exports = {
  AutoMixer,
  defaultAutoMixer
};
