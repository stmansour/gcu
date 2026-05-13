/**
 * ShoulderEngine.js — Chapter 4 physics model
 *
 * Arm job → gear cartridge → voltage → outcome.
 * Multiple passing solutions exist for each arm job (key design intent).
 */

/** Arm job specs implied by the current task. */
export const ARM_JOBS = {
  ultralight: {
    id:       'ultralight',
    label:    'Quick Grab',
    targetKg: 1,
    targetLb: 2,
    speedGoal:'Very Fast',
    tagline:  'Tiny objects that should be picked up quickly',
    examples: ['Pen', 'Pencil', 'Magazine'],
    icon:     '✏️',
  },
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
  overload: {
    id:       'overload',
    label:    'Too Heavy',
    targetKg: 25,
    targetLb: 55,
    speedGoal:'Slow',
    tagline:  'Loads that exceed SWIRL-E\'s arm rating',
    examples: ['Concrete bag', 'Generator', 'Full water barrel'],
    icon:     '⚠️',
  },
};

/** Gear cartridges the player installs in Step 2. */
export const GEAR_CARTRIDGES = {
  '1to3': {
    id:          '1to3',
    label:       '1:3  Quick Gear',
    displayRatio:'1:3',
    ratio:       1 / 3,
    motorTeeth:  36,
    armTeeth:    12,
    tagline:     'Arm turns 3× for every 1 motor turn',
    strength:    'Very low',
    speed:       'Very high',
    bestFor:     'Pens, pencils, magazines, and tiny objects',
    image:       null,
  },
  '1to1': {
    id:          '1to1',
    label:       '1:1  Fast Gear',
    displayRatio:'1:1',
    ratio:       1,
    motorTeeth:  24,
    armTeeth:    24,
    tagline:     'Same speed — motor and arm turn together',
    strength:    'Lowest',
    speed:       'Highest',
    bestFor:     'Light loads and fast movement',
    image:       'cartridge-1to1-transparent.png',
  },
  '3to1': {
    id:          '3to1',
    label:       '3:1  Balanced Gear',
    displayRatio:'3:1',
    ratio:       3,
    motorTeeth:  12,
    armTeeth:    36,
    tagline:     'Motor turns 3× for every 1 arm turn',
    strength:    'Medium',
    speed:       'Medium',
    bestFor:     'Normal loads and everyday use',
    image:       'cartridge-3to1-transparent.png',
  },
  '6to1': {
    id:          '6to1',
    label:       '6:1  Strong Gear',
    displayRatio:'6:1',
    ratio:       6,
    motorTeeth:  8,
    armTeeth:    48,
    tagline:     'Motor turns 6× for every 1 arm turn',
    strength:    'Highest',
    speed:       'Lowest',
    bestFor:     'Heavy loads and low stress',
    image:       'cartridge-6to1-transparent.png',
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
  '1to3': { '3v':  2, '6v':  3, '9v':  5 },
  '1to1': { '3v':  5, '6v':  9, '9v': 13 },
  '3to1': { '3v': 11, '6v': 16, '9v': 22 },
  '6to1': { '3v': 18, '6v': 28, '9v': 40 },
};

/** Arm speed words. */
const SPEED_TABLE = {
  '1to3': { '3v': 'Fast',      '6v': 'Very Fast', '9v': 'Very Fast' },
  '1to1': { '3v': 'Slow',      '6v': 'Normal',    '9v': 'Fast'      },
  '3to1': { '3v': 'Very Slow', '6v': 'Slow',      '9v': 'Normal'    },
  '6to1': { '3v': 'Very Slow', '6v': 'Very Slow', '9v': 'Slow'      },
};

/** Estimated battery runtime in minutes. */
const RUNTIME_TABLE = {
  '1to3': { '3v': 135, '6v': 105, '9v': 70 },
  '1to1': { '3v': 120, '6v': 90, '9v': 55 },
  '3to1': { '3v': 105, '6v': 75, '9v': 45 },
  '6to1': { '3v': 90,  '6v': 60, '9v': 38 },
};

export const ARM_TORQUE_SPEC = {
  armLengthM: 0.11,
  maxNm: 22,
  maxFtLb: 16.2,
};

ARM_TORQUE_SPEC.maxSafeKg = ARM_TORQUE_SPEC.maxNm / (9.80665 * ARM_TORQUE_SPEC.armLengthM);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function motorHeat(stress, voltId) {
  if (stress >= 1.0) return 'Hot';

  // Heat is mostly load current: a hard-working motor draws more current and
  // wastes more energy as heat. Voltage still matters, but it should not make a
  // lightly-loaded motor fail by itself.
  const voltageHeat = { '3v': 0.00, '6v': 0.15, '9v': 0.32 };
  const heatScore = stress * 0.78 + (voltageHeat[voltId] ?? 0);

  if (stress > 0.85 || heatScore >= 0.98) return 'Hot';
  if (heatScore >= 0.62) return 'Warm';
  return 'Cool';
}

function loadColor(load) {
  if (load >= 1.0) return 'stall';
  if (load > 0.85) return 'red';
  if (load > 0.55) return 'yellow';
  return 'green';
}

function loadTorqueKgToNm(kg) {
  return kg * 9.80665 * ARM_TORQUE_SPEC.armLengthM;
}

function loadTorqueColor(torqueRatio) {
  if (torqueRatio >= 1.0) return 'red';
  if (torqueRatio > 0.72) return 'yellow';
  return 'green';
}

/**
 * Compute all monitor values for the current selection.
 * @param {string} gearId   - gear cartridge id
 * @param {string} voltId   - '3v' | '6v' | '9v'
 * @param {string} jobId    - arm job spec id
 * @returns {object}
 */
export function evaluate(gearId, voltId, jobId) {
  const job      = ARM_JOBS[jobId];
  const liftKg   = LIFT_TABLE[gearId][voltId];
  const targetKg = job.targetKg;
  const stress   = targetKg / liftKg;
  const loadTorqueNm = loadTorqueKgToNm(targetKg);
  const loadTorqueFtLb = loadTorqueNm * 0.737562149;
  const torqueRatio = loadTorqueNm / ARM_TORQUE_SPEC.maxNm;
  const speed    = SPEED_TABLE[gearId][voltId];
  const runtime  = RUNTIME_TABLE[gearId][voltId];
  const gear      = GEAR_CARTRIDGES[gearId];
  const volt      = VOLTAGE_SETTINGS[voltId];

  const stressColor = loadColor(stress);
  const torqueColor = loadTorqueColor(torqueRatio);
  const heat = motorHeat(stress, voltId);

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
  const loadDrag = clamp(1 - stress * 0.32, 0.55, 0.92);
  const outputSpeed = volt.powerFactor / gear.ratio * loadDrag;
  const armSpeedFactor = clamp(outputSpeed / 1.25, 0.06, 1.0);

  // Outcome: for SWIRL-E's memory, "success" means the setup is a good match,
  // not merely that it can lift the object once.
  let outcome;
  if (torqueColor === 'red') outcome = 'unsafe-load';
  else if (stressColor === 'stall')  outcome = 'stall';
  else if (heat === 'Hot')      outcome = 'too-hot';
  else if (Math.abs(speedDelta) > 1) outcome = 'mismatch';
  else                          outcome = 'success';

  return {
    gearId,
    liftKg,
    targetKg,
    stress,
    stressColor,
    loadTorqueNm,
    loadTorqueFtLb,
    torqueRatio,
    torqueColor,
    speed,
    speedDelta,
    armSpeedFactor,
    runtime: runtimeAdjusted,
    heat,
    outcome,
  };
}

/* ── Task pool ────────────────────────────────────────────────────────────
 *
 * On each playthrough we pick a random task from this list — the player does
 * NOT pick the job. Each task implies an arm spec (jobId), but the framing
 * is "Grandpa needs SWIRL-E to do X" rather than "pick an arm personality."
 * Different tasks lead to different correct designs, so children can't memorise
 * one answer.
 */
export const TASKS = [
  // ── Quick grab jobs (very light, very fast) ──────────────────────────
  {
    id: 'grab-pencil', jobId: 'ultralight', icon: '✏️',
    label: 'Grab a pencil',
    story: "Grandpa dropped a pencil under the workbench. SWIRL-E should grab it quickly without using a heavy-lift setup.",
    moveHint: 'Tiny & very quick',
  },
  {
    id: 'fetch-magazine', jobId: 'ultralight', icon: '📰',
    label: 'Fetch a magazine',
    story: "Grandpa wants his magazine from the table. It's light, so SWIRL-E can use a quick gentle grab.",
    moveHint: 'Light & very quick',
  },
  // ── Fast jobs (light, quick) ─────────────────────────────────────────
  {
    id: 'water-tomatoes', jobId: 'fast', icon: '🍅',
    label: 'Water the tomato plants',
    story: "Grandpa's tomatoes are wilting in the sun! SWIRL-E should bring the water bottles — fast!",
    moveHint: 'Quick & light',
  },
  {
    id: 'pack-picnic', jobId: 'fast', icon: '🧺',
    label: 'Bring the picnic basket',
    story: "Time for a picnic at the park. SWIRL-E can carry the basket while everyone gets ready.",
    moveHint: 'Quick & light',
  },
  {
    id: 'toy-cleanup', jobId: 'fast', icon: '🧸',
    label: "Help tidy up Alanna's toys",
    story: "Alanna left her toy box across the room. Time for a quick cleanup before dinner!",
    moveHint: 'Quick & light',
  },
  // ── Balanced jobs (normal, everyday) ─────────────────────────────────
  {
    id: 'school-bag', jobId: 'balanced', icon: '🎒',
    label: "Carry JR's school backpack",
    story: "JR's backpack is loaded with books for school. Steady walk — no dropping it.",
    moveHint: 'Steady, normal pace',
  },
  {
    id: 'groceries', jobId: 'balanced', icon: '🛒',
    label: 'Bring in the groceries',
    story: "The car is full of groceries. SWIRL-E can help carry them into the kitchen.",
    moveHint: 'Steady, normal pace',
  },
  {
    id: 'restock-books', jobId: 'balanced', icon: '📚',
    label: "Restock Grandpa's library shelf",
    story: "These library books need to go back on Grandpa's shelf — handle them carefully.",
    moveHint: 'Steady, normal pace',
  },
  // ── Strong jobs (heavy, slow & careful) ──────────────────────────────
  {
    id: 'rice-bag', jobId: 'strong', icon: '🍚',
    label: 'Carry rice to the kitchen',
    story: "Grandma needs the heavy bag of rice in the kitchen. Slow and careful — it's heavy!",
    moveHint: 'Slow & careful',
  },
  {
    id: 'toolbox', jobId: 'strong', icon: '🧰',
    label: "Bring Grandpa's heavy toolbox",
    story: "Grandpa is fixing the deck and needs his big toolbox. Don't drop it on his foot!",
    moveHint: 'Slow & careful',
  },
  {
    id: 'dog-food', jobId: 'strong', icon: '🦴',
    label: 'Refill the dog food bin',
    story: "The big bag of dog food has to go in the storage bin. Heavy work — take it slow.",
    moveHint: 'Slow & careful',
  },
  // ── Unsafe loads (motor may move them, arm rating says no) ─────────────
  {
    id: 'concrete-bag', jobId: 'overload', icon: '🏗️',
    label: 'Move a concrete bag',
    story: "Grandpa points to a concrete bag by the shed. It looks like a job for a stronger machine than SWIRL-E.",
    moveHint: 'Too heavy for the arm',
  },
  {
    id: 'water-barrel', jobId: 'overload', icon: '🛢️',
    label: 'Lift a full water barrel',
    story: "The full barrel needs moving, but SWIRL-E's shoulder assembly has a safety rating for a reason.",
    moveHint: 'Check the arm rating',
  },
];

/** Pick a random task, preferring scenarios SWIRL-E has not memorized yet. */
export function randomTask(excludeId = null, solvedTaskIds = []) {
  const solved = new Set(Array.isArray(solvedTaskIds) ? solvedTaskIds : []);
  const available = TASKS.filter(t => t.id !== excludeId);
  const unsolved = available.filter(t => !solved.has(t.id));
  const pool = unsolved.length > 0 ? unsolved : available;
  return pool[Math.floor(Math.random() * pool.length)];
}
