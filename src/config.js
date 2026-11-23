require('dotenv').config({ quiet: true });

function loadConfig(cliOptions = {}) {
  const songsDir = cliOptions.songsDir || process.env.SONGS_DIR || './songs';
  const jamendoClientId = process.env.JAMENDO_CLIENT_ID;
  
  const onlineEnabled = cliOptions.online === false ? false : !!jamendoClientId;

  // IMPORTANT: PER architecture.md §2.2
  // trackCachingEnabled MUST default to false until docs/COMPLIANCE.md is REVIEWED.
  const trackCachingEnabled = process.env.ENABLE_TRACK_CACHING === 'true';

  const theme = cliOptions.theme || process.env.TERMPLAYER_THEME || 'auto';
  const animate = cliOptions.anim !== false && !process.env.TERMPLAYER_NO_ANIM;

  return {
    theme,
    animate,
    jamendoClientId,
    songsDir,
    cacheDir: './.cache/tracks',
    onlineEnabled,
    trackCachingEnabled,
  };
}

module.exports = loadConfig;
