# Robot Lab — Chapter 2: Optics
### Design & Build Specification (v0.1 — Design Complete, Not Yet Built)

**Status:** Specification only. Chapter 1 must be complete and stable before building Chapter 2.
**Last updated:** March 2026

---

## 1. Mission Overview

**Chapter title:** SWIRL-E Visual System — Part 2: Optics
**Theme:** SWIRL-E can see, but everything is blurry. The lenses inside his eye tube were knocked loose during shipping. The player must select and place the correct lenses to bring his vision into sharp focus.

**Narrative hook:**
> "Great job! SWIRL-E has power now — I can see *something*. But everything is blurry. Grandpa's notes say my eye tube needs two lenses installed in exactly the right positions. There are four spare lenses on the workbench. Choose carefully."

**Educational goal:** Teach the fundamentals of optics — how convex lenses bend light, what focal length means, how a single lens inverts an image, and how a two-lens relay system re-inverts the image to produce an upright, sharp view.

---

## 2. The Puzzle

### Setup
SWIRL-E's eye tube has two empty lens slots. On the workbench below the tube are four spare lenses. The player drags lenses into the slots. The ray diagram and video feed update in real time as lenses are placed.

### The Two-Beat Solve
The mission is designed to produce two distinct "aha" moments:

**Beat 1 — Progress, but not quite right:**
When the player places the correct first lens (Weak Converging) in Slot 1, the video screen shows the blur reducing noticeably AND the image flipping upside-down. SWIRL-E reacts: *"I can see something! But... why are you upside down?"* This teaches that a single converging lens creates an inverted image.

**Beat 2 — Full solve:**
When the player then places the correct second lens (Strong Converging) in Slot 2, the image sharpens fully AND flips right-side up. Mission complete.

### Correct Solution
| Slot | Lens |
|------|------|
| Slot 1 | Weak Converging (f = 200) |
| Slot 2 | Strong Converging (f = 40) |

Both lenses are convex. The first gathers and inverts. The second re-focuses and re-inverts to produce an upright image at the sensor.

---

## 3. The Four Lenses

| Label | Shape | Focal Length | Visual | Behavior |
|-------|-------|-------------|--------|----------|
| Weak Converging | Biconvex, gentle curve | f = +200 SVG units | Thin, slightly bowed | Bends light toward axis gently |
| Strong Converging | Biconvex, steep curve | f = +40 SVG units | Thick, strongly curved | Bends light toward axis sharply |
| Diverging | Biconcave, pinched | f = −80 SVG units | Pinched in the middle | Spreads light away from axis |
| Flat Glass | Flat rectangle | f = ∞ | No curve | No bending — light passes straight through |

The player sees these as draggable lens icons in a tray below the eye tube. Each lens has a distinct silhouette — no labels other than a tiny icon. The physical shape should be immediately readable.

**Interaction — Swap on Drop:**
If a lens is already in a slot when the player drops a new one, the existing lens is returned to the tray and the new one takes its place.

---

## 4. SVG Layout (coordinate space: 1000 × 720)

```
     [AVATAR]    ←── parallel rays ──→  ╔══════════════════════════════╗   [📷 FEED]
      x=100                             ║  EYE TUBE  y=260 to y=460   ║
       y=360                            ║                              ║   blurry →
                                        ║  [Slot 1]    [Slot 2]  [●]  ║    sharp
                                        ║   x=400       x=660   x=780 ║
                                        ╚══════════════════════════════╝
     ◄── x=200 (tube entrance) ────────────────────────────── x=800 ──►

     ─────────────────────────────────────────────────────────────────
     LENS TRAY:  [Weak Convex]  [Strong Convex]  [Diverging]  [Flat]
```

### Key Positions
| Element | x | y |
|---------|---|---|
| Avatar (object) | 100 | 360 |
| Tube entrance (rays enter) | 200 | — |
| Slot 1 (lens plane) | 400 | — |
| Slot 2 (lens plane) | 660 | — |
| Sensor / video screen | 780 | — |
| Tube top wall | — | 260 |
| Tube bottom wall | — | 460 |
| Optical axis | — | 360 |

### Correct Combo — Image Positions
| Step | Position |
|------|----------|
| Rays enter tube as parallel | x = 200 |
| After Slot 1 (f=200): intermediate image forms (inverted) | x = 600 |
| After Slot 2 (f=40): final image forms (upright) | x = 780 = sensor ✓ |

**Verification (thin lens equation):**
- Slot 1: parallel input → di₁ = f₁ = 200 → intermediate image at x = 400 + 200 = 600
- Slot 2: do₂ = 660 − 600 = 60; 1/di₂ = 1/40 − 1/60 = (3−2)/120 = 1/120; di₂ = 120 → image at x = 660 + 120 = 780 ✓

**Note:** Incoming rays are treated as parallel in the ray diagram (object at effective infinity). This matches real-world camera/eye behavior — the subject is far enough away that rays are functionally parallel by the time they reach the lens. The avatar is shown in the sidebar as what SWIRL-E is looking at.

---

## 5. Physics — Thin Lens Equation

The engine applies the thin lens formula sequentially for each occupied slot:

```
1/f = 1/dₒ + 1/dᵢ    →    dᵢ = (f × dₒ) / (dₒ − f)
```

- **Parallel input (first lens):** dₒ = ∞, so dᵢ = f
- **Second lens:** dₒ = slot2_x − image1_x (positive if image is to the left of the slot)
- A **real image** forms when dᵢ > 0 (object beyond focal length)
- A **virtual image** forms when dᵢ < 0 (object within focal length — rays appear to diverge)
- **Image inversion:** Real images are inverted. Virtual images are upright.

**Defocus distance** = |final_image_x − sensor_x|
This is mapped directly to the CSS blur radius on the video feed.

**Combined focal length (shown in Grandpa's Journal):**
For lenses in contact: 1/f = 1/f₁ + 1/f₂
(Simplified form — suitable for kids. The game uses the sequential thin lens formula for computation.)

---

## 6. Wrong-Answer Scenarios

| Slot 1 | Slot 2 | Outcome |
|--------|--------|---------|
| Empty | Empty | Maximum blur, parallel rays, no focus |
| Weak Converging (f=200) | Empty | Intermediate image at x=600, sensor at x=780. Defocus=180. Moderate blur, **inverted**. Beat 1 reaction. |
| Strong Converging (f=40) | Empty | Image at x=440. Defocus=340. Heavy blur, inverted. |
| Diverging (f=−80) | Empty | Virtual image at x=320. Rays diverging. Maximum blur. |
| Flat Glass | Empty | No bending. Rays parallel. Maximum blur. |
| Weak Converging (f=200) | **Strong Converging (f=40)** | **CORRECT. Image at x=780. Blur=0. Upright.** |
| Strong Converging (f=40) | Weak Converging (f=200) | After f=40: image at x=440. do₂=220, di₂=1/f₂−1/220... di₂≈733. Image at x=1393. Defocus=613. Very blurry. |
| Diverging (f=−80) | Strong Converging (f=40) | Virtual image from L1 appears at x=320. do₂=340, di₂≈44. Image at x=704. Defocus=76. Still blurry. |
| Any single lens in Slot 2 only | — | Parallel rays hit a lens with no Slot 1 lens. Image forms at Slot2_x + f₂ from sensor. All off by significant distance. |
| Two Strong Converging (f=40, f=40) | — | After f=40 in slot 1: image at x=440. do₂=220, di₂=1/40−1/220=4/176... ≈44. Image at x=704. Defocus=76. |
| Two Diverging | — | Rays diverge twice, never focus. Maximum blur. |

---

## 7. Visualizations (Four Simultaneous Views)

All four run in the same SVG, updating in real time as lenses are dragged in/out.

### 7a. Eye Tube (Physical Cross-Section)
The housing rendered as a cylindrical cutaway — two horizontal walls (tube top and bottom), end cap with sensor window on the right, open aperture on the left. The tube interior is dark with a subtle depth gradient.

### 7b. Lens Shapes (Inside the Tube)
When a lens is placed in a slot, its glass shape is rendered at the slot's x position:
- **Biconvex (converging):** Two curved arcs bowing outward. Thicker = stronger.
- **Biconcave (diverging):** Two curved arcs bowing inward (pinched).
- **Flat glass:** Simple vertical rectangle.
Empty slots show a faint dashed outline (drop target).

### 7c. Ray Diagram (Inside the Tube)
Three rays are traced from the top, center, and bottom of the left aperture, through each lens, to the sensor. Rays are drawn as colored lines (e.g., teal/cyan). Rays bend at each lens plane according to the thin lens equation.

- **Converging lens, parallel input:** Rays angle toward the back focal point F' (marked with a small dot and "F" label at the focal distance).
- **After the intermediate image:** Rays cross and diverge, then re-converge at Slot 2.
- **Diverging lens:** Rays angle away from the axis; dashed extended lines show where they appear to originate (virtual focus, marked with a hollow dot).
- **Flat glass:** Rays pass straight through, undeviated.

**The intermediate image** (when a real image forms between the two slots) is marked with a small inverted avatar icon at the image position. This makes the inversion concept concrete — the kid can see the image forming upside-down inside the tube.

**The final image** at the sensor is shown as a small upright or inverted avatar icon, scaled by how accurately it lands on the sensor:
- Sharp + on-sensor: clear, bright icon
- Off-sensor: blurry/ghosted icon

### 7d. Video Feed (Sensor Output)
A small screen element at the sensor (x=780) and a larger version in the sidebar next to SWIRL-E.

- Shows the kid's selected avatar image (from Chapter 1 avatar selection)
- `filter: blur(Npx)` where N = defocus_distance / blur_scale_factor (tune during implementation)
- `transform: scaleY(-1)` applied when the optical system produces a net inverted image
- At blur=0, scaleY=1: mission complete state

**Blur scale:** When defocus=0 → 0px blur. When defocus≥300 → max blur (~14px). Linear interpolation.

---

## 8. Beat 1 Reaction (Intermediate State)

Triggered when Slot 1 = Weak Converging AND Slot 2 is empty (or anything that produces an inverted, partially-focused result):

- Video feed: noticeably less blurry than baseline, but image is **upside down**
- `scaleY(-1)` applied to the feed
- Intermediate image marker appears inside the tube (inverted avatar icon at x=600)
- SWIRL-E sidebar: confused/surprised face
- SWIRL-E speech bubble: *"I can see something! But... why are you upside down?"*
- Problem text updates: *"A single lens inverts the image. Add a second lens to flip it back!"*

This is not the final success state — it is a visual teaching moment that reinforces the concept before the player discovers the correct full solution.

---

## 9. Success Condition

Triggered when: Slot 1 = Weak Converging (f=200) AND Slot 2 = Strong Converging (f=40)

- Blur transitions to 0px over 0.8 seconds (smooth CSS transition)
- `scaleY(-1)` transitions to `scaleY(1)` (image flips right-side up)
- Video feed pulses with a soft glow
- SWIRL-E sidebar: powered/happy face
- SWIRL-E speech: *"I can see you! Clear as day!"*
- Celebrate (confetti)
- `celebrate('large', ...)` fires
- Progress saved: `ch2-optics` added to `completedChapters`
- Outcome summary card appears after 3 seconds

---

## 10. Outcome Summary Card

Mirrors the Chapter 1 outcome card style. Content:

### Success
- Badge: ✓ Mission Complete
- Title: SWIRL-E Can See Clearly!
- Body: SWIRL-E portrait (powered) + kid avatar portrait + systems checklist
- Explanation: "Two convex lenses working together: the first gathers light and creates an image inside the tube. The second lens re-focuses that image right-side up onto the sensor."
- Math:
  ```
  1/f = 1/f₁ + 1/f₂ = 1/200 + 1/40 = 6/200 → f ≈ 33
  ```

### Failure variants (key ones)
- **Single lens (inverted):** "One lens inverts the image. You need a second to flip it back."
- **Wrong order:** "Same lenses, wrong order. In optics, the sequence matters — each lens sees the output of the one before it."
- **Diverging in slot 1:** "A concave lens spreads light out — it can't form a real image on its own. Try a convex lens first."
- **Flat glass:** "Flat glass doesn't bend light. It has no optical power. You need a curved surface to focus."

---

## 11. Grandpa's Journal (Chapter 2 Hints)

```
Light travels in straight lines — until it hits glass.
A curved glass surface bends (refracts) the light rays.
A convex (outward-curved) lens is a converging lens — it bends rays toward the center.
The focal length (f) tells you how sharply a lens bends light. Short f = strong bend.
One convex lens creates a sharp image — but it's upside down.
Two convex lenses can re-invert the image to make it right-side up.
Combined power: 1/f = 1/f₁ + 1/f₂
— Grandpa
```

---

## 12. SWIRL-E Dialogue States

| State | Portrait | Speech |
|-------|----------|--------|
| No lenses placed | Unpowered | "Everything is a blur. I can't tell what I'm looking at." |
| Any lens placed (still blurry) | Unpowered, squinting | "Something is changing... but it's still too fuzzy." |
| Correct lens 1 only (inverted, partial focus) | Surprised/confused | "I can see something! But... why are you upside down?" |
| Correct combo placed | Powered, happy | "I can see you! Clear as day!" |
| Diverging lens placed | Confused | "That made it worse! My eyes hurt." |

---

## 13. Files to Create

| File | Purpose |
|------|---------|
| `games/robot-lab/missions/chapter2.js` | Mission definition (layout, lens pool, correct solution) |
| `games/robot-lab/scenes/OpticsMissionScene.js` | Scene controller (or extend MissionScene) |
| `games/robot-lab/renderer/OpticsRenderer.js` | SVG rendering: tube, lens shapes, ray diagram, intermediate image marker |
| `games/robot-lab/engine/OpticsEngine.js` | Thin lens math: computes image positions, defocus, inversion state |
| `games/robot-lab/css/robot-lab-optics.css` | Styles specific to Chapter 2 |

### Assets Needed
| Asset | Description |
|-------|-------------|
| Lens silhouettes (SVG paths or canvas draw) | Could be rendered procedurally — no image file needed |
| Avatar image (already exists) | Kid's selected avatar from Chapter 1 avatar selection |
| `swirle-confused.png` | New SWIRL-E portrait — surprised/upside-down-confused expression |

---

## 14. Open Questions (To Answer During Build)

1. **Blur scale factor** — needs visual tuning. Start with: `blur_px = defocus / 20`, max 14px.
2. **Ray colors** — teal (`#40e8d0`) to match the existing glow palette? Or pure white for readability?
3. **Intermediate image icon size** — should be small enough to not obscure the ray diagram but large enough to be recognizable as the avatar.
4. **Beat 1 trigger** — only on "correct first lens, no second lens"? Or on any single-inversion state (including wrong combos that happen to produce an inverted image)?
5. **Does the lens tray show all 4 lenses always, or does a placed lens disappear from the tray?** (Recommend: placed lens is highlighted/dimmed in tray but not removed — player can always see all 4 options.)
6. **`swirle-confused.png`** — need to create or can we repurpose `swirle-unpowered.png` with a CSS tilt/effect?

---

*This spec will be updated as Chapter 2 is built and iterated.*
