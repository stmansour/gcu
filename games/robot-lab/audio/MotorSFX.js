/**
 * MotorSFX — small procedural sounds for Chapter 4.
 *
 * Keeps the chapter playable without audio assets while still giving each motor
 * outcome a distinct feel. Safe to call after the first user gesture.
 */

let _ctx = null;

function ctx() {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') _ctx.resume?.();
  return _ctx;
}

export function unlockMotorAudio() {
  const c = ctx();
  const buf = c.createBuffer(1, 1, c.sampleRate);
  const src = c.createBufferSource();
  src.buffer = buf;
  src.connect(c.destination);
  src.start(0);
}

function tone(freq, start, dur, gain = 0.12, type = 'sine') {
  const c = ctx();
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.linearRampToValueAtTime(gain, start + 0.025);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp);
  amp.connect(c.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(start, dur, gain = 0.18, filterFreq = 900) {
  const c = ctx();
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.8;
  const amp = c.createGain();
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(amp);
  amp.connect(c.destination);
  src.start(start);
  src.stop(start + dur);
}

export function playMotorOutcome(outcome) {
  const c = ctx();
  const now = c.currentTime;

  if (outcome === 'stall') {
    tone(82, now, 0.55, 0.18, 'sawtooth');
    tone(72, now + 0.18, 0.32, 0.12, 'sawtooth');
    return;
  }

  if (outcome === 'twitch') {
    tone(120, now, 0.18, 0.14, 'square');
    tone(95, now + 0.22, 0.25, 0.12, 'sawtooth');
    return;
  }

  if (outcome === 'wobble') {
    tone(240, now, 0.18, 0.10, 'triangle');
    tone(320, now + 0.18, 0.18, 0.10, 'triangle');
    tone(190, now + 0.36, 0.28, 0.12, 'triangle');
    return;
  }

  if (outcome === 'crash') {
    tone(520, now, 0.16, 0.16, 'sawtooth');
    tone(760, now + 0.10, 0.10, 0.12, 'square');
    noise(now + 0.22, 0.42, 0.38, 1300);
    tone(140, now + 0.24, 0.32, 0.24, 'sine');
    return;
  }

  if (outcome === 'slam') {
    tone(280, now, 0.28, 0.15, 'sawtooth');
    noise(now + 0.34, 0.16, 0.24, 700);
    tone(100, now + 0.36, 0.22, 0.20, 'sine');
    return;
  }

  if (outcome === 'slow') {
    tone(132, now, 0.70, 0.11, 'triangle');
    tone(156, now + 0.68, 0.55, 0.09, 'triangle');
    return;
  }

  tone(180, now, 0.55, 0.10, 'triangle');
  tone(220, now + 0.50, 0.55, 0.09, 'triangle');
  tone(300, now + 1.02, 0.30, 0.08, 'sine');
}
