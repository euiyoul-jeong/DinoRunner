// Tiny synthesized sound effects (no audio files). The AudioContext can only
// start after a user gesture, so unlock() is called from the first tap.

const MUTE_KEY = 'dinoRunner.muted';

const Sound = {
  ctx: null,
  muted: false,

  init() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch (e) {
      this.muted = false;
    }
  },

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  },

  toggleMute() {
    this.muted = !this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch (e) {
      // Storage can be unavailable; muting still works for this session.
    }
  },

  // One short tone that slides from `from` Hz to `to` Hz.
  tone(type, from, to, duration, volume, delay = 0) {
    const ctx = this.ctx;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + duration);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration);
  },

  play(name) {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'jump':
        this.tone('square', 420, 720, 0.12, 0.08);
        break;
      case 'eat':
        this.tone('square', 300, 160, 0.07, 0.12);
        this.tone('square', 520, 880, 0.1, 0.1, 0.07);
        break;
      case 'hit':
        this.tone('sawtooth', 220, 60, 0.3, 0.16);
        break;
      case 'gameover':
        this.tone('triangle', 440, 330, 0.18, 0.15);
        this.tone('triangle', 330, 220, 0.18, 0.15, 0.18);
        this.tone('triangle', 220, 110, 0.35, 0.15, 0.36);
        break;
      case 'splash':
        this.tone('sine', 600, 120, 0.35, 0.18);
        this.tone('triangle', 1200, 300, 0.25, 0.06, 0.05);
        break;
      case 'warn':
        this.tone('square', 880, 880, 0.06, 0.05);
        break;
    }
  },
};
