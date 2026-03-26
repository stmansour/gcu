/**
 * Robot Lab — Chapter 2: Optics
 *
 * SVG coordinate space: 1000 × 720
 *
 * Correct solution:
 *   Slot 1: Weak Converging (f=200) → intermediate inverted image at x=600
 *   Slot 2: Strong Converging (f=40) → final image at sensor x=780 ✓
 *
 * Physics verification (thin lens, parallel input):
 *   L1 (f=200) at x=400: dᵢ = 200  → image at x=600 (inverted)
 *   L2 (f=40)  at x=660: dₒ = 60, 1/dᵢ = 1/40 − 1/60 = 1/120, dᵢ=120 → image at x=780 ✓
 *   Double inversion = upright final image ✓
 */

export const CHAPTER_2 = {
  id:            'ch2-optics',
  chapterNumber: 2,
  title:         'SWIRL-E Visual System — Optics',

  tip: "Drag a lens from the tray below into a slot on the eye tube.",

  problem: [
    "SWIRL-E can see — but everything is blurry! His eye lenses were knocked loose during shipping.",
    "His eye tube has two empty lens slots. Choose the right lenses from the workbench and place them in the correct order.",
    "The lenses must focus light precisely onto the sensor at the back of the tube.",
    "Choose carefully — the order matters just as much as the type.",
  ],

  journalHint: [
    "Light travels in straight lines — until it hits glass.",
    "A convex (outward-curved) lens bends light inward. It is called a converging lens.",
    "The focal length (f) tells you how strongly a lens bends light. Short f = strong bend.",
    "One convex lens creates a sharp image — but it comes out upside down.",
    "Two convex lenses together can flip the image right-side up again.",
    "Combined lens power: 1/f ≈ 1/f₁ + 1/f₂",
    "— Grandpa",
  ],

  successMessage: "Both lenses working together — SWIRL-E can see you clearly!",

  // ── Lens pool (displayed in tray, dragged into slots) ─────────────────────

  lensPool: [
    {
      id:          'weak-convex',
      label:       'Weak Convex',
      sublabel:    'f = 200',
      focalLength: 200,     // SVG units, positive = converging
      bulge:       8,       // visual bulge in SVG units for lens shape drawing
      color:       '#2080c0',
    },
    {
      id:          'strong-convex',
      label:       'Strong Convex',
      sublabel:    'f = 40',
      focalLength: 40,
      bulge:       22,      // thicker glass, more curved
      color:       '#20a060',
    },
    {
      id:          'diverging',
      label:       'Diverging',
      sublabel:    'f = −80',
      focalLength: -80,     // negative = diverging
      bulge:       -10,     // concave (pinched)
      color:       '#c05020',
    },
    {
      id:          'flat',
      label:       'Flat Glass',
      sublabel:    'f = ∞',
      focalLength: Infinity, // no optical power
      bulge:       0,
      color:       '#7080a0',
    },
  ],

  // ── Correct solution ──────────────────────────────────────────────────────

  correctSolution: {
    slot1: 'weak-convex',
    slot2: 'strong-convex',
  },

  // ── SVG layout (1000 × 720 coordinate space) ──────────────────────────────

  layout: {
    viewBox: '80 185 750 350',
    axisY:   360,    // optical axis (vertical centre of tube)

    // Eye tube housing
    tube: {
      x1: 220,  // left aperture
      x2: 800,  // right wall
      y1: 260,  // top wall
      y2: 460,  // bottom wall
    },

    // Incoming parallel rays enter the tube here
    raysEnterX: 220,

    // Two lens slots — x is the correct/target position; minX/maxX define the slide track
    slots: [
      { id: 'slot-1', x: 400, label: '1', minX: 240, maxX: 560 },
      { id: 'slot-2', x: 660, label: '2', minX: 430, maxX: 770 },
    ],

    // Minimum SVG-unit gap enforced between lens 1 and lens 2 during sliding
    minLensGap: 60,

    // SVG units — snap lens to target x when this close on release
    snapRadius: 15,

    // Sensor — the focal plane; image must land here
    sensor: {
      x:  780,
      y1: 280,
      y2: 440,
    },

    // Lens tray below the board (y centre, lenses are HTML elements)
    lensTraY: 90,   // position within the tray div, not SVG
  },
};
