/**
 * ExplosionSFX — Procedural "can pressure burst" sound
 *
 * Synthesises the sound of a pressurised can top blowing off:
 *   1. Sharp crack   — the seal breaking (bandpass noise, 3 ms attack)
 *   2. Pressure hiss — escaping gas, filter sweeping 3500 Hz → 120 Hz
 *   3. Bass thump    — physical impact body (sine 105 Hz → 25 Hz)
 *   4. Metallic ring — the cap flicking off (sine 3200 Hz → 2600 Hz)
 *
 * Uses Web Audio API. Safe to call before iOS audio is unlocked —
 * call unlockAudio() on the first user gesture to warm up the context.
 */

let _ctx = null;

function _getCtx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

/**
 * Call this on the first user gesture (touch/click) to unlock audio on iOS.
 * Plays a silent 1-sample buffer and resumes the context.
 */
export function unlockAudio() {
  const ctx = _getCtx();
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  ctx.resume?.();
}

/** Play the pressure-burst explosion. */
export function playCanBurst() {
  const ctx = _getCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;

  // ── Shared white-noise buffer (0.9 s) ────────────────────────────────────
  const noiseBuf  = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.9), ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;

  // ── 1. Sharp crack ────────────────────────────────────────────────────────
  const crack = ctx.createBufferSource();
  crack.buffer = noiseBuf;

  const crackBP = ctx.createBiquadFilter();
  crackBP.type = 'bandpass';
  crackBP.frequency.value = 2400;
  crackBP.Q.value         = 1.2;

  const crackGain = ctx.createGain();
  crackGain.gain.setValueAtTime(0,     now);
  crackGain.gain.linearRampToValueAtTime(1.7,   now + 0.003);
  crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

  crack.connect(crackBP);
  crackBP.connect(crackGain);
  crackGain.connect(ctx.destination);
  crack.start(now);
  crack.stop(now + 0.1);

  // ── 2. Pressure whoosh ────────────────────────────────────────────────────
  const whoosh = ctx.createBufferSource();
  whoosh.buffer = noiseBuf;

  // High-pass filter sweeps down from 3500 Hz → 120 Hz as pressure escapes
  const whooshHP = ctx.createBiquadFilter();
  whooshHP.type = 'highpass';
  whooshHP.frequency.setValueAtTime(3500, now + 0.004);
  whooshHP.frequency.exponentialRampToValueAtTime(120, now + 0.50);

  // Low-pass ceiling to remove harshness
  const whooshLP = ctx.createBiquadFilter();
  whooshLP.type = 'lowpass';
  whooshLP.frequency.value = 8000;

  const whooshGain = ctx.createGain();
  whooshGain.gain.setValueAtTime(0,     now);
  whooshGain.gain.linearRampToValueAtTime(0.55,  now + 0.018);
  whooshGain.gain.setValueAtTime(0.55,  now + 0.04);
  whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);

  whoosh.connect(whooshHP);
  whooshHP.connect(whooshLP);
  whooshLP.connect(whooshGain);
  whooshGain.connect(ctx.destination);
  whoosh.start(now + 0.004);
  whoosh.stop(now + 0.68);

  // ── 3. Bass thump ────────────────────────────────────────────────────────
  const thump = ctx.createOscillator();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(105, now);
  thump.frequency.exponentialRampToValueAtTime(25, now + 0.20);

  const thumpGain = ctx.createGain();
  thumpGain.gain.setValueAtTime(0,    now);
  thumpGain.gain.linearRampToValueAtTime(1.05, now + 0.004);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

  thump.connect(thumpGain);
  thumpGain.connect(ctx.destination);
  thump.start(now);
  thump.stop(now + 0.26);

  // ── 4. Metallic ring ──────────────────────────────────────────────────────
  const ring = ctx.createOscillator();
  ring.type = 'sine';
  ring.frequency.setValueAtTime(3200,  now + 0.008);
  ring.frequency.linearRampToValueAtTime(2600, now + 0.36);

  const ringGain = ctx.createGain();
  ringGain.gain.setValueAtTime(0,     now + 0.006);
  ringGain.gain.linearRampToValueAtTime(0.20,  now + 0.015);
  ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.40);

  ring.connect(ringGain);
  ringGain.connect(ctx.destination);
  ring.start(now + 0.008);
  ring.stop(now + 0.44);
}
