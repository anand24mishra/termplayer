class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

class ProviderError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProviderError';
  }
}

class PlaybackError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlaybackError';
  }
}

module.exports = { ConfigError, ProviderError, PlaybackError };
