/**
 * BalanceEngine.js — Chapter 5 wrist balance physics
 *
 * Tray roll/pitch with optional tilt sensor, wrist servo (PD), and shock damper.
 * Component gating matches the build-and-wire workbench spec.
 */

export const SENSOR_DELAY_S = 0.10;

/** @typedef {'left'|'right'|'forward'|'back'} PushDir */

export const PUSH_DIRS = {
  left:    { roll:  1, pitch:  0, label: 'Push Left' },
  right:   { roll: -1, pitch:  0, label: 'Push Right' },
  forward: { roll:  0, pitch:  1, label: 'Push Forward' },
  back:    { roll:  0, pitch: -1, label: 'Push Back' },
};

export const SERVO_LEVELS = {
  gentle:    { id: 'gentle',    kp: 3.0, label: 'Gentle' },
  strong:    { id: 'strong',    kp: 6.0, label: 'Strong' },
  tooStrong: { id: 'tooStrong', kp: 10,  label: 'Too Strong' },
};

const PHYS = {
  dt:           1 / 120,
  gravity:      4.8,
  naturalDamp:  0.28,
  kdShock:      2.4,
  kdNone:       0.08,
  motorMax:     14,
  delaySteps:   Math.max(1, Math.round(SENSOR_DELAY_S / (1 / 120))),
  sloshFreq:    5.0,
  sloshZeta:    0.14,
  rim:          0.38,
  spillRate:    1.4,
  tipAngle:     0.52,
  tipForce:     1.35,
  walkDuration: 10,
};

/** Simple walk path bumps for Mode B. */
export const WALK_BUMPS = [
  { t: 2.0, roll: 0.35, pitch: 0 },
  { t: 4.5, roll: -0.28, pitch: 0.12 },
  { t: 7.0, roll: 0.22, pitch: -0.18 },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * @param {number} len
 */
function emptyBuf(len) {
  return Array.from({ length: len }, () => 0);
}

export class BalanceSim {
  constructor() {
    this.reset();
  }

  reset() {
    this.hasSensor = false;
    this.hasServo = false;
    this.hasShock = false;
    this.wired = false;
    this.servoLevel = 'gentle';
    this.forceDial = 0.45;
    this.mode = 'bench';

    this.roll = 0;
    this.pitch = 0;
    this.rollVel = 0;
    this.pitchVel = 0;
    this.water = 1;
    this.glassTipped = false;
    this.time = 0;
    this.walkT = 0;
    this._bumpIdx = 0;
    this._shockCompress = 0;

    this.lastBump = 0;
    this.lastTilt = 0;
    this.lastPushback = 0;
    this.sensedRoll = 0;
    this.sensedPitch = 0;

    this._delayRoll = emptyBuf(PHYS.delaySteps);
    this._delayPitch = emptyBuf(PHYS.delaySteps);
    this._delayIdx = 0;
    this.slosh = 0;
    this.sloshVel = 0;

    this.history = {
      bump: emptyBuf(120),
      tilt: emptyBuf(120),
      push: emptyBuf(120),
    };
    this._histIdx = 0;
  }

  /** @param {PushDir} dir */
  applyPush(dir) {
    if (this.glassTipped) return;
    const d = PUSH_DIRS[dir];
    if (!d) return;
    const mag = 0.18 + this.forceDial * 0.85;
    this.rollVel += d.roll * mag;
    this.pitchVel += d.pitch * mag;
    this.roll += d.roll * mag * 0.08;
    this.pitch += d.pitch * mag * 0.08;
    this.sloshVel += (d.roll + d.pitch) * mag * 1.8;
    this.lastBump = mag;
  }

  resetGlass() {
    this.water = 1;
    this.glassTipped = false;
    this.roll = 0;
    this.pitch = 0;
    this.rollVel = 0;
    this.pitchVel = 0;
    this.slosh = 0;
    this.sloshVel = 0;
    this._shockCompress = 0;
  }

  /** Stop motion, refill glass, and clear monitor history. */
  resetTray() {
    this.stopWalk();
    this.resetGlass();
    this._delayRoll.fill(0);
    this._delayPitch.fill(0);
    this._delayIdx = 0;
    this.sensedRoll = 0;
    this.sensedPitch = 0;
    this.lastBump = 0;
    this.lastTilt = 0;
    this.lastPushback = 0;
    this.history.bump.fill(0);
    this.history.tilt.fill(0);
    this.history.push.fill(0);
    this._histIdx = 0;
  }

  startWalk() {
    this.mode = 'walk';
    this.walkT = 0;
    this._bumpIdx = 0;
    this.resetGlass();
  }

  stopWalk() {
    this.mode = 'bench';
    this.walkT = 0;
    this._bumpIdx = 0;
  }

  step(seconds) {
    let remaining = seconds;
    while (remaining > 1e-9) {
      const dt = Math.min(PHYS.dt, remaining);
      this._substep(dt);
      remaining -= dt;
    }
    this._pushHistory();
  }

  _substep(dt) {
    this.time += dt;

    if (this.mode === 'walk') {
      this.walkT += dt;
      while (this._bumpIdx < WALK_BUMPS.length && WALK_BUMPS[this._bumpIdx].t <= this.walkT) {
        const b = WALK_BUMPS[this._bumpIdx];
        this.rollVel += b.roll * 0.55;
        this.pitchVel += b.pitch * 0.55;
        this._bumpIdx++;
      }
      const pace = 0.12 * Math.sin(this.walkT * 2.2);
      this.pitchVel += pace * dt * 2.5;
    }

    const kp = SERVO_LEVELS[this.servoLevel]?.kp ?? 3;
    const kd = this.hasShock ? PHYS.kdShock : PHYS.kdNone;

    this._delayRoll[this._delayIdx] = this.roll;
    this._delayPitch[this._delayIdx] = this.pitch;
    this._delayIdx = (this._delayIdx + 1) % PHYS.delaySteps;
    const sensedR = this._delayRoll[this._delayIdx];
    const sensedP = this._delayPitch[this._delayIdx];
    this.sensedRoll = sensedR;
    this.sensedPitch = sensedP;

    let cmdR = 0;
    let cmdP = 0;
    if (this.hasServo && this.wired && this.hasSensor) {
      cmdR = clamp(-kp * sensedR - kd * this.rollVel, -PHYS.motorMax, PHYS.motorMax);
      cmdP = clamp(-kp * sensedP - kd * this.pitchVel, -PHYS.motorMax, PHYS.motorMax);
    }

    this.lastPushback = Math.sqrt(cmdR * cmdR + cmdP * cmdP);

    // Restoring torque pulls the tray back toward level (stable), not runaway spin.
    const tipR = -PHYS.gravity * this.roll + cmdR * 0.09;
    const tipP = -PHYS.gravity * this.pitch + cmdP * 0.09;
    this.rollVel += tipR * dt;
    this.pitchVel += tipP * dt;
    this.rollVel *= 1 - PHYS.naturalDamp * dt;
    this.pitchVel *= 1 - PHYS.naturalDamp * dt;
    this.rollVel = clamp(this.rollVel, -3.5, 3.5);
    this.pitchVel = clamp(this.pitchVel, -3.5, 3.5);
    this.roll += this.rollVel * dt;
    this.pitch += this.pitchVel * dt;

    if (this.hasShock) {
      const speed = Math.abs(this.rollVel) + Math.abs(this.pitchVel);
      this._shockCompress = clamp(speed * 2.2, 0, 1);
    } else {
      this._shockCompress *= Math.pow(0.02, dt);
    }

    const ws = PHYS.sloshFreq;
    const drive = (this.roll + this.pitch) * 4.5;
    const sloshAcc = -ws * ws * this.slosh - 2 * PHYS.sloshZeta * ws * this.sloshVel - drive * ws * 0.3;
    this.sloshVel += sloshAcc * dt;
    this.slosh += this.sloshVel * dt;

    const tiltMag = Math.sqrt(this.roll * this.roll + this.pitch * this.pitch);
    this.lastTilt = this.hasSensor ? tiltMag : 0;
    this.lastBump = Math.max(0, this.lastBump * Math.pow(0.04, dt));

    if (!this.glassTipped && this.water > 0) {
      let spill = 0;
      const over = Math.abs(this.slosh) - PHYS.rim;
      if (over > 0) spill += over * PHYS.spillRate;
      if (tiltMag > 0.16) spill += (tiltMag - 0.16) * 1.1;
      if (spill > 0) this.water = Math.max(0, this.water - spill * dt);
      if (tiltMag >= PHYS.tipAngle || this.water <= 0.02) {
        this.glassTipped = true;
        this.water = 0;
      }
    }
  }

  _pushHistory() {
    const i = this._histIdx % 120;
    this.history.bump[i] = this.lastBump;
    this.history.tilt[i] = this.lastTilt;
    this.history.push[i] = this.lastPushback;
    this._histIdx++;
  }

  /** @returns {boolean} tray recovered after disturbance */
  isStable() {
    const tilt = Math.sqrt(this.roll * this.roll + this.pitch * this.pitch);
    return !this.glassTipped && this.water > 0.65 && tilt < 0.12
      && Math.abs(this.rollVel) < 0.35 && Math.abs(this.pitchVel) < 0.35;
  }

  /** Detect ring-out wobble for guided milestone. */
  isWobbling() {
    return Math.abs(this.rollVel) > 0.45 || Math.abs(this.pitchVel) > 0.45;
  }

  walkComplete() {
    return this.mode === 'walk' && this.walkT >= PHYS.walkDuration && !this.glassTipped && this.water > 0.65;
  }
}
