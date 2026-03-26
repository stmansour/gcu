import { Scene } from '../../../core/scene/index.js';
import { DragManager } from '../../../core/input/index.js';
import { celebrate } from '../../../core/rewards/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { AudioManager } from '../../../core/audio/index.js';
import { PuzzleManager } from '../engine/PuzzleManager.js';
import { SnapManager } from '../engine/SnapManager.js';

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export class PuzzleScene extends Scene {
  constructor({ sceneManager, loader }) {
    super();
    this.sceneManager = sceneManager;
    this.loader = loader;
    this.storage = new GameStorage('puzzle-forest');
    this.manager = new PuzzleManager(loader);
    this.snapManager = new SnapManager({ snapDistance: 160 });
    this.dragManager = null;
    this._listeners = [];
    this._container = null;
    this._category = null;
    this._avatarId = null;
    this._missionLength = 6;
    this._advanceTimer = null;
    this._speechEnabled = typeof window !== 'undefined' && 'speechSynthesis' in window;
    this._objectOrders = new Map();
  }

  enter(container, data = {}) {
    this._container = container;
    this._avatarId = data.avatarId ?? null;
    this._category = this.loader.getCategory(data.categoryId);
    this._missionLength = data.missionLength ?? this._category?.missionLength ?? 6;

    if (!this._category) {
      this.sceneManager.go('puzzle-forest-title', { avatarId: this._avatarId });
      return;
    }

    this.manager.startMission(this._category.id, this._missionLength);
    this._objectOrders.clear();
    container.className = 'pf-game';
    this._renderShell();
    this._renderPuzzle();
    this._speakCurrentPrompt();
  }

  _renderShell() {
    this._removeListeners();
    const progress = this.manager.getProgress();
    this._container.innerHTML = `
      <div class="pf-game__bg"></div>
      <div class="pf-game__topbar">
        <button type="button" class="pf-nav-btn" id="pf-back-to-picker">← Activities</button>
        <div class="pf-game__title-wrap">
          <div class="pf-game__eyebrow">Puzzle Forest</div>
          <h1 class="pf-game__title">${escapeHtml(this._category.name)}</h1>
        </div>
        <button type="button" class="pf-nav-btn pf-nav-btn--ghost" id="pf-home">Hub</button>
      </div>
      <div class="pf-game__content">
        <aside class="pf-sidecard pf-sidecard--guide">
          <div class="pf-guide-badge">
            <span class="pf-guide-badge__icon">🐿️</span>
            <span class="pf-guide-badge__name">Nutty</span>
          </div>
          <p class="pf-sidecard__text">${escapeHtml(this._category.description)}</p>
          <button type="button" class="pf-audio-btn" id="pf-repeat-prompt">Hear It Again</button>
        </aside>
        <main class="pf-board">
          <div class="pf-progress">
            <div class="pf-progress__label">Mission ${progress.total ? progress.solved + 1 : 0} of ${progress.total}</div>
            <div class="pf-progress__track" id="pf-progress-track"></div>
          </div>
          <div class="pf-prompt" id="pf-prompt"></div>
          <div class="pf-stage" id="pf-stage"></div>
          <div class="pf-tray">
            <div class="pf-tray__label">Move the pieces</div>
            <div class="pf-tray__items" id="pf-tray-items"></div>
          </div>
        </main>
      </div>
      <div class="pf-success" id="pf-success" hidden>
        <div class="pf-success__card">
          <div class="pf-success__icon">✨🌲✨</div>
          <h2 class="pf-success__title">Forest Celebration!</h2>
          <p class="pf-success__text" id="pf-success-text"></p>
          <button type="button" class="pf-success__btn" id="pf-play-again">Play Again</button>
          <button type="button" class="pf-success__btn pf-success__btn--secondary" id="pf-choose-activity">Choose Another Activity</button>
        </div>
      </div>
    `;

    const backBtn = this._container.querySelector('#pf-back-to-picker');
    const homeBtn = this._container.querySelector('#pf-home');
    const promptBtn = this._container.querySelector('#pf-repeat-prompt');
    const playAgainBtn = this._container.querySelector('#pf-play-again');
    const chooseBtn = this._container.querySelector('#pf-choose-activity');

    const onBack = () => this.sceneManager.go('puzzle-forest-title', { avatarId: this._avatarId });
    const onHome = () => this.sceneManager.go('hub', { avatarId: this._avatarId });
    const onPrompt = () => this._speakCurrentPrompt(true);
    const onPlayAgain = () => {
      this.manager.startMission(this._category.id, this._missionLength);
      this._objectOrders.clear();
      this._container.querySelector('#pf-success').setAttribute('hidden', '');
      this._renderShell();
      this._renderPuzzle();
      this._speakCurrentPrompt();
    };
    const onChoose = () => this.sceneManager.go('puzzle-forest-title', { avatarId: this._avatarId });

    backBtn.addEventListener('click', onBack);
    homeBtn.addEventListener('click', onHome);
    promptBtn.addEventListener('click', onPrompt);
    playAgainBtn.addEventListener('click', onPlayAgain);
    chooseBtn.addEventListener('click', onChoose);

    this._listeners.push({ el: backBtn, type: 'click', fn: onBack });
    this._listeners.push({ el: homeBtn, type: 'click', fn: onHome });
    this._listeners.push({ el: promptBtn, type: 'click', fn: onPrompt });
    this._listeners.push({ el: playAgainBtn, type: 'click', fn: onPlayAgain });
    this._listeners.push({ el: chooseBtn, type: 'click', fn: onChoose });
  }

  _renderPuzzle() {
    const puzzle = this.manager.getCurrentPuzzle();
    if (!puzzle) {
      this._showMissionComplete();
      return;
    }

    const promptEl = this._container.querySelector('#pf-prompt');
    const stageEl = this._container.querySelector('#pf-stage');
    const trayEl = this._container.querySelector('#pf-tray-items');
    const trackEl = this._container.querySelector('#pf-progress-track');
    const progress = this.manager.getProgress();
    const isBuildPuzzle = this._isBuildPuzzle(puzzle);

    this._container.classList.toggle('pf-game--build-active', isBuildPuzzle);
    this._container.querySelector('.pf-board')?.classList.toggle('pf-board--build', isBuildPuzzle);
    this._container.querySelector('.pf-tray')?.classList.toggle('pf-tray--build', isBuildPuzzle);

    promptEl.innerHTML = `
      <div class="pf-prompt__icon">${puzzle.promptIcon ?? this._category.icon}</div>
      <div class="pf-prompt__text">${escapeHtml(puzzle.promptText)}</div>
    `;

    trackEl.innerHTML = '';
    for (let i = 0; i < progress.total; i++) {
      const dot = document.createElement('span');
      dot.className = `pf-progress__dot ${i < progress.solved ? 'pf-progress__dot--done' : ''}`;
      trackEl.appendChild(dot);
    }

    if (isBuildPuzzle) {
      this._renderBuildStage(stageEl, puzzle);
    } else {
      this._renderStandardStage(stageEl, puzzle);
    }

    trayEl.innerHTML = '';
    for (const object of this._getOrderedObjects(puzzle)) {
      const placed = this.manager.isObjectPlaced(object.id);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `pf-object ${object.sliceImage ? 'pf-object--slice' : ''} ${placed ? 'pf-object--placed' : 'pf-object--available'} draggable`;
      item.dataset.objectId = object.id;
      item.innerHTML = `
        <span class="pf-object__art">${this._renderObjectArt(object)}</span>
        <span class="pf-object__label">${escapeHtml(object.label)}</span>
      `;
      if (placed) item.disabled = true;
      trayEl.appendChild(item);
    }

    this._bindDrag();
  }

  _bindDrag() {
    if (this.dragManager) this.dragManager.destroy();

    const targets = Array.from(this._container.querySelectorAll('.pf-target'));
    this.dragManager = new DragManager(this._container, {
      dragSelector: '.pf-object--available',
      dropTargets: targets,
      forgiveness: 1.35,
      cloneStyle: { scale: 1.05, zIndex: 12000 },
      onDragMove: (_item, point) => {
        const snapTarget = this.snapManager.checkSnapTargets(point, targets);
        this.snapManager.highlightTarget(snapTarget, targets);
      },
      onDrop: (item, target) => this._handleDrop(item, target, targets),
      onDropMiss: (item) => this._handleMiss(item, targets),
    });
  }

  _handleDrop(item, target, targets) {
    this.snapManager.clearHighlights(targets);
    const result = this.manager.checkPlacement(item.dataset.objectId, target.dataset.targetId);
    if (!result.matched) {
      this._playWrongSound();
      item.classList.add('pf-object--wrong');
      target.classList.add('pf-target--wrong');
      setTimeout(() => {
        item.classList.remove('pf-object--wrong');
        target.classList.remove('pf-target--wrong');
      }, 380);
      return;
    }

    this.snapManager.snapToTarget(target);
    this._playSuccessSound();
    target.classList.add('pf-target--happy');
    item.classList.add('pf-object--correct');
    const reaction = document.createElement('div');
    reaction.className = 'pf-target__reaction';
    reaction.textContent = this._getSuccessReactionText();
    target.appendChild(reaction);
    celebrate('small', {
      origin: {
        x: target.getBoundingClientRect().left + (target.getBoundingClientRect().width / 2),
        y: Math.max(120, target.getBoundingClientRect().top + 36),
      },
    });
    setTimeout(() => {
      this._renderPuzzle();
      if (result.puzzleComplete) {
        if (this.dragManager) {
          this.dragManager.destroy();
          this.dragManager = null;
        }
        if (this._isBuildPuzzle(this.manager.getCurrentPuzzle())) {
          this._celebrateBuildComplete();
        } else {
          this._advanceTimer = setTimeout(() => this._advanceMission(), 780);
        }
      }
    }, 380);
  }

  _handleMiss(item, targets) {
    this.snapManager.clearHighlights(targets);
    this._playWrongSound();
    item.classList.add('pf-object--miss');
    setTimeout(() => item.classList.remove('pf-object--miss'), 320);
  }

  _advanceMission() {
    this._advanceTimer = null;
    const hasNext = this.manager.advancePuzzle();
    if (!hasNext) {
      this._showMissionComplete();
      return;
    }
    this._renderPuzzle();
    this._speakCurrentPrompt();
  }

  async _saveMissionProgress() {
    const progress = await this.storage.get('progress', { completedRuns: {}, totalRuns: 0 });
    const completedRuns = { ...progress.completedRuns };
    completedRuns[this._category.id] = (completedRuns[this._category.id] ?? 0) + 1;
    await this.storage.set('progress', {
      completedRuns,
      totalRuns: (progress.totalRuns ?? 0) + 1,
    });
  }

  _showMissionComplete() {
    this._saveMissionProgress();
    const successEl = this._container.querySelector('#pf-success');
    const textEl = this._container.querySelector('#pf-success-text');
    textEl.textContent = `${this._category.name} is all lit up. Want to play it again or try a new forest game?`;
    successEl.removeAttribute('hidden');
    celebrate('large', {
      duration: 2200,
      origin: {
        x: window.innerWidth / 2,
        y: window.innerHeight / 3,
      },
    });
  }

  _renderPlacedObject(object) {
    if (object.sliceImage) {
      return this._renderSlice(object);
    }
    if (object.image) {
      return `<img class="pf-target__placed-img" src="${object.image}" alt="${escapeHtml(object.label)}">`;
    }
    return `
      <span class="pf-target__placed-icon">${escapeHtml(object.icon ?? '')}</span>
      <span class="pf-target__placed-label">${escapeHtml(object.label)}</span>
    `;
  }

  _renderObjectArt(object) {
    if (object.sliceImage) {
      return this._renderSlice(object);
    }
    if (object.image) {
      return `<img class="pf-object__img" src="${object.image}" alt="${escapeHtml(object.label)}">`;
    }
    return `<span class="pf-object__icon">${escapeHtml(object.icon ?? object.label)}</span>`;
  }

  _speakCurrentPrompt(force = false) {
    if (!this._speechEnabled || !window.speechSynthesis) return;
    if (!force && this._container?.querySelector('#pf-success') && !this._container.querySelector('#pf-success').hasAttribute('hidden')) return;

    const puzzle = this.manager.getCurrentPuzzle();
    if (!puzzle?.promptText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(puzzle.promptText);
    utterance.rate = 0.9;
    utterance.pitch = 1.2;
    utterance.volume = 0.8;
    window.speechSynthesis.speak(utterance);
  }

  exit(container) {
    if (this.dragManager) this.dragManager.destroy();
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    this._removeListeners();
    this.dragManager = null;
    this._advanceTimer = null;
    this._container = null;
    container.innerHTML = '';
  }

  _removeListeners() {
    for (const { el, type, fn } of this._listeners) el.removeEventListener(type, fn);
    this._listeners = [];
  }

  _getOrderedObjects(puzzle) {
    let order = this._objectOrders.get(puzzle.id);
    if (!order) {
      order = shuffle(puzzle.objects.map((object) => object.id));
      this._objectOrders.set(puzzle.id, order);
    }
    return order
      .map((id) => puzzle.objects.find((object) => object.id === id))
      .filter(Boolean);
  }

  _getSuccessReactionText() {
    switch (this._category.id) {
      case 'feed-the-animal': return 'Yum!';
      case 'color-sorting': return 'Nice!';
      case 'shape-matching': return 'Pop!';
      case 'build-the-animal': return 'Great job!';
      default: return 'Yay!';
    }
  }

  _playSuccessSound() {
    const audio = AudioManager.getInstance();
    audio.play('chime', { volume: 0.55 });
    audio.playTone({ frequency: 520, frequencyEnd: 760, duration: 0.14, type: 'triangle', volume: 0.035 });
    setTimeout(() => {
      audio.playTone({ frequency: 760, frequencyEnd: 980, duration: 0.16, type: 'triangle', volume: 0.03 });
    }, 90);
  }

  _playWrongSound() {
    const audio = AudioManager.getInstance();
    audio.playTone({ frequency: 240, frequencyEnd: 170, duration: 0.16, type: 'sawtooth', volume: 0.028 });
  }

  _playBuildCompleteRiff() {
    const audio = AudioManager.getInstance();
    const notes = [
      { delay: 0, frequency: 523, end: 660, duration: 0.13 },
      { delay: 120, frequency: 659, end: 784, duration: 0.15 },
      { delay: 260, frequency: 784, end: 988, duration: 0.18 },
      { delay: 430, frequency: 988, end: 1174, duration: 0.18 },
      { delay: 620, frequency: 784, end: 1046, duration: 0.2 },
    ];
    for (const note of notes) {
      setTimeout(() => {
        audio.playTone({
          frequency: note.frequency,
          frequencyEnd: note.end,
          duration: note.duration,
          type: 'triangle',
          volume: 0.04,
        });
      }, note.delay);
    }
  }

  _celebrateBuildComplete() {
    const board = this._container?.querySelector('.pf-build-board');
    const frame = this._container?.querySelector('.pf-build-preview__frame');
    if (board) {
      board.classList.remove('pf-build-board--celebrate');
      void board.offsetWidth;
      board.classList.add('pf-build-board--celebrate');
      const existing = board.querySelector('.pf-build-burst');
      existing?.remove();
      const burst = document.createElement('div');
      burst.className = 'pf-build-burst';
      burst.innerHTML = `
        <div class="pf-build-burst__sparkles">✨ ⭐ ✨</div>
        <div class="pf-build-burst__text">You Built It!</div>
        <div class="pf-build-burst__sparkles">🌟 🐾 🌟</div>
      `;
      board.appendChild(burst);
      setTimeout(() => burst.remove(), 1700);
    }
    if (frame) {
      frame.classList.remove('pf-build-preview__frame--celebrate');
      void frame.offsetWidth;
      frame.classList.add('pf-build-preview__frame--celebrate');
    }

    const rect = frame?.getBoundingClientRect();
    celebrate('large', {
      origin: {
        x: rect ? rect.left + (rect.width / 2) : window.innerWidth / 2,
        y: rect ? rect.top + (rect.height / 2) : window.innerHeight / 3,
      },
      duration: 1700,
      colors: ['#FFD95E', '#FF8D6B', '#7CCF7B', '#7EC8FF'],
    });
    this._playBuildCompleteRiff();
    this._advanceTimer = setTimeout(() => this._advanceMission(), 2200);
  }

  _isBuildPuzzle(puzzle) {
    return puzzle.layout === 'build-animal';
  }

  _renderStandardStage(stageEl, puzzle) {
    stageEl.className = `pf-stage pf-stage--targets-${Math.min(puzzle.targets.length, 4)}`;
    stageEl.innerHTML = '';
    for (const target of puzzle.targets) {
      const placed = this.manager.getPlacedObjectForTarget(target.id);
      const targetEl = document.createElement('div');
      targetEl.className = `pf-target ${placed ? 'pf-target--filled' : ''}`;
      targetEl.dataset.targetId = target.id;
      targetEl.innerHTML = `
        <div class="pf-target__art">
          ${target.image ? `<img class="pf-target__img" src="${target.image}" alt="${escapeHtml(target.label)}">` : `<span class="pf-target__icon">${escapeHtml(target.icon ?? '')}</span>`}
        </div>
        <div class="pf-target__label">${escapeHtml(target.label)}</div>
        <div class="pf-target__slot">${placed ? this._renderPlacedObject(placed) : `<span class="pf-target__hint">${escapeHtml(target.slotLabel ?? 'Drop here')}</span>`}</div>
      `;
      stageEl.appendChild(targetEl);
    }
  }

  _renderBuildStage(stageEl, puzzle) {
    const buildImage = puzzle.buildImage ?? puzzle.targets[0]?.sliceImage ?? '';
    const axis = puzzle.buildAxis === 'vertical' ? 'vertical' : 'horizontal';
    const slots = [...puzzle.targets].sort((a, b) => (a.sliceIndex ?? 0) - (b.sliceIndex ?? 0));
    stageEl.className = 'pf-stage pf-stage--build';
    stageEl.innerHTML = `
      <div class="pf-build-board pf-build-board--${axis}">
        <div class="pf-build-board__silhouette">
          <img src="${buildImage}" alt="${escapeHtml(puzzle.promptText)}" class="pf-build-board__image">
        </div>
        <div class="pf-build-board__slots pf-build-board__slots--${axis}">
          ${slots.map((target) => {
            const placed = this.manager.getPlacedObjectForTarget(target.id);
            return `
              <div class="pf-target pf-build-slot ${placed ? 'pf-target--filled' : ''}" data-target-id="${target.id}">
                <div class="pf-build-slot__inner">
                  ${placed
                    ? this._renderPlacedObject(placed)
                    : `
                      <div class="pf-build-slot__ghost">
                        ${this._renderSlice(target, { ghost: true })}
                      </div>
                      <span class="pf-target__hint">${escapeHtml(target.slotLabel ?? 'Drop here')}</span>
                    `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  _renderSlice(entry, opts = {}) {
    const ghostClass = opts.ghost ? ' pf-slice--ghost' : '';
    const joinedClass = opts.joined ? ' pf-slice--joined' : '';
    const axisClass = opts.axis === 'vertical' ? ' pf-slice--vertical' : ' pf-slice--horizontal';
    return `
      <span class="pf-slice${ghostClass}${joinedClass}${axisClass}" aria-hidden="true">
        <img
          class="pf-slice__img"
          src="${entry.sliceImage}"
          alt=""
          style="${this._sliceTransform(entry.sliceIndex ?? 0, opts.axis)}"
        >
      </span>
    `;
  }

  _sliceTransform(index, axis = 'horizontal') {
    if (axis === 'vertical') {
      if (index <= 0) return 'transform:translateY(0%);';
      if (index === 1) return 'transform:translateY(-33.333%);';
      return 'transform:translateY(-66.666%);';
    }
    if (index <= 0) return 'transform:translateX(0%);';
    if (index === 1) return 'transform:translateX(-33.333%);';
    return 'transform:translateX(-66.666%);';
  }
}
