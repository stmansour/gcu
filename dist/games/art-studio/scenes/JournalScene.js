/**
 * Art Studio — Journal intro for a mission. Grandpa's note + Let's Try It! -> MissionScene.
 */

import { Scene } from '../../../core/scene/index.js';
import { journalPage } from '../../../core/journal/index.js';
import { MISSIONS } from '../missions/missions.js';

export class JournalScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
  }

  enter(container, data = {}) {
    container.className = 'art-studio art-studio--journal';
    const missionId = data.missionId ?? 0;
    const mission = MISSIONS[missionId];
    if (!mission) {
      this.sceneManager.go('art-studio-sandbox');
      return;
    }
    const page = journalPage({
      title: mission.journalTitle,
      body: mission.journalBody.replace(/\n/g, '<br>'),
      buttonLabel: mission.buttonLabel,
      onButton: () => this.sceneManager.go('art-studio-mission', { missionId }),
    });
    container.appendChild(page);
    const home = document.createElement('a');
    home.href = '#';
    home.className = 'art-studio__home';
    home.dataset.tap = '1';
    home.textContent = '← Home';
    home.addEventListener('click', (e) => { e.preventDefault(); this.sceneManager.go('hub'); });
    container.appendChild(home);
  }

  exit(container) {
    container.innerHTML = '';
  }
}
