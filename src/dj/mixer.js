const { spawn } = require('child_process');
const http = require('http');
const { locateVlc } = require('../playback/vlcLocator');

class Deck {
  constructor(name, port) {
    this.name = name;
    this.port = port;
    this.process = null;
    this.currentVolume = 50;
    this.isPlaying = false;
  }

  request(command, value = null) {
    let url = `http://:termplayer@localhost:${this.port}/requests/status.json`;
    if (command) {
      url += `?command=${command}`;
      if (value !== null) url += `&val=${value}`;
    }

    return new Promise((resolve, reject) => {
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch(e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
    });
  }

  spawn(pathOrUrl, initialVolume = 50) {
    this.kill();
    const vlcPath = locateVlc();
    this.process = spawn(vlcPath, [
      '-I', 'dummy',
      '--extraintf', 'http',
      '--http-password', 'termplayer',
      '--http-port', String(this.port),
      '--no-video',
      '--audio-filter', 'equalizer',
      pathOrUrl
    ]);
    this.isPlaying = true;
    this.currentVolume = initialVolume;

    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.setVolume(initialVolume).catch(() => {});
        resolve();
      }, 400);
    });
  }

  async setVolume(pct) {
    this.currentVolume = Math.max(0, Math.min(100, pct));
    const vlcVol = Math.floor((this.currentVolume / 100) * 320);
    return this.request('volume', vlcVol).catch(() => {});
  }

  // Idempotent commands: unlike the plain `pl_pause` toggle they cannot flip the state by mistake.
  pause() {
    return this.request('pl_forcepause').catch(() => {});
  }

  resume() {
    return this.request('pl_forceresume').catch(() => {});
  }

  seek(timeInSeconds) {
    const val = Math.max(0, Math.floor(timeInSeconds));
    return this.request('seek', val).catch(() => {});
  }

  enableEqualizer(enable = 1) {
    return this.request('enableeq', enable ? 1 : 0).catch(() => {});
  }

  setEqualizerBand(band, gainDb) {
    const b = Math.max(0, Math.min(9, Math.floor(band)));
    const g = Math.max(-20, Math.min(20, Math.round(gainDb)));
    let url = `http://:termplayer@localhost:${this.port}/requests/status.json?command=equalizer&band=${b}&val=${g}`;
    return new Promise((resolve) => {
      const req = http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve());
      });
      req.on('error', () => resolve());
    });
  }

  kill() {
    this.isPlaying = false;
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (e) {}
      this.process = null;
    }
  }
}

class Mixer {
  constructor() {
    this.deck = new Deck('Deck', 8080);
    this.masterVolume = 50;
    this.equalizerEnabled = false;
    this.equalizerBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.statusInterval = null;
    this.statusCallback = null;
  }

  startPolling() {
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.statusInterval = setInterval(async () => {
      try {
        if (this.deck.isPlaying) {
          const status = await this.deck.request();
          if (this.statusCallback) {
            const meta = status.information && status.information.category && status.information.category.meta;
            this.statusCallback({
              state: status.state,
              time: status.time,
              length: status.length,
              volume: this.masterVolume,
              // ICY "now playing" title of live radio streams (undefined for files)
              nowPlaying: (meta && meta.now_playing) || null
            });
          }
        }
      } catch (e) {}
    }, 1000);
    if (this.statusInterval.unref) {
      this.statusInterval.unref();
    }
  }

  async play(pathOrUrl) {
    this.stop();
    await this.deck.spawn(pathOrUrl, this.masterVolume);
    this.startPolling();
  }

  pause() {
    this.deck.pause();
  }

  resume() {
    this.deck.resume();
  }

  seek(timeInSeconds) {
    this.deck.seek(timeInSeconds);
  }

  stop() {
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.deck.kill();
  }

  setVolume(pct) {
    this.masterVolume = Math.max(0, Math.min(100, pct));
    this.deck.setVolume(this.masterVolume);
  }

  getVolume() {
    return this.masterVolume;
  }

  async applyEqualizer(enabled, bands = []) {
    this.equalizerEnabled = Boolean(enabled);
    if (Array.isArray(bands)) {
      this.equalizerBands = [...bands];
    }
    await this.deck.enableEqualizer(this.equalizerEnabled ? 1 : 0);
    if (this.equalizerEnabled) {
      for (let b = 0; b < this.equalizerBands.length && b < 10; b++) {
        await this.deck.setEqualizerBand(b, this.equalizerBands[b]);
      }
    }
  }

  onStatus(cb) {
    this.statusCallback = cb;
  }
}

// Global default mixer instance
const defaultMixer = new Mixer();

module.exports = {
  Mixer,
  defaultMixer
};
