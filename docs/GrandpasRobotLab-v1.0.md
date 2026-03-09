# Grandpa's Robot Lab
### Vision & Build Specification (v1.0 — Chapter 1 Complete)

**Status:** Chapter 1 — Power is fully built and playable.
**Supersedes:** v0.1, v0.2, v0.3 (kept as historical artifacts).
**Last updated:** March 2026

---

## 1. Purpose

Grandpa's Robot Lab is the engineering core of Grandpa's Creative Universe. It is a structured journey into building intelligence — a systems-thinking playground where children experience:

> *"I built this. It works. I understand why."*

It is not a toy simulator. It is a safe space to fail, debug, and discover. The robot is the vehicle. The real product is capability.

---

## 2. Core Philosophy

Robot Lab teaches five invisible foundations through play, never through lecture:

1. Energy exists.
2. Energy flows.
3. Systems respond to energy.
4. Control shapes behavior.
5. Logic creates intelligence.

---

## 3. SWIRL-E — The Robot

The robot is named **SWIRL-E**. Children discover SWIRL-E in Grandpa's workshop — unfinished, waiting to be brought to life.

### Character Traits
- Before activation: subtle hums, slight body shifts, as if trying to wake up
- The "Pinocchio moment": completing Chapter 1 is an emotional act of creation
- SWIRL-E retains every unlocked capability — a living portfolio of everything built

### Art Assets (located in `games/robot-lab/assets/images/`)

| File | Usage |
|------|-------|
| `swirle-unpowered.png` | Portrait — eyes dark, waiting. Used in: title scene, mission sidebar, mission briefing, failure outcome summaries |
| `swirle-powered.png` | Portrait — eyes glowing cyan. Used in: success outcome summary, mission sidebar on solve |
| `swirle-eyemodule-blueprint.png` | Full technical diagram of the eye module PCB. Used as washed-out background on title scene |
| `swirle-vpa.png` | Close-up of the eye module circuit board. Shown inside the schematic eye module box at 28% opacity |
| `journal-blank-page.png` | Blank journal page used as Grandpa's Journal background |

---

## 4. Tech Stack

- **Language:** Vanilla JavaScript (ES modules), HTML5, CSS3 — no frameworks
- **Rendering:** SVG-in-HTML for the circuit schematic
- **Animation:** `requestAnimationFrame` for particles and SVG eye animation; CSS `@keyframes` for glow/pulse
- **Audio:** Web Audio API — procedural synthesis (no audio files for explosion)
- **Coordinate mapping:** `getScreenCTM()` / `createSVGPoint()` for SVG ↔ screen conversion
- **Fonts:** Google Fonts CDN — Orbitron (headings), Caveat (journal). Self-host `.woff2` for production iOS builds
- **Touch:** Custom `touchstart`/`touchmove`/`touchend` handlers, `{ passive: false }`, `e.changedTouches[0]` on `touchend`

---

## 5. Scene Flow

```
Hub → TitleScene → [Mission Briefing Overlay] → MissionScene → [Outcome Summary] → MissionScene
                                                                                 ↓
                                                                     Hub (via ← Hub button)
```

---

## 6. Title Scene (`TitleScene.js`)

The landing page for Robot Lab. Accessed from the GCU Hub.

### Visual Layout
- **Background:** Dark navy gradient + tech-grid dot overlay + `swirle-eyemodule-blueprint.png` at 7% opacity with `mix-blend-mode: screen` — the blueprint glows faintly through
- **Left column:** `swirle-unpowered.png` portrait (220×220px, cyan glow border) with caption **"My eyes need power…"** in italic below
- **Right column (beside portrait):** `swirle-vpa.png` (the eye module circuit board close-up) with label "EYE MODULE — SW-EYE-1A" below it. Laid out as a flex row with the portrait column.
- **Title:** "ROBOT LAB" — Orbitron 900, gold, 3px letter-spacing
- **Chapter badge:** "CHAPTER 1" — Orbitron, blue pill badge
- **Subtitle:** "Power" — Orbitron, light blue
- **Tagline:** "SWIRL-E's head is almost finished. His eye module just needs to be powered. Can you finish the circuit to power his eye module?"
- **Button:** "Let's Build!" → navigates to `robot-lab-mission` with `{ missionId: 'ch1-power', avatarId }`
- **Back button:** "← Hub" → returns to Hub

Note: `avatarId` is received from the Hub and forwarded to MissionScene so the player's name and photo can appear in mission screens.

---

## 7. Mission Briefing Overlay

Displayed immediately when the Mission Scene loads — a full-screen modal that introduces the chapter before the player touches any wires.

### Visual
- Dark navy card with gold border + tech-grid texture
- Header: "Ch 1" badge (Orbitron) + **"Mission: SWIRL-E Visual System"** — "Mission:" in yellow (`.rl-label-prefix`), chapter name in cyan
- Left column: `swirle-unpowered.png` in a 130×130px cyan-glowing portrait frame, "SWIRL-E" label in Orbitron gold
- Personal message in Caveat font (warm yellow) below SWIRL-E's name: **"[KidName], please get my eyes working. I want to see you."** — uses `avatarId` to resolve the child's display name. Falls back to "Please get my eyes working. I want to see you." if no avatar selected.
- Right column: **Official mission panel** (dark panel with cyan border and "MISSION BRIEFING" label in Orbitron at the top edge — NOT a speech bubble). Contains the full problem statement from `chapter1.js`.
- Button: "Let's Wire! ⚡" — ⚡ sits inside a small dark circular badge (`.rl-btn__icon-badge`) for contrast against the yellow button background. Dismisses with slide-up + fade animation (`.rl-briefing--hiding`, 380ms).

### Two-Theme Visual Language
The briefing establishes a recurring design pattern used throughout Robot Lab:
- **Official / system** content (mission titles, panel headers, math readouts) — Orbitron font, cyan or yellow color
- **Personal** content (SWIRL-E's message to the child, Grandpa's Journal) — Caveat font, warm yellow or cream color

---

## 8. Mission Scene (`MissionScene.js`)

The core gameplay screen.

### Layout
```
┌─────────────────────────────────────────────────────────┐
│  ← Hub    Ch 1: SWIRL-E Visual System    ↺ Rewire    📓  │  ← topbar
├───────────┬─────────────────────────────────────────────┤
│ SWIRL-E   │                                             │
│ portrait  │         SVG Schematic Board                 │
│           │                                             │
│ Problem   │                                             │
│ text      │                                             │
│           │                                             │
│ [Actions] │                                             │
└───────────┴─────────────────────────────────────────────┘
```

### Topbar Buttons
| Button | Label | Action |
|--------|-------|--------|
| Back | `← Hub` | Return to Hub |
| Reset | `↺ Rewire` | Clear all wires, reshuffle components, restart chapter |
| Hint | `📓` | Open Grandpa's Journal overlay |

### Sidebar
- **SWIRL-E portrait:** `swirle-unpowered.png` fills the sidebar width with cyan glow border. Swaps to `swirle-powered.png` on correct solution.
- **Problem text:** Mission statement paragraphs from `chapter1.js`
- **Actions area:** Populated dynamically after outcome (▶ Simulate button, direction toggle)

### Action Buttons (post-outcome)
- **▶ Simulate** — Replays the circuit simulation without rewiring. Distinct from `↺ Rewire`.
- **Flow direction flip-switch** — A vertical toggle component (not a plain button) showing both "⊕ Conventional" (top) and "⊖ Electrons" (bottom) at all times. A glowing cyan dot slides up or down in a track to indicate which mode is active. The active label glows cyan; the inactive label is dimmed. Tap anywhere on the component to flip.
- **Next Chapter →** — Appears after the chapter is solved correctly. Persists across rewires (`_everSolved` flag) — once earned, this button is never removed even if the player rewires and blows things up. Goes to the next chapter's mission if built, otherwise returns to Hub.

---

## 9. SVG Schematic

### Coordinate Space
- ViewBox: `0 0 1000 720`
- `preserveAspectRatio: xMidYMid meet`

### Layer Stack (bottom → top)
1. `rl-layer-grid` — 30px background grid
2. `rl-layer-components` — all fixed components (eye module, battery, passive components)
3. `rl-layer-guides` — rail guide lines (dashed top, solid bottom bus)
4. `rl-layer-nodes` — open terminal circles + junction dots
5. `rl-layer-player` — player-drawn wires + preview wire
6. `rl-layer-particles` — electron/current particles
7. `rl-layer-hits` — invisible large hit circles for terminal touch detection

### Eye Module Box
- Position: `{ x: 75, y: 115, w: 220, h: 90 }`
- SVG `<clipPath>` clips `swirle-vpa.png` to the rounded box boundary
- VPA image: `preserveAspectRatio="xMidYMid slice"`, `opacity: 0.28`
- Two SVG eyes (irises at y=166, x=169 and x=201, r=20) drawn on top of image
- Pupils (`r=8`) and highlights (`r=4`) have IDs for JS animation
- Labels: "SWIRL-E EYE MODULE" above box; +/− terminal signs at wire stubs
- Terminals: `eye:plus` at (55, 160), `eye:minus` at (315, 160)

### Battery
- PNG image (`battery_h.png`) scaled to span `plus:(55,570)` → `minus:(315,570)`
- Label "9V" below image

### Component Slots (3 slots, random order each game)
- Slot 0: `cx=450`, top terminal at y=270, bottom at y=460, bus at y=570
- Slot 1: `cx=630`, same y values
- Slot 2: `cx=810`, same y values
- Each slot: PNG component image + value label + type label to the right
- Bottom bus pre-drawn (solid line) — connects `battery:minus → passive-0:b → passive-1:b → passive-2:b`
- Top stubs NOT pre-drawn — player must connect `eye:minus → passive-X:a`
- Junction dots at each `passive-X:b` (y=460)

### Rail Guides
- Top: dashed line y=160, x1=315 → x2=870 (visual hint only — not a wire)
- Bottom: solid line y=570, x1=315 → x2=870 (pre-drawn bus)

### Open Terminals (player connects to these)
- `battery:plus` (55, 570)
- `battery:minus` (315, 570)
- `eye:plus` (55, 160)
- `eye:minus` (315, 160)
- `passive-0:a` through `passive-2:a` (top of each component slot)

Each open terminal: visible circle r=7 + invisible hit circle r=28 (generous for child fingers).

---

## 10. Passive Component Pool

Shuffled randomly (Fisher-Yates) at game start and on every `↺ Rewire`. The three components are always all three types — only the slot positions change.

| Type | Label | Color | Behavior |
|------|-------|-------|----------|
| Resistor | 9kΩ | Brown `#a06010` | **Correct** — limits current to 1mA |
| Capacitor | 9µF | Blue `#1050a0` | **Wrong** — charges then blocks DC |
| Inductor | 9mH | Green `#206040` | **Wrong** — ramps to full current → explosion |

---

## 11. Circuit Engine (`CircuitEngine.js`)

Graph-based adjacency model. No physics simulation.

### Win Condition (checked on every wire placement)
Complete loop detected: `battery:plus → eye:plus → eye:minus → passive-X:a → passive-X:b → battery:minus`

### Outcomes

#### 1. Success (Resistor)
- `SchematicRenderer.setEyesPowered(true)` — irises turn cyan, pulse animation begins
- `SchematicRenderer.startEyeAnimation()` — pupils begin Lissajous wander + blink every 4s
- Sidebar portrait swaps to `swirle-powered.png`
- Wires change to powered glow
- Particle system starts (electron mode, clockwise conventional = CW)
- Confetti celebration
- Outcome summary appears after 3000ms

#### 2. Capacitor
- Charge fill animation: blue rect inside component fills 0→100% over ~1s
- Percentage label counts up
- After charge completes: wires go "wrong" style
- Sidebar SWIRL-E: stays `swirle-unpowered.png`
- Outcome summary appears after 1400ms

#### 3. Inductor
- Expanding magnetic field ellipses animate outward
- After ~4s: `_doExplosion()` fires
- Mini-explosion on replay (same sound/smoke/flash at eye module)
- Outcome summary appears after 3800ms

#### 4. Direct Short (`eye:minus → battery:minus`)
- Detected as short circuit (no passive in path)
- Immediate `_doExplosion()`
- Outcome summary appears after 3800ms

### Explosion Effects
- Sound: `playCanBurst()` — procedural Web Audio (crack + whoosh + bass thump + metallic ring)
- Smoke: 8 SVG `<circle>` puffs rise from eye module, RAF-animated, self-removing
- Fireball: positioned at eye module center using `getScreenCTM()` + `getBoundingClientRect()` conversion
- SVG eyes: `SchematicRenderer.setEyesFried()` — irises turn dark, "✕" overlay
- Animation stops on `stopEyeAnimation()`

---

## 12. Particle System (`ParticleSystem.js`)

Particles traverse the closed circuit path, showing current flow visually.

### Two Modes (toggleable)
| Mode | Visual | Direction |
|------|--------|-----------|
| Electron | Blue circle with `−` symbol | Counter-clockwise (conventional) |
| Conventional | Orange arrow polygon, rotates to face travel direction | Clockwise |

CSS classes `.rl-particle-mode--electron` / `.rl-particle-mode--conventional` show/hide the correct shape per group.

### Path
Waypoints: `battery:plus → eye:plus → eye:minus → passive-X:a → passive-X:b → bus → battery:minus → battery:plus`

Particles loop continuously. Speed and count configurable per circuit outcome.

---

## 13. Eye Animation (Powered State)

When `setEyesPowered(true)` is called, `startEyeAnimation()` begins a `requestAnimationFrame` loop:

- **Pupil wander:** Lissajous pattern — `dx = 8 * sin(0.71t) * cos(0.29t)`, `dy = 8 * 0.6 * sin(0.53t + 1.2)`. Max travel: ±8 SVG units from iris center. Feels organic and alive.
- **Blink:** Every 4 seconds, irises get `.rl-eyemod__iris--blinking` CSS class → `scaleY(0.05)` and back in 280ms
- Animation stops on `setEyesFried()` or `stopEyeAnimation()`, pupils reset to center

---

## 14. Outcome Summary Overlays

Appears after a delay following each outcome. Reuses the `.rl-briefing` card style.

### Success
- Full-width `swirle-powered.png` portrait filling the card (bleeds to edges with negative margin)
- Caption overlaid at portrait bottom: **"The EYE-MODULE functions perfectly"** — Orbitron, glowing green, on dark gradient fade
- Explanation text + Ohm's Law math equation below: `9V ÷ 9,000Ω = 0.001A = 1mA ✓`
- Green glow card border
- Buttons: **▶ Simulate**, **Close**

### Failures (Capacitor / Inductor / Direct Short)
- Left column: `swirle-unpowered.png` in cyan portrait frame
- Right speech bubble: explanation of what happened + math equation
  - Capacitor: `Capacitor full → Current = 0A ✗`
  - Inductor: `Steady state: 9V ÷ ~0Ω = way too many Amps 💥`
  - Short: `9V ÷ 0Ω = ∞ Amps 💥`
- Math displayed in Orbitron font — green (`.rl-math--good`) or red (`.rl-math--bad`)
- Red glow card border
- Buttons: **▶ Simulate**, **🔄 Try Again**, **Close**

---

## 15. Grandpa's Journal

Accessible via the 📓 button in the topbar. A slide-in overlay with a handwritten feel.

### Visual
- Background: `journal-blank-page.png` (actual journal page texture/image)
- Font: **Caveat** (Google Fonts, 400/700) — warm, readable handwriting style
- Heading: "Grandpa's Journal" in Caveat 700, size 26px
- Body text: Caveat 400, size 19px, line-height 1.65

### Chapter 1 Hints
```
The battery pushes 9 volts through the circuit.
Ohm's Law: Current = Voltage ÷ Resistance
9V ÷ 9,000Ω = 0.001A = 1mA — exactly the limit!
A capacitor stores charge then stops current. DC can't flow through it.
An inductor resists changing current... but once it's "charged up" it acts like a plain wire.
Only the resistor limits DC current to a safe steady value.
— Grandpa
```

---

## 16. Wire Drawing Interaction

Players draw wires by dragging from one terminal to another on the SVG.

### Touch/Mouse Handling
- `touchstart` / `mousedown` on the hits layer — begins wire preview from nearest terminal
- `touchmove` / `mousemove` on document — updates preview polyline in real time
- `touchend` / `mouseup` on document — snaps to nearest terminal within tolerance, or cancels
- `e.changedTouches[0]` used on `touchend` (finger is already lifted)
- `{ passive: false }` + `e.preventDefault()` on all touch handlers

### Wire Routing
- L-shaped elbow routing: horizontal segment at the "rail" level (smaller y), vertical segment to the other endpoint
- Straight line if x or y coordinates match

### Constraints
- Cannot draw to already-connected terminal
- Cannot draw to the same terminal (no self-loops)
- Wires can be cleared individually or all at once (`↺ Rewire`)

---

## 17. Button Taxonomy (Important Distinctions)

These labels are intentional and should not be confused:

| Control | Location | Action |
|---------|----------|--------|
| `↺ Rewire` | Topbar | Clears ALL wires, reshuffles components, completely restarts the chapter |
| `▶ Simulate` | Sidebar + outcome overlay | Replays the circuit simulation for the current wiring — does NOT change the circuit |
| `🔄 Try Again` | Outcome overlay (failures only) | Same as `↺ Rewire` — alias from the overlay context |
| Flow direction flip-switch | Sidebar (after solve) | Toggles particle visualization between electron flow and conventional current — both labels always visible |
| `Next Chapter →` | Sidebar (after solve) + outcome overlay (success) | Advances to the next chapter. Once earned, persists across rewires for the rest of the session. |

---

## 18. Learning Arc — All Chapters

Chapter 1 is complete. Chapters 2–10 are planned. Full curriculum detail is in `docs/RobotLabMissions.md`.

| Chapter | Focus | Core Concept | SWIRL-E Moment |
|---------|-------|-------------|----------------|
| **1** ✅ | **Electricity** | Closed loops, Ohm's Law, component selection | Eyes light up — SWIRL-E can see |
| 2 | Optics | Light focus, lens position, alignment | SWIRL-E can see clearly |
| 3 | Color Sensing | RGB channels, sensor calibration | SWIRL-E correctly identifies colors |
| 4 | Motors | Electricity → motion, torque, speed | SWIRL-E gains physical movement |
| 5 | Control Systems | Feedback loops, stability, oscillation | SWIRL-E becomes steady |
| 6 | Sound | Microphones, amplification, gain | SWIRL-E can hear |
| 7 | Logic | Rules, conditions, decision-making | SWIRL-E begins to act intelligently |
| 8 | Navigation | Path planning, obstacle avoidance | SWIRL-E can get where he needs to go |
| 9 | Power Management | Energy budgets, efficiency, tradeoffs | SWIRL-E becomes reliable |
| 10 | System Integration | All subsystems working together | SWIRL-E completes a real mission |

---

## 19. Power Flow — The Plumbing Metaphor

The mental model for the circuit engine is **water through pipes**, not electronics theory.

- Power is "liquid light" — a pulsing plasma that flows from battery through wires to components
- When there's a gap in the circuit, the glow **stops at the break point** — the child can see exactly where the path ends
- Particles (electron or conventional current) make the flow visible and directional
- Children don't need to understand circuit theory — they can *see* where things went wrong

This metaphor scales naturally: parallel paths are pipes that split; logic gates are valves that require multiple inputs before allowing flow to continue. The engine stays simple while supporting increasingly complex behavior.

---

## 20. Debugging UX — SWIRL-E as the Hint System (Planned)

Rather than a separate hint UI, SWIRL-E itself is the age-scaled debugger:

- **Ages 8–12 (JR):** The power flow visualization stops at the break point. That's enough — the child reasons from there.
- **Ages 7–9 (Kaila):** SWIRL-E reacts to near-misses — flickers, tries to activate but stutters — giving a visual clue that power is *almost* there.
- **Ages 4–7 (Leon/Alanna):** SWIRL-E looks toward the problem area, or appears sad near the broken connection.

This preserves the "I fixed it" moment across all ages while preventing frustration-induced quitting. The robot IS the hint system. No separate debug UI needed.

Currently implemented: the particle system shows current flow direction, and outcomes explain exactly what went wrong (with math). SWIRL-E's reactive behaviors are planned for future chapters.

---

## 21. Design Guardrails

### Never
- Auto-solve mistakes — debugging is the lesson
- Introduce multiple abstractions simultaneously
- Use hover for essential interactions (iOS has sticky hover)
- Animate `box-shadow`, `width`, `height`, `top`, `left` during gameplay
- Use HTML5 Drag and Drop API (broken on iOS)
- Use `setInterval` for animation (use `requestAnimationFrame` or CSS `@keyframes`)

### Always
- Show WHERE power stops, not HOW to fix it
- One concept per chapter
- Touch targets ≥ 60px for child fingers
- `transform` and `opacity` only for GPU-composited animations
- `will-change: transform` on frequently animated elements
- Test on actual iPad before any milestone

---

## 22. File Structure

```
games/robot-lab/
├── index.js                    # Entry point — registers scenes
├── scenes/
│   ├── TitleScene.js           # Landing page
│   └── MissionScene.js         # Core gameplay (circuit board)
├── renderer/
│   └── SchematicRenderer.js    # SVG schematic builder + state updater
├── engine/
│   └── CircuitEngine.js        # Graph-based circuit evaluation
├── animation/
│   └── ParticleSystem.js       # Electron / conventional current particles
├── audio/
│   └── ExplosionSFX.js         # Procedural Web Audio explosion
├── missions/
│   └── chapter1.js             # Chapter 1 layout, components, text
├── assets/
│   └── images/
│       ├── swirle-unpowered.png
│       ├── swirle-powered.png
│       ├── swirle-eyemodule-blueprint.png
│       ├── swirle-vpa.png
│       └── journal-blank-page.png
└── css/
    └── robot-lab.css           # All Robot Lab styles
```

---

## 23. CSS Font Strategy

```
Orbitron  — Mission UI headings, math equations, chapter badges, game title.
             Tech-geometric feel. Weights 700/900.

Caveat    — Grandpa's Journal. Handwritten but readable. Weights 400/700.

Baloo 2   — Body text, problem statements, general UI. Warm and friendly.
             Already loaded by GCU core styles. Fallback for Orbitron/Caveat.
```

Google Fonts import (top of `robot-lab.css`):
```css
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Caveat:wght@400;700&display=swap');
```

**For production iOS:** Self-host `.woff2` files in `assets/fonts/` — app must work offline.

---

*v1.0 — Chapter 1 complete as of March 2026.*
