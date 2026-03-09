/**
 * Art Studio — Mission gameplay. Palette, mixing well, target swatch, proximity feedback.
 */

import { Scene } from '../../../core/scene/index.js';
import { DragManager } from '../../../core/input/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { AudioManager } from '../../../core/audio/index.js';
import { mixColors, colorsMatch } from '../engine/colorMixing.js';
import { hslToHex } from '../../../core/utils/color.js';
import { MISSIONS, PALETTE } from '../missions/missions.js';
import { celebrate } from '../../../core/rewards/index.js';

export class MissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage = new GameStorage('art-studio');
    this.dragManager = null;
    this.missionId = 0;
    this.well = [];
    this.mission6Index = 0;
  }

  enter(container, data = {}) {
    container.className = 'art-studio art-studio--mission';
    this.missionId = data.missionId ?? 0;
    this.well = [];
    this.mission6Index = 0;
    const mission = MISSIONS[this.missionId];
    if (!mission) {
      this.sceneManager.go('art-studio-sandbox');
      return;
    }
    const target = mission.target || (mission.targets && mission.targets[0]) || null;
    const hex = (c) => (c ? hslToHex(c.h, c.s, c.l) : '#888');
    container.innerHTML = `
      <div class="mission-layout">
        <aside class="mission-panel mission-panel--palette">
          <h3 class="mission-panel__title">Palette</h3>
          <div class="mixing-well" id="art-studio-well"></div>
          <button type="button" class="mission-panel__clear" data-tap id="art-studio-clear">Clear well</button>
          <div class="palette-blobs" id="art-studio-palette"></div>
        </aside>
        <main class="mission-panel mission-panel--canvas">
          <div class="target-row">
            <div class="target-wrap">
              <p class="target-label">Mix this color</p>
              <div class="target-swatch" id="art-studio-target" style="background:${hex(target)}"></div>
              <div class="proximity-ring" id="art-studio-proximity"></div>
            </div>
            <div class="target-wrap">
              <p class="target-label">Your mix</p>
              <div class="target-swatch target-swatch--mix" id="art-studio-mix" style="background:#ccc"></div>
            </div>
          </div>
          <div class="mission-painting" id="art-studio-painting">
            <img src="assets/art-studio/placeholder-painting-grey.svg" alt="Grandpa's painting (placeholder)" class="mission-painting__img" />
          </div>
          <div class="mission-success" id="art-studio-success" hidden>
            <p class="mission-success__text"></p>
            <button type="button" class="mission-success__btn" data-tap id="art-studio-next">Next</button>
            <button type="button" class="mission-success__btn" data-tap id="art-studio-sandbox-btn">Keep Painting</button>
          </div>
        </main>
        <aside class="mission-panel mission-panel--info">
          <h3 class="mission-panel__title">${mission.title}</h3>
          <p class="mission-panel__objective">${mission.objective}</p>
          <a href="#" class="art-studio__home" data-tap>← Home</a>
        </aside>
      </div>
    `;
    const paletteEl = container.querySelector('#art-studio-palette');
    const wellEl = container.querySelector('#art-studio-well');
    mission.availablePaints.forEach((name) => {
      const c = PALETTE[name];
      const blob = document.createElement('div');
      blob.className = 'paint-blob draggable';
      blob.dataset.color = name;
      blob.style.background = hslToHex(c.h, c.s, c.l);
      blob.setAttribute('aria-label', name);
      paletteEl.appendChild(blob);
    });
    container.querySelector('#art-studio-clear').addEventListener('click', () => this._clearWell());
    container.querySelector('#art-studio-next').addEventListener('click', () => this._onNext());
    container.querySelector('#art-studio-sandbox-btn').addEventListener('click', () => this.sceneManager.go('art-studio-sandbox'));
    container.querySelector('.art-studio__home').addEventListener('click', (e) => { e.preventDefault(); this.sceneManager.go('hub'); });
    this.dragManager = new DragManager(container, {
      dragSelector: '.paint-blob',
      dropTargets: ['#art-studio-well'],
      forgiveness: 1.3,
      onDrop: (item, target, point) => this._onDropInWell(item),
      onDropMiss: () => {},
    });
    this._updateMixDisplay();
    this._checkSuccess(mission);
  }

  _onDropInWell(item) {
    const name = item.dataset.color;
    const c = PALETTE[name];
    if (!c) return;
    this.well.push({ name, h: c.h, s: c.s, l: c.l });
    this._updateMixDisplay();
    const mission = MISSIONS[this.missionId];
    if (mission) this._checkSuccess(mission);
  }

  _clearWell() {
    this.well = [];
    this._updateMixDisplay();
    const mixEl = document.getElementById('art-studio-mix');
    if (mixEl) mixEl.style.background = '#ccc';
    const wellEl = document.getElementById('art-studio-well');
    if (wellEl) wellEl.style.background = '#e0d5c0';
    document.getElementById('art-studio-success')?.setAttribute('hidden', '');
  }

  _updateMixDisplay() {
    const mixed = mixColors(this.well);
    const wellEl = document.getElementById('art-studio-well');
    const mixEl = document.getElementById('art-studio-mix');
    const proxEl = document.getElementById('art-studio-proximity');
    if (wellEl) wellEl.style.background = mixed ? hslToHex(mixed.h, mixed.s, mixed.l) : '#e0d5c0';
    if (mixEl) mixEl.style.background = mixed ? hslToHex(mixed.h, mixed.s, mixed.l) : '#ccc';
    const mission = MISSIONS[this.missionId];
    const target = mission?.target || (mission?.targets && mission.targets[this.mission6Index]);
    if (proxEl && mixed && target) {
      const { proximity } = colorsMatch(mixed, target);
      proxEl.classList.remove('proximity-ring--cold', 'proximity-ring--warm', 'proximity-ring--hot');
      if (proximity >= 0.8) proxEl.classList.add('proximity-ring--hot');
      else if (proximity >= 0.4) proxEl.classList.add('proximity-ring--warm');
      else proxEl.classList.add('proximity-ring--cold');
    }
  }

  _checkSuccess(mission) {
    const mixed = mixColors(this.well);
    if (mission.id === 0) {
      if (this.well.length >= mission.minBlobs) this._doSuccess(mission, 'You made a new color! Every new color starts with just two paints.');
      return;
    }
    if (mission.targets) {
      const target = mission.targets[this.mission6Index];
      if (!mixed || !target) return;
      const { isMatch } = colorsMatch(mixed, target);
      if (isMatch) {
        this.mission6Index++;
        if (this.mission6Index >= mission.targets.length) this._doSuccess(mission, "You completed the full palette! The studio is yours.");
        else {
          this._clearWell();
          document.getElementById('art-studio-target').style.background = hslToHex(mission.targets[this.mission6Index].h, mission.targets[this.mission6Index].s, mission.targets[this.mission6Index].l);
        }
      }
      return;
    }
    if (!mission.target || !mixed) return;
    const { isMatch } = colorsMatch(mixed, mission.target);
    if (isMatch) this._doSuccess(mission, mission.successMessage || 'You matched it!');
  }

  _doSuccess(mission, message) {
    const successEl = document.getElementById('art-studio-success');
    if (!successEl) return;
    successEl.querySelector('.mission-success__text').textContent = message;
    successEl.removeAttribute('hidden');
    celebrate('medium', { origin: { x: successEl.offsetLeft + successEl.offsetWidth / 2, y: successEl.offsetTop + 40 } });
    AudioManager.getInstance().play('chime');
    this.storage.get('progress', { currentMission: 0, completed: [] }).then((p) => {
      const completed = p.completed.includes(mission.id) ? p.completed : [...p.completed, mission.id];
      const currentMission = Math.min(mission.id + 1, MISSIONS.length);
      const sandboxUnlocked = completed.length >= MISSIONS.length;
      this.storage.set('progress', { currentMission, completed, sandboxUnlocked });
    });
  }

  _onNext() {
    this.storage.get('progress', { currentMission: 0, completed: [] }).then((p) => {
      const next = p.currentMission ?? this.missionId + 1;
      if (next >= MISSIONS.length) this.sceneManager.go('art-studio-sandbox');
      else this.sceneManager.go('art-studio-journal', { missionId: next });
    });
  }

  exit(container) {
    if (this.dragManager) this.dragManager.destroy();
    this.dragManager = null;
    container.innerHTML = '';
  }
}
