/**
 * BalanceRenderer.js — Cinematic Sprite-Driven Parallax Renderer with Depth-of-Field
 */

import { PUSH_DIRS } from '../engine/BalanceEngine.js';

/** @param {string} src @returns {Promise<HTMLImageElement|null>} */
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Sprite layout tuned for SWIRL-E-arm1.png — beaker in palm, no tray. */
const HERO_LAYOUT = {
  robotW:       190,
  robotH:       230,
  robotYBase:   72,   // vertical — treads on hazard stripe
  handOffsetX:  162,  // palm center in sprite
  handOffsetY:  94,
  beakerX:      0,    // relative to palm pivot
  beakerY:      0,
};

export class BalanceHeroRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._w = 640;
    this._h = 320;
    this._raf = null;
    this._sim = null;
    this._scrollX = 0;
    this._lastTimestamp = 0;
    this._droplets = [];

    this._imagesLoaded = false;
    this._imgRobot = null;
    this._imgBg = null;

    Promise.all([
      loadImage('games/robot-lab/assets/images/SWIRL-E-arm1.png'),
      loadImage('games/robot-lab/assets/images/lab-background.png'),
    ]).then(([robot, bg]) => {
      this._imgRobot = robot;
      this._imgBg = bg;
      this._imagesLoaded = Boolean(robot);
    });

    this._initCanvas();
  }

  _initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = this._w * dpr;
    this._canvas.height = this._h * dpr;
    this._canvas.style.width = '100%';
    this._canvas.style.height = 'auto';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** @param {import('../engine/BalanceEngine.js').BalanceSim} sim */
  setSim(sim) {
    this._sim = sim;
  }

  start() {
    this._lastTimestamp = performance.now();
    if (!this._raf) this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  clearDroplets() {
    this._droplets = [];
  }

  destroy() {
    this.stop();
    this._droplets = [];
  }

  _frame(timestamp) {
    const elapsedSec = (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;

    if (this._sim) {
      const currentSpeed = (this._sim.mode === 'walk') ? (this._sim.forceDial * 300) : 0;
      this._scrollX += elapsedSec * currentSpeed;
    }

    this._draw();
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    const sim = this._sim;

    ctx.clearRect(0, 0, w, h);

    if (!this._imagesLoaded || !this._imgRobot) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '800 12px monospace';
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('LOADING SWIRL-E ASSETS...', 20, 30);
      return;
    }

    // 1. BACKGROUND — aspect-correct tiles with soft depth-of-field blur
    if (this._imgBg) {
      ctx.save();
      ctx.filter = 'blur(2px)';
      this._drawTiledBackground(ctx, w, h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    }

    let strideBob = 0;
    if (sim && sim.mode === 'walk' && sim.forceDial > 0) {
      const frequency = 5.0 + sim.forceDial * 7.0;
      strideBob = Math.sin(sim.walkT * frequency) * (2.0 + sim.forceDial * 5.0);
    }

    // 2. SWIRL-E sprite — centered horizontally, feet near floor
    const { robotW, robotH, robotYBase, handOffsetX, handOffsetY, beakerX, beakerY } = HERO_LAYOUT;
    const robotX = Math.round((w - robotW) / 2);
    const robotY = robotYBase + strideBob;
    ctx.drawImage(this._imgRobot, robotX, robotY, robotW, robotH);

    const handX = robotX + handOffsetX;
    const handY = robotY + handOffsetY;

    const roll = sim?.roll ?? 0;
    const pitch = sim?.pitch ?? 0;
    const servoAngle = sim?.hasServo && sim?.wired ? -(roll * 0.6 + pitch * 0.2) : 0;

    // 3. Beaker in open palm (no separate tray graphic)
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(servoAngle);
    ctx.rotate(roll);
    this._drawBeakerFlask(ctx, beakerX, beakerY, pitch, sim);
    ctx.restore();

    this._renderParticles(ctx, handX + beakerX, handY + beakerY, servoAngle, roll, pitch, sim);
  }

  /** Draw lab background as seamless horizontal tiles at native aspect ratio. */
  _drawTiledBackground(ctx, w, h) {
    const img = this._imgBg;
    const tileW = img.width * (h / img.height);
    const bgScroll = (this._scrollX * 0.5) % tileW;

    for (let x = -bgScroll; x < w; x += tileW) {
      ctx.drawImage(img, x, 0, tileW, h);
    }
  }

  _drawBeakerFlask(ctx, bx, by, pitch, sim) {
    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(pitch * 0.5);

    const bWidth = 24;
    const bHeight = 40;

    const fillRatio = sim?.water ?? 1;
    if (fillRatio > 0.01) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.7)';
      ctx.beginPath();

      const fluidBaseY = -2 - (fillRatio * (bHeight - 6));
      const sloshOffset = (sim?.slosh ?? 0) * 14;

      const leftWaveY = Math.max(-bHeight + 4, Math.min(-2, fluidBaseY - sloshOffset));
      const rightWaveY = Math.max(-bHeight + 4, Math.min(-2, fluidBaseY + sloshOffset));

      ctx.moveTo(-bWidth / 2 + 2, -2);
      ctx.lineTo(-bWidth / 2 + 2, leftWaveY);
      ctx.lineTo(bWidth / 2 - 2, rightWaveY);
      ctx.lineTo(bWidth / 2 - 2, -2);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#f0f9ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bWidth / 2 + 2, leftWaveY);
      ctx.lineTo(bWidth / 2 - 2, rightWaveY);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-bWidth / 2 - 2, -bHeight);
    ctx.lineTo(-bWidth / 2 + 1, -bHeight);
    ctx.lineTo(-bWidth / 2 + 1, -bHeight + 2);
    ctx.lineTo(-bWidth / 2 + 2, -2);
    ctx.lineTo(bWidth / 2 - 2, -2);
    ctx.lineTo(bWidth / 2 - 1, -bHeight + 2);
    ctx.lineTo(bWidth / 2 - 1, -bHeight);
    ctx.lineTo(bWidth / 2 + 2, -bHeight);
    ctx.stroke();

    ctx.restore();
  }

  _renderParticles(ctx, bx, by, servoAngle, roll, pitch, sim) {
    if (sim && sim.water < 1 && !sim.glassTipped) {
      const tiltTotal = Math.abs(roll) + Math.abs(pitch) + Math.abs(sim.slosh);
      if (Math.random() < (tiltTotal * 0.25)) {
        const rimA = servoAngle + roll + pitch * 0.5;
        this._droplets.push({
          x: bx - Math.sin(rimA) * 6,
          y: by - Math.cos(rimA) * 36,
          vy: -0.5 - Math.random() * 2.0,
          vx: -3.0 - (sim.forceDial * 9.0) + (Math.random() - 0.5) * 2.0,
          life: 1.0,
        });
      }
    }

    for (let i = this._droplets.length - 1; i >= 0; i--) {
      const d = this._droplets[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.22;
      d.life -= 0.04;
      if (d.life <= 0) { this._droplets.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(56, 189, 248, ${d.life})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2 + d.life * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export class TickerMonitor {
  constructor(canvas, label, color) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._label = label;
    this._color = color;
    this._values = new Array(140).fill(0);
    this._active = true;
    this._init();
  }

  _init() {
    const dpr = window.devicePixelRatio || 1;
    this._canvas.width = 280 * dpr;
    this._canvas.height = 56 * dpr;
    this._canvas.style.width = '100%';
    this._canvas.style.height = 'auto';
    this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setActive(on) { this._active = on; }
  push(v) { this._values.shift(); this._values.push(v); }

  draw(maxVal = 1) {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, 280, 56);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(0, 0, 280, 56, 6);
    ctx.fill();

    ctx.font = '800 9px monospace';
    ctx.fillStyle = this._active ? '#94a3b8' : '#334155';
    ctx.fillText(this._label, 10, 14);

    if (!this._active) return;

    ctx.strokeStyle = this._color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < this._values.length; i++) {
      const x = 10 + (i / (this._values.length - 1)) * 260;
      const y = 34 - (Math.max(-maxVal, Math.min(maxVal, this._values[i])) / maxVal) * 16;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  destroy() { }
}

export { PUSH_DIRS };
