# Grandpa's Creative Universe — Core Engine Specification
### Version 1.0 — Shared Infrastructure

---

## Why a Core Engine?

Every game in Grandpa's Creative Universe shares the same fundamental needs. Without a shared engine, each game reimplements touch handling, audio management, state persistence, animations, and iOS workarounds independently. That means bugs get fixed in one game but not another, and every new game starts from zero.

The core engine is the foundation that all games build on. Think of it like a house's electrical and plumbing — each room (game) has different furniture, but they all share the same wiring.

---

## What the Core Engine Provides

```
@grandpa/core
├── input/          # Touch and mouse handling (iOS-safe)
├── audio/          # Sound playback with iOS unlock
├── storage/        # Save/load state (browser + Capacitor)
├── scene/          # Screen/state machine management
├── animation/      # GPU-accelerated animation utilities
├── layout/         # Safe area handling, responsive breakpoints
├── rewards/        # Celebration effects, confetti, sparkles
├── avatar/         # Grandpa + character display system
├── journal/        # Grandpa's journal/hint system
└── utils/          # Timers, easing functions, color math, event bus
```

---

## Module Details

### 1. Input System (`core/input/`)

Unified touch and mouse handling that works identically on iPad, iPhone, and desktop.

**What it provides:**
- `DragManager` — Handles drag-and-drop with iOS-safe touch events
- `TapManager` — Handles taps with debounce, no 300ms delay
- `GestureDetector` — Optional: swipe, pinch, long-press detection
- Automatic `passive: false` and `preventDefault()` where needed
- Normalizes touch vs mouse coordinates into a single `{x, y}` point
- Configurable hit testing (circular, rectangular, custom regions)
- Forgiveness zones for child-sized fingers (configurable radius expansion)

**Key API surface:**

```javascript
import { DragManager, TapManager } from '@grandpa/core/input';

// Drag and drop
const drag = new DragManager(containerElement, {
  dragSelector: '.draggable',           // What can be dragged
  dropTargets: ['.mixing-well', '.slot'], // Where things can be dropped
  forgiveness: 1.3,                      // 30% larger hit zone
  onDragStart: (item, point) => {},
  onDragMove: (item, point, overTarget) => {},
  onDrop: (item, target, point) => {},
  onDropMiss: (item, point) => {},
  cloneStyle: { scale: 1.1, zIndex: 9999 }
});

// Taps
const tap = new TapManager(containerElement, {
  tapSelector: '.button',
  onTap: (element, point) => {},
  minSize: 60  // Minimum 60px touch target enforcement
});
```

**Games using it:** All of them. SuperMatch3 uses it for card taps. Art Studio uses it for paint blob dragging. Robot Lab uses it for wiring components.

---

### 2. Audio System (`core/audio/`)

Sound playback that handles iOS's AudioContext unlock requirement.

**What it provides:**
- `AudioManager` singleton — one audio context for the whole app
- Automatic unlock on first user interaction
- Preloading and caching of sound files
- Categories: `sfx`, `music`, `voice` with independent volume
- Global mute toggle (persisted in storage)
- Graceful failure — game works silently if audio fails

**Key API surface:**

```javascript
import { AudioManager } from '@grandpa/core/audio';

const audio = AudioManager.getInstance();

// Unlock must be called from a user gesture handler (tap/click)
audio.unlock();

// Preload sounds
await audio.load('splat', 'assets/audio/splat.mp3', 'sfx');
await audio.load('chime', 'assets/audio/chime.mp3', 'sfx');

// Play
audio.play('splat');
audio.play('chime', { volume: 0.7 });

// Mute
audio.setMuted(true);
audio.isMuted(); // true
```

**Games using it:** All of them. Same sound effects (celebrations, chimes) reused across games.

---

### 3. Storage System (`core/storage/`)

Persistent state that works in browser (development) and Capacitor (production).

**What it provides:**
- `GameStorage` — key-value store abstracted over localStorage and Capacitor Preferences
- Automatic serialization/deserialization (JSON)
- Namespaced keys per game (prevents collisions)
- Save/load with error handling and fallback defaults
- Migration support (for when data schema changes between versions)

**Key API surface:**

```javascript
import { GameStorage } from '@grandpa/core/storage';

const storage = new GameStorage('art-studio'); // namespace

// Save
await storage.set('progress', { currentMission: 3, completed: [0, 1, 2] });

// Load (with default if not found)
const progress = await storage.get('progress', { currentMission: 0, completed: [] });

// Delete
await storage.remove('progress');

// Clear all data for this game
await storage.clear();
```

**Storage key structure:**
```
grandpa:art-studio:progress
grandpa:art-studio:settings
grandpa:robot-lab:progress
grandpa:robot-lab:circuits
grandpa:supermatch3:scores
grandpa:global:avatar
grandpa:global:audio-settings
```

**Games using it:** All of them. Global settings (avatar choice, audio mute) shared across games.

---

### 4. Scene Manager (`core/scene/`)

State machine that manages screens and transitions between them.

**What it provides:**
- `SceneManager` — registers scenes, handles transitions
- Each scene has `enter()`, `update()`, `exit()` lifecycle hooks
- Transition animations (fade, slide, custom)
- Scene stacking (overlay a modal on top of active scene)
- Back navigation (return to previous scene)

**Key API surface:**

```javascript
import { SceneManager, Scene } from '@grandpa/core/scene';

class TitleScene extends Scene {
  enter(container) {
    // Build DOM, attach listeners
    container.innerHTML = '<div class="title">...</div>';
  }

  exit(container) {
    // Cleanup listeners
  }
}

class MissionScene extends Scene {
  enter(container, data) {
    // data = { missionId: 2 } passed from previous scene
    this.missionId = data.missionId;
  }
}

const scenes = new SceneManager(document.getElementById('app'));
scenes.register('title', new TitleScene());
scenes.register('mission', new MissionScene());

// Navigate
scenes.go('title');
scenes.go('mission', { missionId: 2 }, { transition: 'fade', duration: 400 });
scenes.back(); // return to title
```

**Games using it:** All of them. Every game has title → gameplay → results → sandbox flow.

---

### 5. Animation Utilities (`core/animation/`)

GPU-accelerated animation helpers that stay smooth on iOS.

**What it provides:**
- `animate()` — Promise-based CSS animation trigger
- `spring()` — Spring physics for pop-in effects
- `particles()` — Particle burst system (confetti, sparkles, splats)
- `transition()` — Smooth property transitions via CSS
- Easing functions (easeOutBack, easeOutElastic, easeInOutCubic)
- `requestAnimationFrame` loop manager

**Key API surface:**

```javascript
import { animate, spring, particles } from '@grandpa/core/animation';

// CSS keyframe animation with promise
await animate(element, 'bounce-in', { duration: 400, easing: 'ease-out' });

// Spring animation (for pop-in effects like SuperMatch3 cards)
spring(element, {
  from: { scale: 0, opacity: 0 },
  to: { scale: 1, opacity: 1 },
  stiffness: 200,
  damping: 15
});

// Particle burst at a point
particles({
  origin: { x: 300, y: 200 },
  count: 12,
  colors: ['#FF5555', '#55FF55', '#5555FF'],
  type: 'confetti',    // or 'sparkle', 'splat', 'star'
  duration: 800,
  container: document.getElementById('app')
});
```

**Rules enforced internally:**
- Only animates `transform` and `opacity` (GPU-composited on iOS)
- Auto-applies `will-change` before animation, removes after
- Never uses `setInterval` — always `requestAnimationFrame`
- Particle DOM nodes are recycled, not created/destroyed

**Games using it:** All of them. SuperMatch3 card flips. Art Studio splats. Robot Lab power flow glows. Celebration effects everywhere.

---

### 6. Layout System (`core/layout/`)

Responsive layout and iOS safe area management.

**What it provides:**
- `LayoutManager` — detects device type, orientation, safe areas
- CSS custom properties injected at runtime for safe areas
- Breakpoint detection (phone-portrait, phone-landscape, tablet-portrait, tablet-landscape, desktop)
- Orientation lock via Capacitor
- Viewport resize handler (handles iOS Safari toolbar appearing/disappearing)

**Key API surface:**

```javascript
import { LayoutManager } from '@grandpa/core/layout';

const layout = LayoutManager.getInstance();

layout.device;       // 'ipad' | 'iphone' | 'desktop'
layout.orientation;  // 'landscape' | 'portrait'
layout.breakpoint;   // 'tablet-landscape' | 'phone-portrait' | etc.

layout.onBreakpointChange((bp) => {
  // Rearrange UI for new breakpoint
});

// Lock orientation (Capacitor only)
await layout.lockOrientation('landscape');

// Get safe area values (pixels)
layout.safeArea; // { top: 0, bottom: 34, left: 0, right: 0 }
```

**Shared CSS foundation:**

```css
/* core/layout/base.css — imported by every game */

:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left: env(safe-area-inset-left, 0px);
  --safe-right: env(safe-area-inset-right, 0px);

  /* Touch target minimum — enforced throughout */
  --touch-min: 60px;

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
}

html, body {
  position: fixed;
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;
}

* {
  -webkit-user-select: none;
  user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}

#app {
  position: fixed;
  inset: 0;
  padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left);
}
```

---

### 7. Reward System (`core/rewards/`)

Shared celebration effects used across all games.

**What it provides:**
- `celebrate()` — Triggers a celebration sequence
- Configurable intensity: `small` (sparkle), `medium` (confetti), `large` (full-screen celebration)
- Sound integration (auto-plays celebration sound via AudioManager)
- Reusable across all games — same "you did it!" feeling everywhere

**Key API surface:**

```javascript
import { celebrate } from '@grandpa/core/rewards';

// Small win — sparkle at a point
celebrate('small', { origin: { x: 200, y: 300 } });

// Medium win — confetti burst
celebrate('medium', { origin: { x: 400, y: 200 }, colors: ['#FFD700', '#FF6B6B'] });

// Big win — full-screen celebration
celebrate('large', {
  duration: 2500,
  message: 'Amazing!',
  onComplete: () => { /* transition to next scene */ }
});
```

---

### 8. Avatar System (`core/avatar/`)

Character display and animation system shared across the universe.

**What it provides:**
- `AvatarDisplay` — Shows character video/image in a designated area
- Supports the spinning 3D avatar videos (VEO-generated)
- Corner companion mode (small avatar in corner during gameplay)
- Celebration popup mode (avatar cheers on success)
- Animation library: idle, point, cheer, think, clap, wave, dance, thumbs-up
- Per-child avatar selection that persists globally

**Games using it:** All of them. The avatar appears in the corner during gameplay, cheers on wins, points at hints.

---

### 9. Journal System (`core/journal/`)

Grandpa's hint/narrative system used across all games.

**What it provides:**
- `JournalPage` — Styled worn-notebook page component
- Handwriting font rendering
- Supports text, sketches (inline SVG), and failed-attempt notes
- Entry animation (page flip / fade in)
- Used for mission introductions, hints, and milestone notes

**Games using it:** Robot Lab (Grandpa's workshop notes), Art Studio (Grandpa's painting notes), potentially Puzzle Forest and Gym Arena.

---

### 10. Utilities (`core/utils/`)

Shared helper functions.

**What it provides:**

- **EventBus** — Pub/sub for decoupled communication between systems
- **Timer** — Countdown/stopwatch with pause/resume
- **Easing** — Standard easing functions for animations
- **Color** — HSL/RGB/Hex conversion, mixing, comparison (used by Art Studio and Robot Lab LED patterns)
- **Random** — Seeded random for reproducible sequences
- **Device** — Detect iPad/iPhone/desktop, Capacitor vs browser
- **DOM** — Safe element creation, class toggling, position helpers

```javascript
import { EventBus } from '@grandpa/core/utils';

const bus = EventBus.getInstance();

// Game-specific events
bus.on('mission:complete', (data) => { /* save progress, trigger celebration */ });
bus.on('color:mixed', (hsl) => { /* update UI */ });

bus.emit('mission:complete', { missionId: 3, score: 100 });
```

---

## How Games Plug Into the Core

Each game is a self-contained module that imports core systems and builds on them.

```
Game Module Pattern:

my-game/
├── scenes/           # Game-specific scenes (title, gameplay, results)
├── components/       # Game-specific UI components
├── assets/           # Game-specific images, sounds, fonts
├── missions/         # Mission definitions and progression logic
├── engine/           # Game-specific engine (circuit engine, color mixing, etc.)
└── index.js          # Entry point — registers scenes with core SceneManager
```

```javascript
// art-studio/index.js — example game entry point

import { SceneManager } from '@grandpa/core/scene';
import { AudioManager } from '@grandpa/core/audio';
import { GameStorage } from '@grandpa/core/storage';
import { LayoutManager } from '@grandpa/core/layout';

import { TitleScene } from './scenes/TitleScene.js';
import { MissionScene } from './scenes/MissionScene.js';
import { SandboxScene } from './scenes/SandboxScene.js';

export async function init() {
  const scenes = new SceneManager(document.getElementById('app'));
  const storage = new GameStorage('art-studio');
  const audio = AudioManager.getInstance();
  const layout = LayoutManager.getInstance();

  // Load saved progress
  const progress = await storage.get('progress', { currentMission: 0, completed: [] });

  // Register scenes
  scenes.register('title', new TitleScene({ audio }));
  scenes.register('mission', new MissionScene({ audio, storage, progress }));
  scenes.register('sandbox', new SandboxScene({ audio, storage }));

  // Start
  scenes.go('title');
}
```

---

## Universe Hub (Game Launcher)

The top-level app is the **Universe Hub** — a visual launcher that shows all available games.

```javascript
// hub/index.js — the main entry point for the entire app

import { SceneManager } from '@grandpa/core/scene';
import { HubScene } from './scenes/HubScene.js';

// Each game registers itself
import { init as initArtStudio } from '../art-studio/index.js';
import { init as initRobotLab } from '../robot-lab/index.js';
import { init as initSuperMatch3 } from '../supermatch3/index.js';

const games = [
  { id: 'art-studio', name: "Art Studio", init: initArtStudio, icon: '🎨' },
  { id: 'robot-lab', name: "Robot Lab", init: initRobotLab, icon: '🤖' },
  { id: 'supermatch3', name: "SuperMatch3", init: initSuperMatch3, icon: '🃏' },
];

const scenes = new SceneManager(document.getElementById('app'));
scenes.register('hub', new HubScene({ games }));
scenes.go('hub');
```

The Hub shows each game as a door/portal in Grandpa's house or universe. Tapping a door launches that game. A "Home" button in every game returns to the Hub.

---

## Dependency Graph

```
┌─────────────────────────────────────────────┐
│              Universe Hub                     │
│         (game launcher / home)                │
└────────┬──────────┬──────────┬───────────────┘
         │          │          │
    ┌────▼───┐ ┌───▼────┐ ┌──▼──────────┐
    │  Art   │ │ Robot  │ │ SuperMatch3  │   ← Game Modules
    │ Studio │ │  Lab   │ │              │
    └────┬───┘ └───┬────┘ └──┬───────────┘
         │         │         │
    ┌────▼─────────▼─────────▼───────────┐
    │         @grandpa/core               │   ← Shared Engine
    │  input | audio | storage | scene    │
    │  animation | layout | rewards       │
    │  avatar | journal | utils           │
    └────────────────┬────────────────────┘
                     │
    ┌────────────────▼────────────────────┐
    │          Capacitor Shell            │   ← Native iOS Wrapper
    │   (WKWebView + native plugins)      │
    └─────────────────────────────────────┘
```

---

## Cross-Game Features Enabled by Core

Because all games share the same engine:

1. **Avatar persists everywhere.** Kid picks Leon as their avatar in SuperMatch3, Leon appears in Robot Lab too.
2. **Progress is visible across games.** The Hub can show completion stars for each game.
3. **Art Studio → Robot Lab.** Colors mixed in Art Studio can be saved and used for robot eye colors in Robot Lab. Same storage system, same color utilities.
4. **Shared celebrations.** The same confetti/sparkle system works everywhere — consistent quality, one codebase.
5. **Audio settings are global.** Mute in one game = muted everywhere.
6. **One iOS build.** A single Capacitor project wraps the entire universe. One app, many games.
