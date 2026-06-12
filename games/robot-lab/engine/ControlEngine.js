/**
 * ControlEngine.js — Chapter 5 feedback-control physics
 *
 * SWIRL-E balances a lemonade tray while each delivery route has its own
 * PACE — how fast he moves and how disturbances arrive. The same knob settings
 * behave differently on a slow wet floor vs stepping stones vs a downhill run.
 *
 *   θ'' = G·θ  −  Kp·θ(t−τ)  −  Kd·θ'(t−τ)  −  c·θ'  +  bumps
 *
 * Pace enters through route-specific modifiers (overcorrection on calm
 * sections, recovery windows between stones, accelerating downhill stress).
 */

/** Sensor latency in seconds. Shown to the player — it's part of the lesson. */
export const SENSOR_DELAY_S = 0.10;

/** Slider range for both knobs. */
export const KNOB_MAX = 10;

/** Physics constants (radians, seconds). */
const PHYS = {
  dt:             1 / 120,
  gravityTip:     6.0,
  naturalDamping: 0.35,
  kpScale:        3.2,
  kdScale:        1.50,
  motorMax:       16,
  fallAngle:      0.85,
  sloshFreq:      5.2,
  sloshZeta:      0.16,
  sloshTiltGain:  7.0,
  sloshAccelGain: 0.16,
  rim:            0.40,
  spillRate:      1.3,
  tiltPourAngle:  0.22,
  tiltPourRate:   2.2,
  arriveLevel:    0.18,
  bumpTilt:       0.30,
  overcorrectSpill: 5.5,
  downhillSpill:    2.4,
  stoneGapSpill:    0.28,
  stoneCreepSpill:  0.075,
};

/** Convert knob sliders (0..10) to physical gains. */
export function knobGains(kpSlider, kdSlider) {
  return {
    kp: kpSlider * PHYS.kpScale,
    kd: kdSlider * PHYS.kdScale,
  };
}

/**
 * Forward pace at time t (0 = creeping, 1 = hurrying).
 * Downhill courses ramp up; others hold near `base`.
 *
 * @param {number} t seconds into the run
 * @param {{ duration: number, pace?: object }} course
 */
export function paceAt(t, course) {
  const p = course.pace || { base: 0.5, ramp: 0 };
  const u = Math.min(1, Math.max(0, t / course.duration));
  if (p.ramp > 0) {
    return p.base + p.ramp * Math.pow(u, p.rampExp || 1.35);
  }
  return p.base;
}

/* ── Delivery courses ───────────────────────────────────────────────────── */

export const COURSES = {
  kitchen: {
    id:       'kitchen',
    order:    1,
    icon:     '🧽',
    label:    "Grandma's Mopped Kitchen",
    paceLabel: 'Slow walk — gentle hands',
    story:    "Grandma just mopped. WALK — WET FLOOR. Tiny tile seams everywhere, then one real doorstep. Soft corrections only!",
    distanceLabel: 'Kitchen → dining room',
    duration: 9,
    pace: { base: 0.26, ramp: 0, lesson: 'slow-gentle' },
    bumps: [
      { t: 1.2, strength: 0.10, dir:  1, name: 'a tile seam'  },
      { t: 2.5, strength: 0.11, dir: -1, name: 'a tile seam'  },
      { t: 4.0, strength: 0.12, dir:  1, name: 'the rug edge' },
      { t: 6.2, strength: 0.48, dir:  1, name: 'the doorstep' },
    ],
    passFraction: 0.70,
  },
  garden: {
    id:       'garden',
    order:    2,
    icon:     '🪨',
    label:    'Stepping Stone Path',
    paceLabel: 'Steady rhythm — don\'t dawdle',
    story:    "Grandpa numbered the garden stones 1-2-3-4. SWIRL-E must hit each stone in rhythm. Creep too slowly and the tray is still tilting when the next stone arrives!",
    distanceLabel: 'Porch → picnic table',
    duration: 10,
    pace: { base: 0.58, ramp: 0, lesson: 'stones', recoveryWindow: 1.55 },
    bumps: [
      { t: 1.8, strength: 0.40, dir: 1, name: 'stone 1' },
      { t: 4.0, strength: 0.44, dir: 1, name: 'stone 2' },
      { t: 6.2, strength: 0.42, dir: 1, name: 'stone 3' },
      { t: 8.4, strength: 0.43, dir: 1, name: 'stone 4' },
    ],
    passFraction: 0.70,
  },
  backyard: {
    id:       'backyard',
    order:    3,
    icon:     '🛝',
    label:    'Downhill to the Treehouse',
    paceLabel: 'Downhill — speed builds!',
    story:    "The treehouse is downhill. SWIRL-E starts slow at the top, but gravity speeds him up. Settings that felt fine on flat ground can turn into a shake by the bottom!",
    distanceLabel: 'Picnic table → treehouse',
    duration: 12,
    pace: { base: 0.22, ramp: 0.80, rampExp: 1.5, lesson: 'downhill' },
    bumps: [
      { t: 2.5, strength: 0.34, dir:  1, name: 'a tree root'    },
      { t: 5.0, strength: 0.38, dir: -1, name: 'a rock'         },
      { t: 7.5, strength: 0.42, dir:  1, name: 'a bumpy turn'   },
      { t: 10.0, strength: 0.36, dir:  1, name: 'the last slope' },
    ],
    passFraction: 0.68,
  },
};

export const COURSE_ORDER = ['kitchen', 'garden', 'backyard'];

/* ── Real-time simulation ──────────────────────────────────────────────── */

export class ControlSim {
  /**
   * @param {number} kpSlider 0..10
   * @param {number} kdSlider 0..10
   * @param {object|null} [course] active delivery route (pace modifiers)
   */
  constructor(kpSlider, kdSlider, course = null) {
    const g = knobGains(kpSlider, kdSlider);
    this.kpSlider = kpSlider;
    this.kdSlider = kdSlider;
    this.kp = g.kp;
    this.kd = g.kd;
    this._course = course;

    this.theta = 0;
    this.omega = 0;
    this.alpha = 0;
    this.slosh = 0;
    this.sloshVel = 0;
    this.lemonade = 1;
    this.fallen = false;
    this.time = 0;

    this._delaySteps = Math.max(1, Math.round(SENSOR_DELAY_S / PHYS.dt));
    this._buf = new Array(this._delaySteps).fill(null).map(() => ({ theta: 0, omega: 0 }));
    this._bufIdx = 0;
    this._spilling = 0;

    /** Telemetry for rendering — updated every substep. */
    this.sensedTheta = 0;
    this.sensedOmega = 0;
    this.lastPush = 0;    // proportional torque (opposes tilt)
    this.lastCalm = 0;    // damping torque (opposes swing speed)
    this.lastControl = 0; // total motor output after saturation
  }

  /** Attach or swap the active delivery route (pace rules). */
  setCourse(course) {
    this._course = course;
  }

  bump(strength) {
    if (this.fallen) return;

    const course = this._course;
    if (course?.pace?.lesson === 'stones') {
      const stillTilted = Math.abs(this.theta) > 0.11;
      const heavyBrake = this.kdSlider >= 7;
      if (stillTilted && heavyBrake) {
        const gap = Math.max(0, (this.kdSlider - 6) / 4);
        this.sloshVel += gap * PHYS.stoneGapSpill * 4 * Math.sign(this.theta || 1);
        this.lemonade = Math.max(0, this.lemonade - gap * PHYS.stoneGapSpill * 2);
      }
    }

    this.omega += strength;
    this.theta += strength * PHYS.bumpTilt;
    this.sloshVel += strength * 2.5;
  }

  step(seconds) {
    let remaining = seconds;
    while (remaining > 1e-9) {
      const dt = Math.min(PHYS.dt, remaining);
      this._substep(dt);
      remaining -= dt;
    }
  }

  _substep(dt) {
    this.time += dt;
    const course = this._course;
    const pace = course ? paceAt(this.time, course) : 0.5;

    if (!this.fallen) {
      const sensed = this._buf[this._bufIdx];

      const wanted = -this.kp * sensed.theta - this.kd * sensed.omega;
      const control = Math.max(-PHYS.motorMax, Math.min(PHYS.motorMax, wanted));
      this.sensedTheta = sensed.theta;
      this.sensedOmega = sensed.omega;
      this.lastPush = -this.kp * sensed.theta;
      this.lastCalm = -this.kd * sensed.omega;
      this.lastControl = control;
      this.alpha = PHYS.gravityTip * this.theta
                 + control
                 - PHYS.naturalDamping * this.omega;

      this.omega += this.alpha * dt;
      this.theta += this.omega * dt;

      this._buf[this._bufIdx] = { theta: this.theta, omega: this.omega };
      this._bufIdx = (this._bufIdx + 1) % this._delaySteps;

      if (Math.abs(this.theta) >= PHYS.fallAngle) {
        this.fallen = true;
        this.lemonade = 0;
        this.theta = Math.sign(this.theta) * PHYS.fallAngle;
        this.omega = 0;
      }
    }

    const ws = PHYS.sloshFreq;
    const drive = PHYS.sloshTiltGain * this.theta + PHYS.sloshAccelGain * this.alpha;
    const sloshAcc = -ws * ws * this.slosh
                   - 2 * PHYS.sloshZeta * ws * this.sloshVel
                   - drive * ws;
    this.sloshVel += sloshAcc * dt;
    this.slosh += this.sloshVel * dt;

    if (!this.fallen && this.lemonade > 0) {
      let rate = 0;
      const over = Math.abs(this.slosh) - PHYS.rim;
      if (over > 0) rate += over * PHYS.spillRate;
      const tiltOver = Math.abs(this.theta) - PHYS.tiltPourAngle;
      if (tiltOver > 0) rate += tiltOver * PHYS.tiltPourRate;

      if (course?.pace?.lesson === 'slow-gentle' && this.kpSlider >= 6) {
        const calm = Math.max(0, 1 - pace / 0.38);
        const excess = (this.kpSlider - 5) / (KNOB_MAX - 5);
        const micro = Math.abs(this._buf[this._bufIdx]?.theta ?? this.theta);
        if (calm > 0.20 && micro > 0.025) {
          rate += calm * excess * (micro + 0.04) * PHYS.overcorrectSpill;
        }
      }

      if (course?.pace?.lesson === 'stones' && this.kdSlider >= 6) {
        const creep = Math.max(0, (this.kdSlider - 5) / 5);
        if (Math.abs(this.theta) > 0.06) {
          rate += creep * Math.abs(this.theta) * PHYS.stoneCreepSpill * 4;
        }
        if (this.kpSlider >= 8 && this.kdSlider >= 8) {
          rate += creep * 0.06;
        }
      }

      if (course?.pace?.lesson === 'downhill' && pace > 0.50) {
        const speedStress = (pace - 0.45) * (this.kpSlider / KNOB_MAX);
        const underDamped = this.kdSlider <= 5 ? 1.35 : Math.max(0.35, 1 - (this.kdSlider - 5) * 0.12);
        if (speedStress * underDamped > 0.42) {
          rate += (speedStress * underDamped - 0.38) * Math.abs(this.slosh) * PHYS.downhillSpill;
        }
        if (this.kpSlider >= 8 && this.kdSlider >= 8 && pace > 0.58) {
          rate += (pace - 0.5) * (this.kpSlider - 7) * (this.kdSlider - 7) * 0.022;
        }
        if (this.kpSlider >= 9 && pace > 0.62) {
          rate += (pace - 0.55) * (this.kpSlider - 8) * 0.10 * Math.abs(this.omega);
        }
      }

      if (rate > 0) {
        this.lemonade = Math.max(0, this.lemonade - rate * dt * this._fillFactor());
        this._spilling = rate;
      } else {
        this._spilling = 0;
      }
    } else {
      this._spilling = 0;
    }
  }

  _fillFactor() {
    return 0.35 + 0.65 * this.lemonade;
  }

  get spilling() {
    return (this._spilling || 0) > 0;
  }

  get spillIntensity() {
    return this._spilling || 0;
  }
}

/* ── Offline evaluation + classification ───────────────────────────────── */

const SAMPLE_HZ = 30;

export function evaluateRun(kpSlider, kdSlider, courseId) {
  const course = COURSES[courseId];
  const sim = new ControlSim(kpSlider, kdSlider, course);
  const sampleDt = 1 / SAMPLE_HZ;

  const trace = [];
  let bumpIdx = 0;
  let fellAtT = null;
  let maxTilt = 0;
  let crossings = 0;
  let lastSign = 0;
  let crossingsSinceBump = 0;

  const steps = Math.ceil(course.duration / sampleDt);
  for (let i = 0; i <= steps; i++) {
    const t = i * sampleDt;
    while (bumpIdx < course.bumps.length && course.bumps[bumpIdx].t <= t) {
      sim.bump(course.bumps[bumpIdx].strength * (course.bumps[bumpIdx].dir || 1));
      crossingsSinceBump = 0;
      bumpIdx++;
    }
    sim.step(sampleDt);
    trace.push({ t, theta: sim.theta });

    const a = Math.abs(sim.theta);
    if (a > maxTilt) maxTilt = a;

    const sign = sim.theta > 0.02 ? 1 : sim.theta < -0.02 ? -1 : 0;
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) {
      crossings++;
      crossingsSinceBump++;
    }
    if (sign !== 0) lastSign = sign;

    if (sim.fallen && fellAtT === null) fellAtT = t;
    if (sim.fallen) break;
  }

  const oscillations = Math.floor(crossings / 2);
  const lemonadeLeft = sim.lemonade;
  const endTilt = Math.abs(sim.theta);

  let outcome;
  if (fellAtT !== null) {
    const staticallyWeak = sim.kp <= PHYS.gravityTip * 1.15;
    outcome = staticallyWeak && crossingsSinceBump === 0 ? 'fall' : 'shake';
  } else if (lemonadeLeft < course.passFraction || endTilt > PHYS.arriveLevel) {
    outcome = oscillations >= 3 ? 'wobble' : 'sluggish';
  } else {
    outcome = 'success';
  }

  return { outcome, lemonadeLeft, fellAtT, maxTilt, oscillations, endTilt, trace };
}

/**
 * Kid-readable pace match for the status board (needs active course).
 *
 * @param {number} kpSlider
 * @param {number} kdSlider
 * @param {string} courseId
 */
export function paceMatchRating(kpSlider, kdSlider, courseId) {
  const course = COURSES[courseId];
  const lesson = course?.pace?.lesson;

  if (lesson === 'slow-gentle') {
    if (kpSlider >= 9) return { word: 'Too twitchy', color: 'red' };
    if (kpSlider >= 7) return { word: 'A bit harsh', color: 'yellow' };
    if (kpSlider <= 2) return { word: 'Too sleepy', color: 'red' };
    return { word: 'Gentle', color: 'green' };
  }

  if (lesson === 'stones') {
    if (kdSlider >= 8) return { word: 'Too slow', color: 'red' };
    if (kdSlider >= 6 && kpSlider <= 3) return { word: 'Too sluggish', color: 'yellow' };
    if (kpSlider >= 9) return { word: 'Too stompy', color: 'yellow' };
    return { word: 'Rhythm OK', color: 'green' };
  }

  if (lesson === 'downhill') {
    if (kpSlider >= 9 && kdSlider <= 4) return { word: 'Will shake', color: 'red' };
    if (kpSlider >= 8) return { word: 'Too strong', color: 'yellow' };
    if (kdSlider >= 9) return { word: 'Too sluggish', color: 'yellow' };
    return { word: 'Balanced', color: 'green' };
  }

  return { word: 'OK', color: 'green' };
}

export function previewMetrics(kpSlider, kdSlider, courseId = 'kitchen') {
  const sim = new ControlSim(kpSlider, kdSlider, COURSES[courseId]);
  sim.step(0.4);
  sim.bump(0.5);

  const settleBand = 0.045;
  let settleT = null;
  let maxTilt = 0;
  let crossings = 0;
  let lastSign = 0;
  let fell = false;
  let growing = false;
  let firstPeak = 0;
  let latePeak = 0;

  const dt = 1 / 60;
  const total = 6;
  for (let t = 0; t < total; t += dt) {
    sim.step(dt);
    const a = Math.abs(sim.theta);
    if (a > maxTilt) maxTilt = a;
    if (t < 1.2 && a > firstPeak) firstPeak = a;
    if (t > 4.0 && a > latePeak) latePeak = a;

    const sign = sim.theta > 0.02 ? 1 : sim.theta < -0.02 ? -1 : 0;
    if (sign !== 0 && lastSign !== 0 && sign !== lastSign) crossings++;
    if (sign !== 0) lastSign = sign;

    if (a > settleBand) settleT = null;
    else if (settleT === null) settleT = t;

    if (sim.fallen) { fell = true; break; }
  }
  if (latePeak > firstPeak * 0.8 && crossings >= 6) growing = true;

  const oscillations = Math.floor(crossings / 2);
  const paceMatch = paceMatchRating(kpSlider, kdSlider, courseId);

  const reaction = kpSlider <= 1 ? { word: 'Asleep',  color: 'red'    }
    : kpSlider <= 2             ? { word: 'Sleepy',  color: 'red'    }
    : kpSlider <= 4             ? { word: 'Gentle',  color: 'yellow' }
    : kpSlider <= 7             ? { word: 'Strong',  color: 'green'  }
    :                             { word: 'Twitchy', color: 'yellow' };

  const wobble = fell && growing ? { word: 'GROWING!', color: 'red' }
    : fell                       ? { word: 'Tips over', color: 'red' }
    : growing                    ? { word: 'GROWING!',  color: 'red' }
    : oscillations >= 3          ? { word: 'Lots',      color: 'red' }
    : oscillations === 2         ? { word: 'Some',      color: 'yellow' }
    :                              { word: 'Calm',      color: 'green' };

  const recovery = fell || settleT === null
    ? { word: 'Never', color: 'red', seconds: null }
    : settleT > 3.0
      ? { word: `${settleT.toFixed(1)} s`, color: 'red', seconds: settleT }
      : settleT > 1.6
        ? { word: `${settleT.toFixed(1)} s`, color: 'yellow', seconds: settleT }
        : { word: `${settleT.toFixed(1)} s`, color: 'green', seconds: settleT };

  const bad = (wobble.color === 'red' ? 2 : wobble.color === 'yellow' ? 1 : 0)
            + (recovery.color === 'red' ? 2 : recovery.color === 'yellow' ? 1 : 0)
            + (paceMatch.color === 'red' ? 2 : paceMatch.color === 'yellow' ? 1 : 0)
            + (maxTilt > 0.42 ? 1 : 0);
  const spillRisk = fell ? { word: 'Certain', color: 'red' }
    : bad >= 3 ? { word: 'High',   color: 'red'    }
    : bad >= 1 ? { word: 'Medium', color: 'yellow' }
    :            { word: 'Low',    color: 'green'  };

  return { reaction, wobble, recovery, spillRisk, paceMatch, maxTilt, oscillations, fell, growing };
}
