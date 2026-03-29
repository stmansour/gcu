/**
 * LineDragManager — drag a line between named points inside an SVG element.
 *
 * Generic for any "connect A to B" interaction in SVG coordinate space.
 * Handles iOS-safe touch + mouse events, SVG coordinate transforms,
 * and hit-testing against a map of named points with a configurable radius.
 *
 * Usage pattern:
 *   const drag = new LineDragManager(svgElement, {
 *     points:       terminalPositionsMap,  // Map<id, {x, y}> in SVG user-space
 *     hitRadius:    44,                    // SVG units
 *     canStartFrom: (id) => !locked.has(id),
 *     onDragStart:  (id)         => renderer.startPreview(id),
 *     onDragMove:   (svgX, svgY) => renderer.updatePreview(svgX, svgY),
 *     onDrop:       (fromId, toId) => game.connect(fromId, toId),
 *     onCancel:     ()           => renderer.clearPreview(),
 *   });
 *
 *   // After a re-render that moves the points:
 *   drag.setPoints(newPositionsMap);
 *
 *   // Cleanup when the scene exits:
 *   drag.destroy();
 *
 * Games using it:
 *   Robot Lab — wire drawing between circuit terminals
 *   (future) Puzzle Forest — connect-the-nodes logic puzzles
 *   (future) Art Studio — patch-cable connections in color mixer
 */

function _getPoint(e) {
  if (e.touches?.length > 0)
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

function _getPointEnd(e) {
  if (e.changedTouches?.length > 0)
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

export class LineDragManager {
  /**
   * @param {HTMLElement} containerEl
   *   The element that receives touch/mouse events (e.g. the board div).
   *   Separating it from the SVG element lets iOS touchmove work correctly.
   * @param {object}  opts
   * @param {SVGSVGElement} [opts.svgEl]
   *   The SVG element used for coordinate transforms.  Defaults to containerEl
   *   if containerEl is itself an SVG element.
   * @param {Map<string, {x:number, y:number}>} opts.points
   *   Named points in SVG user-space.  Updated via setPoints() after re-renders.
   * @param {number}  [opts.hitRadius=40]
   *   Maximum distance (SVG units) a finger/cursor may be from a point to
   *   activate it.  Larger values are more forgiving for small fingers.
   * @param {(id: string) => boolean} [opts.canStartFrom]
   *   Return false to prevent starting a drag from this point (e.g. already
   *   connected, game is in solved state, etc.).  Called at pointer-down time
   *   so it always reflects current game state.
   * @param {(id: string) => boolean} [opts.canEndAt]
   *   Return false to reject a drop on this point.  Defaults to allow all.
   * @param {(fromId: string) => void} [opts.onDragStart]
   * @param {(svgX: number, svgY: number) => void} [opts.onDragMove]
   * @param {(fromId: string, toId: string) => void} [opts.onDrop]
   * @param {() => void} [opts.onCancel]
   *   Called when the drag ends without landing on a valid target.
   */
  constructor(containerEl, opts = {}) {
    this._container   = containerEl;
    this._svg         = opts.svgEl ?? containerEl;
    this._points      = opts.points      ?? new Map();
    this._hitRadius   = opts.hitRadius   ?? 40;
    this._canStartFrom = opts.canStartFrom ?? (() => true);
    this._canEndAt    = opts.canEndAt    ?? (() => true);
    this._onDragStart = opts.onDragStart ?? (() => {});
    this._onDragMove  = opts.onDragMove  ?? (() => {});
    this._onDrop      = opts.onDrop      ?? (() => {});
    this._onCancel    = opts.onCancel    ?? (() => {});

    this._fromId = null;  // set while a drag is active

    this._down = this._onDown.bind(this);
    this._move = this._onMove.bind(this);
    this._up   = this._onUp.bind(this);
    this._attach();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Replace the points map.  Call this after any re-render that repositions
   * the named points (e.g. after a circuit reset / shuffle).
   * @param {Map<string, {x:number, y:number}>} points
   */
  setPoints(points) {
    this._points = points;
  }

  /** Remove all event listeners. Call when the owning scene exits. */
  destroy() {
    this._detach();
    this._fromId = null;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  _attach() {
    this._container.addEventListener('touchstart', this._down, { passive: false });
    this._container.addEventListener('touchmove',  this._move, { passive: false });
    this._container.addEventListener('touchend',   this._up,   { passive: false });
    this._container.addEventListener('mousedown',  this._down);
    document.addEventListener('mousemove',         this._move);
    document.addEventListener('mouseup',           this._up);
  }

  _detach() {
    this._container.removeEventListener('touchstart', this._down);
    this._container.removeEventListener('touchmove',  this._move);
    this._container.removeEventListener('touchend',   this._up);
    this._container.removeEventListener('mousedown',  this._down);
    document.removeEventListener('mousemove',         this._move);
    document.removeEventListener('mouseup',           this._up);
  }

  /** Convert screen (clientX/Y) → SVG user-space {x, y}. */
  _toSVG(screenX, screenY) {
    const pt = this._svg.createSVGPoint();
    pt.x = screenX;
    pt.y = screenY;
    return pt.matrixTransform(this._svg.getScreenCTM().inverse());
  }

  /**
   * Return the ID of the closest named point within hitRadius, or null.
   * Hit radius is in SVG units, so it scales correctly with zoom/pan.
   */
  _nearest(screenX, screenY) {
    const { x, y } = this._toSVG(screenX, screenY);
    let bestId   = null;
    let bestDist = this._hitRadius;
    for (const [id, pos] of this._points) {
      const d = Math.hypot(x - pos.x, y - pos.y);
      if (d < bestDist) { bestDist = d; bestId = id; }
    }
    return bestId;
  }

  _onDown(e) {
    const { x, y } = _getPoint(e);
    const id = this._nearest(x, y);
    if (!id || !this._canStartFrom(id)) return;
    e.preventDefault();
    this._fromId = id;
    this._onDragStart(id);
  }

  _onMove(e) {
    if (this._fromId === null) return;
    e.preventDefault();
    const { x, y } = _getPoint(e);
    const svgPt = this._toSVG(x, y);
    this._onDragMove(svgPt.x, svgPt.y);
  }

  _onUp(e) {
    if (this._fromId === null) return;
    e.preventDefault();
    const { x, y } = _getPointEnd(e);
    const toId   = this._nearest(x, y);
    const fromId = this._fromId;
    this._fromId = null;

    if (toId && toId !== fromId && this._canEndAt(toId)) {
      this._onDrop(fromId, toId);
    } else {
      this._onCancel();
    }
  }
}
