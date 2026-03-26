# Puzzle Forest
## Product & Build Specification v1.1

**Project:** Grandpa's Creative Universe (GCU)
**Module:** Puzzle Forest
**Audience:** Primarily ages 2–4, with some content suitable through age 5
**Primary Devices:** iPad first, iPhone second
**Author:** Steve Mansour
**Last Updated:** March 2026

---

# 1. Overview

Puzzle Forest is an early-childhood interactive learning game within Grandpa's Creative Universe. It is designed for very young children who are not yet reading, or are only beginning to recognize words. The game focuses on foundational cognitive skills through short, tactile, highly visual activities.

Unlike quiz-style apps that rely primarily on tapping the correct answer, Puzzle Forest emphasizes **dragging, placing, sorting, matching, and assembling**.

The goal is to make the child feel as though they are moving toys and helping friendly characters within a playful forest world.

Puzzle Forest should feel like **play**, not school.

---

# 2. Core Design Goals

## 2.1 Tactile Interaction

Children should manipulate objects directly: drag, drop, place, sort, and assemble. Direct manipulation is the primary interaction method.

## 2.2 No Reading Required

All instructions must be understandable without reading. Communication happens through voice prompts, animation, visual cues, and character gestures. Text may exist but should never be required.

## 2.3 Very Short Puzzle Cycles

Young children have short attention spans. Target puzzle completion time: **3–8 seconds**. Each session should contain multiple short puzzles.

## 2.4 Joyful Feedback

Correct interactions trigger satisfying feedback: sound effects, character reactions, animation, small celebrations, and progress indicators. Success should feel rewarding.

## 2.5 Gentle Failure

Incorrect actions should never feel punishing. Instead: the object gently returns, the character gives a playful reaction, and the child is encouraged to try again.

## 2.6 Reusable Puzzle Mechanics

Puzzle Forest is built from reusable mechanics that allow rapid creation of new content. Core interaction patterns are reused across many puzzles.

---

# 3. Target Audience

| Range | Age |
|-------|-----|
| Primary | 2–4 years old |
| Secondary | 4–5 years old |

The interface assumes limited fine motor control and minimal reading ability.

---

# 4. Visual Theme

The setting is a magical forest filled with friendly animals and colorful objects.

Environment elements: trees, mushrooms, ponds, flowers, nests, rocks, berries, tree stumps.

Characters should be friendly, expressive, and welcoming.

**Guide character: Nutty the Squirrel**
Nutty introduces puzzles and celebrates success.

---

# 5. Core Interaction Mechanics

## 5.1 Drag and Drop

Children drag objects to a target location. When near the correct location the object snaps into place.

## 5.2 Magnetic Snap

Objects automatically snap to targets when close. This prevents frustration due to imprecise touches.

Snap distance should be forgiving: **80–120px**.

```
if distance(object, target) < SNAP_DISTANCE
  snapToTarget(object, target)
```

## 5.3 Animated Feedback

Objects should feel playful. Possible animations: bounce, wiggle, sparkle, spin, pop.

- Correct placement: wiggle + snap + celebration sound
- Incorrect placement: gentle slide back to origin

## 5.4 Audio Prompts

Each puzzle begins with spoken instructions (e.g. *"Can you feed the bunny?"*). Voice prompts are required since many players cannot read.

---

# 6. Puzzle Types

## 6.1 Feed the Animal

Children drag food to the correct animal.

| Food | Animal |
|------|--------|
| Carrot | Bunny |
| Bone | Dog |
| Banana | Monkey |

Correct result: animal eats, happy animation, sound effect.

## 6.2 Color Sorting

Children drag objects into color-coded baskets.

| Object | Basket |
|--------|--------|
| Apple | Red |
| Frog | Green |
| Blueberry | Blue |
| Banana | Yellow |

## 6.3 Shape Matching

Classic toddler shape-sorter. Shapes are dragged into matching holes: circle, square, triangle, star.

## 6.4 Build the Animal

Children assemble an animal from parts (e.g. bear head, bear body, bear legs). Pieces snap into place in sequence.

## 6.5 Parent and Baby Matching *(future)*

Children match baby animals to their parents (lamb → sheep, calf → cow, chick → chicken). Teaches classification and vocabulary.

---

# 7. Session Flow

Puzzle Forest should open to an **activity picker**, not a fixed linear campaign. Young children often prefer to repeat the same kind of play rather than move through a long arc of varied levels.

The child first chooses the kind of puzzle they want to play:

- Feed the Animal
- Color Sorting
- Shape Matching
- Build the Animal

After choosing a category, the child plays a short **mission run** of that same puzzle type. A mission run should usually contain **6–8 micro-puzzles**. When the run ends, the child gets a bigger celebration and returns to the activity picker so they can choose the same activity again or switch to another one.

**Overall flow:**

```
enter Puzzle Forest
show activity picker
child chooses activity
play 6–8 short puzzles in that category
show big celebration
return to activity picker
```

**Standard puzzle flow inside a mission:**

```
load puzzle
play voice prompt
child drags object
snap to target
check result
show reward / gentle fail
load next puzzle in same category
```

---

# 8. Audio Design

Audio is critical for engagement at this age.

| Category | Examples |
|----------|---------|
| Voice instructions | "Can you feed the bunny?" |
| Correct answer sounds | ding! chime! |
| Gentle incorrect sounds | boing! soft thud |
| Animal sounds | moo, meow, oink |
| Environmental ambience | forest sounds, wind |

---

# 9. UI Requirements

| Requirement | Value |
|-------------|-------|
| Minimum touch target size | **120px** |
| Layout | Large objects, well spaced, never crowded |
| Reading required | Never |
| Fine motor precision required | Never — snap zones are forgiving |

---

# 10. Technical Architecture

Puzzle Forest reuses the **GCU Core Engine**. It does not duplicate any system that core already provides.

## 10.1 Directory Structure

```
games/puzzle-forest/
├── index.js               # Entry point — registers scenes
├── scenes/
│   ├── PuzzleScene.js     # Main gameplay scene for a selected category mission
│   └── TitleScene.js      # Activity picker / intro scene
├── engine/
│   ├── PuzzleManager.js   # Puzzle state machine
│   ├── SnapManager.js     # Proximity detection + snap
│   └── PuzzleLoader.js    # Loads puzzle definitions from JSON
├── puzzles/
│   └── puzzles.json       # All puzzle definitions
├── assets/
│   ├── images/            # Animals, food, shapes, forest backgrounds
│   └── audio/             # Voice prompts, sound effects
└── css/
    └── puzzle-forest.css
```

**Core systems reused from `core/`:**

| Need | Core Module |
|------|------------|
| Drag and drop | `core/input/DragManager.js` |
| Audio playback | `core/audio/AudioManager.js` |
| Scene management | `core/scene/SceneManager.js` |
| Celebration effects | `core/rewards/celebrate.js` |
| Storage | `core/storage/GameStorage.js` |

## 10.2 Puzzle Manager

Controls puzzle logic.

```javascript
startMission(categoryId)    // prepare a short mission run for the chosen category
loadPuzzle(id)              // load puzzle definition, play voice prompt
checkPlacement(object, target)  // returns true/false
puzzleComplete()            // trigger reward, queue next puzzle
missionComplete()           // trigger end-of-run celebration and return data
```

## 10.3 Snap Manager

```javascript
// Called on every drag update
checkSnapTargets(object, targets)  // returns nearest valid target or null
snapToTarget(object, target)       // animate + lock in place
```

## 10.4 Puzzle Loader

Reads `puzzles.json` and returns puzzle definitions by ID or category.

---

# 11. Puzzle Definition Format

Puzzles are data-driven. Each puzzle is a JSON object:

```json
{
  "id": "feed_bunny",
  "type": "feedAnimal",
  "promptAudio": "feed_bunny.mp3",
  "targets": [
    {
      "id": "bunny",
      "accepts": ["carrot"]
    }
  ],
  "objects": ["carrot", "apple", "cookie"]
}
```

This allows many puzzles to be created quickly without writing new code.

---

# 12. Initial Content Plan

**Launch target: 4 playable categories with 6+ puzzles each**

| Category | Suggested Count |
|----------|-----------------|
| Feed the Animal | 6–8 |
| Color Sorting | 6–8 |
| Shape Matching | 6–8 |
| Build the Animal | 6–8 |

The child does not need to complete categories in a fixed order. Categories are repeatable and selectable from the activity picker every time they enter Puzzle Forest.

---

# 13. Implementation Steps

Build in this order:

1. Create `games/puzzle-forest/` directory structure
2. Implement `SnapManager.js` — proximity detection and snap animation
3. Implement `PuzzleManager.js` — state machine (load → prompt → drag → check → reward → next)
4. Implement `PuzzleLoader.js` — reads `puzzles.json`
5. Create `PuzzleScene.js` — wires all systems together, renders one category mission run
6. Create `TitleScene.js` — activity picker with Nutty the Squirrel
7. Create `puzzles.json` with category-grouped puzzle content across all four launch activities
8. Add assets — animal images, food images, shape images, audio prompts
9. Register game in `hub/scenes/HubScene.js`

---

# 14. Performance Goals

- **60 fps** on iPad and iPhone
- Animations use `transform` and `opacity` only (GPU-composited)
- No `setInterval` — use `requestAnimationFrame` or CSS `@keyframes`

---

# 15. Future Expansion

Possible future puzzle categories:

- Sound matching (hear a sound, find the animal)
- Simple counting
- Number recognition
- Pattern completion
- Memory matching

---

# 16. GCU Integration

Puzzle Forest should feel like part of the larger GCU world:

- Shared avatar system (selected grandchild appears in hub portal)
- Shared reward system via `core/rewards/celebrate.js`
- Grandpa narration between sessions
- Progress tracked via `GameStorage` under `grandpa:puzzle-forest:progress`

---

# 17. Success Criteria

Puzzle Forest succeeds if:

- Toddlers can play independently without adult explanation
- Children can easily choose a favorite activity and repeat it
- Puzzles require no reading or fine motor precision
- Drag interactions feel natural and forgiving
- Puzzle cycles complete in 3–8 seconds
- Children want to repeat puzzles
- Interactions feel like playing with toys, not taking a test
