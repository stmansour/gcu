/**
 * Robot Lab — Chapter 4: Shoulder Drive System
 *
 * SWIRL-E learns which gear ratio and power setting match different arm jobs.
 * The player is given a random task that implies a weight target and desired
 * movement pace, then chooses gears + voltage to teach SWIRL-E's memory.
 * Multiple combinations work — engineering is about tradeoffs.
 */

export const CHAPTER_4 = {
  id: 'ch4-motors',
  chapterNumber: 4,
  title: "SWIRL-E's Shoulder Drive",

  briefing: {
    swirle:  "My shoulder motor can use different gears, but I don't know which setup is best for each kind of job yet.",
    grandpa: "Let's teach SWIRL-E's memory. For each job, pick a gear ratio that avoids bad motor strain, then choose enough power without wasting the battery.",
  },

  speech: {
    taskRevealed: "Let's see which job I need to learn next...",
    taskHint:     "Pick the gear and power I should remember for this kind of job.",
    gearOnly:     "Good gear pick! Now choose a voltage to power the motor.",
    voltOnly:     "Power's set — now pick a gear cartridge.",
    bothReady:    "All set! Let's test this memory on the bench.",
    safeLoad:     "That load is within my arm rating. Now choose gears and power that fit the job.",
    unsafeLoad:   "Stop! My motor might move it, but my shoulder assembly is not rated for that much torque.",
    unsafeCorrect:"Good safety call. Some jobs are too heavy for my arm no matter which gears we choose.",
    stall:        "I can hear the motor groaning... not enough strength to even budge it.",
    tooHot:       "I lifted it, but the motor is screaming hot! That setup will burn out fast.",
    mismatch:     "It moves, but that setup doesn't really match the job. Let's tune the gear or power.",
    success:      "Smooth lift! I'll remember that setup for jobs like this.",
    tryAgain:     "Let's try different parts — there's more than one way to make this work.",
    done:         "Memory saved! I'm learning which setup fits each job.",
  },

  journalHints: [
    "A gear ratio compares the teeth on the motor gear to the teeth on the arm gear.",
    "Big arm gear + small motor gear = slower arm, but stronger.",
    "Big motor gear + small arm gear = faster arm, but weaker.",
    "A gearbox can keep several ratios installed and shift between them for different jobs.",
    "Higher voltage gives the motor more push — but uses up the battery quicker.",
    "Gears can help the motor, but they do not make SWIRL-E's arm stronger.",
    "The shoulder assembly has its own torque rating. If the load torque is too high, the safe answer is no lift.",
    "If the load is heavier than the motor can lift, it stalls.",
    "If the motor barely manages, it gets HOT and won't last.",
    "The best design has lift to spare AND runs cool.",
    "A good memory entry has enough lift, low strain, and only as much power as the job needs.",
    "— Grandpa",
  ],
};
