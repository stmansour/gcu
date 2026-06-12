/**
 * Robot Lab — Chapter 5: Control Systems
 *
 * SWIRL-E delivers lemonade across three routes where PACE matters as much
 * as Push-Back Strength and Swing Calmer. Same knobs — different jobs.
 */

export const CHAPTER_5 = {
  id: 'ch5-control',
  chapterNumber: 5,
  title: "SWIRL-E's Steady Servo",

  briefing: {
    swirle:  "Grandma's lemonade run has three routes — and each one wants a different kind of steady. My balance controller needs tuning for the job!",
    grandpa: "Every route has a pace. On a slow wet floor, gentle hands beat hard shoves. On stepping stones, recover before the next bump. Downhill, speed builds — and your settings must still work when the world speeds up.",
  },

  speech: {
    tuneHint:    "Watch the route preview — same bumps as delivery. Slide the knobs and watch the gold and blue arrows change.",
    courseIntro: "Where am I delivering this time? The preview shows the exact route — tune for what you see!",

    tooSleepy:        "With push-back that low, gravity is winning. I can feel the tray leaning already...",
    tooTwitchy:       "Whoa, I'm vibrating! My sensor is a tenth of a second behind — pushing this hard on old news makes the wobble GROW.",
    tooTwitchyKitchen: "I'm fighting every tiny tile seam! On a slow wet floor you need soft hands, not maximum push-back.",
    tooSlowStones:    "I'm still tilting when the next stone hits! Too much swing calmer makes me level out too slowly — the rhythm beats me.",
    tooStrongHill:    "The hill is speeding me up and I'm overcorrecting! Same max settings that worked in the kitchen won't work downhill.",
    noBrake:          "Strong push-back, no swing calmer... I fly past level and have to push back the other way. And again. And again...",
    looksGood:        "Ooh, that feels steady for THIS route! Watch the preview loop — the lemonade stays in the cup.",

    fall:        "Whoa—! I tipped over. My push-back was set to 'napping'.",
    sluggish:    "I noticed I was tilting... eventually. By then the lemonade was already escaping.",
    wobble:      "Wob-wob-WOBBLE! I turned the lemonade into a lawn sprinkler!",
    shake:       "M-M-MY TEETH ARE RATTLING! I corrected the correction of the correction!",
    success:     "Smooth as butter! The right pace, the right push, the right calm. Lemonade delivered!",
    tryAgain:    "Back to the bench! Each route wants its own kind of steady.",
    allDone:     "Three deliveries, three different paces — zero soggy robots!",
  },

  journalHints: [
    "A feedback loop is simple: sense the tilt, push back against it. Sense, push, repeat — hundreds of times every second.",
    "Push-Back Strength sets how hard SWIRL-E pushes when the tray tilts. Watch the gold arrow in the preview — that's the push.",
    "Swing Calmer slows the wobble so the tray doesn't overshoot level. Watch the blue arrow — it only fights motion when the tray is swinging.",
    "Pace matters! On Grandma's wet kitchen floor, tiny bumps need gentle corrections — shoving hard on a slow walk makes the lemonade slosh anyway.",
    "On the stepping stones, SWIRL-E must recover BEFORE the next stone. Too much swing calmer and he levels out too slowly — the rhythm beats him.",
    "Downhill, speed builds. Settings that felt fine on flat ground can turn into shaking when the world speeds up underneath you.",
    "SWIRL-E's tilt sensor is a tenth of a second behind. Push too hard on old news and every correction adds to the wobble.",
    "There is no single perfect setting for every job. Engineers retune when conditions change — you just did.",
    "— Grandpa",
  ],
};
