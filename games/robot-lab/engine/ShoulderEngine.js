/**
 * ShoulderEngine.js — Chapter 4 physics model
 *
 * Arm job → gear cartridge → voltage → outcome.
 * Multiple passing solutions exist for each arm job (key design intent).
 */

/** Three arm personality choices the player picks in Step 1. */
export const ARM_JOBS = {
  fast: {
    id:       'fast',
    label:    'Fast Arm',
    targetKg: 7,
    targetLb: 15,
    speedGoal:'Fast',
    tagline:  'Quick movements with lighter loads',
    examples: ['Light backpack', 'Water bottles', 'Small box of toys'],
    icon:     '⚡',
  },
  balanced: {
    id:       'balanced',
    label:    'Balanced Arm',
    targetKg: 10,
    targetLb: 22,
    speedGoal:'Normal',
    tagline:  'Everyday lifting — strength and speed together',
    examples: ['Loaded school backpack', 'Stack of books', 'Grocery bag'],
    icon:     '⚖️',
  },
  strong: {
    id:       'strong',
    label:    'Strong Arm',
    targetKg: 15,
    targetLb: 33,
    speedGoal:'Slow',
    tagline:  'Heavy lifting — strength over speed',
    examples: ['Bag of rice', 'Heavy toolbox', 'Packed suitcase'],
    icon:     '💪',
  },
};

/** Three gear cartridges the player installs in Step 2. */
export const GEAR_CARTRIDGES = {
  '1to1': {
    id:          '1to1',
    label:       '1:1  Fast Gear',
    ratio:       1,
    motorTeeth:  24,
    armTeeth:    24,
    tagline:     'Same speed — motor and arm turn together',
    strength:    'Lowest',
    speed:       'Highest',
    bestFor:     'Light loads and fast movement',
    image:       'cartridge-1to1.png',
  },
  '3to1': {
    id:          '3to1',
    label:       '3:1  Balanced Gear',
    ratio:       3,
    motorTeeth:  12,
    armTeeth:    36,
    tagline:     'Motor turns 3× for every 1 arm turn',
    strength:    'Medium',
    speed:       'Medium',
    bestFor:     'Normal loads and everyday use',
    image:       'cartridge-3to1.png',
  },
  '6to1': {
    id:          '6to1',
    label:       '6:1  Strong Gear',
    ratio:       6,
    motorTeeth:  8,
    armTeeth:    48,
    tagline:     'Motor turns 6× for every 1 arm turn',
    strength:    'Highest',
    speed:       'Lowest',
    bestFor:     'Heavy loads and low stress',
    image:       'cartridge-6to1.png',
  },
};

/** Three voltage settings the player chooses in Step 2. */
export const VOLTAGE_SETTINGS = {
  '3v': { id: '3v', label: '3V', tagline: 'Slower · Longest runtime',   powerFactor: 0.55 },
  '6v': { id: '6v', label: '6V', tagline: 'Normal · Balanced runtime',  powerFactor: 1.00 },
  '9v': { id: '9v', label: '9V', tagline: 'Faster · Shorter runtime',   powerFactor: 1.55 },
};

/**
 * Lift capacity table: maximum kg the arm can lift.
 * [gear][voltage] — intentionally designed so multiple paths pass each arm job.
 *
 * Fast arm (7 kg target):  1:1+6V(9kg)✓  1:1+9V(13kg)✓  3:1+3V(11kg)✓ (slower)
 * Balanced arm (10 kg):    3:1+6V(16kg)✓  3:1+9V(22kg)✓  6:1+3V(18kg)✓ (very slow)
 * Strong arm (15 kg):      6:1+6V(28kg)✓  6:1+9V(40kg)✓  3:1+9V(22kg)✓ (fast for strong)
 */
const LIFT_TABLE = {
  '1to1': { '3v':  5, '6v':  9, '9v': 13 },
  '3to1': { '3v': 11, '6v': 16, '9v': 22 },
  '6to1': { '3v': 18, '6v': 28, '9v': 40 },
};

/** Arm speed words. */
const SPEED_TABLE = {
  '1to1': { '3v': 'Slow',      '6v': 'Normal',    '9v': 'Fast'      },
  '3to1': { '3v': 'Very Slow', '6v': 'Slow',      '9v': 'Normal'    },
  '6to1': { '3v': 'Very Slow', '6v': 'Very Slow', '9v': 'Slow'      },
};

/** Estimated battery runtime in minutes. */
const RUNTIME_TABLE = {
  '1to1': { '3v': 55, '6v': 32, '9v': 18 },
  '3to1': { '3v': 45, '6v': 26, '9v': 14 },
  '6to1': { '3v': 38, '6v': 22, '9v': 12 },
};

/** Motor heat words. Stress amplifies heat. */
const HEAT_TABLE = {
  '1to1': { '3v': 'Cool', '6v': 'Warm', '9v': 'Hot'  },
  '3to1': { '3v': 'Cool', '6v': 'Cool', '9v': 'Warm' },
  '6to1': { '3v': 'Cool', '6v': 'Cool', '9v': 'Cool' },
};

/**
 * Compute all monitor values for the current selection.
 * @param {string} gearId   - '1to1' | '3to1' | '6to1'
 * @param {string} voltId   - '3v' | '6v' | '9v'
 * @param {string} jobId    - 'fast' | 'balanced' | 'strong'
 * @returns {object}
 */
export function evaluate(gearId, voltId, jobId) {
  const job      = ARM_JOBS[jobId];
  const liftKg   = LIFT_TABLE[gearId][voltId];
  const targetKg = job.targetKg;
  const stress   = targetKg / liftKg;
  const speed    = SPEED_TABLE[gearId][voltId];
  const runtime  = RUNTIME_TABLE[gearId][voltId];
  const baseHeat = HEAT_TABLE[gearId][voltId];

  let stressColor;
  if (stress >= 1.0)       stressColor = 'stall';
  else if (stress > 0.85)  stressColor = 'red';
  else if (stress > 0.55)  stressColor = 'yellow';
  else                     stressColor = 'green';

  // Heat escalates when gear is working hard
  let heat = baseHeat;
  if (stressColor === 'red' && heat === 'Cool')  heat = 'Warm';
  if (stressColor === 'red' && heat === 'Warm')  heat = 'Hot';

  // Runtime shrinks when over-stressed
  const runtimeAdjusted = stressColor === 'red'
    ? Math.round(runtime * 0.6)
    : stressColor === 'yellow'
      ? Math.round(runtime * 0.85)
      : runtime;

  // Speed feedback vs the arm job goal
  const goalSpeed = job.speedGoal;
  const speedWords = ['Very Slow', 'Slow', 'Normal', 'Fast', 'Very Fast'];
  const speedIdx  = speedWords.indexOf(speed);
  const goalIdx   = speedWords.indexOf(goalSpeed);
  const speedDelta = speedIdx - goalIdx; // positive = faster than goal, negative = slower

  // Outcome
  let outcome;
  if (stressColor === 'stall')  outcome = 'stall';
  else if (heat === 'Hot')      outcome = 'too-hot';
  else                          outcome = 'success';

  return {
    liftKg,
    targetKg,
    stress,
    stressColor,
    speed,
    speedDelta,
    runtime: runtimeAdjusted,
    heat,
    outcome,
  };
}
