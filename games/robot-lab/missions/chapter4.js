/**
 * Robot Lab — Chapter 4: Shoulder Drive System
 *
 * The player designs SWIRL-E's arm by choosing an arm job (strength/speed goal)
 * then picking a gear cartridge and voltage to meet it.
 * Multiple solutions pass — engineering is about tradeoffs, not one right answer.
 */

export const CHAPTER_4 = {
  id: 'ch4-motors',
  chapterNumber: 4,
  title: "SWIRL-E's Shoulder Drive",

  briefing: {
    swirle: "My shoulder motor spins, but I need the right gears so my arm can actually do useful work.",
    grandpa: "First choose what kind of arm SWIRL-E needs — then install the gears and power to match!",
  },

  speech: {
    intro:       "My arm is ready to install — but what kind of arm should it be?",
    jobSelected: "Good choice! Now let's find gears and power that can do that job.",
    gearOnly:    "Nice gear! Now pick a voltage to power it.",
    voltOnly:    "Now pick a gear cartridge to match that power.",
    bothReady:   "Looking good — want to test it?",
    stall:       "I can feel the motor struggling... not enough torque for this load.",
    tooHot:      "It lifted! But my motor is running hot. Let's try a gentler setup.",
    success:     "Smooth and strong! That's the right setup for this arm.",
    tryAgain:    "Let's try different parts — there's more than one way to make it work.",
    done:        "My shoulder drive is installed! I can feel the difference already.",
  },

  journalHints: [
    "A gear ratio compares how many teeth are on each gear.",
    "A small motor gear (8 teeth) driving a large arm gear (48 teeth) = 6:1 ratio.",
    "The motor turns 6 times for every 1 arm turn — slower, but 6 times stronger.",
    "Higher voltage gives more speed and power — but uses battery faster.",
    "If the motor tries to lift more than it can handle, it stalls.",
    "There is no single right answer — choose based on the job!",
    "— Grandpa",
  ],
};
