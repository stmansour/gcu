/**
 * Art Studio — Title scene. Enter Studio button unlocks audio and goes to journal for mission 0.
 */

import { Scene } from '../../../core/scene/index.js';
import { AudioManager } from '../../../core/audio/index.js';
import { GameStorage } from '../../../core/storage/index.js';

export class TitleScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage = new GameStorage('art-studio');
  }

  enter(container) {
    container.className = 'art-studio art-studio--title';
    container.innerHTML = `
      <div class="title-scene">
        <h1 class="title-scene__heading">Art Studio</h1>
        <p class="title-scene__sub">Grandpa's workshop</p>
        <button type="button" class="title-scene__btn" data-tap data-art-studio-enter>Enter Studio</button>
        <a href="#" class="title-scene__home" data-tap data-art-studio-home>← Home</a>
      </div>
    `;
    container.querySelector('[data-art-studio-enter]').addEventListener('click', () => {
      AudioManager.getInstance().unlock();
      this.storage.get('progress', {}).then((p) => {
        const missionId = p.currentMission ?? 0;
        this.sceneManager.go('art-studio-journal', { missionId });
      });
    });
    container.querySelector('[data-art-studio-home]').addEventListener('click', (e) => {
      e.preventDefault();
      this.sceneManager.go('hub');
    });
  }

  exit(container) {
    container.innerHTML = '';
  }
}
