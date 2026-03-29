/**
 * ParticleSystem
 *
 * Animates charged particle symbols along a circuit path defined as waypoints
 * in SVG coordinate space.
 *
 * Waypoints define the CLOCKWISE path (conventional current direction).
 * In electron mode, particles traverse the same segments in reverse (CCW).
 *
 * Two visual modes:
 *   electron      — blue filled circle with '−' label
 *   conventional  — orange arrow polygon that rotates to face direction of travel
 *
 * Supports variable speed via speedFn(elapsedMs) → multiplier:
 *   - Capacitor charge: 1 → 0 deceleration
 *   - Inductor ramp:    0 → 1 ease-in acceleration
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export class ParticleSystem {
  /**
   * @param {SVGGElement} layer  — SVG <g> element to render particles into
   */
  constructor(layer) {
    this._layer     = layer;
    this._particles = [];
    this._segs      = [];   // [{x1,y1,x2,y2,len,cumLen}]
    this._totalLen  = 0;
    this._speed     = 120;  // SVG units per second
    this._direction = 'electron';
    this._speedFn   = null;
    this._startTime = 0;
    this._prevTime  = 0;
    this._raf       = null;
  }

  /** Current direction ('electron' or 'conventional'). */
  get direction() { return this._direction; }

  /**
   * Start animating particles along a circuit path.
   * @param {Array<[number,number]>} cwWaypoints  — points in CW order (conventional current)
   * @param {object} opts
   * @param {number}   [opts.count=8]           — particle count
   * @param {number}   [opts.speed=120]         — base speed in SVG units/sec
   * @param {'electron'|'conventional'} [opts.direction='electron']
   * @param {function} [opts.speedFn]           — (elapsedMs) → multiplier (≥0). null = constant 1.
   */
  start(cwWaypoints, opts = {}) {
    this.stop();

    const { count = 8, speed = 120, direction = 'electron', speedFn = null } = opts;
    this._speed     = speed;
    this._direction = direction;
    this._speedFn   = speedFn;
    this._startTime = performance.now();
    this._prevTime  = this._startTime;

    // Build path segments
    this._segs     = [];
    this._totalLen = 0;
    for (let i = 0; i < cwWaypoints.length - 1; i++) {
      const [x1, y1] = cwWaypoints[i];
      const [x2, y2] = cwWaypoints[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      if (len < 0.5) continue; // skip zero-length segments
      this._segs.push({ x1, y1, x2, y2, len, cumLen: this._totalLen });
      this._totalLen += len;
    }

    if (this._totalLen < 1 || this._segs.length === 0) return;

    // Create particles, evenly spaced along the path
    for (let i = 0; i < count; i++) {
      const initDist = (i / count) * this._totalLen;
      const el = this._makeParticle(direction);
      this._layer.appendChild(el);
      this._particles.push({ el, dist: initDist });
    }

    this._raf = requestAnimationFrame(t => this._tick(t));
  }

  /**
   * Change direction while running (direction toggle button).
   * Updates the mode class so CSS shows/hides circle vs arrow.
   */
  setDirection(direction) {
    this._direction = direction;
    for (const p of this._particles) {
      p.el.setAttribute('class', `rl-particle rl-particle-mode--${direction}`);
    }
  }

  /** Stop animation and remove all particle elements from the SVG. */
  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    for (const p of this._particles) p.el.remove();
    this._particles = [];
    this._segs      = [];
    this._totalLen  = 0;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  _tick(now) {
    const dt      = Math.min((now - this._prevTime) / 1000, 0.05); // cap at 50ms
    this._prevTime = now;

    const elapsed = now - this._startTime;
    const mult    = this._speedFn ? this._speedFn(elapsed) : 1.0;
    const step    = this._speed * Math.max(0, mult) * dt;

    for (const p of this._particles) {
      p.dist = (p.dist + step) % this._totalLen;
      const { x, y, angle } = this._getPos(p.dist);
      p.el.setAttribute('transform',
        `translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    }

    this._raf = requestAnimationFrame(t => this._tick(t));
  }

  /**
   * Get SVG position and travel angle at a distance along the path.
   * dist is 0..totalLen in the CW direction.
   * For electron mode, position is mirrored (CCW); angle is reversed accordingly.
   * @returns {{ x: number, y: number, angle: number }}  angle in degrees
   */
  _getPos(dist) {
    const isElectron = this._direction === 'electron';
    const d = isElectron
      ? (this._totalLen - dist + this._totalLen) % this._totalLen
      : dist;

    for (let i = 0; i < this._segs.length; i++) {
      const seg = this._segs[i];
      const end = seg.cumLen + seg.len;
      if (d <= end || i === this._segs.length - 1) {
        const t = seg.len > 0 ? Math.min(1, (d - seg.cumLen) / seg.len) : 0;
        const x = seg.x1 + (seg.x2 - seg.x1) * t;
        const y = seg.y1 + (seg.y2 - seg.y1) * t;
        // Arrow rotation: angle of actual movement direction
        const angle = isElectron
          ? Math.atan2(seg.y1 - seg.y2, seg.x1 - seg.x2) * 180 / Math.PI
          : Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1) * 180 / Math.PI;
        return { x, y, angle };
      }
    }
    return { x: this._segs[0].x1, y: this._segs[0].y1, angle: 0 };
  }

  /**
   * Create one particle group containing both a circle (electron) and
   * an arrow polygon (conventional current). CSS mode classes control
   * which is visible.
   */
  _makeParticle(direction) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', `rl-particle rl-particle-mode--${direction}`);

    // Electron mode: blue filled circle with '−' label
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('r', '9');
    c.setAttribute('class', 'rl-particle__circle rl-particle--electron');

    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('class', 'rl-particle__label rl-particle-label');
    t.setAttribute('x', '0');
    t.setAttribute('y', '0');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.textContent = '−';

    // Conventional mode: arrow polygon pointing right at angle=0
    // Rotated each frame by _tick via the group transform
    const arrow = document.createElementNS(SVG_NS, 'polygon');
    arrow.setAttribute('class', 'rl-particle__arrow rl-particle--conventional');
    arrow.setAttribute('points', '-10,-7 12,0 -10,7');

    g.appendChild(c);
    g.appendChild(t);
    g.appendChild(arrow);
    return g;
  }
}
