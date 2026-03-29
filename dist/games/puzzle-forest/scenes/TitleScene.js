import { Scene } from '../../../core/scene/index.js';
import { AudioManager } from '../../../core/audio/index.js';

export class TitleScene extends Scene {
  constructor({ sceneManager, loader }) {
    super();
    this.sceneManager = sceneManager;
    this.loader = loader;
    this._listeners = [];
    this._avatarId = null;
  }

  enter(container, data = {}) {
    this._avatarId = data.avatarId ?? null;
    const categories = this.loader.getCategories();
    container.className = 'pf-title';
    container.innerHTML = `
      <div class="pf-title__bg"></div>
      <div class="pf-title__topbar">
        <button type="button" class="pf-nav-btn" id="pf-home">← Hub</button>
      </div>
      <div class="pf-title__content">
        <section class="pf-title__hero">
          <div class="pf-title__guide">
            <div class="pf-guide-badge">
              <span class="pf-guide-badge__icon">🐿️</span>
              <span class="pf-guide-badge__name">Nutty</span>
            </div>
            <h1 class="pf-title__heading">Puzzle Forest</h1>
            <p class="pf-title__subhead">Choose what you want to play.</p>
          </div>
        </section>
        <section class="pf-picker" id="pf-picker"></section>
      </div>
    `;

    const picker = container.querySelector('#pf-picker');
    for (const category of categories) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'pf-card';
      card.dataset.categoryId = category.id;
      card.innerHTML = `
        <img class="pf-card__art" src="${category.image}" alt="${category.name}">
        <div class="pf-card__body">
          <div class="pf-card__icon">${category.icon}</div>
          <h2 class="pf-card__title">${category.name}</h2>
          <p class="pf-card__text">${category.description}</p>
        </div>
      `;
      picker.appendChild(card);

      const onSelect = () => {
        AudioManager.getInstance().unlock();
        this.sceneManager.go('puzzle-forest-puzzle', {
          avatarId: this._avatarId,
          categoryId: category.id,
          missionLength: category.missionLength ?? 6,
        });
      };
      card.addEventListener('click', onSelect);
      this._listeners.push({ el: card, type: 'click', fn: onSelect });
    }

    const homeBtn = container.querySelector('#pf-home');
    const onHome = () => this.sceneManager.go('hub', { avatarId: this._avatarId });
    homeBtn.addEventListener('click', onHome);
    this._listeners.push({ el: homeBtn, type: 'click', fn: onHome });
  }

  exit(container) {
    for (const { el, type, fn } of this._listeners) el.removeEventListener(type, fn);
    this._listeners = [];
    container.innerHTML = '';
  }
}
