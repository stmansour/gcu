/**
 * AvatarSelectScene — "Who's playing today?"
 * Full-screen avatar picker. Persists selection to grandpa:global:selected-avatar.
 */

import { Scene } from '../../core/scene/index.js';
import { GameStorage } from '../../core/storage/index.js';
import { AVATAR_IDS, AVATAR_IMAGES, AVATAR_META } from '../../core/avatar/avatarManifest.js';

export class AvatarSelectScene extends Scene {
  /**
   * @param {{ sceneManager: import('../../core/scene/SceneManager.js').SceneManager }} opts
   */
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage = new GameStorage('global');
    this._selectedId = null;
    this._cards = new Map();   // avatarId → button element
    this._goBtn = null;
    this._boundTap = this._onCardTap.bind(this);
  }

  async enter(container) {
    this._selectedId = await this.storage.get('selected-avatar', null);
    this._cards.clear();

    container.className = 'avatar-select';

    // Background glow layer
    const bg = document.createElement('div');
    bg.className = 'avatar-select__bg';
    container.appendChild(bg);

    // Main content
    const content = document.createElement('div');
    content.className = 'avatar-select__content';
    container.appendChild(content);

    const title = document.createElement('h1');
    title.className = 'avatar-select__title';
    title.textContent = "Who's playing today?";
    content.appendChild(title);

    // Bottom group — grid + button anchored to the desk/spotlight area
    const bottom = document.createElement('div');
    bottom.className = 'avatar-select__bottom';
    content.appendChild(bottom);

    const grid = document.createElement('div');
    grid.className = 'avatar-select__grid';
    bottom.appendChild(grid);

    for (const id of AVATAR_IDS) {
      const meta = AVATAR_META[id];
      const imgSrc = AVATAR_IMAGES[id];

      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'avatar-card';
      card.dataset.avatarId = id;
      card.style.setProperty('--avatar-color', meta.color);
      card.setAttribute('aria-label', meta.displayName);

      const imgWrap = document.createElement('div');
      imgWrap.className = 'avatar-card__img-wrap';

      const img = document.createElement('img');
      img.className = 'avatar-card__img';
      img.src = imgSrc;
      img.alt = meta.displayName;
      img.loading = 'eager';
      imgWrap.appendChild(img);

      const name = document.createElement('span');
      name.className = 'avatar-card__name';
      name.textContent = meta.displayName;

      card.appendChild(imgWrap);
      card.appendChild(name);
      card.addEventListener('click', this._boundTap);
      grid.appendChild(card);
      this._cards.set(id, card);
    }

    this._goBtn = document.createElement('button');
    this._goBtn.type = 'button';
    this._goBtn.className = 'avatar-select__go';
    this._goBtn.textContent = "Let's Go!";
    this._goBtn.disabled = true;
    this._goBtn.addEventListener('click', () => this._proceed());
    bottom.appendChild(this._goBtn);

    // Restore previous selection without triggering the animation
    if (this._selectedId && this._cards.has(this._selectedId)) {
      this._applySelection(this._selectedId, false);
    }
  }

  _onCardTap(e) {
    const id = e.currentTarget.dataset.avatarId;
    if (!id) return;
    this._selectedId = id;
    this._applySelection(id, true);
  }

  /**
   * @param {string} id
   * @param {boolean} animate - Whether to run the selection pop animation
   */
  _applySelection(id, animate) {
    for (const [cid, card] of this._cards) {
      const isSelected = cid === id;
      card.classList.toggle('avatar-card--selected', isSelected);
      if (isSelected && animate) {
        card.classList.remove('avatar-card--pop');
        // Force reflow so re-adding the class triggers the animation
        void card.offsetWidth;
        card.classList.add('avatar-card--pop');
      }
    }
    const meta = AVATAR_META[id];
    if (this._goBtn) {
      this._goBtn.disabled = false;
      this._goBtn.textContent = `Play as ${meta?.displayName ?? id}!`;
    }
  }

  async _proceed() {
    if (!this._selectedId) return;
    await this.storage.set('selected-avatar', this._selectedId);
    this.sceneManager.go('hub', { avatarId: this._selectedId });
  }

  exit() {
    // Click listeners live on card elements; they're destroyed when container is cleared.
    this._cards.clear();
    this._goBtn = null;
  }
}
