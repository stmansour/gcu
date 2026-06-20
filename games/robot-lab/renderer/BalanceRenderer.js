/**
 * BalanceRenderer.js — Chapter 5 full character arena + dynamic slosh beaker simulation
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

    // Parallax background tracking
    this._scrollX = 0;
    this._lastTimestamp = 0;
    this._blinkTimer = 0;
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

  destroy() {
    this.stop();
    this._droplets = [];
    this._layout.disconnect();
  }

  clearDroplets() {
    this._droplets = [];
  }

  _frame(timestamp) {
    const elapsedSec = (timestamp - this._lastTimestamp) / 1000;
    this._lastTimestamp = timestamp;

    // Direct link to the slider throttle value
    if (this._sim) {
      const currentSpeed = (this._sim.mode === 'walk') ? (this._sim.forceDial * 260) : 0;
      this._scrollX += elapsedSec * currentSpeed;
    }

    this._blinkTimer += elapsedSec;
    this._draw();
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  /** @returns {{ x: number, y: number }} glass rim in canvas coords */
  _glassRimWorld(cx, wristY, servoAngle, roll, pitch) {
    const armLength = 110;
    const a = servoAngle + roll;
    const gx = cx + Math.cos(a) * armLength;
    const gy = wristY + Math.sin(a) * armLength;
    const rimA = a + pitch * 0.5;
    return {
      x: gx - Math.sin(rimA) * 6,
      y: gy - Math.cos(rimA) * 36,
    };
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    const sim = this._sim;
    ctx.clearRect(0, 0, w, h);

    // 1. LABORATORY BACKGROUND (Parallax Layers)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#1e293b');
    skyGrad.addColorStop(0.8, '#0f172a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Far Wall Grid (Slow Scroll)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
    ctx.lineWidth = 1;
    const bgScroll = (this._scrollX * 0.2) % 60;
    for (let x = -bgScroll; x < w; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h * 0.75);
      ctx.stroke();
    }

    // Midground Tech-Bench Ledge (Medium Scroll)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, h * 0.72, w, h * 0.04);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h * 0.76, w, h * 0.24);

    // Foreground Floor Tiles & Safety Tracks (Full Speed Scroll)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const floorScroll = this._scrollX % 40;
    ctx.beginPath();
    for (let x = -floorScroll; x < w; x += 40) {
      ctx.moveTo(x, h * 0.76);
      ctx.lineTo(x - 20, h);
    }
    ctx.stroke();

    // Safety Line Track
    ctx.fillStyle = '#f59e0b';
    const stripeScroll = this._scrollX % 30;
    for (let x = -stripeScroll; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.78);
      ctx.lineTo(x + 10, h * 0.78);
      ctx.lineTo(x + 5, h * 0.80);
      ctx.lineTo(x - 5, h * 0.80);
      ctx.fill();
    }

    // 2. STRIDE BOBBING LOGIC
    let bobY = 0;
    let headWobble = 0;
    if (sim && sim.mode === 'walk' && sim.forceDial > 0) {
      const frequency = 4.0 + sim.forceDial * 8.0;
      bobY = Math.sin(sim.walkT * frequency) * (3.0 + sim.forceDial * 6.0);
      headWobble = Math.cos(sim.walkT * frequency) * 0.05;
    }

    // Coordinates mapping relative to SWIRL-E body core positioning
    const robotBaseX = 110;
    const robotBaseY = h * 0.76;
    const shoulderX = robotBaseX + 25;
    const shoulderY = robotBaseY - 70 + bobY;

    const roll = sim?.roll ?? 0;
    const pitch = sim?.pitch ?? 0;
    const compress = sim?._shockCompress ?? 0;
    const servoAngle = sim?.hasServo && sim?.wired ? -(roll * 0.6 + pitch * 0.2) : 0;

    // 3. DRAW SWIRL-E FULL BODY CHASSIS
    // Drive Wheel Base
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(robotBaseX, robotBaseY - 12, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(robotBaseX, robotBaseY - 12, 6, 0, Math.PI * 2);
    ctx.fill();

    // Round Torso Body Shell
    const bodyGrad = ctx.createLinearGradient(robotBaseX - 30, shoulderY, robotBaseX + 30, robotBaseY);
    bodyGrad.addColorStop(0, '#e2e8f0');
    bodyGrad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(robotBaseX, robotBaseY - 48 + bobY, 28, 0, Math.PI * 2);
    ctx.fill();

    // Screen Head Assembly
    ctx.save();
    ctx.translate(robotBaseX - 5, robotBaseY - 92 + bobY);
    ctx.rotate(headWobble);

    // Outer monitor frame
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.roundRect(-22, -18, 44, 32, 8);
    ctx.fill();

    // Digital Blue Screen
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-18, -14, 36, 24);

    // Glowing Eyes (with blinking logic)
    ctx.fillStyle = '#93c5fd';
    const isBlinking = (this._blinkTimer % 4.0 > 3.8);
    if (isBlinking) {
      ctx.fillRect(-12, -4, 8, 2);
      ctx.fillRect(4, -4, 8, 2);
    } else {
      ctx.beginPath();
      ctx.arc(-8, -2, 4, 0, Math.PI * 2);
      ctx.arc(8, -2, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Metallic Shoulder joint capsule
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 10, 0, Math.PI * 2);
    ctx.fill();

    // 4. MACHINED ROBOTIC FOREARM
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(shoulderX + 90, shoulderY + 5);
    ctx.stroke();

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Shock Absorber mount spring line
    if (sim?.hasShock) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const springOffset = 6 + compress * 10;
      ctx.moveTo(shoulderX + 75, shoulderY + 4);
      ctx.lineTo(shoulderX + 75, shoulderY - springOffset);
      ctx.stroke();
    }

    // 5. THE ACTIVE ROTATING GRIPPER WRIST
    ctx.save();
    ctx.translate(shoulderX + 90, shoulderY + 5);
    ctx.rotate(servoAngle);

    // Dark grey mechanical wrist joint pin
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(roll);

    // Machined Tray Plate
    const trayWidth = 100;
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.roundRect(0, -4, trayWidth, 8, 2);
    ctx.fill();

    // Elegant Curved Hand Gripper Bracket locking the beaker down
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(trayWidth - 12, -4, 14, 0, Math.PI, false);
    ctx.stroke();

    // Draw Beaker and Fluid relative to the wrist rotation container matrix
    this._drawGlassBeaker(ctx, trayWidth - 12, -4, pitch, sim);
    ctx.restore();

    // 6. SPLASH PARTICLE FLUID DYNAMICS
    this._spillOrigin = this._glassRimWorld(shoulderX + 90, shoulderY + 5, servoAngle, roll, pitch);

    if (sim && sim.water < 1 && !sim.glassTipped) {
      const dynamicTilt = Math.abs(roll) + Math.abs(pitch) + Math.abs(sim.slosh);
      if (Math.random() < (dynamicTilt * 0.3)) {
        this._droplets.push({
          x: this._spillOrigin.x,
          y: this._spillOrigin.y,
          vy: -1.0 - Math.random() * 3.0,
          vx: -4.0 - (sim.forceDial * 8.0) + (Math.random() - 0.5) * 3.0, // Flings backward based on throttle velocity!
          life: 1.0
        });
      }
    }

    for (let i = this._droplets.length - 1; i >= 0; i--) {
      const d = this._droplets[i];
      d.x += d.vx;
      d.y += d.vy;
      d.vy += 0.25; // Pull down with gravity acceleration
      d.life -= 0.035;
      if (d.life <= 0) { this._droplets.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(56, 189, 248, ${d.life * 0.9})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2.0 + d.life * 3.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // TAPE MONITORS DATA INJECTION OVERLAYS
    ctx.font = '800 10px monospace';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(sim?.mode === 'walk' ? `THROTTLE SPEED: ${Math.round(sim.forceDial * 100)}%` : 'SYSTEM BENCH MODE: CALIBRATION IDLE', 20, 26);

    if (sim?.glassTipped) {
      ctx.font = '900 18px sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.fillText('💥 OOPS! BEAKER TIPPED!', w / 2, h * 0.2);
    }
  }

  _drawGlassBeaker(ctx, gx, gy, pitch, sim) {
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(pitch * 0.5);

    const bWidth = 26;
    const bHeight = 44;

    // Fluid Water Mass Volume Slosh Render calculations
    const fillRatio = sim?.water ?? 1;
    if (fillRatio > 0.01) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.beginPath();

      const fluidLevelY = -2 - (fillRatio * (bHeight - 8));
      const sloshAngleOffset = (sim?.slosh ?? 0) * 16;

      // Draw wave vertices sloping up and down the walls dynamically
      const leftWaveY = clamp(fluidLevelY - sloshAngleOffset, -bHeight + 4, -2);
      const rightWaveY = clamp(fluidLevelY + sloshAngleOffset, -bHeight + 4, -2);

      ctx.moveTo(-bWidth / 2 + 2, -2);
      ctx.lineTo(-bWidth / 2 + 2, leftWaveY);
      ctx.lineTo(bWidth / 2 - 2, rightWaveY);
      ctx.lineTo(bWidth / 2 - 2, -2);
      ctx.closePath();
      ctx.fill();

      // Fluid crest reflection highlight line
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-bWidth / 2 + 2, leftWaveY);
      ctx.lineTo(bWidth / 2 - 2, rightWaveY);
      ctx.stroke();
    }

    // Transparent Beaker glass frame contours
    ctx.strokeStyle = 'rgba(241, 245, 249, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    // Shape structural lip, neck tapers and flask wall angles
    ctx.moveTo(-bWidth / 2 - 2, -bHeight);
    ctx.lineTo(-bWidth / 2 + 1, -bHeight);
    ctx.lineTo(-bWidth / 2 + 1, -bHeight + 3);
    ctx.lineTo(-bWidth / 2 + 2, -2);
    ctx.lineTo(bWidth / 2 - 2, -2);
    ctx.lineTo(bWidth / 2 - 1, -bHeight + 3);
    ctx.lineTo(bWidth / 2 - 1, -bHeight);
    ctx.lineTo(bWidth / 2 + 2, -bHeight);
    ctx.stroke();

    // Beaker volumetric scale graduation tick marks
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    for (let y = -10; y > -bHeight + 8; y -= 10) {
      ctx.beginPath();
      ctx.moveTo(-bWidth / 2 + 4, y);
      ctx.lineTo(-bWidth / 2 + 8, y);
      ctx.stroke();
    }

    ctx.restore();
  }
}

/**
 * Rolling ticker-tape monitor component wrapper.
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
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();

    ctx.font = '800 9px monospace';
    ctx.fillStyle = this._active ? '#94a3b8' : '#334155';
    ctx.textAlign = 'left';
    ctx.fillText(this._label, 10, 14);

    if (!this._active) {
      ctx.font = '700 10px sans-serif';
      ctx.fillStyle = '#334155';
      ctx.fillText('CALIBRATION LINK OFF', 10, 34);
      return;
    }

    const pad = 10;
    const cw = w - pad * 2;
    const cy = h / 2 + 6;
    const scale = (h / 2 - 14) / Math.max(maxVal, 0.01);

    ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
    ctx.lineWidth = 1;
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