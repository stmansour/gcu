/**
 * Art Studio — Sandbox. Free painting with mixed colors, brush, undo, clear.
 */

import { Scene } from '../../../core/scene/index.js';
import { DragManager } from '../../../core/input/index.js';
import { GameStorage } from '../../../core/storage/index.js';
import { PALETTE } from '../missions/missions.js';
import { mixColors } from '../engine/colorMixing.js';
import { hslToHex } from '../../../core/utils/color.js';

export class SandboxScene extends Scene {
  constructor({ sceneManager }) {
    super();
    this.sceneManager = sceneManager;
    this.storage = new GameStorage('art-studio');
    this.dragManager = null;
    this.well = [];
    this.colorHistory = [];
    this.canvas = null;
    this.ctx = null;
    this.painting = false;
    this.lastPoint = null;
    this.brushSize = 12;
    this.undoStack = [];
    this.MAX_UNDO = 10;
  }

  enter(container) {
    container.className = 'art-studio art-studio--sandbox';
    container.innerHTML = `
      <div class="sandbox-layout">
        <aside class="sandbox-palette">
          <h3>Palette</h3>
          <div class="mixing-well" id="sandbox-well"></div>
          <button type="button" data-tap id="sandbox-clear-well">Clear well</button>
          <div class="palette-blobs" id="sandbox-blobs"></div>
          <div class="color-history" id="sandbox-history">
            <p class="color-history__label">Recent colors</p>
          </div>
        </aside>
        <main class="sandbox-canvas-area">
          <div class="sandbox-toolbar">
            <button type="button" data-tap id="sandbox-undo">Undo</button>
            <button type="button" data-tap id="sandbox-clear">Clear canvas</button>
            <button type="button" data-tap id="sandbox-brush-sm">Small</button>
            <button type="button" data-tap id="sandbox-brush-md">Medium</button>
            <button type="button" data-tap id="sandbox-brush-lg">Large</button>
            <a href="#" data-tap class="art-studio__home">← Home</a>
          </div>
          <canvas id="sandbox-canvas" width="600" height="400"></canvas>
        </main>
      </div>
    `;
    Object.keys(PALETTE).forEach((name) => {
      const c = PALETTE[name];
      const blob = document.createElement('div');
      blob.className = 'paint-blob draggable';
      blob.dataset.color = name;
      blob.style.background = hslToHex(c.h, c.s, c.l);
      blob.setAttribute('aria-label', name);
      container.querySelector('#sandbox-blobs').appendChild(blob);
    });
    this.dragManager = new DragManager(container, {
      dragSelector: '.paint-blob',
      dropTargets: ['#sandbox-well'],
      forgiveness: 1.3,
      onDrop: (item) => {
        const name = item.dataset.color;
        const c = PALETTE[name];
        if (c) this.well.push({ name, h: c.h, s: c.s, l: c.l });
        this._updateWellAndHistory();
      },
    });
    this._setupCanvas(container);
    container.querySelector('#sandbox-clear-well').addEventListener('click', () => {
      this.well = [];
      this._updateWellAndHistory();
    });
    container.querySelector('#sandbox-undo').addEventListener('click', () => this._undo());
    container.querySelector('#sandbox-clear').addEventListener('click', () => this._clearCanvas());
    container.querySelector('#sandbox-brush-sm').addEventListener('click', () => { this.brushSize = 8; });
    container.querySelector('#sandbox-brush-md').addEventListener('click', () => { this.brushSize = 12; });
    container.querySelector('#sandbox-brush-lg').addEventListener('click', () => { this.brushSize = 20; });
    container.querySelector('.art-studio__home').addEventListener('click', (e) => { e.preventDefault(); this.sceneManager.go('hub'); });
    this._updateWellAndHistory();
  }

  _setupCanvas(container) {
    this.canvas = container.querySelector('#sandbox-canvas');
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(dpr, dpr);
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, rect.width, rect.height);
    const getPoint = (e) => {
      const r = this.canvas.getBoundingClientRect();
      const t = e.touches?.[0] || e;
      return { x: (t.clientX - r.left), y: (t.clientY - r.top) };
    };
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); this.painting = true; this.lastPoint = getPoint(e); this._drawDot(this.lastPoint); }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => { if (!this.painting) return; e.preventDefault(); const p = getPoint(e); this._drawLine(this.lastPoint, p); this.lastPoint = p; }, { passive: false });
    this.canvas.addEventListener('touchend', () => { this.painting = false; this._saveUndo(); });
    this.canvas.addEventListener('mousedown', (e) => { this.painting = true; this.lastPoint = getPoint(e); this._drawDot(this.lastPoint); });
    this.canvas.addEventListener('mousemove', (e) => { if (!this.painting) return; const p = getPoint(e); this._drawLine(this.lastPoint, p); this.lastPoint = p; });
    this.canvas.addEventListener('mouseup', () => { this.painting = false; this._saveUndo(); });
  }

  get _currentColor() {
    const mixed = mixColors(this.well);
    return mixed ? hslToHex(mixed.h, mixed.s, mixed.l) : '#333';
  }

  _drawDot(p) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.brushSize, 0, Math.PI * 2);
    this.ctx.fillStyle = this._currentColor;
    this.ctx.fill();
  }

  _drawLine(from, to) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.strokeStyle = this._currentColor;
    this.ctx.lineWidth = this.brushSize * 2;
    this.ctx.lineCap = 'round';
    this.ctx.stroke();
  }

  _saveUndo() {
    if (!this.canvas || !this.ctx) return;
    const w = this.canvas.width; const h = this.canvas.height;
    const img = this.ctx.getImageData(0, 0, w, h);
    this.undoStack.push(img);
    if (this.undoStack.length > this.MAX_UNDO) this.undoStack.shift();
  }

  _undo() {
    if (this.undoStack.length === 0) return;
    this.undoStack.pop();
    if (this.undoStack.length > 0) {
      this.ctx.putImageData(this.undoStack[this.undoStack.length - 1], 0, 0);
    } else {
      const rect = this.canvas.getBoundingClientRect();
      this.ctx.fillStyle = '#fff';
      this.ctx.fillRect(0, 0, rect.width, rect.height);
    }
  }

  _clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.fillStyle = '#fff';
    this.ctx.fillRect(0, 0, rect.width, rect.height);
    this.undoStack = [];
  }

  _updateWellAndHistory() {
    const mixed = mixColors(this.well);
    const wellEl = document.getElementById('sandbox-well');
    if (wellEl) wellEl.style.background = mixed ? hslToHex(mixed.h, mixed.s, mixed.l) : '#e0d5c0';
    if (mixed) {
      if (!this.colorHistory.find((c) => c.h === mixed.h && c.s === mixed.s && c.l === mixed.l)) {
        this.colorHistory.unshift({ ...mixed });
        if (this.colorHistory.length > 8) this.colorHistory.pop();
      }
    }
    const histEl = document.getElementById('sandbox-history');
    if (histEl) {
      histEl.innerHTML = '<p class="color-history__label">Recent colors</p>';
      this.colorHistory.slice(0, 8).forEach((c) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'color-history__swatch';
        swatch.style.background = hslToHex(c.h, c.s, c.l);
        swatch.dataset.tap = '1';
        swatch.addEventListener('click', () => { this.well = [{ name: 'custom', ...c }]; this._updateWellAndHistory(); });
        histEl.appendChild(swatch);
      });
    }
  }

  exit(container) {
    if (this.dragManager) this.dragManager.destroy();
    this.dragManager = null;
    container.innerHTML = '';
  }
}
