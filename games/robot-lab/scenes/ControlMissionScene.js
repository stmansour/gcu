/**
 * Robot Lab — Chapter 5: Control Systems
 *
 * Flow:
 *   briefing overlay  — mission intro (shown once on entry)
 *   workbench phase   — two tuning sliders + live balance preview + status board
 *   test phase        — delivery run animation; outcome card; nav on success
 *
 * The player tunes Push-Back Strength (Kp) and Swing Calmer (Kd) on a real PD
 * feedback simulation, then sends SWIRL-E on three lemonade deliveries of
 * increasing bumpiness. All three deliveries must succeed to finish the
 * chapter. A whole band of knob settings passes — tuning, not guessing.
 *
 * Sidebar follows Ch1–4: portrait, speech, actions, Grandpa's Journal.
 * All science controls live in the main work area.
 */

import { Scene }       from '../../../core/scene/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { celebrate }   from '../../../core/rewards/index.js';
import { updateMeter } from '../../../core/meters/index.js';
import { CHAPTER_5 }   from '../missions/chapter5.js';
import {
  COURSES, COURSE_ORDER, KNOB_MAX, SENSOR_DELAY_S,
  evaluateRun, previewMetrics,
} from '../engine/ControlEngine.js';
import { ControlTuneRenderer, ControlDeliveryRenderer } from '../renderer/ControlRenderer.js';
import { playMotorOutcome, unlockMotorAudio } from '../audio/MotorSFX.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

const IMG_BASE = 'games/robot-lab/assets/images/';
const DELIVERY_MEMORY_KEY = 'ch5DeliveryMemory';

/** Kid-readable words under each slider position. */
const POWER_WORDS = ['Off', 'Napping', 'Sleepy', 'Gentle', 'Steady', 'Steady',
  'Firm', 'Firm', 'Strong', 'Mighty', 'Maximum'];
const BRAKE_WORDS = ['None', 'Whisper', 'Light', 'Smooth', 'Smooth', 'Firm',
  'Firm', 'Heavy', 'Heavy', 'Thick', 'Maximum'];

/** Procedural sound per outcome (reuses the Robot Lab motor SFX palette). */
const OUTCOME_SOUNDS = {
  success:  'success',
  sluggish: 'slow',
  wobble:   'wobble',
  shake:    'crash',
  fall:     'slam',
};

export class ControlMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    this._phase    = 'workbench';   // 'workbench' | 'test'
    this._courseId = COURSE_ORDER[0];
    this._kp       = 2;             // factory settings: too sleepy on purpose
    this._kd       = 0;
    this._result   = null;          // evaluateRun() verdict for the current test
    this._solved   = false;
    this._briefingShown = false;

    this._container     = null;
    this._tuneRenderer  = null;
    this._runRenderer   = null;
    this._avatarId      = null;
    this._completedChapters = new Set();
    this._deliveryMemory = { solvedCourseIds: [] };
    this._motorAudioUnlocked = false;
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  enter(container, data = {}) {
    this._avatarId  = data.avatarId ?? null;
    this._container = container;
    this._phase  = 'workbench';
    this._kp     = 2;
    this._kd     = 0;
    this._result = null;
    this._solved = false;
    this._motorAudioUnlocked = false;

    container.className = 'rl-mission';
    container.innerHTML = '';

    this.storage.get(DELIVERY_MEMORY_KEY, { solvedCourseIds: [] }).then(memory => {
      if (this._container !== container) return;
      this._deliveryMemory = this._normalizeMemory(memory);
      this._courseId = this._firstUnsolvedCourse();

      this._buildShell(container);
      this._showPhase('workbench');
      this._showBriefing();

      this.storage.get('progress', { completedChapters: [] }).then(p => {
        if (this._container !== container) return;
        this._completedChapters = new Set(p.completedChapters);
        if (this._completedChapters.has(CHAPTER_5.id)) {
          this._solved = true;
          this._refreshNavButtons();
        }
      });
    });
  }

  exit(container) {
    this._tuneRenderer?.destroy();
    this._runRenderer?.destroy();
    this._tuneRenderer = null;
    this._runRenderer  = null;
    this._container    = null;
    container.innerHTML = '';
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  _buildShell(container) {
    const m = CHAPTER_5;
    container.innerHTML = `
      <div class="rl-mission__bg"></div>

      <div class="rl-mission__topbar">
        <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>
        <span class="rl-mission__title">
          <span class="rl-label-prefix">Ch&nbsp;${m.chapterNumber}:</span> ${m.title}
        </span>
      </div>

      <div class="rl-mission__main">

        <div class="rl-mission__sidebar">
          <div class="rl-mission__swirle-portrait" id="rl-swirle">
            <img src="${IMG_BASE}swirle-powered.png"
                 alt="SWIRL-E" class="rl-mission__swirle-img" id="rl-swirle-portrait">
          </div>
          <div class="rl-mission__problem" id="rl-problem"></div>
          <div class="rl-mission__actions"  id="rl-actions"></div>
          <button type="button" class="rl-btn rl-btn--journal" id="rl-hint">
            📖 Grandpa's Journal
          </button>
        </div>

        <div class="rl-board ct-board" id="rl-board"></div>

      </div>

      <div class="rl-hint-panel" id="rl-hint-panel" hidden>
        <button type="button" class="rl-hint-panel__dismiss" id="rl-hint-x" aria-label="Close Grandpa's Journal">×</button>
        <div class="rl-hint-panel__inner">
          <div class="rl-hint-panel__paper">
            <h3 class="rl-hint-panel__heading">Grandpa's Journal</h3>
            <div class="rl-hint-panel__text" id="rl-hint-text"></div>
            <button type="button" class="rl-btn rl-btn--close" id="rl-hint-close">Got it!</button>
          </div>
        </div>
      </div>
    `;

    const hintEl = container.querySelector('#rl-hint-text');
    for (const line of m.journalHints) {
      const p = document.createElement('p');
      p.textContent = line;
      hintEl.appendChild(p);
    }

    this._attachShellEvents(container);
  }

  _attachShellEvents(container) {
    const unlockOnce = () => this._ensureMotorAudio();
    container.addEventListener('pointerdown', unlockOnce, { once: true });

    container.querySelector('#rl-back').addEventListener('click', () => {
      this.sceneManager.go('robot-lab-title', { avatarId: this._avatarId });
    });
    container.querySelector('#rl-hint').addEventListener('click', () => {
      container.querySelector('#rl-hint-panel').hidden = false;
    });
    const closeHint = () => {
      container.querySelector('#rl-hint-panel').hidden = true;
    };
    container.querySelector('#rl-hint-close').addEventListener('click', closeHint);
    container.querySelector('#rl-hint-x').addEventListener('click', closeHint);
    container.querySelector('#rl-hint-panel').addEventListener('click', event => {
      if (event.target.id === 'rl-hint-panel') closeHint();
    });
  }

  _showBriefing() {
    const m = CHAPTER_5;
    const personalMsg = 'Can you tune my wobbles away? Grandma is watching.';

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
              <img src="${IMG_BASE}swirle-powered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-briefing__robot-name">SWIRL-E</p>
            <p class="rl-briefing__robot-personal">${personalMsg}</p>
          </div>
          <div class="rl-briefing__panel">
            <div class="rl-briefing__text">
              <p>${m.briefing.swirle}</p>
              <p>${m.briefing.grandpa}</p>
            </div>
          </div>
        </div>
        <button type="button" class="rl-btn rl-btn--start rl-briefing__go-btn" id="rl-briefing-go">
          Steady Him! <span class="rl-btn__icon-badge">🍋</span>
        </button>
      </div>
    `;

    briefingEl.querySelector('#rl-briefing-go').addEventListener('click', () => {
      briefingEl.classList.add('rl-briefing--hiding');
      this._briefingShown = true;
      this._setSpeech(CHAPTER_5.speech.tuneHint);
      setTimeout(() => briefingEl.remove(), 380);
    });

    this._container.appendChild(briefingEl);
    this._setSpeech(CHAPTER_5.speech.courseIntro);
  }

  // ── Phase switcher ────────────────────────────────────────────────────────

  _showPhase(phase) {
    this._phase = phase;
    const board = this._container.querySelector('#rl-board');
    board.innerHTML = '';
    this._tuneRenderer?.destroy(); this._tuneRenderer = null;
    this._runRenderer?.destroy();  this._runRenderer  = null;

    if (phase === 'workbench') this._buildWorkbenchPhase(board);
    if (phase === 'test')      this._buildTestPhase(board);
  }

  // ── Sidebar helpers ───────────────────────────────────────────────────────

  _ensureMotorAudio() {
    if (this._motorAudioUnlocked) return;
    this._motorAudioUnlocked = true;
    try { unlockMotorAudio(); } catch { /* audio optional */ }
  }

  _setSpeech(text) {
    const el = this._container.querySelector('#rl-problem');
    if (!el) return;
    el.innerHTML = '';
    const p = document.createElement('p');
    p.textContent = text;
    el.appendChild(p);
  }

  _setSwirleImage(src) {
    const img = this._container.querySelector('#rl-swirle-portrait');
    if (img) img.src = IMG_BASE + src;
  }

  _refreshNavButtons() {
    const el = this._container.querySelector('#rl-actions');
    if (!el) return;
    el.innerHTML = '';
    if (!this._solved) return;

    const chapterIdx = ROBOT_LAB_CHAPTERS.findIndex(c => c.id === CHAPTER_5.id);
    const prev = ROBOT_LAB_CHAPTERS[chapterIdx - 1];
    const next = ROBOT_LAB_CHAPTERS[chapterIdx + 1];

    if (prev && CHAPTER_SCENES[prev.id]) {
      const info = CHAPTER_SCENES[prev.id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rl-btn rl-btn--prev-chapter';
      btn.textContent = `← Ch ${chapterIdx}: ${prev.label}`;
      btn.addEventListener('click', () => {
        this.sceneManager.go(info.scene, { missionId: info.missionId, avatarId: this._avatarId });
      });
      el.appendChild(btn);
    }
    if (next) {
      const info = CHAPTER_SCENES[next.id];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rl-btn rl-btn--next-chapter';
      btn.textContent = `Ch ${chapterIdx + 2}: ${next.label} →`;
      if (info) {
        btn.addEventListener('click', () => {
          this.sceneManager.go(info.scene, { missionId: info.missionId, avatarId: this._avatarId });
        });
      } else {
        btn.disabled = true;
        btn.title = 'Coming soon!';
      }
      el.appendChild(btn);
    }
  }

  // ── Delivery memory ───────────────────────────────────────────────────────

  _normalizeMemory(memory) {
    const valid = new Set(COURSE_ORDER);
    const solvedCourseIds = Array.isArray(memory?.solvedCourseIds)
      ? [...new Set(memory.solvedCourseIds)].filter(id => valid.has(id))
      : [];
    return { solvedCourseIds };
  }

  _firstUnsolvedCourse() {
    return COURSE_ORDER.find(id => !this._deliveryMemory.solvedCourseIds.includes(id))
      ?? COURSE_ORDER[0];
  }

  _missionProgress() {
    const saved = this._deliveryMemory.solvedCourseIds.length;
    const required = COURSE_ORDER.length;
    return {
      saved,
      required,
      remaining: Math.max(0, required - saved),
      complete: saved >= required,
    };
  }

  _missionProgressHTML(progress = this._missionProgress()) {
    const status = progress.complete
      ? 'Chapter 5 complete — controller tuned!'
      : `${progress.remaining} more ${progress.remaining === 1 ? 'delivery' : 'deliveries'} to finish Chapter 5`;
    return `
      <div class="ct-mission-progress ${progress.complete ? 'ct-mission-progress--complete' : ''}">
        <div class="ct-mission-progress__label">Chapter 5 mission</div>
        <div class="ct-mission-progress__meter" aria-label="${progress.saved} of ${progress.required} deliveries completed">
          ${COURSE_ORDER.map(id => `
            <span class="ct-mission-progress__pip ${this._deliveryMemory.solvedCourseIds.includes(id) ? 'ct-mission-progress__pip--filled' : ''}"
                  title="${COURSES[id].label}">${COURSES[id].icon}</span>
          `).join('')}
        </div>
        <strong class="ct-mission-progress__count">${progress.saved}/${progress.required} deliveries done</strong>
        <span class="ct-mission-progress__status">${status}</span>
      </div>
    `;
  }

  _refreshMissionProgress() {
    this._container?.querySelectorAll('.ct-mission-progress').forEach(el => {
      el.outerHTML = this._missionProgressHTML();
    });
  }

  // ── Phase: Workbench ──────────────────────────────────────────────────────

  _buildWorkbenchPhase(board) {
    const course = COURSES[this._courseId];
    this._setSwirleImage('swirle-powered.png');

    board.innerHTML = `
      <div class="ct-workbench">

        <div class="ct-course-banner">
          <div class="ct-course-banner__icon">${course.icon}</div>
          <div class="ct-course-banner__text">
            <div class="ct-course-banner__story">${course.story}</div>
            <div class="ct-course-banner__specs">
              Route: <strong>${course.distanceLabel}</strong>
              &nbsp;·&nbsp; Pace: <strong>${course.paceLabel}</strong>
              &nbsp;·&nbsp; Deliver: <strong>≥ ${Math.round(course.passFraction * 100)}%</strong>
            </div>
          </div>
          <div class="ct-course-banner__controls">
            <label class="ct-course-banner__picker">
              <span>Delivery</span>
              <select id="ct-pick-course" class="ct-course-banner__select">
                ${COURSE_ORDER.map(id => `
                  <option value="${id}" ${id === this._courseId ? 'selected' : ''}>
                    ${COURSES[id].icon} ${COURSES[id].label}${this._deliveryMemory.solvedCourseIds.includes(id) ? ' ✓' : ''}
                  </option>
                `).join('')}
              </select>
            </label>
            <button type="button" class="ct-course-banner__reset" id="ct-reset-memory">
              Start Over
            </button>
          </div>
        </div>

        <div class="ct-dashboard">
          <div class="ct-status-board">
            <div class="ct-status-tile ct-status-tile--neutral" id="ct-status-reaction">
              <span class="ct-status-tile__label">Push-Back</span>
              <strong class="ct-status-tile__value">—</strong>
              <div class="ct-status-tile__meter" id="ct-meter-reaction"></div>
              <span class="ct-status-tile__sub">gold arrow strength</span>
            </div>
            <div class="ct-status-tile ct-status-tile--neutral" id="ct-status-wobble">
              <span class="ct-status-tile__label">Wobble</span>
              <strong class="ct-status-tile__value">—</strong>
              <div class="ct-status-tile__meter" id="ct-meter-wobble"></div>
              <span class="ct-status-tile__sub">after a route bump</span>
            </div>
            <div class="ct-status-tile ct-status-tile--neutral" id="ct-status-recovery">
              <span class="ct-status-tile__label">Recovery</span>
              <strong class="ct-status-tile__value">—</strong>
              <div class="ct-status-tile__meter" id="ct-meter-recovery"></div>
              <span class="ct-status-tile__sub">time back to level</span>
            </div>
            <div class="ct-status-tile ct-status-tile--neutral" id="ct-status-spill">
              <span class="ct-status-tile__label">Spill Risk</span>
              <strong class="ct-status-tile__value">—</strong>
              <div class="ct-status-tile__meter" id="ct-meter-spill"></div>
              <span class="ct-status-tile__sub">pace match</span>
            </div>
          </div>
          ${this._missionProgressHTML()}
        </div>

        <div class="ct-workbench__body">

          <div class="ct-controls-column">
            <div class="ct-setup-panel">

              <section class="ct-setup-section">
                <div class="ct-section-header">
                  <h3 class="ct-section-title">1. Push-Back Strength</h3>
                  <span class="ct-knob-value" id="ct-kp-value">${this._kp}</span>
                </div>
                <p class="ct-knob-hint">Watch the <strong>gold arrow</strong> — it pushes the tray back toward level when a bump tilts it</p>
                <input type="range" class="ct-slider ct-slider--power" id="ct-kp"
                       min="0" max="${KNOB_MAX}" step="1" value="${this._kp}"
                       aria-label="Push-back strength">
                <div class="ct-slider-words">
                  <span>asleep</span><span id="ct-kp-word" class="ct-slider-word">${POWER_WORDS[this._kp]}</span><span>maximum</span>
                </div>
              </section>

              <section class="ct-setup-section">
                <div class="ct-section-header">
                  <h3 class="ct-section-title">2. Swing Calmer</h3>
                  <span class="ct-knob-value" id="ct-kd-value">${this._kd}</span>
                </div>
                <p class="ct-knob-hint">Watch the <strong>blue arrow</strong> — it slows the wobble so the tray doesn't overshoot level</p>
                <input type="range" class="ct-slider ct-slider--brake" id="ct-kd"
                       min="0" max="${KNOB_MAX}" step="1" value="${this._kd}"
                       aria-label="Swing calmer">
                <div class="ct-slider-words">
                  <span>none</span><span id="ct-kd-word" class="ct-slider-word">${BRAKE_WORDS[this._kd]}</span><span>maximum</span>
                </div>
              </section>

              <section class="ct-setup-section ct-setup-section--info">
                <div class="ct-sensor-note">
                  <span class="ct-sensor-note__label">Tilt sensor lag</span>
                  <strong>${SENSOR_DELAY_S.toFixed(2).replace('0.', '0.')} s</strong>
                  <span>Even robots react to slightly old news — push too hard on it and the wobble grows!</span>
                </div>
                <button type="button" class="rl-btn ct-test-btn" id="ct-test-btn">
                  Start Delivery! ▶
                </button>
              </section>

            </div>
          </div>

          <section class="ct-preview-panel">
            <div class="ct-preview-panel__header">
              <h3 class="ct-preview-panel__title">Route Preview</h3>
              <span class="ct-preview-panel__note">Same bumps &amp; scenery as delivery</span>
              <button type="button" class="ct-poke-btn" id="ct-restart-btn">↺ Restart preview</button>
            </div>
            <div class="ct-preview-canvas-wrap">
              <canvas class="ct-preview-canvas" id="ct-preview-canvas"></canvas>
            </div>
          </section>

        </div>
      </div>
    `;

    // Live preview renderer
    const canvas = board.querySelector('#ct-preview-canvas');
    this._tuneRenderer = new ControlTuneRenderer(canvas);
    this._tuneRenderer.setCourse(this._courseId);
    this._tuneRenderer.setKnobs(this._kp, this._kd);

    // Sliders
    const kpEl = board.querySelector('#ct-kp');
    const kdEl = board.querySelector('#ct-kd');
    kpEl.addEventListener('input', () => this._onKnobChange(Number(kpEl.value), this._kd));
    kdEl.addEventListener('input', () => this._onKnobChange(this._kp, Number(kdEl.value)));

    board.querySelector('#ct-restart-btn').addEventListener('click', () => {
      this._tuneRenderer?.restart();
    });
    board.querySelector('#ct-pick-course').addEventListener('change', event => {
      this._selectCourse(event.target.value);
    });
    board.querySelector('#ct-reset-memory').addEventListener('click', () => {
      this._resetDeliveryMemory();
    });
    board.querySelector('#ct-test-btn').addEventListener('click', () => {
      this._showPhase('test');
    });

    this._updateStatusBoard();
  }

  _onKnobChange(kp, kd) {
    this._kp = kp;
    this._kd = kd;
    const board = this._container.querySelector('#rl-board');
    const kpVal = board.querySelector('#ct-kp-value');
    const kdVal = board.querySelector('#ct-kd-value');
    const kpWord = board.querySelector('#ct-kp-word');
    const kdWord = board.querySelector('#ct-kd-word');
    if (kpVal) kpVal.textContent = String(kp);
    if (kdVal) kdVal.textContent = String(kd);
    if (kpWord) kpWord.textContent = POWER_WORDS[kp];
    if (kdWord) kdWord.textContent = BRAKE_WORDS[kd];

    this._tuneRenderer?.setKnobs(kp, kd);
    this._updateStatusBoard();
  }

  _updateStatusBoard() {
    const m = previewMetrics(this._kp, this._kd, this._courseId);

    this._setStatusTile('reaction', {
      value: m.reaction.word,
      sub: 'gold arrow strength',
      color: m.reaction.color,
      meter: {
        type: 'arc',
        value: this._kp / KNOB_MAX,
        zones: [
          { stop: 0.25, color: 'red' },
          { stop: 0.45, color: 'yellow' },
          { stop: 0.78, color: 'green' },
          { stop: 1.00, color: 'yellow' },
        ],
        leftLabel: 'asleep',
        rightLabel: 'twitchy',
        ariaLabel: 'push-back strength',
      },
    });

    const wobbleValue = m.fell || m.growing ? 0.95
      : m.oscillations >= 3 ? 0.80
      : m.oscillations === 2 ? 0.52
      : m.oscillations === 1 ? 0.30
      : 0.12;
    this._setStatusTile('wobble', {
      value: m.wobble.word,
      sub: 'after a route bump',
      color: m.wobble.color,
      meter: {
        type: 'segmented',
        value: wobbleValue,
        segments: 16,
        leftLabel: 'calm',
        midLabel: 'swinging',
        rightLabel: 'growing',
      },
    });

    this._setStatusTile('recovery', {
      value: m.recovery.word,
      sub: m.recovery.seconds === null ? 'never settles' : 'time back to level',
      color: m.recovery.color,
      meter: {
        type: 'arc',
        value: m.recovery.seconds === null ? 1 : Math.min(1, m.recovery.seconds / 4),
        leftLabel: 'quick',
        rightLabel: 'never',
        ariaLabel: 'recovery time after a bump',
      },
    });

    const spillValue = m.spillRisk.word === 'Certain' ? 0.97
      : m.spillRisk.color === 'red' ? 0.85
      : m.spillRisk.color === 'yellow' ? 0.55
      : 0.18;
    this._setStatusTile('spill', {
      value: m.spillRisk.word,
      sub: m.paceMatch.word,
      color: m.spillRisk.color,
      meter: {
        type: 'segmented',
        value: spillValue,
        segments: 16,
        leftLabel: 'dry',
        midLabel: 'drips',
        rightLabel: 'soaked',
      },
    });

    this._updateTuningSpeech(m);
  }

  _setStatusTile(key, { value, sub, color, meter }) {
    const el = this._container?.querySelector(`#ct-status-${key}`);
    if (!el) return;
    el.className = `ct-status-tile ct-status-tile--${color || 'neutral'}`;
    const valueEl = el.querySelector('.ct-status-tile__value');
    const subEl = el.querySelector('.ct-status-tile__sub');
    const meterEl = el.querySelector(`#ct-meter-${key}`);
    if (valueEl) valueEl.textContent = value;
    if (subEl) subEl.textContent = sub;
    if (meterEl && meter) updateMeter(meterEl, meter);
  }

  _updateTuningSpeech(m) {
    if (!this._briefingShown) return;
    const s = CHAPTER_5.speech;
    const lesson = COURSES[this._courseId]?.pace?.lesson;
    if (m.paceMatch.color === 'red') {
      if (lesson === 'slow-gentle') this._setSpeech(s.tooTwitchyKitchen);
      else if (lesson === 'stones')    this._setSpeech(s.tooSlowStones);
      else                             this._setSpeech(s.tooStrongHill);
    } else if (this._kp <= 2)                       this._setSpeech(s.tooSleepy);
    else if (m.growing || m.fell)            this._setSpeech(s.tooTwitchy);
    else if (m.oscillations >= 3)            this._setSpeech(s.noBrake);
    else if (m.wobble.color === 'green' && m.recovery.color === 'green' && m.paceMatch.color === 'green')
                                             this._setSpeech(s.looksGood);
    else                                     this._setSpeech(s.tuneHint);
  }

  _selectCourse(courseId) {
    if (!COURSES[courseId]) return;
    this._courseId = courseId;
    this._result = null;
    this._setSpeech(CHAPTER_5.speech.courseIntro);
    this._showPhase('workbench');
  }

  async _resetDeliveryMemory() {
    this._deliveryMemory = { solvedCourseIds: [] };
    await this.storage.set(DELIVERY_MEMORY_KEY, this._deliveryMemory);

    const p = await this.storage.get('progress', { completedChapters: [] });
    const idx = p.completedChapters.indexOf(CHAPTER_5.id);
    if (idx >= 0) p.completedChapters.splice(idx, 1);
    await this.storage.set('progress', p);
    this._completedChapters.delete(CHAPTER_5.id);
    this._solved = false;
    this._refreshNavButtons();

    this._courseId = COURSE_ORDER[0];
    this._setSpeech("Deliveries cleared. Let's tune it up from the start!");
    this._showPhase('workbench');
  }

  // ── Phase: Test (the delivery run) ────────────────────────────────────────

  _buildTestPhase(board) {
    const course = COURSES[this._courseId];
    this._result = evaluateRun(this._kp, this._kd, this._courseId);

    board.innerHTML = `
      <div class="ct-test-area">
        ${this._missionProgressHTML()}
        <div class="ct-test-header">
          ${course.icon} ${course.label}
          &nbsp;·&nbsp; Push ${this._kp}
          &nbsp;·&nbsp; Calm ${this._kd}
        </div>
        <div class="ct-run-frame" id="ct-run-frame">
          <div class="ct-run-canvas-wrap">
            <canvas class="ct-run-canvas" id="ct-run-canvas"></canvas>
          </div>
        </div>
        <div class="ct-test-actions" id="ct-test-actions"></div>
      </div>
    `;

    this._setSpeech(`Delivery in progress: ${course.distanceLabel}...`);
    this._setSwirleImage('swirle-powered.png');

    const canvas = board.querySelector('#ct-run-canvas');
    this._runRenderer = new ControlDeliveryRenderer(canvas);
    this._runDelivery();
  }

  _runDelivery() {
    const actionsEl = this._container.querySelector('#ct-test-actions');
    if (actionsEl) actionsEl.innerHTML = '';
    const r = this._result;
    this._runRenderer?.run(this._kp, this._kd, this._courseId, r.outcome,
      () => this._onDeliveryDone(r));
  }

  async _onDeliveryDone(result) {
    const actionsEl = this._container.querySelector('#ct-test-actions');
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    this._ensureMotorAudio();
    try { playMotorOutcome(OUTCOME_SOUNDS[result.outcome]); } catch { /* audio optional */ }

    this._setSpeech(CHAPTER_5.speech[result.outcome]);
    this._setSwirleImage(result.outcome === 'success' ? 'swirle-powered.png' : 'swirle-unpowered.png');

    if (result.outcome === 'success') {
      celebrate('medium');
      this._rememberSolvedCourse();
      this._refreshMissionProgress();
      await this._saveProgress();
      actionsEl.appendChild(this._buildCompletionSummary(result));
      return;
    }

    const replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.className = 'rl-btn rl-btn--start';
    replayBtn.textContent = '▶ Watch That Again';
    replayBtn.addEventListener('click', () => this._runDelivery());
    actionsEl.appendChild(replayBtn);

    const tuneBtn = document.createElement('button');
    tuneBtn.type = 'button';
    tuneBtn.className = 'rl-btn rl-btn--reset';
    tuneBtn.textContent = '🔧 Back to the Bench';
    tuneBtn.addEventListener('click', () => {
      this._setSpeech(CHAPTER_5.speech.tryAgain);
      this._showPhase('workbench');
    });
    actionsEl.appendChild(tuneBtn);
  }

  /**
   * Completion card that EXPLAINS the control concept the settings used,
   * not just that the delivery passed.
   */
  _buildCompletionSummary(result) {
    const course = COURSES[this._courseId];
    const progress = this._missionProgress();
    const chapterIdx = ROBOT_LAB_CHAPTERS.findIndex(c => c.id === CHAPTER_5.id);
    const next = ROBOT_LAB_CHAPTERS[chapterIdx + 1];
    const nextInfo = next ? CHAPTER_SCENES[next.id] : null;
    const nextCourseId = this._firstUnsolvedCourse();
    const hasNextCourse = !this._deliveryMemory.solvedCourseIds.includes(nextCourseId);

    let why;
    const lesson = course.pace?.lesson;
    if (lesson === 'slow-gentle') {
      why = `Power ${this._kp} with Brake ${this._kd} matched the slow wet floor — gentle corrections, no fighting every tile seam. ${Math.round(result.lemonadeLeft * 100)}% delivered.`;
    } else if (lesson === 'stones') {
      why = `Power ${this._kp} and Brake ${this._kd} recovered between all four stones before the next bump. That's the rhythm this path demands.`;
    } else if (lesson === 'downhill') {
      why = `Power ${this._kp} and Brake ${this._kd} still worked as the hill sped SWIRL-E up. Same knobs from the kitchen would have shaken apart here.`;
    } else if (this._kd <= 2) {
      why = `Power ${this._kp} with only Brake ${this._kd} let the tray swing back and forth, but the swings died out fast enough to keep ${Math.round(result.lemonadeLeft * 100)}% of the lemonade. More brake would make it even smoother.`;
    } else if (this._kp >= 8) {
      why = `Power ${this._kp} is a strong correction — and Brake ${this._kd} is enough to stop that strength from feeding the wobble through the sensor lag. Strong push needs strong calm.`;
    } else {
      why = `Power ${this._kp} pushed back before gravity could win, and Brake ${this._kd} calmed each swing before it flew past level. ${Math.round(result.lemonadeLeft * 100)}% of the lemonade survived ${course.bumps.length} bump${course.bumps.length === 1 ? '' : 's'}.`;
    }

    const wrap = document.createElement('div');
    wrap.className = 'ct-complete-card';
    wrap.innerHTML = `
      <div class="ct-complete-card__title">Delivery complete!</div>
      <div class="ct-complete-card__body">
        <div class="ct-complete-card__row">
          <strong>Route:</strong> ${course.icon} ${course.label}
        </div>
        <div class="ct-complete-card__row">
          <strong>Tuning:</strong> Push-Back ${this._kp} + Swing Calmer ${this._kd}
        </div>
        <div class="ct-complete-card__row">
          <strong>Result:</strong> ${Math.round(result.lemonadeLeft * 100)}% lemonade delivered
          · steepest tilt ${(result.maxTilt * 57.3).toFixed(0)}°
        </div>
        <div class="ct-complete-card__why">${why}</div>
      </div>
      <div class="ct-complete-card__question">
        ${progress.complete
          ? CHAPTER_5.speech.allDone
          : `${progress.remaining} more ${progress.remaining === 1 ? 'delivery' : 'deliveries'} to finish the chapter. The next course is bumpier — your settings may need another look!`}
      </div>
      <div class="ct-complete-card__actions" id="ct-complete-actions"></div>
    `;

    const row = wrap.querySelector('#ct-complete-actions');

    const replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.className = 'rl-btn ct-complete-card__btn ct-complete-card__btn--secondary';
    replayBtn.textContent = 'Watch Again';
    replayBtn.addEventListener('click', () => this._runDelivery());
    row.appendChild(replayBtn);

    const benchBtn = document.createElement('button');
    benchBtn.type = 'button';
    benchBtn.className = 'rl-btn ct-complete-card__btn ct-complete-card__btn--secondary';
    benchBtn.textContent = 'Back to the Bench';
    benchBtn.addEventListener('click', () => this._showPhase('workbench'));
    row.appendChild(benchBtn);

    if (hasNextCourse) {
      const nextCourseBtn = document.createElement('button');
      nextCourseBtn.type = 'button';
      nextCourseBtn.className = 'rl-btn ct-complete-card__btn ct-complete-card__btn--primary';
      nextCourseBtn.textContent = `Next Delivery: ${COURSES[nextCourseId].icon} ${COURSES[nextCourseId].label}`;
      nextCourseBtn.addEventListener('click', () => {
        this._selectCourse(nextCourseId);
      });
      row.appendChild(nextCourseBtn);
    }

    if (progress.complete) {
      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'rl-btn ct-complete-card__btn ct-complete-card__btn--primary';
      if (nextInfo) {
        nextBtn.textContent = `Continue to Ch ${chapterIdx + 2}: ${next.label} →`;
        nextBtn.addEventListener('click', () => {
          this.sceneManager.go(nextInfo.scene, { missionId: nextInfo.missionId, avatarId: this._avatarId });
        });
      } else {
        nextBtn.textContent = next ? `Ch ${chapterIdx + 2}: ${next.label} (coming soon)` : 'Coming soon';
        nextBtn.disabled = true;
      }
      row.appendChild(nextBtn);
    }

    return wrap;
  }

  _rememberSolvedCourse() {
    if (!this._deliveryMemory.solvedCourseIds.includes(this._courseId)) {
      this._deliveryMemory = {
        ...this._deliveryMemory,
        solvedCourseIds: [...this._deliveryMemory.solvedCourseIds, this._courseId],
      };
    }
  }

  async _saveProgress() {
    const p = await this.storage.get('progress', { completedChapters: [] });
    const memory = this._normalizeMemory(this._deliveryMemory);
    await this.storage.set(DELIVERY_MEMORY_KEY, memory);
    this._deliveryMemory = memory;

    if (this._deliveryMemory.solvedCourseIds.length >= COURSE_ORDER.length
        && !p.completedChapters.includes(CHAPTER_5.id)) {
      p.completedChapters.push(CHAPTER_5.id);
    }
    await this.storage.set('progress', p);
    if (p.completedChapters.includes(CHAPTER_5.id)) {
      this._completedChapters.add(CHAPTER_5.id);
      this._solved = true;
    }

    this._refreshNavButtons();
  }
}
