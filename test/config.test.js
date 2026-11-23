const test = require('node:test');
const assert = require('node:assert');
const loadConfig = require('../src/config');

test('config precedence: CLI flag > environment variable > default', async (t) => {
  const saved = { ...process.env };
  t.afterEach(() => { process.env = { ...saved }; });

  await t.test('defaults', () => {
    delete process.env.SONGS_DIR; delete process.env.TERMPLAYER_THEME; delete process.env.TERMPLAYER_NO_ANIM;
    const c = loadConfig({});
    assert.strictEqual(c.songsDir, './songs');
    assert.strictEqual(c.theme, 'auto');
    assert.strictEqual(c.animate, true);
  });
  await t.test('environment variables apply when no flag is given', () => {
    process.env.SONGS_DIR = '/music'; process.env.TERMPLAYER_THEME = 'dusk'; process.env.TERMPLAYER_NO_ANIM = '1';
    const c = loadConfig({});
    assert.strictEqual(c.songsDir, '/music');
    assert.strictEqual(c.theme, 'dusk');
    assert.strictEqual(c.animate, false);
  });
  await t.test('flags win over the environment', () => {
    process.env.SONGS_DIR = '/music'; process.env.TERMPLAYER_THEME = 'dusk';
    const c = loadConfig({ songsDir: '/flag', theme: 'night' });
    assert.strictEqual(c.songsDir, '/flag');
    assert.strictEqual(c.theme, 'night');
  });
  await t.test('--no-online and --no-anim', () => {
    const c = loadConfig({ online: false, anim: false });
    assert.strictEqual(c.onlineEnabled, false);
    assert.strictEqual(c.animate, false);
  });
});
