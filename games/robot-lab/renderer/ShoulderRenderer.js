/**
 * ShoulderRenderer.js — Chapter 4 canvas renderers
 *
 * ShoulderGearRenderer: workbench gear-pair preview (animated clock hands)
 * ShoulderArmRenderer:  arm test animation (rotates arm image, shows load)
 */

import { GEAR_CARTRIDGES, VOLTAGE_SETTINGS } from '../engine/ShoulderEngine.js';

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
    this._stalled = false;
    this._heat = 'Cool';
    this._voltageFactor = 1.0;   // motor speed multiplier from voltage selection
    this._loadKg = null;
    this._loadLb = null;
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

  setStalled(stalled) {
    this._stalled = Boolean(stalled);
    this._draw();
  }

  setHeat(heat) {
    this._heat = heat || 'Cool';
    this._draw();
  }

  setLoad(load) {
    this._loadKg = load?.kg ?? null;
    this._loadLb = load?.lb ?? null;
    this._draw();
  }

  /** Set motor speed multiplier from voltage selection (or null to reset). */
  setVoltage(voltId) {
    const v = voltId ? VOLTAGE_SETTINGS[voltId] : null;
    this._voltageFactor = v ? v.powerFactor : 1.0;
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    this._draw();
  }

  _frame() {
    if (!this._gear) { this._raf = null; return; }
    // Voltage scales motor RPM. Stress (heavy load) drags it down a bit.
    const stressDrag = this._stalled                  ? 0.22
                     : this._stressColor === 'red'    ? 0.65
                     : this._stressColor === 'yellow' ? 0.85
                     :                                  1.0;
    this._motorAngle += 0.012 * this._voltageFactor * stressDrag;
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
    const liftZoneW = clamp(w * 0.18, 104, 165);
    const rightMargin = w * 0.045 + liftZoneW;
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
      heat: this._heat,
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
    ctx.fillText(gear.displayRatio || `${gear.ratio}:1`, (motorX + armX) / 2, centerY - Math.max(mR + toothAdd, aR + toothAdd) - 8);

    this._drawLiftDemo(ctx, {
      x: w - liftZoneW + 8,
      y: h * 0.10,
      w: liftZoneW - 16,
      h: h * 0.80,
      ratio,
    });
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

    this._drawMotorHeat(ctx, layout);

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
    this._drawShaftTorque(ctx, layout, shaftH, stress);
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
    ctx.fillText('MAIN SHAFT', (layout.shaftStartX + layout.shaftEndX) / 2, layout.shaftY - 16);

    ctx.restore();
  }

  _drawMotorHeat(ctx, layout) {
    const level = layout.heat === 'Hot' ? 3
      : layout.heat === 'Warm' ? 2
        : 1;
    const colors = ['#4fe080', '#ffd257', '#ff5a42'];
    const x = layout.x + layout.w - 42;
    const y = layout.y + 14;

    if (layout.heat === 'Warm' || layout.heat === 'Hot') {
      const pulse = layout.heat === 'Hot'
        ? 0.65 + 0.35 * Math.sin(layout.motorAngle * 8)
        : 0.45;
      const glow = ctx.createRadialGradient(
        layout.x + layout.w * 0.54, layout.y + layout.h * 0.50, 0,
        layout.x + layout.w * 0.54, layout.y + layout.h * 0.50, layout.w * 0.65,
      );
      glow.addColorStop(0, `rgba(255, 92, 48, ${layout.heat === 'Hot' ? 0.26 * pulse : 0.14})`);
      glow.addColorStop(1, 'rgba(255, 92, 48, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(layout.x - 18, layout.y - 18, layout.w + 36, layout.h + 36);
    }

    ctx.save();
    ctx.font = '800 8px Orbitron, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(220,235,255,0.78)';
    ctx.fillText('HEAT', x + 18, y - 4);

    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < level ? colors[i] : 'rgba(210,225,245,0.16)';
      ctx.strokeStyle = 'rgba(220,235,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x + i * 13, y, 9, 26 - i * 6, 3);
      ctx.fill();
      ctx.stroke();
    }

    if (layout.heat === 'Hot') {
      ctx.fillStyle = '#ff6a48';
      for (let i = 0; i < 3; i++) {
        const t = (layout.motorAngle * 18 + i * 16) % 48;
        const puffX = layout.x + layout.w * (0.24 + i * 0.18);
        const puffY = layout.y - 4 - t * 0.55;
        const alpha = Math.max(0, 0.38 - t * 0.008);
        ctx.fillStyle = `rgba(255, 122, 82, ${alpha})`;
        ctx.beginPath();
        ctx.arc(puffX, puffY, 4 + t * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _torquePalette(stressColor) {
    if (stressColor === 'red' || stressColor === 'stall') {
      return { light: '#ff8a79', mid: '#d83d32', stroke: '#ff5f4f', twistAlpha: 0.78 };
    }
    if (stressColor === 'yellow') {
      return { light: '#ffe27a', mid: '#d1a726', stroke: '#ffd34f', twistAlpha: 0.55 };
    }
    return { light: '#88f0a0', mid: '#2ec968', stroke: '#53e483', twistAlpha: 0.32 };
  }

  _drawShaftTorque(ctx, layout, shaftH, stress) {
    const x = layout.shaftStartX - 2;
    const y = layout.shaftY - shaftH / 2;
    const w = layout.shaftEndX - layout.shaftStartX + 4;
    const spacing = 28;
    const slant = 18;
    const phase = (layout.motorAngle * 18) % spacing;

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, shaftH);
    ctx.clip();

    ctx.globalAlpha = stress.twistAlpha;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let stripeX = x - spacing + phase; stripeX < x + w + spacing; stripeX += spacing) {
      ctx.beginPath();
      ctx.moveTo(stripeX, y + shaftH + 1);
      ctx.lineTo(stripeX + slant, y - 1);
      ctx.stroke();
    }

    ctx.globalAlpha = stress.twistAlpha * 0.75;
    ctx.strokeStyle = stress.stroke;
    ctx.lineWidth = 1.3;
    for (let stripeX = x - spacing + phase + spacing / 2; stripeX < x + w + spacing; stripeX += spacing) {
      ctx.beginPath();
      ctx.moveTo(stripeX, y + shaftH + 1);
      ctx.lineTo(stripeX + slant, y - 1);
      ctx.stroke();
    }

    ctx.restore();
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

  _drawLiftDemo(ctx, layout) {
    const stalled = this._stalled;
    const progress = stalled ? 0 : this._liftProgress(layout.ratio);
    const stress = this._torquePalette(this._stressColor);
    const railX = layout.x + layout.w * 0.38;
    const topY = layout.y + 24;
    const bottomY = layout.y + layout.h - 30;
    const travel = Math.max(1, bottomY - topY);
    const shudder = stalled ? Math.sin(this._motorAngle * 90) * 3 : 0;
    const loadY = bottomY - progress * travel + Math.abs(shudder) * 0.7;
    const loadH = clamp(layout.h * 0.16, 34, 54);
    const topW = clamp(layout.w * 0.44, 38, 58);
    const bottomW = clamp(layout.w * 0.68, 54, 84);
    const loadX = clamp(layout.x + layout.w * 0.58, railX + bottomW * 0.45, layout.x + layout.w - bottomW * 0.50) + shudder;
    const shoulderX = layout.x + 14 + shudder;
    const shoulderY = loadY - loadH * 0.18;
    const label = this._loadKg == null
      ? 'LOAD'
      : `${this._loadKg} kg`;

    ctx.save();

    ctx.strokeStyle = 'rgba(170,205,240,0.30)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(railX, topY);
    ctx.lineTo(railX, bottomY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(240,200,102,0.48)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(railX - 10, topY);
    ctx.lineTo(railX + 10, topY);
    ctx.moveTo(railX - 10, bottomY);
    ctx.lineTo(railX + 10, bottomY);
    ctx.stroke();

    // A compact arm in the preview makes the load's lift speed visible while
    // the full-size test animation remains focused on SWIRL-E.
    ctx.strokeStyle = stress.stroke;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoulderX, shoulderY);
    ctx.lineTo(railX, shoulderY);
    ctx.lineTo(loadX, loadY - loadH * 0.38);
    ctx.stroke();

    ctx.fillStyle = '#182234';
    ctx.strokeStyle = 'rgba(220,235,255,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(shoulderX, shoulderY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(220,235,255,0.82)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(loadX, loadY - loadH * 0.38);
    ctx.lineTo(loadX, loadY - loadH * 0.05);
    ctx.stroke();

    const grad = ctx.createLinearGradient(0, loadY - loadH / 2, 0, loadY + loadH / 2);
    grad.addColorStop(0, '#e7bd5f');
    grad.addColorStop(1, '#b9872e');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#f3d077';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(loadX - topW / 2, loadY - loadH / 2);
    ctx.lineTo(loadX + topW / 2, loadY - loadH / 2);
    ctx.lineTo(loadX + bottomW / 2, loadY + loadH / 2);
    ctx.lineTo(loadX - bottomW / 2, loadY + loadH / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.font = '800 12px Nunito, sans-serif';
    const labelW = ctx.measureText(label).width;
    if (labelW <= bottomW - 8) {
      ctx.fillStyle = '#102033';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, loadX, loadY + 1);
    } else {
      const tagX = Math.min(layout.x + layout.w - labelW / 2 - 7, loadX + bottomW / 2 + labelW / 2 + 8);
      ctx.fillStyle = 'rgba(8,18,38,0.86)';
      ctx.beginPath();
      ctx.roundRect(tagX - labelW / 2 - 6, loadY - 11, labelW + 12, 22, 7);
      ctx.fill();
      ctx.fillStyle = '#f6d979';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, tagX, loadY + 1);
    }

    ctx.fillStyle = 'rgba(205,225,248,0.70)';
    ctx.font = '700 10px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(stalled ? 'STALLED' : 'LIFT', railX, layout.y + 2);

    if (stalled) {
      ctx.fillStyle = 'rgba(255, 74, 58, 0.18)';
      ctx.strokeStyle = '#ff5a42';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(layout.x + 4, bottomY - loadH - 16, layout.w - 8, loadH + 30, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff8676';
      ctx.font = '900 10px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('TOO HEAVY', layout.x + layout.w / 2, bottomY - loadH - 20);
    }

    ctx.restore();
  }

  _liftProgress(ratio) {
    const outputTurns = this._motorAngle / Math.max(0.001, ratio) / (Math.PI * 2);
    return outputTurns - Math.floor(outputTurns);
  }
}


/* ── ShoulderArmRenderer ──────────────────────────────────────────────────── */

const ARM_IMAGES = {
  arm:    'swirle-left-arm-exposed-transparent.png',
  bg:     'shoulder-arm-test-bg.png',
  load7:  'arm-load-7kg-transparent.png',
  load10: 'arm-load-10kg-transparent.png',
  load15: 'arm-load-15kg-transparent.png',
};

const LOAD_IMAGE_MAP = { fast: 'load7', balanced: 'load10', strong: 'load15', overload: 'load15' };

/**
 * Animates SWIRL-E's arm raising (or failing to raise) a load.
 * Arm rotates around the shoulder pivot. The source arm image has the hand on
 * the left and shoulder on the right, so rendering flips it to match SWIRL-E.
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
    this._speedFactor = 0.5;
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
   * @param {string} outcome   - 'success' | 'stall' | 'too-hot' | 'unsafe-load'
   * @param {number} speedFactor - 0..1 arm output speed from gear, voltage, load
   * @param {Function} onDone  - called when animation finishes
   */
  run(jobId, outcome, speedFactor, onDone) {
    this.stop();
    this._jobId       = jobId;
    this._outcome     = outcome;
    this._speedFactor = typeof speedFactor === 'number' ? speedFactor : 0.5;
    this._onDone      = onDone;
    this._angle       = 0;
    this._time        = 0;
    this._phase       = (outcome === 'stall' || outcome === 'unsafe-load') ? 'stall' : 'raising';
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
    const TARGET_UP   = -Math.PI * 0.45;  // ~80° raised
    const speedFactor = clamp(this._speedFactor, 0.04, 1);
    // Inverse mapping: raiseFrames = base / factor, so a factor of 0.1 takes
    // 10× as long as a factor of 1.0. This amplifies the difference between
    // 1:1+9V (≈0.5 s) and 6:1+3V (≈6 s) so the gear ratio is obvious.
    // "Too hot" overrides — the motor runs jerky-fast regardless of factor.
    const raiseFrames = this._outcome === 'too-hot'
      ? clamp(Math.round(40 / Math.max(0.5, speedFactor)), 30, 90)
      : clamp(Math.round(35 / speedFactor), 30, 360);
    const lowerFrames = Math.max(24, Math.round(raiseFrames * 0.55));
    const raiseStep = Math.abs(TARGET_UP) / raiseFrames;
    const lowerStep = Math.abs(TARGET_UP) / lowerFrames;

    switch (this._phase) {
      case 'raising':
        this._angle = Math.max(this._angle - raiseStep, TARGET_UP);
        if (Math.abs(this._angle - TARGET_UP) < 0.01) {
          this._phase = 'holding';
          this._time  = 0;
        }
        break;
      case 'holding':
        if (this._time > 60) { this._phase = 'lowering'; this._time = 0; }
        break;
      case 'lowering':
        this._angle = Math.min(this._angle + lowerStep, 0);
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

    const bgImg = this._images.bg;
    if (bgImg) {
      this._drawCoverImage(ctx, bgImg, 8, 8, w - 16, h - 16, 16);
      ctx.fillStyle = 'rgba(5,12,28,0.32)';
      ctx.fillRect(8, 8, w - 16, h - 16);
    } else {
      ctx.fillStyle = 'rgba(10,20,50,0.35)';
      ctx.roundRect(8, 8, w - 16, h - 16, 16);
      ctx.fill();
    }

    // Hot motor: red pulsing glow at the shoulder + steam puffs
    if (this._outcome === 'too-hot' && this._phase !== 'done') {
      const pulse = 0.55 + 0.45 * Math.sin(this._time * 0.18);
      const glow = ctx.createRadialGradient(w * 0.25, h * 0.55, 0, w * 0.25, h * 0.55, w * 0.45);
      glow.addColorStop(0, `rgba(255,80,20,${0.30 * pulse})`);
      glow.addColorStop(0.6, `rgba(255,40,0,${0.10 * pulse})`);
      glow.addColorStop(1, 'rgba(255,40,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // Steam puffs rising from the shoulder
      ctx.save();
      const baseX = w * 0.25;
      const baseY = h * 0.45;
      for (let i = 0; i < 3; i++) {
        const t = (this._time + i * 25) % 75;
        const py = baseY - t * 1.4;
        const px = baseX + Math.sin(t * 0.08 + i) * 12;
        const r  = 8 + t * 0.32;
        const a  = Math.max(0, 0.55 - t * 0.007);
        ctx.fillStyle = `rgba(255,200,180,${a})`;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
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

    // Draw arm rotated around the shoulder joint. The arm source image is
    // backwards for this scene, so flip it so shoulder is on the left.
    const armW   = Math.min(w * 0.55, 280);
    const armH   = armW * (armImg.naturalHeight / armImg.naturalWidth);
    const pivotX = w * 0.25;
    const pivotY = h * 0.55;

    ctx.save();
    ctx.translate(pivotX, pivotY);
    ctx.rotate(this._angle);
    ctx.scale(-1, 1);
    ctx.drawImage(armImg, -armW, -armH * 0.5, armW, armH);
    ctx.restore();

    const handX = pivotX + Math.cos(this._angle) * armW;
    const handY = pivotY + Math.sin(this._angle) * armW;

    // Load hangs at end of arm
    if (this._jobId === 'ultralight' && this._phase !== 'stall') {
      this._drawTinyGrabItem(ctx, handX, handY, armW);
    } else if (loadImg && this._phase !== 'stall') {
      const loadW = armW * 0.28;
      const loadH = loadW * (loadImg.naturalHeight / loadImg.naturalWidth);
      ctx.strokeStyle = 'rgba(220,235,245,0.82)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(handX, handY);
      ctx.lineTo(handX, handY + loadH * 0.22);
      ctx.stroke();
      ctx.drawImage(loadImg, handX - loadW / 2, handY + loadH * 0.22, loadW, loadH);
    }

    // Outcome label
    if (this._phase === 'holding' || this._phase === 'done') {
      const labels = {
        success:  { text: 'Remembered!', color: '#40e880' },
        'unsafe-load': { text: 'Unsafe Load!', color: '#ff8844' },
        'too-hot':{ text: 'Too Hot!',    color: '#ff8844' },
        mismatch: { text: 'Mismatch!',   color: '#ffcc44' },
        stall:    { text: 'Stalled!',    color: '#ff4444' },
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

  _drawTinyGrabItem(ctx, handX, handY, armW) {
    const len = armW * 0.24;
    const thick = Math.max(5, armW * 0.025);
    ctx.save();
    ctx.translate(handX, handY + thick * 5);
    ctx.rotate(-0.35);

    const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
    grad.addColorStop(0, '#f4c34f');
    grad.addColorStop(0.75, '#f6d772');
    grad.addColorStop(1, '#d98f42');
    ctx.fillStyle = grad;
    ctx.strokeStyle = 'rgba(65,45,20,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-len / 2, -thick / 2, len, thick, thick / 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2d3748';
    ctx.beginPath();
    ctx.moveTo(len / 2, -thick / 2);
    ctx.lineTo(len / 2 + thick * 1.4, 0);
    ctx.lineTo(len / 2, thick / 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f4a3a3';
    ctx.fillRect(-len / 2 - thick * 1.2, -thick / 2, thick * 1.2, thick);
    ctx.restore();
  }

  _drawCoverImage(ctx, img, x, y, w, h, radius) {
    const srcRatio = img.naturalWidth / img.naturalHeight;
    const dstRatio = w / h;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (srcRatio > dstRatio) {
      sw = img.naturalHeight * dstRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / dstRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }
}
