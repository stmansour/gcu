/**
 * BalanceMissionScene.js — Chapter 5 wrist balance workbench
 */

import { Scene } from '../../../core/scene/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { celebrate } from '../../../core/rewards/index.js';
import { LineDragManager } from '../../../core/input/index.js';
import { CHAPTER_5 } from '../missions/chapter5.js';
import { BalanceSim, SERVO_LEVELS } from '../engine/BalanceEngine.js';
import { BalanceHeroRenderer, TickerMonitor } from '../renderer/BalanceRenderer.js';
import { BalanceModuleRenderer } from '../renderer/BalanceModuleRenderer.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

const IMG_BASE = 'games/robot-lab/assets/images/';
const PROGRESS_KEY = 'ch5BalanceProgress';

const EMPTY_PROGRESS = {
  bareSpill: false,
  sensorSpill: false,
  noShockWobble: false,
  shockSuccess: false,
  walkDone: false,
};

export class BalanceMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage = new GameStorage('robot-lab');
    this._sim = new BalanceSim();
    this._container = null;
    this._avatarId = null;
    this._progress = { ...EMPTY_PROGRESS };
    this._solved = false;
    this._listeners = [];
    this._hero = null;
    this._module = null;
    this._wireDrag = null;
    this._monBump = null;
    this._monTilt = null;
    this._monPush = null;
    this._lastTs = null;
    this._raf = null;
    this._stableTimer = 0;
  }

  enter(container, data = {}) {
    this._avatarId = data.avatarId ?? null;
    this._container = container;
    this._sim.reset();
    this._stableTimer = 0;
    container.className = 'rl-mission';

    this.storage.get(PROGRESS_KEY, { ...EMPTY_PROGRESS }).then(p => {
      if (this._container !== container) return;
      this._progress = { ...EMPTY_PROGRESS, ...p };
      this.storage.get('progress', { completedChapters: [] }).then(prog => {
        if (this._container !== container) return;
        this._solved = prog.completedChapters.includes(CHAPTER_5.id);
        this._buildShell(container);
        this._showBriefing();
        this._startLoop();
      });
    });
  }

  exit(container) {
    this._stopLoop();
    this._hero?.destroy();
    this._wireDrag?.destroy();
    this._module?.destroy();
    this._wireDrag = null;
    this._module = null;
    this._monBump?.destroy();
    this._monTilt?.destroy();
    this._monPush?.destroy();
    this._hero = null;
    this._listeners.forEach(({ el, type, fn }) => el.removeEventListener(type, fn));
    this._listeners = [];
    this._container = null;
    container.innerHTML = '';
  }

  _buildShell(container) {
    const m = CHAPTER_5;
    const walkLocked = !this._progress.shockSuccess;
    container.innerHTML = `
      <div class="rl-mission__bg"></div>
      <div class="rl-mission__topbar">
        <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>
        <span class="rl-mission__title"><span class="rl-label-prefix">Ch&nbsp;${m.chapterNumber}:</span> ${m.title}</span>
      </div>
      <div class="rl-mission__main">
        <div class="rl-mission__sidebar">
          <div class="rl-mission__swirle-portrait">
            <img src="${IMG_BASE}swirle-powered.png" alt="SWIRL-E" class="rl-mission__swirle-img">
          </div>
          <div class="rl-mission__problem" id="rl-problem">${m.speech.start}</div>
          <div class="rl-mission__actions" id="rl-actions"></div>
          <button type="button" class="rl-btn rl-btn--journal" id="rl-hint">📖 Grandpa's Journal</button>
        </div>
        <div class="rl-board bl-board" id="rl-board"></div>
      </div>
      <div class="rl-hint-panel" id="rl-hint-panel" hidden>
        <button type="button" class="rl-hint-panel__dismiss" id="rl-hint-x">×</button>
        <div class="rl-hint-panel__inner">
          <div class="rl-hint-panel__paper">
            <h3 class="rl-hint-panel__heading">Grandpa's Journal</h3>
            <div class="rl-hint-panel__text" id="rl-hint-text"></div>
            <button type="button" class="rl-btn rl-btn--close" id="rl-hint-close">Got it!</button>
          </div>
        </div>
      </div>
    `;

    const hintText = container.querySelector('#rl-hint-text');
    for (const line of m.journalHints) {
      const p = document.createElement('p');
      p.textContent = line;
      hintText.appendChild(p);
    }

    this._buildBoard(container.querySelector('#rl-board'), walkLocked);
    this._wireShell(container);
    this._refreshNav(container.querySelector('#rl-actions'));
  }

  _buildBoard(board, walkLocked) {
    board.innerHTML = `
      <div class="bl-workbench">
        <div class="bl-progress" id="bl-progress"></div>
        <div class="bl-hero-wrap">
          <canvas class="bl-hero-canvas" id="bl-hero"></canvas>
        </div>
        <div class="bl-magnified" id="bl-magnified">
          <div class="bl-magnified__title">Wrist module — magnified</div>
          <svg class="bl-module-svg" id="bl-module-svg" viewBox="0 0 200 220" aria-label="Magnified wrist module"></svg>
          <div class="bl-servo-dial" id="bl-servo-dial" hidden>
            <span class="bl-servo-dial__label">Servo strength</span>
            <div class="bl-servo-dial__btns" id="bl-servo-btns"></div>
          </div>
        </div>
        <div class="bl-parts-tray">
          <span class="bl-parts-tray__title">Parts</span>
          <button type="button" class="bl-part" data-part="sensor">📐 Tilt sensor</button>
          <button type="button" class="bl-part" data-part="servo">⚙️ Wrist servo</button>
          <button type="button" class="bl-part" data-part="shock">🔩 Shock</button>
        </div>
        <div class="bl-controls">
          <div class="bl-mode">
            <button type="button" class="bl-mode-btn bl-mode-btn--active" data-mode="bench">Force bench</button>
            <button type="button" class="bl-mode-btn ${walkLocked ? 'bl-mode-btn--locked' : ''}" data-mode="walk" ${walkLocked ? 'disabled' : ''}>Walk test</button>
          </div>
          <div class="bl-forces" id="bl-forces">
            <button type="button" class="bl-force" data-dir="left">← Left</button>
            <button type="button" class="bl-force" data-dir="right">Right →</button>
            <button type="button" class="bl-force" data-dir="forward">↑ Forward</button>
            <button type="button" class="bl-force" data-dir="back">↓ Back</button>
          </div>
          <label class="bl-force-dial" id="bl-dial-container">Force&nbsp;
            <input type="range" id="bl-force-dial" min="0" max="100" value="45">
          </label>
          <button type="button" class="rl-btn rl-btn--reset bl-reset" id="bl-reset">Reset tray</button>
        </div>
        <div class="bl-monitors">
          <canvas class="bl-monitor" id="bl-mon-bump"></canvas>
          <canvas class="bl-monitor" id="bl-mon-tilt"></canvas>
          <canvas class="bl-monitor" id="bl-mon-push"></canvas>
        </div>
      </div>
    `;

    const heroCanvas = board.querySelector('#bl-hero');
    this._hero = new BalanceHeroRenderer(heroCanvas);
    this._hero.setSim(this._sim);
    this._hero.start();

    const moduleSvg = board.querySelector('#bl-module-svg');
    this._module = new BalanceModuleRenderer(moduleSvg);
    this._wireDrag = new LineDragManager(board.querySelector('#bl-magnified'), {
      svgEl: moduleSvg,
      points: this._module.getTerminalPositions(),
      hitRadius: 36,
      canStartFrom: id => id === 'sensor-out' && !this._sim.wired
        && this._sim.hasSensor && this._sim.hasServo,
      canEndAt: id => id === 'servo-in' && !this._sim.wired,
      onDragStart: id => this._module.startPreview(id),
      onDragMove: (x, y) => this._module.updatePreview(x, y),
      onDrop: (from, to) => this._connectWire(from, to),
      onCancel: () => this._module.clearPreview(),
    });

    this._monBump = new TickerMonitor(board.querySelector('#bl-mon-bump'), 'BUMP', '#ffcc44');
    this._monTilt = new TickerMonitor(board.querySelector('#bl-mon-tilt'), 'TILT', '#5fdcff');
    this._monPush = new TickerMonitor(board.querySelector('#bl-mon-push'), 'PUSHBACK', '#ffd666');

    const servoBtns = board.querySelector('#bl-servo-btns');
    for (const key of Object.keys(SERVO_LEVELS)) {
      const lv = SERVO_LEVELS[key];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'bl-servo-level';
      b.dataset.level = key;
      b.textContent = lv.label;
      if (key === 'gentle') b.classList.add('bl-servo-level--active');
      servoBtns.appendChild(b);
    }

    this._bindBoard(board);
    this._updateModuleUI();
    this._updateProgressUI();
  }

  _bindBoard(board) {
    const add = (el, type, fn) => {
      el.addEventListener(type, fn);
      this._listeners.push({ el, type, fn });
    };

    for (const btn of board.querySelectorAll('.bl-part')) {
      add(btn, 'click', () => this._installPart(btn.dataset.part));
    }

    for (const btn of board.querySelectorAll('.bl-force')) {
      add(btn, 'click', () => this._onPush(btn.dataset.dir));
    }

    add(board.querySelector('#bl-force-dial'), 'input', e => {
      this._sim.forceDial = Number(e.target.value) / 100;
    });

    add(board.querySelector('#bl-reset'), 'click', () => {
      this._sim.resetTray();
      this._hero?.clearDroplets();
      this._stableTimer = 0;
      this._sim.stopWalk();

      board.querySelectorAll('.bl-mode-btn').forEach(b => {
        b.classList.toggle('bl-mode-btn--active', b.dataset.mode === 'bench');
      });
      board.querySelector('#bl-forces').hidden = false;
      const label = board.querySelector('#bl-dial-container');
      if (label) label.firstChild.textContent = 'Force ';

      this._setSpeech(CHAPTER_5.speech.resetTray);
    });

    for (const btn of board.querySelectorAll('.bl-servo-level')) {
      add(btn, 'click', () => {
        this._sim.servoLevel = btn.dataset.level;
        board.querySelectorAll('.bl-servo-level').forEach(b => {
          b.classList.toggle('bl-servo-level--active', b.dataset.level === btn.dataset.level);
        });
        if (btn.dataset.level === 'tooStrong') this._setSpeech(CHAPTER_5.speech.tooStrong);
      });
    }

    for (const btn of board.querySelectorAll('.bl-mode-btn')) {
      add(btn, 'click', () => {
        if (btn.disabled) return;
        const mode = btn.dataset.mode;
        const label = board.querySelector('#bl-dial-container');

        if (mode === 'walk') {
          this._sim.startWalk();
          board.querySelectorAll('.bl-mode-btn').forEach(b => {
            b.classList.toggle('bl-mode-btn--active', b.dataset.mode === 'walk');
          });
          board.querySelector('#bl-forces').hidden = true;
          if (label) label.firstChild.textContent = 'Speed / Throttle ';
        } else {
          this._sim.stopWalk();
          board.querySelectorAll('.bl-mode-btn').forEach(b => {
            b.classList.toggle('bl-mode-btn--active', b.dataset.mode === 'bench');
          });
          board.querySelector('#bl-forces').hidden = false;
          if (label) label.firstChild.textContent = 'Force ';
        }
      });
    }

    for (const slot of board.querySelectorAll('.bl-mod-slot')) {
      add(slot, 'click', () => this._removePart(slot.dataset.slot));
    }
  }

  _connectWire(from, to) {
    this._module.clearPreview();
    if (from !== 'sensor-out' || to !== 'servo-in') return;
    if (!this._sim.hasSensor || !this._sim.hasServo) return;
    this._sim.wired = true;
    this._module.addWire();
    this._wireDrag.setPoints(this._module.getTerminalPositions());
    this._updateModuleUI();
    this._setSpeech(CHAPTER_5.speech.wired);
  }

  _disconnectWire() {
    this._sim.wired = false;
    this._module?.removeWire();
    this._wireDrag?.setPoints(this._module.getTerminalPositions());
    this._updateModuleUI();
    this._setSpeech(CHAPTER_5.speech.needWire);
  }

  _installPart(part) {
    if (part === 'sensor' && !this._sim.hasSensor) {
      this._sim.hasSensor = true;
      this._setSpeech(CHAPTER_5.speech.addSensor);
    } else if (part === 'servo' && !this._sim.hasServo) {
      this._sim.hasServo = true;
      this._setSpeech(CHAPTER_5.speech.addServo);
    } else if (part === 'shock' && !this._sim.hasShock) {
      this._sim.hasShock = true;
      this._setSpeech(CHAPTER_5.speech.addShock);
    }
    this._updateModuleUI();
  }

  _removePart(slot) {
    if (slot === 'sensor' && this._sim.hasSensor) {
      this._sim.hasSensor = false;
      if (this._sim.wired) this._disconnectWire();
    } else if (slot === 'servo' && this._sim.hasServo) {
      this._sim.hasServo = false;
      if (this._sim.wired) this._disconnectWire();
    } else if (slot === 'shock' && this._sim.hasShock) {
      this._sim.hasShock = false;
    }
    this._updateModuleUI();
  }

  _updateModuleUI() {
    const board = this._container?.querySelector('#rl-board');
    if (!board || !this._module) return;

    this._module.update({
      hasSensor: this._sim.hasSensor,
      hasServo: this._sim.hasServo,
      hasShock: this._sim.hasShock,
      wired: this._sim.wired,
      sensedRoll: this._sim.sensedRoll,
      sensedPitch: this._sim.sensedPitch,
      pushback: this._sim.lastPushback,
    });

    if (this._sim.wired && !this._module._playerWire) {
      this._module.addWire();
    }

    this._wireDrag?.setPoints(this._module.getTerminalPositions());

    const dial = board.querySelector('#bl-servo-dial');
    dial.hidden = !this._sim.hasServo;
  }

  _refreshModuleSignals() {
    this._module?.update({
      hasSensor: this._sim.hasSensor,
      hasServo: this._sim.hasServo,
      hasShock: this._sim.hasShock,
      wired: this._sim.wired,
      sensedRoll: this._sim.sensedRoll,
      sensedPitch: this._sim.sensedPitch,
      pushback: this._sim.lastPushback,
    });
  }

  _onPush(dir) {
    if (this._sim.mode === 'walk') return;
    this._sim.applyPush(dir);
    this._stableTimer = 0;

    if (!this._sim.hasSensor && !this._sim.hasServo && !this._sim.hasShock) {
      if (this._sim.water < 0.95 || this._sim.glassTipped) {
        this._progress.bareSpill = true;
        this._saveProgress();
        this._setSpeech(CHAPTER_5.speech.bareSpill);
      }
    } else if (this._sim.hasSensor && !this._sim.hasServo) {
      if (this._sim.water < 0.95 || this._sim.glassTipped) {
        this._progress.sensorSpill = true;
        this._saveProgress();
        this._setSpeech(CHAPTER_5.speech.sensorSpill);
      }
    } else if (this._sim.hasSensor && this._sim.hasServo && this._sim.wired && !this._sim.hasShock) {
      if (this._sim.isWobbling()) {
        this._progress.noShockWobble = true;
        this._saveProgress();
        this._setSpeech(CHAPTER_5.speech.wobble);
      }
    }
    this._updateProgressUI();
  }

  _startLoop() {
    this._lastTs = null;
    const tick = ts => {
      if (!this._container) return;
      if (this._lastTs == null) this._lastTs = ts;
      const dt = Math.min(0.05, (ts - this._lastTs) / 1000);
      this._lastTs = ts;
      this._sim.step(dt);
      this._hero?.setSim(this._sim);
      this._refreshModuleSignals();

      this._monBump.push(this._sim.lastBump);
      this._monTilt.push(this._sim.lastTilt);
      this._monPush.push(this._sim.lastPushback);
      this._monBump.setActive(true);
      this._monTilt.setActive(this._sim.hasSensor);
      this._monPush.setActive(this._sim.hasServo && this._sim.wired);
      this._monBump.draw(1.2);
      this._monTilt.draw(0.6);
      this._monPush.draw(14);

      if (this._sim.isStable()) {
        this._stableTimer += dt;
        if (this._sim.hasShock && this._sim.hasSensor && this._sim.hasServo && this._sim.wired
          && this._stableTimer > 0.8 && !this._progress.shockSuccess) {
          this._progress.shockSuccess = true;
          this._saveProgress();
          this._setSpeech(CHAPTER_5.speech.shockOk);
          this._unlockWalk();
        }
      } else {
        this._stableTimer = 0;
      }

      if (this._sim.walkComplete() && !this._progress.walkDone) {
        this._sim.stopWalk();
        const board = this._container?.querySelector('#rl-board');
        if (board) {
          board.querySelectorAll('.bl-mode-btn').forEach(b => {
            b.classList.toggle('bl-mode-btn--active', b.dataset.mode === 'bench');
          });
          board.querySelector('#bl-forces').hidden = false;
          const label = board.querySelector('#bl-dial-container');
          if (label) label.firstChild.textContent = 'Force ';
        }
        this._progress.walkDone = true;
        this._completeChapter();
      }

      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _stopLoop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _unlockWalk() {
    const btn = this._container?.querySelector('[data-mode="walk"]');
    if (btn) {
      btn.disabled = false;
      btn.classList.remove('bl-mode-btn--locked');
      this._setSpeech(CHAPTER_5.speech.walkUnlock);
    }
  }

  async _saveProgress() {
    await this.storage.set(PROGRESS_KEY, this._progress);
    this._updateProgressUI();
  }

  _updateProgressUI() {
    const el = this._container?.querySelector('#bl-progress');
    if (!el) return;
    const p = this._progress;
    const steps = [
      ['Bare spill felt', p.bareSpill],
      ['Sensor-only spill', p.sensorSpill],
      ['No-shock wobble', p.noShockWobble],
      ['Shock success', p.shockSuccess],
      ['Walk test', p.walkDone],
    ];
    el.innerHTML = steps.map(([label, done]) =>
      `<span class="bl-progress__step ${done ? 'bl-progress__step--done' : ''}">${label}${done ? ' ✓' : ''}</span>`
    ).join('');
  }

  async _completeChapter() {
    this._solved = true;
    this._setSpeech(CHAPTER_5.speech.walkDone);
    celebrate('medium');
    const p = await this.storage.get('progress', { completedChapters: [] });
    if (!p.completedChapters.includes(CHAPTER_5.id)) {
      p.completedChapters.push(CHAPTER_5.id);
      await this.storage.set('progress', p);
    }
    await this._saveProgress();
    this._refreshNav(this._container.querySelector('#rl-actions'));
  }

  _wireShell(container) {
    container.querySelector('#rl-back').addEventListener('click', () => {
      this.sceneManager.go('robot-lab-title', { avatarId: this._avatarId });
    });
    const closeHint = () => { container.querySelector('#rl-hint-panel').hidden = true; };
    container.querySelector('#rl-hint').addEventListener('click', () => {
      container.querySelector('#rl-hint-panel').hidden = false;
    });
    container.querySelector('#rl-hint-close').addEventListener('click', closeHint);
    container.querySelector('#rl-hint-x').addEventListener('click', closeHint);
  }

  _showBriefing() {
    const m = CHAPTER_5;
    const el = document.createElement('div');
    el.className = 'rl-briefing';
    el.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge">Ch&nbsp;${m.chapterNumber}</span>
          <h2 class="rl-briefing__title">${m.title}</h2>
        </div>
        <p class="rl-briefing__swirle">🤖 ${m.briefing.swirle}</p>
        <p class="rl-briefing__grandpa">📖 ${m.briefing.grandpa}</p>
        <button type="button" class="rl-btn rl-btn--start" id="bl-brief-go">Let's build!</button>
      </div>
    `;
    this._container.appendChild(el);
    el.querySelector('#bl-brief-go').addEventListener('click', () => el.remove());
  }

  _setSpeech(text) {
    const el = this._container?.querySelector('#rl-problem');
    if (el) el.textContent = text;
  }

  _refreshNav(actionsEl) {
    if (!actionsEl) return;
    actionsEl.innerHTML = '';
    const idx = ROBOT_LAB_CHAPTERS.findIndex(c => c.id === CHAPTER_5.id);
    const prev = ROBOT_LAB_CHAPTERS[idx - 1];
    const next = ROBOT_LAB_CHAPTERS[idx + 1];
    if (prev) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rl-btn rl-btn--secondary';
      b.textContent = '← Previous';
      b.addEventListener('click', () => this._goChapter(prev.id));
      actionsEl.appendChild(b);
    }
    if (next && this._solved) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rl-btn rl-btn--primary';
      b.textContent = 'Next chapter →';
      b.addEventListener('click', () => this._goChapter(next.id));
      actionsEl.appendChild(b);
    }
  }

  _goChapter(chapterId) {
    const route = CHAPTER_SCENES[chapterId] ?? { scene: 'robot-lab-circuit', missionId: chapterId };
    this.sceneManager.go(route.scene, { avatarId: this._avatarId, missionId: route.missionId });
  }
}