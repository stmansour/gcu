# Robot Lab Missions

## Curriculum And Development Guide

**Project:** Grandpa's Creative Universe (GCU)  
**Module:** Robot Lab  
**Primary audience:** children old enough to follow guided experimentation, roughly 8-12 for the deeper Robot Lab chapters  
**Product target:** iPad first, iPhone second, standalone app experience  
**Current implementation status:** Chapters 1-4 are implemented. Chapter 4 is the Shoulder Drive mission and now uses scenario memory, gear/power setup choices, live status indicators, and a minimum-completion gate before Chapter 5.

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

# Later Chapter Concepts

The following chapter concepts remain high-level and can be refined after Chapter 4 is stable.

## Chapter 5 - Control Systems

**Purpose:** Teach that movement and stability often require feedback and adjustment.

**Story:** SWIRL-E can move, but he is clumsy. He overcorrects, wobbles, or falls over.

**Core ideas:**

- sensors can detect motion and position
- feedback can correct movement
- too much correction causes oscillation
- too little correction causes drift

**Possible missions:**

- tune head stabilization
- keep SWIRL-E standing
- steady a camera while he moves

---

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
