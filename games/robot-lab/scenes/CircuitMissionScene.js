/**
 * Robot Lab — Chapter 1: Circuit Mission Scene (SVG Schematic Edition)
 *
 * Four circuit outcomes:
 *   1. Incomplete  — not enough wires yet, waiting.
 *   2. Resistor    — 9V / 9kΩ = 1mA — SUCCESS. Eyes light up, electrons fly.
 *   3. Capacitor   — charges up then stops current. Dramatic plate-fill animation.
 *   4. Inductor    — ramps to full current (4s ease-in), then EXPLOSION.
 *   5. Direct      — eye:minus → battery:minus direct. Instant EXPLOSION.
 *
 * Uses SchematicRenderer for SVG rendering and ParticleSystem for electron animation.
 * Component order is randomised via Fisher-Yates shuffle on every game / reset.
 */

import { Scene }               from '../../../core/scene/index.js';
import { GameStorage }         from '../../../core/storage/index.js';
import { AVATAR_META, AVATAR_IMAGES } from '../../../core/avatar/avatarManifest.js';
import { celebrate }           from '../../../core/rewards/index.js';
import { LineDragManager }     from '../../../core/input/index.js';
import { CircuitEngine }       from '../engine/CircuitEngine.js';
import { SchematicRenderer }   from '../renderer/SchematicRenderer.js';
import { ParticleSystem }      from '../animation/ParticleSystem.js';
import { playCanBurst, unlockAudio } from '../audio/ExplosionSFX.js';
import { CHAPTER_1 }           from '../missions/chapter1.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

const MISSIONS = { 'ch1-power': CHAPTER_1 };

export class CircuitMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    this._mission     = null;
    this._engine      = null;
    this._renderer    = null;
    this._particles   = null;

    this._slotAssignments = [];     // [{type,label,sublabel,color,engineType}, ...]
    this._termPositions   = new Map(); // termId → {x, y} in SVG units

    this._wireDrag             = null;   // LineDragManager instance
    this._placedEngWires       = [];     // engine wire ids
    this._placedRenWires       = [];     // renderer wire ids
    this._playerWireEndpoints  = [];     // [{from, to}] for circuit detection
    this._connectedTerms       = new Set();

    this._solved      = false;
    this._everSolved  = false;  // persists across resets within the session
    this._blown       = false;
    this._animRaf     = null;

    this._replayFn           = null;
    this._currentParticleDir = 'electron';
    this._audioUnlocked      = false;

    this._board     = null;
    this._svg       = null;
    this._container = null;
    this._avatarId  = null;
    this._completedChapters = new Set();
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  enter(container, data = {}) {
    const missionId  = data.missionId ?? 'ch1-power';
    this._avatarId   = data.avatarId ?? null;
    this._mission    = MISSIONS[missionId];

    // Pre-load completed chapters so the success card can show the checklist.
    // Fire-and-forget: this resolves long before any circuit can be solved.
    this.storage.get('progress', { completedChapters: [] }).then(p => {
      this._completedChapters = new Set(p.completedChapters);
    });

    if (!this._mission) {
      console.warn('[RobotLab] Unknown mission:', missionId);
      this.sceneManager.go('robot-lab-title');
      return;
    }

    this._container = container;
    this._solved    = false;
    this._blown     = false;

    container.className = 'rl-mission';
    this._buildDOM(container);
    this._shuffleAndBuild();
    this._attachEvents();
  }

  exit(container) {
    if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
    this._particles?.stop();
    this._wireDrag?.destroy();
    this._wireDrag  = null;
    this._board     = null;
    this._svg       = null;
    this._container = null;
    this._renderer  = null;
    this._particles = null;
    container.innerHTML = '';
  }

  // ── DOM build ─────────────────────────────────────────────────────────────

  _buildDOM(container) {
    const m = this._mission;

    container.innerHTML = `
      <div class="rl-mission__bg"></div>

      <div class="rl-mission__topbar">
        <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>
        <span class="rl-mission__title"><span class="rl-label-prefix">Ch&nbsp;${m.chapterNumber}:</span> ${m.title}</span>
        <button type="button" class="rl-clear-btn" id="rl-clear" title="Remove all wires and start over">↺ Rewire</button>
        <button type="button" class="rl-hint-btn" id="rl-hint" aria-label="Show hint">📓</button>
      </div>

      <div class="rl-mission__main">

        <div class="rl-mission__sidebar">
          <div class="rl-mission__swirle-portrait" id="rl-swirle">
            <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                 alt="SWIRL-E" class="rl-mission__swirle-img" id="rl-swirle-portrait">
          </div>

          <div class="rl-mission__problem" id="rl-problem"></div>
          <div class="rl-mission__actions" id="rl-actions"></div>
        </div>

        <div class="rl-board" id="rl-board">
          <svg class="rl-schematic" id="rl-svg" xmlns="http://www.w3.org/2000/svg"></svg>
        </div>

      </div>

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

    // Problem text
    const probEl = container.querySelector('#rl-problem');
    for (const line of m.problem) {
      const p = document.createElement('p');
      p.textContent = line;
      probEl.appendChild(p);
    }

    // Hint text
    const hintEl = container.querySelector('#rl-hint-text');
    for (const line of m.journalHint) {
      const p = document.createElement('p');
      p.textContent = line;
      hintEl.appendChild(p);
    }

    this._board = container.querySelector('#rl-board');
    this._svg   = container.querySelector('#rl-svg');

    // Wiring tip — floats at the top of the circuit board where eyes land first
    if (m.tip) {
      const tipEl = document.createElement('div');
      tipEl.className = 'rl-board__tip';
      tipEl.textContent = m.tip;
      this._board.appendChild(tipEl);
    }

    // ── Mission briefing overlay ──────────────────────────────────────────
    const kidMeta    = this._avatarId ? AVATAR_META[this._avatarId] : null;
    const kidName    = kidMeta?.displayName ?? '';
    const personalMsg = kidName
      ? `${kidName}, please get my eyes working. I want to see you.`
      : 'Please get my eyes working. I want to see you.';

    const briefingEl = document.createElement('div');
    briefingEl.className = 'rl-briefing';
    briefingEl.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge">Ch&nbsp;${m.chapterNumber}</span>
          <h2 class="rl-briefing__title"><span class="rl-label-prefix">Mission:</span> ${m.title}</h2>
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
          Let's Wire! <span class="rl-btn__icon-badge">⚡</span>
        </button>
      </div>
    `;

    const briefingTextEl = briefingEl.querySelector('#rl-briefing-text');
    for (const line of m.problem) {
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

  // ── Shuffle + engine + renderer build ────────────────────────────────────

  _shuffleAndBuild() {
    const m = this._mission;

    // Fisher-Yates shuffle of the passive component pool
    const pool = [...m.passivePool];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    this._slotAssignments = pool;

    // Reset tracking
    this._placedEngWires      = [];
    this._placedRenWires      = [];
    this._playerWireEndpoints = [];
    this._connectedTerms      = new Set();

    // Build CircuitEngine
    this._engine = new CircuitEngine();
    for (const comp of m.baseComponents) {
      this._engine.addComponent(comp.id, comp.type, comp.terminals);
    }
    for (let i = 0; i < pool.length; i++) {
      this._engine.addComponent(`passive-${i}`, pool[i].engineType, ['a', 'b']);
    }
    for (const wire of m.prePlacedWires) {
      this._engine.addWire(wire.from, wire.to);
    }

    // Build SchematicRenderer + render into the SVG
    this._renderer    = new SchematicRenderer(this._svg);
    this._termPositions = this._renderer.render(m.layout, pool);

    this._particles = new ParticleSystem(this._renderer.getParticleLayer());
  }

  // ── Event handling ────────────────────────────────────────────────────────

  _attachEvents() {
    // Wire drawing — delegated to LineDragManager (core/input).
    // canStartFrom guards prevent drawing when solved/blown or terminal is already used.
    this._wireDrag = new LineDragManager(this._board, {
      svgEl:        this._svg,
      points:       this._termPositions,
      hitRadius:    44,
      canStartFrom: (id) => {
        if (!this._audioUnlocked) { this._audioUnlocked = true; unlockAudio(); }
        return !this._solved && !this._blown && !this._connectedTerms.has(id);
      },
      onDragStart:  (id)         => this._renderer.startPreview(id),
      onDragMove:   (svgX, svgY) => this._renderer.updatePreview(svgX, svgY),
      onDrop:       (from, to)   => this._tryConnect(from, to),
      onCancel:     ()           => this._renderer.clearPreview(),
    });

    this._container.querySelector('#rl-back').addEventListener('click',
      () => this.sceneManager.go('hub'));

    this._container.querySelector('#rl-clear').addEventListener('click',
      () => this._resetCircuit());

    this._container.querySelector('#rl-hint').addEventListener('click',
      () => { this._container.querySelector('#rl-hint-panel').hidden = false; });

    this._container.querySelector('#rl-hint-close').addEventListener('click',
      () => { this._container.querySelector('#rl-hint-panel').hidden = true; });
  }

  // ── Coordinate helpers ────────────────────────────────────────────────────

  /** Convert SVG user-space coordinates to board-div-relative pixel coordinates. */
  _svgToBoard(svgX, svgY) {
    const screenPt  = this._renderer.svgToScreen(svgX, svgY);
    const boardRect = this._board.getBoundingClientRect();
    return { left: screenPt.x - boardRect.left, top: screenPt.y - boardRect.top };
  }

  // ── Wire placement ────────────────────────────────────────────────────────

  _tryConnect(fromId, toId) {
    // Don't reconnect already-used terminals
    if (this._connectedTerms.has(fromId) || this._connectedTerms.has(toId)) return;

    // Don't short a component to itself
    const fromComp = fromId.split(':')[0];
    const toComp   = toId.split(':')[0];
    if (fromComp === toComp) return;

    const engId = this._engine.addWire(fromId, toId);
    const renId = this._renderer.addPlayerWire(fromId, toId);
    this._placedEngWires.push(engId);
    this._placedRenWires.push(renId);
    this._playerWireEndpoints.push({ from: fromId, to: toId });
    this._connectedTerms.add(fromId);
    this._connectedTerms.add(toId);
    this._renderer.setTerminalConnected(fromId, true);
    this._renderer.setTerminalConnected(toId, true);

    this._checkCircuit();
  }

  // ── Circuit check ─────────────────────────────────────────────────────────
  //
  // Complete circuit requires exactly 2 player wires:
  //   1. battery:plus ↔ eye:plus
  //   2a. eye:minus ↔ passive-X:a  → component X outcome
  //    OR
  //   2b. eye:minus ↔ battery:minus → direct short → explosion

  _checkCircuit() {
    const wires = this._playerWireEndpoints;

    // ── Bypass check ─────────────────────────────────────────────────────────
    // Player connected battery:plus directly to a passive component (top terminal),
    // bypassing the eye module. The bottom bus already connects passive-X:b to
    // battery:minus, so this is a complete circuit — just the wrong topology.
    const bypassWire = wires.find(w => {
      const fBat = w.from === 'battery:plus', tBat = w.to === 'battery:plus';
      const fPas = /^passive-\d+:a$/.test(w.from), tPas = /^passive-\d+:a$/.test(w.to);
      return (fBat && tPas) || (tBat && fPas);
    });
    if (bypassWire) {
      const passiveTermId = bypassWire.from === 'battery:plus' ? bypassWire.to : bypassWire.from;
      const passiveId     = passiveTermId.replace(':a', '');
      const comp          = this._engine.components.get(passiveId);
      if (!comp) return;
      if      (comp.type === 'resistor')  this._doBypassResistor(passiveId);
      else if (comp.type === 'capacitor') this._doBypassCapacitor(passiveId);
      else if (comp.type === 'inductor')  this._doBypassInductor(passiveId);
      return;
    }

    // ── Reversed polarity check ──────────────────────────────────────────────
    // Player wired battery:plus → eye:minus AND battery:minus → eye:plus.
    // Both wires required to complete the circuit; one alone is just incomplete.
    const hasFwdBatToEyeBack = wires.some(w =>
      (w.from === 'battery:plus' && w.to === 'eye:minus') ||
      (w.from === 'eye:minus'    && w.to === 'battery:plus')
    );
    const hasFwdGndToEyeFront = wires.some(w =>
      (w.from === 'battery:minus' && w.to === 'eye:plus') ||
      (w.from === 'eye:plus'      && w.to === 'battery:minus')
    );
    if (hasFwdBatToEyeBack && hasFwdGndToEyeFront) {
      this._doReversedPolarity();
      return;
    }

    const hasPowerWire = wires.some(w =>
      (w.from === 'battery:plus' && w.to === 'eye:plus') ||
      (w.from === 'eye:plus'    && w.to === 'battery:plus')
    );
    if (!hasPowerWire) return;

    // Find the wire connected to eye:minus
    const eyeWire = wires.find(w => w.from === 'eye:minus' || w.to === 'eye:minus');
    if (!eyeWire) return;

    const otherEnd = eyeWire.from === 'eye:minus' ? eyeWire.to : eyeWire.from;

    // Direct short — eye:minus connected straight to battery:minus
    if (otherEnd === 'battery:minus') {
      this._doExplosion('⚡ Direct short! No protection at all — the eyes burned out!');
      setTimeout(() => this._showOutcomeSummary('short'), 3800);
      return;
    }

    // Component choice — eye:minus connected to passive-X:a
    const match = otherEnd.match(/^passive-(\d+):a$/);
    if (!match) return;

    const passiveId = `passive-${match[1]}`;
    const comp = this._engine.components.get(passiveId);
    if (!comp) return;

    if      (comp.type === 'resistor')  this._doSuccess(passiveId);
    else if (comp.type === 'capacitor') this._doCapacitor(passiveId);
    else if (comp.type === 'inductor')  this._doInductor(passiveId);
  }

  // ── Outcome: Resistor → SUCCESS ───────────────────────────────────────────

  _doSuccess(passiveId) {
    this._solved     = true;
    this._everSolved = true;
    this._completedChapters.add(this._mission.id); // mark before overlay appears

    // Clear any leftover action buttons (e.g. Next Chapter from a prior solve)
    const actionsElEarly = this._container.querySelector('#rl-actions');
    if (actionsElEarly) actionsElEarly.innerHTML = '';
    this._renderer.setPowered(true);
    this._renderer.setEyesPowered(true);

    // Light up SWIRL-E's eyes
    this._setSwirleEyes('on');

    // Start particles (uses current direction preference)
    const waypoints = this._buildWaypoints(passiveId);
    this._replayFn  = () => this._particles.start(waypoints,
      { count: 10, speed: 160, direction: this._currentParticleDir });
    this._replayFn();

    // Update problem text
    const probEl = this._container.querySelector('#rl-problem');
    if (probEl) probEl.innerHTML =
      `<p class="rl-msg rl-msg--success">${this._mission.successMessage}</p>`;

    // SWIRL-E bounces
    const swirle = this._container.querySelector('#rl-swirle');
    if (swirle) {
      swirle.classList.add('rl-swirle--celebrating');
      setTimeout(() => swirle.classList.remove('rl-swirle--celebrating'), 2000);
    }

    // Direction toggle + replay + next chapter shortcut
    this._showDirectionToggle();
    this._showReplayButton();
    this._showNextChapterButton();

    // Outcome summary — appears after confetti winds down
    setTimeout(() => this._showOutcomeSummary('success'), 3000);

    // Confetti
    celebrate('large', {
      duration: 2500,
      onComplete: async () => {
        const progress = await this.storage.get('progress', { completedChapters: [] });
        if (!progress.completedChapters.includes(this._mission.id)) {
          progress.completedChapters.push(this._mission.id);
        }
        await this.storage.set('progress', progress);
      },
    });
  }

  // ── Outcome: Capacitor → charge then stall ────────────────────────────────

  _doCapacitor(passiveId) {
    this._blown = true;  // lock input

    const waypoints = this._buildWaypoints(passiveId);
    const TOTAL_MS  = 3200;
    let   firstRun  = true;

    const runAnimation = () => {
      if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
      this._particles.stop();
      this._renderer.setCapacitorCharge(passiveId, 0);
      this._renderer.setPowered(true);

      // Particles decelerate to 0 as capacitor charges
      this._particles.start(waypoints, {
        count:   8,
        speed:   140,
        direction: this._currentParticleDir,
        speedFn: (elapsed) => Math.max(0, 1 - elapsed / TOTAL_MS),
      });

      // Animate capacitor plate fill
      const startTime = performance.now();
      const animCap = (now) => {
        const t = Math.min(1, (now - startTime) / TOTAL_MS);
        this._renderer.setCapacitorCharge(passiveId, t);

        if (t < 1) {
          this._animRaf = requestAnimationFrame(animCap);
        } else {
          // Fully charged — current stops
          this._particles.stop();
          this._renderer.setPowered(false);

          if (firstRun) {
            firstRun = false;
            const probEl = this._container.querySelector('#rl-problem');
            if (probEl) probEl.innerHTML = `
              <p class="rl-msg rl-msg--fail">The capacitor charged up and blocked the current!</p>
              <p class="rl-msg rl-msg--detail">Capacitors store charge but stop DC current from flowing. Try the resistor!</p>
            `;
            this._showDirectionToggle();
            this._showReplayButton();
            setTimeout(() => this._showResetButton(), 600);
            setTimeout(() => this._showOutcomeSummary('capacitor'), 1400);
          }
        }
      };
      this._animRaf = requestAnimationFrame(animCap);
    };

    this._replayFn = runAnimation;
    runAnimation();
  }

  // ── Outcome: Inductor → ramp up then EXPLOSION ───────────────────────────

  _doInductor(passiveId) {
    this._blown = true;

    const waypoints = this._buildWaypoints(passiveId);
    const RAMP_MS   = 4000;
    let   firstRun  = true;

    const runAnimation = () => {
      if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
      this._particles.stop();
      this._renderer.setInductorField(passiveId, 0);
      this._renderer.setPowered(true);

      // Particles accelerate from 0 → full speed (ease-in)
      this._particles.start(waypoints, {
        count:   8,
        speed:   180,
        direction: this._currentParticleDir,
        speedFn: (elapsed) => {
          const t = Math.min(1, elapsed / RAMP_MS);
          return t * t;  // quadratic ease-in
        },
      });

      // Animate inductor magnetic field rings growing
      const startTime = performance.now();
      const animInd = (now) => {
        const t = Math.min(1, (now - startTime) / RAMP_MS);
        this._renderer.setInductorField(passiveId, t);

        if (t < 1) {
          this._animRaf = requestAnimationFrame(animInd);
        } else {
          // Full current reached
          this._particles.stop();
          if (firstRun) {
            firstRun = false;
            // First run: full explosion drama + show buttons + summary
            this._doExplosion('The inductor reached full current with no resistance — the eyes burned out!');
            this._showDirectionToggle();
            this._showReplayButton();
            setTimeout(() => this._showOutcomeSummary('inductor'), 3800);
          } else {
            // Replay: sound + smoke + flash/fireball at eye module
            playCanBurst();
            this._renderer.showEyeSmoke(this._mission.layout.eyeModule.box);
            const emR  = this._mission.layout.eyeModule;
            const posR = this._svgToBoard(emR.box.x + emR.box.w / 2, emR.box.y + emR.box.h / 2);
            const ovl  = document.createElement('div');
            ovl.className = 'rl-explosion';
            ovl.innerHTML = `
              <div class="rl-explosion__flash"></div>
              <div class="rl-explosion__epicenter" style="left:${posR.left.toFixed(0)}px;top:${posR.top.toFixed(0)}px;">
                <div class="rl-explosion__fireball">💥</div>
              </div>`;
            this._board?.appendChild(ovl);
            setTimeout(() => ovl.remove(), 2800);
          }
        }
      };
      this._animRaf = requestAnimationFrame(animInd);
    };

    this._replayFn = runAnimation;
    runAnimation();
  }

  // ── Outcome: Bypass — battery:plus wired directly to passive, skipping eye ─

  _doBypassResistor(passiveId) {
    this._blown = true;
    const waypoints = this._buildBypassWaypoints(passiveId);
    this._replayFn = () => {
      this._particles.stop();
      this._particles.start(waypoints, {
        count:     8,
        speed:     140,
        direction: this._currentParticleDir,
      });
    };
    this._replayFn();

    const probEl = this._container.querySelector('#rl-problem');
    if (probEl) probEl.innerHTML = `
      <p class="rl-msg rl-msg--fail">1mA flows — but SWIRL-E's eyes aren't in this circuit!</p>
      <p class="rl-msg rl-msg--detail">The eye module needs to be wired between the battery and the resistor.</p>
    `;
    this._showDirectionToggle();
    this._showReplayButton();
    setTimeout(() => this._showResetButton(), 600);
    setTimeout(() => this._showOutcomeSummary('bypass-resistor'), 2500);
  }

  _doBypassCapacitor(passiveId) {
    this._blown = true;
    const waypoints = this._buildBypassWaypoints(passiveId);
    const TOTAL_MS  = 3200;
    let   firstRun  = true;

    const runAnimation = () => {
      if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
      this._particles.stop();
      this._renderer.setCapacitorCharge(passiveId, 0);

      this._particles.start(waypoints, {
        count:     8,
        speed:     140,
        direction: this._currentParticleDir,
        speedFn:   (elapsed) => Math.max(0, 1 - elapsed / TOTAL_MS),
      });

      const startTime = performance.now();
      const animCap = (now) => {
        const t = Math.min(1, (now - startTime) / TOTAL_MS);
        this._renderer.setCapacitorCharge(passiveId, t);
        if (t < 1) {
          this._animRaf = requestAnimationFrame(animCap);
        } else {
          this._particles.stop();
          if (firstRun) {
            firstRun = false;
            const probEl = this._container.querySelector('#rl-problem');
            if (probEl) probEl.innerHTML = `
              <p class="rl-msg rl-msg--fail">The capacitor charged up and blocked the current!</p>
              <p class="rl-msg rl-msg--detail">And SWIRL-E's eyes were never in this circuit at all.</p>
            `;
            this._showDirectionToggle();
            this._showReplayButton();
            setTimeout(() => this._showResetButton(), 600);
            setTimeout(() => this._showOutcomeSummary('bypass-capacitor'), 1400);
          }
        }
      };
      this._animRaf = requestAnimationFrame(animCap);
    };

    this._replayFn = runAnimation;
    runAnimation();
  }

  _doBypassInductor(passiveId) {
    this._blown = true;
    const waypoints = this._buildBypassWaypoints(passiveId);
    const RAMP_MS   = 4000;
    const DRAIN_MS  = 2000;
    let   firstRun  = true;

    const runAnimation = () => {
      if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
      this._particles.stop();
      this._renderer.setInductorField(passiveId, 0);

      this._particles.start(waypoints, {
        count:     8,
        speed:     180,
        direction: this._currentParticleDir,
        speedFn:   (elapsed) => {
          const t = Math.min(1, elapsed / RAMP_MS);
          return t * t;  // ease-in: inductor resists then yields
        },
      });

      const startTime = performance.now();
      const animInd = (now) => {
        const t = Math.min(1, (now - startTime) / RAMP_MS);
        this._renderer.setInductorField(passiveId, t);
        if (t < 1) {
          this._animRaf = requestAnimationFrame(animInd);
        } else {
          // Full current — battery drains for DRAIN_MS then dies
          setTimeout(() => {
            this._particles.stop();
            if (firstRun) {
              firstRun = false;
              const probEl = this._container.querySelector('#rl-problem');
              if (probEl) probEl.innerHTML = `
                <p class="rl-msg rl-msg--fail">Full current, no resistance — the battery drained fast!</p>
                <p class="rl-msg rl-msg--detail">And SWIRL-E's eyes were never in this circuit. They never powered on.</p>
              `;
              this._showDirectionToggle();
              this._showReplayButton();
              setTimeout(() => this._showResetButton(), 600);
              setTimeout(() => this._showOutcomeSummary('bypass-inductor'), 1400);
            }
          }, DRAIN_MS);
        }
      };
      this._animRaf = requestAnimationFrame(animInd);
    };

    this._replayFn = runAnimation;
    runAnimation();
  }

  // ── Outcome: Reversed polarity ───────────────────────────────────────────

  _doReversedPolarity() {
    // Brief "backwards" particle flow before the explosion sells the story
    const waypoints = this._buildReversedWaypoints();
    this._renderer.setPowered(true);
    this._particles.start(waypoints, {
      count:     8,
      speed:     160,
      direction: this._currentParticleDir,
    });
    setTimeout(() => {
      this._particles.stop();
      this._renderer.setPowered(false);
      this._doExplosion('⚡ Reversed polarity! The battery is wired backwards — the eye module is fried!');
      setTimeout(() => this._showOutcomeSummary('reversed'), 3800);
    }, 1200);
  }

  // ── Outcome: Explosion ────────────────────────────────────────────────────

  _doExplosion(message) {
    this._blown = true;
    this._particles?.stop();
    this._renderer.setWiresWrong();
    this._renderer.setEyesFried();
    this._setSwirleEyes('fried');

    // Sound + smoke
    playCanBurst();
    this._renderer.showEyeSmoke(this._mission.layout.eyeModule.box);

    // Position epicenter over the eye module box
    const em  = this._mission.layout.eyeModule;
    const pos = this._svgToBoard(em.box.x + em.box.w / 2, em.box.y + em.box.h / 2);

    const overlay = document.createElement('div');
    overlay.className = 'rl-explosion';
    overlay.innerHTML = `
      <div class="rl-explosion__flash"></div>
      <div class="rl-explosion__epicenter" style="left:${pos.left.toFixed(0)}px;top:${pos.top.toFixed(0)}px;">
        <div class="rl-explosion__fireball">💥</div>
        <div class="rl-explosion__smoke rl-explosion__smoke--1"></div>
        <div class="rl-explosion__smoke rl-explosion__smoke--2"></div>
        <div class="rl-explosion__smoke rl-explosion__smoke--3"></div>
      </div>
    `;
    this._board.appendChild(overlay);

    const probEl = this._container.querySelector('#rl-problem');
    if (probEl) probEl.innerHTML =
      `<p class="rl-msg rl-msg--fail">${message}</p>`;

    setTimeout(() => overlay.remove(), 2800);
    setTimeout(() => this._showResetButton(), 3000);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _setSwirleEyes(state) {
    const img = this._container?.querySelector('#rl-swirle-portrait');
    if (!img) return;
    img.src = state === 'on'
      ? 'games/robot-lab/assets/images/swirle-powered.png'
      : 'games/robot-lab/assets/images/swirle-unpowered.png';
  }

  _showDirectionToggle() {
    const actionsEl = this._container.querySelector('#rl-actions');
    if (!actionsEl) return;

    const wrap = document.createElement('div');
    wrap.className = 'rl-dir-toggle';
    wrap.dataset.showing = this._currentParticleDir;
    wrap.setAttribute('role', 'button');
    wrap.setAttribute('tabindex', '0');
    wrap.setAttribute('aria-label', 'Toggle current flow direction');
    wrap.innerHTML = `
      <div class="rl-dir-toggle__track">
        <div class="rl-dir-toggle__thumb"></div>
      </div>
      <div class="rl-dir-toggle__labels">
        <span class="rl-dir-toggle__label" data-dir="conventional">⊕ Conventional</span>
        <span class="rl-dir-toggle__label" data-dir="electron">⊖ Electrons</span>
      </div>
    `;

    wrap.addEventListener('click', () => {
      this._currentParticleDir =
        this._currentParticleDir === 'electron' ? 'conventional' : 'electron';
      this._particles.setDirection(this._currentParticleDir);
      wrap.dataset.showing = this._currentParticleDir;
    });

    actionsEl.appendChild(wrap);
  }

  _showReplayButton() {
    const actionsEl = this._container.querySelector('#rl-actions');
    if (!actionsEl) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rl-btn rl-btn--replay';
    btn.textContent = '▶ Simulate';
    btn.addEventListener('click', () => { if (this._replayFn) this._replayFn(); });
    actionsEl.appendChild(btn);
  }

  _showNextChapterButton() {
    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === this._mission.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;
    if (!nextChapter) return; // already the last chapter

    const actionsEl = this._container.querySelector('#rl-actions');
    if (!actionsEl) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rl-btn rl-btn--next-chapter';
    btn.textContent = 'Next Chapter →';
    btn.addEventListener('click', () => {
      const route = CHAPTER_SCENES[nextChapter.id];
      if (route) {
        const routeData = { avatarId: this._avatarId };
        if (route.missionId) routeData.missionId = route.missionId;
        this.sceneManager.go(route.scene, routeData);
      } else {
        this.sceneManager.go('hub', { avatarId: this._avatarId });
      }
    });
    actionsEl.appendChild(btn);
  }

  _showResetButton() {
    const actionsEl = this._container.querySelector('#rl-actions');
    if (!actionsEl) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rl-btn rl-btn--reset';
    btn.textContent = '🔄 Try Again';
    btn.addEventListener('click', () => this._resetCircuit());
    actionsEl.appendChild(btn);
  }

  // ── Outcome Summary Overlay ───────────────────────────────────────────────

  /**
   * Pop up a mission-briefing-style card explaining what happened.
   * @param {'success'|'capacitor'|'inductor'|'short'} type
   */
  _showOutcomeSummary(type) {
    if (!this._container) return;

    const isSuccess = type === 'success';
    const cardType  = isSuccess ? 'success' : 'fail';

    const CONTENT = {
      success: {
        badge: '✓ Mission Complete', badgeClass: 'rl-briefing__badge--success',
        title: 'SWIRL-E Can See!',   titleClass: 'rl-briefing__title--success',
        eyeState: 'on',
        lines: [
          "The resistor did exactly what it's supposed to — it limited the current to a safe level.",
          "Ohm's Law tells us how much current flows:",
        ],
        math: `<span class="rl-fraction"><span class="rl-fraction__num">9V</span><span class="rl-fraction__denom">9,000Ω</span></span><span>= 0.001A = 1mA</span><span class="rl-math__badge rl-math__badge--ok">✓</span>`,
        mathClass: 'rl-math--good',
      },
      capacitor: {
        badge: '✗ Wrong Part',       badgeClass: 'rl-briefing__badge--fail',
        title: 'Current Blocked!',   titleClass: 'rl-briefing__title--fail',
        eyeState: 'sleeping',
        lines: [
          "A capacitor is like a tiny bucket — it fills up with charge, then stops the flow completely.",
          "DC current can't pass through a fully-charged capacitor. SWIRL-E gets a quick flash, then nothing.",
        ],
        math: `<span>Capacitor full → Current = 0A</span><span class="rl-math__badge rl-math__badge--fail">✗</span>`,
        mathClass: 'rl-math--bad',
      },
      inductor: {
        badge: '💥 Overload',        badgeClass: 'rl-briefing__badge--fail',
        title: 'Burned Out!',        titleClass: 'rl-briefing__title--fail',
        eyeState: 'fried',
        lines: [
          "An inductor resists changes in current — but once it \"charges up\", it acts like a plain wire.",
          "With nothing to actually limit steady current, it built up until it exceeded the safe limit.",
        ],
        math: `<span>Steady state:</span><span class="rl-fraction"><span class="rl-fraction__num">9V</span><span class="rl-fraction__denom">~0Ω</span></span><span>= way too many Amps</span><span class="rl-math__badge rl-math__badge--boom">💥</span>`,
        mathClass: 'rl-math--bad',
      },
      short: {
        badge: '⚡ Short Circuit',   badgeClass: 'rl-briefing__badge--fail',
        title: 'Direct Short!',      titleClass: 'rl-briefing__title--fail',
        eyeState: 'fried',
        lines: [
          "No component at all — you connected the battery terminals straight to each other.",
          "Zero resistance means nothing limits the current. It rushed straight through.",
        ],
        math: `<span class="rl-fraction"><span class="rl-fraction__num">9V</span><span class="rl-fraction__denom">0Ω</span></span><span>= ∞ Amps</span><span class="rl-math__badge rl-math__badge--boom">💥</span>`,
        mathClass: 'rl-math--bad',
      },
      reversed: {
        badge: '⚡ Reversed Polarity', badgeClass: 'rl-briefing__badge--fail',
        title: 'Wired Backwards!',     titleClass: 'rl-briefing__title--fail',
        eyeState: 'fried',
        lines: [
          "The positive battery terminal was connected to the negative side of the eye module — and the negative to the positive.",
          "Polarized components like LEDs only work in one direction. Reversed polarity burns them out instantly.",
        ],
        math: `<span>+ to − and − to + = instant failure</span><span class="rl-math__badge rl-math__badge--boom">💥</span>`,
        mathClass: 'rl-math--bad',
      },
      'bypass-resistor': {
        badge: '⚡ Wrong Path',       badgeClass: 'rl-briefing__badge--fail',
        title: 'Eyes Bypassed!',      titleClass: 'rl-briefing__title--fail',
        eyeState: 'sleeping',
        lines: [
          "The resistor is doing its job — 1mA is flowing. But SWIRL-E's eyes are not in this circuit.",
          "You connected the battery directly to the resistor, leaving the eye module completely unpowered.",
        ],
        math: `<span class="rl-fraction"><span class="rl-fraction__num">9V</span><span class="rl-fraction__denom">9,000Ω</span></span><span>= 1mA (not through the eyes)</span><span class="rl-math__badge rl-math__badge--fail">✗</span>`,
        mathClass: 'rl-math--bad',
      },
      'bypass-capacitor': {
        badge: '✗ Wrong Path',        badgeClass: 'rl-briefing__badge--fail',
        title: 'Eyes Bypassed!',      titleClass: 'rl-briefing__title--fail',
        eyeState: 'sleeping',
        lines: [
          "The capacitor charged up and blocked the current — just like when it's in series with the eyes.",
          "But SWIRL-E's eyes were never in this circuit at all. They're wired in a completely separate path.",
        ],
        math: `<span>Capacitor charged → Current = 0A</span><span class="rl-math__badge rl-math__badge--fail">✗</span>`,
        mathClass: 'rl-math--bad',
      },
      'bypass-inductor': {
        badge: '🔋 Battery Drained',  badgeClass: 'rl-briefing__badge--fail',
        title: 'Battery Drained!',    titleClass: 'rl-briefing__title--fail',
        eyeState: 'sleeping',
        lines: [
          "The inductor reached full current, then acted like a plain wire with no resistance. The battery drained fast.",
          "And SWIRL-E's eyes weren't even in this circuit. They never powered on.",
        ],
        math: `<span>Steady state:</span><span class="rl-fraction"><span class="rl-fraction__num">9V</span><span class="rl-fraction__denom">~0Ω</span></span><span>= max current → battery dead</span><span class="rl-math__badge rl-math__badge--boom">💥</span>`,
        mathClass: 'rl-math--bad',
      },
    };

    const c = CONTENT[type];
    if (!c) return;

    const mkEye = (side) => c.eyeState !== 'fried'
      ? `<div class="rl-swirle__eye rl-swirle__eye--${side} rl-swirle__eye--${c.eyeState}"><div class="rl-swirle__pupil"></div></div>`
      : `<div class="rl-swirle__eye rl-swirle__eye--${side} rl-swirle__eye--fried"></div>`;

    const overlayEl = document.createElement('div');
    overlayEl.className  = 'rl-briefing rl-outcome-summary';
    overlayEl.dataset.type = cardType;

    const avatarMeta = this._avatarId ? AVATAR_META[this._avatarId]   : null;
    const avatarImg  = this._avatarId ? AVATAR_IMAGES[this._avatarId] : null;
    const kidName    = avatarMeta?.displayName ?? '';
    const kidColor   = avatarMeta?.color ?? '#D4A959';

    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === this._mission.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;

    const chaptersHTML = ROBOT_LAB_CHAPTERS.map((ch, i) => {
      const done = this._completedChapters.has(ch.id);
      return `<li class="rl-chapter-item ${done ? 'rl-chapter-item--done' : ''}">
        <span class="rl-chapter-check">${done ? '✓' : ''}</span>
        <span class="rl-chapter-label">${i + 1}. ${ch.label}</span>
      </li>`;
    }).join('');

    const bodyHTML = isSuccess
      ? `
        <div class="rl-success-body">
          <div class="rl-success-left">
            <div class="rl-success-swirle-wrap">
              <img src="games/robot-lab/assets/images/swirle-powered.png"
                   alt="SWIRL-E" class="rl-success-swirle-img">
            </div>
            <p class="rl-swirle-greeting">HELLO, ${kidName.toUpperCase() || 'FRIEND'}. I CAN SEE YOU NOW!</p>
            <div class="rl-success-explain">
              ${c.lines.map(l => `<p>${l}</p>`).join('')}
              <div class="rl-math ${c.mathClass}">${c.math}</div>
            </div>
          </div>
          <div class="rl-success-right">
            ${avatarImg ? `
            <div class="rl-success-kid-wrap" style="border-color:${kidColor}">
              <img src="${avatarImg}" alt="${kidName}" class="rl-success-kid-img">
            </div>` : ''}
            <p class="rl-systems-title">SWIRL-E SYSTEMS</p>
            <ol class="rl-chapter-list">
              ${chaptersHTML}
            </ol>
          </div>
        </div>`
      : `
        <div class="rl-briefing__body">
          <div class="rl-briefing__robot-col">
            <div class="rl-briefing__portrait">
              <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-briefing__robot-name">SWIRL-E</p>
          </div>
          <div class="rl-briefing__bubble">
            <div class="rl-briefing__text">
              ${c.lines.map(l => `<p>${l}</p>`).join('')}
              <div class="rl-math ${c.mathClass}">${c.math}</div>
            </div>
          </div>
        </div>`;

    overlayEl.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge ${c.badgeClass}">${c.badge}</span>
          <h2 class="rl-briefing__title ${c.titleClass}">${c.title}</h2>
        </div>
        ${bodyHTML}
        <div class="rl-outcome__btns">
          <button type="button" class="rl-btn rl-btn--replay" id="rl-oc-replay">▶ Simulate</button>
          ${!isSuccess ? '<button type="button" class="rl-btn rl-btn--reset" id="rl-oc-reset">🔄 Try Again</button>' : ''}
          ${isSuccess && nextChapter ? `<button type="button" class="rl-btn rl-btn--next-chapter" id="rl-oc-next">Next Chapter →</button>` : ''}
          <button type="button" class="rl-btn rl-outcome__close-btn" id="rl-oc-close">Close</button>
        </div>
      </div>
    `;

    const dismiss = (fn) => {
      overlayEl.classList.add('rl-briefing--hiding');
      setTimeout(() => { overlayEl.remove(); fn?.(); }, 380);
    };

    overlayEl.querySelector('#rl-oc-close').addEventListener('click',
      () => dismiss());
    overlayEl.querySelector('#rl-oc-replay')?.addEventListener('click',
      () => dismiss(() => { if (this._replayFn) this._replayFn(); }));
    overlayEl.querySelector('#rl-oc-reset')?.addEventListener('click',
      () => dismiss(() => this._resetCircuit()));

    overlayEl.querySelector('#rl-oc-next')?.addEventListener('click', () => {
      dismiss(() => {
        const route = nextChapter ? CHAPTER_SCENES[nextChapter.id] : null;
        if (route) {
          const routeData = { avatarId: this._avatarId };
          if (route.missionId) routeData.missionId = route.missionId;
          this.sceneManager.go(route.scene, routeData);
        } else {
          // Chapter not yet built — return to hub
          this.sceneManager.go('hub', { avatarId: this._avatarId });
        }
      });
    });

    this._container.appendChild(overlayEl);
  }

  // ── Reset (re-shuffles components) ────────────────────────────────────────

  _resetCircuit() {
    if (this._animRaf) { cancelAnimationFrame(this._animRaf); this._animRaf = null; }
    this._particles?.stop();

    this._solved             = false;
    this._blown              = false;
    this._replayFn           = null;
    this._currentParticleDir = 'electron';

    // Re-shuffle and rebuild everything in the SVG
    this._shuffleAndBuild();

    // Terminal positions change after each shuffle — keep LineDragManager in sync
    this._wireDrag?.setPoints(this._termPositions);

    // Restore problem text
    const probEl = this._container.querySelector('#rl-problem');
    if (probEl) {
      probEl.innerHTML = '';
      for (const line of this._mission.problem) {
        const p = document.createElement('p');
        p.textContent = line;
        probEl.appendChild(p);
      }
    }

    // Clear action buttons, then restore Next Chapter if already earned
    const actionsEl = this._container.querySelector('#rl-actions');
    if (actionsEl) actionsEl.innerHTML = '';
    if (this._everSolved) this._showNextChapterButton();

    // Reset SWIRL-E eyes
    this._setSwirleEyes('sleeping');
  }

  // ── Waypoints for particle path ───────────────────────────────────────────

  /**
   * Build CW (conventional current) waypoints for the closed circuit path.
   * battery:plus → eye:plus → eye:minus → passive-X:a → passive-X:b → battery:minus → battery:plus
   *
   * @param {string|null} passiveId  — e.g. 'passive-1', or null for direct short
   * @returns {Array<[number,number]>}
   */
  _buildWaypoints(passiveId) {
    const layout = this._mission.layout;
    const bp = layout.battery.plus;
    const ep = layout.eyeModule.plus;
    const em = layout.eyeModule.minus;
    const bm = layout.battery.minus;

    if (passiveId) {
      const slotIdx = parseInt(passiveId.split('-')[1], 10);
      const slot    = layout.componentSlots[slotIdx];
      return [
        [bp.x,    bp.y],           // battery:plus (55,570)
        [ep.x,    ep.y],           // eye:plus  (55,160) — straight up
        [em.x,    em.y],           // eye:minus (315,160) — through eye module
        [slot.cx, em.y],           // elbow corner (cx,160) — horizontal along top rail
        [slot.cx, slot.topY],      // passive-X:a (cx,270) — drop down stub
        [slot.cx, slot.bottomY],   // passive-X:b (cx,460) — through component
        [slot.cx, bm.y],           // bottom bus junction (cx,570) — drop to bottom bus
        [bm.x,    bm.y],           // battery:minus (315,570) — left along bottom bus
        [bp.x,    bp.y],           // close loop through battery
      ];
    }

    // Direct short — eye:minus straight down to battery:minus
    return [
      [bp.x, bp.y],
      [ep.x, ep.y],
      [em.x, em.y],
      [bm.x, bm.y],
      [bp.x, bp.y],
    ];
  }

  /**
   * Waypoints for reversed polarity: battery:plus → eye:minus → eye:plus → battery:minus.
   * Traces the backwards path through the eye module before the explosion.
   */
  _buildReversedWaypoints() {
    const layout = this._mission.layout;
    const bp = layout.battery.plus;   // (55, 570)
    const bm = layout.battery.minus;  // (315, 570)
    const ep = layout.eyeModule.plus; // (55, 160)
    const em = layout.eyeModule.minus;// (315, 160)
    return [
      [bp.x, bp.y],  // battery:plus  (55, 570)
      [bp.x, ep.y],  // up left side  (55, 160)
      [em.x, em.y],  // right to eye:minus (315, 160) — enters wrong end
      [ep.x, ep.y],  // left through eye backwards to eye:plus (55, 160)
      [ep.x, bm.y],  // down left side (55, 570)
      [bm.x, bm.y],  // right to battery:minus (315, 570)
      [bp.x, bp.y],  // close loop
    ];
  }

  /**
   * Waypoints for the bypass path: battery:plus → passive-X:a → passive-X:b → bus → battery:minus.
   * Used when the player wires battery:plus directly to a component, bypassing the eye module.
   * @param {string} passiveId  — e.g. 'passive-1'
   */
  _buildBypassWaypoints(passiveId) {
    const layout  = this._mission.layout;
    const bp      = layout.battery.plus;
    const bm      = layout.battery.minus;
    const slotIdx = parseInt(passiveId.split('-')[1], 10);
    const slot    = layout.componentSlots[slotIdx];
    return [
      [bp.x,    bp.y],           // battery:plus  (55, 570)
      [bp.x,    slot.topY],      // elbow: straight up to component height (55, 270)
      [slot.cx, slot.topY],      // passive-X:a   (cx, 270) — right along top rail
      [slot.cx, slot.bottomY],   // passive-X:b   (cx, 460) — through component
      [slot.cx, bm.y],           // bottom bus    (cx, 570) — stub down to bus
      [bm.x,    bm.y],           // battery:minus (315, 570) — left along bus
      [bp.x,    bp.y],           // close loop through battery
    ];
  }
}
