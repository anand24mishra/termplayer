const { spawn } = require('child_process');
const fs = require('fs');

const bpmCache = new Map();

/**
 * Pure JS energy-flux autocorrelation BPM detector from 16-bit PCM buffer.
 */
function detectBpmFromPcm(buffer, sampleRate = 22050) {
  if (!buffer || buffer.length < 4000) return null;

  const samples = new Float32Array(Math.floor(buffer.length / 2));
  for (let i = 0; i < samples.length; i++) {
    samples[i] = buffer.readInt16LE(i * 2) / 32768.0;
  }

  const frameSize = 1024;
  const hopSize = 512;
  const numFrames = Math.floor((samples.length - frameSize) / hopSize);
  if (numFrames < 10) return null;

  const energies = new Float32Array(numFrames);
  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    const offset = f * hopSize;
    for (let j = 0; j < frameSize; j++) {
      const s = samples[offset + j];
      sum += s * s;
    }
    energies[f] = Math.sqrt(sum / frameSize);
  }

  const flux = new Float32Array(numFrames - 1);
  for (let i = 0; i < numFrames - 1; i++) {
    const diff = energies[i + 1] - energies[i];
    flux[i] = diff > 0 ? diff : 0;
  }

  const framesPerSec = sampleRate / hopSize;
  const minLag = Math.floor((60 / 200) * framesPerSec); // max 200 BPM
  const maxLag = Math.floor((60 / 60) * framesPerSec);  // min 60 BPM

  const corrs = new Float32Array(maxLag + 1);
  let maxCorr = 0;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < flux.length - lag; i++) {
      corr += flux[i] * flux[i + lag];
    }
    corrs[lag] = corr;
    if (corr > maxCorr) maxCorr = corr;
  }

  if (maxCorr <= 0) return null;

  let chosenLag = 0;
  for (let lag = minLag; lag <= maxLag; lag++) {
    if (corrs[lag] >= maxCorr * 0.75) {
      if (corrs[lag] >= (corrs[lag - 1] || 0) && corrs[lag] >= (corrs[lag + 1] || 0)) {
        chosenLag = lag;
        break;
      }
    }
  }
  if (!chosenLag) chosenLag = minLag;

  let bpm = Math.round((60 * framesPerSec) / chosenLag);
  while (bpm < 75) bpm *= 2;
  while (bpm > 195) bpm = Math.round(bpm / 2);
  return bpm;
}

/**
 * Attempt BPM detection via Python (aubio or librosa) if installed.
 */
function detectViaPython(filePath) {
  return new Promise((resolve) => {
    const pyScript = `
import sys
try:
    import aubio
    win_s = 512
    hop_s = win_s // 2
    s = aubio.source(sys.argv[1], 0, hop_s)
    samplerate = s.samplerate
    o = aubio.tempo("default", win_s, hop_s, samplerate)
    beats = []
    total_frames = 0
    while True:
        samples, read = s()
        is_beat = o(samples)
        if is_beat:
            beats.append(o.get_last_s())
        total_frames += read
        if read < hop_s or total_frames > samplerate * 20:
            break
    if len(beats) > 1:
        bpms = 60.0 / (beats[-1] - beats[0]) * (len(beats) - 1)
        print(int(round(bpms)))
        sys.exit(0)
except Exception:
    pass

try:
    import librosa
    y, sr = librosa.load(sys.argv[1], duration=15)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    val = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
    print(int(round(val)))
    sys.exit(0)
except Exception:
    pass

sys.exit(1)
`;
    const py = spawn('python3', ['-c', pyScript, filePath], { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    py.stdout.on('data', d => out += d);
    py.on('close', code => {
      if (code === 0) {
        const val = parseInt(out.trim(), 10);
        if (!isNaN(val) && val > 0) return resolve(val);
      }
      resolve(null);
    });
    py.on('error', () => resolve(null));
  });
}

/**
 * Decode audio snippet using FFmpeg to raw PCM and detect BPM.
 */
function detectViaFfmpeg(filePathOrUrl) {
  return new Promise((resolve) => {
    const ffmpeg = spawn('ffmpeg', [
      '-ss', '10',
      '-t', '15',
      '-i', filePathOrUrl,
      '-ac', '1',
      '-ar', '22050',
      '-f', 's16le',
      '-'
    ], { stdio: ['ignore', 'pipe', 'ignore'] });

    const chunks = [];
    ffmpeg.stdout.on('data', c => chunks.push(c));
    ffmpeg.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        const buffer = Buffer.concat(chunks);
        const bpm = detectBpmFromPcm(buffer, 22050);
        return resolve(bpm);
      }
      resolve(null);
    });
    ffmpeg.on('error', () => resolve(null));
  });
}

/**
 * Main BPM detection function.
 * Degrades gracefully if no tool/tag is available.
 */
async function detectBpm(track) {
  if (!track) return null;

  const trackId = track.id || track.filePath || track.streamUrl;
  if (trackId && bpmCache.has(trackId)) {
    return bpmCache.get(trackId);
  }

  // 1. Direct property from ID3 / catalog
  if (track.bpm && !isNaN(track.bpm) && track.bpm > 0) {
    bpmCache.set(trackId, track.bpm);
    return track.bpm;
  }

  const audioTarget = track.filePath || track.streamUrl;
  if (!audioTarget) return null;

  // 2. Try Python aubio/librosa if local file exists
  if (track.filePath && fs.existsSync(track.filePath)) {
    try {
      const pyBpm = await detectViaPython(track.filePath);
      if (pyBpm) {
        bpmCache.set(trackId, pyBpm);
        return pyBpm;
      }
    } catch (e) {}
  }

  // 3. Try FFmpeg + PCM autocorrelation
  try {
    const ffmpegBpm = await detectViaFfmpeg(audioTarget);
    if (ffmpegBpm) {
      bpmCache.set(trackId, ffmpegBpm);
      return ffmpegBpm;
    }
  } catch (e) {}

  return null;
}

module.exports = {
  detectBpm,
  detectBpmFromPcm,
  bpmCache
};
