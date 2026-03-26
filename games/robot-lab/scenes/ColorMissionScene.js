/**
 * ColorMissionScene — Robot Lab Chapter 3: Color Sensing
 *
 * Layout (tablet landscape):
 *
 *  ┌─ sidebar ─┬─────────── patchbay SVG ────────────┬── result panel ──┐
 *  │ SWIRL-E   │  SENSOR A ░░░ ●━━━━━━━━━━━━━━━━● RED   │ [source picker]  │
 *  │ portrait  │  SENSOR B ░░░ ●                ● GREEN │                  │
 *  │ speech    │  SENSOR C ░░░ ●                ● BLUE  │ [processed image │
 *  │ bubble    │                                        │  on canvas]      │
 *  │           │  ── GAIN ─────────────────────────     │                  │
 *  │           │  [R slider] [G slider] [B slider]      │                  │
 *  └───────────┴────────────────────────────────────────┴──────────────────┘
 *
 * Interaction:
 *   - Draw wires on the patchbay SVG by dragging from a sensor node to an output node.
 *   - Adjust R/G/B gain sliders.
 *   - Source picker selects which image SWIRL-E is looking at.
 *   - Result canvas updates live on every change.
 *
 * Outcomes (matching CircuitMissionScene pattern):
 *   - 'none'              → no channels connected
 *   - 'partial'           → some connected, not all
 *   - 'mono'              → all connected to same sensor → greyscale result
 *   - 'swapped'           → all connected, routing wrong
 *   - 'routed-unbalanced' → routing correct, gain off (Beat 1 equivalent)
 *   - 'complete'          → routing correct + gain balanced → SUCCESS
 */

import { Scene }                        from '../../../core/scene/index.js';
import { GameStorage }                  from '../../../core/storage/index.js';
import { AVATAR_META, AVATAR_IMAGES }   from '../../../core/avatar/avatarManifest.js';
import { celebrate }                    from '../../../core/rewards/index.js';
import { ROBOT_LAB_CHAPTERS, CHAPTER_SCENES } from '../data/chapters.js';
import { ColorSensorEngine }            from '../engine/ColorSensorEngine.js';
import { drawScene, drawSceneAsync, drawAvatar, SCENE_W, SCENE_H } from '../engine/ColorSceneFactory.js';
import { CHAPTER_3 }                    from '../missions/chapter3.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Patchbay SVG coordinate space
const PB_W = 640;
const PB_H = 400;

// Thumbnail dimensions inside each sensor row
const THUMB_H = 64;
const THUMB_W = Math.round(THUMB_H * (SCENE_W / SCENE_H)); // preserves source aspect ratio (400×300 → 85×64)

// Terminal positions in SVG space  (rows at y = 90 / 200 / 310)
const SENSOR_NODES = {
  A: { x: 180, y:  90 },
  B: { x: 180, y: 200 },
  C: { x: 180, y: 310 },
};
const OUTPUT_NODES = {
  R: { x: 460, y:  90, color: '#FF4444', label: 'RED'   },
  G: { x: 460, y: 200, color: '#44DD44', label: 'GREEN' },
  B: { x: 460, y: 310, color: '#4488FF', label: 'BLUE'  },
};
const NODE_R = 16; // hit radius for terminals

export class ColorMissionScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage      = new GameStorage('robot-lab');

    this._engine     = null;
    this._avatarId   = null;
    this._solved     = false;
    this._container  = null;
    this._completedChapters = new Set();

    // Canvas state
    this._sourceCanvas  = null;   // original drawn scene
    this._resultCanvas  = null;   // processed output shown to player
    this._currentSource = null;   // active source id
    this._avatarImg     = null;   // loaded Image for avatar source

    // Patchbay SVG state
    this._pbSvg         = null;
    this._wireLayer     = null;
    this._drawnWires    = {};     // outputChannel → SVGLineElement
    this._thumbImgEls   = {};     // sensorId → SVG <image> element (avoids iOS foreignObject bugs)

    // Wire drag state
    this._dragFrom      = null;   // 'A'|'B'|'C' — dragging from sensor
    this._previewLine   = null;   // SVGLineElement preview
    this._pbRect        = null;   // cached getBoundingClientRect

    // Listeners to clean up
    this._boundPointerMove = this._onPointerMove.bind(this);
    this._boundPointerUp   = this._onPointerUp.bind(this);
  }

  // ── Scene lifecycle ────────────────────────────────────────────────────────

  enter(container, data = {}) {
    this._avatarId  = data.avatarId ?? null;
    this._container = container;
    this._solved    = false;

    this.storage.get('progress', { completedChapters: [] }).then(p => {
      this._completedChapters = new Set(p.completedChapters);
    });

    this._engine = new ColorSensorEngine();

    container.className = 'rl-mission rl-color';
    this._buildDOM(container);
    this._initCanvases();
    this._buildPatchbaySVG();
    this._attachEvents();

    // Show briefing overlay
    this._showBriefing();
  }

  exit(container) {
    document.removeEventListener('pointermove', this._boundPointerMove);
    document.removeEventListener('pointerup',   this._boundPointerUp);
    container.innerHTML = '';
    this._container    = null;
    this._pbSvg        = null;
    this._sourceCanvas = this._resultCanvas = null;
    this._avatarImg    = null;
    this._thumbImgEls  = {};
  }

  // ── DOM ───────────────────────────────────────────────────────────────────

  _buildDOM(container) {
    const m = CHAPTER_3;

    container.innerHTML = `
      <div class="rl-mission__bg"></div>

      <div class="rl-mission__topbar">
        <button type="button" class="rl-back-btn" id="rl-back">← Hub</button>
        <span class="rl-mission__title">
          <span class="rl-label-prefix">Ch&nbsp;${m.chapterNumber}:</span> ${m.title}
        </span>
        <button type="button" class="rl-clear-btn" id="rl-reset" title="Reset wires and gains">↺ Reset</button>
        <button type="button" class="rl-hint-btn"  id="rl-hint" aria-label="Show hint">📓</button>
      </div>

      <div class="rl-mission__main">

        <div class="rl-mission__sidebar">
          <div class="rl-mission__swirle-portrait" id="rl-swirle">
            <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                 alt="SWIRL-E" class="rl-mission__swirle-img" id="rl-swirle-portrait">
          </div>
          <div class="rl-cs-speech" id="rl-speech">${m.speech.none}</div>
          <div class="rl-mission__actions" id="rl-actions"></div>
        </div>

        <div class="rl-cs-center" id="rl-center">
          <div class="rl-cs-patchbay-wrap">
            <div class="rl-cs-patchbay-label">COLOR SENSOR PATCHBAY</div>
            <svg class="rl-cs-patchbay" id="rl-patchbay"
                 viewBox="0 0 ${PB_W} ${PB_H}"
                 xmlns="http://www.w3.org/2000/svg"></svg>
          </div>
          <div class="rl-cs-gain-row" id="rl-gain-row">
            <span class="rl-cs-gain-label">CHANNEL GAIN</span>
            ${['R','G','B'].map(ch => `
              <div class="rl-cs-gain-ctrl">
                <label class="rl-cs-gain-ch rl-cs-gain-ch--${ch.toLowerCase()}">${ch}</label>
                <input type="range" class="rl-cs-gain-slider" id="rl-gain-${ch}"
                       min="0" max="2" step="0.01" value="1">
                <span class="rl-cs-gain-val" id="rl-gain-val-${ch}">1.00</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="rl-cs-result" id="rl-result">
          <div class="rl-cs-result-label">WHAT SWIRL-E SEES</div>
          <canvas class="rl-cs-result-canvas" id="rl-result-canvas"
                  width="${SCENE_W}" height="${SCENE_H}"></canvas>
          <div class="rl-cs-sources-section">
            <div class="rl-cs-result-label">TEST SOURCES</div>
            <div class="rl-cs-source-picker" id="rl-source-picker"></div>
          </div>
        </div>

      </div>

      <div class="rl-hint-panel" id="rl-hint-panel" hidden>
        <div class="rl-hint-panel__inner">
          <div class="rl-hint-panel__paper">
            <h3 class="rl-hint-panel__heading">Grandpa's Journal</h3>
            <div class="rl-hint-panel__text" id="rl-hint-text"></div>
            <button type="button" class="rl-btn rl-btn--close" id="rl-hint-close">Got it!</button>
          </div>
        </div>
      </div>
    `;

    // Journal hint text
    const hintEl = container.querySelector('#rl-hint-text');
    for (const line of CHAPTER_3.journalHint) {
      const p = document.createElement('p');
      p.textContent = line;
      hintEl.appendChild(p);
    }
  }

  // ── Canvas init ───────────────────────────────────────────────────────────

  _initCanvases() {
    this._resultCanvas = this._container.querySelector('#rl-result-canvas');

    // Off-screen source canvas
    this._sourceCanvas = document.createElement('canvas');
    this._sourceCanvas.width  = SCENE_W;
    this._sourceCanvas.height = SCENE_H;

    // Build source picker UI
    this._buildSourcePicker();

    // Default to first non-avatar source (avatar loads async)
    const defaultSrc = this._avatarId ? 'avatar' : 'fruit';
    this._selectSource(defaultSrc);
  }

  // ── Source picker ─────────────────────────────────────────────────────────

  _buildSourcePicker() {
    const picker = this._container.querySelector('#rl-source-picker');
    picker.innerHTML = '';

    for (const src of CHAPTER_3.sources) {
      if (src.id === 'avatar' && !this._avatarId) continue;

      const btn = document.createElement('button');
      btn.type      = 'button';
      btn.className = 'rl-cs-source-btn';
      btn.dataset.src = src.id;
      btn.innerHTML = `<span class="rl-cs-source-icon">${src.icon}</span>
                       <span class="rl-cs-source-lbl">${src.label}</span>`;
      btn.addEventListener('click', () => this._selectSource(src.id));
      picker.appendChild(btn);
    }
  }

  _selectSource(srcId) {
    this._currentSource = srcId;

    // Update picker button states
    for (const btn of (this._container?.querySelectorAll('.rl-cs-source-btn') ?? [])) {
      btn.classList.toggle('rl-cs-source-btn--active', btn.dataset.src === srcId);
    }

    if (srcId === 'avatar' && this._avatarId) {
      const img = new Image();
      img.onload = () => {
        this._avatarImg = img;
        drawAvatar(img, this._sourceCanvas);
        this._updateThumbnails();
        this._processAndDisplay();
      };
      img.src = AVATAR_IMAGES[this._avatarId];
    } else {
      // Try to load a generated PNG first; fall back to procedural canvas drawing.
      drawSceneAsync(srcId, this._sourceCanvas).then(() => {
        this._updateThumbnails();
        this._processAndDisplay();
      });
    }
  }

  // ── Patchbay SVG ──────────────────────────────────────────────────────────

  _buildPatchbaySVG() {
    const svg = this._container.querySelector('#rl-patchbay');
    this._pbSvg = svg;
    svg.innerHTML = '';

    // Background grid
    const defs = document.createElementNS(SVG_NS, 'defs');
    const pat  = document.createElementNS(SVG_NS, 'pattern');
    pat.setAttribute('id', 'pb-grid');
    pat.setAttribute('width', '20'); pat.setAttribute('height', '20');
    pat.setAttribute('patternUnits', 'userSpaceOnUse');
    const dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('cx','10'); dot.setAttribute('cy','10'); dot.setAttribute('r','0.8');
    dot.setAttribute('fill','rgba(100,160,220,0.18)');
    pat.appendChild(dot);
    defs.appendChild(pat);
    svg.appendChild(defs);

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('width', PB_W); bg.setAttribute('height', PB_H);
    bg.setAttribute('fill', 'url(#pb-grid)');
    svg.appendChild(bg);

    // Wire layer (wires drawn under nodes)
    this._wireLayer = document.createElementNS(SVG_NS, 'g');
    this._wireLayer.setAttribute('class', 'rl-cs-wire-layer');
    svg.appendChild(this._wireLayer);

    // Column headers
    // Left-align SENSOR VIEWS and right-align COLOR OUTPUTS so neither ever clips
    const hdrL = this._svgText(svg, 12,          22, 'SENSOR VIEWS',  'rl-cs-pb-colhdr');
    hdrL.setAttribute('text-anchor', 'start');
    const hdrR = this._svgText(svg, PB_W - 12,   22, 'COLOR OUTPUTS', 'rl-cs-pb-colhdr');
    hdrR.setAttribute('text-anchor', 'end');

    // Discovery hint — left-aligned so it never clips at the SVG edge
    const hint = this._svgText(svg, 12, 38,
      'each sees one color — which?', 'rl-cs-pb-hint');
    hint.setAttribute('text-anchor', 'start');
    hint.setAttribute('text-anchor', 'middle');

    // Draw sensor nodes
    for (const [id, pos] of Object.entries(SENSOR_NODES)) {
      this._drawSensorNode(svg, id, pos);
    }

    // Draw output nodes
    for (const [id, info] of Object.entries(OUTPUT_NODES)) {
      this._drawOutputNode(svg, id, info);
    }

    // Preview line (hidden until drag starts)
    this._previewLine = document.createElementNS(SVG_NS, 'line');
    this._previewLine.setAttribute('class', 'rl-cs-wire rl-cs-wire--preview');
    this._previewLine.setAttribute('visibility', 'hidden');
    svg.appendChild(this._previewLine);
  }

  _drawSensorNode(svg, id, pos) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'rl-cs-sensor-node');
    g.setAttribute('data-sensor', id);

    // ── Thumbnail (<image> element — avoids iOS Safari foreignObject bugs) ──
    // Placed to the LEFT of the terminal circle, centred vertically on pos.y.
    const thumbX = 12;
    const thumbY = pos.y - THUMB_H / 2;
    const imgEl = document.createElementNS(SVG_NS, 'image');
    imgEl.setAttribute('x',                   thumbX);
    imgEl.setAttribute('y',                   thumbY);
    imgEl.setAttribute('width',               THUMB_W);
    imgEl.setAttribute('height',              THUMB_H);
    imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    // Grey placeholder until thumbnails are generated
    imgEl.setAttribute('href', 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=');
    imgEl.style.borderRadius = '5px';
    this._thumbImgEls[id] = imgEl;
    g.appendChild(imgEl);

    // ── Sensor label — sits BELOW the thumbnail ───────────────────────────
    // Show "SENSOR A" on one line, "filter: ?" on the next as a clue prompt.
    const lbl = this._svgText(
      g,
      thumbX + THUMB_W / 2,
      thumbY + THUMB_H + 13,
      `SENSOR ${id}`,
      'rl-cs-pb-sensor-lbl',
    );
    lbl.setAttribute('text-anchor', 'middle');

    // "filter: ?" sub-label — helps children know they need to discover the filter
    const sub = this._svgText(
      g,
      thumbX + THUMB_W / 2,
      thumbY + THUMB_H + 26,
      'filter: ?',
      'rl-cs-pb-sensor-sublbl',
    );
    sub.setAttribute('text-anchor', 'middle');
    sub.setAttribute('data-sublbl', id);

    // ── Thin guide line from thumbnail right-edge to terminal ─────────────
    const guide = document.createElementNS(SVG_NS, 'line');
    guide.setAttribute('x1', thumbX + THUMB_W);  guide.setAttribute('y1', pos.y);
    guide.setAttribute('x2', pos.x - NODE_R);     guide.setAttribute('y2', pos.y);
    guide.setAttribute('class', 'rl-cs-guide-line');
    g.appendChild(guide);

    // ── Terminal circle (drag handle) ─────────────────────────────────────
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', pos.x);
    circle.setAttribute('cy', pos.y);
    circle.setAttribute('r',  NODE_R);
    circle.setAttribute('class', 'rl-cs-pb-terminal rl-cs-pb-terminal--sensor');
    circle.setAttribute('data-sensor', id);
    g.appendChild(circle);

    svg.appendChild(g);
  }

  _drawOutputNode(svg, id, info) {
    const g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'rl-cs-output-node');
    g.setAttribute('data-output', id);

    // Terminal circle (drop target)
    const circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', info.x);
    circle.setAttribute('cy', info.y);
    circle.setAttribute('r',  NODE_R);
    circle.setAttribute('class', 'rl-cs-pb-terminal rl-cs-pb-terminal--output');
    circle.setAttribute('data-output', id);
    circle.setAttribute('style', `stroke: ${info.color}`);
    g.appendChild(circle);

    // Label + tap-to-disconnect hint
    const lbl = this._svgText(g, info.x + 26, info.y - 2, info.label, 'rl-cs-pb-output-lbl');
    lbl.setAttribute('style', `fill: ${info.color}`);
    lbl.setAttribute('text-anchor', 'start');

    const tapHint = this._svgText(g, info.x + 26, info.y + 12, 'tap to disconnect', 'rl-cs-pb-taphint');
    tapHint.setAttribute('data-taphint', id);

    // Connected-sensor badge (appears when wired)
    const badge = document.createElementNS(SVG_NS, 'text');
    badge.setAttribute('x', info.x);
    badge.setAttribute('y', info.y + 5);
    badge.setAttribute('text-anchor', 'middle');
    badge.setAttribute('class', 'rl-cs-pb-badge');
    badge.setAttribute('data-badge', id);
    badge.setAttribute('visibility', 'hidden');
    g.appendChild(badge);

    svg.appendChild(g);
  }

  _svgText(parent, x, y, text, cls) {
    const t = document.createElementNS(SVG_NS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('class', cls);
    t.textContent = text;
    parent.appendChild(t);
    return t;
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _attachEvents() {
    const c = this._container;

    c.querySelector('#rl-back').addEventListener('click',
      () => this.sceneManager.go('hub'));
    c.querySelector('#rl-reset').addEventListener('click',
      () => this._reset());
    c.querySelector('#rl-hint').addEventListener('click',
      () => { c.querySelector('#rl-hint-panel').hidden = false; });
    c.querySelector('#rl-hint-close').addEventListener('click',
      () => { c.querySelector('#rl-hint-panel').hidden = true; });

    // Gain sliders
    for (const ch of ['R', 'G', 'B']) {
      const slider = c.querySelector(`#rl-gain-${ch}`);
      const valEl  = c.querySelector(`#rl-gain-val-${ch}`);
      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        this._engine.setGain(ch, v);
        valEl.textContent = v.toFixed(2);
        this._processAndDisplay();
        this._checkState();
      });
    }

    // Patchbay pointer events
    this._pbSvg.addEventListener('pointerdown', this._onPBPointerDown.bind(this));
    document.addEventListener('pointermove', this._boundPointerMove);
    document.addEventListener('pointerup',   this._boundPointerUp);
  }

  // ── Patchbay wire drag ────────────────────────────────────────────────────

  _svgPoint(clientX, clientY) {
    const rect  = this._pbSvg.getBoundingClientRect();
    const scaleX = PB_W / rect.width;
    const scaleY = PB_H / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top)  * scaleY,
    };
  }

  _nearestSensor(svgX, svgY) {
    for (const [id, pos] of Object.entries(SENSOR_NODES)) {
      const dx = svgX - pos.x, dy = svgY - pos.y;
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_R * 2) return id;
    }
    return null;
  }

  _nearestOutput(svgX, svgY) {
    for (const [id, info] of Object.entries(OUTPUT_NODES)) {
      const dx = svgX - info.x, dy = svgY - info.y;
      if (Math.sqrt(dx * dx + dy * dy) <= NODE_R * 2.5) return id;
    }
    return null;
  }

  _onPBPointerDown(e) {
    if (this._solved) return;
    const pt = this._svgPoint(e.clientX, e.clientY);

    // Tap/click on a connected OUTPUT terminal → disconnect that wire.
    // This is how the player removes a wrong connection.
    const outputHit = this._nearestOutput(pt.x, pt.y);
    if (outputHit) {
      if (this._engine.routing[outputHit]) {
        e.preventDefault();
        const disconnectedSensor = this._engine.routing[outputHit];
        this._engine.removeRoute(outputHit);
        // Reset that sensor's filter sub-label back to undiscovered state
        const sub = this._pbSvg.querySelector(`[data-sublbl="${disconnectedSensor}"]`);
        if (sub) { sub.textContent = 'filter: ?'; sub.removeAttribute('style'); }
        this._redrawWires();
        this._processAndDisplay();
        this._checkState();
      }
      return;
    }

    // Drag begins from a SENSOR terminal → draw a new wire.
    const sensor = this._nearestSensor(pt.x, pt.y);
    if (!sensor) return;

    e.preventDefault();
    this._dragFrom = sensor;
    this._pbRect   = this._pbSvg.getBoundingClientRect();

    const pos = SENSOR_NODES[sensor];
    this._previewLine.setAttribute('x1', pos.x);
    this._previewLine.setAttribute('y1', pos.y);
    this._previewLine.setAttribute('x2', pos.x);
    this._previewLine.setAttribute('y2', pos.y);
    this._previewLine.setAttribute('visibility', 'visible');
    this._pbSvg.setPointerCapture(e.pointerId);
  }

  _onPointerMove(e) {
    if (!this._dragFrom) return;
    const pt = this._svgPoint(e.clientX, e.clientY);
    this._previewLine.setAttribute('x2', pt.x);
    this._previewLine.setAttribute('y2', pt.y);
  }

  _onPointerUp(e) {
    if (!this._dragFrom) return;
    const pt     = this._svgPoint(e.clientX, e.clientY);
    const output = this._nearestOutput(pt.x, pt.y);

    this._previewLine.setAttribute('visibility', 'hidden');

    if (output) {
      this._engine.setRoute(output, this._dragFrom);
      this._redrawWires();
      this._processAndDisplay();
      this._updateThumbnails();
      this._checkState();
    }

    this._dragFrom = null;
  }

  // ── Wire rendering ────────────────────────────────────────────────────────

  _redrawWires() {
    // Clear existing player wires
    for (const line of Object.values(this._drawnWires)) line?.remove();
    this._drawnWires = {};

    for (const [outCh, sensorId] of Object.entries(this._engine.routing)) {
      if (!sensorId) continue;

      const from = SENSOR_NODES[sensorId];
      const to   = OUTPUT_NODES[outCh];
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);   line.setAttribute('y2', to.y);
      line.setAttribute('class', `rl-cs-wire rl-cs-wire--${outCh.toLowerCase()}`);
      this._wireLayer.appendChild(line);
      this._drawnWires[outCh] = line;

      // Show badge on output node
      const badge = this._pbSvg.querySelector(`[data-badge="${outCh}"]`);
      if (badge) {
        badge.textContent = sensorId;
        badge.setAttribute('visibility', 'visible');
      }
    }

    // Hide badges for unconnected outputs; toggle tap-hint visibility
    for (const [outCh, sensorId] of Object.entries(this._engine.routing)) {
      const badge   = this._pbSvg.querySelector(`[data-badge="${outCh}"]`);
      const tapHint = this._pbSvg.querySelector(`[data-taphint="${outCh}"]`);
      if (!sensorId) {
        if (badge)   badge.setAttribute('visibility', 'hidden');
        if (tapHint) tapHint.classList.remove('rl-cs-pb-taphint--active');
      } else {
        if (tapHint) tapHint.classList.add('rl-cs-pb-taphint--active');
      }
    }
  }

  // ── Image processing ──────────────────────────────────────────────────────

  _updateThumbnails() {
    if (!this._sourceCanvas) return;
    const srcCtx = this._sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, SCENE_W, SCENE_H);

    for (const id of ['A', 'B', 'C']) {
      const grey = this._engine.getSensorGreyscale(id, srcData);

      // Build greyscale at full resolution
      const full = document.createElement('canvas');
      full.width  = SCENE_W;
      full.height = SCENE_H;
      const fullCtx = full.getContext('2d');
      const tData   = fullCtx.createImageData(SCENE_W, SCENE_H);
      for (let i = 0; i < SCENE_W * SCENE_H; i++) {
        const v = grey[i];
        tData.data[i * 4]     = v;
        tData.data[i * 4 + 1] = v;
        tData.data[i * 4 + 2] = v;
        tData.data[i * 4 + 3] = 255;
      }
      fullCtx.putImageData(tData, 0, 0);

      // Scale down to thumbnail size
      const thumb = document.createElement('canvas');
      thumb.width  = THUMB_W;
      thumb.height = THUMB_H;
      thumb.getContext('2d').drawImage(full, 0, 0, THUMB_W, THUMB_H);

      // Update the SVG <image> element via data URL — works reliably on iOS Safari
      const imgEl = this._thumbImgEls[id];
      if (imgEl) imgEl.setAttribute('href', thumb.toDataURL('image/jpeg', 0.85));
    }
  }

  _processAndDisplay() {
    if (!this._sourceCanvas || !this._resultCanvas) return;

    const srcCtx = this._sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, SCENE_W, SCENE_H);

    const dstCtx  = this._resultCanvas.getContext('2d');
    const dstData = dstCtx.createImageData(SCENE_W, SCENE_H);

    this._engine.processImage(srcData, dstData);
    dstCtx.putImageData(dstData, 0, 0);
  }

  // ── State machine ─────────────────────────────────────────────────────────

  _checkState() {
    const state = this._engine.getOutputState();

    // Update speech bubble
    const speechEl = this._container?.querySelector('#rl-speech');
    if (speechEl) speechEl.textContent = CHAPTER_3.speech[state] ?? CHAPTER_3.speech.none;

    // Update SWIRL-E portrait
    const portraitEl = this._container?.querySelector('#rl-swirle-portrait');
    if (portraitEl) {
      portraitEl.src = (state === 'complete')
        ? 'games/robot-lab/assets/images/swirle-powered.png'
        : 'games/robot-lab/assets/images/swirle-unpowered.png';
    }

    // Once routing is correct, reveal each sensor's discovered filter colour.
    if (this._engine.isRoutingCorrect()) {
      for (const [sensorId, filterCh] of Object.entries(this._engine.sensorFilter)) {
        const sub = this._pbSvg?.querySelector(`[data-sublbl="${sensorId}"]`);
        if (sub) {
          sub.textContent = `filter: ${filterCh}`;
          const color = filterCh === 'R' ? '#FF6666' : filterCh === 'G' ? '#66EE66' : '#88AAFF';
          sub.setAttribute('style', `fill: ${color}`);
        }
      }
    }

    if (state === 'complete' && !this._solved) {
      this._doSuccess();
    }
  }

  // ── Success ───────────────────────────────────────────────────────────────

  _doSuccess() {
    this._solved = true;
    this._completedChapters.add(CHAPTER_3.id);

    const swirleEl = this._container?.querySelector('#rl-swirle');
    if (swirleEl) {
      swirleEl.classList.add('rl-swirle--celebrating');
      setTimeout(() => swirleEl.classList.remove('rl-swirle--celebrating'), 2000);
    }

    celebrate('large', {
      duration: 2500,
      onComplete: async () => {
        const progress = await this.storage.get('progress', { completedChapters: [] });
        if (!progress.completedChapters.includes(CHAPTER_3.id)) {
          progress.completedChapters.push(CHAPTER_3.id);
        }
        await this.storage.set('progress', progress);
      },
    });

    this._showNextChapterButton();
    setTimeout(() => this._showOutcomeSummary(), 3000);
  }

  // ── Outcome summary ───────────────────────────────────────────────────────

  _showOutcomeSummary() {
    if (!this._container) return;

    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === CHAPTER_3.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;
    const chaptersHTML = ROBOT_LAB_CHAPTERS.map((ch, i) => {
      const done = this._completedChapters.has(ch.id);
      return `<li class="rl-chapter-item ${done ? 'rl-chapter-item--done' : ''}">
        <span class="rl-chapter-check">${done ? '✓' : ''}</span>
        <span class="rl-chapter-label">${i + 1}. ${ch.label}</span>
      </li>`;
    }).join('');

    const avatarMeta = this._avatarId ? AVATAR_META[this._avatarId] : null;
    const avatarImg  = this._avatarId ? AVATAR_IMAGES[this._avatarId] : null;
    const kidName    = avatarMeta?.displayName ?? 'FRIEND';
    const kidColor   = avatarMeta?.color ?? '#D4A959';

    const overlayEl = document.createElement('div');
    overlayEl.className = 'rl-briefing rl-outcome-summary';
    overlayEl.dataset.type = 'success';

    overlayEl.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge rl-briefing__badge--success">✓ Mission Complete</span>
          <h2 class="rl-briefing__title rl-briefing__title--success">SWIRL-E Can See in Color!</h2>
        </div>
        <div class="rl-success-body">

          <!-- Column 1: SWIRL-E portrait + speech -->
          <div class="rl-success-robot-col">
            <div class="rl-briefing__portrait">
              <img src="games/robot-lab/assets/images/swirle-powered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-swirle-greeting">HELLO ${kidName.toUpperCase()}.<br>I CAN SEE YOUR TRUE COLORS!</p>
          </div>

          <!-- Column 2: What was learned -->
          <div class="rl-success-mid">
            <div class="rl-success-explain">
              <p>Each sensor only sees one color of light through its filter. Together, they see everything.</p>
              <p>Your eye works the same way — three types of cone cells, one for red, one for green, one for blue.</p>
              <div class="rl-math rl-math--good">
                <span class="rl-cs-math-row">
                  <span class="rl-cs-channel rl-cs-channel--r">R</span> +
                  <span class="rl-cs-channel rl-cs-channel--g">G</span> +
                  <span class="rl-cs-channel rl-cs-channel--b">B</span>
                  = Full Color
                  <span class="rl-math__badge rl-math__badge--ok">✓</span>
                </span>
              </div>
            </div>
          </div>

          <!-- Column 3: Kid avatar + chapter checklist -->
          <div class="rl-success-right">
            ${avatarImg ? `
              <div class="rl-success-kid-wrap" style="border-color:${kidColor}">
                <img src="${avatarImg}" alt="${kidName}" class="rl-success-kid-img">
              </div>` : ''}
            <p class="rl-systems-title">SWIRL-E SYSTEMS</p>
            <ol class="rl-chapter-list">${chaptersHTML}</ol>
          </div>

        </div>
        <div class="rl-outcome__btns">
          <button type="button" class="rl-btn rl-btn--reset" id="rl-oc-reset">🔄 Try Again</button>
          ${nextChapter ? `<button type="button" class="rl-btn rl-btn--next-chapter" id="rl-oc-next">Next Chapter →</button>` : ''}
          <button type="button" class="rl-btn rl-outcome__close-btn" id="rl-oc-close">Close</button>
        </div>
      </div>
    `;

    const dismiss = (fn) => {
      overlayEl.classList.add('rl-briefing--hiding');
      setTimeout(() => { overlayEl.remove(); fn?.(); }, 380);
    };

    overlayEl.querySelector('#rl-oc-close')?.addEventListener('click', () => dismiss());
    overlayEl.querySelector('#rl-oc-reset')?.addEventListener('click',
      () => dismiss(() => this._reset()));
    if (nextChapter) {
      overlayEl.querySelector('#rl-oc-next')?.addEventListener('click', () => {
        const route = CHAPTER_SCENES[nextChapter.id]
          ?? { scene: 'robot-lab-circuit', missionId: nextChapter.id };
        dismiss(() => this.sceneManager.go(route.scene,
          { ...(route.missionId ? { missionId: route.missionId } : {}), avatarId: this._avatarId }));
      });
    }

    this._container.appendChild(overlayEl);
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  _reset() {
    this._solved = false;
    this._engine = new ColorSensorEngine();

    // Clear wires
    for (const line of Object.values(this._drawnWires)) line?.remove();
    this._drawnWires = {};
    for (const badge of this._pbSvg.querySelectorAll('[data-badge]')) {
      badge.setAttribute('visibility', 'hidden');
    }

    // Reset filter sub-labels back to "filter: ?" (undiscovered state)
    for (const sub of this._pbSvg.querySelectorAll('[data-sublbl]')) {
      sub.textContent = 'filter: ?';
      sub.removeAttribute('style');
    }

    // Reset sliders
    for (const ch of ['R', 'G', 'B']) {
      const slider = this._container.querySelector(`#rl-gain-${ch}`);
      const valEl  = this._container.querySelector(`#rl-gain-val-${ch}`);
      if (slider) slider.value = '1';
      if (valEl)  valEl.textContent = '1.00';
    }

    // Reset portrait + speech
    const portraitEl = this._container?.querySelector('#rl-swirle-portrait');
    if (portraitEl) portraitEl.src = 'games/robot-lab/assets/images/swirle-unpowered.png';
    const speechEl = this._container?.querySelector('#rl-speech');
    if (speechEl) speechEl.textContent = CHAPTER_3.speech.none;

    // Clear actions
    const actionsEl = this._container?.querySelector('#rl-actions');
    if (actionsEl) actionsEl.innerHTML = '';

    this._updateThumbnails();
    this._processAndDisplay();
  }

  // ── Briefing overlay ──────────────────────────────────────────────────────

  _showBriefing() {
    const m          = CHAPTER_3;
    const kidMeta    = this._avatarId ? AVATAR_META[this._avatarId] : null;
    const kidName    = kidMeta?.displayName ?? '';
    const personalMsg = kidName
      ? `${kidName}, my colors are completely scrambled. Can you fix them?`
      : 'My colors are completely scrambled. Can you fix them?';

    const el = document.createElement('div');
    el.className = 'rl-briefing';
    el.innerHTML = `
      <div class="rl-briefing__card">
        <div class="rl-briefing__header">
          <span class="rl-briefing__badge">Ch&nbsp;${m.chapterNumber}</span>
          <h2 class="rl-briefing__title">
            <span class="rl-label-prefix">Mission:</span> ${m.title}
          </h2>
        </div>
        <div class="rl-briefing__body">
          <div class="rl-briefing__robot-col">
            <div class="rl-briefing__portrait">
              <img src="games/robot-lab/assets/images/swirle-unpowered.png"
                   alt="SWIRL-E" class="rl-briefing__portrait-img">
            </div>
            <p class="rl-briefing__robot-name">SWIRL-E</p>
            <p class="rl-briefing__robot-personal">${personalMsg}</p>
          </div>
          <div class="rl-briefing__panel">
            <div class="rl-briefing__text">
              ${m.problem.map(l => `<p>${l}</p>`).join('')}
            </div>
          </div>
        </div>
        <button type="button" class="rl-btn rl-btn--start rl-briefing__go-btn" id="rl-briefing-go">
          Fix the Colors! <span class="rl-btn__icon-badge">🎨</span>
        </button>
      </div>
    `;

    el.querySelector('#rl-briefing-go').addEventListener('click', () => {
      el.classList.add('rl-briefing--hiding');
      setTimeout(() => el.remove(), 380);
    });

    this._container.appendChild(el);
  }

  // ── UI helpers ────────────────────────────────────────────────────────────

  _showNextChapterButton() {
    const actionsEl = this._container?.querySelector('#rl-actions');
    if (!actionsEl) return;
    const currentIdx  = ROBOT_LAB_CHAPTERS.findIndex(ch => ch.id === CHAPTER_3.id);
    const nextChapter = ROBOT_LAB_CHAPTERS[currentIdx + 1] ?? null;
    if (!nextChapter) return;

    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'rl-btn rl-btn--next-chapter';
    btn.textContent = 'Next Chapter →';
    btn.addEventListener('click', () => {
      const route = CHAPTER_SCENES[nextChapter.id]
        ?? { scene: 'robot-lab-circuit', missionId: nextChapter.id };
      this.sceneManager.go(route.scene,
        { ...(route.missionId ? { missionId: route.missionId } : {}), avatarId: this._avatarId });
    });
    actionsEl.appendChild(btn);
  }
}
