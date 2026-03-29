/**
 * Robot Lab — Title scene.
 * Introduces SWIRL-E and Chapter 1.
 *
 * If the player has saved progress, "Let's Build!" opens the ChapterPicker
 * so they can jump to any unlocked chapter.  Otherwise it goes straight to ch1.
 */

import { Scene }                            from '../../../core/scene/index.js';
import { AudioManager }                     from '../../../core/audio/index.js';
import { ProgressManager, ChapterPicker }   from '../../../core/progress/index.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';

export class TitleScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this._listeners   = [];
    this._container   = null;
    this._avatarId    = null;
    this._pm          = new ProgressManager('robot-lab');
  }

  enter(container, data = {}) {
    this._avatarId  = data.avatarId ?? null;
    this._container = container;
    container.className = 'rl-title';

    container.innerHTML = `
      <div class="rl-title__bg"></div>

      <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>

      <div class="rl-title__content">

        <div class="rl-title__swirle" aria-hidden="true">
          <div class="rl-title__swirle-portrait-col">
            <div class="rl-title__portrait">
              <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                   alt="SWIRL-E" class="rl-title__portrait-img">
            </div>
            <p class="rl-title__swirle-caption">My eyes need power…</p>
          </div>
          <div class="rl-title__vpa-wrap">
            <img src="games/robot-lab/assets/images/swirle-vpa.png"
                 alt="SWIRL-E Eye Module circuit board"
                 class="rl-title__vpa-img">
            <span class="rl-title__vpa-label">EYE MODULE — SW-EYE-1A</span>
          </div>
        </div>

        <div class="rl-title__text">
          <h1 class="rl-title__game-name">Robot Lab</h1>
          <div class="rl-title__chapter-badge">Chapter 1</div>
          <h2 class="rl-title__chapter-title">Power</h2>
          <p class="rl-title__tagline">
            SWIRL-E's head is almost finished. His eye module just needs to be powered.
            Can you finish the circuit to power his eye module?
          </p>
        </div>

        <button type="button" class="rl-btn rl-btn--start" id="rl-start">
          Let's Build!
        </button>

      </div>
    `;

    const onStart = async () => {
      AudioManager.getInstance().unlock();
      const completed = await this._pm.getCompletedChapters();

      if (completed.size === 0) {
        // No progress — jump straight to chapter 1.
        this._goToChapter('ch1-power');
        return;
      }

      // Progress exists — show the chapter picker.
      const result = await ChapterPicker.show(this._container, {
        chapters:           ROBOT_LAB_CHAPTERS,
        completedChapters:  completed,
      });

      if (result.action === 'cancel') return;

      if (result.action === 'clear') {
        await this._pm.clearProgress();
        this._goToChapter('ch1-power');
        return;
      }

      // 'select' — jump to the chosen chapter.
      this._goToChapter(result.chapterId);
    };

    const onBack = () => this.sceneManager.go('hub');

    const startBtn = container.querySelector('#rl-start');
    const backBtn  = container.querySelector('#rl-back');
    startBtn.addEventListener('click', onStart);
    backBtn.addEventListener('click', onBack);
    this._listeners = [
      { el: startBtn, type: 'click', fn: onStart },
      { el: backBtn,  type: 'click', fn: onBack  },
    ];
  }

  exit(container) {
    for (const { el, type, fn } of this._listeners) el.removeEventListener(type, fn);
    this._listeners = [];
    container.innerHTML = '';
    this._container = null;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  _goToChapter(chapterId) {
    const route = CHAPTER_SCENES[chapterId]
      ?? { scene: 'robot-lab-circuit', missionId: chapterId };

    const data = { avatarId: this._avatarId };
    if (route.missionId) data.missionId = route.missionId;

    this.sceneManager.go(route.scene, data);
  }
}
