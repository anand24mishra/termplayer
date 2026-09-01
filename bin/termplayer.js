#!/usr/bin/env node
const { Command } = require('commander');
const program = new Command();

program
  .name('termplayer')
  .version(require('../package.json').version)
  .option('-d, --songs-dir <path>', 'directory of local audio files', './songs')
  .option('--clear-cache', 'delete .cache/ before starting', false)
  .option('--no-online', 'disable online search even if JAMENDO_CLIENT_ID is set')
  .parse(process.argv);

require('../src/index.js')(program.opts());
