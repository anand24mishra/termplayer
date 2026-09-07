const { defaultMixer } = require('../dj/mixer');

function play(pathOrUrl) {
  return defaultMixer.play(pathOrUrl);
}

function pause() {
  defaultMixer.pause();
}

function resume() {
  defaultMixer.resume();
}

function stop() {
  defaultMixer.stop();
}

function setVolume(pct) {
  defaultMixer.setVolume(pct);
}

function getVolume() {
  return defaultMixer.getVolume();
}

function onStatus(cb) {
  defaultMixer.onStatus(cb);
}

function setCrossfadeDuration(sec) {
  defaultMixer.setCrossfadeDuration(sec);
}

function getCrossfadeDuration() {
  return defaultMixer.getCrossfadeDuration();
}

function seek(timeInSeconds) {
  defaultMixer.seek(timeInSeconds);
}

function setRate(rate) {
  defaultMixer.setRate(rate);
}

function getRate() {
  return defaultMixer.getRate();
}

function applyEqualizer(enabled, bands) {
  return defaultMixer.applyEqualizer(enabled, bands);
}

module.exports = {
  play,
  pause,
  resume,
  stop,
  seek,
  setRate,
  getRate,
  applyEqualizer,
  setVolume,
  getVolume,
  onStatus,
  setCrossfadeDuration,
  getCrossfadeDuration
};
