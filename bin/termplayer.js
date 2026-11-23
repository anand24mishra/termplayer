#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

program
  .name('termplayer')
  .version(require('../package.json').version)
  .option('-d, --songs-dir <path>', 'folder with your music (default: ./songs, or $SONGS_DIR)')
  .option('--clear-cache', 'delete .cache/ before starting', false)
  .option('--theme <name>', 'UI theme: auto, dawn, day, golden, dusk, night (default: auto, or $TERMPLAYER_THEME)')
  .option('--no-anim', 'disable ambient animation (static frames, lower CPU)')
  .option('--doctor', 'check VLC, songs folder, API key and network, then exit', false)
  .option('--no-online', 'disable online search even if JAMENDO_CLIENT_ID is set')
  .parse(process.argv);

const opts = program.opts();

if (opts.doctor) {
  const loadConfig = require('../src/config');
  require('../src/doctor').runDoctor(loadConfig(opts)).then((code) => process.exit(code));
} else {
  require('../src/index.js')(opts);
}
