/**
 * BalanceRenderer.js — Chapter 5 hero animation + ticker monitors
 */

import { PUSH_DIRS } from '../engine/BalanceEngine.js';

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function bindCanvas(canvas, w, h) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const apply = () => {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.aspectRatio = `${w} / ${h}`;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  apply();
  const ro = new ResizeObserver(apply);
  ro.observe(canvas.parentElement || canvas);
  return { ctx, disconnect: () => ro.disconnect(), w, h };
}

export class BalanceHeroRenderer {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this._layout = bindCanvas(canvas, 640, 320);
    this._ctx = this._layout.ctx;
    this._w = 640;
    this._h = 320;
    this._raf = null;
    this._sim = null;
    this._droplets = [];
    this._spillOrigin = { x: 0, y: 0 };
  }

  /** @param {import('../engine/BalanceEngine.js').BalanceSim} sim */
  setSim(sim) {
    this._sim = sim;
  }

  start() {
    if (!this._raf) this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  destroy() {
    this.stop();
    this._droplets = [];
    this._layout.disconnect();
  }

  clearDroplets() {
    this._droplets = [];
  }

  _frame() {
    this._draw();
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  /** @returns {{ x: number, y: number }} glass rim in canvas coords */
  _glassRimWorld(cx, wristY, servoAngle, roll, pitch) {
    const trayLen = 92;
    const glassAlong = trayLen - 10;
    const trayTop = -5;
    const a = servoAngle + roll;
    const gx = cx + Math.cos(a) * glassAlong - Math.sin(a) * trayTop;
    const gy = wristY + Math.sin(a) * glassAlong + Math.cos(a) * trayTop;
    const rimA = a + pitch * 0.55;
    const rimH = 30;
    return {
      x: gx - Math.sin(rimA) * 4,
      y: gy - Math.cos(rimA) * rimH - Math.abs(Math.sin(rimA)) * 6,
    };
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    const sim = this._sim;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1a2840');
    bg.addColorStop(1, '#0e1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.34;
    const wristY = h * 0.54;
    const roll = sim?.roll ?? 0;
    const pitch = sim?.pitch ?? 0;
    const compress = sim?._shockCompress ?? 0;
    const servoAngle = sim?.hasServo && sim?.wired ? -(roll * 0.5 + pitch * 0.22) : 0;

    // Forearm — fixed, enters from left
    ctx.strokeStyle = '#5a6a82';
    ctx.lineWidth = 18;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.04, wristY + 6);
    ctx.lineTo(cx - 6, wristY);
    ctx.stroke();

    // Wrist pivot pin (single hinge — not a floating circle on the tray)
    ctx.fillStyle = '#8a9aaa';
    ctx.fillRect(cx - 5, wristY - 8, 10, 16);
    ctx.strokeStyle = '#c8d4e0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cx - 5, wristY - 8, 10, 16);

    // Shock absorber at wrist (between arm and rotating bracket)
    if (sim?.hasShock) {
      ctx.fillStyle = '#c49a42';
      const shH = 6 + compress * 12;
      ctx.fillRect(cx - 7, wristY - shH - 2, 14, shH);
      ctx.fillStyle = '#666';
      ctx.fillRect(cx - 9, wristY + 1, 18, 5);
    }

    // Rotating bracket + tray + glass
    ctx.save();
    ctx.translate(cx, wristY);
    ctx.rotate(servoAngle);

    // Wrist bracket (small block — not a second circle)
    ctx.fillStyle = '#48586e';
    ctx.fillRect(-6, -12, 12, 24);

    ctx.rotate(roll);

    const trayLen = 92;
    ctx.fillStyle = '#d9ab45';
    ctx.fillRect(6, -5, trayLen, 10);
    ctx.strokeStyle = '#a88430';
    ctx.lineWidth = 1;
    ctx.strokeRect(6, -5, trayLen, 10);

    this._drawGlass(ctx, trayLen - 10, -5, pitch, sim);
    ctx.restore();

    this._spillOrigin = this._glassRimWorld(cx, wristY, servoAngle, roll, pitch);

    // Slosh droplets from glass rim
    if (sim && sim.water < 1 && !sim.glassTipped) {
      const tiltMag = Math.sqrt(roll * roll + pitch * pitch);
      const rate = 0.04 + tiltMag * 0.12 + Math.abs(sim.slosh) * 0.08;
      if (Math.random() < rate) {
        this._droplets.push({
          x: this._spillOrigin.x + (Math.random() - 0.5) * 10,
          y: this._spillOrigin.y + (Math.random() - 0.5) * 4,
          vy: 1.5 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 1.2,
          life: 1,
        });
      }
    }
    for (let i = this._droplets.length - 1; i >= 0; i--) {
      const d = this._droplets[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.12;
      d.life -= 0.028;
      if (d.life <= 0) { this._droplets.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(100, 190, 255, ${d.life * 0.85})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.5 + d.life, 0, Math.PI * 2);
      ctx.fill();
    }

    // Joint label
    ctx.font = '700 9px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(160, 200, 230, 0.55)';
    ctx.textAlign = 'center';
    ctx.fillText('wrist joint', cx, wristY + 28);

    if (sim?.glassTipped) {
      ctx.font = '900 16px Nunito, sans-serif';
      ctx.fillStyle = '#ff8676';
      ctx.fillText('Glass tipped!', w / 2, h * 0.14);
    }
  }

  _drawGlass(ctx, gx, gy, pitch, sim) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(pitch * 0.55);
    ctx.strokeStyle = 'rgba(210, 235, 255, 0.95)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -30, 18, 30);
    const fill = sim?.water ?? 1;
    if (fill > 0.01) {
      ctx.fillStyle = `rgba(100, 190, 255, ${0.55 + fill * 0.4})`;
      ctx.fillRect(-7, -6 - fill * 20, 14, fill * 20);
      ctx.fillStyle = 'rgba(180, 230, 255, 0.35)';
      ctx.fillRect(-5, -8 - fill * 20, 4, 4);
    }
    ctx.restore();
  }
}

/**
 * Rolling ticker-tape monitor.
 */
export class TickerMonitor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {string} label
   * @param {string} color
   */
  constructor(canvas, label, color) {
    this._layout = bindCanvas(canvas, 280, 56);
    this._ctx = this._layout.ctx;
    this._label = label;
    this._color = color;
    this._values = new Array(140).fill(0);
    this._active = true;
  }

  setActive(on) {
    this._active = on;
  }

  push(v) {
    this._values.shift();
    this._values.push(v);
  }

  draw(maxVal = 1) {
    const ctx = this._ctx;
    const w = 280;
    const h = 56;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(6, 14, 30, 0.82)';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();

    ctx.font = '800 9px Orbitron, monospace';
    ctx.fillStyle = this._active ? 'rgba(160, 215, 245, 0.85)' : 'rgba(120, 130, 150, 0.5)';
    ctx.textAlign = 'left';
    ctx.fillText(this._label, 8, 14);

    if (!this._active) {
      ctx.font = '700 10px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(140, 150, 170, 0.6)';
      ctx.fillText('—', 8, 36);
      return;
    }

    const pad = 8;
    const cw = w - pad * 2;
    const cy = h / 2 + 4;
    const scale = (h / 2 - 14) / Math.max(maxVal, 0.01);

    ctx.strokeStyle = 'rgba(200, 220, 240, 0.2)';
    ctx.beginPath();
    ctx.moveTo(pad, cy);
    ctx.lineTo(pad + cw, cy);
    ctx.stroke();

    ctx.strokeStyle = this._color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < this._values.length; i++) {
      const x = pad + (i / (this._values.length - 1)) * cw;
      const y = cy - clamp(this._values[i], -maxVal, maxVal) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  destroy() {
    this._layout.disconnect();
  }
}

export { PUSH_DIRS };
