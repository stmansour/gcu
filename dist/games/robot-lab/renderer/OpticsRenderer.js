/**
 * OpticsRenderer — SVG ray-diagram and optics visualizer for Chapter 2.
 *
 * Layers (bottom → top):
 *   bg      — static: tube housing, axis, slot outlines, avatar subject
 *   rays    — dynamic: ray polylines
 *   lens    — dynamic: lens cross-section shapes
 *   markers — dynamic: focal points, image markers
 *   feed    — SVG image at sensor (appended last so it's above all layers)
 *
 * Usage:
 *   renderer.render(layout, avatarSrc);                          // once at init
 *   renderer.update(state, f1, f2, lensPool, slots, engine, avatarSrc);  // per change
 */

const SVG_NS   = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

// ── SVG helpers ───────────────────────────────────────────────────────────────

function el(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'href') {
      e.setAttribute('href', v);
      e.setAttributeNS(XLINK_NS, 'xlink:href', v); // Safari compat
    } else {
      e.setAttribute(k, String(v));
    }
  }
  return e;
}

function g(attrs = {}) { return el('g', attrs); }
function txt(s)         { return document.createTextNode(s); }

// ── Lens path ─────────────────────────────────────────────────────────────────

/**
 * Compute SVG path data for a lens cross-section.
 *
 * @param {number} cx     Centre x (lens plane)
 * @param {number} topY   Top of lens
 * @param {number} botY   Bottom of lens
 * @param {number} bulge  Positive → biconvex; negative → biconcave; 0 → flat rect
 * @returns {string}  SVG path d attribute
 */
export function lensPath(cx, topY, botY, bulge) {
  if (bulge === 0) {
    return `M ${cx-3},${topY} L ${cx+3},${topY} L ${cx+3},${botY} L ${cx-3},${botY} Z`;
  }
  if (bulge > 0) {
    const b = bulge;
    return [
      `M ${cx},${topY}`,
      `C ${cx+b},${topY} ${cx+b},${botY} ${cx},${botY}`,
      `C ${cx-b},${botY} ${cx-b},${topY} ${cx},${topY}`,
      `Z`,
    ].join(' ');
  }
  // Biconcave (bulge < 0): wider at ends, pinched toward centre
  const c = -bulge;
  const w = Math.max(6, c * 0.5);
  return [
    `M ${cx-w},${topY}`,
    `L ${cx+w},${topY}`,
    `C ${cx},${topY} ${cx},${botY} ${cx+w},${botY}`,
    `L ${cx-w},${botY}`,
    `C ${cx},${botY} ${cx},${topY} ${cx-w},${topY}`,
    `Z`,
  ].join(' ');
}

// ── OpticsRenderer ────────────────────────────────────────────────────────────

export class OpticsRenderer {
  constructor(svgEl) {
    this._svg        = svgEl;
    this._layers     = {};
    this._layout     = null;
    this._feedFilter = null;   // feGaussianBlur — updated to set blur stdDeviation
    this._feedGroup  = null;   // <g> wrapping mini feed image — transform for inversion
  }

  // ── Public: initial render ─────────────────────────────────────────────────

  /**
   * Build the full SVG from scratch. Call once after the SVG element is in the DOM.
   * @param {object} layout   chapter2.js layout object
   * @param {string|null} avatarSrc  URL of the kid's selected avatar image
   */
  render(layout, avatarSrc) {
    this._layout = layout;
    const svg = this._svg;

    svg.innerHTML = '';
    svg.setAttribute('viewBox', layout.viewBox);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Defs (filters, clip paths)
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);
    this._buildDefs(defs, layout);

    // Layers — bg first, then rays, lens, markers, feed last
    for (const name of ['bg', 'rays', 'lens', 'markers']) {
      const grp = g({ class: `rl-optics-layer-${name}` });
      svg.appendChild(grp);
      this._layers[name] = grp;
    }

    this._drawBackground(layout, avatarSrc);
    // Feed image is now in the HTML see-panel, not the SVG
  }

  // ── Public: dynamic update ─────────────────────────────────────────────────

  /**
   * Redraw all dynamic SVG elements to reflect the current optical state.
   *
   * @param {object}        state     Result from OpticsEngine.compute()
   * @param {number|null}   f1        Focal length slot 1
   * @param {number|null}   f2        Focal length slot 2
   * @param {Array}         lensPool  chapter2.js lensPool array
   * @param {Array}         slots     [lensId|null, lensId|null] current slot contents
   * @param {OpticsEngine}  engine    The engine instance (for traceRays)
   * @param {string|null}   avatarSrc Avatar image URL
   */
  /**
   * @param {object}       state     OpticsEngine.compute() result
   * @param {number|null}  f1        Focal length slot 1
   * @param {number|null}  f2        Focal length slot 2
   * @param {Array}        lensPool  chapter2 lensPool
   * @param {Array}        slots     [lensId|null, lensId|null]
   * @param {Array}        lensX     [x|null, x|null] — current SVG x per placed lens
   * @param {OpticsEngine} engine
   * @param {string|null}  avatarSrc
   */
  update(state, f1, f2, lensPool, slots, lensX, engine, avatarSrc) {
    const { layout } = this;
    this._layers.rays.innerHTML    = '';
    this._layers.lens.innerHTML    = '';
    this._layers.markers.innerHTML = '';

    // Update slot outline class (filled vs empty)
    for (let i = 0; i < layout.slots.length; i++) {
      const outlineEl = this._svg.getElementById(`optics-slot-${layout.slots[i].id}`);
      if (outlineEl) {
        outlineEl.setAttribute('class',
          slots[i]
            ? 'rl-optics__slot-outline rl-optics__slot-outline--filled'
            : 'rl-optics__slot-outline'
        );
      }
    }

    // ── Lens shapes ───────────────────────────────────────────────────────────
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) continue;
      const def = lensPool.find(l => l.id === slots[i]);
      const x   = lensX[i] ?? layout.slots[i].x;
      if (def) this._drawLens(x, i, def, layout);
    }

    // ── Focal point markers ───────────────────────────────────────────────────
    for (let i = 0; i < slots.length; i++) {
      if (!slots[i]) continue;
      const def = lensPool.find(l => l.id === slots[i]);
      if (def && isFinite(def.focalLength)) {
        const lx = lensX[i] ?? layout.slots[i].x;
        const fx = lx + def.focalLength;
        if (fx > 60 && fx < 940) {
          this._drawFocalPoint(fx, layout.axisY, def.color, def.focalLength > 0);
        }
      }
    }

    // ── Ray diagram ───────────────────────────────────────────────────────────
    const x1 = lensX[0] ?? null;
    const x2 = lensX[1] ?? null;
    if (slots.some(s => s !== null)) {
      const { upper, lower } = engine.traceRays(f1, f2, x1, x2);
      this._drawRayBundle(upper, '#40e8d0', 0.85);
      this._drawRayBundle(lower, '#e8b840', 0.75);
    } else {
      this._drawParallelRays(layout);
    }

    // ── Intermediate image marker ─────────────────────────────────────────────
    const ix = state.intermediateImageX;
    const lx1 = lensX[0] ?? layout.slots[0].x;
    const lx2 = lensX[1] ?? layout.slots[1].x;
    if (
      ix !== null && isFinite(ix) &&
      ix > lx1 &&
      ix < lx2
    ) {
      this._drawImageMarker(ix, layout, /* isInverted */ true, avatarSrc);
    }

    // ── Mini video feed ───────────────────────────────────────────────────────
    this._updateFeed(state);
  }

  /** Convenience getter for layout (used in update). */
  get layout() { return this._layout; }

  /** Convert client screen coordinates to SVG user-space. */
  clientToSVG(clientX, clientY) {
    const pt = this._svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(this._svg.getScreenCTM().inverse());
  }

  // ── Private: defs ──────────────────────────────────────────────────────────

  /**
   * Compute bounds of the sensor feed image (same proportions as the subject avatar).
   * Right edge is flush with the sensor plate; image extends left into the tube.
   */
  _feedBounds(layout) {
    const { tube, sensor, axisY } = layout;
    const tubeH   = tube.y2 - tube.y1;
    const imgH    = Math.round(tubeH * 0.88);
    const imgW    = Math.round(imgH * 0.55);
    const x       = sensor.x - imgW;
    const y       = axisY - Math.round(imgH / 2);
    return { x, y, w: imgW, h: imgH };
  }

  _buildDefs(defs, layout) {
    // Gaussian blur filter for mini video feed at sensor
    const filter = el('filter', {
      id:     'optics-feed-blur',
      x:      '-15%', y: '-15%',
      width:  '130%', height: '130%',
    });
    const blurEl = el('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '0' });
    filter.appendChild(blurEl);
    defs.appendChild(filter);
    this._feedFilter = blurEl;

    // Clip path — bounds the feed image to the tube interior (right of slot 2)
    const { tube } = layout;
    const fb = this._feedBounds(layout);
    const clipFeed = el('clipPath', { id: 'optics-feed-clip' });
    clipFeed.appendChild(el('rect', {
      x:      fb.x,
      y:      tube.y1 + 4,
      width:  fb.w,
      height: tube.y2 - tube.y1 - 8,
      rx: 3,
    }));
    defs.appendChild(clipFeed);

    // Clip path — bounds intermediate image markers inside the tube
    const clipImg = el('clipPath', { id: 'optics-img-clip' });
    clipImg.appendChild(el('rect', {
      x: tube.x1 + 2,
      y: tube.y1 + 2,
      width:  tube.x2 - tube.x1 - 4,
      height: tube.y2 - tube.y1 - 4,
    }));
    defs.appendChild(clipImg);
  }

  // ── Private: static background ─────────────────────────────────────────────

  _drawBackground(layout, avatarSrc) {
    const { tube, axisY, slots, sensor, raysEnterX } = layout;
    const bg = this._layers.bg;

    // Outer glow rect behind tube
    bg.appendChild(el('rect', {
      x: tube.x1 - 3, y: tube.y1 - 6,
      width:  tube.x2 - tube.x1 + 6,
      height: tube.y2 - tube.y1 + 12,
      rx: 8, class: 'rl-optics__tube-glow',
    }));

    // Tube interior (dark fill)
    bg.appendChild(el('rect', {
      x: tube.x1, y: tube.y1,
      width: tube.x2 - tube.x1, height: tube.y2 - tube.y1,
      class: 'rl-optics__tube-body',
    }));

    // Tube walls: top, bottom, right
    for (const [x1, y1, x2, y2] of [
      [tube.x1, tube.y1, tube.x2, tube.y1],
      [tube.x1, tube.y2, tube.x2, tube.y2],
      [tube.x2, tube.y1, tube.x2, tube.y2],
    ]) {
      bg.appendChild(el('line', { x1, y1, x2, y2, class: 'rl-optics__tube-wall' }));
    }

    // Left aperture tick marks
    bg.appendChild(el('line', {
      x1: tube.x1, y1: tube.y1,
      x2: tube.x1, y2: tube.y1 + 28,
      class: 'rl-optics__tube-wall',
    }));
    bg.appendChild(el('line', {
      x1: tube.x1, y1: tube.y2 - 28,
      x2: tube.x1, y2: tube.y2,
      class: 'rl-optics__tube-wall',
    }));

    // Optical axis (dashed)
    bg.appendChild(el('line', {
      x1: raysEnterX - 120, y1: axisY,
      x2: tube.x2,           y2: axisY,
      class: 'rl-optics__axis',
    }));

    // ── Slot insertion brackets + slide tracks ────────────────────────────────
    for (const slot of slots) {
      const minX = slot.minX ?? (slot.x - 60);
      const maxX = slot.maxX ?? (slot.x + 60);
      const trackY  = tube.y2 - 20;
      const trackH  = 10;
      const bracketW = 90;

      // Insertion bracket background rect above tube
      bg.appendChild(el('rect', {
        x:      slot.x - bracketW / 2,
        y:      tube.y1 - 32,
        width:  bracketW,
        height: 28,
        rx: 4,
        fill:           'rgba(0,150,255,0.06)',
        stroke:         'rgba(0,200,255,0.28)',
        'stroke-width': '1',
      }));

      // Insertion slot label: two lines — "LENS 1" + "INSERTION SLOT"
      const labelLine1 = el('text', {
        x: slot.x, y: tube.y1 - 20,
        class: 'rl-optics__slot-label',
      });
      labelLine1.appendChild(txt(`LENS ${slot.label}`));
      bg.appendChild(labelLine1);

      const labelLine2 = el('text', {
        x: slot.x, y: tube.y1 - 8,
        class: 'rl-optics__slot-label',
        style: 'font-size:8px',
      });
      labelLine2.appendChild(txt('INSERTION SLOT'));
      bg.appendChild(labelLine2);

      // Small downward triangle at insertion point on tube top wall
      bg.appendChild(el('polygon', {
        points: `${slot.x - 5},${tube.y1 + 1} ${slot.x + 5},${tube.y1 + 1} ${slot.x},${tube.y1 + 8}`,
        fill: 'rgba(0,200,255,0.35)',
      }));

      // Slot dashed outline (visual drop target, inside tube)
      bg.appendChild(el('line', {
        x1: slot.x, y1: tube.y1 + 4,
        x2: slot.x, y2: trackY - 2,
        class: 'rl-optics__slot-outline',
        id:    `optics-slot-${slot.id}`,
      }));

      // ── Slide track (range band at tube bottom) ─────────────────────────
      bg.appendChild(el('rect', {
        x:              minX,
        y:              trackY,
        width:          maxX - minX,
        height:         trackH,
        rx:             4,
        fill:           'rgba(0,150,255,0.07)',
        stroke:         'rgba(0,200,255,0.18)',
        'stroke-width': '1',
      }));

      // Range boundary ticks
      for (const bx of [minX, maxX]) {
        bg.appendChild(el('line', {
          x1: bx, y1: trackY - 3,
          x2: bx, y2: trackY + trackH + 3,
          stroke:             'rgba(0,200,255,0.3)',
          'stroke-width':     '1',
          'stroke-dasharray': '3 2',
        }));
      }

      // Target sweet-spot triangle (gold, pointing up from track bottom)
      bg.appendChild(el('polygon', {
        points: `${slot.x - 5},${trackY + trackH} ${slot.x + 5},${trackY + trackH} ${slot.x},${trackY + 2}`,
        fill: 'rgba(255,210,60,0.55)',
      }));

      // Dark pill background + "TARGET" label beneath track
      bg.appendChild(el('rect', {
        x: slot.x - 23, y: trackY + trackH + 3,
        width: 46, height: 13,
        rx: 3,
        fill: 'rgba(0, 5, 18, 0.88)',
      }));
      const targetLabel = el('text', {
        x: slot.x, y: trackY + trackH + 13,
        class: 'rl-optics__slot-label',
        style: 'font-size:8px; fill:rgba(255,210,60,0.95)',
      });
      targetLabel.appendChild(txt('TARGET'));
      bg.appendChild(targetLabel);
    }

    // ── Retina cross-section (sensor at focal plane) ──────────────────────────
    const plateW = 16;
    const retH   = sensor.y2 - sensor.y1;

    // Outer housing (slightly wider dark rect as backing)
    bg.appendChild(el('rect', {
      x: sensor.x - plateW - 4, y: sensor.y1 - 2,
      width: plateW + 6, height: retH + 4,
      rx: 2,
      fill: 'rgba(0,40,20,0.5)', stroke: 'rgba(64,220,128,0.25)', 'stroke-width': '1',
    }));

    // Main sensor plate
    bg.appendChild(el('rect', {
      x: sensor.x - plateW, y: sensor.y1,
      width: plateW, height: retH,
      class: 'rl-optics__sensor-plate',
    }));

    // Photoreceptor rows — horizontal lines suggesting a pixel array (side view)
    const rowSpacing = 10;
    for (let y = sensor.y1 + 5; y < sensor.y2 - 2; y += rowSpacing) {
      bg.appendChild(el('line', {
        x1: sensor.x - plateW + 2, y1: y,
        x2: sensor.x - 2,          y2: y,
        stroke: 'rgba(40,220,100,0.28)', 'stroke-width': '1.5',
      }));
    }

    // Retina label
    const sensorLabel = el('text', {
      x: sensor.x - plateW / 2, y: tube.y1 - 10,
      class: 'rl-optics__sensor-label',
      'text-anchor': 'middle',
    });
    sensorLabel.appendChild(txt('RETINA'));
    bg.appendChild(sensorLabel);

    // Output terminals (+/−) on the tube right wall, with wire stubs
    const termData = [
      { y: Math.round(sensor.y1 + (sensor.y2 - sensor.y1) * 0.3), sign: '+', color: 'rgba(64,232,128,0.9)' },
      { y: Math.round(sensor.y1 + (sensor.y2 - sensor.y1) * 0.7), sign: '−', color: 'rgba(64,150,232,0.9)' },
    ];
    for (const { y: termY, sign, color } of termData) {
      // Terminal post (small rect on tube right wall)
      bg.appendChild(el('rect', {
        x: tube.x2 - 2, y: termY - 5,
        width: 8, height: 10,
        rx: 1,
        fill:           color.replace('0.9', '0.4'),
        stroke:         color,
        'stroke-width': '1',
      }));
      // Wire extending to right edge of viewBox
      bg.appendChild(el('line', {
        x1: tube.x2 + 6, y1: termY,
        x2: tube.x2 + 32, y2: termY,
        stroke: color.replace('0.9', '0.75'), 'stroke-width': '2',
        'stroke-linecap': 'round',
      }));
      // Sign label
      const signEl = el('text', {
        x: tube.x2 + 12, y: termY - 5,
        style: `font-size:9px; fill:${color}; font-weight:900; font-family:monospace`,
        'text-anchor': 'middle',
      });
      signEl.appendChild(txt(sign));
      bg.appendChild(signEl);
    }

    // Subject avatar — what SWIRL-E is looking at
    if (avatarSrc) {
      const tubeH   = tube.y2 - tube.y1;
      const avatarH = Math.round(tubeH * 0.88);
      const avatarW = Math.round(avatarH * 0.55);
      bg.appendChild(el('image', {
        href: avatarSrc,
        x:    raysEnterX - avatarW - 20,
        y:    tube.y1 + Math.round((tubeH - avatarH) / 2),
        width: avatarW, height: avatarH,
        preserveAspectRatio: 'xMidYMid meet',
        class: 'rl-optics__subject',
      }));
    }

    // Small label under avatar
    const subjectLabel = el('text', {
      x: raysEnterX - 40,
      y: tube.y2 + 20,
      class: 'rl-optics__subject-label',
    });
    subjectLabel.appendChild(txt('← Subject'));
    bg.appendChild(subjectLabel);
  }

  _initFeedImage(layout, avatarSrc) {
    if (!avatarSrc) return;
    const fb = this._feedBounds(layout);

    const grp = g({
      filter:      'url(#optics-feed-blur)',
      'clip-path': 'url(#optics-feed-clip)',
    });
    grp.appendChild(el('image', {
      href:                avatarSrc,
      x:                   fb.x,
      y:                   fb.y,
      width:               fb.w,
      height:              fb.h,
      preserveAspectRatio: 'xMidYMid meet',
    }));
    this._svg.appendChild(grp);
    this._feedGroup = grp;
  }

  _updateFeed(_state) {
    // Feed is now rendered as an HTML image in the see-panel; nothing to do here.
  }

  // ── Private: lens shapes ───────────────────────────────────────────────────

  _drawLens(slotX, slotIdx, lensDef, layout) {
    const { tube } = layout;
    const topY = tube.y1 + 10;
    const botY = tube.y2 - 10;
    const d    = lensPath(slotX, topY, botY, lensDef.bulge);
    const hex  = lensDef.color;

    const path = el('path', {
      d,
      fill:              hex + '2e',
      stroke:            hex,
      'stroke-width':    '2.5',
      'stroke-linejoin': 'round',
      'data-slot-idx':   String(slotIdx),
      style:             'cursor:grab; pointer-events:all',
    });
    this._layers.lens.appendChild(path);

    // Label below slot
    const nameEl = el('text', {
      x: slotX, y: tube.y2 + 18,
      class: 'rl-optics__lens-name',
      style: `fill:${hex}`,
    });
    nameEl.appendChild(txt(lensDef.label));
    this._layers.lens.appendChild(nameEl);

    const subEl = el('text', {
      x: slotX, y: tube.y2 + 33,
      class: 'rl-optics__lens-sublabel',
    });
    subEl.appendChild(txt(lensDef.sublabel));
    this._layers.lens.appendChild(subEl);
  }

  // ── Private: focal points ──────────────────────────────────────────────────

  _drawFocalPoint(fx, axisY, color, isConverging) {
    const m = this._layers.markers;

    if (!isConverging) {
      // Virtual focal point: dashed vertical tick + open circle
      m.appendChild(el('line', {
        x1: fx, y1: axisY - 48,
        x2: fx, y2: axisY + 48,
        stroke: color, 'stroke-width': '1',
        'stroke-dasharray': '5 4', opacity: '0.5',
      }));
    }

    m.appendChild(el('circle', {
      cx: fx, cy: axisY, r: 5,
      fill:         isConverging ? color : 'none',
      stroke:       isConverging ? 'none' : color,
      'stroke-width': '2',
      opacity: '0.85',
    }));

    const fLabel = el('text', {
      x: fx + 8, y: axisY - 8,
      class: 'rl-optics__focal-label',
      style: `fill:${color}`,
    });
    fLabel.appendChild(txt('F'));
    m.appendChild(fLabel);
  }

  // ── Private: rays ──────────────────────────────────────────────────────────

  _drawRayBundle(bundle, color, opacity) {
    for (const pts of bundle) {
      if (pts.length < 2) continue;
      const pointsStr = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      this._layers.rays.appendChild(el('polyline', {
        points:            pointsStr,
        stroke:            color,
        'stroke-width':    '1.5',
        fill:              'none',
        opacity:           String(opacity),
        'stroke-linecap':  'round',
        'stroke-linejoin': 'round',
      }));
    }
  }

  _drawParallelRays(layout) {
    const { axisY, tube, raysEnterX, sensor } = layout;
    const H = (tube.y2 - tube.y1) / 2;
    for (const dy of [-H * 0.8, -H * 0.4, 0, H * 0.4, H * 0.8]) {
      const y = (axisY + dy).toFixed(1);
      this._layers.rays.appendChild(el('polyline', {
        points:             `${raysEnterX - 80},${y} ${sensor.x},${y}`,
        stroke:             '#40e8d0',
        'stroke-width':     '1',
        fill:               'none',
        opacity:            '0.3',
        'stroke-dasharray': '8 6',
      }));
    }
  }

  // ── Private: image markers ─────────────────────────────────────────────────

  /**
   * Draw a small avatar icon at imageX, centred on the optical axis.
   * @param {boolean} isInverted  When true, flips the icon around the axis.
   */
  _drawImageMarker(imageX, layout, isInverted, avatarSrc) {
    if (!avatarSrc) return;
    const { axisY, tube } = layout;
    const m  = this._layers.markers;
    const h  = 50;
    const w  = Math.round(h * 0.6);
    const x  = imageX - w / 2;
    const y  = axisY  - h / 2;

    // Vertical dashed marker line
    m.appendChild(el('line', {
      x1: imageX, y1: tube.y1 + 4,
      x2: imageX, y2: tube.y2 - 4,
      stroke: '#ffffff', 'stroke-width': '1',
      'stroke-dasharray': '3 5', opacity: '0.2',
    }));

    // Image group — if inverted, flip around optical axis at imageX
    const grp = g({
      'clip-path': 'url(#optics-img-clip)',
      opacity: '0.82',
    });
    if (isInverted) {
      grp.setAttribute('transform',
        `translate(${imageX},${axisY}) scale(1,-1) translate(${-imageX},${-axisY})`
      );
    }
    grp.appendChild(el('image', {
      href: avatarSrc,
      x, y, width: w, height: h,
      preserveAspectRatio: 'xMidYMid meet',
    }));
    m.appendChild(grp);

    // Small label below slot area
    const labelEl = el('text', {
      x: imageX, y: tube.y2 + 18,
      class: 'rl-optics__img-label',
    });
    labelEl.appendChild(txt(isInverted ? '↕ image' : '✓ image'));
    m.appendChild(labelEl);
  }
}
