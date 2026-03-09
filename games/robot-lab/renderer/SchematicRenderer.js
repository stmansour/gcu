/**
 * SchematicRenderer (v3 — PNG assets)
 *
 * Renders the circuit schematic by placing PNG component images inside an SVG.
 * The eye module is kept as SVG (it animates: glow on success, fry on explosion).
 *
 * Placement formula for a PNG image given two SVG target points (svgA, svgB)
 * and the image's terminal pixel positions (termA, termB):
 *
 *   axis = 'v'  →  pixSpan = termB.y − termA.y,  svgSpan = svgB.y − svgA.y
 *   axis = 'h'  →  pixSpan = termB.x − termA.x,  svgSpan = svgB.x − svgA.x
 *   scale  = svgSpan / pixSpan
 *   imgX   = svgA.x − termA.x * scale
 *   imgY   = svgA.y − termA.y * scale
 *   imgW   = meta.width  * scale
 *   imgH   = meta.height * scale
 *
 * Layer order (bottom → top):
 *   grid → components → guides → nodes → player → particles → hits
 */

import { COMPONENTS, COMPONENTS_BASE_URL } from '../../../assets/components/index.js';

const SVG_NS   = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// ── SVG helpers ───────────────────────────────────────────────────────────────

function el(tag, attrs = {}, children = []) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'href') {
      e.setAttribute('href', v);
      e.setAttributeNS(XLINK_NS, 'xlink:href', v); // Safari / older WKWebView compat
    } else {
      e.setAttribute(k, v);
    }
  }
  for (const c of children) e.appendChild(c);
  return e;
}
function g(attrs = {})   { return el('g', attrs); }
function txt(str)        { return document.createTextNode(str); }

// ── Image placement ───────────────────────────────────────────────────────────

/**
 * Compute the SVG x/y/width/height needed to place a PNG so that its
 * terminal pixels land on the given SVG coordinates.
 *
 * @param {object} meta   — entry from COMPONENTS (width, height, termA, termB)
 * @param {{x,y}} svgA    — where termA should land
 * @param {{x,y}} svgB    — where termB should land
 * @param {'v'|'h'} axis
 * @returns {{x, y, w, h, scale}}
 */
function computeImageRect(meta, svgA, svgB, axis) {
  const pixSpan = axis === 'v'
    ? meta.termB.y - meta.termA.y
    : meta.termB.x - meta.termA.x;
  const svgSpan = axis === 'v'
    ? svgB.y - svgA.y
    : svgB.x - svgA.x;
  const scale = svgSpan / pixSpan;
  return {
    x:     svgA.x - meta.termA.x * scale,
    y:     svgA.y - meta.termA.y * scale,
    w:     meta.width  * scale,
    h:     meta.height * scale,
    scale,
  };
}

// ── SchematicRenderer ─────────────────────────────────────────────────────────

export class SchematicRenderer {
  constructor(svgEl) {
    this._svg          = svgEl;
    this._layers       = {};
    this._terminals    = new Map();   // termId → {x, y, visEl, hitEl}
    this._passiveComps = new Map();   // compId → {compType, overlayG}
    this._playerWires  = new Map();   // wid    → SVGElement
    this._nextWireId   = 0;
    this._previewLine  = null;
    this._previewFrom  = null;
    this._eyeCenters   = [];          // [{x, y, eid, pupilId, hlId}] for animation
    this._eyeAnimRaf   = null;
    this._lastBlink    = -1;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Render the full schematic. Clears and rebuilds from scratch.
   * @param {object} layout          — chapter.layout
   * @param {Array}  slotAssignments — [{type,label,sublabel,color}, ...]
   * @returns {Map<string,{x,y}>}    — terminal SVG positions for hit-testing
   */
  render(layout, slotAssignments) {
    this._svg.innerHTML = '';
    this._terminals.clear();
    this._passiveComps.clear();
    this._playerWires.clear();
    this._previewLine = null;

    this._svg.setAttribute('viewBox', layout.viewBox);
    this._svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    for (const name of ['grid','components','guides','nodes','player','particles','hits']) {
      const grp = g({ class: `rl-layer-${name}` });
      this._svg.appendChild(grp);
      this._layers[name] = grp;
    }

    this._drawGrid(layout.viewBox);
    this._drawEyeModule(layout.eyeModule);
    this._drawBattery(layout.battery);
    this._drawRailGuides(layout.railGuides);

    for (let i = 0; i < layout.componentSlots.length; i++) {
      this._drawPassiveComponent(layout.componentSlots[i], slotAssignments[i], i);
    }

    this._drawAllOpenTerminals(layout);
    return this.getTerminalPositions();
  }

  getTerminalPositions() {
    const out = new Map();
    for (const [id, d] of this._terminals) out.set(id, { x: d.x, y: d.y });
    return out;
  }

  /** Convert screen px → SVG units using the current CTM. */
  screenToSVG(sx, sy) {
    const pt = this._svg.createSVGPoint();
    pt.x = sx; pt.y = sy;
    return pt.matrixTransform(this._svg.getScreenCTM().inverse());
  }

  /** Convert SVG user-space coordinates → screen (CSS pixel) coordinates. */
  svgToScreen(svgX, svgY) {
    const pt = this._svg.createSVGPoint();
    pt.x = svgX; pt.y = svgY;
    return pt.matrixTransform(this._svg.getScreenCTM());
  }

  // ── Player wire API ─────────────────────────────────────────────────────────

  addPlayerWire(fromId, toId, cssClass = 'rl-wire--player') {
    const from = this._terminals.get(fromId);
    const to   = this._terminals.get(toId);
    if (!from || !to) return null;
    const poly = el('polyline', {
      points: this._elbowPoints(from, to).map(p => `${p.x},${p.y}`).join(' '),
      class:  `rl-wire ${cssClass}`,
    });
    this._layers.player.appendChild(poly);
    const wid = `pw${this._nextWireId++}`;
    this._playerWires.set(wid, poly);
    return wid;
  }

  /**
   * Compute an L-shaped path between two points.
   * The horizontal segment runs at the level of whichever endpoint has the
   * smaller y (i.e. the "rail" level), then drops vertically to the other.
   * If x or y are equal, returns a straight two-point path.
   */
  _elbowPoints(from, to) {
    if (from.x === to.x || from.y === to.y) return [from, to];
    // Elbow is always at the rail (smaller-y) level, at the column (larger-x) position.
    const corner = from.y < to.y
      ? { x: to.x,   y: from.y }  // from is on the rail → go horizontal first, then down
      : { x: from.x, y: to.y   }; // to is on the rail   → go vertical first, then horizontal
    return [from, corner, to];
  }

  removePlayerWire(wid) {
    const e = this._playerWires.get(wid);
    if (e) { e.remove(); this._playerWires.delete(wid); }
  }

  clearPlayerWires() {
    for (const e of this._playerWires.values()) e.remove();
    this._playerWires.clear();
  }

  // ── State changes ───────────────────────────────────────────────────────────

  setPowered(powered) {
    for (const line of this._playerWires.values()) {
      line.classList.toggle('rl-wire--powered', powered);
      if (powered) line.classList.remove('rl-wire--wrong');
    }
  }

  setWiresWrong() {
    for (const line of this._playerWires.values()) {
      line.classList.add('rl-wire--wrong');
      line.classList.remove('rl-wire--player', 'rl-wire--powered');
    }
  }

  setCapacitorCharge(passiveId, charge) {
    const data = this._passiveComps.get(passiveId);
    if (!data || data.compType !== 'capacitor') return;
    const fill = data.overlayG.querySelector('.rl-cap-charge');
    const pct  = data.overlayG.querySelector('.rl-cap-pct');
    if (fill) fill.style.opacity = charge;
    if (pct)  {
      pct.textContent    = `${Math.round(charge * 100)}%`;
      pct.style.opacity  = Math.min(1, charge * 2);
    }
  }

  setInductorField(passiveId, intensity) {
    const data = this._passiveComps.get(passiveId);
    if (!data || data.compType !== 'inductor') return;
    data.overlayG.querySelectorAll('.rl-ind-field').forEach((r, i, all) => {
      const threshold = i / all.length;
      r.style.opacity = intensity > threshold
        ? Math.min(1, (intensity - threshold) * 2.5)
        : 0;
    });
  }

  setTerminalConnected(termId, connected) {
    const d = this._terminals.get(termId);
    if (d) d.visEl.classList.toggle('rl-open-terminal--connected', connected);
  }

  setEyesPowered(powered) {
    for (const id of ['schema-eye-l','schema-eye-r']) {
      this._svg.getElementById(id)?.classList.toggle('rl-eyemod__iris--on', powered);
    }
    if (powered) this.startEyeAnimation();
    else         this.stopEyeAnimation();
  }

  setEyesFried() {
    this.stopEyeAnimation();
    for (const id of ['schema-eye-l','schema-eye-r']) {
      const e = this._svg.getElementById(id);
      if (e) {
        e.classList.add('rl-eyemod__iris--fried');
        e.classList.remove('rl-eyemod__iris--on');
      }
    }
  }

  /**
   * Start the powered-eye animation: pupils wander in a smooth Lissajous pattern
   * and the irises blink every ~4 seconds.
   */
  startEyeAnimation() {
    if (this._eyeAnimRaf) return;
    const TRAVEL = 8;        // max pupil displacement (SVG units)
    const BLINK_PERIOD = 4;  // seconds between blinks
    this._lastBlink = -1;
    const start = performance.now();

    const tick = (now) => {
      const t  = (now - start) / 1000;
      const dx = TRAVEL * Math.sin(t * 0.71) * Math.cos(t * 0.29);
      const dy = TRAVEL * 0.6 * Math.sin(t * 0.53 + 1.2);

      for (const { x, y, pupilId, hlId } of this._eyeCenters) {
        const pupil = this._svg.getElementById(pupilId);
        const hl    = this._svg.getElementById(hlId);
        if (pupil) {
          pupil.setAttribute('cx', (x + dx).toFixed(1));
          pupil.setAttribute('cy', (y + dy).toFixed(1));
        }
        if (hl) {
          hl.setAttribute('cx', (x + dx - 5).toFixed(1));
          hl.setAttribute('cy', (y + dy - 5).toFixed(1));
        }
      }

      // Blink every BLINK_PERIOD seconds
      const blinkIdx = Math.floor(t / BLINK_PERIOD);
      if (blinkIdx !== this._lastBlink) {
        this._lastBlink = blinkIdx;
        for (const { eid } of this._eyeCenters) {
          const iris = this._svg.getElementById(eid);
          if (iris) {
            iris.classList.add('rl-eyemod__iris--blinking');
            setTimeout(() => iris?.classList.remove('rl-eyemod__iris--blinking'), 280);
          }
        }
      }

      this._eyeAnimRaf = requestAnimationFrame(tick);
    };
    this._eyeAnimRaf = requestAnimationFrame(tick);
  }

  /** Stop the eye animation and reset pupils to centre. */
  stopEyeAnimation() {
    if (this._eyeAnimRaf) {
      cancelAnimationFrame(this._eyeAnimRaf);
      this._eyeAnimRaf = null;
    }
    for (const { x, y, pupilId, hlId } of this._eyeCenters) {
      const pupil = this._svg.getElementById(pupilId);
      const hl    = this._svg.getElementById(hlId);
      if (pupil) { pupil.setAttribute('cx', x); pupil.setAttribute('cy', y); }
      if (hl)    { hl.setAttribute('cx', x - 5); hl.setAttribute('cy', y - 5); }
    }
  }

  /**
   * Animate acrid smoke rising from the top of the eye module box.
   * @param {{ x, y, w, h }} eyeBox  — SVG coordinate box (from layout.eyeModule.box)
   */
  showEyeSmoke(eyeBox) {
    const { x, y, w } = eyeBox;
    const centerX = x + w / 2;
    const topY    = y + 5; // slightly inside the top edge

    // Smoke puff definitions: horizontal offset, start delay (ms), radius
    const puffs = [
      { dx: -38, delay:   0, r: 13 },
      { dx:   8, delay: 140, r: 17 },
      { dx:  42, delay:  55, r: 11 },
      { dx: -12, delay: 270, r: 19 },
      { dx:  60, delay: 210, r: 10 },
      { dx: -58, delay: 340, r: 12 },
      { dx:  24, delay: 420, r: 15 },
      { dx: -28, delay: 520, r: 14 },
    ];

    const DURATION = 2000; // ms per puff

    const wrapperG = el('g', {});
    this._svg.appendChild(wrapperG);

    // Pre-compute a fixed lateral drift per puff (avoids random jitter each frame)
    const items = puffs.map(({ dx, delay, r }) => {
      const puffG  = el('g', {});
      const circle = el('circle', { cx: 0, cy: 0, r, class: 'rl-eye-smoke' });
      puffG.appendChild(circle);
      wrapperG.appendChild(puffG);
      const drift = (Math.random() - 0.5) * 36; // lateral drift over full animation
      return { puffG, delay, cx: centerX + dx, drift };
    });

    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      let anyActive = false;

      for (const { puffG, delay, cx, drift } of items) {
        const t = (elapsed - delay) / DURATION;
        if (t <= 0) {
          // Not started yet — park off-screen
          puffG.setAttribute('transform', `translate(${cx},${topY}) scale(0.01)`);
          anyActive = true;
          continue;
        }
        if (t >= 1) continue; // finished — leave invisible

        anyActive = true;
        const ease   = Math.pow(t, 0.6);        // ease-out rise
        const opacity = 0.72 * (1 - Math.pow(t, 0.55));
        const yOff   = -115 * ease;             // rise 115 SVG units
        const tx     = drift * ease;            // gentle lateral drift
        const scale  = 0.3 + 2.2 * t;

        puffG.style.opacity = opacity;
        puffG.setAttribute('transform',
          `translate(${(cx + tx).toFixed(1)}, ${(topY + yOff).toFixed(1)}) scale(${scale.toFixed(2)})`);
      }

      if (anyActive) {
        requestAnimationFrame(tick);
      } else {
        wrapperG.remove();
      }
    };

    requestAnimationFrame(tick);
  }

  // ── Preview wire ────────────────────────────────────────────────────────────

  startPreview(termId) {
    this.clearPreview();
    const t = this._terminals.get(termId);
    if (!t) return;
    this._previewFrom = { x: t.x, y: t.y };
    this._previewLine = el('polyline', {
      points: `${t.x},${t.y}`,
      class:  'rl-wire rl-wire--preview',
    });
    this._layers.player.appendChild(this._previewLine);
  }

  updatePreview(svgX, svgY) {
    if (this._previewLine && this._previewFrom) {
      const pts = this._elbowPoints(this._previewFrom, { x: svgX, y: svgY });
      this._previewLine.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    }
  }

  clearPreview() {
    if (this._previewLine) { this._previewLine.remove(); this._previewLine = null; }
    this._previewFrom = null;
  }

  getParticleLayer() { return this._layers.particles; }

  // ── Private: Drawing ────────────────────────────────────────────────────────

  _drawGrid(viewBox) {
    const [,, vw, vh] = viewBox.split(' ').map(Number);
    for (let x = 0; x <= vw; x += 30) {
      this._layers.grid.appendChild(
        el('line', { x1: x, y1: 0, x2: x, y2: vh, class: 'rl-grid-line' })
      );
    }
    for (let y = 0; y <= vh; y += 30) {
      this._layers.grid.appendChild(
        el('line', { x1: 0, y1: y, x2: vw, y2: y, class: 'rl-grid-line' })
      );
    }
  }

  _drawEyeModule(em) {
    const compG  = this._layers.components;
    const { box } = em;
    const boxCx  = box.x + box.w / 2;
    const boxCy  = box.y + box.h / 2;

    // ── Clip path (applied to VPA image so it's bounded by the box) ───────
    const clipId = 'rl-eyemod-clip';
    let defsEl = this._svg.querySelector('defs');
    if (!defsEl) {
      defsEl = document.createElementNS(SVG_NS, 'defs');
      this._svg.insertBefore(defsEl, this._svg.firstChild);
    }
    const cp = el('clipPath', { id: clipId });
    cp.appendChild(el('rect', { x: box.x, y: box.y, width: box.w, height: box.h, rx: 8 }));
    defsEl.appendChild(cp);

    // Box
    compG.appendChild(el('rect', {
      x: box.x, y: box.y, width: box.w, height: box.h, rx: 8,
      class: 'rl-comp-box rl-comp-box--eye',
    }));

    // VPA circuit board image — washed out, clipped to box
    compG.appendChild(el('image', {
      href:                'games/robot-lab/assets/images/swirle-vpa.png',
      x:                   box.x,
      y:                   box.y,
      width:               box.w,
      height:              box.h,
      preserveAspectRatio: 'xMidYMid slice',
      'clip-path':         `url(#${clipId})`,
      class:               'rl-eyemod__vpa',
    }));

    // Wire stubs from terminal circles to box edges
    compG.appendChild(el('line', {
      x1: em.plus.x + 6, y1: em.plus.y, x2: box.x, y2: em.plus.y,
      class: 'rl-comp-lead',
    }));
    compG.appendChild(el('line', {
      x1: box.x + box.w, y1: em.minus.y, x2: em.minus.x - 6, y2: em.minus.y,
      class: 'rl-comp-lead',
    }));

    // Eyes — pupils and highlights get IDs so the animation can move them
    const eyeY   = boxCy + 6;
    const eyeGap = 32;
    const eyeR   = 20;
    this._eyeCenters = [];
    for (const [ex, eid, pupilId, hlId] of [
      [boxCx - eyeGap / 2, 'schema-eye-l', 'schema-pupil-l', 'schema-hl-l'],
      [boxCx + eyeGap / 2, 'schema-eye-r', 'schema-pupil-r', 'schema-hl-r'],
    ]) {
      compG.appendChild(el('circle', { cx: ex, cy: eyeY, r: eyeR, class: 'rl-eyemod__iris', id: eid }));
      compG.appendChild(el('circle', { cx: ex, cy: eyeY, r: 8,    class: 'rl-eyemod__pupil',    id: pupilId }));
      compG.appendChild(el('circle', { cx: ex - 5, cy: eyeY - 5, r: 4, class: 'rl-eyemod__highlight', id: hlId }));
      this._eyeCenters.push({ x: ex, y: eyeY, eid, pupilId, hlId });
    }

    // Labels
    compG.appendChild(el('text', {
      x: boxCx, y: box.y - 8, class: 'rl-comp-label rl-comp-label--box',
    }, [txt('SWIRL-E EYE MODULE')]));
    compG.appendChild(el('text', {
      x: em.plus.x + 13, y: em.plus.y - 10, class: 'rl-term-sign rl-term-sign--pos',
    }, [txt('+')]));
    compG.appendChild(el('text', {
      x: em.minus.x - 13, y: em.minus.y - 10, class: 'rl-term-sign rl-term-sign--neg',
    }, [txt('−')]));
  }

  _drawBattery(bat) {
    const meta  = COMPONENTS.battery_h;
    const svgA  = { x: bat.plus.x,  y: bat.plus.y  };
    const svgB  = { x: bat.minus.x, y: bat.minus.y };
    const rect  = computeImageRect(meta, svgA, svgB, 'h');

    this._layers.components.appendChild(el('image', {
      href:   `${COMPONENTS_BASE_URL}battery_h.png`,
      x:      rect.x,
      y:      rect.y,
      width:  rect.w,
      height: rect.h,
      class:  'rl-comp-image',
    }));

    // Voltage label — centred below the image
    this._layers.components.appendChild(el('text', {
      x:     (bat.plus.x + bat.minus.x) / 2,
      y:     rect.y + rect.h + 18,
      class: 'rl-comp-label rl-comp-label--value',
    }, [txt(bat.label)]));

  }

  _drawRailGuides(guides) {
    for (const guide of guides) {
      this._layers.guides.appendChild(el('line', {
        x1: guide.x1, y1: guide.y, x2: guide.x2, y2: guide.y,
        class: guide.dashed ? 'rl-rail-guide' : 'rl-bus-line',
      }));
    }
  }

  _drawPassiveComponent(slot, assignment, index) {
    const { cx, topY, bottomY, railTopY, railBottomY } = slot;
    const { type, label, sublabel, color } = assignment;
    const compId  = `passive-${index}`;
    const metaKey = `${type}_v`;
    const meta    = COMPONENTS[metaKey];
    if (!meta) {
      console.error('SchematicRenderer: unknown component type', type);
      return;
    }

    // Bottom stub only — connects the pre-drawn bottom bus to passive-X:b.
    // Top stubs are NOT pre-drawn; the player draws from eye:minus to passive-X:a.
    if (railBottomY != null && railBottomY !== bottomY) {
      this._layers.components.appendChild(el('line', {
        x1: cx, y1: bottomY, x2: cx, y2: railBottomY, class: 'rl-bus-line',
      }));
    }

    const rect = computeImageRect(
      meta,
      { x: cx, y: topY },
      { x: cx, y: bottomY },
      'v'
    );

    // PNG image
    this._layers.components.appendChild(el('image', {
      href:   `${COMPONENTS_BASE_URL}${metaKey}.png`,
      x:      rect.x,
      y:      rect.y,
      width:  rect.w,
      height: rect.h,
      class:  'rl-comp-image',
    }));

    // Value + type labels — to the right of the image, left-justified
    const labelX = rect.x + rect.w + 8;
    const midY   = (topY + bottomY) / 2;
    this._layers.components.appendChild(el('text', {
      x: labelX, y: midY - 8,
      class: 'rl-comp-label rl-comp-label--value rl-comp-label--aside',
      style: `fill:${color}`,
    }, [txt(label)]));
    this._layers.components.appendChild(el('text', {
      x: labelX, y: midY + 12,
      class: 'rl-comp-label rl-comp-label--type rl-comp-label--aside',
    }, [txt(sublabel)]));

    // Overlay group for animated state (capacitor charge, inductor field)
    const overlayG = g({ class: `rl-passive-overlay rl-passive-overlay--${type}`, id: `overlay-${compId}` });
    this._layers.components.appendChild(overlayG);
    this._addPassiveOverlays(overlayG, type, cx, topY, bottomY, labelX);

    this._passiveComps.set(compId, { compType: type, overlayG });
  }

  _addPassiveOverlays(parent, type, cx, topY, bottomY, labelX = 0) {
    const midY = (topY + bottomY) / 2;

    if (type === 'capacitor') {
      // Blue fill indicator between the plates
      parent.appendChild(el('rect', {
        x: cx - 25, y: midY - 12,
        width: 50,  height: 24,
        class: 'rl-cap-charge',
        style: 'opacity:0',
      }));
      // Charge percentage — to the right of the component, below the type label
      parent.appendChild(el('text', {
        x: labelX, y: midY + 32,
        class: 'rl-cap-pct',
        style: 'opacity:0',
      }, [txt('0%')]));

    } else if (type === 'inductor') {
      // Expanding magnetic field ellipses — tall vertical ovals around a vertical solenoid.
      // rx (horizontal) stays narrow; ry (vertical) grows large as the field builds.
      for (let i = 1; i <= 6; i++) {
        parent.appendChild(el('ellipse', {
          cx, cy: midY,
          rx: 25 + i * 15,   // 40 → 115  (narrow horizontal spread)
          ry: 45 + i * 20,   // 65 → 165  (tall vertical extent)
          class: 'rl-ind-field',
          style: 'opacity:0',
        }));
      }
    }
  }

  _drawAllOpenTerminals(layout) {
    // Open terminals — player draws wires to/from all four of these
    this._registerOpenTerminal(layout.eyeModule.plus.id,  layout.eyeModule.plus.x,  layout.eyeModule.plus.y);
    this._registerOpenTerminal(layout.eyeModule.minus.id, layout.eyeModule.minus.x, layout.eyeModule.minus.y);
    this._registerOpenTerminal(layout.battery.plus.id,    layout.battery.plus.x,    layout.battery.plus.y);
    this._registerOpenTerminal(layout.battery.minus.id,   layout.battery.minus.x,   layout.battery.minus.y);

    for (const slot of layout.componentSlots) {
      // Top terminal — open circle (player connects eye:minus here)
      this._registerOpenTerminal(slot.topTermId, slot.cx, slot.topY);
      // Bottom terminal — junction dot (pre-connected to bottom bus)
      this._drawJunctionDot(slot.cx, slot.bottomY);
    }
  }

  _drawJunctionDot(x, y) {
    this._layers.nodes.appendChild(el('circle', {
      cx: x, cy: y, r: 6,
      class: 'rl-junction-dot',
    }));
  }

  _registerOpenTerminal(termId, x, y) {
    const visCircle = el('circle', {
      cx: x, cy: y, r: 7,
      class: 'rl-open-terminal',
      id: `term-vis-${termId}`,
    });
    this._layers.nodes.appendChild(visCircle);

    const hitCircle = el('circle', {
      cx: x, cy: y, r: 28,
      class: 'rl-terminal-hit',
      'data-term': termId,
      id: `term-hit-${termId}`,
    });
    this._layers.hits.appendChild(hitCircle);

    this._terminals.set(termId, { x, y, visEl: visCircle, hitEl: hitCircle });
  }
}
