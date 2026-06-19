# Robot Lab Missions

## Curriculum And Development Guide

**Project:** Grandpa's Creative Universe (GCU)  
**Module:** Robot Lab  
**Primary audience:** children old enough to follow guided experimentation, roughly 8-12 for the deeper Robot Lab chapters  
**Product target:** iPad first, iPhone second, standalone app experience  
**Current implementation status:** Chapters 1-4 are implemented. Chapter 5 (**Wrist Balance**) has a v1 rebuild in code (`BalanceMissionScene`, `robot-lab-balance`); legacy control-tuning files remain in the repo but are not registered.

---

## Purpose

Robot Lab is a guided robotics-building game where the player helps bring **SWIRL-E** to life one subsystem at a time.

The player should feel like they are:

- fixing SWIRL-E
- building real robot parts
- testing designs
- seeing consequences
- learning by experimenting

The game should not feel like:

- a textbook
- a quiz
- a generic browser interface
- an engineering dashboard for adults

The best Robot Lab moments should make a child think:

> "I built part of a robot, and now it works."

---

## Shared Chapter Pattern

Each chapter should follow the same broad pattern.

1. SWIRL-E has a visible problem.
2. Grandpa introduces the mission in simple language.
3. The player works with a physical-feeling robot subsystem.
4. The player experiments with parts, settings, or wiring.
5. The system gives immediate visual feedback.
6. Mistakes are safe, visible, and often funny.
7. A successful solution improves SWIRL-E in a meaningful way.
8. A short explanation reinforces the engineering idea after success.

---

## Interface Rules

These rules are especially important for Chapter 4 and later chapters, where the workbench can easily become too abstract or control-heavy.

### Left Sidebar

The left sidebar is for chapter-level support, not chapter science controls.

The left sidebar should contain:

- SWIRL-E portrait
- SWIRL-E speech or mission problem text
- outcome/action buttons such as Previous Chapter and Next Chapter
- Grandpa's Journal
- possibly Reset or Hub navigation, depending on chapter pattern

The left sidebar should not contain:

- gear choices
- voltage choices
- load choices
- science-specific sliders or controls
- primary mission controls

### Main Work Area

The main work area is where the science happens.

The main work area should contain:

- the physical subsystem being assembled or tested
- draggable parts
- live meters
- chapter-specific choices
- direct manipulation controls
- test/run buttons for that chapter

### Readability

Use readable fonts for body text, labels, and controls.

High-tech fonts may be used for short labels, but not for dense explanatory text. If a child needs to read it to understand the mission, it must be easy to read at normal app scale.

### Visual Feedback

Every important choice should produce visible feedback in the main work area.

If the player changes a gear ratio, they should see:

- gear motion relationship
- speed change
- torque/stress change
- runtime or battery change where relevant

If the player changes voltage, they should see:

- motor speed change
- battery drain/runtime change
- stress/heat change

---

## Existing Chapters

### Chapter 1 - Electricity

**Status:** Implemented.

**Story:** SWIRL-E's eye module needs power.

**Core ideas:**

- electricity flows through circuits
- components affect current flow
- too much current can damage parts
- correct circuit design matters

**Gameplay pattern:**

- player routes or places electrical components
- current flow is visualized
- wrong builds create visible failures
- correct build powers SWIRL-E's eyes safely

**Payoff:** SWIRL-E wakes up and can see.

---

### Chapter 2 - Optics

**Status:** Implemented.

**Story:** SWIRL-E's eyes have power, but his vision is blurry.

**Core ideas:**

- lenses bend light
- focus depends on alignment and distance
- blurry and sharp vision have physical causes

**Gameplay pattern:**

- player adjusts lens position or lens choice
- image clarity changes continuously
- correct alignment produces clear vision

**Payoff:** SWIRL-E can see clearly.

---

### Chapter 3 - Color Sensing

**Status:** Implemented.

**Story:** SWIRL-E can see shapes, but his colors are wrong.

**Core ideas:**

- color can be measured through RGB channels
- sensors can be miscalibrated
- sensing and interpretation are separate systems

**Gameplay pattern:**

- player uses a patchbay to route three scrambled physical sensors to the correct RGB output channels
- each sensor shows a greyscale thumbnail, helping the player infer which color filter it sees
- the visual scene changes in real time as wires and gain sliders change
- correct routing, with balanced gains, restores natural colors

**Payoff:** SWIRL-E can identify colors correctly.

---

### Chapter 4 - Shoulder Drive System

**Status:** Implemented.

**Story:** SWIRL-E can see and identify colors, but his shoulder drive still needs to learn which gear and power settings match real jobs.

**Core idea:** The player is not finding one hidden answer. They are teaching SWIRL-E's memory: for each lifting scenario, what gear ratio and voltage are a good match, and when is a load not safe for his arm at all?

**Gameplay pattern:**

- a real-world case is selected, such as carrying rice, lifting a toolbox, watering plants, or picking up light objects
- the case specifies weight and desired motion style in child-readable words
- the player chooses a gear ratio and voltage
- live indicators update as choices are made
- the animation shows gears, motor heat, shaft torque, arm speed, and a load being lifted
- successful cases are saved into SWIRL-E's memory
- the player must save a minimum number of case memories before Chapter 5 unlocks

**Payoff:** SWIRL-E learns how to choose shoulder-drive setups for different jobs.

---

### Chapter 5 - Wrist Balance (Control Systems)

**Status:** v1 implemented — iterate from spec below.

**Story:** SWIRL-E can lift things now (Chapter 4), but holding a tray level while moving is a different problem. Grandpa asks the child to help build SWIRL-E's **wrist balance module** — the parts that let him carry a glass of water without spilling. The lesson is not "tune mystery knobs." The lesson is **install real parts, wire them together, and discover what each one does**.

**Core idea:** Chapter 5 follows the same pattern as Chapter 1: the player adds physical components to empty slots, connects them with wires, and sees immediate consequences. Remove a part — behavior changes. Wire the sensor to the servo — the system can fight back. Add a shock absorber — the wobble dies down.

**Physical parts (real-world analogues):**

| Part | What it is | Real-world example |
|------|------------|-------------------|
| **Tilt sensor** | Measures tray orientation | Accelerometer / inclinometer module (e.g. WitMotion HWT9053 class — reports **pitch** and **roll** in degrees, plus angular rate from an internal gyro) |
| **Wrist servo** | Motor that tilts the hand to push the tray back toward level | Same family of servo motors introduced in Chapter 4 |
| **Shock absorber** | Mechanical damper at the wrist joint — resists *how fast* the tray swings | Car suspension damper / dashpot (viscous damping) |

**Important distinction — not an electromagnetic holding brake:** A power-off holding brake locks a joint when the robot loses power. That is a safety feature for a different lesson. The shock absorber in Chapter 5 is **motion damping while powered on** — it slows oscillation so the tray does not overshoot and wobble. In control terms this is the **derivative** term; in mechanical terms it is a **damper**, not a parking brake.

**Payoff:** SWIRL-E can carry a glass of water. The child can point at a tilt sensor on RobotShop and explain what it does, why a servo needs its signal, and why a damper stops wobble.

---

#### Visual layout — magnified wrist

The main graphic is a **close-up of SWIRL-E's hand holding a flat tray with a glass of water** — not a full-body delivery scene.

A small circle marks the wrist joint on the arm. A **larger exploded-view circle** elsewhere on screen connects to it with tangent lines (inset diagram / magnifying-glass effect). The large circle is the **workbench area**:

- empty **slots** for tilt sensor, wrist servo, and shock absorber
- large enough for touch targets on iPad
- wire connection points when sensor and servo are installed

Parts are dragged from a **parts tray** into slots. Any part can be **removed** at any time.

**The feedback loop must be visible on the hand, not just on the monitors.** This is the emotional payoff and the most important visualization in the chapter — the equivalent of the eyes lighting up in Chapter 1. When the servo corrects, the child must *see the wrist physically counter-rotate to fight the tilt* on the hand/tray graphic, with the tray swinging back toward level and the water settling. The monitors *confirm* what happened; they do not replace it. Build and tune the hero animation first; treat the ticker-tape graphs as secondary instrumentation.

---

#### Two operating modes

**Mode A — Force bench (primary teaching mode)**

Controlled laboratory. The player applies known disturbances and watches monitors.

- **Force buttons:** PUSH LEFT, PUSH RIGHT, PUSH FORWARD, PUSH BACKWARD
- **FORCE dial:** sets how strong each push is (small bump ↔ big bump)
- **Reset glass:** restores the water glass after spill or tip-over

Keep Mode A v1 to four direction buttons. Left/right maps cleanly to roll; forward/back maps cleanly to pitch. Vertical jolts can become an advanced slosh behavior later, but they should not compete with the first control-systems lesson.

Initially the wrist has **no components**. Pressing a force button applies an impulse to the arm; the tray tilts; water sloshes or the glass falls. The child sees what happens with no sensing and no correction.

**Mode B — Walk test (capstone)**

Same wrist assembly and physics as Mode A, but SWIRL-E walks along a path with bumps (similar to the current delivery-run concept, narrowed to the arm/tray close-up). Proves the assembly handles real motion and acceleration, not just bench pushes.

Mode A is where parts are installed and understood. Mode B unlocks after the guided build sequence (or when Grandpa says the wrist is ready).

---

#### Monitors — rolling ticker-tape graphs

All monitors share one visual language: **horizontal = time**, **vertical = amplitude**, scrolling like a ticker tape.

**Default to the minimum legible set — avoid the adult oscilloscope.** Showing wrist X/Y/Z (3 traces) plus sensor roll/pitch/tilt-speed (3) plus servo command (7 traces total) at once is exactly the "engineering dashboard for adults" the Interface Rules warn against. By default, show only three child-readable ideas: **bump**, **tilt**, and **pushback**. The bump monitor shows the axis the active push excites; the tilt monitor shows roll or pitch based on the active push; the servo monitor shows corrective command when the servo is wired. **Tilt speed and the full X/Y/Z breakdown are reveal-on-demand** (an "advanced" toggle), not on-screen by default. Three stacked graphs that each do one obvious thing beat one busy scope.

**1. Wrist monitor (always active)**

Shows the **active bump force/torque the wrist joint feels**. This answers: *"What did the bump do to the wrist?"*

- Force buttons produce visible impulses on the matching pitch or roll direction
- When amplitude crosses thresholds, water **sloshes and spills**
- When force/tilt exceeds a higher threshold, the **glass falls over**
- Installing a shock absorber changes the **shape** of these traces (peaks decay faster, less ring-out)

**2. Sensor monitors (active only when tilt sensor is installed)**

Shows what the sensor **measures** — not the same as wrist force.

Typical outputs for a module like the WitMotion HWT9053 (pitch/roll inclinometer with gyro):

| Channel | Meaning |
|---------|---------|
| **Roll** | Side-to-side tilt (°) — responds to PUSH LEFT / RIGHT |
| **Pitch** | Forward/back tilt (°) — responds to PUSH FORWARD / BACK, walking acceleration |
| **Tilt speed** (optional third trace) | How fast the tray is tipping (°/s) — from the gyro; foreshadows why damping matters |

With **no sensor installed**, these monitors are grey/disabled: *"Nothing is measuring tilt."*

**3. Servo monitor (active when wrist servo is installed and wired)**

Shows **command to the servo** — how hard it is pushing back. Makes the chain visible: sensor saw tilt → servo received signal → pushback happened.

---

#### Wiring

Reuse the Chapter 1 wiring interaction pattern (`LineDragManager` or equivalent):

```
[Tilt Sensor OUT] ──wire──► [Wrist Servo IN]
```

- Sensor installed but **not wired** → monitors show tilt, but tray still spills (*"It knows, but nothing is listening."*)
- Servo installed but **not wired** → no pushback
- Removing the sensor → servo has nothing to drive it

**Servo Strength dial — required in v1.** The servo slot has one **Servo Strength** dial (maps to proportional gain / spring stiffness). This is *not* optional, because it carries two core lessons: a strong servo overshoots and shakes, and — most importantly — it is what makes the shock absorber feel *necessary* rather than decorative. A child who never cranks the servo up never discovers why a damper matters. A well-behaved fixed servo would make the shock absorber pointless.

This dial is an experiment control, not the puzzle answer. Label it in child terms such as **Gentle / Strong / Too Strong**, and never make completion depend on finding a narrow numeric value. Outcomes should point back to the installed parts and wiring, not to a magic setting.

The shock absorber is **drop-in mechanical** — no dial required. Its effect is shown two ways: faster-settling traces on the wrist monitor, *and* a visible mechanical compression/rebound animation on the hero graphic so installing it earns the same satisfaction as wiring the sensor.

---

#### What each part teaches (add / remove experiments)

| Configuration | What the child discovers |
|---------------|-------------------------|
| No parts | Bump → wrist spikes → water spills. No robot can fix what it cannot sense or act on. |
| Sensor only | Sensor monitors wake up; tray still spills. **Sensing ≠ fixing.** |
| Sensor + servo, not wired | Same — measurement without action. |
| Sensor + servo, wired | Servo fights tilt; may still wobble or overshoot. |
| + Shock absorber | Wrist trace settles faster; less slosh. **Damping kills wobble.** |
| Remove sensor | Servo goes blind — pushback stops or becomes useless. |
| Remove shock | Ring-out returns on the wrist monitor. |

The player may install parts in **any order** during sandbox; guided missions introduce them one at a time.

---

#### Guided mission sequence (recommended)

The guided sequence is **the chapter**, not a tutorial wrapper around a sandbox. Each stage requires the child to *apply at least one bump and see the result* before advancing — the lesson is the contrast between stages, so a stage cannot be clicked through without being felt.

1. **Bare wrist** — force buttons, wrist monitor only. Child must apply a bump and see spill/fall before continuing.
2. **Install tilt sensor** — sensor monitors come alive; child bumps and sees it *still spills* (**sensing ≠ fixing**).
3. **Install wrist servo + wire sensor → servo** — child bumps and sees pushback begin; with the servo turned up it wobbles/overshoots.
4. **Install shock absorber** — child bumps and sees the wobble settle; compare wrist traces before/after.
5. **Try FORCE and Servo Strength** — small vs big bumps; gentle vs strong servo pushback; crank the servo high enough to feel shake, then let the shock tame it. This is a contrast step, not a precision-tuning challenge.
6. **Mode B walk test** — bumps in path; prove the assembly works in motion.

Mode B stays **locked until the child has experienced the key contrast states** (bare-wrist spill, sensor-only spill, and no-shock wobble) — see the Completion Rule. After guided missions: **free sandbox** — any part in any order, both modes.

---

#### Gameplay pattern (summary)

- close-up arm / hand / tray / water glass graphic with magnified wrist workbench
- parts tray: tilt sensor, wrist servo, shock absorber
- drag parts into slots; remove to undo
- wire sensor output to servo input
- Mode A force bench + FORCE dial + reset glass
- default rolling monitors: bump, tilt, and pushback; advanced traces hidden by default
- Mode B walk with bumps as capstone
- Grandpa's Journal explains pitch/roll, spring-vs-damper, and that the sensor fuses accelerometer + gyro (Kalman filter — optional vocabulary in journal only)

**Payoff:** The child understands a **feedback loop built from parts they can buy**: sensor tells → servo acts → shock keeps it from overdoing it.

---

## Chapter 4 Learning Goals

The player should learn:

- a motor can spin but still need gears to do useful work
- gears trade speed for lifting strength
- a quick gear can move light loads fast but may stall on heavy loads
- a strong gear can lift heavier loads but moves more slowly
- voltage changes motor power, speed, heat, and runtime
- motor heat and shaft torque are related engineering concerns, but they are not the same thing
- the arm assembly has its own torque rating, so some jobs are unsafe even if the motor and gears could move the load
- engineers classify jobs and remember working setups instead of guessing every time

The chapter intentionally includes more than one kind of successful reasoning:

- choose a working gear and power pair for a safe case
- choose a less wasteful voltage when multiple voltages can work
- reject unsafe cases that exceed SWIRL-E's arm torque rating

---

## Chapter 4 Physics Model

The model is qualitative and child-facing, but it must stay internally consistent.

### Gear Ratios

Current gear cartridges:

| Gear | Child Label | Behavior | Best Use |
|------|-------------|----------|----------|
| 1:3 | Quick Gear | Arm turns 3x for every 1 motor turn | very light objects that should move quickly |
| 1:1 | Fast Gear | motor and arm turn together | light, fast jobs |
| 3:1 | Balanced Gear | motor turns 3x for every 1 arm turn | everyday jobs |
| 6:1 | Strong Gear | motor turns 6x for every 1 arm turn | heavy, slow jobs |

Important: the gear ratio changes the motor's ability to lift and the arm's speed. It does **not** change the load torque placed on SWIRL-E's main arm shaft by a given weight. A 7 kg load creates the same arm-shaft load torque regardless of whether the player selected 1:1 or 3:1 gears.

### Voltage Choices

Current voltage choices:

| Voltage | Meaning |
|---------|---------|
| 3V | gentle, slower, better runtime |
| 6V | balanced default |
| 9V | faster and stronger, drains faster and can create more heat |

Low voltage should tend toward slow movement or stall before it creates confusing "too hot" failures. Heat is shown as a motor condition, while torque is shown as a shaft/load condition.

### Torque Rating

SWIRL-E's arm has a maximum torque rating. The current UI shows:

- maximum arm torque rating: **22 N m**
- equivalent: about **16.2 ft lb**
- approximate maximum load at SWIRL-E's arm length: about **20 kg**

If a case exceeds the arm torque rating, the correct answer is to mark the case as **Not safe for SWIRL-E**. The strongest motor/gear setup may still move the load, but the arm assembly should not be asked to carry it.

---

## Chapter 4 Scenario Memory

Chapter 4 is framed as adding entries to SWIRL-E's memory.

The game tracks solved case IDs in local storage under Chapter 4 task memory. Case memory persists across visits until the player chooses **Start Over**.

Current behavior:

- the case picker lists all scenarios and marks solved ones with a check
- **Pick Unsolved** chooses a random unsolved scenario when possible
- after all scenarios are solved, random selection may repeat any scenario
- **Start Over** clears the solved-case memory
- Chapter 5 is locked until the player has saved the required number of Chapter 4 memories
- the current required count is **4 saved memories**

The required-progress indicator must be visible on both:

- the shoulder-drive workbench screen
- the test/result screen

The progress display should say plainly how many memories have been saved and how many are still needed before Chapter 5.

---

## Chapter 4 Interface Layout

### Left Sidebar

The left sidebar follows Chapters 1-3 and remains for chapter support:

- SWIRL-E portrait
- SWIRL-E speech / mission reminder
- previous and next chapter actions after unlock
- Grandpa's Journal

The left sidebar should not contain gear choices, voltage choices, case controls, or test controls.

### Main Work Area

The main work area is divided by concept, not by implementation convenience.

#### Case Controls

The case row contains controls that affect which job SWIRL-E is learning:

- case dropdown
- **Pick Unsolved**
- **Not safe for SWIRL-E**
- **Start Over**

The **Not safe for SWIRL-E** action belongs with the case controls because it is the answer for overload cases, not a motor setup button.

#### Mission Progress

A constant progress strip appears below the case row:

- filled pips for saved Chapter 4 memories
- text such as `2/4 memories saved`
- text such as `2 more cases to unlock Chapter 5`
- success state once Chapter 5 is unlocked

This must remain visible during both setup and test/result phases.

#### Status Board

The setup screen has a constant status board across the top. It updates immediately as the player chooses gear and power.

Current indicators:

- **Motor Heat**: Low / Acceptable / Stall or Hot
- **Weight**: the current case's target weight
- **Gears**: selected ratio and lift capability
- **Speed**: selected arm speed compared with the case need
- **Torque**: load torque in N m, compared with the 22 N m arm rating

Partial setup states should be explicit:

- if gear is selected but voltage is not, affected indicators say **Waiting on voltage...**
- if voltage is selected but gear is not, affected indicators say **Waiting on gears...**
- partial states should be visually noticeable, using the yellow warning language

#### Setup Controls

Gear ratio and voltage are peer decisions and should be presented as one setup panel:

- **1. Gear Ratio**
- **2. Power**
- **Clear Current Choices**
- arm torque rating
- **Test It**

Gear choices should not appear as a wide mostly blank list. Voltage choices should not be isolated in a disconnected right sidebar. Both are part of building SWIRL-E's shoulder setup.

#### Animation Area

The motor animation should carry the lesson visually. It should show:

- motor body and heat indicator
- main shaft
- selected gear pair
- gear rotation relationship
- color-coded shaft torque
- lift rail / arm output
- visible load being raised
- load weight label on or near the load

When the load reaches the top of its travel, the animation loops from the bottom.

---

## Chapter 4 Outcomes

Chapter 4 supports these outcomes:

- **Success:** setup lifts the load with acceptable heat, torque, and speed for the case
- **Stall:** motor cannot lift the load with the selected setup
- **Too Hot:** motor heat is outside the safe/acceptable range
- **Mismatch:** setup moves, but speed does not match the case need
- **Unsafe Load:** case exceeds SWIRL-E's arm torque rating, so the correct response is to refuse the lift

Failure feedback should be visible and recoverable. The player should be able to run the test again or return to the setup panel and choose different parts.

Success creates a memory card showing:

- task
- selected drive, or no safe drive for overload cases
- result
- why the setup worked or why the load was unsafe
- progress toward the Chapter 5 unlock

---

## Chapter 4 Completion Rule

Chapter 4 is mission-complete only after the player saves the required number of scenario memories.

Current rule:

- save **4** Chapter 4 memories to unlock Chapter 5

Doing one scenario is intentionally not enough. The child needs repeated practice across different case types so the lesson becomes classification and engineering judgment, not a one-answer puzzle.

When the requirement is not met, the final result card should encourage teaching another job instead of enabling Chapter 5. Once the requirement is met, Chapter 5 navigation becomes available.

---

## Chapter 5 Learning Goals

The player should learn:

- a **tilt sensor** measures orientation (pitch and roll) — it does not fix anything by itself
- a **wrist servo** can push the tray back toward level — but only if it receives the sensor signal (wire connected)
- a **shock absorber** slows wobble so the tray does not overshoot — visible on the wrist force graph as faster settling
- **sensing, acting, and damping are three different jobs** — removing any one breaks the system in a predictable way
- external force (bump, push, walking acceleration) tilts the tray; the **wrist monitor** shows what the joint feels; the **sensor monitors** show what the robot knows
- more servo strength reacts faster but can overshoot; damping must match (same spring–damper intuition as car suspension)
- sensors are never instant — a small delay between tilt and correction can cause shaking if the servo pushes too hard (Grandpa's Journal, after the child has felt it)

These are the real lessons of feedback control — taught through **parts and wires**, not abstract slider labels. PID vocabulary stays in Grandpa's Journal for parents and older kids.

---

## Chapter 5 Physics Model

The simulation must stay internally consistent and map cleanly onto the physical parts.

### Disturbances

Two sources of disturbance:

1. **Mode A — impulse forces** — four directional pushes scaled by the FORCE dial; applied to the wrist/arm assembly.
2. **Mode B — path motion** — walking velocity and wheel bumps produce inertial forces and chassis tilt (acceleration tilts the water even when the arm tries to stay level).

### Wrist dynamics

The tray behaves like a wrist-mounted load with inertia, slosh, optional active correction, and optional damping:

- bumps and walking motion disturb the wrist and tray
- gravity pulls the tray and water away from level after a disturbance
- **wrist servo** applies corrective torque when installed, wired, and driven by sensor data (proportional response — spring-like)
- **shock absorber** applies damping torque opposing angular velocity (damper — resists *speed* of tilt, not position)
- sensor delay (~0.1 s) is modeled when sensor + servo are wired — too much servo strength with delay produces oscillation

### Monitors vs physics

| Monitor | Physical quantity |
|---------|-------------------|
| Bump / wrist force | Active force or torque at the joint from the current push, bump, gravity, and reaction |
| Sensor roll / pitch | Orientation angles (degrees) from accelerometer fusion |
| Sensor tilt speed | Angular rate (gyro) |
| Servo command | Torque requested by the control loop |

Spill when tilt + slosh exceed cup rim; glass tips when tilt or lateral force exceeds tip threshold.

### Lemonade → water

Use a **glass of water** on the tray (clearer stakes than lemonade for this chapter). Slosh is a damped oscillator driven by tray motion. Reset button restores the glass.

### Component gating

Physics and monitors respect installed parts:

- no sensor → sensor monitors disabled; servo has no input unless manually driven (it should not be)
- no servo → no corrective torque
- no wire → sensor reads but servo does not act
- no shock → underdamped response; visible ring-out on wrist monitor

---

## Chapter 5 Interface Layout

### Scene & routing

Per the GCU scene-naming convention, Chapter 5 uses a concept-specific scene, not a generic one:

- **File / class:** `BalanceMissionScene.js` → `class BalanceMissionScene extends Scene`
- **Scene ID:** `robot-lab-balance`
- Register it in `games/robot-lab/data/chapters.js` (the single source of truth for chapter order and routing) alongside the existing `robot-lab-circuit`, `robot-lab-optics`, `robot-lab-color`, and `robot-lab-motor`. No scene hardcodes another scene's ID — all navigation reads from `chapters.js`.

### Left Sidebar

Same as Chapters 1–4:

- SWIRL-E portrait and speech
- Previous / Next chapter navigation
- Grandpa's Journal

No science controls in the sidebar.

### Main Work Area

#### Hero graphic

- robotic hand + flat tray + water glass
- small wrist circle on arm + **magnified exploded wrist view** with slots

#### Parts tray

Draggable: tilt sensor, wrist servo, shock absorber.

#### Wire area

Connection points on sensor OUT and servo IN when both are installed. Reuse Chapter 1 wire-drag UX.

#### Mode toggle

- **Force bench** (Mode A)
- **Walk test** (Mode B) — locked until guided progress or explicit unlock

#### Force bench controls (Mode A)

- four direction buttons
- FORCE dial
- Reset glass

#### Monitors

Stacked or tabbed rolling graphs, with a simple default view:

- Bump monitor — always on, shows the active push/bump
- Tilt monitor — when sensor installed, shows roll or pitch for the current disturbance
- Pushback monitor — when servo installed and wired
- Advanced traces — optional reveal for full X/Y/Z, roll + pitch together, and tilt speed

#### On servo slot (required)

- **Servo Strength** dial (proportional gain) — required in v1 as a Gentle / Strong / Too Strong experiment control; see the Wiring section for why.

---

## Chapter 5 Outcomes

Failures are visible on monitors and in the water glass:

- **Spill** — force/tilt exceeded rim; wrist and sensor traces show why
- **Glass tipped** — larger disturbance or uncorrected tilt
- **Wobble** — servo wired, no shock (or too little); wrist trace rings
- **Shake** — servo too strong with sensor delay; growing oscillation
- **No response** — sensor or wire missing; sensor reads but tray falls anyway
- **Success** — tray recovers; wrist trace settles; water stays in glass

Each outcome should name **which part** to think about, not a magic slider value.

---

## Chapter 5 Completion Rule

**Target rule (rebuild):**

Completion is the **guided build sequence**, not a one-shot assembly. The "install all three parts and pass one walk" shortcut is **rejected** — a child could brute-force it without ever discovering what each part does. The lesson lives in the *contrast* between configurations, so the gate is built from those contrasts:

1. Experience the **bare-wrist spill** (bump with no parts).
2. Experience the **sensor-only spill** (sensor installed, still spills — *sensing ≠ fixing*).
3. Experience **no-shock wobble** (sensor + wired servo, ring-out on the wrist trace).
4. Install the **shock absorber** and bring a bump back to **Success** (tray recovers, water stays in).
5. Then — and only then — Mode B unlocks. Pass the **Mode B walk test** with all three parts installed and wired to complete the chapter.

Steps 1–3 are the discovery; steps 4–5 are the proof. Each of 1–4 requires an actual bump to register, not just a part placement. Mode B is the capstone, gated behind the contrast states above.

Legacy rule (three lemonade delivery courses) is **retired** with the rebuild. Progress persists in local storage until **Start Over**.

---

# Later Chapter Concepts

The following chapter concepts remain high-level and can be refined as earlier chapters stabilize.

## Chapter 6 - Sound

**Purpose:** Teach that sound is a physical signal that can be sensed, amplified, and interpreted.

**Story:** SWIRL-E can see and move, but he cannot hear properly.

**Core ideas:**

- microphones detect sound
- signals can be amplified
- too much gain causes distortion or feedback
- sound has pitch, loudness, and pattern

---

## Chapter 7 - Logic

**Purpose:** Teach that behavior can be built from rules, conditions, and simple decisions.

**Story:** SWIRL-E has sensors, but he does not know what to do with the information yet.

**Core ideas:**

- rules can drive behavior
- conditions lead to actions
- simple logic can create useful robot behavior

---

## Chapter 8 - Navigation

**Purpose:** Teach that moving through the world requires sensing, planning, and obstacle handling.

**Story:** SWIRL-E can think now, but he still gets lost or bumps into things.

**Core ideas:**

- paths can be planned
- obstacles require rerouting
- sensing and motion must work together

---

## Chapter 9 - Power Management

**Purpose:** Teach that energy is limited and must be used wisely.

**Story:** SWIRL-E works now, but he runs out of power too quickly or wastes energy.

**Core ideas:**

- batteries store limited energy
- systems consume different amounts of power
- efficiency matters
- engineering requires tradeoffs

---

## Chapter 10 - System Integration

**Purpose:** Teach that a real robot is many subsystems working together.

**Story:** SWIRL-E now has all his major subsystems, but they need to work together for a real mission.

**Core ideas:**

- a robot is a system of systems
- one weak subsystem can affect the whole robot
- engineering is integration, not just isolated parts

---

## Difficulty Progression

Difficulty should increase by:

- adding one new idea at a time
- increasing integration between systems
- reducing hand-holding gradually
- preserving visual clarity
- keeping cause and effect visible

The game should never become abstract too quickly.

---

## Tone

Every chapter should feel like:

- SWIRL-E is improving
- the child is helping
- engineering is playful
- mistakes are interesting
- discovery is rewarding

The child should feel:

> "I am building a robot."

not:

> "I am taking a lesson."
