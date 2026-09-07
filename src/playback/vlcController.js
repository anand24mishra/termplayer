const { locateVlc } = require('./vlcLocator');
const { spawn } = require('child_process');
const http = require('http');

let vlcProcess = null;
let currentVolume = 50;
let statusInterval = null;
let statusCallback = null;

function vlcRequest(command, value = null) {
  let url = 'http://:termplayer@localhost:8080/requests/status.json';
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

function startPolling() {
  if (statusInterval) clearInterval(statusInterval);
  statusInterval = setInterval(async () => {
    try {
      const status = await vlcRequest();
      if (statusCallback) {
        statusCallback({
          state: status.state,
          time: status.time,
          length: status.length,
          volume: status.volume
        });
      }
    } catch(err) {
      // Ignore errors if VLC is shutting down or unresponsive briefly
    }
  }, 1000);
  if (statusInterval.unref) {
    statusInterval.unref();
  }
}

function play(pathOrUrl) {
  if (vlcProcess) stop();
  const vlcPath = locateVlc();
  vlcProcess = spawn(vlcPath, [
    '-I', 'dummy', 
    '--extraintf', 'http', 
    '--http-password', 'termplayer', 
    '--http-port', '8080', 
    '--no-video', 
    pathOrUrl
  ]);
  
  // Wait a short moment for VLC HTTP server to spin up before setting volume
  setTimeout(() => {
    setVolume(currentVolume);
    startPolling();
  }, 500);
}

function pause() {
  vlcRequest('pl_pause').catch(() => {});
}

function resume() {
  vlcRequest('pl_pause').catch(() => {}); // pl_pause toggles play/pause
}

function stop() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
  if (vlcProcess) {
    try {
      vlcProcess.kill('SIGKILL');
    } catch(e) {}
    vlcProcess = null;
  }
}

function setVolume(pct) {
  currentVolume = Math.max(0, Math.min(100, pct));
  const vlcVol = Math.floor((currentVolume / 100) * 320);
  vlcRequest('volume', vlcVol).catch(() => {});
}

function getVolume() {
  return currentVolume;
}

function onStatus(cb) {
  statusCallback = cb;
}

module.exports = { play, pause, resume, stop, setVolume, getVolume, onStatus };
