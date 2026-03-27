/**
 * ColorSensorEngine — Chapter 3: Color Sensing
 *
 * Models SWIRL-E's three-sensor color system.
 *
 * Physical model:
 *   - Three physical sensors (A, B, C) each capture a single greyscale channel
 *     from the scene, filtered through a color filter (R, G, or B).
 *   - Their output signals are routed to three display channels (R, G, B).
 *   - In the scrambled starting state the routing is wrong.
 *   - A per-output gain multiplier (0–2) handles white-balance calibration.
 *
 * Correct solution:
 *   - Route each sensor to the output matching its physical filter.
 *   - Bring all gains close to their target values.
 */

/** All possible channel-swap scrambles (excluding the identity). */
const SCRAMBLES = [
  { A: 'G', B: 'R', C: 'B' },  // A↔B swapped
  { A: 'B', B: 'G', C: 'R' },  // A↔C swapped
  { A: 'G', B: 'B', C: 'R' },  // full rotation
  { A: 'B', B: 'R', C: 'G' },  // reverse rotation
];

export class ColorSensorEngine {
  /**
   * @param {object} opts
   * @param {object} [opts.scramble]   - override sensor→filter mapping (for testing)
   * @param {object} [opts.gainTarget] - target gains to reach, e.g. {R:0.9, G:1.1, B:1.0}
   */
  constructor(opts = {}) {
    // sensorFilter: which physical color filter each sensor looks through.
    // This is FIXED — the child never changes it, only discovers it.
    const scramblePool = SCRAMBLES;
    this.sensorFilter = opts.scramble
      ?? scramblePool[Math.floor(Math.random() * scramblePool.length)];

    // routing: which sensor the child has routed to each output channel.
    // null = unconnected.
    this.routing = { R: null, G: null, B: null };

    // Gain per output channel (child-adjustable).
    // Target is always 1.0 so the default slider positions are already "correct"
    // and routing alone is the completion gate. Sliders remain for sandbox exploration.
    this.gainTarget = opts.gainTarget ?? { R: 1.0, G: 1.0, B: 1.0 };

    // Slider positions start at 1.0 (matching target).
    this.gains = { R: 1.0, G: 1.0, B: 1.0 };
  }

  // ── Routing ────────────────────────────────────────────────────────────────

  /**
   * Connect sensor sensorId ('A'|'B'|'C') to output channel ('R'|'G'|'B').
   * Enforces one-to-one: unroutes any prior connection to that output or from that sensor.
   */
  setRoute(outputChannel, sensorId) {
    // Remove any existing connection that uses this sensor
    for (const ch of ['R', 'G', 'B']) {
      if (this.routing[ch] === sensorId) this.routing[ch] = null;
    }
    this.routing[outputChannel] = sensorId;
  }

  removeRoute(outputChannel) {
    this.routing[outputChannel] = null;
  }

  // ── Gain ───────────────────────────────────────────────────────────────────

  setGain(outputChannel, value) {
    this.gains[outputChannel] = Math.max(0, Math.min(2, value));
  }

  // ── Image processing ───────────────────────────────────────────────────────

  /**
   * Get the raw greyscale pixel data for one sensor (what that sensor physically sees).
   * Returns a Uint8ClampedArray of length width*height (one byte per pixel).
   *
   * @param {'A'|'B'|'C'} sensorId
   * @param {ImageData} sourceImageData
   */
  getSensorGreyscale(sensorId, sourceImageData) {
    const { data, width, height } = sourceImageData;
    const filter = this.sensorFilter[sensorId]; // 'R'|'G'|'B'
    const chIdx  = filter === 'R' ? 0 : filter === 'G' ? 1 : 2;
    const out    = new Uint8ClampedArray(width * height);
    for (let i = 0; i < width * height; i++) {
      out[i] = data[i * 4 + chIdx];
    }
    return out;
  }

  /**
   * Process source image data through the current routing + gains.
   * Writes into outputImageData (same dimensions as sourceImageData).
   *
   * @param {ImageData} sourceImageData
   * @param {ImageData} outputImageData  - modified in place
   */
  processImage(sourceImageData, outputImageData) {
    const src  = sourceImageData.data;
    const dst  = outputImageData.data;
    const len  = src.length;

    // Precompute: for each output channel, which source channel index to read
    const channelOf = { R: 0, G: 1, B: 2 };
    const rSrc = this.routing.R ? channelOf[this.sensorFilter[this.routing.R]] : -1;
    const gSrc = this.routing.G ? channelOf[this.sensorFilter[this.routing.G]] : -1;
    const bSrc = this.routing.B ? channelOf[this.sensorFilter[this.routing.B]] : -1;

    const rG = this.gains.R;
    const gG = this.gains.G;
    const bG = this.gains.B;

    for (let i = 0; i < len; i += 4) {
      dst[i]     = rSrc >= 0 ? Math.min(255, src[i + rSrc] * rG) : 0;
      dst[i + 1] = gSrc >= 0 ? Math.min(255, src[i + gSrc] * gG) : 0;
      dst[i + 2] = bSrc >= 0 ? Math.min(255, src[i + bSrc] * bG) : 0;
      dst[i + 3] = src[i + 3];
    }
  }

  // ── State queries ──────────────────────────────────────────────────────────

  /** How many output channels currently have a sensor connected. */
  get connectedCount() {
    return ['R', 'G', 'B'].filter(ch => this.routing[ch] !== null).length;
  }

  /**
   * True when every output channel is routed to the sensor whose physical
   * filter matches that channel colour.
   */
  isRoutingCorrect() {
    for (const ch of ['R', 'G', 'B']) {
      const sensor = this.routing[ch];
      if (!sensor) return false;
      if (this.sensorFilter[sensor] !== ch) return false;
    }
    return true;
  }

  /**
   * True when all gains are within `tolerance` of their target.
   */
  isGainBalanced(tolerance = 0.12) {
    return (
      Math.abs(this.gains.R - this.gainTarget.R) <= tolerance &&
      Math.abs(this.gains.G - this.gainTarget.G) <= tolerance &&
      Math.abs(this.gains.B - this.gainTarget.B) <= tolerance
    );
  }

  isComplete() {
    return this.isRoutingCorrect() && this.isGainBalanced();
  }

  /**
   * Describe the visual character of the current output (for SWIRL-E dialogue).
   * @returns {'none'|'mono'|'swapped'|'routed-unbalanced'|'complete'}
   */
  getOutputState() {
    const n = this.connectedCount;
    if (n === 0) return 'none';
    if (n < 3)   return 'partial';
    // All 3 connected
    if (this.isRoutingCorrect()) {
      return this.isGainBalanced() ? 'complete' : 'routed-unbalanced';
    }
    // Check for all-same (mono)
    const vals = Object.values(this.routing);
    if (vals[0] === vals[1] && vals[1] === vals[2]) return 'mono';
    return 'swapped';
  }
}
