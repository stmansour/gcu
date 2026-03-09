/**
 * TapManager — tap handling with debounce. No 300ms delay. Enforces min touch target.
 */

const DEFAULT_DEBOUNCE_MS = 300;

function getPoint(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

export class TapManager {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} options.tapSelector - CSS selector for tappable elements
   * @param {function(element, point): void} options.onTap
   * @param {number} [options.minSize=60] - Minimum touch target (px)
   * @param {number} [options.debounceMs]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.tapSelector = options.tapSelector || '[data-tap]';
    this.onTap = options.onTap || (() => {});
    this.minSize = options.minSize ?? 60;
    this.debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this._lastTapTime = 0;
    this._boundClick = this._onClick.bind(this);
    this.container.addEventListener('click', this._boundClick);
  }

  _onClick(e) {
    const el = e.target.closest(this.tapSelector);
    if (!el) return;
    e.preventDefault();
    const now = Date.now();
    if (now - this._lastTapTime < this.debounceMs) return;
    this._lastTapTime = now;
    const rect = el.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    this.onTap(el, point);
  }

  destroy() {
    this.container.removeEventListener('click', this._boundClick);
  }
}
