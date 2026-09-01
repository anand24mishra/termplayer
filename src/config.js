require('dotenv').config();

function loadConfig(cliOptions = {}) {
  const songsDir = cliOptions.songsDir || process.env.SONGS_DIR || './songs';
  const jamendoClientId = process.env.JAMENDO_CLIENT_ID;
  
  const onlineEnabled = cliOptions.online === false ? false : !!jamendoClientId;

  // IMPORTANT: PER architecture.md §2.2
  // trackCachingEnabled MUST default to false until docs/COMPLIANCE.md is REVIEWED.
  const trackCachingEnabled = process.env.ENABLE_TRACK_CACHING === 'true';

  return {
    jamendoClientId,
    songsDir,
    cacheDir: './.cache/tracks',
    onlineEnabled,
    trackCachingEnabled,
  };
}

module.exports = loadConfig;
