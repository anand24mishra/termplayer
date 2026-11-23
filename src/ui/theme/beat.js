// Beat envelope derived from media time and BPM. Pure and deterministic.
function getBeat(time, bpm, playing) {
  if (!playing) return { phase: 0, kick: 0, snare: 0, known: false };
  const known = bpm > 0;
  const period = 60 / (known ? bpm : 120);
  const phase = (((time % period) + period) % period) / period;
  const strength = known ? 1 : 0.5;
  const kick = Math.exp(-phase * 6) * strength;
  const snarePhase = (phase + 0.5) % 1;
  const snare = Math.exp(-snarePhase * 9) * 0.6 * strength;
  return { phase, kick, snare, known };
}

module.exports = { getBeat };
