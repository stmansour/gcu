/**
 * Robot Lab — Chapter 4: Shoulder Drive System
 *
 * Flow:
 *   briefing overlay    — mission intro (shown once on entry)
 *   workbench phase     — task summary + gear cartridges + voltage + live monitors
 *   test phase          — arm animation; outcome shown; nav buttons on success
 *
 * The task is randomised on entry (and on every "Different task" reroll). The
 * task implies the lift target and pace — the player chooses gear + voltage to
 * meet it. Multiple combinations pass; engineering is about tradeoffs.
 *
 * Sidebar follows Ch1–3: portrait, speech, actions, Grandpa's Journal.
 * All science controls live in the main work area.
 */

import { Scene }       from '../../../core/scene/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { celebrate }   from '../../../core/rewards/index.js';
import { CHAPTER_4 }   from '../missions/chapter4.js';
import {
  ARM_JOBS, ARM_TORQUE_SPEC, GEAR_CARTRIDGES, TASKS, VOLTAGE_SETTINGS,
  evaluate, randomTask,
} from '../engine/ShoulderEngine.js';
import { ShoulderGearRenderer, ShoulderArmRenderer } from '../renderer/ShoulderRenderer.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

const IMG_BASE = 'games/robot-lab/assets/images/';
const TASK_MEMORY_KEY = 'ch4TaskMemory';
const REQUIRED_CH4_MEMORIES = 4;

// ── Concrete language for the monitors ──────────────────────────────────────

const STRAIN_LABELS = {
  green:  'OK',
  yellow: 'Working hard',
  red:    'Too much!',
  stall:  'Stalling!',
};

const TORQUE_LABELS = {
  green:  'OK',
  yellow: 'High',
  red:    'Too much!',
};

/** 0..1 fill fraction for the strain bar. */
function strainFill(stress) {
  return Math.min(1, Math.max(0.04, stress));
}

/** Render runtime as "≈ 1 h 30 m" rather than "90 min". */
function formatRuntime(min) {
  if (min < 60) return `≈ ${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `≈ ${h} h`;
  return `≈ ${h} h ${m} m`;
}

/** Voltage tagline rewritten for kids. */
const VOLTAGE_TAGLINES = {
  '3v': 'Easy on the battery · slower motor',
  '6v': 'Balanced power and battery life',
  '9v': 'Fast and powerful · drains faster',
};

export class ArmMotorMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    this._phase   = 'workbench';   // 'workbench' | 'test'
    this._task    = null;          // current TASKS entry
    this._jobId   = null;          // derived from task.jobId
    this._gearId  = null;
    this._voltId  = null;
    this._state   = null;
    this._solved  = false;
    this._briefingShown = false;

    this._container       = null;
    this._gearRenderer    = null;
    this._armRenderer     = null;
    this._avatarId        = null;
    this._completedChapters = new Set();
    this._taskMemory = { solvedTaskIds: [] };
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  enter(container, data = {}) {
    this._avatarId = data.avatarId ?? null;
    this._container = container;
    this._phase  = 'workbench';
    this._gearId = null;
    this._voltId = null;
    this._state  = null;
    this._solved = false;

    container.className = 'rl-mission';
    container.innerHTML = '';

    this.storage.get(TASK_MEMORY_KEY, { solvedTaskIds: [] }).then(memory => {
      if (this._container !== container) return;
      this._taskMemory = this._normalizeTaskMemory(memory);
      this._task  = randomTask(null, this._taskMemory.solvedTaskIds);
      this._jobId = this._task.jobId;

      this._buildShell(container);
      this._showPhase('workbench');
      this._showBriefing();

      this.storage.get('progress', { completedChapters: [] }).then(p => {
        if (this._container !== container) return;
        this._completedChapters = new Set(p.completedChapters);
        if (this._completedChapters.has(CHAPTER_4.id)) {
          this._solved = true;
          this._refreshNavButtons();
        }
      });
    });
  }

  exit(container) {
    this._gearRenderer?.stop();
    this._armRenderer?.stop();
    this._gearRenderer = null;
    this._armRenderer  = null;
    this._container    = null;
    container.innerHTML = '';
  }

  // ── Shell ─────────────────────────────────────────────────────────────────

  _buildShell(container) {
    const m = CHAPTER_4;
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
            <img src="${IMG_BASE}swirle-unpowered.png"
                 alt="SWIRL-E" class="rl-mission__swirle-img" id="rl-swirle-portrait">
          </div>
          <div class="rl-mission__problem" id="rl-problem"></div>
          <div class="rl-mission__actions"  id="rl-actions"></div>
          <button type="button" class="rl-btn rl-btn--journal" id="rl-hint">
            📖 Grandpa's Journal
          </button>
        </div>

        <div class="rl-board sh-board" id="rl-board"></div>

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
    const m = CHAPTER_4;
    const personalMsg = 'Can you teach me which gears to remember for each job?';

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
              <img src="${IMG_BASE}swirle-unpowered.png"
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
          Teach SWIRL-E! <span class="rl-btn__icon-badge">⚙️</span>
        </button>
      </div>
    `;

    briefingEl.querySelector('#rl-briefing-go').addEventListener('click', () => {
      briefingEl.classList.add('rl-briefing--hiding');
      this._briefingShown = true;
      this._setSpeech(CHAPTER_4.speech.taskHint);
      setTimeout(() => briefingEl.remove(), 380);
    });

    this._container.appendChild(briefingEl);
    this._setSpeech(CHAPTER_4.speech.taskRevealed);
  }

  // ── Phase switcher ────────────────────────────────────────────────────────

  _showPhase(phase) {
    this._phase = phase;
    const board = this._container.querySelector('#rl-board');
    board.innerHTML = '';
    this._gearRenderer?.stop(); this._gearRenderer = null;
    this._armRenderer?.stop();  this._armRenderer  = null;

    if (phase === 'workbench') this._buildWorkbenchPhase(board);
    if (phase === 'test')      this._buildTestPhase(board);
  }

  // ── Sidebar helpers ───────────────────────────────────────────────────────

  _setSpeech(text) {
    const el = this._container.querySelector('#rl-problem');
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

    const chapterIdx = ROBOT_LAB_CHAPTERS.findIndex(c => c.id === CHAPTER_4.id);
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

  // ── Phase: Workbench ──────────────────────────────────────────────────────

  _buildWorkbenchPhase(board) {
    const job  = ARM_JOBS[this._jobId];
    const task = this._task;
    const solvedCount = this._taskMemory.solvedTaskIds.length;
    this._setSwirleImage('swirle-powered.png');

    board.innerHTML = `
      <div class="sh-workbench">

        <div class="sh-task-banner">
          <div class="sh-task-banner__icon">${task.icon}</div>
          <div class="sh-task-banner__text">
            <div class="sh-task-banner__story">${task.story}</div>
            <div class="sh-task-banner__specs">
              Weight: <strong>${job.targetKg} kg / ${job.targetLb} lb</strong>
              &nbsp;·&nbsp; Move: <strong>${task.moveHint}</strong>
              &nbsp;·&nbsp; Memory: <strong>${solvedCount}/${TASKS.length}</strong>
            </div>
          </div>
          <div class="sh-task-banner__controls">
            <label class="sh-task-banner__picker">
              <span>Case</span>
              <select id="sh-pick-task" class="sh-task-banner__select">
                ${TASKS.map(t => `
                  <option value="${t.id}" ${t.id === task.id ? 'selected' : ''}>
                    ${t.icon} ${t.label}${this._taskMemory.solvedTaskIds.includes(t.id) ? ' ✓' : ''}
                  </option>
                `).join('')}
              </select>
            </label>
            <button type="button" class="sh-task-banner__change" id="sh-change-task">
              🎲 Random
            </button>
            <button type="button" class="sh-task-banner__clear" id="sh-clear-choices" disabled>
              Clear Current Choices
            </button>
            <button type="button" class="sh-task-banner__reset" id="sh-reset-memory">
              Reset memory
            </button>
          </div>
        </div>

        <div class="sh-status-board" id="sh-status-board">
          <div class="sh-status-tile sh-status-tile--neutral" id="sh-status-heat">
            <span class="sh-status-tile__label">Motor Heat</span>
            <strong class="sh-status-tile__value">—</strong>
            <span class="sh-status-tile__sub">choose gear + power</span>
          </div>
          <div class="sh-status-tile sh-status-tile--neutral" id="sh-status-weight">
            <span class="sh-status-tile__label">Weight</span>
            <strong class="sh-status-tile__value">${job.targetKg} kg</strong>
            <span class="sh-status-tile__sub">${job.targetLb} lb target</span>
          </div>
          <div class="sh-status-tile sh-status-tile--neutral" id="sh-status-gears">
            <span class="sh-status-tile__label">Gears</span>
            <strong class="sh-status-tile__value">Pick ratio</strong>
            <span class="sh-status-tile__sub">1:3 · 1:1 · 3:1 · 6:1</span>
          </div>
          <div class="sh-status-tile sh-status-tile--neutral" id="sh-status-speed">
            <span class="sh-status-tile__label">Speed</span>
            <strong class="sh-status-tile__value">—</strong>
            <span class="sh-status-tile__sub">needs ${job.speedGoal}</span>
          </div>
          <div class="sh-status-tile sh-status-tile--neutral" id="sh-status-torque">
            <span class="sh-status-tile__label">Torque</span>
            <strong class="sh-status-tile__value">—</strong>
            <span class="sh-status-tile__sub">${ARM_TORQUE_SPEC.maxNm} N m max</span>
          </div>
        </div>

        <div class="sh-workbench__body">

          <div class="sh-gear-panel">
            <h3 class="sh-panel-heading">1. Gear Ratio</h3>
            <div class="sh-cartridges" id="sh-cartridges"></div>
            <canvas class="sh-gear-preview" id="sh-gear-preview"></canvas>
          </div>

          <div class="sh-power-panel">
            <h3 class="sh-panel-heading">2. Power</h3>
            <div class="sh-voltage-btns" id="sh-voltage-btns"></div>

            <div class="sh-arm-rating">
              <span class="sh-arm-rating__label">Arm torque rating</span>
              <strong>${ARM_TORQUE_SPEC.maxNm} N m</strong>
              <span>${ARM_TORQUE_SPEC.maxFtLb.toFixed(1)} ft lb max · about ${Math.floor(ARM_TORQUE_SPEC.maxSafeKg)} kg at SWIRL-E's arm length</span>
            </div>

            <button type="button" class="rl-btn sh-test-btn" id="sh-test-btn" disabled>
              Test It! ▶
            </button>
            <button type="button" class="rl-btn sh-unsafe-btn" id="sh-unsafe-btn">
              Not safe for SWIRL-E
            </button>
          </div>

        </div>
      </div>
    `;

    // Cartridges
    const cartridgesEl = board.querySelector('#sh-cartridges');
    Object.values(GEAR_CARTRIDGES).forEach(g => {
      const card = document.createElement('div');
      card.className = 'sh-cartridge-card';
      card.dataset.gear = g.id;
      card.innerHTML = `
        <div class="sh-cartridge-card__img-wrap">
          ${g.image
            ? `<img src="${IMG_BASE}${g.image}" alt="${g.label}" class="sh-cartridge-card__img"
                 onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
               <div class="sh-cartridge-card__fallback" style="display:none">${g.displayRatio}</div>`
            : `<div class="sh-cartridge-card__fallback">${g.displayRatio}</div>`}
        </div>
        <div class="sh-cartridge-card__body">
          <div class="sh-cartridge-card__label">${g.label}</div>
          <div class="sh-cartridge-card__tagline">${g.tagline}</div>
        </div>
      `;
      card.addEventListener('click', () => this._selectGear(g.id));
      cartridgesEl.appendChild(card);
    });

    // Voltage buttons
    const voltEl = board.querySelector('#sh-voltage-btns');
    Object.values(VOLTAGE_SETTINGS).forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sh-volt-btn';
      btn.dataset.volt = v.id;
      btn.innerHTML = `<span class="sh-volt-btn__label">${v.label}</span>
                       <span class="sh-volt-btn__tagline">${VOLTAGE_TAGLINES[v.id]}</span>`;
      btn.addEventListener('click', () => this._selectVolt(v.id));
      voltEl.appendChild(btn);
    });

    // Restore prior selections (e.g. coming back from test)
    if (this._gearId) {
      this._container.querySelector(`[data-gear="${this._gearId}"]`)
        ?.classList.add('sh-cartridge-card--selected');
    }
    if (this._voltId) {
      this._container.querySelector(`[data-volt="${this._voltId}"]`)
        ?.classList.add('sh-volt-btn--selected');
    }

    // Gear preview canvas
    const previewCanvas = board.querySelector('#sh-gear-preview');
    this._gearRenderer = new ShoulderGearRenderer(previewCanvas);
    this._gearRenderer.setLoad({ kg: job.targetKg, lb: job.targetLb });
    if (this._gearId) this._gearRenderer.setGear(this._gearId);
    if (this._voltId) this._gearRenderer.setVoltage(this._voltId);
    this._updateStatusBoard();
    this._updateChoiceButtons();

    board.querySelector('#sh-change-task').addEventListener('click', () => {
      this._rerollTask();
    });
    board.querySelector('#sh-pick-task').addEventListener('change', event => {
      this._selectTask(event.target.value);
    });
    board.querySelector('#sh-reset-memory').addEventListener('click', () => {
      this._resetTaskMemory();
    });
    board.querySelector('#sh-test-btn').addEventListener('click', () => {
      this._showPhase('test');
    });
    board.querySelector('#sh-unsafe-btn').addEventListener('click', () => {
      this._answerUnsafeLoad();
    });
    board.querySelector('#sh-clear-choices').addEventListener('click', () => {
      this._clearChoices();
    });

    if (this._gearId && this._voltId) this._updateMonitors();
  }

  _rerollTask() {
    const oldId = this._task?.id;
    this._task  = randomTask(oldId, this._taskMemory.solvedTaskIds);
    this._jobId = this._task.jobId;
    this._gearId = null;
    this._voltId = null;
    this._state  = null;
    this._setSpeech(CHAPTER_4.speech.taskRevealed);
    this._showPhase('workbench');
  }

  _selectTask(taskId) {
    const nextTask = TASKS.find(t => t.id === taskId);
    if (!nextTask) return;
    this._task = nextTask;
    this._jobId = nextTask.jobId;
    this._gearId = null;
    this._voltId = null;
    this._state = null;
    this._setSpeech(CHAPTER_4.speech.taskRevealed);
    this._showPhase('workbench');
  }

  async _resetTaskMemory() {
    this._taskMemory = { solvedTaskIds: [] };
    await this.storage.set(TASK_MEMORY_KEY, this._taskMemory);
    this._setSpeech("Memory cleared. Let's teach these jobs again from the beginning.");
    this._showPhase('workbench');
  }

  _answerUnsafeLoad() {
    if (!this._isCurrentTaskUnsafe()) {
      this._setSpeech(CHAPTER_4.speech.safeLoad);
      return;
    }

    // Show the strongest available drive so the lesson is clear: even when the
    // motor and gears could move the load, the arm rating says SWIRL-E should not.
    this._gearId = '6to1';
    this._voltId = '9v';
    this._state = evaluate(this._gearId, this._voltId, this._jobId);
    this._showPhase('test');
  }

  _clearChoices() {
    this._gearId = null;
    this._voltId = null;
    this._state = null;
    this._showPhase('workbench');
  }

  _isCurrentTaskUnsafe() {
    const job = ARM_JOBS[this._jobId];
    const torqueNm = job.targetKg * 9.80665 * ARM_TORQUE_SPEC.armLengthM;
    return torqueNm >= ARM_TORQUE_SPEC.maxNm;
  }

  _selectGear(gearId) {
    this._gearId = gearId;
    this._container.querySelectorAll('.sh-cartridge-card').forEach(c => {
      c.classList.toggle('sh-cartridge-card--selected', c.dataset.gear === gearId);
    });
    this._gearRenderer?.setGear(gearId);
    if (this._voltId) this._gearRenderer?.setVoltage(this._voltId);
    this._updateMonitors();
    this._updateWorkbenchSpeech();
  }

  _selectVolt(voltId) {
    this._voltId = voltId;
    this._container.querySelectorAll('.sh-volt-btn').forEach(b => {
      b.classList.toggle('sh-volt-btn--selected', b.dataset.volt === voltId);
    });
    this._gearRenderer?.setVoltage(voltId);
    this._updateMonitors();
    this._updateWorkbenchSpeech();
  }

  _updateWorkbenchSpeech() {
    if (this._gearId && this._voltId)  this._setSpeech(CHAPTER_4.speech.bothReady);
    else if (this._gearId)             this._setSpeech(CHAPTER_4.speech.gearOnly);
    else if (this._voltId)             this._setSpeech(CHAPTER_4.speech.voltOnly);
  }

  _updateMonitors() {
    this._updateStatusBoard();
    this._updateChoiceButtons();
    if (!this._gearId || !this._voltId) {
      const btn = this._container.querySelector('#sh-test-btn');
      if (btn) btn.disabled = true;
      return;
    }

    const s   = evaluate(this._gearId, this._voltId, this._jobId);
    this._state = s;
    const job = ARM_JOBS[this._jobId];

    // Lift capacity
    const liftColor = s.liftKg >= job.targetKg ? 'green' : 'red';
    this._setMonitor('lift', `${s.liftKg} kg`, liftColor);

    // Strain bar
    this._setStrainBar(s.stress, s.stressColor);
    this._setMonitor('torque', this._formatLoadTorque(s), this._stressUiColor(s.torqueColor));

    // Speed: show what's selected and what the task needs (when they differ)
    const speedText = s.speedDelta === 0
      ? s.speed
      : `${s.speed}  (needs ${job.speedGoal})`;
    this._setMonitor('speed', speedText, this._speedColor(s.speedDelta));

    // Battery runtime
    this._setBatteryBar(s.runtime);

    // Heat
    this._setMonitor('heat', s.heat, this._heatColor(s.heat));

    // Send load torque, stall, and heat separately to the preview.
    this._gearRenderer?.setStressColor(s.torqueColor);
    this._gearRenderer?.setStalled(s.outcome === 'stall' || s.outcome === 'unsafe-load');
    this._gearRenderer?.setHeat(s.heat);
    this._gearRenderer?.setLoad({ kg: job.targetKg, lb: job.targetLb });

    const btn = this._container.querySelector('#sh-test-btn');
    if (btn) btn.disabled = false;
  }

  _updateChoiceButtons() {
    const clearBtn = this._container.querySelector('#sh-clear-choices');
    if (clearBtn) clearBtn.disabled = !this._gearId && !this._voltId;
  }

  _updateStatusBoard(state = null) {
    const job = ARM_JOBS[this._jobId];
    const gear = this._gearId ? GEAR_CARTRIDGES[this._gearId] : null;
    const volt = this._voltId ? VOLTAGE_SETTINGS[this._voltId] : null;
    const s = state || (this._gearId && this._voltId ? evaluate(this._gearId, this._voltId, this._jobId) : null);
    const torque = this._loadTorqueForJob(job);
    const torqueColor = this._torqueColor(torque.ratio);
    const hasPartialSetup = Boolean(gear || volt);

    this._setStatusTile('weight', {
      value: `${job.targetKg} kg`,
      sub: `${job.targetLb} lb target`,
      color: torqueColor,
    });

    this._setStatusTile('torque', {
      value: `${torque.nm.toFixed(1)} N m`,
      sub: `${(torque.nm * 0.737562149).toFixed(1)} ft lb · max ${ARM_TORQUE_SPEC.maxNm} N m`,
      color: torqueColor,
    });

    if (!gear) {
      this._setStatusTile('gears', {
        value: 'Pick ratio',
        sub: volt ? `${volt.label} power ready` : '1:3 · 1:1 · 3:1 · 6:1',
        color: volt ? 'partial' : 'neutral',
      });
    } else if (!s) {
      this._setStatusTile('gears', { value: gear.displayRatio, sub: 'choose power', color: 'partial' });
    } else {
      const gearColor = s.outcome === 'stall' ? 'red' : this._motorLoadColor(s.stressColor);
      this._setStatusTile('gears', { value: gear.displayRatio, sub: `can lift ${s.liftKg} kg`, color: gearColor });
    }

    if (!s) {
      const waitingValue = gear && !volt
        ? 'Waiting on voltage...'
        : volt && !gear
          ? 'Waiting on gears...'
          : '—';
      const partialSub = gear && !volt
        ? `${gear.displayRatio} selected`
        : volt && !gear
          ? `${volt.label} selected`
          : `needs ${job.speedGoal}`;
      this._setStatusTile('speed', {
        value: waitingValue,
        sub: hasPartialSetup ? partialSub : `needs ${job.speedGoal}`,
        color: hasPartialSetup ? 'partial' : 'neutral',
      });
      this._setStatusTile('heat', {
        value: waitingValue,
        sub: hasPartialSetup ? partialSub : 'choose gear + power',
        color: hasPartialSetup ? 'partial' : 'neutral',
      });
      return;
    }

    const speedText = s.speedDelta === 0 ? s.speed : `${s.speed}`;
    const speedSub = s.speedDelta === 0 ? 'matches job' : `needs ${job.speedGoal}`;
    this._setStatusTile('speed', { value: speedText, sub: speedSub, color: this._speedColor(s.speedDelta) });

    const heat = this._heatStatus(s);
    this._setStatusTile('heat', heat);
  }

  _setStatusTile(key, { value, sub, color }) {
    const el = this._container?.querySelector(`#sh-status-${key}`);
    if (!el) return;
    el.className = `sh-status-tile sh-status-tile--${color || 'neutral'}`;
    const valueEl = el.querySelector('.sh-status-tile__value');
    const subEl = el.querySelector('.sh-status-tile__sub');
    if (valueEl) valueEl.textContent = value;
    if (subEl) subEl.textContent = sub;
  }

  _loadTorqueForJob(job) {
    const nm = job.targetKg * 9.80665 * ARM_TORQUE_SPEC.armLengthM;
    return { nm, ratio: nm / ARM_TORQUE_SPEC.maxNm };
  }

  _torqueColor(ratio) {
    if (ratio >= 1) return 'red';
    if (ratio > 0.72) return 'yellow';
    return 'green';
  }

  _motorLoadColor(stressColor) {
    if (stressColor === 'stall') return 'red';
    if (stressColor === 'red' || stressColor === 'yellow') return 'yellow';
    return 'green';
  }

  _heatStatus(state) {
    if (state.outcome === 'stall') return { value: 'Stall', sub: 'motor cannot lift', color: 'red' };
    if (state.heat === 'Hot') return { value: 'Hot', sub: 'too much heat', color: 'red' };
    if (state.heat === 'Warm') return { value: 'Acceptable', sub: 'watch runtime', color: 'yellow' };
    return { value: 'Low', sub: 'motor cool', color: 'green' };
  }

  _setMonitor(key, value, color) {
    const el = this._container.querySelector(`#sh-v-${key}`);
    if (!el) return;
    el.textContent = value;
    el.className   = `sh-monitor__value sh-monitor__value--${color}`;
  }

  _formatLoadTorque(state) {
    const status = TORQUE_LABELS[state.torqueColor] || '—';
    return `${state.loadTorqueNm.toFixed(1)} / ${ARM_TORQUE_SPEC.maxNm} N m (${status})`;
  }

  _driveLabel(state = this._state) {
    const selectedGear = GEAR_CARTRIDGES[this._gearId];
    void state;
    if (!selectedGear) return 'Gear ratio';
    return `${selectedGear.displayRatio} gears`;
  }

  _setStrainBar(stress, stressColor) {
    const fill  = this._container.querySelector('#sh-strain-fill');
    const label = this._container.querySelector('#sh-strain-label');
    if (!fill || !label) return;
    const colorClass = stressColor === 'stall' ? 'red' : stressColor;
    fill.style.width = `${strainFill(stress) * 100}%`;
    fill.className   = `sh-bar__fill sh-bar__fill--${colorClass}`;
    label.textContent = STRAIN_LABELS[stressColor] || '—';
    label.className   = `sh-bar__label sh-bar__label--${colorClass}`;
  }

  _setBatteryBar(runtimeMin) {
    const fill  = this._container.querySelector('#sh-battery-fill');
    const label = this._container.querySelector('#sh-battery-label');
    if (!fill || !label) return;
    // Map runtime range (10–120 min) → 0..1 for visual fill.
    const pct = Math.max(0.05, Math.min(1, (runtimeMin - 10) / 110));
    fill.style.width = `${pct * 100}%`;
    label.textContent = formatRuntime(runtimeMin);
    // Color: green if 60+ min, yellow if 25–60, red if under 25
    const cls = runtimeMin >= 60 ? 'green' : runtimeMin >= 25 ? 'yellow' : 'red';
    fill.className = `sh-bar__fill sh-bar__fill--battery sh-bar__fill--${cls}`;
  }

  _speedColor(delta) {
    if (delta === 0)             return 'green';
    if (Math.abs(delta) === 1)   return 'yellow';
    return 'red';
  }

  _stressUiColor(stressColor) {
    if (stressColor === 'green') return 'green';
    if (stressColor === 'yellow') return 'yellow';
    return 'red';
  }

  _heatColor(heat) {
    if (heat === 'Cool') return 'green';
    if (heat === 'Warm') return 'yellow';
    return 'red';
  }

  // ── Phase: Test ───────────────────────────────────────────────────────────

  _buildTestPhase(board) {
    if (!this._state) {
      this._state = evaluate(this._gearId, this._voltId, this._jobId);
    }
    const s = this._state;

    board.innerHTML = `
      <div class="sh-test-area">
        <div class="sh-test-header">
          ${this._task.icon} ${this._task.label}
          &nbsp;·&nbsp; ${this._driveLabel(s)}
          &nbsp;·&nbsp; ${VOLTAGE_SETTINGS[this._voltId].label}
        </div>
        <div class="sh-arm-frame" id="sh-arm-frame">
          <canvas class="sh-arm-canvas" id="sh-arm-canvas"></canvas>
        </div>
        <div class="sh-test-actions" id="sh-test-actions"></div>
      </div>
    `;

    this._setSpeech(this._speechForOutcome(s.outcome));
    this._setSwirleImage(s.outcome === 'success' ? 'swirle-powered.png' : 'swirle-unpowered.png');

    const canvas = board.querySelector('#sh-arm-canvas');
    const frame  = board.querySelector('#sh-arm-frame');
    const frameH = frame.getBoundingClientRect().height;
    if (frameH > 0) canvas.style.height = `${frameH}px`;
    this._armRenderer = new ShoulderArmRenderer(canvas, IMG_BASE);
    this._runArmTest();
  }

  _runArmTest() {
    const actionsEl = this._container.querySelector('#sh-test-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    const s = this._state;
    this._setSpeech(this._speechForOutcome(s.outcome));
    this._setSwirleImage(s.outcome === 'success' ? 'swirle-powered.png' : 'swirle-unpowered.png');
    this._armRenderer?.run(this._jobId, s.outcome, s.armSpeedFactor, () => this._onTestDone(s.outcome));
  }

  _onTestDone(outcome) {
    const actionsEl = this._container.querySelector('#sh-test-actions');
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    if (outcome === 'success' || outcome === 'unsafe-load') {
      this._solved = true;
      celebrate(this._container, 'medium');
      this._rememberSolvedTaskLocal();
      this._saveProgress();
      this._setSpeech(outcome === 'unsafe-load' ? CHAPTER_4.speech.unsafeCorrect : CHAPTER_4.speech.done);
      actionsEl.appendChild(this._buildCompletionSummary());
      return;
    }

    const replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.className = 'rl-btn rl-btn--start';
    replayBtn.textContent = '▶ Run Test Again';
    replayBtn.addEventListener('click', () => this._runArmTest());
    actionsEl.appendChild(replayBtn);

    const tryBtn = document.createElement('button');
    tryBtn.type = 'button';
    tryBtn.className = 'rl-btn rl-btn--reset';
    tryBtn.textContent = '🔧 Try Different Parts';
    tryBtn.addEventListener('click', () => {
      this._setSpeech(CHAPTER_4.speech.tryAgain);
      this._showPhase('workbench');
    });
    actionsEl.appendChild(tryBtn);

    if (outcome === 'success' || outcome === 'unsafe-load') {
      const nextTaskBtn = document.createElement('button');
      nextTaskBtn.type = 'button';
      nextTaskBtn.className = 'rl-btn rl-btn--start';
      nextTaskBtn.textContent = '🧠 Teach Another Job';
      nextTaskBtn.addEventListener('click', () => {
        this._setSpeech(CHAPTER_4.speech.taskRevealed);
        this._rerollTask();
      });
      actionsEl.appendChild(nextTaskBtn);
    }
  }

  _speechForOutcome(outcome) {
    if (outcome === 'unsafe-load') return CHAPTER_4.speech.unsafeLoad;
    if (outcome === 'stall') return CHAPTER_4.speech.stall;
    if (outcome === 'too-hot') return CHAPTER_4.speech.tooHot;
    if (outcome === 'mismatch') return CHAPTER_4.speech.mismatch;
    return CHAPTER_4.speech.success;
  }

  _rememberSolvedTaskLocal() {
    if (!this._task?.id) return;
    if (!this._taskMemory.solvedTaskIds.includes(this._task.id)) {
      this._taskMemory = {
        ...this._taskMemory,
        solvedTaskIds: [...this._taskMemory.solvedTaskIds, this._task.id],
      };
    }
  }

  /**
   * Completion summary that EXPLAINS the design choice, not just lists it.
   * The "why this works" line varies based on the actual configuration.
   */
  _buildCompletionSummary() {
    const job  = ARM_JOBS[this._jobId];
    const gear = GEAR_CARTRIDGES[this._gearId];
    const s    = this._state;
    const volt = VOLTAGE_SETTINGS[this._voltId];
    const chapterIdx = ROBOT_LAB_CHAPTERS.findIndex(c => c.id === CHAPTER_4.id);
    const next = ROBOT_LAB_CHAPTERS[chapterIdx + 1];
    const nextInfo = next ? CHAPTER_SCENES[next.id] : null;
    const memoryCount = this._taskMemory.solvedTaskIds.length;
    const canAdvance = memoryCount >= REQUIRED_CH4_MEMORIES;
    const remaining = Math.max(0, REQUIRED_CH4_MEMORIES - memoryCount);

    const headroom = s.liftKg - job.targetKg;
    let why;
    if (s.outcome === 'unsafe-load') {
      why = `The strongest drive can move up to ${s.liftKg} kg, but this load creates ${s.loadTorqueNm.toFixed(1)} N m of torque. SWIRL-E's arm is rated for ${ARM_TORQUE_SPEC.maxNm} N m, so the safe answer is not to lift it.`;
    } else if (gear.ratio === 6) {
      why = `The 6:1 gears trade speed for strength — plenty of lift (${headroom} kg to spare) and the motor stays cool, so the battery lasts ${formatRuntime(s.runtime)}.`;
    } else if (gear.ratio === 3) {
      why = `The 3:1 gears strike a balance — enough strength for ${job.targetKg} kg with ${headroom} kg headroom, while keeping a useful pace.`;
    } else if (gear.ratio < 1) {
      why = `The 1:3 gears trade strength for speed — ideal for very light objects where a quick gentle grab matters more than lifting power.`;
    } else {
      why = `1:1 gears keep the arm fast. With ${volt.label}, you're getting ${s.speed.toLowerCase()} movement and ${headroom} kg of lift headroom.`;
    }

    const wrap = document.createElement('div');
    wrap.className = 'sh-complete-card';
    wrap.innerHTML = `
      <div class="sh-complete-card__title">Memory added!</div>
      <div class="sh-complete-card__body">
        <div class="sh-complete-card__row">
          <strong>Task:</strong> ${this._task.icon} ${this._task.label}
        </div>
        <div class="sh-complete-card__row">
          <strong>Drive:</strong> ${s.outcome === 'unsafe-load' ? 'No safe drive' : `${this._driveLabel(s)} + ${volt.label} power`}
        </div>
        <div class="sh-complete-card__row">
          <strong>Result:</strong> ${s.outcome === 'unsafe-load'
            ? `load torque ${s.loadTorqueNm.toFixed(1)} N m exceeds ${ARM_TORQUE_SPEC.maxNm} N m`
            : `lifts ${s.liftKg} kg · ${s.speed.toLowerCase()} pace · runs ${formatRuntime(s.runtime)}`}
        </div>
        <div class="sh-complete-card__why">${why}</div>
      </div>
      <div class="sh-complete-card__question">
        ${canAdvance ? 'Teach SWIRL-E another job, or move on?' : `Save ${remaining} more memory ${remaining === 1 ? 'entry' : 'entries'} before Chapter 5.`}
      </div>
      <div class="sh-complete-card__actions" id="sh-complete-actions"></div>
    `;

    const row = wrap.querySelector('#sh-complete-actions');

    const replayBtn = document.createElement('button');
    replayBtn.type = 'button';
    replayBtn.className = 'rl-btn sh-complete-card__btn sh-complete-card__btn--secondary';
    replayBtn.textContent = 'Run Test Again';
    replayBtn.addEventListener('click', () => this._runArmTest());
    row.appendChild(replayBtn);

    const tryBtn = document.createElement('button');
    tryBtn.type = 'button';
    tryBtn.className = 'rl-btn sh-complete-card__btn sh-complete-card__btn--secondary';
    tryBtn.textContent = 'Try Different Parts';
    tryBtn.addEventListener('click', () => {
      this._setSpeech(CHAPTER_4.speech.tryAgain);
      this._showPhase('workbench');
    });
    row.appendChild(tryBtn);

    const nextTaskBtn = document.createElement('button');
    nextTaskBtn.type = 'button';
    nextTaskBtn.className = 'rl-btn sh-complete-card__btn sh-complete-card__btn--primary';
    nextTaskBtn.textContent = 'Teach Another Job';
    nextTaskBtn.addEventListener('click', () => {
      this._setSpeech(CHAPTER_4.speech.taskRevealed);
      this._rerollTask();
    });
    row.appendChild(nextTaskBtn);

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'rl-btn sh-complete-card__btn sh-complete-card__btn--primary';
    nextBtn.textContent = canAdvance
      ? (next ? `Continue to Ch ${chapterIdx + 2}: ${next.label} →` : 'Next Chapter')
      : `${memoryCount}/${REQUIRED_CH4_MEMORIES} memories saved`;
    if (canAdvance && nextInfo) {
      nextBtn.addEventListener('click', () => {
        this.sceneManager.go(nextInfo.scene, { missionId: nextInfo.missionId, avatarId: this._avatarId });
      });
    } else {
      nextBtn.disabled = true;
      if (canAdvance) {
        nextBtn.textContent = next ? `Ch ${chapterIdx + 2}: ${next.label} (coming soon)` : 'Coming soon';
      }
    }
    row.appendChild(nextBtn);
    return wrap;
  }

  _normalizeTaskMemory(memory) {
    const solvedTaskIds = Array.isArray(memory?.solvedTaskIds)
      ? [...new Set(memory.solvedTaskIds)]
      : [];
    return { solvedTaskIds };
  }

  async _saveProgress() {
    const p = await this.storage.get('progress', { completedChapters: [] });
    const memory = this._normalizeTaskMemory(await this.storage.get(TASK_MEMORY_KEY, { solvedTaskIds: [] }));
    if (this._task?.id && !memory.solvedTaskIds.includes(this._task.id)) {
      memory.solvedTaskIds.push(this._task.id);
    }
    await this.storage.set(TASK_MEMORY_KEY, memory);
    this._taskMemory = memory;

    if (memory.solvedTaskIds.length >= REQUIRED_CH4_MEMORIES && !p.completedChapters.includes(CHAPTER_4.id)) {
      p.completedChapters.push(CHAPTER_4.id);
    }
    await this.storage.set('progress', p);
    if (p.completedChapters.includes(CHAPTER_4.id)) {
      this._completedChapters.add(CHAPTER_4.id);
    }

    this._refreshNavButtons();
  }
}
