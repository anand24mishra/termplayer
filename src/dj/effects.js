/**
 * EffectsController - Audio filter effects including low-pass filter sweeps
 * using VLC's 10-band equalizer HTTP interface.
 * 
 * VLC Equalizer 10 Bands:
 * Band 0: 60 Hz   | Band 1: 170 Hz  | Band 2: 310 Hz  | Band 3: 600 Hz | Band 4: 1 kHz
 * Band 5: 3 kHz   | Band 6: 6 kHz   | Band 7: 12 kHz  | Band 8: 14 kHz | Band 9: 16 kHz
 */

const FILTER_MODES = [
  {
    id: 'off',
    label: 'OFF',
    enabled: false,
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'mild',
    label: 'LPF Mild (-12dB highs)',
    enabled: true,
    bands: [0, 0, 0, 0, 0, -4, -8, -14, -18, -20]
  },
  {
    id: 'deep',
    label: 'LPF Deep (Muffled / Bass)',
    enabled: true,
    bands: [2, 2, 0, -6, -14, -20, -20, -20, -20, -20]
  },
  {
    id: 'sub',
    label: 'LPF Sub (Only Sub-Bass)',
    enabled: true,
    bands: [3, 2, -10, -20, -20, -20, -20, -20, -20, -20]
  }
];

class EffectsController {
  constructor() {
    this.currentModeIndex = 0;
    this.isSweeping = false;
  }

  getCurrentMode() {
    return FILTER_MODES[this.currentModeIndex];
  }

  setFilter(modeId, mixer) {
    const idx = FILTER_MODES.findIndex(m => m.id === modeId);
    if (idx !== -1) {
      this.currentModeIndex = idx;
      const mode = FILTER_MODES[idx];
      if (mixer && typeof mixer.applyEqualizer === 'function') {
        mixer.applyEqualizer(mode.enabled, mode.bands);
      }
      return mode;
    }
    return this.getCurrentMode();
  }

  cycleFilter(mixer) {
    this.currentModeIndex = (this.currentModeIndex + 1) % FILTER_MODES.length;
    const mode = FILTER_MODES[this.currentModeIndex];
    if (mixer && typeof mixer.applyEqualizer === 'function') {
      mixer.applyEqualizer(mode.enabled, mode.bands);
    }
    return mode;
  }

  reset(mixer) {
    this.currentModeIndex = 0;
    const mode = FILTER_MODES[0];
    if (mixer && typeof mixer.applyEqualizer === 'function') {
      mixer.applyEqualizer(false, mode.bands);
    }
    return mode;
  }

  async sweepFilter(mixer, onStep) {
    if (this.isSweeping) return;
    this.isSweeping = true;

    const steps = [
      FILTER_MODES[1], // mild
      FILTER_MODES[2], // deep
      FILTER_MODES[3], // sub
      FILTER_MODES[2], // deep
      FILTER_MODES[1], // mild
      FILTER_MODES[0]  // off
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (mixer && typeof mixer.applyEqualizer === 'function') {
        await mixer.applyEqualizer(step.enabled, step.bands);
      }
      if (typeof onStep === 'function') {
        onStep(step);
      }
      await new Promise(r => setTimeout(r, 350));
    }

    this.currentModeIndex = 0;
    this.isSweeping = false;
  }
}

const defaultEffectsController = new EffectsController();

module.exports = {
  FILTER_MODES,
  EffectsController,
  defaultEffectsController
};
