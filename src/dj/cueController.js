function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

class CueController {
  constructor() {
    this.cues = { 1: null, 2: null, 3: null, 4: null };
    this.loopActive = false;
    this.loopStart = null;
    this.loopEnd = null;
  }

  reset() {
    this.cues = { 1: null, 2: null, 3: null, 4: null };
    this.loopActive = false;
    this.loopStart = null;
    this.loopEnd = null;
  }

  getCues() {
    return { ...this.cues };
  }

  setCue(num, time) {
    if (num >= 1 && num <= 4) {
      this.cues[num] = Math.max(0, Math.floor(time || 0));
      return { num, time: this.cues[num], formatted: formatTime(this.cues[num]) };
    }
    return null;
  }

  clearCue(num) {
    if (num >= 1 && num <= 4) {
      this.cues[num] = null;
    }
  }

  handleCueKey(num, currentTime, mixer, forceOverwrite = false) {
    if (num < 1 || num > 4) return null;

    if (this.cues[num] === null || forceOverwrite) {
      const cueTime = Math.max(0, Math.floor(currentTime || 0));
      this.cues[num] = cueTime;
      return {
        action: 'SET',
        num,
        time: cueTime,
        formatted: formatTime(cueTime)
      };
    } else {
      const targetTime = this.cues[num];
      if (mixer) {
        mixer.seek(targetTime);
      }
      return {
        action: 'JUMP',
        num,
        time: targetTime,
        formatted: formatTime(targetTime)
      };
    }
  }

  toggleLoop(currentTime) {
    if (this.loopActive) {
      this.loopActive = false;
      this.loopStart = null;
      this.loopEnd = null;
      return { active: false };
    }

    if (this.cues[1] !== null && this.cues[2] !== null && this.cues[1] < this.cues[2]) {
      this.loopStart = this.cues[1];
      this.loopEnd = this.cues[2];
    } else if (this.cues[1] !== null) {
      this.loopStart = this.cues[1];
      this.loopEnd = Math.max(this.cues[1] + 4, Math.floor(currentTime || 0) + 1);
    } else {
      const cur = Math.max(0, Math.floor(currentTime || 0));
      this.loopStart = cur;
      this.loopEnd = cur + 4;
    }

    this.loopActive = true;
    return {
      active: true,
      start: this.loopStart,
      end: this.loopEnd,
      startFormatted: formatTime(this.loopStart),
      endFormatted: formatTime(this.loopEnd)
    };
  }

  checkLoop(currentTime, mixer) {
    if (!this.loopActive || this.loopStart === null || this.loopEnd === null) return;
    if (currentTime >= this.loopEnd) {
      if (mixer) {
        mixer.seek(this.loopStart);
      }
    }
  }
}

const defaultCueController = new CueController();

module.exports = {
  CueController,
  defaultCueController,
  formatTime
};
