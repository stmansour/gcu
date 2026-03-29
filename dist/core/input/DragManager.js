/**
 * DragManager — iOS-safe drag and drop. Touch + mouse, preventDefault, clone follows pointer.
 */

function getPoint(e) {
  if (e.touches && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

function getPointEnd(e) {
  if (e.changedTouches && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: e.clientX, y: e.clientY };
}

export class DragManager {
  /**
   * @param {HTMLElement} container
   * @param {object} options
   * @param {string} options.dragSelector - CSS selector for draggable elements
   * @param {string[]|NodeList|HTMLElement[]} options.dropTargets - Selectors or elements for drop zones
   * @param {number} [options.forgiveness=1.2] - Hit zone scale (e.g. 1.3 = 30% larger)
   * @param {function(item, point): void} [options.onDragStart]
   * @param {function(item, point, overTarget): void} [options.onDragMove]
   * @param {function(item, target, point): void} [options.onDrop]
   * @param {function(item, point): void} [options.onDropMiss]
   * @param {{ scale?: number, zIndex?: number }} [options.cloneStyle]
   */
  constructor(container, options = {}) {
    this.container = container;
    this.dragSelector = options.dragSelector || '.draggable';
    this.dropTargets = options.dropTargets || [];
    this.forgiveness = options.forgiveness ?? 1.2;
    this.onDragStart = options.onDragStart || (() => {});
    this.onDragMove = options.onDragMove || (() => {});
    this.onDrop = options.onDrop || (() => {});
    this.onDropMiss = options.onDropMiss || (() => {});
    this.cloneStyle = options.cloneStyle || { scale: 1.1, zIndex: 9999 };
    this._activeItem = null;
    this._clone = null;
    this._boundStart = this._onStart.bind(this);
    this._boundMove = this._onMove.bind(this);
    this._boundEnd = this._onEnd.bind(this);
    this._attach();
  }

  _attach() {
    this.container.addEventListener('touchstart', this._boundStart, { passive: false });
    this.container.addEventListener('touchmove', this._boundMove, { passive: false });
    this.container.addEventListener('touchend', this._boundEnd, { passive: false });
    this.container.addEventListener('mousedown', this._boundStart);
    document.addEventListener('mousemove', this._boundMove);
    document.addEventListener('mouseup', this._boundEnd);
  }

  _detach() {
    this.container.removeEventListener('touchstart', this._boundStart);
    this.container.removeEventListener('touchmove', this._boundMove);
    this.container.removeEventListener('touchend', this._boundEnd);
    this.container.removeEventListener('mousedown', this._boundStart);
    document.removeEventListener('mousemove', this._boundMove);
    document.removeEventListener('mouseup', this._boundEnd);
  }

  _getDropTargets() {
    const raw = this.dropTargets;
    if (Array.isArray(raw) && raw.length > 0) {
      if (typeof raw[0] === 'string') {
        return Array.from(this.container.querySelectorAll(raw.join(',')));
      }
      return raw;
    }
    return [];
  }

  _hitTest(x, y) {
    const targets = this._getDropTargets();
    let nearest = null;
    let nearestDist = Infinity;
    for (const el of targets) {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const r = Math.max(rect.width, rect.height) / 2 * this.forgiveness;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= r && dist < nearestDist) {
        nearest = el;
        nearestDist = dist;
      }
    }
    return nearest;
  }

  _onStart(e) {
    const item = e.target.closest(this.dragSelector);
    if (!item) return;
    e.preventDefault();
    const point = getPoint(e);
    const rect = item.getBoundingClientRect();
    this._activeItem = item;
    this._clone = item.cloneNode(true);
    this._clone.classList.add('dragging');
    this._clone.style.position = 'fixed';
    this._clone.style.left = '0';
    this._clone.style.top = '0';
    this._clone.style.width = `${rect.width}px`;
    this._clone.style.height = `${rect.height}px`;
    this._clone.style.minWidth = `${rect.width}px`;
    this._clone.style.maxWidth = `${rect.width}px`;
    this._clone.style.minHeight = `${rect.height}px`;
    this._clone.style.maxHeight = `${rect.height}px`;
    this._clone.style.margin = '0';
    this._clone.style.boxSizing = 'border-box';
    this._clone.style.zIndex = String(this.cloneStyle.zIndex ?? 9999);
    this._clone.style.pointerEvents = 'none';
    this._clone.style.transformOrigin = 'center center';
    this._clone.style.transform = `scale(${this.cloneStyle.scale ?? 1.1})`;
    document.body.appendChild(this._clone);
    this._updateClonePosition(point);
    this.onDragStart(item, point);
  }

  _onMove(e) {
    if (!this._clone) return;
    e.preventDefault();
    const point = getPoint(e);
    this._updateClonePosition(point);
    const over = this._hitTest(point.x, point.y);
    this.onDragMove(this._activeItem, point, over);
  }

  _onEnd(e) {
    if (!this._clone) return;
    const point = getPointEnd(e);
    const over = this._hitTest(point.x, point.y);
    if (over) {
      this.onDrop(this._activeItem, over, point);
    } else {
      this.onDropMiss(this._activeItem, point);
    }
    if (!this._clone) return;
    const clone = this._clone;
    clone.style.transition = 'opacity 0.2s';
    clone.style.opacity = '0';
    setTimeout(() => {
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      if (this._clone === clone) this._clone = null;
      this._activeItem = null;
    }, 220);
  }

  _updateClonePosition(point) {
    if (!this._clone) return;
    const w = this._clone.offsetWidth;
    const h = this._clone.offsetHeight;
    const _scale = this.cloneStyle.scale ?? 1.1;  // reserved for future clone scaling
    this._clone.style.left = `${point.x - (w / 2)}px`;
    this._clone.style.top = `${point.y - (h / 2)}px`;
  }

  destroy() {
    this._detach();
    if (this._clone?.parentNode) this._clone.parentNode.removeChild(this._clone);
    this._clone = null;
    this._activeItem = null;
  }
}
