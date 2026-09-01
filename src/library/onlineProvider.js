const { ProviderError } = require('../utils/errors');

async function searchTracks(query, clientId, { signal } = {}) {
  if (!clientId) {
    throw new ProviderError('JAMENDO_CLIENT_ID is not configured');
  }

  const url = `https://api.jamendo.com/v3.0/tracks/?client_id=${clientId}&format=json&limit=10&search=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new ProviderError(`Jamendo API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.results || data.results.length === 0) {
      throw new ProviderError('No results found');
    }

    return data.results.map(track => ({
      id: `jamendo:${track.id}`,
      title: track.name,
      artist: track.artist_name || null,
      album: track.album_name || null,
      duration: parseInt(track.duration, 10) || 0,
      source: 'online-stream',
      filePath: null,
      streamUrl: track.audio
    }));
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof ProviderError) {
      throw error;
    }
    throw new ProviderError(`Network error: ${error.message}`);
  }
}

module.exports = { searchTracks };
