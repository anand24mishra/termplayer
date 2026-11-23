// Decides what to do with each VLC status poll, given what the user last asked for.
// Pure function so it can be tested without VLC.
const GRACE_MS = 2500; // after a pause/resume keypress, polls issued before VLC reacted are stale

function reconcileStatus({ vlcState, status, previousStatus, pauseIntent, transportAgeMs }) {
  const overlay = status === 'SEARCHING' || status === 'RADIO';
  const stale = transportAgeMs < GRACE_MS;

  if (vlcState === 'playing') {
    // The user paused but VLC is playing (stream reconnect, audio device change...): keep it paused.
    if (pauseIntent) return stale ? null : 'FORCE_PAUSE';
    if (stale) return null;
    if (!overlay && status !== 'PLAYING') return 'PLAYBACK_STARTED';
  } else if (vlcState === 'paused') {
    if (stale) return null;
    if (!overlay && status !== 'PAUSED') return 'PAUSE_TRACK';
  } else if (vlcState === 'stopped') {
    if (!overlay && status !== 'IDLE') return 'STOP_TRACK';
  }
  return null;
}

module.exports = { reconcileStatus, GRACE_MS };
