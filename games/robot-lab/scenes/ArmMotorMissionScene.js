/**
 * Robot Lab — Chapter 4: Shoulder Drive System
 *
 * Three-phase mission:
 *   'arm-job'   — player chooses the arm personality (Fast / Balanced / Strong)
 *   'workbench' — player selects gear cartridge + voltage; live monitors update
 *   'test'      — arm animation plays; outcome shown; nav buttons appear on success
 *
 * Sidebar follows Ch1 exactly: portrait, speech, actions, Grandpa's Journal.
 * All science controls live in the main work area, never in the sidebar.
 */

import { Scene }           from '../../../core/scene/index.js';
import { GameStorage }     from '../../../core/storage/index.js';
import { celebrate }       from '../../../core/rewards/index.js';
import { CHAPTER_4 }       from '../missions/chapter4.js';
import { ARM_JOBS, GEAR_CARTRIDGES, VOLTAGE_SETTINGS, evaluate }
                           from '../engine/ShoulderEngine.js';
import { ShoulderGearRenderer, ShoulderArmRenderer }
                           from '../renderer/ShoulderRenderer.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

const IMG_BASE = 'games/robot-lab/assets/images/';

export class ArmMotorMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    this._phase   = 'arm-job';   // 'arm-job' | 'workbench' | 'test'
    this._jobId   = null;
    this._gearId  = null;
    this._voltId  = null;
    this._state   = null;        // evaluate() result
    this._solved  = false;

    this._container       = null;
    this._gearRenderer    = null;
    this._armRenderer     = null;
    this._avatarId        = null;
    this._completedChapters = new Set();
  }

  // ── Scene lifecycle ───────────────────────────────────────────────────────

  enter(container, data = {}) {
    this._avatarId = data.avatarId ?? null;
    this._container = container;
    this._phase  = 'arm-job';
    this._jobId  = null;
    this._gearId = null;
    this._voltId = null;
    this._state  = null;
    this._solved = false;

    container.className = 'rl-mission';
    this._buildShell(container);
    this._showPhase('arm-job');

    this.storage.get('progress', { completedChapters: [] }).then(p => {
      this._completedChapters = new Set(p.completedChapters);
      if (this._completedChapters.has(CHAPTER_4.id)) {
        this._solved = true;
        if (this._phase === 'arm-job') this._refreshNavButtons();
      }
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

  // ── Shell (sidebar + topbar + board wrapper) ──────────────────────────────

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
        <div class="rl-hint-panel__inner">
          <div class="rl-hint-panel__paper">
            <h3 class="rl-hint-panel__heading">Grandpa's Journal</h3>
            <div class="rl-hint-panel__text" id="rl-hint-text"></div>
            <button type="button" class="rl-btn rl-btn--close" id="rl-hint-close">Got it!</button>
          </div>
        </div>
      </div>
    `;

    // Populate journal
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
    container.querySelector('#rl-hint-close').addEventListener('click', () => {
      container.querySelector('#rl-hint-panel').hidden = true;
    });
  }

  // ── Phase switcher ────────────────────────────────────────────────────────

  _showPhase(phase) {
    this._phase = phase;
    const board = this._container.querySelector('#rl-board');
    board.innerHTML = '';
    this._gearRenderer?.stop(); this._gearRenderer = null;
    this._armRenderer?.stop();  this._armRenderer  = null;

    if (phase === 'arm-job')   this._buildArmJobPhase(board);
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

  // ── Phase 1: Arm Job ──────────────────────────────────────────────────────

  _buildArmJobPhase(board) {
    this._setSpeech(CHAPTER_4.speech.intro);
    this._setSwirleImage('swirle-unpowered.png');

    const wrap = document.createElement('div');
    wrap.className = 'sh-job-picker';
    wrap.innerHTML = `
      <p class="sh-job-picker__prompt">What kind of arm should we build for SWIRL-E?</p>
      <div class="sh-job-cards" id="sh-job-cards"></div>
    `;
    board.appendChild(wrap);

    const cards = wrap.querySelector('#sh-job-cards');
    Object.values(ARM_JOBS).forEach(job => {
      const card = document.createElement('div');
      card.className = 'sh-job-card';
      card.dataset.job = job.id;
      card.innerHTML = `
        <div class="sh-job-card__icon">${job.icon}</div>
        <div class="sh-job-card__name">${job.label}</div>
        <div class="sh-job-card__weight">${job.targetKg} kg / ${job.targetLb} lb</div>
        <div class="sh-job-card__speed">Speed: <strong>${job.speedGoal}</strong></div>
        <div class="sh-job-card__tagline">${job.tagline}</div>
        <ul class="sh-job-card__examples">
          ${job.examples.map(e => `<li>${e}</li>`).join('')}
        </ul>
      `;
      card.addEventListener('click', () => this._selectJob(job.id));
      cards.appendChild(card);
    });
  }

  _selectJob(jobId) {
    this._jobId  = jobId;
    this._gearId = null;
    this._voltId = null;
    this._state  = null;
    const card = this._container.querySelector(`[data-job="${jobId}"]`);
    card?.classList.add('sh-job-card--selected');
    setTimeout(() => this._showPhase('workbench'), 350);
  }

  // ── Phase 2: Workbench ────────────────────────────────────────────────────

  _buildWorkbenchPhase(board) {
    const job = ARM_JOBS[this._jobId];
    this._setSpeech(CHAPTER_4.speech.jobSelected);
    this._setSwirleImage('swirle-powered.png');

    board.innerHTML = `
      <div class="sh-workbench">

        <div class="sh-job-banner">
          <span class="sh-job-banner__icon">${job.icon}</span>
          <span class="sh-job-banner__label">${job.label} — ${job.targetKg} kg target</span>
          <button type="button" class="sh-job-banner__change" id="sh-change-job">Change</button>
        </div>

        <div class="sh-workbench__body">

          <div class="sh-gear-panel">
            <h3 class="sh-panel-heading">1. Gear Cartridge</h3>
            <div class="sh-cartridges" id="sh-cartridges"></div>
            <canvas class="sh-gear-preview" id="sh-gear-preview"></canvas>
          </div>

          <div class="sh-power-panel">
            <h3 class="sh-panel-heading">2. Power</h3>
            <div class="sh-voltage-btns" id="sh-voltage-btns"></div>

            <div class="sh-monitors" id="sh-monitors">
              <div class="sh-monitor">
                <span class="sh-monitor__label">Lift capacity</span>
                <span class="sh-monitor__value" id="sh-v-lift">—</span>
              </div>
              <div class="sh-monitor">
                <span class="sh-monitor__label">Arm speed</span>
                <span class="sh-monitor__value" id="sh-v-speed">—</span>
              </div>
              <div class="sh-monitor">
                <span class="sh-monitor__label">Motor stress</span>
                <span class="sh-monitor__value" id="sh-v-stress">—</span>
              </div>
              <div class="sh-monitor">
                <span class="sh-monitor__label">Battery runtime</span>
                <span class="sh-monitor__value" id="sh-v-runtime">—</span>
              </div>
              <div class="sh-monitor">
                <span class="sh-monitor__label">Motor heat</span>
                <span class="sh-monitor__value" id="sh-v-heat">—</span>
              </div>
            </div>

            <button type="button" class="rl-btn sh-test-btn" id="sh-test-btn" disabled>
              Test It! ▶
            </button>
          </div>

        </div>
      </div>
    `;

    // Gear cartridge cards
    const cartridgesEl = board.querySelector('#sh-cartridges');
    Object.values(GEAR_CARTRIDGES).forEach(g => {
      const card = document.createElement('div');
      card.className = 'sh-cartridge-card';
      card.dataset.gear = g.id;
      card.innerHTML = `
        <div class="sh-cartridge-card__img-wrap">
          <img src="${IMG_BASE}${g.image}" alt="${g.label}" class="sh-cartridge-card__img"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="sh-cartridge-card__fallback" style="display:none">${g.ratio}:1</div>
        </div>
        <div class="sh-cartridge-card__label">${g.label}</div>
        <div class="sh-cartridge-card__tagline">${g.tagline}</div>
      `;
      card.addEventListener('click', () => this._selectGear(g.id));
      cartridgesEl.appendChild(card);
    });

    // Restore previous selection if coming back from test
    if (this._gearId) this._restoreGearSelection();
    if (this._voltId) this._restoreVoltSelection();

    // Voltage buttons
    const voltEl = board.querySelector('#sh-voltage-btns');
    Object.values(VOLTAGE_SETTINGS).forEach(v => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sh-volt-btn';
      btn.dataset.volt = v.id;
      btn.innerHTML = `<span class="sh-volt-btn__label">${v.label}</span>
                       <span class="sh-volt-btn__tagline">${v.tagline}</span>`;
      btn.addEventListener('click', () => this._selectVolt(v.id));
      voltEl.appendChild(btn);
    });

    // Gear preview canvas
    const previewCanvas = board.querySelector('#sh-gear-preview');
    this._gearRenderer = new ShoulderGearRenderer(previewCanvas);
    if (this._gearId) this._gearRenderer.setGear(this._gearId);

    board.querySelector('#sh-change-job').addEventListener('click', () => {
      this._showPhase('arm-job');
    });
    board.querySelector('#sh-test-btn').addEventListener('click', () => {
      this._showPhase('test');
    });

    if (this._gearId && this._voltId) this._updateMonitors();
  }

  _restoreGearSelection() {
    const card = this._container.querySelector(`[data-gear="${this._gearId}"]`);
    card?.classList.add('sh-cartridge-card--selected');
  }

  _restoreVoltSelection() {
    const btn = this._container.querySelector(`[data-volt="${this._voltId}"]`);
    btn?.classList.add('sh-volt-btn--selected');
  }

  _selectGear(gearId) {
    this._gearId = gearId;
    this._container.querySelectorAll('.sh-cartridge-card').forEach(c => {
      c.classList.toggle('sh-cartridge-card--selected', c.dataset.gear === gearId);
    });
    this._gearRenderer?.setGear(gearId);
    this._updateMonitors();
    this._updateWorkbenchSpeech();
  }

  _selectVolt(voltId) {
    this._voltId = voltId;
    this._container.querySelectorAll('.sh-volt-btn').forEach(b => {
      b.classList.toggle('sh-volt-btn--selected', b.dataset.volt === voltId);
    });
    this._updateMonitors();
    this._updateWorkbenchSpeech();
  }

  _updateWorkbenchSpeech() {
    if (this._gearId && this._voltId)  this._setSpeech(CHAPTER_4.speech.bothReady);
    else if (this._gearId)             this._setSpeech(CHAPTER_4.speech.gearOnly);
    else if (this._voltId)             this._setSpeech(CHAPTER_4.speech.voltOnly);
  }

  _updateMonitors() {
    if (!this._gearId || !this._voltId) {
      const btn = this._container.querySelector('#sh-test-btn');
      if (btn) btn.disabled = true;
      return;
    }

    const s   = evaluate(this._gearId, this._voltId, this._jobId);
    this._state = s;
    const job = ARM_JOBS[this._jobId];

    this._setMonitor('lift',    `${s.liftKg} kg`,              s.liftKg >= job.targetKg ? 'green' : 'red');
    this._setMonitor('speed',   s.speed,                        this._speedColor(s.speedDelta));
    this._setMonitor('stress',  this._stressLabel(s.stressColor), this._stressUiColor(s.stressColor));
    this._setMonitor('runtime', `${s.runtime} min`,             'neutral');
    this._setMonitor('heat',    s.heat,                         this._heatColor(s.heat));
    this._gearRenderer?.setStressColor(s.stressColor);

    const btn = this._container.querySelector('#sh-test-btn');
    if (btn) btn.disabled = false;
  }

  _setMonitor(key, value, color) {
    const el = this._container.querySelector(`#sh-v-${key}`);
    if (!el) return;
    el.textContent = value;
    el.className   = `sh-monitor__value sh-monitor__value--${color}`;
  }

  _stressLabel(sc) {
    if (sc === 'stall') return 'Stall!';
    return sc.charAt(0).toUpperCase() + sc.slice(1);
  }

  _stressUiColor(sc) {
    if (sc === 'green')  return 'green';
    if (sc === 'yellow') return 'yellow';
    return 'red';
  }

  _speedColor(delta) {
    if (delta === 0)        return 'green';
    if (Math.abs(delta) === 1) return 'yellow';
    return 'red';
  }

  _heatColor(heat) {
    if (heat === 'Cool') return 'green';
    if (heat === 'Warm') return 'yellow';
    return 'red';
  }

  // ── Phase 3: Test ─────────────────────────────────────────────────────────

  _buildTestPhase(board) {
    if (!this._state) {
      this._state = evaluate(this._gearId, this._voltId, this._jobId);
    }
    const s   = this._state;
    const job = ARM_JOBS[this._jobId];

    board.innerHTML = `
      <div class="sh-test-area">
        <div class="sh-test-header">
          ${job.icon} ${job.label}
          &nbsp;·&nbsp;${GEAR_CARTRIDGES[this._gearId].label}
          &nbsp;·&nbsp;${VOLTAGE_SETTINGS[this._voltId].label}
        </div>
        <canvas class="sh-arm-canvas" id="sh-arm-canvas"></canvas>
        <div class="sh-test-actions" id="sh-test-actions"></div>
      </div>
    `;

    const animSpeech = s.outcome === 'stall'   ? CHAPTER_4.speech.stall
                     : s.outcome === 'too-hot' ? CHAPTER_4.speech.tooHot
                     :                           CHAPTER_4.speech.success;
    this._setSpeech(animSpeech);
    this._setSwirleImage(s.outcome === 'success' ? 'swirle-powered.png' : 'swirle-unpowered.png');

    const canvas = board.querySelector('#sh-arm-canvas');
    this._armRenderer = new ShoulderArmRenderer(canvas, IMG_BASE);
    this._armRenderer.run(this._jobId, s.outcome, () => this._onTestDone(s.outcome));
  }

  _onTestDone(outcome) {
    const actionsEl = this._container.querySelector('#sh-test-actions');
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    if (outcome === 'success') {
      this._solved = true;
      celebrate(this._container, 'medium');
      this._saveProgress();

      const installBtn = document.createElement('button');
      installBtn.type = 'button';
      installBtn.className = 'rl-btn rl-btn--start';
      installBtn.textContent = '✅ Install This Drive!';
      installBtn.addEventListener('click', () => {
        this._setSpeech(CHAPTER_4.speech.done);
        installBtn.remove();
      });
      actionsEl.appendChild(installBtn);
    }

    const tryBtn = document.createElement('button');
    tryBtn.type = 'button';
    tryBtn.className = 'rl-btn rl-btn--reset';
    tryBtn.textContent = '🔧 Try Different Parts';
    tryBtn.addEventListener('click', () => {
      this._setSpeech(CHAPTER_4.speech.tryAgain);
      this._showPhase('workbench');
    });
    actionsEl.appendChild(tryBtn);
  }

  async _saveProgress() {
    const p = await this.storage.get('progress', { completedChapters: [] });
    if (!p.completedChapters.includes(CHAPTER_4.id)) {
      p.completedChapters.push(CHAPTER_4.id);
    }
    await this.storage.set('progress', p);
    this._completedChapters.add(CHAPTER_4.id);
    this._refreshNavButtons();
  }
}
