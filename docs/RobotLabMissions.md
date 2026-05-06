# Robot Lab Missions

## Curriculum And Development Guide

**Project:** Grandpa's Creative Universe (GCU)  
**Module:** Robot Lab  
**Primary audience:** children old enough to follow guided experimentation, roughly 8-12 for the deeper Robot Lab chapters  
**Product target:** iPad first, iPhone second, standalone app experience  
**Current implementation status:** Chapters 1-3 are implemented. Chapter 4 needs a redesign before further implementation.

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

These rules are especially important after the Chapter 4 prototype drifted away from the established pattern.

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

- player adjusts RGB channel gains
- the visual scene changes in real time
- correct tuning restores natural colors

**Payoff:** SWIRL-E can identify colors correctly.

---

# Chapter 4 - Shoulder Motion System

## Redesign Status

The existing Chapter 4 prototype should be considered a rough experiment, not the final design.

The current prototype has several problems:

- it feels like an abstract gear puzzle instead of SWIRL-E's shoulder system
- science controls were placed in the sidebar, unlike Chapters 1-3
- the mission target was vague
- "speed 0.70x" style targets are not meaningful to children
- randomized hidden answers make the task feel arbitrary
- the gear test rig is not clearly connected to SWIRL-E's actual arm
- the interface asks the player to find a right answer instead of making an engineering design choice

The redesigned chapter should be built around this idea:

> "Help choose and install SWIRL-E's shoulder drive so his arm has the strength, speed, and battery life we want."

---

## Chapter 4 Learning Goals

The player should learn:

- a motor spins fast but may not be strong enough by itself
- gears trade speed for strength
- a high gear ratio gives more lifting strength but slower movement
- a low gear ratio gives faster movement but less lifting strength
- higher voltage can make a motor faster or stronger, but increases heat/stress and drains the battery faster
- engineers choose parts based on the job the robot needs to do
- there may be several working designs, each with tradeoffs

The chapter should avoid presenting gear selection as a hidden answer. Instead, it should let the player choose a design goal and then build toward it.

---

## Chapter 4 Story

SWIRL-E can see and identify colors now, but his left arm is not ready.

Grandpa explains:

> "SWIRL-E's shoulder motor spins, but we have to decide what kind of arm he needs. Should he be strong and slow, balanced, or fast and light?"

The player is not just tuning a test rig. The player is designing SWIRL-E's shoulder drive.

The final test should show the result on SWIRL-E's real arm or on a clearly labeled shoulder module that visibly belongs to SWIRL-E.

---

## Chapter 4 Interface Layout

### Left Sidebar

Follow Chapters 1-3.

Left sidebar should include:

- SWIRL-E portrait
- SWIRL-E speech bubble
- short mission reminder
- Grandpa's Journal
- Previous Chapter / Next Chapter after success
- Hub navigation through the normal chapter topbar

Left sidebar should not include:

- strength selection
- gear selection
- voltage selection
- battery/runtime selection
- test controls

### Main Work Area

The main work area should be the **Shoulder Drive Workbench**.

It should show:

- SWIRL-E shoulder module or cutaway
- motor
- gear cartridge area
- battery/motor power connector
- arm or test arm connected to the shoulder
- load/lift test target
- monitors around the workbench

The workbench should feel like the player is building a physical subsystem, not filling out a form.

---

## Chapter 4 Proposed Mission Flow

Chapter 4 should be broken into clear steps. Each step should focus on one decision.

## Step 1 - Choose The Arm Job

The player first chooses what kind of arm SWIRL-E should have.

Prompt:

> "What kind of arm should we build for SWIRL-E?"

Suggested choices:

### Strong Arm

- Lift target: **15 kg / 33 lb**
- Speed: slow
- Use case: carrying heavy things carefully
- Child-friendly examples:
  - large bag of rice
  - heavy toolbox
  - packed suitcase
  - small dog-sized weight, if presented carefully and not as something to lift unsafely

### Balanced Arm

- Lift target: **10 kg / 22 lb**
- Speed: normal
- Use case: useful everyday lifting
- Child-friendly examples:
  - loaded school backpack
  - grocery bag with several bottles
  - stack of books

### Fast Arm

- Lift target: **7 kg / 15 lb**
- Speed: fast
- Use case: quick movements with lighter objects
- Child-friendly examples:
  - light backpack
  - several full water bottles
  - small box of toys

Important: this is not a quiz. The player is choosing a design personality for SWIRL-E's arm.

The interface should make the tradeoff obvious:

- Strong means more lifting power, slower movement.
- Fast means quicker movement, less lifting power.
- Balanced is in the middle.

### Step 1 UI

Use three large cards in the main work area.

Each card should show:

- name
- weight target in kg and lb
- speed word: Slow / Normal / Fast
- simple illustrated object comparison
- small icon or meter showing strength vs speed

Do not use abstract units like "0.70x" here.

---

## Step 2 - Choose The Gear Cartridge

After the arm job is selected, the player chooses a gear cartridge for the shoulder.

This is where the gear teaching happens.

The player should see gear sets as physical cartridges or bench-mounted gear pairs, not just buttons.

Suggested gear sets:

### 1:1 Fast Gear

- Teeth: 24T motor gear -> 24T arm gear
- Ratio: 1:1
- Behavior: motor and arm gear turn at the same speed
- Strength: lowest
- Speed: highest
- Best for: light load and fast movement

### 3:1 Balanced Gear

- Teeth: 12T motor gear -> 36T arm gear
- Ratio: 3:1
- Behavior: motor turns 3 times for 1 arm turn
- Strength: medium
- Speed: medium
- Best for: normal load and everyday use

### 6:1 Strong Gear

- Teeth: 8T motor gear -> 48T arm gear
- Ratio: 6:1
- Behavior: motor turns 6 times for 1 arm turn
- Strength: highest
- Speed: lowest
- Best for: heavy load and low stress

### Gear Rating Labels

The gear cards should show child-readable labels first, and engineering labels second.

Example:

- "Strongest, slowest"
- "6 motor turns = 1 arm turn"
- "Best for heavy lifting"

If a torque rating is displayed, it should be explained or visually paired with a load rating. Avoid unexplained labels like "7.5 N*m max" unless Grandpa's Journal or a tooltip explains what it means.

### Gear Motion Display

Each gear card should show:

- the two gears meshing correctly
- actual tooth count or visibly proportional teeth
- a red or high-contrast clock hand on each gear
- slow idle rotation on the selected gear set

The point of the clock hands is to show:

- in 1:1, both gears turn the same amount
- in 3:1, the motor gear turns 3 times for 1 arm turn
- in 6:1, the motor gear turns 6 times for 1 arm turn

### Step 2 Feedback Monitors

When the player selects a gear, the workbench monitors should update:

- Lift capacity
- Arm speed
- Motor stress
- Battery runtime estimate
- Gear ratio

Use words and simple values:

- "Lift capacity: 15 kg"
- "Arm speed: Slow"
- "Motor stress: Green"
- "Battery: 35 minutes"
- "Gear ratio: 6:1"

Avoid "0.17x" unless it is secondary information inside a detailed readout.

---

## Step 3 - Choose Voltage / Runtime Tradeoff

After the gear is selected, the player chooses how to power the shoulder motor.

The player should understand:

- lower voltage usually means slower motion and longer battery life
- higher voltage can mean faster motion but more heat/stress and shorter battery life
- some combinations cannot lift the chosen load

Suggested voltage choices:

### Low Power

- 3V
- slower
- longest runtime
- may stall on heavy jobs

### Normal Power

- 6V
- normal speed
- balanced runtime
- good default

### High Power

- 9V
- faster
- shortest runtime
- may overheat or slam the arm if the gear is too fast

### Battery And Runtime Model

Keep the model simple and qualitative. It only needs to be mechanically honest enough for learning.

Suggested inputs:

- selected load target
- selected gear ratio
- selected voltage
- motor stress
- estimated runtime

Suggested outputs:

- Can lift? Yes / Barely / No
- Stress: Green / Yellow / Red
- Lift time: seconds
- Runtime: minutes before recharge
- Motor heat: Cool / Warm / Hot

Example monitor text:

- "Lift: Yes"
- "Lift time: 5 sec"
- "Runtime: 28 min"
- "Motor stress: Green"
- "Motor heat: Warm"

Do not require exact real-world motor engineering. The important lesson is the tradeoff.

---

## Step 4 - Install The Shoulder Drive

Once the player has chosen the arm job, gear cartridge, and voltage, the chapter becomes a physical assembly task.

The player should:

- drag the selected gear cartridge into SWIRL-E's shoulder
- connect the motor power wire to the chosen voltage port
- connect the battery or arm power plug
- press a test button

This makes the chapter feel like building SWIRL-E, not merely selecting options.

### Required Visual Assets

This step will likely need new generated images.

Needed asset concepts:

- SWIRL-E with exposed left shoulder module
- close-up shoulder motor bay
- empty gear cartridge slot
- gear cartridges on the bench
- battery pack / arm power pack
- voltage connector ports
- test load hanging from SWIRL-E's hand or test hook
- successful arm lift pose
- funny failure poses if needed

The existing generated-image workflow should be used: each image should have an associated prompt file, similar to Puzzle Forest.

---

## Step 5 - Run The Arm Test

The final test should visibly connect to SWIRL-E.

Preferred version:

- SWIRL-E's left arm is visible
- shoulder shell is open
- selected gear cartridge is installed
- wires run from battery/power panel to shoulder
- load hangs from SWIRL-E's hand or test hook
- arm raises the selected load

Fallback version:

- a clearly labeled "SWIRL-E Shoulder Module" test rig is visible
- the module is visually connected to SWIRL-E by cable or placement
- the test arm is explicitly his shoulder actuator, not an unrelated abstract arm

### Test Outcomes

There should not be one hidden correct answer. Instead, outcomes should reflect the design.

Possible outcomes:

- **Success:** arm lifts the selected load with acceptable stress and runtime.
- **Stall:** too little torque; arm hums but does not lift.
- **Too Hot:** it lifts but motor stress/heat is red.
- **Too Slow:** it lifts, but movement is too slow for the chosen arm job.
- **Too Fast:** arm lifts too quickly and wobbles or bumps the stop.
- **Short Runtime:** works, but battery drains quickly.

The player should be able to revise choices after seeing the outcome.

---

## Feedback Monitors

Chapter 4 needs visible monitors integrated into the workbench, not a separate adult-looking dashboard.

Recommended monitors:

### Gear Ratio Monitor

Shows:

- selected ratio
- motor turns per arm turn
- simple animated diagram

Example:

> "3 motor turns = 1 arm turn"

### Lift Capacity Monitor

Shows:

- target load
- selected setup capacity
- green/yellow/red status

Example:

> "Target: 10 kg"
> "Setup: 12 kg capacity"

### Motor Stress Monitor

Shows:

- green/yellow/red
- stress color on the physical motor/gear/arm area

Do not only show stress in a side box. The stressed part should glow or tint.

### Speed Monitor

Use human-readable speed:

- Slow
- Normal
- Fast

Optionally include lift time:

- "Lift time: 6 sec"

### Runtime Monitor

Shows estimated battery life:

- "Runtime: 28 min"

This makes voltage and gear choices meaningful.

### Heat Monitor

Shows:

- Cool
- Warm
- Hot

Heat can be visually represented with:

- blue/green glow for cool/OK
- yellow glow for warm
- red glow and small heat shimmer for hot

---

## Stress Visualization

Stress means:

> how hard the motor and gear train are working compared with what they can safely provide.

Stress should appear on the physical system:

- motor casing
- motor gear
- gear teeth contact area
- arm joint
- shoulder bracket
- power wire or heat indicator

Suggested color language:

- **Green:** OK, comfortable
- **Yellow:** working hard, acceptable for short use
- **Red:** overloaded, too hot, likely stall or damage

Stress should appear during:

- manual dragging
- motor test
- final arm lift

Stress should not only be text.

---

## SWIRL-E Connection

This chapter must visibly answer:

> "How does this help SWIRL-E?"

Ways to make that clear:

- show SWIRL-E's open shoulder, not just an abstract bench
- label the work area "SWIRL-E Left Shoulder Drive"
- show the selected gear cartridge being installed into his shoulder
- show wires running from the power panel into the shoulder
- after a successful test, show SWIRL-E using the arm
- use SWIRL-E speech to connect the task to his body

Example SWIRL-E lines:

- "That gear will make my arm stronger, but slower."
- "My motor is getting warm with that setup."
- "This one feels fast, but I cannot lift much."
- "That feels right for my shoulder."

---

## Chapter 4 Proposed Screen Sequence

### Screen A - Mission Briefing

SWIRL-E:

> "My shoulder motor spins, but I need the right gears so my arm can do useful work."

Grandpa:

> "First choose what kind of arm SWIRL-E needs. Then install the gears and power setting to match."

### Screen B - Choose Arm Job

Main area shows three large choice cards:

- Strong Arm: 15 kg / 33 lb, slow
- Balanced Arm: 10 kg / 22 lb, normal
- Fast Arm: 7 kg / 15 lb, fast

### Screen C - Gear Bench

Main area shows:

- selected arm job summary
- three gear cartridges
- animated gear relationship
- monitors updating live

### Screen D - Power And Runtime

Main area shows:

- voltage ports or battery settings
- runtime monitor
- heat/stress monitor
- lift time estimate

### Screen E - Assembly

Player drags:

- gear cartridge into shoulder slot
- wire to selected voltage port
- battery/arm connector into place

### Screen F - Run Test

SWIRL-E or shoulder module raises the test load.

Outcome is visual and explanatory.

### Screen G - Success Summary

Show:

- chosen arm job
- chosen gear ratio
- chosen voltage
- lift capacity
- lift speed
- runtime estimate

Then unlock next chapter.

---

## Open Design Questions

These should be agreed before implementation.

1. Should Step 1 be a permanent choice for SWIRL-E's arm personality, or just a mission challenge that can be changed freely?
2. Should the player be required to install the exact matching gear, or should several designs pass with different tradeoffs?
3. Should voltage selection happen before or after gear installation?
4. Should runtime be required for success, or just a tradeoff shown to the player?
5. Should the final lift happen on SWIRL-E's full visible body, or in a close-up shoulder module?
6. What level of numeric detail is right for the target age: kg/lb only, or kg/lb plus torque and runtime?
7. Should the chapter include one final mission, or three mini-missions for Fast/Balanced/Strong arms?

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
