const { text } = require('../engine/draw');
const { strWidth } = require('../engine/width');

const HINTS = [
  ['↑↓', 'browse'], ['⏎', 'play'], ['␣', 'pause'], ['/', 'search'], ['b', 'radio'], ['n', 'random'], ['1-4', 'cues'], ['l', 'loop'],
  ['f', 'filter'], ['v', 'viz'], ['a', 'auto'], ['t', 'theme'], ['?', 'help'], ['^C', 'quit'],
];

function drawFooter(scr, r, ctx) {
  const { theme, state } = ctx;
  const hints = state.status === 'RADIO' ? [['type', 'to filter'], ['↑↓', 'select'], ['←→', 'genre'], ['⏎', 'tune in'], ['⇥', 'random'], ['esc', 'close']] : state.status === 'SEARCHING' ? [['type', 'to search'], ['↑↓', 'select'], ['⏎', 'play'], ['esc', 'cancel']] : HINTS;
  let x = r.x + 1;
  for (const [key, label] of hints) {
    const need = strWidth(key) + 1 + strWidth(label) + 2;
    if (x + need > r.x + r.w) break;
    x = text(scr, x, r.y, key, { fg: theme.accents[0], bold: true });
    x = text(scr, x + 1, r.y, label, { fg: theme.dim });
    x += 2;
  }
}

module.exports = { drawFooter };
