/**
 * HubScene — Grandpa's Creative Universe workshop launcher.
 * Shows the wooden sign, 4 game portal cards, SWIRL-E on the workbench,
 * and the selected player badge in the corner.
 */

import { Scene } from '../../core/scene/index.js';
import { GameStorage } from '../../core/storage/index.js';
import { AVATAR_META, AVATAR_BADGE_IMAGES } from '../../core/avatar/avatarManifest.js';

export class HubScene extends Scene {
  /**
   * @param {{
   *   sceneManager: import('../../core/scene/SceneManager.js').SceneManager,
   *   games: Array<{
   *     id: string,
   *     name: string,
   *     icon: string,
   *     available: boolean,
   *     sceneId: string,
   *     previewImage?: string|null
   *   }>
   * }} opts
   */
  constructor({ sceneManager, games }) {
    super();
    this.sceneManager = sceneManager;
    this.games = games || [];
    this.storage = new GameStorage('global');
    this._avatarId = null;
    this._listeners = [];
  }

  async enter(container, data = {}) {
    this._avatarId = data.avatarId ?? await this.storage.get('selected-avatar', null);
    this._listeners = [];
    this._render(container);
  }

  _render(container) {
    container.className = 'hub';

    // ── Background layer (stars + warm glow) ──────────────────────────────
    const bg = document.createElement('div');
    bg.className = 'hub__bg';
    const gearClasses = ['hub__gear--1', 'hub__gear--2', 'hub__gear--3', 'hub__gear--4'];
    for (const cls of gearClasses) {
      const gear = document.createElement('span');
      gear.className = `hub__gear ${cls}`;
      gear.setAttribute('aria-hidden', 'true');
      gear.textContent = '⚙';
      bg.appendChild(gear);
    }
    container.appendChild(bg);

    // ── Main layout column ─────────────────────────────────────────────────
    const layout = document.createElement('div');
    layout.className = 'hub__layout';
    container.appendChild(layout);

    // Wooden sign
    const sign = document.createElement('div');
    sign.className = 'hub__sign';
    const signInner = document.createElement('div');
    signInner.className = 'hub__sign-inner';
    const line1 = document.createElement('span');
    line1.className = 'hub__sign-line1';
    line1.textContent = "Grandpa's";
    const line2 = document.createElement('span');
    line2.className = 'hub__sign-line2';
    line2.textContent = 'Creative Universe';
    signInner.appendChild(line1);
    signInner.appendChild(line2);
    sign.appendChild(signInner);
    layout.appendChild(sign);

    // Portal cards row
    const portals = document.createElement('div');
    portals.className = 'hub__portals';
    for (const game of this.games) {
      portals.appendChild(this._makePortalCard(game));
    }
    layout.appendChild(portals);

    // Workbench + SWIRL-E
    const floor = document.createElement('div');
    floor.className = 'hub__floor';

    const swirle = document.createElement('div');
    swirle.className = 'hub__swirle';
    swirle.setAttribute('aria-hidden', 'true');
    // CSS-only SWIRL-E placeholder — replaced with an image when asset is ready.
    // Drop asset at: gcu/assets/images/hub/swirl-e-workbench.png
    swirle.innerHTML = `
      <div class="hub__swirle-head"></div>
      <div class="hub__swirle-body">
        <div class="hub__swirle-eye hub__swirle-eye--l"></div>
        <div class="hub__swirle-eye hub__swirle-eye--r"></div>
        <div class="hub__swirle-label">SWIRL-E</div>
      </div>
    `;
    floor.appendChild(swirle);

    const workbench = document.createElement('div');
    workbench.className = 'hub__workbench';
    floor.appendChild(workbench);

    layout.appendChild(floor);

    // ── Player badge (top-right corner) ───────────────────────────────────
    container.appendChild(this._makePlayerBadge());
  }

  _makePortalCard(game) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `hub-portal ${game.available ? 'hub-portal--available' : 'hub-portal--locked'}`;
    card.setAttribute(
      'aria-label',
      game.available ? `Enter ${game.name}` : `${game.name} — Coming Soon`
    );

    const preview = document.createElement('div');
    preview.className = 'hub-portal__preview';

    if (game.previewImage) {
      card.style.backgroundImage =
        `linear-gradient(to top, rgba(0,8,18,0.92) 0%, rgba(0,8,18,0.35) 40%, transparent 70%),` +
        `url('${game.previewImage}')`;
      card.style.backgroundSize = '100% 100%, cover';
      card.style.backgroundPosition = 'center, center top';
      card.style.backgroundColor = 'rgba(6, 16, 32, 0.15)';
    }

    const icon = document.createElement('span');
    icon.className = `hub-portal__icon ${game.previewImage ? 'hub-portal__icon--hidden' : ''}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = game.icon;
    preview.appendChild(icon);

    if (!game.available) {
      const soon = document.createElement('div');
      soon.className = 'hub-portal__coming-soon';
      soon.innerHTML = '<span>Coming</span><span>Soon</span>';
      preview.appendChild(soon);
    }

    card.appendChild(preview);

    const label = document.createElement('div');
    label.className = 'hub-portal__label';
    label.textContent = game.name;
    card.appendChild(label);

    if (game.available) {
      const handler = () => {
        this.sceneManager.go(game.sceneId, { avatarId: this._avatarId });
      };
      card.addEventListener('click', handler);
      this._listeners.push({ el: card, type: 'click', fn: handler });
    }

    return card;
  }

  _makePlayerBadge() {
    const meta = this._avatarId ? AVATAR_META[this._avatarId] : null;
    const imgSrc = this._avatarId ? AVATAR_BADGE_IMAGES[this._avatarId] : null;

    const badge = document.createElement('div');
    badge.className = 'hub__player';
    badge.style.setProperty('--avatar-color', meta?.color ?? '#D4A959');

    if (imgSrc) {
      const img = document.createElement('img');
      img.className = 'hub__player-img';
      img.src = imgSrc;
      img.alt = meta?.displayName ?? '';
      badge.appendChild(img);
    } else {
      const empty = document.createElement('div');
      empty.className = 'hub__player-img hub__player-img--empty';
      empty.textContent = '?';
      badge.appendChild(empty);
    }

    const name = document.createElement('span');
    name.className = 'hub__player-name';
    name.textContent = meta?.displayName ?? 'Choose Player';
    badge.appendChild(name);

    const changeBtn = document.createElement('button');
    changeBtn.type = 'button';
    changeBtn.className = 'hub__player-change';
    changeBtn.textContent = 'Change';
    changeBtn.setAttribute('aria-label', 'Change player');
    const fn = () => this.sceneManager.go('avatar-select');
    changeBtn.addEventListener('click', fn);
    this._listeners.push({ el: changeBtn, type: 'click', fn });
    badge.appendChild(changeBtn);

    return badge;
  }

  exit(container) {
    for (const { el, type, fn } of this._listeners) {
      el.removeEventListener(type, fn);
    }
    this._listeners = [];
    container.innerHTML = '';
  }
}
