// Facade over the TUI engine. keymap.js and index.js call render(state); everything else is in ./app.js.
const { createApp } = require('./app');

let app = null;
let plain = false;
let lastPlain = '';

function startUI(store, { animate = true } = {}) {
  if (app) return app;
  if (!process.stdout.isTTY) {
    plain = true; // piped / CI: one status line per change instead of a full-screen UI
    return null;
  }
  app = createApp({ store, animate });
  app.start();
  return app;
}

function stopUI() {
  if (app) { app.stop(); app = null; }
  plain = false;
}

function render(state) {
  if (app) { app.request(); return; }
  if (plain && state) {
    const t = state.currentTrack;
    const line = `[${state.status}] ${t ? (t.title || t.filename || '') : ''}${state.flashMessage ? ` — ${state.flashMessage}` : ''}`;
    if (line !== lastPlain) { lastPlain = line; console.log(line); }
  }
}

module.exports = { render, startUI, stopUI };
