/**
 * Robot Lab — Chapter 5: Wrist Balance
 *
 * Install tilt sensor, wrist servo, shock absorber; wire sensor to servo;
 * experiment with force bench; capstone walk test.
 */

export const CHAPTER_5 = {
  id: 'ch5-control',
  chapterNumber: 5,
  title: "SWIRL-E's Steady Servo",

  briefing: {
    swirle:  'I can lift things now — but can I carry a glass of water without spilling? Help me build my wrist balance module!',
    grandpa: 'A tilt sensor tells SWIRL-E when the tray leans. A wrist servo pushes back. A shock absorber stops the wobble. Install each part, connect the wire, and see what breaks when something is missing.',
  },

  speech: {
    start:       'No parts yet — push the tray and watch the wrist monitor. What happens to the water?',
    bareSpill:   'The wrist felt that bump — and the water spilled. SWIRL-E had no way to sense or fix it.',
    addSensor:   'Drop the tilt sensor in its slot. Now SWIRL-E can MEASURE tilt — but measuring is not fixing.',
    sensorSpill: 'See? The tilt monitor woke up — but the tray still spilled. Sensing is not the same as acting.',
    addServo:    'Install the wrist servo. Drag a wire from Sensor OUT to Servo IN.',
    wired:       'Signal flows OUT → IN! The servo sees the tilt and pushes back. Try a bump.',
    wobble:      'Whoa — it wobbles! Strong servo push with no shock makes the tray ring like a bell.',
    addShock:    'Add the shock absorber at the wrist. Same bump — does the wobble settle faster?',
    shockOk:     'That settles nicer! The shock slows the swing so we do not overshoot.',
    walkUnlock:  'Nice work. Try Walk Test — bumps while moving.',
    walkDone:    'Water delivered! You built a real balance loop: sensor, servo, shock.',
    needWire:    'The servo is blind — drag a wire from Sensor OUT to Servo IN.',
    resetTray:   'Tray level again — try another push!',
    tooStrong:   'Too strong! The servo overshoots. Try Gentle, or add the shock.',
  },

  journalHints: [
    'A tilt sensor (like an accelerometer module) reports pitch and roll — which way the tray leans.',
    'By itself, a sensor only measures. It does not move anything.',
    'A wrist servo pushes the hand back toward level — but only if it receives the sensor signal through a wire.',
    'A shock absorber is a damper: it resists fast motion so the tray does not overshoot and wobble.',
    'This is the same spring-and-shock idea as a car suspension — and the same feedback idea as a drone stabilizer.',
    '— Grandpa',
  ],
};
