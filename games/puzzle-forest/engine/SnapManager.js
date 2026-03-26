/**
 * SnapManager — target proximity and visual snap feedback for DOM drag targets.
 */

export class SnapManager {
  constructor({ snapDistance = 150 } = {}) {
    this.snapDistance = snapDistance;
    this._activeTarget = null;
  }

  checkSnapTargets(point, targets) {
    if (!point) return null;

    let nearest = null;
    let nearestDistance = this.snapDistance;

    for (const target of targets) {
      const rect = target.getBoundingClientRect();
      const cx = rect.left + (rect.width / 2);
      const cy = rect.top + (rect.height / 2);
      const distance = Math.hypot(point.x - cx, point.y - cy);
      if (distance < nearestDistance) {
        nearest = target;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  highlightTarget(target, targets) {
    for (const entry of targets) {
      entry.classList.toggle('pf-target--snap', entry === target);
    }
    this._activeTarget = target ?? null;
  }

  clearHighlights(targets) {
    this.highlightTarget(null, targets);
  }

  snapToTarget(target) {
    if (!target) return;
    target.classList.remove('pf-target--placed-pop');
    void target.offsetWidth;
    target.classList.add('pf-target--placed-pop');
  }
}
