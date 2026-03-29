import { Scene } from '../../../core/scene/index.js';
import { DragManager } from '../../../core/input/index.js';
import { celebrate } from '../../../core/rewards/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { AudioManager, AudioClips } from '../../../core/audio/index.js';
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
    this._objectOrders = new Map();
    // Cache of image content bounds {x0,y0,x1,y1} keyed by image src
    this._imageBoundsCache = new Map();
  }

  async enter(container, data = {}) {
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

    // Pre-detect image content bounds for build puzzles so slicing is tight
    if (this._category.id === 'build-the-animal') {
      await this._preloadBuildBounds();
    }

    this._renderShell();
    this._renderPuzzle();
    this._speakPrompt();
  }

  /**
   * Scan a transparent PNG at 128×128 to find the bounding box of non-transparent pixels.
   * Returns {x0,y0,x1,y1} as fractions 0–1 of image width/height.
   * Falls back to {0,0,1,1} on any error.
   */
  async _detectImageBounds(src) {
    if (this._imageBoundsCache.has(src)) return this._imageBoundsCache.get(src);
    const fallback = { x0: 0, y0: 0, x1: 1, y1: 1 };
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const S = 128;
          const canvas = document.createElement('canvas');
          canvas.width = S;
          canvas.height = S;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, S, S);
          const pixels = ctx.getImageData(0, 0, S, S).data;
          let minY = S, maxY = 0, minX = S, maxX = 0;
          for (let y = 0; y < S; y++) {
            for (let x = 0; x < S; x++) {
              if (pixels[(y * S + x) * 4 + 3] > 20) {
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
              }
            }
          }
          const bounds = minY < maxY
            ? { x0: minX / S, y0: minY / S, x1: (maxX + 1) / S, y1: (maxY + 1) / S }
            : fallback;
          this._imageBoundsCache.set(src, bounds);
          resolve(bounds);
        } catch {
          this._imageBoundsCache.set(src, fallback);
          resolve(fallback);
        }
      };
      img.onerror = () => { this._imageBoundsCache.set(src, fallback); resolve(fallback); };
      img.src = src;
    });
  }

  /** Pre-load bounds for every image used in build puzzles of this category. */
  async _preloadBuildBounds() {
    const puzzles = this.loader.getPuzzlesByCategory(this._category.id)
      .filter((p) => p.layout === 'build-animal');
    const srcs = new Set();
    for (const p of puzzles) {
      if (p.buildImage) srcs.add(p.buildImage);
      for (const t of (p.targets ?? [])) { if (t.sliceImage) srcs.add(t.sliceImage); }
      for (const o of (p.objects ?? [])) { if (o.sliceImage) srcs.add(o.sliceImage); }
    }
    await Promise.all([...srcs].map((src) => this._detectImageBounds(src)));
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
    const onPrompt = () => this._speakPrompt();
    const onPlayAgain = () => {
      this.manager.startMission(this._category.id, this._missionLength);
      this._objectOrders.clear();
      this._container.querySelector('#pf-success').setAttribute('hidden', '');
      this._renderShell();
      this._renderPuzzle();
      this._speakPrompt();
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
    const isShapeMatch = this._category.id === 'shape-matching';
    const isColorSort = this._category.id === 'color-sorting';
    const isFeedAnimal = this._category.id === 'feed-the-animal';

    this._container.classList.toggle('pf-game--build-active', isBuildPuzzle);
    this._container.querySelector('.pf-board')?.classList.toggle('pf-board--build', isBuildPuzzle);
    this._container.querySelector('.pf-tray')?.classList.toggle('pf-tray--build', isBuildPuzzle);
    this._container.querySelector('.pf-tray')?.classList.toggle('pf-tray--shape-match', isShapeMatch);
    this._container.querySelector('.pf-tray')?.classList.toggle('pf-tray--color-sort', isColorSort);

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
    } else if (isShapeMatch) {
      this._renderShapeMatchStage(stageEl, puzzle);
    } else if (isColorSort) {
      this._renderColorSortStage(stageEl, puzzle);
    } else {
      this._renderStandardStage(stageEl, puzzle);
    }

    // Determine build axis/bounds for tray slice rendering
    const buildAxis = isBuildPuzzle
      ? (puzzle.buildAxis === 'horizontal' ? 'horizontal' : 'vertical')
      : null;

    trayEl.innerHTML = '';
    // No labels for any of these — the children that play this are too young to read
    const hideLabel = isBuildPuzzle || isShapeMatch || isColorSort || isFeedAnimal;
    for (const object of this._getOrderedObjects(puzzle)) {
      const placed = this.manager.isObjectPlaced(object.id);
      const item = document.createElement('button');
      item.type = 'button';
      const extraClass = isShapeMatch ? 'pf-object--shape-item'
        : isColorSort ? 'pf-object--sort-item'
        : isFeedAnimal ? 'pf-object--feed-item'
        : isBuildPuzzle ? 'pf-object--build-item'
        : '';
      item.className = `pf-object ${object.sliceImage ? 'pf-object--slice' : ''} ${extraClass} ${placed ? 'pf-object--placed' : 'pf-object--available'} draggable`;
      item.dataset.objectId = object.id;

      let artHtml;
      let artAspect = null;
      if (isBuildPuzzle && object.sliceImage) {
        // Use per-image bounds so distractors (other animals) also slice correctly
        const obBounds = this._imageBoundsCache.get(object.sliceImage)
          ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
        const odx = Math.max(obBounds.x1 - obBounds.x0, 0.05);
        const ody = Math.max(obBounds.y1 - obBounds.y0, 0.05);
        // Slot aspect ratio for the tray container so slice math works correctly
        artAspect = buildAxis === 'horizontal' ? odx / (3 * ody) : 3 * odx / ody;
        artHtml = this._renderSlice(object, { axis: buildAxis, bounds: obBounds });
      } else {
        artHtml = this._renderObjectArt(object);
      }

      const artStyle = artAspect !== null ? ` style="aspect-ratio:${artAspect.toFixed(4)}"` : '';
      item.innerHTML = `
        <span class="pf-object__art"${artStyle}>${artHtml}</span>
        ${hideLabel ? '' : `<span class="pf-object__label">${escapeHtml(object.label)}</span>`}
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
    this._speakPrompt();
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
    AudioClips.getInstance().speakRandom('puzzle-forest', 'mission_complete_');
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

  /**
   * Speak the current puzzle's prompt via AudioClips (WAV or TTS fallback).
   * The clip key is derived from the puzzle ID: 'feed-bunny' → 'feed_bunny'.
   * Uses speakPrompt() so numbered variants (_01, _02, …) are chosen randomly
   * when they exist (e.g. sort_green_01–04), otherwise plays the single clip.
   */
  _speakPrompt() {
    const puzzle = this.manager.getCurrentPuzzle();
    if (!puzzle) return;
    const key = puzzle.id.replaceAll('-', '_');
    AudioClips.getInstance().speakPrompt('puzzle-forest', key);
  }

  exit(container) {
    if (this.dragManager) this.dragManager.destroy();
    if (this._advanceTimer) clearTimeout(this._advanceTimer);
    AudioClips.getInstance().cancel();
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
      case 'build-the-animal': return '⭐';
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
    const assembly = this._container?.querySelector('.pf-build-assembly');
    if (assembly) {
      assembly.classList.remove('pf-build-assembly--celebrate');
      void assembly.offsetWidth;
      assembly.classList.add('pf-build-assembly--celebrate');
      const existing = assembly.querySelector('.pf-build-burst');
      existing?.remove();
      const burst = document.createElement('div');
      burst.className = 'pf-build-burst';
      burst.innerHTML = `
        <div class="pf-build-burst__sparkles">✨ ⭐ ✨</div>
        <div class="pf-build-burst__text">You Built It!</div>
        <div class="pf-build-burst__sparkles">🌟 🐾 🌟</div>
      `;
      assembly.appendChild(burst);
      setTimeout(() => burst.remove(), 1700);
    }

    const rect = assembly?.getBoundingClientRect();
    celebrate('large', {
      origin: {
        x: rect ? rect.left + (rect.width / 2) : window.innerWidth / 2,
        y: rect ? rect.top + (rect.height / 2) : window.innerHeight / 3,
      },
      duration: 1700,
      colors: ['#FFD95E', '#FF8D6B', '#7CCF7B', '#7EC8FF'],
    });
    this._playBuildCompleteRiff();
    AudioClips.getInstance().speakRandom('puzzle-forest', 'build_complete_');
    this._advanceTimer = setTimeout(() => this._advanceMission(), 2200);
  }

  _isBuildPuzzle(puzzle) {
    return puzzle?.layout === 'build-animal';
  }

  /**
   * Color Sorting stage — shows the basket large and centered.
   * The drop zone is a transparent overlay positioned over the basket opening
   * (top rim), measured at ~20% down from the image top across all basket images.
   * No dotted rectangle, no text label — the basket IS the instruction.
   */
  _renderColorSortStage(stageEl, puzzle) {
    stageEl.className = 'pf-stage pf-stage--color-sort';
    stageEl.innerHTML = '';

    for (const target of puzzle.targets) {
      const placed = this.manager.getPlacedObjectForTarget(target.id);
      const board = document.createElement('div');
      board.className = 'pf-color-basket';

      const imgHtml = target.image
        ? `<img class="pf-color-basket__img" src="${target.image}" alt="" draggable="false">`
        : '';

      const placedHtml = placed && placed.image
        ? `<img class="pf-color-basket__placed-item" src="${placed.image}" alt="">`
        : '';

      board.innerHTML = `
        ${imgHtml}
        <div class="pf-target pf-color-basket__opening ${placed ? 'pf-target--filled' : ''}"
             data-target-id="${target.id}">
          ${placedHtml}
        </div>
      `;
      stageEl.appendChild(board);
    }
  }

  /**
   * Shape Matching stage — shows the slot image (log-with-hole) large and centered.
   * The drop target is a transparent overlay positioned over the hole in the image.
   * No text labels: the visual hole in the wood IS the instruction.
   */
  _renderShapeMatchStage(stageEl, puzzle) {
    stageEl.className = 'pf-stage pf-stage--shape-match';
    stageEl.innerHTML = '';

    for (const target of puzzle.targets) {
      const placed = this.manager.getPlacedObjectForTarget(target.id);
      const board = document.createElement('div');
      board.className = 'pf-shape-board';

      // The slot image (wooden board with hole) fills the board area
      const imgHtml = target.image
        ? `<img class="pf-shape-board__img" src="${target.image}" alt="" draggable="false">`
        : '';

      // The placed piece sits inside the hole as an overlay
      const placedHtml = placed && placed.image
        ? `<img class="pf-shape-board__placed-piece" src="${placed.image}" alt="">`
        : '';

      board.innerHTML = `
        ${imgHtml}
        <div class="pf-target pf-shape-board__hole ${placed ? 'pf-target--filled' : ''}"
             data-target-id="${target.id}">
          ${placedHtml}
        </div>
      `;
      stageEl.appendChild(board);
    }
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

  /**
   * Build the seamless assembly frame for "Build the Animal" puzzles.
   * Three slots stacked (vertical) or side by side (horizontal), no gaps,
   * no text labels. Uses content-bounds-aware slicing so each slot shows
   * a meaningful third of the animal even when the image has transparent padding.
   */
  _renderBuildStage(stageEl, puzzle) {
    const axis = puzzle.buildAxis === 'horizontal' ? 'horizontal' : 'vertical';
    const buildSrc = puzzle.buildImage ?? puzzle.targets[0]?.sliceImage ?? '';
    const bounds = this._imageBoundsCache.get(buildSrc) ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
    const slots = [...puzzle.targets].sort((a, b) => (a.sliceIndex ?? 0) - (b.sliceIndex ?? 0));

    // Set aspect-ratio of the assembly frame to match the animal's content area.
    // For a vertical-sliced animal: assembly height >> width (portrait);
    // for horizontal: assembly width >> height (landscape).
    const dx = Math.max(bounds.x1 - bounds.x0, 0.05);
    const dy = Math.max(bounds.y1 - bounds.y0, 0.05);
    const contentAspect = (dx / dy).toFixed(4);

    stageEl.className = 'pf-stage pf-stage--build';
    stageEl.innerHTML = `
      <div class="pf-build-assembly pf-build-assembly--${axis}" style="aspect-ratio:${contentAspect}">
        ${slots.map((target) => {
          const placed = this.manager.getPlacedObjectForTarget(target.id);
          // Ghost uses the target's own sliceImage; placed uses the object's
          const renderEntry = placed ?? target;
          const sliceSrc = renderEntry.sliceImage ?? buildSrc;
          const sliceBounds = this._imageBoundsCache.get(sliceSrc) ?? bounds;
          return `<div class="pf-target pf-build-slot ${placed ? 'pf-target--filled' : ''}"
                       data-target-id="${target.id}">
            ${this._renderSlice(renderEntry, { ghost: !placed, axis, bounds: sliceBounds })}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  /**
   * Render a slice of an image using bounds-aware positioning.
   * The .pf-slice wrapper fills its container 100%×100%;
   * the img is position:absolute with inline style from _sliceStyle().
   */
  _renderSlice(entry, opts = {}) {
    const ghostClass = opts.ghost ? ' pf-slice--ghost' : '';
    const axis = opts.axis ?? 'vertical';
    const bounds = opts.bounds ?? null;
    const style = this._sliceStyle(entry.sliceIndex ?? 0, axis, bounds);
    return `
      <span class="pf-slice${ghostClass}" aria-hidden="true">
        <img class="pf-slice__img" src="${entry.sliceImage}" alt="" style="${style}">
      </span>
    `;
  }

  /**
   * Compute inline CSS for the slice image so it sits inside an overflow:hidden
   * container and shows exactly 1/3 of the animal's content (not 1/3 of the
   * full transparent-padded image).
   *
   * For vertical axis (3 rows):
   *   image width  = 100% / dx of slot width  (fills content area horizontally)
   *   image height = 300% / dy of slot height  (content spans all 3 slots)
   *   image left   = -(x0/dx * 100)% of slot width
   *   image top    = -(y0/dy * 300 + index*100)% of slot height
   *
   * For horizontal axis (3 columns):
   *   image width  = 300% / dx of slot width  (content spans all 3 slots)
   *   image height = 100% / dy of slot height  (fills content area vertically)
   *   image left   = -(x0/dx * 300 + index*100)% of slot width
   *   image top    = -(y0/dy * 100)% of slot height
   *
   * These formulas preserve the image's natural aspect ratio when the container
   * has the correct slot aspect ratio (set via inline aspect-ratio style).
   * Default bounds (0,0,1,1) reproduce the original naive 1/3 slicing.
   */
  _sliceStyle(index, axis = 'vertical', bounds = null) {
    const b = bounds ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
    const dx = Math.max(b.x1 - b.x0, 0.05);
    const dy = Math.max(b.y1 - b.y0, 0.05);
    if (axis === 'vertical') {
      const w = 100 / dx;
      const h = 300 / dy;
      const top = -(b.y0 / dy * 300 + index * 100);
      const left = -(b.x0 / dx * 100);
      return `position:absolute;width:${w.toFixed(2)}%;height:${h.toFixed(2)}%;top:${top.toFixed(2)}%;left:${left.toFixed(2)}%;`;
    } else {
      const w = 300 / dx;
      const h = 100 / dy;
      const left = -(b.x0 / dx * 300 + index * 100);
      const top = -(b.y0 / dy * 100);
      return `position:absolute;width:${w.toFixed(2)}%;height:${h.toFixed(2)}%;left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;`;
    }
  }
}
