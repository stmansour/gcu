/**
 * Robot Lab — Chapter 3: Color Sensing
 *
 * SWIRL-E can see shapes clearly but his colors are wrong —
 * the sensor-to-channel routing was scrambled when the eye module
 * exploded in Chapter 1.  The player must:
 *   1. Figure out which sensor captures which color (by reading the
 *      greyscale thumbnails and the color test swatches).
 *   2. Draw wires to route each sensor to the correct output channel.
 *   3. Tune the gain sliders so the white calibration patch looks white.
 */

export const CHAPTER_3 = {
  id:            'ch3-color',
  chapterNumber: 3,
  title:         'SWIRL-E Visual System — Color Sensing',

  problem: [
    "SWIRL-E can see shapes, but his colors are completely wrong.",
    "His three color sensors got their wiring scrambled during the explosion.",
    "Each sensor can only see one color — red, green, or blue.",
    "Figure out which sensor sees which color, then wire them to the right outputs.",
    "Then calibrate the gain so white actually looks white.",
  ],

  journalHint: [
    "Your eye has three types of cone cells — one for red, one for green, one for blue.",
    "A digital camera works the same way. Each sensor sees only one color of light.",
    "The camera doesn't see 'orange' — it sees strong red and medium green, then constructs orange.",
    "White balance means making a neutral object read equal parts R, G and B.",
    "Tip: look at what each sensor does to the color test swatches — that tells you which filter it has.",
    "— Grandpa",
  ],

  successMessage: "Color calibrated! SWIRL-E can now see the world in true color.",

  // ── Dialogue states ────────────────────────────────────────────────────────
  speech: {
    none:              "Everything looks wrong. I have no idea what color anything is.",
    partial:           "Some channels are connected… but I'm still missing colors.",
    mono:              "Wait — why does everything look like an old movie? Where did the colors go?",
    swapped:           "I can see colors, but they're all wrong. Why is your face blue??",
    'routed-unbalanced': "The colors look right… but something is still slightly off. The white patch looks tinted.",
    complete:          "Red is red. Green is green. I can finally see the world in true color!",
  },

  // ── Source images available in the selector ────────────────────────────────
  // Each entry is a key passed to ColorSceneFactory.draw(key, canvas).
  sources: [
    { id: 'avatar',      label: 'Me!',         icon: '🧒' },
    { id: 'fruit',       label: 'Fruit Bowl',  icon: '🍎' },
    { id: 'garden',      label: 'Garden',      icon: '🌸' },
    { id: 'colorcheck',  label: 'Test Chart',  icon: '🎨' },
  ],
};
