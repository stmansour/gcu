/**
 * AudioManager — Web Audio API, iOS unlock on first user gesture. Singleton.
 */

let instance = null;

export class AudioManager {
  static getInstance() {
    if (!instance) instance = new AudioManager();
    return instance;
  }

  constructor() {
    this.audioContext = null;
    this.sounds = new Map();
    this.unlocked = false;
    this.muted = false;
  }

  /**
   * Call from a user gesture handler (e.g. first tap on "Enter"). Required on iOS.
   */
  unlock() {
    if (this.unlocked) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.audioContext = new Ctx();
      const buffer = this.audioContext.createBuffer(1, 1, 22050);
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start(0);
      this.unlocked = true;
    } catch (e) {
      console.warn('[AudioManager] unlock failed', e);
    }
  }

  /**
   * @param {string} name - Key to play later
   * @param {string} url - Path to .mp3
   * @param {string} [category='sfx']
   */
  async load(name, url, category = 'sfx') {
    if (!this.audioContext) return;
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const decoded = await this.audioContext.decodeAudioData(buf);
      this.sounds.set(name, { buffer: decoded, category });
    } catch (e) {
      console.warn('[AudioManager] load failed', name, url, e);
    }
  }

  /**
   * @param {string} name
   * @param {{ volume?: number }} [opts]
   */
  play(name, opts = {}) {
    if (this.muted || !this.unlocked) return;
    const entry = this.sounds.get(name);
    if (!entry?.buffer) return;
    try {
      const source = this.audioContext.createBufferSource();
      source.buffer = entry.buffer;
      const gain = this.audioContext.createGain();
      gain.gain.value = opts.volume ?? 1;
      source.connect(gain);
      gain.connect(this.audioContext.destination);
      source.start(0);
    } catch (e) {
      console.warn('[AudioManager] play failed', name, e);
    }
  }

  setMuted(muted) {
    this.muted = !!muted;
  }

  isMuted() {
    return this.muted;
  }
}
