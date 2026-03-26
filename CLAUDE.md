# CLAUDE.md — Grandpa's Creative Universe

## Working Directory

**This directory (`gcu/`) is the repository root.** All GCU code, docs, assets, and games live here.
- `core/`, `hub/`, `games/`, `assets/`, `docs/` are all at the top level.
- `CharacterSheets/` is at the repo root and contains the source of truth for kid avatars.

All paths in this document are relative to the repo root (this directory).

---

## Project Overview

Grandpa's Creative Universe (GCU) is a multi-game educational platform for children ages 2–12, targeting iPad (primary), iPhone, and desktop browsers. It is built as a single Capacitor-wrapped iOS app containing multiple game modules that share a common core engine.

The project is created by a grandfather (Steve) for his five grandchildren: JR (10), Kaila (9), Alanna (4), Leon (4), and Andre (2). It is designed to feel warm, capable, and Pixar-quality — never chaotic, never arcade-like, never dopamine-addicted.

---

## Tech Stack

- **Language:** Vanilla JavaScript (ES modules), HTML5, CSS3
- **Frameworks:** None. No React, no Vue, no jQuery. Pure vanilla.
- **Deployment:** Capacitor 5+ wrapping web code in a native iOS WKWebView
- **Storage:** Capacitor Preferences plugin (production) with localStorage fallback (development)
- **Audio:** Web Audio API with iOS unlock pattern
- **Canvas:** HTML5 Canvas API for painting/drawing surfaces
- **Fonts:** Self-hosted .woff2 files (no CDN dependency — app must work offline)
- **Build tools:** None required for web code. Capacitor CLI + Xcode for iOS builds.

---

## Directory Structure

```
/                              # Repo root (this directory)
├── CLAUDE.md                  # This file — read first
├── package.json               # Node project for Capacitor CLI
├── capacitor.config.ts        # Capacitor configuration
├── index.html                 # Entry point — loads hub
│
├── core/                      # Shared engine — used by ALL games
│   ├── input/
│   │   ├── DragManager.js     # iOS-safe drag and drop (HTML elements)
│   │   ├── LineDragManager.js # Draw a line between named SVG points (wiring, connections)
│   │   ├── TapManager.js      # Tap handling with debounce
│   │   └── index.js
│   ├── audio/
│   │   ├── AudioManager.js    # Sound playback + iOS unlock
│   │   └── index.js
│   ├── storage/
│   │   ├── GameStorage.js     # Capacitor Preferences + localStorage
│   │   └── index.js
│   ├── scene/
│   │   ├── SceneManager.js    # State machine for screens
│   │   ├── Scene.js           # Base scene class
│   │   └── index.js
│   ├── animation/
│   │   ├── animate.js         # CSS animation triggers
│   │   ├── spring.js          # Spring physics
│   │   ├── particles.js       # Confetti, sparkles, splats
│   │   └── index.js
│   ├── layout/
│   │   ├── LayoutManager.js   # Device detection, orientation, safe areas
│   │   ├── base.css           # Foundation CSS (safe areas, resets, variables)
│   │   └── index.js
│   ├── rewards/
│   │   ├── celebrate.js       # Celebration effects (small/medium/large)
│   │   └── index.js
│   ├── progress/
│   │   ├── ProgressManager.js # Per-game chapter/level progress persistence
│   │   ├── ChapterPicker.js   # Chapter-select overlay UI (reusable across games)
│   │   └── index.js
│   ├── avatar/
│   │   ├── AvatarDisplay.js   # Character video/image display
│   │   └── index.js
│   ├── journal/
│   │   ├── JournalPage.js     # Grandpa's notebook page component
│   │   └── index.js
│   └── utils/
│       ├── EventBus.js        # Pub/sub messaging
│       ├── color.js           # HSL/RGB conversion, mixing, comparison
│       ├── device.js          # Platform detection
│       ├── dom.js             # Safe DOM helpers
│       ├── easing.js          # Easing functions
│       └── index.js
│
├── hub/                       # Universe Hub — game launcher
│   ├── scenes/
│   │   └── HubScene.js
│   ├── assets/
│   └── index.js
│
├── games/                     # Individual game modules
│   ├── art-studio/
│   │   ├── scenes/
│   │   ├── components/
│   │   ├── engine/            # Color mixing algorithm
│   │   ├── missions/
│   │   ├── assets/
│   │   ├── css/
│   │   └── index.js
│   │
│   ├── robot-lab/
│   │   ├── scenes/
│   │   ├── components/
│   │   ├── engine/            # Circuit graph engine
│   │   ├── missions/
│   │   ├── assets/
│   │   ├── css/
│   │   └── index.js
│   │
│   ├── supermatch3/
│   │   ├── scenes/
│   │   ├── components/
│   │   ├── engine/            # Card matching logic
│   │   ├── levels/
│   │   ├── assets/
│   │   ├── css/
│   │   └── index.js
│   │
│   └── puzzle-forest/         # Future
│       └── ...
│
├── assets/                    # Global shared assets
│   ├── fonts/                 # .woff2 font files (self-hosted)
│   ├── audio/                 # Shared sound effects
│   ├── avatars/               # Character images/videos
│   └── images/                # Shared UI images
│
├── ios/                       # Generated by Capacitor — add to .gitignore when created
│
└── docs/                      # Design documents
    ├── GrandpasCreativeUniverse.md          # Overall vision and philosophy (v1.1)
    ├── GrandpasRobotLab-v1.0.md             # Robot Lab — vision + Chapter 1 build spec ✅
    ├── RobotLabMissions.md                  # Robot Lab curriculum for all 10 chapters
    ├── GrandpasArtStudio-BuildSpec-v1.1.md  # Art Studio build spec
    ├── PuzzleForest-Spec-v1.0.md            # Puzzle Forest spec
    └── CoreEngine-Spec.md                   # Shared engine architecture
```

---

## Critical iOS Rules

These are non-negotiable. Violating any of these will cause bugs on iPad/iPhone.

### Touch Handling
- **NEVER use HTML5 Drag and Drop API.** It does not work on iOS.
- **ALWAYS implement custom touch via `touchstart`, `touchmove`, `touchend`.**
- **ALWAYS use `{ passive: false }` on touch listeners that call `preventDefault()`.**
- **ALWAYS call `e.preventDefault()` on `touchstart` and `touchmove`** for drag interactions to prevent Safari from scrolling, zooming, or rubber-banding.
- **Use `e.changedTouches[0]` on `touchend`**, not `e.touches[0]` (which is empty because the finger lifted).
- **Minimum touch target size: 60px** for children. Apple HIG says 44pt minimum; we add margin for kid fingers.
- **Set `touch-action: none`** on all draggable elements and drop targets.

### Viewport & Safe Areas
- **ALWAYS include this viewport meta tag:**
  ```html
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  ```
- **ALWAYS use `env(safe-area-inset-*)` padding** on the root app container to avoid notch, home indicator, and rounded corners.
- **ALWAYS set `position: fixed` on `html` and `body`** with `overflow: hidden` and `overscroll-behavior: none`.

### CSS & Animation
- **ONLY animate `transform` and `opacity`** for smooth 60fps on iOS. These are GPU-composited.
- **NEVER animate `box-shadow`, `border-radius`, `filter`, `width`, `height`, `top`, `left`** during gameplay — they trigger CPU repaints.
- **Use `will-change: transform`** on elements that animate frequently. Remove it when animation completes.
- **NEVER use `setInterval` for animation.** Always use `requestAnimationFrame` or CSS `@keyframes`.

### Text & Selection
- **Disable text selection globally:** `-webkit-user-select: none; user-select: none;`
- **Disable callout on long-press:** `-webkit-touch-callout: none;`
- **Disable tap highlight:** `-webkit-tap-highlight-color: transparent;`

### Audio
- **iOS requires a user gesture to unlock audio.** On the first tap in the app (e.g., "Enter" button on title screen), create the `AudioContext` and play a silent buffer. Only after this will any sound playback work.
- **Use Web Audio API, not `<audio>` elements.** Web Audio is more reliable in WKWebView.
- **Store audio files as `.mp3`** — universally supported in iOS WKWebView.

### Canvas (Painting/Drawing)
- **ALWAYS scale canvas for Retina displays:**
  ```javascript
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  ```
- Without this, canvas content looks blurry on iPad and iPhone.

### Fonts
- **Self-host all fonts as `.woff2` in `assets/fonts/`.** Do NOT use Google Fonts CDN — the app must work offline.
- **Preload critical fonts** to avoid flash of unstyled text.

### No Hover
- **NEVER use `:hover` for essential interactions.** iOS has "sticky hover" that will make things look broken.
- **Wrap hover styles in `@media (hover: hover)`** for desktop-only enhancement.
- **Use `:active` for touch feedback** on buttons and interactive elements.

---

## Coding Conventions

### JavaScript
- ES modules (`import`/`export`), not CommonJS
- No `var` — use `const` by default, `let` when reassignment is needed
- No classes for simple utilities — plain functions and objects
- Classes for stateful systems (SceneManager, AudioManager, DragManager)
- No `this` in non-class contexts
- Descriptive function and variable names — this codebase is maintained by AI and humans together, clarity wins
- JSDoc comments on all public functions

### CSS
- CSS custom properties (variables) for all shared values (colors, spacing, fonts)
- Mobile-first responsive design — base styles are phone, `@media` adds tablet/desktop
- BEM-lite naming: `.mission-panel`, `.mission-panel__title`, `.mission-panel--complete`
- No CSS-in-JS. Stylesheets only.
- Each game has its own CSS file(s). Core has `base.css` loaded by all games.

### File Organization
- One class/module per file
- `index.js` in each directory re-exports public API
- Game-specific code NEVER imports from another game — only from `core/`
- Assets are co-located with their game module, not in a global bucket (except truly shared assets like fonts and avatar videos)

### Scene & File Naming Conventions

Every game that has more than one mission/gameplay scene must use **concept-specific names** — never generic ones like `MissionScene.js`.

**File names:** `[Concept]MissionScene.js`
- `CircuitMissionScene.js` — Robot Lab Ch1 (electricity / circuit wiring)
- `OpticsMissionScene.js` — Robot Lab Ch2 (lens / optics)
- Future: `ColorMissionScene.js`, `MotorMissionScene.js`, etc.

**Class names:** Match the file name exactly.
```javascript
export class CircuitMissionScene extends Scene { ... }
export class OpticsMissionScene  extends Scene { ... }
```

**Scene IDs** registered with `SceneManager` use the pattern `[game]-[concept]`:
```javascript
sceneManager.register('robot-lab-title',   new TitleScene(...));
sceneManager.register('robot-lab-circuit', new CircuitMissionScene(...));
sceneManager.register('robot-lab-optics',  new OpticsMissionScene(...));
// future: 'robot-lab-color', 'robot-lab-motors', etc.
```

**Game chapter routing tables** (`data/chapters.js` per game) are the single source of truth for scene IDs. Every scene that needs to navigate to another chapter imports from there — never hardcodes a scene ID string.

**Single-scene games** (Art Studio currently has one mission type) may keep the name `MissionScene.js` until a second mission type is added, at which point both should be renamed to concept-specific names.

### Error Handling
- Storage operations always have try/catch with fallback defaults
- Audio failures are silent (game works without sound)
- Never let an error crash the game — catch at system boundaries, log, continue

---

## Code Organization Guardrails

These rules prevent the most common structural mistakes. They are **non-negotiable**.

### The Golden Rule: core/ vs games/

```
core/    — code that any game could use today or in the future
games/   — code that is exclusively used by one specific game
```

**If you write something that could be useful to more than one game, it goes in `core/` — period.**

Before placing any new file under `games/[game]/`, ask: *"Is there any other game that could ever use this?"*

- Yes → put it in `core/` under the appropriate subdirectory
- No → put it under `games/[game]/`

### What belongs in core/

| Capability | Directory |
|---|---|
| Touch input — drag, tap, line-drawing | `core/input/` |
| Audio playback, iOS unlock | `core/audio/` |
| Save / load game state | `core/storage/` |
| Scene transitions | `core/scene/` |
| Particles, spring physics, animation helpers | `core/animation/` |
| Safe areas, responsive layout | `core/layout/` |
| Celebration effects | `core/rewards/` |
| Chapter/level progress persistence | `core/progress/` |
| Avatar display | `core/avatar/` |
| Grandpa's journal / hint UI | `core/journal/` |
| EventBus, color math, easing, device detection | `core/utils/` |

### What belongs in games/[game]/

| Capability | Directory |
|---|---|
| Game-specific simulation logic | `games/[game]/engine/` |
| Game-specific SVG/canvas rendering | `games/[game]/renderer/` |
| Game scenes (title, gameplay, results) | `games/[game]/scenes/` |
| Chapter/level data definitions | `games/[game]/missions/` or `games/[game]/data/` |
| Game-specific assets | `games/[game]/assets/` |
| Game-specific CSS | `games/[game]/css/` |
| Procedural audio specific to one game | `games/[game]/audio/` |

### No duplication of shared data

If a piece of data (like a chapter list) is used by more than one file, it must live in **one canonical location** and be imported everywhere else. Never copy-paste constants across files.

Robot Lab pattern to follow: `games/robot-lab/data/chapters.js` is the single source of truth for the chapter list and scene routing. All scenes import from it.

---

## How to Add a New Game

1. Create directory: `games/my-new-game/`
2. Create entry point: `games/my-new-game/index.js`
3. Import core systems you need:
   ```javascript
   import { SceneManager } from '../../core/scene/index.js';
   import { AudioManager } from '../../core/audio/index.js';
   import { GameStorage } from '../../core/storage/index.js';
   import { DragManager } from '../../core/input/index.js';
   ```
4. Create scenes in `games/my-new-game/scenes/`
5. Register your game in `hub/scenes/HubScene.js`
6. Add game-specific CSS in `games/my-new-game/css/`
7. Add game-specific assets in `games/my-new-game/assets/`

---

## Storage Key Convention

All stored data uses namespaced keys:

```
grandpa:{game-id}:{key}     — Game-specific data
grandpa:global:{key}         — Cross-game data (avatar, audio settings)
```

Examples:
```
grandpa:art-studio:progress
grandpa:art-studio:sandbox-paintings
grandpa:robot-lab:progress
grandpa:robot-lab:saved-circuits
grandpa:supermatch3:high-scores
grandpa:global:selected-avatar
grandpa:global:audio-muted
```

---

## Scene Lifecycle

Every scene follows this pattern:

```javascript
class MyScene extends Scene {
  enter(container, data) {
    // Called when scene becomes active
    // - Build DOM and append to container
    // - Attach event listeners
    // - Start animations
    // - data = optional payload from previous scene
  }

  exit(container) {
    // Called when leaving this scene
    // - Remove event listeners
    // - Stop animations
    // - Clean up DOM (container will be cleared by SceneManager)
  }
}
```

SceneManager clears the container between transitions. Scenes should not leave orphaned listeners or timers.

---

## Development Workflow

### Day-to-Day

```bash
# Serve locally for browser development
npx http-server . -p 8080 -c-1

# Open in browser — use Chrome DevTools device emulation for iPad/iPhone sizes
# ALSO test in Safari — it renders differently from Chrome and is closer to iOS

# Files are vanilla HTML/CSS/JS — no build step needed, just save and refresh
```

### Testing on iOS Device/Simulator

```bash
# Sync web code to iOS project
npx cap sync ios

# Open Xcode
npx cap open ios

# In Xcode: select target device/simulator, hit Run (Cmd+R)
```

### Live Reload During Development

```bash
# Start local server
npx http-server . -p 8080 -c-1

# Temporarily update capacitor.config.ts:
#   server: { url: 'http://YOUR_IP:8080', cleartext: true }

# Sync and run — app on device loads from your dev server
npx cap sync ios && npx cap open ios

# IMPORTANT: Remove server.url before production builds
```

### Testing Checklist

Before any milestone, verify on:
- [ ] Desktop Chrome (device emulation for quick iteration)
- [ ] Desktop Safari (closest to iOS rendering)
- [ ] iPad simulator — landscape layout, touch, safe areas
- [ ] iPhone simulator — portrait layout, safe areas, notch
- [ ] Real iPad if available — actual touch feel, performance
- [ ] Real iPhone if available — safe areas, home indicator

---

## Build Order (Recommended)

When building the project from scratch, follow this order:

### Phase 1: Core Engine Foundation
1. `core/layout/` — base.css, LayoutManager, safe areas, viewport
2. `core/scene/` — SceneManager, Scene base class
3. `core/input/` — DragManager, TapManager (test on touch device EARLY)
4. `core/storage/` — GameStorage with Capacitor + localStorage dual path
5. `core/audio/` — AudioManager with iOS unlock
6. `core/animation/` — animate, particles, spring
7. `core/utils/` — EventBus, color utilities, device detection
8. `core/rewards/` — celebrate effects
9. `core/journal/` — JournalPage component
10. `core/avatar/` — AvatarDisplay (can be placeholder initially)

### Phase 2: Hub
11. `hub/` — Game launcher with doors/portals to each game
12. Capacitor project setup — `cap init`, `cap add ios`, first Xcode build

### Phase 3: First Game (Art Studio recommended — simplest interaction model)
13. Art Studio title scene
14. Art Studio color mixing engine
15. Art Studio mission scene with drag-to-mix
16. Art Studio missions 1–6
17. Art Studio sandbox mode
18. Art Studio painting reveal

### Phase 4: Second Game (SuperMatch3 or Robot Lab)
19. Port existing SuperMatch3 codebase into the GCU structure, or
20. Build Robot Lab circuit engine and first 3 chapters

### Phase 5: Polish & Distribution
21. Cross-game features (shared avatar, progress in hub)
22. TestFlight distribution for family testing
23. App Store submission if desired

---

## Design Principles (For Claude to Internalize)

These are the emotional and design principles that guide every decision:

1. **The child is the hero, not Grandpa, not the game.** The most important moment is "I figured this out myself."

2. **No auto-solving.** If something doesn't work, show the child WHERE it's broken, not HOW to fix it. Debugging is the lesson.

3. **Fun and mastery coexist.** This is not an arcade. It's not a textbook. It's a workshop where serious capability is built through play.

4. **One concept at a time.** Never introduce multiple abstractions simultaneously. Each mission teaches exactly one thing.

5. **Visible state.** Children should SEE what's happening — power flowing through wires, colors blending, cards flipping. Make the invisible visible.

6. **Touch-first, child-sized.** Everything must work with a child's finger on a glass screen. 60px minimum targets. Generous forgiveness zones. No precision required.

7. **Warm, not loud.** The aesthetic is cozy workshop, not Times Square. Pixar quality means considered and polished, not flashy and busy.

8. **Progress accumulates.** The robot remembers its capabilities. The painting fills in. Achievements are permanent and visible. The child sees how far they've come.

9. **Sandbox follows structure.** Guided missions first, then creative freedom. Children earn their tools, then use them however they want.

10. **Works on iPad.** This is the immovable constraint. Every decision must be validated on actual iOS hardware.

---

## Performance Targets

- **60fps** during all touch interactions and animations on iPad Air (baseline device)
- **< 200 visible DOM nodes** during active gameplay
- **< 3 second** cold launch to interactive title screen
- **< 50KB** per audio file
- **Canvas undo history:** max 10 states (each Retina snapshot is ~12MB)
- **Total app bundle:** under 50MB (keeps App Store download fast)

---

## Key Documents

Read these for full context on any game or system:

| Document | Location | Purpose |
|----------|----------|---------|
| Creative Universe Vision | `docs/GrandpasCreativeUniverse.md` | Overall vision, philosophy, all modules (v1.1) |
| Robot Lab Spec | `docs/GrandpasRobotLab-v1.0.md` | Vision + Chapter 1 full implementation as built |
| Robot Lab Curriculum | `docs/RobotLabMissions.md` | Learning arc and mission design for all 10 chapters |
| Art Studio Spec | `docs/GrandpasArtStudio-BuildSpec-v1.1.md` | Art Studio full implementation spec |
| Puzzle Forest Spec | `docs/PuzzleForest-Spec-v1.0.md` | Puzzle Forest product vision + implementation plan |
| Core Engine Spec | `docs/CoreEngine-Spec.md` | Shared engine architecture and API design |

---

## Grandchildren Reference

This context matters for design decisions:

| Name | Age | Interests | Primary Games |
|------|-----|-----------|---------------|
| JR (John Ross) | 10 | Puzzles, Rubik's cubes, KiwiCo robotics, sports | Robot Lab, Puzzle Forest |
| Kaila | 9 | Art, wants to build a robot | Art Studio, Robot Lab |
| Alanna | 4 | Gymnastics, learns fast from siblings | Gym Arena, SuperMatch3, Puzzle Forest |
| Leon | 4 | — | SuperMatch3, Puzzle Forest |
| Andre | 2 | — | SuperMatch3 (Tier 1 tap & react) |

Games must scale from "tap and something happens" (Andre, 2) to "multi-condition logic gates" (JR, 10) using the same engine at different depth levels.

## Avoid Usage Errors
Avoid doing things that result in errors such as this:

API Error: Claude's response exceeded the 32000 output token maximum. To configure this behavior, set the
     CLAUDE_CODE_MAX_OUTPUT_TOKENS environment variable.

Please consider the expected results of the operations you do and break them up into smaller tasks if you think they could result in errors like this.
