/**
 * OpticsEngine — thin-lens sequential optics calculator.
 *
 * Given focal lengths of up to two lenses placed in fixed slots, computes:
 *   - Intermediate image position (after lens 1)
 *   - Final image position (after lens 2, or lens 1 alone)
 *   - Whether the final image is inverted
 *   - Defocus distance from the sensor
 *   - CSS blur amount
 *
 * Sign conventions (standard thin-lens):
 *   f > 0   : converging (convex) lens
 *   f < 0   : diverging (concave) lens
 *   f = ∞   : flat glass — no bending (JavaScript Infinity)
 *   f = null: empty slot
 *   dₒ > 0  : real object (to the left of the lens)
 *   dᵢ > 0  : real image (to the right); each real image INVERTS
 *   dᵢ < 0  : virtual image (same side as object); does NOT invert
 *
 * Parallel input (object at ∞): dᵢ = f for a single lens.
 *
 * SVG ray-trace convention:
 *   h = height above optical axis, positive = above (smaller SVG y)
 *   m = SVG slope dy_svg/dx, positive = going DOWN the screen
 *   After thin lens at h: m_out = m_in + h/f
 *   Propagating distance d:  h_new = h − m × d
 */

export class OpticsEngine {
  /**
   * @param {object} layout  The layout object from chapter2.js
   */
  constructor(layout) {
    this._layout = layout;
  }

  // ── Public: optical state ─────────────────────────────────────────────────

  /**
   * Compute the full optical state for a given lens configuration.
   *
   * @param {number|null} f1  Focal length in slot 1 (null=empty, Infinity=flat)
   * @param {number|null} f2  Focal length in slot 2
   * @returns {object}  OpticsState
   */
  compute(f1, f2, posX1 = null, posX2 = null) {
    const { slots, sensor } = this._layout;
    const x1 = posX1 ?? slots[0].x;
    const x2 = posX2 ?? slots[1].x;
    const xs = sensor.x;

    // ── Step 1: lens 1 (parallel input → dₒ = ∞, so dᵢ = f₁) ──────────────
    let imageX   = null;    // x-position of image after lens 1 (null = at ∞)
    let inverted = false;   // net inversion state

    if (f1 !== null && isFinite(f1)) {
      const di1 = f1;            // parallel input → dᵢ = f
      imageX   = x1 + di1;
      inverted = di1 > 0;        // real image = inverted
    }
    // f1 null or ∞: no bending, imageX stays null (rays remain parallel)

    // ── Step 2: lens 2 ───────────────────────────────────────────────────────
    let finalImageX = imageX;

    if (f2 !== null && isFinite(f2)) {
      let do2;
      if (imageX === null || !isFinite(imageX)) {
        // Rays still parallel (no lens 1, or f1=∞)
        do2 = Infinity;
      } else {
        do2 = x2 - imageX;
        if (do2 === 0) do2 = 1e-6;  // avoid ÷0 at degenerate case
      }

      const di2 = isFinite(do2)
        ? (f2 * do2) / (do2 - f2)   // thin lens equation
        : f2;                         // parallel input → dᵢ = f₂

      finalImageX = x2 + di2;

      const lens2Inverts = di2 > 0;
      inverted = inverted !== lens2Inverts;  // XOR — two inversions = upright
    } else {
      // f2 = null (empty) or ∞ (flat glass): no change to image position
      finalImageX = imageX;
    }

    // ── Step 3: defocus and blur ─────────────────────────────────────────────
    const defocus = (finalImageX === null || !isFinite(finalImageX))
      ? Infinity
      : Math.abs(finalImageX - xs);

    const MAX_BLUR    = 14;   // px
    const MAX_DEFOCUS = 400;  // SVG units → maps to MAX_BLUR
    const blurPx = isFinite(defocus)
      ? MAX_BLUR * Math.min(1, defocus / MAX_DEFOCUS)
      : MAX_BLUR;

    return {
      intermediateImageX: imageX,             // null or SVG x after lens 1
      finalImageX,                            // null, ∞, or SVG x after lens 2 (or 1)
      isInverted:         inverted,
      defocus,
      blurPx,
      isFocused:  defocus < 3,                // close enough to count as sharp
      hasLens1:   f1 !== null,
      hasLens2:   f2 !== null,
    };
  }

  // ── Public: ray tracing ───────────────────────────────────────────────────

  /**
   * Trace rays through the optical system for the SVG ray diagram.
   *
   * Returns two bundles of polyline-point arrays:
   *   upper: rays representing light from the top of the subject
   *          (enter with slight downward SVG slope → form image BELOW axis)
   *   lower: rays representing light from the bottom of the subject
   *          (enter with slight upward SVG slope → form image ABOVE axis)
   *
   * This demonstrates inversion: top of subject → below axis at intermediate
   * image (inverted), then re-crosses to above axis at final image (upright).
   *
   * @param {number|null} f1
   * @param {number|null} f2
   * @param {number} [angle=0.15]  Angular separation of the two bundles (SVG slope units)
   * @returns {{ upper: Array<[number,number][]>, lower: Array<[number,number][]> }}
   */
  traceRays(f1, f2, posX1 = null, posX2 = null, angle = 0.15) {
    const { slots, sensor, tube, raysEnterX } = this._layout;
    const x1 = posX1 ?? slots[0].x;
    const x2 = posX2 ?? slots[1].x;
    const xs = sensor.x;

    // Three ray heights at tube entrance (SVG units above optical axis)
    const H = (tube.y2 - tube.y1) / 2;   // 100
    const heights = [H * 0.8, H * 0.4, 0];  // [80, 40, 0]

    const upper = heights.map(h =>
      this._traceRay(h, +angle, f1, f2, x1, x2, xs, raysEnterX, tube));

    const lower = heights.map(h =>
      this._traceRay(-h, -angle, f1, f2, x1, x2, xs, raysEnterX, tube));

    return { upper, lower };
  }

  // ── Private ───────────────────────────────────────────────────────────────

  /**
   * Trace one ray defined by (h, m) at the tube entrance through the system.
   *
   * @param {number} h0        Height above optical axis at raysEnterX (SVG units)
   * @param {number} m0        Initial SVG slope dy_svg/dx
   * @param {number|null} f1
   * @param {number|null} f2
   * @param {number} x1        Slot 1 x position
   * @param {number} x2        Slot 2 x position
   * @param {number} xs        Sensor x position
   * @param {number} xEnter    x at which rays enter the diagram
   * @param {object} tube      { y1, y2 } for clamping
   * @returns {[number,number][]}  Array of SVG [x, y] points
   */
  _traceRay(h0, m0, f1, f2, x1, x2, xs, xEnter, tube) {
    const axisY  = this._layout.axisY;
    const clamp  = (y) => Math.max(tube.y1 - 30, Math.min(tube.y2 + 30, y));
    const pt     = (x, h) => [x, clamp(axisY - h)];

    // h(x) propagation: h_new = h − m × Δx   (h decreases when going down, m>0)
    const propagate = (h, m, dx) => h - m * dx;

    let h    = h0;
    let m    = m0;
    let xCur = xEnter;
    const points = [];

    // Start point 80 units left of tube entrance (extends the ray into view)
    points.push(pt(xEnter - 80, propagate(h, m, -80)));
    points.push(pt(xEnter, h));

    // ── Apply lens 1 ──────────────────────────────────────────────────────
    if (f1 !== null && isFinite(f1)) {
      const h1 = propagate(h, m, x1 - xCur);
      points.push(pt(x1, h1));
      m    = m + h1 / f1;   // SVG refraction: m_out = m_in + h/f
      h    = h1;
      xCur = x1;
    }

    // ── Apply lens 2 ──────────────────────────────────────────────────────
    if (f2 !== null && isFinite(f2)) {
      const h2 = propagate(h, m, x2 - xCur);
      points.push(pt(x2, h2));
      m    = m + h2 / f2;
      h    = h2;
      xCur = x2;
    }

    // ── Continue to sensor ────────────────────────────────────────────────
    const hSensor = propagate(h, m, xs - xCur);
    points.push(pt(xs, hSensor));

    return points;
  }
}
