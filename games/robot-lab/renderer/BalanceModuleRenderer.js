/**
 * BalanceModuleRenderer.js — magnified wrist module (Ch5)
 *
 * SVG exploded view with visible parts, terminals, and wire drawing.
 */

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Terminal positions in SVG user units (updated when layout changes). */
export const MODULE_TERMINALS = {
  'sensor-out': { x: 78, y: 72 },
  'servo-in':   { x: 122, y: 72 },
};

/**
 * Renders the magnified wrist workbench circle with installable parts.
 */
export class BalanceModuleRenderer {
  /** @param {SVGSVGElement} svg */
  constructor(svg) {
    this._svg = svg;
    this._previewLine = null;
    this._previewFrom = null;
    this._playerWire = null;
    this._signalEl = null;
    this._build();
  }

  _build() {
    this._svg.innerHTML = '';
    this._svg.setAttribute('viewBox', '0 0 200 220');

    const defs = el('defs');
    const grad = el('linearGradient', { id: 'bl-pcb', x1: '0', y1: '0', x2: '0', y2: '1' });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': '#3d8a55' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': '#2a6040' }));
    defs.appendChild(grad);
    this._svg.appendChild(defs);

    this._layers = {
      frame:   el('g'),
      slots:   el('g'),
      parts:   el('g'),
      wires:   el('g'),
      labels:  el('g'),
      preview: el('g'),
    };
    for (const layer of Object.values(this._layers)) this._svg.appendChild(layer);

    // Magnifier ring
    this._layers.frame.appendChild(el('circle', {
      cx: 100, cy: 110, r: 96,
      class: 'bl-mod-ring',
    }));
    this._layers.frame.appendChild(el('circle', {
      cx: 100, cy: 110, r: 88,
      class: 'bl-mod-ring bl-mod-ring--inner',
    }));

    // Empty slot outlines (always visible)
    this._slotSensor = this._drawSlotOutline(28, 38, 72, 52, 'Tilt sensor', 'sensor');
    this._slotServo = this._drawSlotOutline(100, 38, 72, 52, 'Wrist servo', 'servo');
    this._slotShock = this._drawSlotOutline(64, 128, 72, 48, 'Shock', 'shock');
    this._layers.slots.append(this._slotSensor.g, this._slotServo.g, this._slotShock.g);

    // Part graphics (shown when installed)
    this._partSensor = this._drawSensorPart();
    this._partServo = this._drawServoPart();
    this._partShock = this._drawShockPart();
    this._layers.parts.append(this._partSensor, this._partServo, this._partShock);

    // Terminals
    this._termSensorOut = this._drawTerminal(78, 72, 'OUT', 'sensor-out', '#ff6b6b');
    this._termServoIn = this._drawTerminal(122, 72, 'IN', 'servo-in', '#ffd666');
    this._layers.labels.append(this._termSensorOut.g, this._termServoIn.g);

    this._signalEl = el('text', {
      x: 100, y: 208, class: 'bl-mod-signal', 'text-anchor': 'middle',
    });
    this._signalEl.textContent = 'Drag wire: Sensor OUT → Servo IN';
    this._layers.labels.appendChild(this._signalEl);

    this._wireHint = el('text', {
      x: 100, y: 18, class: 'bl-mod-hint', 'text-anchor': 'middle',
    });
    this._wireHint.textContent = 'Magnified wrist';
    this._layers.labels.appendChild(this._wireHint);
  }

  _drawSlotOutline(x, y, w, h, label, slotId) {
    const g = el('g', { class: 'bl-mod-slot', 'data-slot': slotId });
    g.appendChild(el('rect', {
      x, y, width: w, height: h, rx: 8, class: 'bl-mod-slot__outline',
    }));
    const t = el('text', {
      x: x + w / 2, y: y + h / 2 + 4, class: 'bl-mod-slot__label', 'text-anchor': 'middle',
    });
    t.textContent = label;
    g.appendChild(t);
    return { g, x, y, w, h };
  }

  _drawSensorPart() {
    const g = el('g', { class: 'bl-mod-part bl-mod-part--sensor', visibility: 'hidden' });
    g.appendChild(el('rect', { x: 30, y: 42, width: 68, height: 44, rx: 4, fill: 'url(#bl-pcb)' }));
    g.appendChild(el('rect', { x: 48, y: 52, width: 22, height: 18, rx: 2, class: 'bl-mod-chip' }));
    for (let i = 0; i < 3; i++) {
      g.appendChild(el('rect', {
        x: 34 + i * 8, y: 78, width: 4, height: 8, class: 'bl-mod-pin',
      }));
    }
    g.appendChild(el('text', {
      x: 64, y: 58, class: 'bl-mod-part__tag', 'text-anchor': 'middle',
    })).textContent = 'IMU';
    return g;
  }

  _drawServoPart() {
    const g = el('g', { class: 'bl-mod-part bl-mod-part--servo', visibility: 'hidden' });
    g.appendChild(el('rect', { x: 102, y: 44, width: 68, height: 40, rx: 6, class: 'bl-mod-servo-body' }));
    g.appendChild(el('circle', { cx: 136, cy: 64, r: 10, class: 'bl-mod-servo-hub' }));
    g.appendChild(el('polygon', {
      points: '136,54 148,64 136,74', class: 'bl-mod-servo-horn',
    }));
    g.appendChild(el('text', {
      x: 136, y: 68, class: 'bl-mod-part__tag', 'text-anchor': 'middle',
    })).textContent = 'SERVO';
    return g;
  }

  _drawShockPart() {
    const g = el('g', { class: 'bl-mod-part bl-mod-part--shock', visibility: 'hidden' });
    g.appendChild(el('rect', { x: 68, y: 132, width: 64, height: 10, rx: 2, class: 'bl-mod-shock-top' }));
    g.appendChild(el('rect', { x: 68, y: 158, width: 64, height: 10, rx: 2, class: 'bl-mod-shock-bot' }));
    for (let i = 0; i < 5; i++) {
      g.appendChild(el('line', {
        x1: 74 + i * 12, y1: 142, x2: 80 + i * 12, y2: 158,
        class: 'bl-mod-shock-coil',
      }));
    }
    g.appendChild(el('text', {
      x: 100, y: 152, class: 'bl-mod-part__tag', 'text-anchor': 'middle',
    })).textContent = 'DAMPER';
    return g;
  }

  _drawTerminal(x, y, label, id, color) {
    const g = el('g', { class: 'bl-mod-term', 'data-term': id, visibility: 'hidden' });
    g.appendChild(el('circle', { cx: x, cy: y, r: 8, class: 'bl-mod-term__dot', fill: color }));
    g.appendChild(el('text', {
      x: x, y: y + 20, class: 'bl-mod-term__label', 'text-anchor': 'middle',
    })).textContent = label;
    return { g, x, y, id };
  }

  /** @returns {Map<string, {x:number, y:number}>} */
  getTerminalPositions() {
    const map = new Map();
    if (this._termSensorOut.g.getAttribute('visibility') !== 'hidden') {
      map.set('sensor-out', { ...MODULE_TERMINALS['sensor-out'] });
    }
    if (this._termServoIn.g.getAttribute('visibility') !== 'hidden') {
      map.set('servo-in', { ...MODULE_TERMINALS['servo-in'] });
    }
    return map;
  }

  /**
   * @param {object} state
   * @param {boolean} state.hasSensor
   * @param {boolean} state.hasServo
   * @param {boolean} state.hasShock
   * @param {boolean} state.wired
   * @param {number} state.sensedRoll
   * @param {number} state.sensedPitch
   * @param {number} state.pushback
   */
  update(state) {
    const show = (node, on) => node.setAttribute('visibility', on ? 'visible' : 'hidden');

    show(this._partSensor, state.hasSensor);
    show(this._partServo, state.hasServo);
    show(this._partShock, state.hasShock);

    this._slotSensor.g.classList.toggle('bl-mod-slot--filled', state.hasSensor);
    this._slotServo.g.classList.toggle('bl-mod-slot--filled', state.hasServo);
    this._slotShock.g.classList.toggle('bl-mod-slot--filled', state.hasShock);

    const termsReady = state.hasSensor && state.hasServo;
    show(this._termSensorOut.g, termsReady);
    show(this._termServoIn.g, termsReady);

    if (state.hasSensor) {
      const degR = (state.sensedRoll * 57.3).toFixed(0);
      const degP = (state.sensedPitch * 57.3).toFixed(0);
      if (state.wired && state.hasServo) {
        this._signalEl.textContent = `Sensor OUT → Servo IN  |  roll ${degR}°  pitch ${degP}°`;
      } else if (state.hasServo) {
        this._signalEl.textContent = `Sensor reads roll ${degR}° pitch ${degP}° — wire OUT to IN`;
      } else {
        this._signalEl.textContent = `Sensor OUT: roll ${degR}°  pitch ${degP}°`;
      }
    } else if (termsReady) {
      this._signalEl.textContent = 'Install tilt sensor, then drag wire OUT → IN';
    } else {
      this._signalEl.textContent = 'Install parts from the tray below';
    }

    if (this._playerWire) {
      this._playerWire.classList.toggle('bl-mod-wire--live', state.wired && state.pushback > 0.5);
    }
  }

  addWire() {
    this.removeWire();
    const a = MODULE_TERMINALS['sensor-out'];
    const b = MODULE_TERMINALS['servo-in'];
    this._playerWire = el('polyline', {
      points: `${a.x},${a.y} ${a.x + 14},${a.y} ${b.x - 14},${b.y} ${b.x},${b.y}`,
      class: 'bl-mod-wire bl-mod-wire--player',
    });
    this._layers.wires.appendChild(this._playerWire);
  }

  removeWire() {
    if (this._playerWire) {
      this._playerWire.remove();
      this._playerWire = null;
    }
  }

  startPreview(fromId) {
    this.clearPreview();
    const t = MODULE_TERMINALS[fromId];
    if (!t) return;
    this._previewFrom = { x: t.x, y: t.y };
    this._previewLine = el('polyline', {
      points: `${t.x},${t.y}`,
      class: 'bl-mod-wire bl-mod-wire--preview',
    });
    this._layers.preview.appendChild(this._previewLine);
  }

  updatePreview(svgX, svgY) {
    if (!this._previewLine || !this._previewFrom) return;
    const a = this._previewFrom;
    const midX = (a.x + svgX) / 2;
    this._previewLine.setAttribute(
      'points',
      `${a.x},${a.y} ${midX},${a.y} ${midX},${svgY} ${svgX},${svgY}`,
    );
  }

  clearPreview() {
    if (this._previewLine) {
      this._previewLine.remove();
      this._previewLine = null;
    }
    this._previewFrom = null;
  }

  destroy() {
    this.clearPreview();
    this.removeWire();
  }
}
