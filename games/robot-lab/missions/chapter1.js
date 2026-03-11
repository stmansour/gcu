/**
 * Robot Lab — Chapter 1: Power
 *
 * Schematic layout (1000 × 720 SVG coordinate space):
 *
 *  ○(55,160)─[EYE MODULE]─○(315,160) ····················  ← top DASHED guide (hint only)
 *
 *                                          ○(450,270)○(630,270)○(810,270) ← passive-X:a (open)
 *                                          [COMP 0]  [COMP 1]  [COMP 2]  (random order)
 *                                          ●(450,460)●(630,460)●(810,460) ← passive-X:b (pre-wired)
 *                                           │         │         │
 *  ○(55,570)─[BATTERY  9V]─○(315,570)━━━━━━┷━━━━━━━━━┷━━━━━━━━━┷──  ← bottom bus (solid)
 *
 * ····  = dashed top guide (visual hint only, NOT a wire)
 * ━━━   = solid pre-drawn bottom bus wire (engine: prePlacedWires)
 * │     = stub from passive-X:b down to bottom bus
 * ●     = junction dot (pre-connected — not a player terminal)
 * ○     = open terminal (child draws wires here)
 *
 * Bottom bus pre-wires: battery:minus → passive-0:b → passive-1:b → passive-2:b
 * Component tops (passive-X:a) are ISOLATED — not connected until player draws.
 *
 * Child draws exactly 2 wires:
 *   1. battery:plus → eye:plus
 *   2a. eye:minus → passive-X:a  (uses that component; others remain isolated)
 *    OR
 *   2b. eye:minus → battery:minus  (direct short → EXPLOSION)
 */

export const CHAPTER_1 = {
  id:            'ch1-power',
  chapterNumber: 1,
  title:         'SWIRL-E Visual System',

  tip: "Touch any white circle and drag to another white circle to draw a wire.",

  problem: [
    "SWIRL-E's head is almost fully functional. His eye module just needs power. Your mission is to properly wire the eye module power.",
    "SWIRL-E's Eye Module burns up if it gets more than 1 milliamp (1mA) of current.",
    "The battery is 9 volts. Connect the right component to protect the eyes.",
    "Choose wisely — the wrong choice will be... memorable.",
  ],

  journalHint: [
    "The battery pushes 9 volts through the circuit.",
    "Ohm's Law: Current = Voltage ÷ Resistance",
    "9V ÷ 9,000Ω = 0.001A = 1mA — exactly the limit!",
    "In a DC circuit, a capacitor stores charge then stops current. DC can't flow through it after it's fully charged.",
    "An inductor resists changing current... but once it's 'charged up' it acts like a plain wire.",
    "Only the resistor limits DC current to a safe steady value.",
    "— Grandpa",
  ],

  successMessage: "The resistor limited the current to exactly 1mA — SWIRL-E can see!",

  // ── Circuit Engine definitions ────────────────────────────────────────────
  // passive-0/1/2 registered dynamically from slot assignment at game start.

  baseComponents: [
    { id: 'battery', type: 'battery', terminals: ['plus', 'minus'] },
    { id: 'eye',     type: 'led',     terminals: ['plus', 'minus'] },
  ],

  // Pre-placed bottom bus wires only — battery:minus → all passive :b terminals.
  // The top terminals (passive-X:a) are isolated. The player must draw:
  //   (1) battery:plus → eye:plus
  //   (2) eye:minus → passive-X:a  (activates that component only)
  //    OR eye:minus → battery:minus (direct short → explosion)
  prePlacedWires: [
    { from: 'battery:minus', to: 'passive-0:b' },
    { from: 'passive-0:b',   to: 'passive-1:b' },
    { from: 'passive-1:b',   to: 'passive-2:b' },
  ],

  // ── Passive component pool ────────────────────────────────────────────────

  passivePool: [
    {
      type:       'resistor',
      engineType: 'resistor',
      label:      '9kΩ',
      sublabel:   'RESISTOR',
      color:      '#a06010',
    },
    {
      type:       'capacitor',
      engineType: 'capacitor',
      label:      '9µF',
      sublabel:   'CAPACITOR',
      color:      '#1050a0',
    },
    {
      type:       'inductor',
      engineType: 'inductor',
      label:      '9mH',
      sublabel:   'INDUCTOR',
      color:      '#206040',
    },
  ],

  // ── SVG schematic layout (coordinate space: 1000 × 620) ──────────────────

  layout: {
    viewBox: '0 0 1000 720',

    eyeModule: {
      // Wire stubs extend from the box to the open-circle terminals.
      // Box is square to match the swirle-vpa.png aspect ratio (1622×1641 ≈ 1:1).
      // Terminals remain on the horizontal centre line (y=160) of the box.
      box:   { x: 75, y: 50, w: 220, h: 220 },
      plus:  { id: 'eye:plus',  x: 55,  y: 160 },
      minus: { id: 'eye:minus', x: 315, y: 160 },
      label: 'SWIRL-E\nEYE MODULE',
    },

    battery: {
      // Schematic symbol — horizontal, no box
      // Cells span from cellX1 to cellX2, centred on y=570
      cellX1: 110,
      cellX2: 270,
      plus:   { id: 'battery:plus',  x: 55,  y: 570 },
      minus:  { id: 'battery:minus', x: 315, y: 570 },
      label:  '9V',
    },

    // railGuides:
    //   top = DASHED hint (not a wire — component tops are isolated open terminals)
    //   bottom = SOLID pre-drawn bus (battery:minus pre-connected to all passive:b)
    railGuides: [
      { y: 160, x1: 315, x2: 870, dashed: true },
      { y: 570, x1: 315, x2: 870 },
    ],

    // Three component slots.
    // topY    = passive-X:a position (open terminal — player draws from eye:minus here)
    // bottomY = passive-X:b position (junction dot — pre-connected to bottom bus)
    // railBottomY = bottom bus y (stub drawn from bottomY up to railBottomY)
    // No railTopY — top stubs are NOT pre-drawn.
    componentSlots: [
      {
        id:          'slot-0',
        cx:          450,
        topY:        270,
        bottomY:     460,  railBottomY: 570,
        topTermId:   'passive-0:a',
        botTermId:   'passive-0:b',
      },
      {
        id:          'slot-1',
        cx:          630,
        topY:        270,
        bottomY:     460,  railBottomY: 570,
        topTermId:   'passive-1:a',
        botTermId:   'passive-1:b',
      },
      {
        id:          'slot-2',
        cx:          810,
        topY:        270,
        bottomY:     460,  railBottomY: 570,
        topTermId:   'passive-2:a',
        botTermId:   'passive-2:b',
      },
    ],
  },
};
