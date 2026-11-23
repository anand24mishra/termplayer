const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { locateVlc } = require('./playback/vlcLocator');
const { HOSTS } = require('./library/radioProvider');

const AUDIO = /\.(mp3|wav|flac|ogg|m4a)$/i;

// `termplayer --doctor`: quick pre-flight check so a demo never fails on a missing dependency.
async function runDoctor(config) {
  const rows = [];
  const add = (ok, label, detail = '', optional = false) => rows.push({ ok, label, detail, optional });

  const major = Number(process.versions.node.split('.')[0]);
  add(major >= 18, 'Node.js', `v${process.versions.node} (need 18+)`);

  const vlc = locateVlc();
  const vlcOk = path.isAbsolute(vlc) ? fs.existsSync(vlc) : spawnSync(vlc, ['--version'], { stdio: 'ignore' }).status === 0;
  add(vlcOk, 'VLC (audio engine)', vlcOk ? vlc : 'not found - install VLC, e.g. brew install vlc');

  const ff = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  add(ff.status === 0, 'ffmpeg (BPM detection)', ff.status === 0 ? 'found' : 'not found - songs still play, only BPM is skipped', true);

  const songsDir = path.resolve(config.songsDir);
  const files = fs.existsSync(songsDir) ? fs.readdirSync(songsDir).filter((f) => AUDIO.test(f)) : [];
  add(files.length > 0, 'Local songs', `${files.length} file(s) in ${songsDir}`, true);

  add(Boolean(config.jamendoClientId), 'Jamendo key (/ online search)', config.jamendoClientId ? 'set' : 'not set - add JAMENDO_CLIENT_ID to .env', true);

  let net = false;
  try {
    const res = await fetch(`${HOSTS[0]}/json/stats`, { signal: AbortSignal.timeout(6000) });
    net = res.ok;
  } catch (e) {}
  add(net, 'Internet + Radio Browser (b radio)', net ? 'reachable' : 'unreachable - radio needs internet (cached list still opens)', true);

  const tty = Boolean(process.stdout.isTTY);
  add(tty && (process.stdout.columns || 0) >= 100, 'Terminal size', `${process.stdout.columns || '?'}x${process.stdout.rows || '?'} (100x30 or bigger looks best)`, true);

  console.log('\nTermPlayer doctor\n');
  for (const r of rows) {
    const icon = r.ok ? '\x1b[32m✔\x1b[0m' : r.optional ? '\x1b[33m!\x1b[0m' : '\x1b[31m✖\x1b[0m';
    console.log(` ${icon} ${r.label.padEnd(34)} ${r.detail}`);
  }
  const failed = rows.filter((r) => !r.ok && !r.optional).length;
  console.log(failed ? '\nFix the ✖ items above, then run: npm start\n' : '\nAll required checks passed. Run: termplayer  (or npm start from the source folder)\n');
  return failed ? 1 : 0;
}

module.exports = { runDoctor };
