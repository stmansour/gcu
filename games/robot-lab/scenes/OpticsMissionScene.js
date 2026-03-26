/**
 * OpticsMissionScene — Robot Lab Chapter 2: Optics
 *
 * Manages the drag-and-drop lens puzzle. The player places lenses from the tray
 * into two slots on the eye tube SVG. OpticsEngine computes the optical state
 * and OpticsRenderer draws the ray diagram, lens shapes, and mini video feed.
 *
 * Interaction model:
 *   - Four lens items always visible in the tray below the diagram.
 *   - pointerdown on a tray item → ghost follows finger/cursor.
 *   - pointerup over a slot → place lens (swaps any existing lens).
 *   - Placed lens is shown with a badge and dimmed in the tray.
 *   - "↺ Reset" clears both slots.
 *
 * Outcome states:
 *   - Beat 1: slot 0 = weak-convex, slot 1 = empty → inverted partial-focus,
 *             SWIRL-E confused.
 *   - Win:    slot 0 = weak-convex, slot 1 = strong-convex → focused, upright,
 *             SWIRL-E powered.
 */

import { Scene }                        from '../../../core/scene/index.js';
import { GameStorage }                  from '../../../core/storage/index.js';
import { AVATAR_META, AVATAR_IMAGES }   from '../../../core/avatar/avatarManifest.js';
import { celebrate }                    from '../../../core/rewards/index.js';
import { OpticsEngine }                 from '../engine/OpticsEngine.js';
import { OpticsRenderer, lensPath }     from '../renderer/OpticsRenderer.js';
import { CHAPTER_2 }                    from '../missions/chapter2.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

// SVG y-tolerance for tray-drop slot detection (above/below tube walls)
const SLOT_HIT_RADIUS_Y = 70;

// Beat 1 / dialogue states
const SPEECH = {
  idle:    "Everything is a blur. I can't tell what I'm looking at.",
  any:     "Something is changing… but it's still too fuzzy.",
  almost:  "I can almost see! Slide the lenses onto the TARGET marks!",
  beat1:   "I can see something! But… why are you upside down?",
  win:     "I can see you! Clear as day!",
  diverge: "That made it worse! My eyes hurt.",
};

export class OpticsMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    // Lens slots: index 0 = slot 1, index 1 = slot 2; value = lensId or null
    this._slots       = [null, null];
    // Current SVG x-position of each placed lens (null = not placed)
    this._lensX       = [null, null];
    this._solved      = false;
    this._beat1Shown  = false;
    this._avatarId    = null;
    this._avatarSrc   = null;
    this._completedChapters = new Set();

    // DOM refs
    this._container   = null;
    this._boardWrap   = null;
    this._svg         = null;
    this._videoFeed   = null;   // HTML img — sidebar feed

    // Engine + renderer
    this._engine      = null;
    this._renderer    = null;

    // Tray → slot drag state
    this._dragLensId  = null;
    this._ghost       = null;
    this._hoveredSlot = -1;

    // SVG lens slide state
    this._slidingSlot   = -1;
    this._slideClientX0 = 0;    // client x at start of slide
    this._slideLensX0   = 0;    // lensX at start of slide
    this._slideSVGScale = 1;    // SVG units per client pixel

    // Bound event handlers (created once, removed on cleanup)
    this._onDragMove   = (e) => this._handleDragMove(e);
    this._onDragEnd    = (e) => this._handleDragEnd(e);
    this._onSlideMove  = (e) => this._handleSlideMove(e);
    this._onSlideEnd   = (e) => this._handleSlideEnd(e);
  }

  // ── Scene lifecycle ────────────────────────────────────────────────────────

  enter(container, data = {}) {
    this._avatarId   = data.avatarId ?? null;
    this._avatarSrc  = this._avatarId ? AVATAR_IMAGES[this._avatarId] : null;
    this._slots      = [null, null];
    this._lensX      = [null, null];
    this._solved     = false;
    this._beat1Shown = false;
    this._container  = container;

    this.storage.get('progress', { completedChapters: [] }).then(p => {
      this._completedChapters = new Set(p.completedChapters);
    });

    container.className = 'rl-optics';
    this._buildDOM(container);
    this._initOptics();
    this._attachEvents();
    this._updateOptics();   // initial render (all empty)
  }

  exit(container) {
    this._cleanupDrag();
    this._cleanupSlide();
    this._container = null;
    this._boardWrap = null;
    this._svg       = null;
    this._videoFeed = null;
    this._engine    = null;
    this._renderer  = null;
    container.innerHTML = '';
  }

  // ── DOM build ──────────────────────────────────────────────────────────────

  _buildDOM(container) {
    const m = CHAPTER_2;

    container.innerHTML = `
      <div class="rl-mission__bg"></div>

      <div class="rl-mission__topbar">
        <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>
        <span class="rl-mission__title">
          <span class="rl-label-prefix">Ch&nbsp;${m.chapterNumber}:</span> ${m.title}
        </span>
        <button type="button" class="rl-clear-btn" id="rl-reset" title="Clear all lenses">↺ Reset</button>
        <button type="button" class="rl-hint-btn" id="rl-hint" aria-label="Show hint">📓</button>
      </div>

      <div class="rl-mission__main">

        <div class="rl-mission__sidebar">

          <!-- SWIRL-E portrait -->
          <div class="rl-mission__swirle-portrait">
            <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                 alt="SWIRL-E" class="rl-mission__swirle-img" id="rl-swirle-portrait">
          </div>

          <!-- Speech bubble -->
          <div class="rl-optics__speech" id="rl-speech"></div>

          <!-- Problem description -->
          <div class="rl-mission__problem" id="rl-problem"></div>

          <!-- Action buttons (appear on outcomes) -->
          <div class="rl-mission__actions" id="rl-actions"></div>

        </div>

        <!-- Board: header + SVG + tray -->
        <div class="rl-optics__board-wrap" id="rl-board-wrap">
          <div class="rl-optics__board-header">
            <span class="rl-optics__board-title">SWIRL-E Optics Assembly</span>
          </div>
          <img src="games/robot-lab/assets/images/swirle-eye-cutaway.png"
               class="rl-optics__cutaway" alt="" draggable="false">
          <svg class="rl-optics__diagram" id="rl-svg"
               xmlns="http://www.w3.org/2000/svg"></svg>
          <div class="rl-optics__tray" id="rl-tray">
            <div class="rl-optics__tray-label">Lens Workbench</div>
          </div>
        </div>

        <!-- Retina output connector: two wires (+/-) from lens assembly to see-panel -->
        <div class="rl-optics__retina-conn" aria-hidden="true">
          <div class="rl-optics__retina-conn__row rl-optics__retina-conn__row--pos">
            <span class="rl-optics__retina-conn__sign">+</span>
            <div class="rl-optics__retina-conn__dot"></div>
            <div class="rl-optics__retina-conn__line"></div>
            <div class="rl-optics__retina-conn__dot"></div>
          </div>
          <div class="rl-optics__retina-conn__label">RETINA</div>
          <div class="rl-optics__retina-conn__row rl-optics__retina-conn__row--neg">
            <span class="rl-optics__retina-conn__sign">−</span>
            <div class="rl-optics__retina-conn__dot"></div>
            <div class="rl-optics__retina-conn__line"></div>
            <div class="rl-optics__retina-conn__dot"></div>
          </div>
        </div>

        <!-- See panel: what SWIRL-E sees -->
        <div class="rl-optics__see-panel">
          <div class="rl-optics__see-label">What SWIRL-E Sees</div>
          <div class="rl-optics__video-frame" id="rl-video-frame">
            <img id="rl-video-feed"
                 class="rl-optics__video-feed"
                 src=""
                 alt="SWIRL-E's view"
                 style="filter:blur(14px)">
          </div>
        </div>

      </div>

      <!-- Grandpa's Journal hint panel -->
      <div class="rl-hint-panel" id="rl-hint-panel" hidden>
        <div class="rl-hint-panel__inner">
          <div class="rl-hint-panel__paper">
            <h3 class="rl-hint-panel__heading">Grandpa's Journal</h3>
            <div class="rl-hint-panel__text" id="rl-hint-text"></div>
            <button type="button" class="rl-btn rl-btn--close" id="rl-hint-close">Got it!</button>
          </div>
        </div>
      </div>
    `;

    // Fill problem text
    const probEl = container.querySelector('#rl-problem');
    for (const line of m.problem) {
      const p = document.createElement('p');
      p.textContent = line;
      probEl.appendChild(p);
    }

    // Fill hint text
    const hintEl = container.querySelector('#rl-hint-text');
    for (const line of m.journalHint) {
      const p = document.createElement('p');
      p.textContent = line;
      hintEl.appendChild(p);
    }

    // Avatar video feed
    const videoFeed = container.querySelector('#rl-video-feed');
    if (this._avatarSrc) {
      videoFeed.src = this._avatarSrc;
    }
    this._videoFeed = videoFeed;

    this._boardWrap = container.querySelector('#rl-board-wrap');
    this._svg       = container.querySelector('#rl-svg');

    // Set initial speech
    this._setSpeech(SPEECH.idle);

    // Build lens tray items
    this._buildTray(container.querySelector('#rl-tray'));

    // Briefing overlay
    this._buildBriefing(container);
  }

  _buildTray(trayEl) {
    for (const lens of CHAPTER_2.lensPool) {
      const item = document.createElement('div');
      item.className      = 'rl-optics__lens-item';
      item.dataset.lensId = lens.id;
      item.innerHTML      = `
        ${this._trayIconSVG(lens)}
        <div class="rl-optics__tray-name" style="color:${lens.color}">${lens.label}</div>
        <div class="rl-optics__tray-sublabel">${lens.sublabel}</div>
      `;

      item.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this._solved) return;
        this._startDrag(lens.id, e.clientX, e.clientY);
      });

      trayEl.appendChild(item);
    }
  }

  _trayIconSVG(lensDef) {
    const VW = 44, VH = 66;
    const cx = VW / 2, topY = 6, botY = VH - 6;
    // Scale bulge to the small icon size (tube height ~200 → icon ~54)
    const scaledBulge = Math.round(lensDef.bulge * 54 / 200);
    const d    = lensPath(cx, topY, botY, scaledBulge);
    const hex  = lensDef.color;
    const axisY = VH / 2;

    return `<svg viewBox="0 0 ${VW} ${VH}" xmlns="http://www.w3.org/2000/svg"
            class="rl-optics__tray-icon" aria-hidden="true">
      <line x1="0" y1="${axisY}" x2="${VW}" y2="${axisY}"
            stroke="${hex}40" stroke-width="0.8" stroke-dasharray="4 3"/>
      <path d="${d}" fill="${hex}30" stroke="${hex}" stroke-width="1.8"
            stroke-linejoin="round"/>
    </svg>`;
  }

  _buildBriefing(container) {
    const m = CHAPTER_2;
    const kidMeta = this._avatarId ? AVATAR_META[this._avatarId] : null;
    const kidName = kidMeta?.displayName ?? '';

    // SWIRL-E speaking directly to the player
    const line1 = kidName ? `${kidName}, I need your help!` : 'I need your help!';
    const personalMsg = `${line1}<br>My eyes aren't focused.<br>Everything is blurry.`;

    // Short mission-panel lines (not the full problem description)
    const briefingLines = [
      'His eye tube has two empty lens slots.',
      'Drag lenses from the workbench at the bottom.',
      'Find the right pair to bring the picture into focus.',
    ];

    const briefingEl = document.createElement('div');
    briefingEl.className = 'rl-briefing';
    briefingEl.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge">Ch&nbsp;${m.chapterNumber}</span>
          <h2 class="rl-briefing__title">
            <span class="rl-label-prefix">Mission:</span> ${m.title}
          </h2>
        </div>
        <div class="rl-briefing__body">
          <div class="rl-briefing__robot-col">
            <div class="rl-briefing__portrait">
              <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-briefing__robot-name">SWIRL-E</p>
            <p class="rl-briefing__robot-personal">${personalMsg}</p>
          </div>
          <div class="rl-briefing__panel">
            <div class="rl-briefing__text" id="rl-briefing-text"></div>
          </div>
        </div>
        <button type="button" class="rl-btn rl-btn--start rl-briefing__go-btn" id="rl-briefing-go">
          Let's Tune! <span class="rl-btn__icon-badge">🔭</span>
        </button>
      </div>
    `;

    const briefingTextEl = briefingEl.querySelector('#rl-briefing-text');
    for (const line of briefingLines) {
      const p = document.createElement('p');
      p.textContent = line;
      briefingTextEl.appendChild(p);
    }

    briefingEl.querySelector('#rl-briefing-go').addEventListener('click', () => {
      briefingEl.classList.add('rl-briefing--hiding');
      setTimeout(() => briefingEl.remove(), 380);
    });

    container.appendChild(briefingEl);
  }

  // ── Engine + renderer init ─────────────────────────────────────────────────

  _initOptics() {
    this._engine   = new OpticsEngine(CHAPTER_2.layout);
    this._renderer = new OpticsRenderer(this._svg);
    this._renderer.render(CHAPTER_2.layout, this._avatarSrc);
  }

  // ── Optics state update ────────────────────────────────────────────────────

  /**
   * @param {{ skipStateCheck?: boolean }} opts
   *   skipStateCheck: true during live lens sliding (avoid dialogue flicker)
   */
  _updateOptics(opts = {}) {
    const { lensPool, layout, correctSolution } = CHAPTER_2;
    const [s0, s1] = this._slots;

    const def0 = s0 ? lensPool.find(l => l.id === s0) : null;
    const def1 = s1 ? lensPool.find(l => l.id === s1) : null;
    const f1   = def0 ? def0.focalLength : null;
    const f2   = def1 ? def1.focalLength : null;

    const x1 = this._lensX[0];
    const x2 = this._lensX[1];

    const state = this._engine.compute(f1, f2, x1, x2);

    // Update SVG diagram
    this._renderer.update(state, f1, f2, lensPool, this._slots, this._lensX, this._engine, this._avatarSrc);

    // Update sidebar HTML video feed
    this._applyFeedEffect(state);

    // Update tray badges
    this._refreshTray();

    // Check outcome states (skipped during live slide to avoid mid-drag dialogue)
    if (!opts.skipStateCheck) {
      this._checkStates(state, s0, s1, correctSolution);
    }
  }

  _applyFeedEffect(state) {
    if (!this._videoFeed) return;

    const { sensor, slots } = CHAPTER_2.layout;
    const xs  = sensor.x;
    const x1  = this._lensX[0] ?? slots[0].x;
    const x2  = this._lensX[1] ?? slots[1].x;
    const hasLens1 = this._slots[0] !== null;
    const hasLens2 = this._slots[1] !== null;

    let blurPx     = state.blurPx;
    let isInverted = state.isInverted;
    let scale      = 1;
    let handled    = false;   // true once a regime has set scale+blur

    // ── Two-lens analysis ─────────────────────────────────────────────────
    if (hasLens1 && hasLens2) {
      const def1 = CHAPTER_2.lensPool.find(l => l.id === this._slots[0]);
      const def2 = CHAPTER_2.lensPool.find(l => l.id === this._slots[1]);
      const f1 = def1?.focalLength ?? null;
      const f2 = def2?.focalLength ?? null;

      if (f1 !== null && isFinite(f1) && f2 !== null && isFinite(f2) && f2 > 0) {
        const xInt  = x1 + f1;   // intermediate image after lens 1
        const do2   = x2 - xInt; // object distance for lens 2
        const delta = xs - xInt; // intermediate image → sensor
        const disc  = delta * (delta - 4 * f2);

        // Three-zone model: A=virtual object, B=approaching focus, C=past focus.
        // All zones keep the image upright (two-lens net orientation when working).

        if (do2 < 0) {
          // Zone A — virtual object for lens 2.
          // Intermediate image has shifted past lens 2; it now intercepts
          // converging rays before they focus → real image forms very close
          // to lens 2, far from the sensor → large defocused disc.
          // Scale ramps from 0.12 up to 3.5 over the first 30 SVG units,
          // then blur keeps growing so the disc becomes indiscernible.
          const rampT = Math.min(1, -do2 / 30);
          scale  = 0.12 + (3.5 - 0.12) * rampT;
          blurPx = 14 + 26 * Math.min(1, -do2 / 80);  // 14 → 40 px
          isInverted = false;
          handled = true;

        } else if (disc >= 0) {
          // Two real conjugate focus positions exist.
          // do2Correct = smaller (nearer) root of do2² − Δ·do2 + f2·Δ = 0
          const do2Correct = (delta - Math.sqrt(disc)) / 2;

          if (do2Correct > 0) {
            if (do2 < do2Correct) {
              // Zone B — approaching first focus: linear taper over do2Correct px.
              // Gives a smooth 60-px degradation as lens 1 moves right past correct.
              const t = do2 / do2Correct;
              scale      = Math.max(0.12, t);
              blurPx     = 14 * (1 - t);
              isInverted = false;
              handled    = true;
            } else {
              // Zone C — past first focus: monotone grow + proportional blur.
              // Suppresses the second conjugate focus so it never looks sharp.
              const excess = do2 - do2Correct;
              scale   = Math.min(4, 1 + excess / do2Correct);
              blurPx  = Math.max(blurPx, 14 * Math.min(1, excess / do2Correct));
              handled = true;
            }
          }

        } else {
          // disc < 0 — no real focus on this sensor (xInt shifted too close to xs).
          // Zone B approximation: use t = do2 / (2·f2).
          // At disc=0 the boundary, do2Correct = δ/2 = 2·f2, so this is
          // identical to the disc≥0 Zone B formula → continuous transition.
          const t = Math.max(0, Math.min(1, do2 / (2 * f2)));
          scale      = Math.max(0.12, t);
          blurPx     = 14 * (1 - t);
          isInverted = false;
          handled    = true;
        }
      }
    }

    // ── Normal cone-geometry scale ─────────────────────────────────────────
    // scale = (sensorX − refX) / (finalImageX − refX)
    // refX = last active lens (the cone's apex reference).
    if (!handled) {
      const refX = hasLens2 ? x2 : hasLens1 ? x1 : null;
      const fx   = state.finalImageX;

      if (refX !== null && fx !== null && isFinite(fx) && Math.abs(fx - refX) > 1) {
        const raw = (xs - refX) / (fx - refX);
        scale = Math.max(0.12, Math.min(4, Math.abs(raw)));
      } else if (refX !== null && !isFinite(state.finalImageX)) {
        // Image at ∞ (do2 = f2 exactly): completely defocused.
        scale = 0.12;
      }
    }

    const sign = isInverted ? -1 : 1;
    this._videoFeed.style.filter    = `blur(${blurPx.toFixed(1)}px)`;
    this._videoFeed.style.transform = `scale(${scale.toFixed(3)}, ${(sign * scale).toFixed(3)})`;

    const frame = this._container?.querySelector('#rl-video-frame');
    if (frame) {
      frame.classList.toggle('rl-optics__video-frame--focused', state.isFocused);
    }
  }

  _refreshTray() {
    const trayEl = this._container?.querySelector('#rl-tray');
    if (!trayEl) return;

    for (const item of trayEl.querySelectorAll('.rl-optics__lens-item')) {
      const lensId     = item.dataset.lensId;
      const slot0Match = this._slots[0] === lensId;
      const slot1Match = this._slots[1] === lensId;

      item.classList.toggle('rl-optics__lens-item--placed', slot0Match || slot1Match);

      // Remove old badge
      item.querySelector('.rl-optics__slot-badge')?.remove();

      if (slot0Match || slot1Match) {
        const badge = document.createElement('div');
        badge.className   = 'rl-optics__slot-badge';
        badge.textContent = slot0Match ? 'S1' : 'S2';
        item.appendChild(badge);
      }
    }
  }

  // ── Outcome state machine ──────────────────────────────────────────────────

  _checkStates(state, s0, s1, correctSolution) {
    if (this._solved) return;

    // Win: correct lenses AND both snapped to their target x positions
    const { slots } = CHAPTER_2.layout;
    const lens0AtTarget = this._lensX[0] !== null && this._lensX[0] === slots[0].x;
    const lens1AtTarget = this._lensX[1] !== null && this._lensX[1] === slots[1].x;
    const isCorrect = s0 === correctSolution.slot1 && s1 === correctSolution.slot2
                   && lens0AtTarget && lens1AtTarget;
    if (isCorrect) {
      this._doWin();
      return;
    }

    // Almost there: both correct lenses placed but at least one not at target x
    if (s0 === correctSolution.slot1 && s1 === correctSolution.slot2
        && (!lens0AtTarget || !lens1AtTarget)) {
      this._setSpeech(SPEECH.almost);
      this._setSwirlePortrait('unpowered');
      return;
    }

    // Beat 1: correct first lens at target x, slot 2 empty
    if (s0 === correctSolution.slot1 && s1 === null && lens0AtTarget) {
      if (!this._beat1Shown) {
        this._beat1Shown = true;
        this._doBeat1();
      }
      return;
    }

    // Any diverging in slot 0
    const hasDiverging = s0 === 'diverging' || s1 === 'diverging';
    if (hasDiverging && (s0 !== null || s1 !== null)) {
      this._setSpeech(SPEECH.diverge);
      this._setSwirlePortrait('unpowered');
      return;
    }

    // Any other lens placed but not correct
    if (s0 !== null || s1 !== null) {
      this._setSpeech(SPEECH.any);
      this._setSwirlePortrait('unpowered');
    } else {
      this._setSpeech(SPEECH.idle);
      this._setSwirlePortrait('unpowered');
    }
  }

  _doBeat1() {
    this._setSpeech(SPEECH.beat1);
    this._setSwirlePortrait('unpowered');

    // Briefly tilt SWIRL-E portrait to show confusion
    const portrait = this._container?.querySelector('#rl-swirle-portrait');
    if (portrait) {
      portrait.closest('.rl-mission__swirle-portrait')
              ?.classList.add('rl-optics__swirle-confused');
    }

    // Update problem text
    const probEl = this._container?.querySelector('#rl-problem');
    if (probEl) {
      probEl.innerHTML = '<p class="rl-msg rl-msg--detail">A single lens inverts the image. Add a second lens to flip it back!</p>';
    }
  }

  _doWin() {
    this._solved = true;
    this._completedChapters.add(CHAPTER_2.id);

    this._setSwirlePortrait('powered');
    this._setSpeech(SPEECH.win);

    // Remove confused animation if it was applied
    this._container
      ?.querySelector('.rl-optics__swirle-confused')
      ?.classList.remove('rl-optics__swirle-confused');

    // Success problem text
    const probEl = this._container?.querySelector('#rl-problem');
    if (probEl) {
      probEl.innerHTML =
        `<p class="rl-msg rl-msg--success">${CHAPTER_2.successMessage}</p>`;
    }

    // Reset button clears slots so player can keep exploring
    const actionsEl = this._container?.querySelector('#rl-actions');
    if (actionsEl) actionsEl.innerHTML = '';
    this._showResetButton();
    this._showNextChapterButton();

    // Confetti
    celebrate('large', {
      duration: 2500,
      onComplete: async () => {
        const progress = await this.storage.get('progress', { completedChapters: [] });
        if (!progress.completedChapters.includes(CHAPTER_2.id)) {
          progress.completedChapters.push(CHAPTER_2.id);
        }
        await this.storage.set('progress', progress);
      },
    });

    // Outcome summary card after confetti
    setTimeout(() => this._showSuccessCard(), 3000);
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  _setSpeech(text) {
    const el = this._container?.querySelector('#rl-speech');
    if (el) el.textContent = text;
  }

  _setSwirlePortrait(state) {
    const img = this._container?.querySelector('#rl-swirle-portrait');
    if (!img) return;
    img.src = state === 'powered'
      ? 'games/robot-lab/assets/images/swirle-powered.png'
      : 'games/robot-lab/assets/images/swirle-unpowered.png';
  }

  _showResetButton() {
    const actionsEl = this._container?.querySelector('#rl-actions');
    if (!actionsEl) return;
    const existing = actionsEl.querySelector('.rl-btn--reset');
    if (existing) return;
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'rl-btn rl-btn--reset';
    btn.textContent = '🔄 Try Again';
    btn.addEventListener('click', () => this._resetLenses());
    actionsEl.appendChild(btn);
  }

  _showNextChapterButton() {
    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === CHAPTER_2.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;
    const prevChapter = currentIdx > 0 ? ROBOT_LAB_CHAPTERS[currentIdx - 1] : null;

    const actionsEl = this._container?.querySelector('#rl-actions');
    if (!actionsEl) return;

    if (prevChapter) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'rl-btn rl-btn--prev-chapter';
      btn.textContent = '← Previous Chapter';
      btn.addEventListener('click', () => {
        const route = CHAPTER_SCENES[prevChapter.id]
          ?? { scene: 'robot-lab-circuit', missionId: prevChapter.id };
        const data = { avatarId: this._avatarId };
        if (route.missionId) data.missionId = route.missionId;
        this.sceneManager.go(route.scene, data);
      });
      actionsEl.appendChild(btn);
    }

    if (nextChapter) {
      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'rl-btn rl-btn--next-chapter';
      btn.textContent = 'Next Chapter →';
      btn.addEventListener('click', () => {
        this.sceneManager.go('hub');
      });
      actionsEl.appendChild(btn);
    }
  }

  _resetLenses() {
    this._slots      = [null, null];
    this._lensX      = [null, null];
    this._solved     = false;
    this._beat1Shown = false;

    this._setSwirlePortrait('unpowered');
    this._setSpeech(SPEECH.idle);

    const probEl = this._container?.querySelector('#rl-problem');
    if (probEl) {
      probEl.innerHTML = '';
      for (const line of CHAPTER_2.problem) {
        const p = document.createElement('p');
        p.textContent = line;
        probEl.appendChild(p);
      }
    }

    const actionsEl = this._container?.querySelector('#rl-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    // Remove confused animation
    this._container
      ?.querySelector('.rl-optics__swirle-confused')
      ?.classList.remove('rl-optics__swirle-confused');

    this._updateOptics();
  }

  // ── Outcome summary card ───────────────────────────────────────────────────

  _showSuccessCard() {
    if (!this._container) return;

    const avatarMeta = this._avatarId ? AVATAR_META[this._avatarId]   : null;
    const avatarImg  = this._avatarId ? AVATAR_IMAGES[this._avatarId] : null;
    const kidName    = avatarMeta?.displayName ?? '';
    const kidColor   = avatarMeta?.color ?? '#D4A959';

    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === CHAPTER_2.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;

    const chaptersHTML = ROBOT_LAB_CHAPTERS.map((ch, i) => {
      const done = this._completedChapters.has(ch.id);
      return `<li class="rl-chapter-item ${done ? 'rl-chapter-item--done' : ''}">
        <span class="rl-chapter-check">${done ? '✓' : ''}</span>
        <span class="rl-chapter-label">${i + 1}. ${ch.label}</span>
      </li>`;
    }).join('');

    // Combined focal length formula using proper stacked fractions
    const mathHTML = `
      <span class="rl-fraction">
        <span class="rl-fraction__num">1</span>
        <span class="rl-fraction__denom">f</span>
      </span>
      <span>=</span>
      <span class="rl-fraction">
        <span class="rl-fraction__num">1</span>
        <span class="rl-fraction__denom">f₁</span>
      </span>
      <span>+</span>
      <span class="rl-fraction">
        <span class="rl-fraction__num">1</span>
        <span class="rl-fraction__denom">f₂</span>
      </span>
      <span>=</span>
      <span class="rl-fraction">
        <span class="rl-fraction__num">1</span>
        <span class="rl-fraction__denom">200</span>
      </span>
      <span>+</span>
      <span class="rl-fraction">
        <span class="rl-fraction__num">1</span>
        <span class="rl-fraction__denom">40</span>
      </span>
      <span>=</span>
      <span class="rl-fraction">
        <span class="rl-fraction__num">6</span>
        <span class="rl-fraction__denom">200</span>
      </span>
      <span>→ f ≈ 33</span>
      <span class="rl-math__badge rl-math__badge--ok">✓</span>
    `;

    const swirleQuote = kidName
      ? `Oh thank you ${kidName}!<br>I can see you clearly now!`
      : `Oh thank you!<br>I can see clearly now!`;

    const card = document.createElement('div');
    card.className = 'rl-briefing';
    card.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge rl-briefing__badge--success">✓ Mission Complete</span>
          <h2 class="rl-briefing__title rl-briefing__title--success">SWIRL-E Can See Clearly!</h2>
        </div>

        <div class="rl-success-body">

          <!-- Section A: SWIRL-E reaction — same layout as mission briefing -->
          <div class="rl-briefing__robot-col rl-success-robot-col">
            <div class="rl-briefing__portrait">
              <img src="games/robot-lab/assets/images/swirle-powered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-briefing__robot-name">SWIRL-E</p>
            <p class="rl-briefing__robot-personal">${swirleQuote}</p>
          </div>

          <!-- Section B: Mission Results — labeled panel, left-justified -->
          <div class="rl-success-results-panel">
            <div class="rl-success-explain">
              <p>The first lens gathers light and creates an inverted image inside the tube.</p>
              <p>The second lens re-focuses it right-side up onto the retina.</p>
              <div class="rl-math rl-math--good">${mathHTML}</div>
            </div>
          </div>

          <!-- Section C: Systems checklist -->
          <div class="rl-success-right">
            ${avatarImg ? `
            <div class="rl-success-kid-wrap" style="border-color:${kidColor}">
              <img src="${avatarImg}" alt="${kidName}" class="rl-success-kid-img">
            </div>` : ''}
            <p class="rl-systems-title">SWIRL-E SYSTEMS</p>
            <ol class="rl-chapter-list">${chaptersHTML}</ol>
          </div>

        </div>

        <div class="rl-outcome__btns">
          <button type="button" class="rl-btn rl-btn--close" id="rl-card-keep">Keep Exploring</button>
          ${nextChapter ? `<button type="button" class="rl-btn rl-btn--next-chapter" id="rl-card-next">Next Chapter →</button>` : ''}
        </div>
      </div>
    `;

    // Keep Exploring — dismiss card and re-enable lens interaction
    card.querySelector('#rl-card-keep').addEventListener('click', () => {
      this._solved = false;   // re-enable drag + slide
      card.classList.add('rl-briefing--hiding');
      setTimeout(() => card.remove(), 380);
    });

    card.querySelector('#rl-card-next')?.addEventListener('click', () => {
      card.classList.add('rl-briefing--hiding');
      setTimeout(() => {
        const route = { scene: 'hub', data: { avatarId: this._avatarId } };
        this.sceneManager.go(route.scene, { avatarId: this._avatarId });
      }, 380);
    });

    this._container.appendChild(card);
  }

  // ── Event handling ─────────────────────────────────────────────────────────

  _attachEvents() {
    this._container.querySelector('#rl-back').addEventListener('click',
      () => this.sceneManager.go('hub'));

    this._container.querySelector('#rl-reset').addEventListener('click',
      () => this._resetLenses());

    this._container.querySelector('#rl-hint').addEventListener('click',
      () => { this._container.querySelector('#rl-hint-panel').hidden = false; });

    this._container.querySelector('#rl-hint-close').addEventListener('click',
      () => { this._container.querySelector('#rl-hint-panel').hidden = true; });

    // SVG lens slide — pointerdown on a placed lens path starts horizontal drag
    this._svg.addEventListener('pointerdown', (e) => {
      if (this._solved || this._dragLensId) return;   // no slide during tray-drag or win
      const slotIdx = e.target.dataset?.slotIdx;
      if (slotIdx === undefined) return;
      e.preventDefault();
      e.stopPropagation();
      this._startLensSlide(parseInt(slotIdx, 10), e.clientX);
    });
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  _startDrag(lensId, clientX, clientY) {
    this._dragLensId = lensId;
    this._hoveredSlot = -1;

    // Create ghost
    const lensDef = CHAPTER_2.lensPool.find(l => l.id === lensId);
    const ghost   = document.createElement('div');
    ghost.className = 'rl-optics__drag-ghost';
    ghost.innerHTML = `
      ${this._trayIconSVG(lensDef)}
      <div class="rl-optics__tray-name" style="color:${lensDef.color}">${lensDef.label}</div>
    `;
    ghost.style.left = `${clientX}px`;
    ghost.style.top  = `${clientY}px`;
    document.body.appendChild(ghost);
    this._ghost = ghost;

    document.addEventListener('pointermove', this._onDragMove, { passive: false });
    document.addEventListener('pointerup',   this._onDragEnd);
  }

  _handleDragMove(e) {
    e.preventDefault();
    if (!this._ghost) return;

    this._ghost.style.left = `${e.clientX}px`;
    this._ghost.style.top  = `${e.clientY}px`;

    // Check if hovering over a slot
    const slotIdx = this._slotIndexAtClient(e.clientX, e.clientY);
    if (slotIdx !== this._hoveredSlot) {
      this._hoveredSlot = slotIdx;
      if (this._boardWrap) {
        if (slotIdx >= 0) {
          this._boardWrap.dataset.hoverSlot = String(slotIdx);
        } else {
          delete this._boardWrap.dataset.hoverSlot;
        }
      }
    }
  }

  _handleDragEnd(e) {
    const lensId  = this._dragLensId;
    const slotIdx = this._slotIndexAtClient(e.clientX, e.clientY);

    this._cleanupDrag();

    if (slotIdx >= 0 && lensId) {
      // Place at the SVG x where the player actually dropped (not the target x)
      const slot  = CHAPTER_2.layout.slots[slotIdx];
      const minX  = slot.minX ?? (slot.x - 60);
      const maxX  = slot.maxX ?? (slot.x + 60);
      const svgPt = this._renderer?.clientToSVG(e.clientX, e.clientY);
      const dropX = svgPt ? Math.max(minX, Math.min(maxX, svgPt.x)) : minX;
      this._placeLens(slotIdx, lensId, dropX);
    }
  }

  _slotIndexAtClient(clientX, clientY) {
    if (!this._renderer || !this._svg) return -1;

    const svgPt = this._renderer.clientToSVG(clientX, clientY);
    const { slots, tube } = CHAPTER_2.layout;

    // Must be within tube y bounds (with tolerance)
    if (svgPt.y < tube.y1 - SLOT_HIT_RADIUS_Y || svgPt.y > tube.y2 + SLOT_HIT_RADIUS_Y) {
      return -1;
    }

    // Check if drop lands within each slot's track range
    for (let i = 0; i < slots.length; i++) {
      const minX = slots[i].minX ?? (slots[i].x - 60);
      const maxX = slots[i].maxX ?? (slots[i].x + 60);
      if (svgPt.x >= minX && svgPt.x <= maxX) {
        return i;
      }
    }
    return -1;
  }

  _placeLens(slotIndex, lensId, dropX = null) {
    this._slots[slotIndex] = lensId;
    // Place at the drop x so the player must slide to the target to win
    const slot = CHAPTER_2.layout.slots[slotIndex];
    this._lensX[slotIndex] = dropX ?? (slot.minX ?? slot.x);
    this._updateOptics();
  }

  // ── SVG lens slide (horizontal drag within track) ──────────────────────────

  _startLensSlide(slotIdx, clientX) {
    if (this._slots[slotIdx] === null) return;

    this._slidingSlot   = slotIdx;
    this._slideClientX0 = clientX;
    this._slideLensX0   = this._lensX[slotIdx] ?? CHAPTER_2.layout.slots[slotIdx].x;

    // Compute SVG units per client pixel for this moment
    const pt1 = this._renderer.clientToSVG(0, 0);
    const pt2 = this._renderer.clientToSVG(100, 0);
    this._slideSVGScale = (pt2.x - pt1.x) / 100;

    document.addEventListener('pointermove', this._onSlideMove, { passive: false });
    document.addEventListener('pointerup',   this._onSlideEnd);
  }

  _handleSlideMove(e) {
    e.preventDefault();
    if (this._slidingSlot < 0) return;

    const { layout } = CHAPTER_2;
    const slot    = layout.slots[this._slidingSlot];
    const minGap  = layout.minLensGap ?? 60;
    const otherX  = this._lensX[this._slidingSlot === 0 ? 1 : 0];

    const dx      = (e.clientX - this._slideClientX0) * this._slideSVGScale;
    const rawX    = this._slideLensX0 + dx;

    let minX = slot.minX ?? (slot.x - 60);
    let maxX = slot.maxX ?? (slot.x + 60);

    // Prevent lenses from passing through each other
    if (this._slidingSlot === 0 && otherX !== null) maxX = Math.min(maxX, otherX - minGap);
    if (this._slidingSlot === 1 && otherX !== null) minX = Math.max(minX, otherX + minGap);

    this._lensX[this._slidingSlot] = Math.max(minX, Math.min(maxX, rawX));
    this._updateOptics({ skipStateCheck: true });
  }

  _handleSlideEnd(e) {
    if (this._slidingSlot < 0) return;

    const { layout } = CHAPTER_2;
    const slot   = layout.slots[this._slidingSlot];
    const snapR  = layout.snapRadius ?? 15;
    const curX   = this._lensX[this._slidingSlot] ?? slot.x;

    // Snap to target if close enough
    if (Math.abs(curX - slot.x) <= snapR) {
      this._lensX[this._slidingSlot] = slot.x;
    }

    this._cleanupSlide();
    this._updateOptics();   // final state check after release
  }

  _cleanupSlide() {
    this._slidingSlot = -1;
    document.removeEventListener('pointermove', this._onSlideMove);
    document.removeEventListener('pointerup',   this._onSlideEnd);
  }

  _cleanupDrag() {
    this._ghost?.remove();
    this._ghost     = null;
    this._dragLensId = null;
    this._hoveredSlot = -1;

    if (this._boardWrap) delete this._boardWrap.dataset.hoverSlot;

    document.removeEventListener('pointermove', this._onDragMove);
    document.removeEventListener('pointerup',   this._onDragEnd);
  }
}
