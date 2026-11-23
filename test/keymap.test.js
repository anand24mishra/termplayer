const test = require('node:test');
const assert = require('node:assert');
const { Store } = require('../src/state/store');
const { handleKeypress } = require('../src/ui/keymap');
const { stop } = require('../src/playback/vlcController');

test('Keymap and store state transitions', async (t) => {
  const store = new Store();
  const config = { jamendoClientId: null };

  store.state.tracks = [{ title: 'Track 1' }, { title: 'Track 2' }, { title: 'Track 3' }];

  await t.test('Arrow navigation up and down', () => {
    assert.strictEqual(store.getState().selectedIndex, 0);

    handleKeypress('', { name: 'down' }, store, config);
    assert.strictEqual(store.getState().selectedIndex, 1);

    handleKeypress('', { name: 'down' }, store, config);
    assert.strictEqual(store.getState().selectedIndex, 2);

    handleKeypress('', { name: 'down' }, store, config);
    assert.strictEqual(store.getState().selectedIndex, 2); // clamped

    handleKeypress('', { name: 'up' }, store, config);
    assert.strictEqual(store.getState().selectedIndex, 1);
  });

  await t.test('Play, pause and resume states', () => {
    handleKeypress('', { name: 'enter' }, store, config);
    assert.strictEqual(store.getState().status, 'LOADING');

    // Simulate playback started
    store.dispatch({ type: 'PLAYBACK_STARTED' });
    assert.strictEqual(store.getState().status, 'PLAYING');

    handleKeypress('', { name: 'space' }, store, config);
    assert.strictEqual(store.getState().status, 'PAUSED');

    handleKeypress('', { name: 'space' }, store, config);
    assert.strictEqual(store.getState().status, 'PLAYING');

    handleKeypress('s', {}, store, config);
    assert.strictEqual(store.getState().status, 'IDLE');

    // Pause while still LOADING
    handleKeypress('', { name: 'enter' }, store, config);
    assert.strictEqual(store.getState().status, 'LOADING');
    handleKeypress('', { name: 'space' }, store, config);
    assert.strictEqual(store.getState().status, 'PAUSED');
  });

  await t.test('Search mode navigation and escape', () => {
    const onlineConfig = { jamendoClientId: 'test-client' };
    handleKeypress('/', { name: '/' }, store, onlineConfig);
    assert.strictEqual(store.getState().status, 'SEARCHING');

    store.dispatch({
      type: 'SEARCH_SUCCESS',
      payload: [{ title: 'Online 1' }, { title: 'Online 2' }]
    });
    assert.strictEqual(store.getState().selectedIndex, 0);

    handleKeypress('', { name: 'down' }, store, onlineConfig);
    assert.strictEqual(store.getState().selectedIndex, 1);

    handleKeypress('', { name: 'up' }, store, onlineConfig);
    assert.strictEqual(store.getState().selectedIndex, 0);

    handleKeypress('', { name: 'escape' }, store, onlineConfig);
    assert.notStrictEqual(store.getState().status, 'SEARCHING');
  });

  stop();
});

test('--no-online disables the / search even when a key is configured', () => {
  const store = new Store();
  handleKeypress('/', { name: '/' }, store, { jamendoClientId: 'abc', onlineEnabled: false });
  assert.notStrictEqual(store.getState().status, 'SEARCHING');
  assert.match(store.getState().flashMessage, /disabled/);
  handleKeypress('/', { name: '/' }, store, { jamendoClientId: 'abc', onlineEnabled: true });
  assert.strictEqual(store.getState().status, 'SEARCHING');
});
