/**
 * ShoulderRenderer.js — Chapter 4 canvas renderers
 *
 * ShoulderGearRenderer: workbench gear-pair preview (animated clock hands)
 * ShoulderArmRenderer:  arm test animation (rotates arm image, shows load)
 */

import { GEAR_CARTRIDGES } from '../engine/ShoulderEngine.js';

function pitchRadiusForModule(teeth, module) {
  return teeth * module / (Math.PI * 2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* ── ShoulderGearRenderer ─────────────────────────────────────────────────── */

/**
 * Draws two meshing gears on a canvas with animated clock hands showing ratio.
 * Used on the workbench to preview the selected gear cartridge.
 */
export class ShoulderGearRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas  = canvas;
    this._ctx     = canvas.getContext('2d');
    this._gear    = null;   // current GEAR_CARTRIDGES entry
    this._stressColor = 'green';
    this._motorAngle = 0;
    this._raf     = null;
    this._dpr     = window.devicePixelRatio || 1;
    this._resize();
  }

  _resize() {
    const dpr = this._dpr;
    const rect = this._canvas.getBoundingClientRect();
    this._canvas.width  = rect.width  * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);
    this._w = rect.width;
    this._h = rect.height;
  }

  /** Set the active gear cartridge and start animating. */
  setGear(gearId) {
    this._gear = GEAR_CARTRIDGES[gearId] || null;
    this._motorAngle = 0;
    if (!this._raf) this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  setStressColor(stressColor) {
    this._stressColor = stressColor || 'green';
    this._draw();
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._draw();
  }

  _frame() {
    if (!this._gear) { this._raf = null; return; }
    this._motorAngle += 0.012;  // slow enough to see the teeth mesh
    this._draw();
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w, h = this._h;
    ctx.clearRect(0, 0, w, h);

    if (!this._gear) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = '14px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Select a gear cartridge', w / 2, h / 2);
      return;
    }

    const gear = this._gear;
    const ratio = gear.ratio;

    // Use a fixed tooth module for both gears. The previous implementation made
    // tooth height a percentage of gear radius, which looked acceptable for 1:1
    // but made the 3:1 and 6:1 arm-gear teeth huge. With a shared module, tooth
    // pitch and tooth height stay consistent across both gears.
    const motorBodyX = w * 0.07;
    const motorBodyW = clamp(w * 0.15, 105, 190);
    const motorBodyH = clamp(h * 0.20, 70, 120);
    const shaftStartX = motorBodyX + motorBodyW;
    const shaftMin = w * 0.12;
    const gearLeftMin = shaftStartX + shaftMin;
    const rightMargin = w * 0.07;
    const marginY = h * 0.055;
    const meshGap = 1.5;
    const toothAddFactor = 0.285;
    const toothDedFactor = 0.225;
    const availableGearW = Math.max(80, w - gearLeftMin - rightMargin);
    const moduleByW = (availableGearW - meshGap) /
      ((gear.motorTeeth + gear.armTeeth) / Math.PI + toothAddFactor * 2);
    const moduleByH = (h - marginY * 2) /
      (gear.armTeeth / Math.PI + toothAddFactor * 2);
    const module = Math.max(2.8, Math.min(18, moduleByW, moduleByH) * 1.18);
    const toothAdd = module * toothAddFactor;
    const toothDed = module * toothDedFactor;
    const mR = pitchRadiusForModule(gear.motorTeeth, module);
    const aR = pitchRadiusForModule(gear.armTeeth, module);

    const centerY    = h * 0.55;
    const centerGap  = mR + aR + meshGap;
    const pairOuterW = mR + toothAdd + centerGap + aR + toothAdd;
    const pairLeft = gearLeftMin + Math.max(0, (availableGearW - pairOuterW) / 2);
    const motorX = pairLeft + mR + toothAdd;
    const armX = motorX + centerGap;
    const motorBodyY = centerY - motorBodyH / 2;
    const motorGearTipR = mR + toothAdd;
    const sideGearW = clamp(motorGearTipR * 0.14, 8, 16);
    const sideViewGap = clamp(motorGearTipR * 0.28, 20, 42);
    const sideGearX = motorX - motorGearTipR - sideGearW - sideViewGap;

    // Phase: arm starts with a gap at π (contact side) so teeth interlock, not clash.
    const phaseOffset = Math.PI / gear.armTeeth;
    const armAngle    = -(this._motorAngle / ratio) + phaseOffset;

    this._drawMotorAndShaft(ctx, {
      x: motorBodyX,
      y: motorBodyY,
      w: motorBodyW,
      h: motorBodyH,
      shaftStartX,
      shaftEndX: sideGearX,
      shaftY: centerY,
      sideGearX,
      sideGearW,
      sideGearH: motorGearTipR * 2,
      stressColor: this._stressColor,
      motorAngle: this._motorAngle,
      motorTeeth: gear.motorTeeth,
    });

    // Draw arm gear first (behind), then motor shaft gear on top so motor teeth
    // appear in the shoulder gear valleys.
    this._drawGear(ctx, armX,   centerY, aR, armAngle,         '#9ab0cc', '#5a7088', gear.armTeeth,   toothAdd, toothDed);
    this._drawGear(ctx, motorX, centerY, mR, this._motorAngle, '#F0C866', '#B8902A', gear.motorTeeth, toothAdd, toothDed);

    // Clock hands
    this._drawHand(ctx, motorX, centerY, mR * 0.72, this._motorAngle, '#ff4444');
    this._drawHand(ctx, armX,   centerY, aR * 0.72, armAngle,         '#44aaff');

    // Tooth-count labels below each gear
    const lblSize = Math.max(9, Math.min(13, mR * 0.22)) | 0;
    ctx.font = `bold ${lblSize}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#d4a853';
    ctx.fillText(`${gear.motorTeeth}T`, motorX, centerY + mR + toothAdd + 5);
    ctx.fillStyle = '#7aa8cc';
    ctx.fillText(`${gear.armTeeth}T`,   armX,   centerY + aR + toothAdd + 5);

    // Ratio label near the front-view gears, away from the shaft and side view.
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font = 'bold 13px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${gear.ratio}:1`, (motorX + armX) / 2, centerY - Math.max(mR + toothAdd, aR + toothAdd) - 8);
  }

  _drawMotorAndShaft(ctx, layout) {
    const shaftH = 12;
    const stress = this._torquePalette(layout.stressColor);

    ctx.save();

    // Motor casing
    const motorGrad = ctx.createLinearGradient(layout.x, layout.y, layout.x, layout.y + layout.h);
    motorGrad.addColorStop(0, '#3b4454');
    motorGrad.addColorStop(0.55, '#222b39');
    motorGrad.addColorStop(1, '#151c29');
    ctx.fillStyle = motorGrad;
    ctx.beginPath();
    ctx.roundRect(layout.x, layout.y, layout.w, layout.h, 12);
    ctx.fill();
    ctx.strokeStyle = '#667386';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Motor base
    ctx.fillStyle = '#202838';
    ctx.beginPath();
    ctx.roundRect(layout.x - 10, layout.y + layout.h - 8, layout.w + 24, 18, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(160,180,205,0.45)';
    ctx.stroke();

    // Shaft
    const shaftGrad = ctx.createLinearGradient(0, layout.shaftY - shaftH / 2, 0, layout.shaftY + shaftH / 2);
    shaftGrad.addColorStop(0, stress.light);
    shaftGrad.addColorStop(0.5, stress.mid);
    shaftGrad.addColorStop(1, stress.light);
    ctx.fillStyle = shaftGrad;
    ctx.fillRect(layout.shaftStartX - 2, layout.shaftY - shaftH / 2, layout.shaftEndX - layout.shaftStartX + 4, shaftH);
    ctx.strokeStyle = stress.stroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(layout.shaftStartX - 2, layout.shaftY - shaftH / 2, layout.shaftEndX - layout.shaftStartX + 4, shaftH);

    // Side view of the motor shaft gear. This is the same gear shown front-on
    // just to the right, so its height and color match that gear.
    const gearY = layout.shaftY - layout.sideGearH / 2;
    const gearGrad = ctx.createLinearGradient(0, gearY, 0, gearY + layout.sideGearH);
    gearGrad.addColorStop(0, '#f5d675');
    gearGrad.addColorStop(0.5, '#F0C866');
    gearGrad.addColorStop(1, '#b8902a');
    ctx.fillStyle = gearGrad;
    ctx.strokeStyle = '#B8902A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(layout.sideGearX, gearY, layout.sideGearW, layout.sideGearH, 3);
    ctx.fill();
    ctx.stroke();

    this._drawSideGearToothEdges(ctx, layout, gearY);

    ctx.font = '700 12px Nunito, sans-serif';
    ctx.fillStyle = '#c8d5e5';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('MOTOR', layout.x + layout.w / 2, layout.y - 8);
    ctx.fillText('MOTOR SHAFT', (layout.shaftStartX + layout.shaftEndX) / 2, layout.shaftY - 16);

    ctx.restore();
  }

  _torquePalette(stressColor) {
    if (stressColor === 'red' || stressColor === 'stall') {
      return { light: '#ff8a79', mid: '#d83d32', stroke: '#ff5f4f' };
    }
    if (stressColor === 'yellow') {
      return { light: '#ffe27a', mid: '#d1a726', stroke: '#ffd34f' };
    }
    return { light: '#88f0a0', mid: '#2ec968', stroke: '#53e483' };
  }

  _drawSideGearToothEdges(ctx, layout, gearY) {
    const teeth = Math.max(1, layout.motorTeeth);
    const pitch = (Math.PI * 2) / teeth;
    const centerY = layout.shaftY;
    const halfH = layout.sideGearH / 2;
    const bandMaxH = Math.max(3, layout.sideGearH / teeth * 0.72);
    const bandMinH = Math.max(1.5, bandMaxH * 0.32);
    const x = layout.sideGearX + 1.5;
    const w = layout.sideGearW - 3;

    ctx.save();
    ctx.beginPath();
    ctx.rect(layout.sideGearX, gearY, layout.sideGearW, layout.sideGearH);
    ctx.clip();

    for (let i = 0; i < teeth; i++) {
      const theta = layout.motorAngle + i * pitch;
      const projection = Math.cos(theta);
      if (projection < 0) continue; // rear half is hidden by the opaque gear body
      const y = centerY - Math.sin(theta) * (halfH - bandMinH * 0.6);
      const h = bandMinH + (bandMaxH - bandMinH) * Math.abs(projection);
      const alpha = 0.28 + projection * 0.42;

      ctx.fillStyle = `rgba(77, 48, 0, ${alpha})`;
      ctx.beginPath();
      ctx.roundRect(x, y - h / 2, w, h, 1.5);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Draw a spur gear with proper root/tip circles so teeth can interlock.
   * Body fills from 0 → rRoot; teeth go rRoot → rTip; valleys arc at rRoot.
   *
   * @param {number} add - tooth height above pitch radius, in pixels
   * @param {number} ded - valley depth below pitch radius, in pixels
   */
  _drawGear(ctx, cx, cy, r, angle, fill, stroke, teeth, add, ded) {
    const rTip  = r + add;   // tooth tip
    const rRoot = Math.max(4, r - ded);   // tooth root / valley
    const pitch = (2 * Math.PI) / teeth;
    const hw    = pitch * 0.22;    // half tooth-width at root (44% of pitch)
    const hwt   = pitch * 0.17;    // half tooth-width at tip  (34% — slight taper)

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    ctx.beginPath();

    for (let i = 0; i < teeth; i++) {
      const a = i * pitch;           // tooth centre angle
      const rootL = a - hw;          // root left edge of this tooth
      const rootR = a + hw;          // root right edge
      const tipL  = a - hwt;
      const tipR  = a + hwt;
      const prevR = a - pitch + hw;  // root right edge of previous tooth

      if (i === 0) {
        ctx.moveTo(Math.cos(rootL) * rRoot, Math.sin(rootL) * rRoot);
      } else {
        // Valley arc at root radius from previous tooth's right edge to this tooth's left edge
        ctx.arc(0, 0, rRoot, prevR, rootL);
      }

      // Flank up, flat tip arc, flank down
      ctx.lineTo(Math.cos(tipL) * rTip, Math.sin(tipL) * rTip);
      ctx.arc(0, 0, rTip, tipL, tipR);
      ctx.lineTo(Math.cos(rootR) * rRoot, Math.sin(rootR) * rRoot);
    }

    // Final valley arc wrapping back to start of tooth 0
    ctx.arc(0, 0, rRoot, (teeth - 1) * pitch + hw, 2 * Math.PI - hw);
    ctx.closePath();

    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, r * 0.018);
    ctx.stroke();

    // Hub disc
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.20, 0, Math.PI * 2);
    ctx.fillStyle = stroke;
    ctx.fill();

    ctx.restore();
  }

  _drawHand(ctx, cx, cy, len, angle, color) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle - Math.PI / 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -len);
    ctx.stroke();
    ctx.restore();
  }
}


/* ── ShoulderArmRenderer ──────────────────────────────────────────────────── */

const ARM_IMAGES = {
  arm:   'swirle-left-arm-exposed-transparent.png',
  load7:  'arm-load-7kg.png',
  load10: 'arm-load-10kg.png',
  load15: 'arm-load-15kg.png',
};

const LOAD_IMAGE_MAP = { fast: 'load7', balanced: 'load10', strong: 'load15' };

/**
 * Animates SWIRL-E's arm raising (or failing to raise) a load.
 * Arm rotates around its left edge pivot point.
 */
export class ShoulderArmRenderer {
  constructor(canvas, assetBase) {
    this._canvas    = canvas;
    this._ctx       = canvas.getContext('2d');
    this._base      = assetBase;
    this._dpr       = window.devicePixelRatio || 1;
    this._images    = {};
    this._raf       = null;
    this._phase     = 'idle';   // idle | raising | holding | lowering | stall | done
    this._angle     = 0;        // current arm rotation (radians from rest)
    this._targetAngle = 0;
    this._time      = 0;
    this._outcome   = null;
    this._jobId     = null;
    this._onDone    = null;
    this._resize();
    this._preload();
  }

  _resize() {
    const dpr = this._dpr;
    const rect = this._canvas.getBoundingClientRect();
    this._canvas.width  = rect.width  * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);
    this._w = rect.width;
    this._h = rect.height;
  }

  _preload() {
    const load = (key, file) => {
      const img = new Image();
      img.src = this._base + file;
      img.onload = () => { this._images[key] = img; };
    };
    Object.entries(ARM_IMAGES).forEach(([k, f]) => load(k, f));
  }

  /**
   * Run the arm animation.
   * @param {string} jobId     - 'fast' | 'balanced' | 'strong'
   * @param {string} outcome   - 'success' | 'stall' | 'too-hot'
   * @param {Function} onDone  - called when animation finishes
   */
  run(jobId, outcome, onDone) {
    this._jobId   = jobId;
    this._outcome = outcome;
    this._onDone  = onDone;
    this._angle   = 0;
    this._time    = 0;
    this._phase   = outcome === 'stall' ? 'stall' : 'raising';
    if (!this._raf) this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  _frame() {
    this._time++;
    this._tick();
    this._draw();
    if (this._phase !== 'done') {
      this._raf = requestAnimationFrame(this._frame.bind(this));
    } else {
      this._raf = null;
      if (this._onDone) this._onDone();
    }
  }

  _tick() {
    const RAISE_SPEED = this._outcome === 'too-hot' ? 0.04 : 0.025;
    const TARGET_UP   = -Math.PI * 0.45;  // ~80° raised

    switch (this._phase) {
      case 'raising':
        this._angle = Math.max(this._angle + TARGET_UP * RAISE_SPEED, TARGET_UP);
        if (Math.abs(this._angle - TARGET_UP) < 0.01) {
          this._phase = 'holding';
          this._time  = 0;
        }
        break;
      case 'holding':
        if (this._time > 60) { this._phase = 'lowering'; this._time = 0; }
        break;
      case 'lowering':
        this._angle = Math.min(this._angle + 0.04, 0);
        if (this._angle >= 0) this._phase = 'done';
        break;
      case 'stall':
        // Vibrate without rising
        this._angle = Math.sin(this._time * 0.4) * 0.04;
        if (this._time > 90) this._phase = 'done';
        break;
    }
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._w, h = this._h;
    ctx.clearRect(0, 0, w, h);

    // Background hint
    ctx.fillStyle = 'rgba(10,20,50,0.35)';
    ctx.roundRect(8, 8, w - 16, h - 16, 16);
    ctx.fill();

    // Stress color overlay for too-hot
    if (this._outcome === 'too-hot' && this._phase !== 'done') {
      const glow = ctx.createRadialGradient(w * 0.3, h * 0.5, 0, w * 0.3, h * 0.5, w * 0.4);
      glow.addColorStop(0, 'rgba(255,60,0,0.18)');
      glow.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }

    const armImg  = this._images.arm;
    const loadKey = LOAD_IMAGE_MAP[this._jobId] || 'load7';
    const loadImg = this._images[loadKey];

    if (!armImg) {
      // Placeholder while images load
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '16px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Loading arm…', w / 2, h / 2);
      return;
    }

    // Draw arm rotated around its left-edge pivot
    const armW   = Math.min(w * 0.55, 280);
    const armH   = armW * (armImg.naturalHeight / armImg.naturalWidth);
    const pivotX = w * 0.25;
    const pivotY = h * 0.55;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(this._angle);
    ctx.drawImage(armImg, 0, -armH * 0.5, armW, armH);

    // Load hangs at end of arm
    if (loadImg && this._phase !== 'stall') {
      const loadW = armW * 0.28;
      const loadH = loadW * (loadImg.naturalHeight / loadImg.naturalWidth);
      ctx.drawImage(loadImg, armW - loadW * 0.5, armH * 0.1, loadW, loadH);
    }

    ctx.restore();

    // Outcome label
    if (this._phase === 'holding' || this._phase === 'done') {
      const labels = {
        success:  { text: 'Lifted!',    color: '#40e880' },
        'too-hot':{ text: 'Too Hot!',   color: '#ff8844' },
        stall:    { text: 'Stalled!',   color: '#ff4444' },
      };
      const lbl = labels[this._outcome];
      if (lbl) {
        ctx.font = 'bold 28px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = lbl.color;
        ctx.fillText(lbl.text, w * 0.65, h * 0.3);
      }
    }

    // Stall: show strain lines
    if (this._phase === 'stall' && this._time > 20) {
      ctx.strokeStyle = 'rgba(255,60,60,0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const ox = w * 0.28 + i * 14 - 14;
        const oy = h * 0.42;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + 8, oy - 12);
        ctx.lineTo(ox + 4, oy - 12);
        ctx.lineTo(ox + 12, oy - 24);
        ctx.stroke();
      }
    }
  }
}
