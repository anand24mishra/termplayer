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

  pause() {
    return this.request('pl_pause').catch(() => {});
  }

  resume() {
    return this.request('pl_pause').catch(() => {});
  }

  seek(timeInSeconds) {
    const val = Math.max(0, Math.floor(timeInSeconds));
    return this.request('seek', val).catch(() => {});
  }

  setRate(rate) {
    const val = Math.max(0.5, Math.min(2.0, Math.round(rate * 100) / 100));
    return this.request('rate', val).catch(() => {});
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
    this.deckA = new Deck('Deck A', 8080);
    this.deckB = new Deck('Deck B', 8081);
    this.activeDeck = this.deckA;
    this.fadingDeck = null;
    this.masterVolume = 50;
    this.playbackRate = 1.0;
    this.crossfadeDuration = 3; // seconds
    this.equalizerEnabled = false;
    this.equalizerBands = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    this.crossfadeInterval = null;
    this.statusInterval = null;
    this.statusCallback = null;
  }

  setCrossfadeDuration(sec) {
    this.crossfadeDuration = Math.max(0, Math.min(15, sec));
  }

  getCrossfadeDuration() {
    return this.crossfadeDuration;
  }

  startPolling() {
    if (this.statusInterval) clearInterval(this.statusInterval);
    this.statusInterval = setInterval(async () => {
      try {
        if (this.activeDeck && this.activeDeck.isPlaying) {
          const status = await this.activeDeck.request();
          if (this.statusCallback) {
            this.statusCallback({
              state: status.state,
              time: status.time,
              length: status.length,
              volume: this.masterVolume,
              deck: this.activeDeck.name
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
    // If no deck is actively playing, or crossfade duration is 0, start immediately
    if (!this.activeDeck.isPlaying || this.crossfadeDuration <= 0) {
      this.stop();
      this.activeDeck = this.deckA;
      await this.activeDeck.spawn(pathOrUrl, this.masterVolume);
      this.startPolling();
      return;
    }

    // Crossfade between activeDeck and incomingDeck
    const oldDeck = this.activeDeck;
    const newDeck = (oldDeck === this.deckA) ? this.deckB : this.deckA;
    this.fadingDeck = oldDeck;

    // Cancel any previous in-flight crossfade
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    // Start incoming deck with volume 0
    await newDeck.spawn(pathOrUrl, 0);
    this.activeDeck = newDeck;
    this.startPolling();

    const startTime = Date.now();
    const durationMs = this.crossfadeDuration * 1000;
    const stepMs = 100;

    this.crossfadeInterval = setInterval(async () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / durationMs);

      // Smooth equal-power or linear crossfade volume
      const oldVol = Math.round(this.masterVolume * (1 - progress));
      const newVol = Math.round(this.masterVolume * progress);

      await Promise.all([
        oldDeck.setVolume(oldVol).catch(() => {}),
        newDeck.setVolume(newVol).catch(() => {})
      ]);

      if (progress >= 1) {
        clearInterval(this.crossfadeInterval);
        this.crossfadeInterval = null;
        oldDeck.kill();
        this.fadingDeck = null;
        await newDeck.setVolume(this.masterVolume).catch(() => {});
      }
    }, stepMs);

    if (this.crossfadeInterval.unref) {
      this.crossfadeInterval.unref();
    }
  }

  pause() {
    if (this.activeDeck) this.activeDeck.pause();
    if (this.fadingDeck) this.fadingDeck.pause();
  }

  resume() {
    if (this.activeDeck) this.activeDeck.resume();
    if (this.fadingDeck) this.fadingDeck.resume();
  }

  seek(timeInSeconds) {
    if (this.activeDeck) {
      this.activeDeck.seek(timeInSeconds);
    }
  }

  setRate(rate) {
    this.playbackRate = Math.max(0.5, Math.min(2.0, Math.round(rate * 100) / 100));
    if (this.activeDeck) {
      this.activeDeck.setRate(this.playbackRate);
    }
  }

  getRate() {
    return this.playbackRate;
  }

  stop() {
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
    this.deckA.kill();
    this.deckB.kill();
    this.fadingDeck = null;
  }

  setVolume(pct) {
    this.masterVolume = Math.max(0, Math.min(100, pct));
    if (this.activeDeck) {
      this.activeDeck.setVolume(this.masterVolume);
    }
  }

  getVolume() {
    return this.masterVolume;
  }

  async applyEqualizer(enabled, bands = []) {
    this.equalizerEnabled = Boolean(enabled);
    if (Array.isArray(bands)) {
      this.equalizerBands = [...bands];
    }
    const targetDecks = [this.activeDeck, this.fadingDeck].filter(Boolean);
    await Promise.all(targetDecks.map(async (deck) => {
      await deck.enableEqualizer(this.equalizerEnabled ? 1 : 0);
      if (this.equalizerEnabled && Array.isArray(this.equalizerBands)) {
        for (let b = 0; b < this.equalizerBands.length && b < 10; b++) {
          await deck.setEqualizerBand(b, this.equalizerBands[b]);
        }
      }
    }));
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
