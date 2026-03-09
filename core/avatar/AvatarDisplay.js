/**
 * AvatarDisplay — Shows selected character image (or video) from CharacterSheets.
 * Corner companion mode or celebration popup. Uses avatarManifest for paths.
 */

import { AVATAR_IMAGES, AVATAR_VIDEOS } from './avatarManifest.js';

/**
 * @param {object} opts
 * @param {HTMLElement} opts.container
 * @param {string} [opts.avatarId] - e.g. 'kaila', 'leon'. If missing, hides.
 * @param {'corner'|'popup'|'inline'} [opts.mode='corner']
 * @param {boolean} [opts.useVideo=false] - Use rotation video when available
 */
export class AvatarDisplay {
  constructor(opts = {}) {
    this.container = opts.container;
    this.mode = opts.mode || 'corner';
    this.useVideo = opts.useVideo ?? false;
    this._avatarId = opts.avatarId || null;
    this._root = null;
    this._img = null;
    this._video = null;
  }

  setAvatarId(id) {
    this._avatarId = id;
    this._render();
  }

  _render() {
    if (!this.container) return;
    if (this._root) this._root.remove();
    if (!this._avatarId) return;
    const src = AVATAR_IMAGES[this._avatarId];
    const videoSrc = this.useVideo ? AVATAR_VIDEOS[this._avatarId] : null;
    this._root = document.createElement('div');
    this._root.className = `avatar-display avatar-display--${this.mode}`;
    if (videoSrc) {
      this._video = document.createElement('video');
      this._video.src = videoSrc;
      this._video.muted = true;
      this._video.playsInline = true;
      this._video.loop = true;
      this._video.autoplay = true;
      this._video.className = 'avatar-display__media';
      this._root.appendChild(this._video);
    } else if (src) {
      this._img = document.createElement('img');
      this._img.src = src;
      this._img.alt = this._avatarId;
      this._img.className = 'avatar-display__media';
      this._root.appendChild(this._img);
    }
    this.container.appendChild(this._root);
  }

  destroy() {
    if (this._root?.parentNode) this._root.parentNode.removeChild(this._root);
    this._root = null;
    this._img = null;
    this._video = null;
  }
}
