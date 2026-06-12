/**
 * Arcade — game picker scene.
 * Launches standalone web games in a new tab.
 */

import { Scene } from '../../../core/scene/index.js';
import { AudioManager } from '../../../core/audio/index.js';
import { ARCADE_GAMES } from '../data/games.js';

export class ArcadeScene extends Scene {
  /**
   * @param {{ sceneManager: import('../../../core/scene/SceneManager.js').SceneManager }} opts
   */
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this._listeners = [];
    this._avatarId = null;
  }

  enter(container, data = {}) {
    this._avatarId = data.avatarId ?? null;
    container.className = 'arcade';

    container.innerHTML = `
      <div class="arcade__bg" aria-hidden="true"></div>
      <div class="arcade__scanlines" aria-hidden="true"></div>

      <header class="arcade__topbar">
        <button type="button" class="arcade__nav-btn" id="arcade-home">← Hub</button>
      </header>

      <main class="arcade__main">
        <div class="arcade__marquee-wrap">
          <div class="arcade__marquee">
            <span class="arcade__marquee-star">★</span>
            GRANDPA'S ARCADE
            <span class="arcade__marquee-star">★</span>
          </div>
          <p class="arcade__tagline">Just for fun — pick a game!</p>
        </div>

        <div class="arcade__grid" id="arcade-grid"></div>

        <p class="arcade__footnote">Games open in a new tab · More coming soon</p>
      </main>
    `;

    const grid = container.querySelector('#arcade-grid');
    for (const game of ARCADE_GAMES) {
      grid.appendChild(this._makeCard(game));
    }

    const homeBtn = container.querySelector('#arcade-home');
    const onHome = () => this.sceneManager.go('hub', { avatarId: this._avatarId });
    homeBtn.addEventListener('click', onHome);
    this._listeners.push({ el: homeBtn, type: 'click', fn: onHome });
  }

  /**
   * @param {typeof ARCADE_GAMES[number]} game
   * @returns {HTMLAnchorElement}
   */
  _makeCard(game) {
    const link = document.createElement('a');
    link.className = 'arcade-card';
    link.href = game.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `Play ${game.name} — opens in a new tab`);

    link.innerHTML = `
      <div class="arcade-card__frame">
        <img class="arcade-card__art" src="${game.image}" alt="">
      </div>
      <div class="arcade-card__info">
        <span class="arcade-card__icon">${game.icon}</span>
        <div class="arcade-card__text">
          <h2 class="arcade-card__title">${game.name}</h2>
          <p class="arcade-card__tagline">${game.tagline}</p>
        </div>
      </div>
    `;

    const onOpen = () => AudioManager.getInstance().unlock();
    link.addEventListener('click', onOpen);
    this._listeners.push({ el: link, type: 'click', fn: onOpen });

    return link;
  }

  exit(container) {
    for (const { el, type, fn } of this._listeners) el.removeEventListener(type, fn);
    this._listeners = [];
    container.className = '';
    container.innerHTML = '';
  }
}
