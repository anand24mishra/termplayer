const { hex, mix, gradient } = require('../engine/color');

// Keyframes by minute-of-day. Colors blend smoothly between neighbours (wrapping at midnight).
// nightness drives the starfield, glow drives the aurora/ambient tint strength.
const KEYFRAMES = [
  { name: 'night',  label: 'Night',       icon: '☾', min: 120,  bg: '#070b1a', panel: '#0e1530', accents: ['#00e5ff', '#7c4dff', '#ff2e93'], text: '#e6ecff', dim: '#5f6b95', nightness: 1.0, glow: 0.5 },
  { name: 'dawn',   label: 'Dawn',        icon: '◒', min: 330,  bg: '#2a1f3d', panel: '#3a2a4d', accents: ['#ff9a8b', '#ffcc70', '#c471ed'], text: '#fff1e6', dim: '#a58fb3', nightness: 0.35, glow: 1.0 },
  { name: 'day',    label: 'Day',         icon: '☀', min: 540,  bg: '#12304a', panel: '#1b4560', accents: ['#4facfe', '#00f2fe', '#a8edea'], text: '#f0fbff', dim: '#7fa6bd', nightness: 0.0, glow: 0.7 },
  { name: 'golden', label: 'Golden Hour', icon: '◐', min: 990,  bg: '#3a2418', panel: '#4d3020', accents: ['#f6d365', '#fda085', '#ff6a88'], text: '#fff6e0', dim: '#b39577', nightness: 0.1, glow: 0.9 },
  { name: 'dusk',   label: 'Dusk',        icon: '◑', min: 1170, bg: '#241540', panel: '#321d54', accents: ['#ff758c', '#ff7eb3', '#9d50bb'], text: '#fde8ff', dim: '#9a7fb8', nightness: 0.6, glow: 1.0 },
  { name: 'night',  label: 'Night',       icon: '☾', min: 1320, bg: '#070b1a', panel: '#0e1530', accents: ['#00e5ff', '#7c4dff', '#ff2e93'], text: '#e6ecff', dim: '#5f6b95', nightness: 1.0, glow: 0.5 },
].map((k) => ({
  ...k,
  bg: hex(k.bg), panel: hex(k.panel), text: hex(k.text), dim: hex(k.dim),
  accents: k.accents.map(hex),
}));

const PHASES = ['dawn', 'day', 'golden', 'dusk', 'night'];

function minuteOfDay(d) {
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function blend(a, b, t) {
  return {
    bg: mix(a.bg, b.bg, t),
    panel: mix(a.panel, b.panel, t),
    text: mix(a.text, b.text, t),
    dim: mix(a.dim, b.dim, t),
    accents: a.accents.map((c, i) => mix(c, b.accents[i], t)),
    nightness: a.nightness + (b.nightness - a.nightness) * t,
    glow: a.glow + (b.glow - a.glow) * t,
  };
}

function sample(min) {
  const list = KEYFRAMES;
  // Build a wrapped list so that any minute falls between two keyframes.
  const wrapped = [
    { ...list[list.length - 1], min: list[list.length - 1].min - 1440 },
    ...list,
    { ...list[0], min: list[0].min + 1440 },
  ];
  for (let i = 0; i < wrapped.length - 1; i++) {
    const a = wrapped[i];
    const b = wrapped[i + 1];
    if (min >= a.min && min < b.min) {
      const t = (min - a.min) / (b.min - a.min);
      const near = t < 0.5 ? a : b;
      return { ...blend(a, b, t), name: near.name, label: near.label, icon: near.icon };
    }
  }
  return { ...blend(list[0], list[0], 0), name: list[0].name, label: list[0].label, icon: list[0].icon };
}

// `now` is injectable for tests. override: 'auto' or one of PHASES.
function getTheme(now = new Date(), override = 'auto') {
  let theme;
  const fixed = PHASES.includes(override) ? KEYFRAMES.find((k) => k.name === override) : null;
  if (fixed) {
    theme = { ...blend(fixed, fixed, 0), name: fixed.name, label: fixed.label, icon: fixed.icon };
  } else {
    theme = sample(((minuteOfDay(now) % 1440) + 1440) % 1440);
  }
  theme.gradient = (t) => gradient(theme.accents, t);
  theme.override = fixed ? fixed.name : 'auto';
  return theme;
}

function nextTheme(current) {
  const order = ['auto', ...PHASES];
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

module.exports = { getTheme, nextTheme, PHASES, KEYFRAMES };
