/**
 * ArmMotorRenderer — canvas visualization for Robot Lab Chapter 4.
 *
 * New layout (W=1120, H=700):
 *   x   0–270  SWIRL-E portrait, fades right
 *   x 278–426  Gear selection cards (3 stacked, clickable)
 *   x 432–536  Motor housing + orange shaft
 *   x 575+     Driver gear → driven gear → arm → hanging load
 *
 * Gear selection is done entirely inside the canvas — no sidebar.
 * Live readout values are pushed to HTML via the onFrame callback.
 *
 * Torque flow color code:
 *   Orange → motor shaft (fast, low torque)
 *   Blue   → arm shaft  (slow, high torque)
 */

import { ARM_LOAD, GEAR_SET } from '../engine/MotorEngine.js';

const ASSET_BASE = 'games/robot-lab/assets/images/';
const W = 1120;
const H = 700;
const GEAR_PITCH = 12;

const DRIVER = { x: 575, y: 350 };
const GEAR_SEPARATION = 10;

const ARM_MIN_DEG = -46;
const ARM_MAX_DEG = 20;

const HOUSING = { x: 432, y: 316, w: 104, h: 68 };

// Gear option cards: left-center column of canvas.
const GEAR_CARD_X = 278;
const GEAR_CARD_W = 148;
const GEAR_CARDS = [
  { id: 'fast',     y:  90, h: 158 },
  { id: 'balanced', y: 258, h: 158 },
  { id: 'strong',   y: 426, h: 158 },
];

const ASSETS = {
  base:        'motor-gear-bench-base.png',
  swirle:      'swirle-powered.png',
  swirleReact: 'swirle-looking-sideways.png',
  loadLight:   'load-apple-basket.png',
  loadMedium:  'load-seed-crate.png',
  loadHeavy:   'load-watering-can.png',
};

export class ArmMotorRenderer {
  constructor(canvas, options = {}) {
    this.canvas        = canvas;
    this.ctx           = canvas.getContext('2d');
    this.onGearSelect  = options.onGearSelect ?? null;
    this.onFrame       = options.onFrame      ?? null;
    this.assets        = {};
    this.state         = null;
    this.mission       = null;
    this._outcome      = null;
    this._raf          = 0;
    this._ambientRaf   = 0;
    this._playing      = false;
    this._frame = {
      driverTurns:    0,
      armLift:        0,
      manualArmTurns: 0,
      caption:        '',
      shake:          0,
      crash:          false,
    };
    this._drag            = null;
    this._onPointerDown   = this._handlePointerDown.bind(this);
    this._onPointerMove   = this._handlePointerMove.bind(this);
    this._onPointerUp     = this._handlePointerUp.bind(this);
    this._setupCanvas();
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.style.touchAction = 'none';
    this._startAmbientLoop();
  }

  async loadAssets() {
    await Promise.all(Object.entries(ASSETS).map(async ([key, file]) => {
      this.assets[key] = await loadImage(`${ASSET_BASE}${file}`);
    }));
    this.drawIdle();
  }

  destroy() {
    cancelAnimationFrame(this._raf);
    cancelAnimationFrame(this._ambientRaf);
    this._raf        = 0;
    this._ambientRaf = 0;
    this._playing    = false;
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup',   this._onPointerUp);
  }

  setState(state, mission = null) {
    this.state   = state;
    this.mission = mission;
    this._outcome = null;
    if (!this._playing) this.drawIdle();
  }

  drawIdle() {
    this._frame = {
      driverTurns:    0,
      armLift:        0,
      manualArmTurns: 0,
      caption:        'Pick a gear set, set the voltage, then test the lift.',
      shake:          0,
      crash:          false,
    };
    this._draw(this._frame);
  }

  playFreeRun({ onComplete } = {}) {
    const stress = this.state?.stress ?? 1;
    const speed  = this.state?.outputSpeed ?? 1;
    this._outcome = null;
    this._play({
      duration: clamp(3600 / Math.max(0.18, speed), 3200, 7200),
      frame: (t) => {
        const p = easeInOut(clamp(t / clamp(2800 / Math.max(0.18, speed), 2500, 6200)));
        return {
          driverTurns:    p * (this.state?.ratio ?? 1),
          armLift:        p,
          manualArmTurns: 0,
          caption: stress > 1
            ? 'The gear train strains through the full lift.'
            : 'The motor runs the arm from low to high.',
          shake: stress > 1 ? 2.2 : 0,
          crash: false,
        };
      },
      onComplete,
    });
  }

  playLift(outcome, { onEvent, onComplete } = {}) {
    this._outcome = outcome;
    const duration = outcome === 'crash' ? 5000 : 3400;
    const fired    = new Set();
    const events   = outcome === 'crash' ? [{ name: 'crash', at: 850 }] : [];
    const speed    = this.state?.outputSpeed ?? 1;

    this._play({
      duration,
      frame: (t) => {
        const p = clamp(t / (outcome === 'slow' ? 2700 : 1500));
        let lift    = 0;
        let shake   = 0;
        let caption = 'Testing lift under load.';

        switch (outcome) {
          case 'stall':
            lift    = 0.06 * Math.sin(t * 0.025) + 0.08 * easeOut(p);
            shake   = 2.5;
            caption = 'Not enough torque. The arm can\'t lift this load.';
            break;

          case 'strain':
            lift    = 0.38 * easeOut(p);
            shake   = 3.5 * (1 - clamp((t - 1200) / 1200));
            caption = 'It moves — but that stress is in the red.';
            break;

          case 'wobble':
            lift    = 0.78 * easeOutBack(p) + Math.sin(t * 0.035) * 0.07;
            shake   = t > 800 ? 2 : 0;
            caption = 'Fast gear: speed wins, control suffers.';
            break;

          case 'crash': {
            if (t < 850) {
              lift    = 1.30 * easeOut(clamp(t / 700));
              shake   = 3;
              caption = 'Full power + fast gears — way too fast!';
            } else if (t < 2200) {
              lift    = 1.30 - 0.12 * easeOut(clamp((t - 850) / 800));
              shake   = 5;
              caption = 'Past the stop! Things are flying off the shelf!';
            } else {
              lift    = 1.18 - 0.40 * easeInOut(clamp((t - 2200) / 1500));
              shake   = clamp(1 - (t - 2200) / 1500) * 3;
              caption = 'Sorry Grandpa… maybe a slower gear next time?';
            }
            break;
          }

          case 'slam':
            lift    = 0.96 * easeOutBack(p);
            shake   = t > 900 && t < 1600 ? 3.5 : 0;
            caption = 'It lifts — but hits the stop too hard.';
            break;

          case 'slow':
            lift    = 0.74 * easeInOut(p);
            caption = 'Strong gear: high torque, but too slow for this job.';
            break;

          case 'success':
            lift    = 0.82 * easeInOut(p);
            caption = 'Balanced gear: enough torque with controlled speed.';
            break;

          default:
            lift    = 0.70 * easeInOut(p);
            caption = 'This setup works, but not within the mission target.';
        }

        const stress = this.state?.stress ?? 1;
        return {
          driverTurns:    t / Math.max(360, 620 / speed),
          armLift:        Math.max(0, Math.min(1.35, lift)),
          manualArmTurns: 0,
          caption,
          shake:          shake + (stress > 1 ? 1.2 : 0),
          crash:          outcome === 'crash' && t > 850,
        };
      },
      events,
      onEvent,
      onComplete,
      fired,
    });
  }

  // ─── Internal animation loop ──────────────────────────────────────────────

  _play({ duration, frame, events = [], onEvent, onComplete, fired = new Set() }) {
    cancelAnimationFrame(this._raf);
    this._raf  = 0;
    this._drag = null;
    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup',   this._onPointerUp);
    this._playing = true;
    const start   = performance.now();
    const tick = (now) => {
      const t    = now - start;
      const next = frame(t);
      this._frame = next;
      this._draw(next);
      for (const ev of events) {
        if (t >= ev.at && !fired.has(ev.name)) {
          fired.add(ev.name);
          onEvent?.(ev.name);
        }
      }
      if (t < duration) {
        this._raf = requestAnimationFrame(tick);
        return;
      }
      this._playing = false;
      this._raf     = 0;
      onComplete?.();
    };
    this._raf = requestAnimationFrame(tick);
  }

  _setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width  = W * dpr;
    this.canvas.height = H * dpr;
    this.canvas.style.aspectRatio = `${W} / ${H}`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _startAmbientLoop() {
    const tick = () => {
      if (!this._playing && !this._drag && this.state) this._draw(this._frame);
      this._ambientRaf = requestAnimationFrame(tick);
    };
    this._ambientRaf = requestAnimationFrame(tick);
  }

  // ─── Master draw ──────────────────────────────────────────────────────────

  _draw(frame) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, W, H);
    const jx = frame.shake ? Math.sin(performance.now() * 0.09) * frame.shake : 0;
    const jy = frame.shake ? Math.cos(performance.now() * 0.08) * frame.shake * 0.4 : 0;
    ctx.save();
    ctx.translate(jx, jy);

    this._drawBackground(ctx);
    this._drawSwirlE(ctx, frame);
    this._drawGearOptions(ctx);
    this._drawMotorHousing(ctx, frame);
    this._drawMotorShaft(ctx, frame);
    this._drawInstalledGearTrain(ctx, frame, 'plate');
    this._drawArmAndLoad(ctx, frame);
    this._drawInstalledGearTrain(ctx, frame, 'gears');
    this._drawCrashEffects(ctx, frame);
    this._drawCaption(ctx, frame.caption);

    ctx.restore();

    // Push live values to HTML readout
    if (this.onFrame && this.state) {
      const drivenTurns = gearTurns(frame, this.state);
      this.onFrame({
        motorTurns: frame.driverTurns,
        armTurns:   drivenTurns,
        torque:     this.state.ratio,
        speed:      this.state.outputSpeed,
        stress:     this.state.stress,
        caption:    frame.caption,
      });
    }
  }

  // ─── Background ───────────────────────────────────────────────────────────

  _drawBackground(ctx) {
    const base = this.assets.base;
    if (base) {
      ctx.drawImage(base, 0, 0, W, H);
      ctx.fillStyle = 'rgba(3, 9, 22, 0.72)';
      ctx.fillRect(0, 0, W, H);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,    '#071426');
      bg.addColorStop(0.55, '#0c2342');
      bg.addColorStop(1,    '#2c2118');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  // ─── SWIRL-E portrait (left zone, fades into gear card area) ─────────────

  _drawSwirlE(ctx, frame) {
    const useReact = frame.crash && this.assets.swirleReact;
    const img      = useReact ? this.assets.swirleReact : this.assets.swirle;
    if (!img) return;

    ctx.save();
    const drawW  = 280;
    const aspect = img.naturalHeight / Math.max(1, img.naturalWidth);
    const drawH  = drawW * aspect;
    const drawX  = -10;
    const drawY  = H / 2 - drawH * 0.52;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Fade right edge so portrait blends into gear-card zone
    const fade = ctx.createLinearGradient(155, 0, drawX + drawW, 0);
    fade.addColorStop(0, 'rgba(4, 12, 28, 0)');
    fade.addColorStop(1, 'rgba(4, 12, 28, 1)');
    ctx.fillStyle = fade;
    ctx.fillRect(155, 0, drawX + drawW - 155, H);

    ctx.restore();
  }

  // ─── Gear option cards (replaces sidebar + canvas tray) ──────────────────

  _drawGearOptions(ctx) {
    const now = performance.now();
    for (const card of GEAR_CARDS) {
      const gear   = GEAR_SET[card.id];
      const active = gear.id === this.state?.gear;
      const { y, h } = card;
      const x = GEAR_CARD_X;
      const w = GEAR_CARD_W;

      // Card background
      ctx.fillStyle = active
        ? 'rgba(68, 48, 12, 0.96)'
        : 'rgba(6, 16, 34, 0.90)';
      roundRect(ctx, x, y, w, h, 14);
      ctx.fill();
      ctx.strokeStyle = active
        ? 'rgba(255, 208, 94, 0.88)'
        : 'rgba(100, 180, 220, 0.28)';
      ctx.lineWidth = active ? 2.5 : 1.5;
      ctx.stroke();

      // Gear name
      ctx.fillStyle  = active ? '#ffd46a' : '#c8e8ff';
      ctx.font       = `900 ${active ? 17 : 15}px Orbitron, sans-serif`;
      ctx.textAlign  = 'center';
      ctx.fillText(gear.label.toUpperCase(), x + w / 2, y + 28);

      // Ratio label
      ctx.fillStyle = active ? 'rgba(255, 220, 120, 0.9)' : 'rgba(150, 210, 255, 0.68)';
      ctx.font      = '700 11px Orbitron, sans-serif';
      ctx.fillText(gear.ratioLabel, x + w / 2, y + 46);

      // Teeth count
      ctx.fillStyle = 'rgba(140, 200, 255, 0.58)';
      ctx.font      = '700 10px Arial, sans-serif';
      ctx.fillText(`${gear.driverTeeth}T → ${gear.drivenTeeth}T`, x + w / 2, y + 63);

      // Animated mini gear pair
      const miniPitch   = 3.5;
      const r1          = gear.driverTeeth * miniPitch / (Math.PI * 2);
      const r2          = gear.drivenTeeth * miniPitch / (Math.PI * 2);
      const pairW       = r1 + r2 + 3;
      const gx          = x + w / 2 - pairW / 2;
      const gy          = y + 100;
      const driverAngle = active ? now * 0.00042 : 0;
      const drivenAngle = active ? -driverAngle * gear.driverTeeth / gear.drivenTeeth : 0;
      const drivenPhase = drivenGearPhase(gear.drivenTeeth);
      simpleGear(ctx, gx, gy, r1, gear.driverTeeth,
        active ? '#f0b33f' : '#6a7a90', driverAngle, 0);
      simpleGear(ctx, gx + r1 + r2 + 3, gy, r2, gear.drivenTeeth,
        active ? '#67d7ff' : '#3a5570', drivenAngle, drivenPhase);
      if (active) {
        this._clockHand(ctx, gx, gy, r1, driverAngle);
        this._clockHand(ctx, gx + r1 + r2 + 3, gy, r2, drivenAngle);
      }

      // Torque / speed trade-off badges
      const ratio      = gear.drivenTeeth / gear.driverTeeth;
      const torqueStr  = `${ratio.toFixed(0)}× torque`;
      const speedStr   = `${(1 / ratio).toFixed(2)}× speed`;
      ctx.font      = '700 9px Orbitron, sans-serif';
      ctx.fillStyle = active ? 'rgba(255, 180, 50, 0.9)' : 'rgba(210, 140, 40, 0.52)';
      ctx.fillText(torqueStr, x + w / 2, y + h - 20);
      ctx.fillStyle = active ? 'rgba(80, 200, 255, 0.9)' : 'rgba(60, 160, 210, 0.52)';
      ctx.fillText(speedStr, x + w / 2, y + h - 6);

      ctx.textAlign = 'left';
    }
  }

  // ─── Motor housing ────────────────────────────────────────────────────────

  _drawMotorHousing(ctx, frame) {
    const { x, y, w, h } = HOUSING;
    const isActive        = this._isActive(frame);

    ctx.save();
    ctx.fillStyle   = '#131f30';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = isActive
      ? 'rgba(255, 150, 50, 0.7)'
      : 'rgba(100, 180, 220, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bolt corners
    for (const [bx, by] of [[x+8,y+8],[x+w-8,y+8],[x+8,y+h-8],[x+w-8,y+h-8]]) {
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(130, 180, 220, 0.5)';
      ctx.fill();
    }

    // Motor symbol circle
    const mx = x + w * 0.36;
    const my = y + h * 0.5;
    const mr = 16;
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, Math.PI * 2);
    ctx.strokeStyle = isActive ? 'rgba(255, 160, 50, 0.9)' : 'rgba(255, 160, 50, 0.4)';
    ctx.lineWidth   = 2;
    ctx.stroke();

    if (isActive) {
      const spinOffset = performance.now() * 0.004;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 0.55, spinOffset, spinOffset + Math.PI * 1.4);
      ctx.strokeStyle = 'rgba(255, 200, 80, 0.9)';
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = 'round';
      ctx.stroke();
    }

    ctx.fillStyle = isActive ? 'rgba(255, 160, 50, 0.95)' : 'rgba(255, 160, 50, 0.5)';
    ctx.font      = '900 9px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR', x + w * 0.78, y + h * 0.4);
    ctx.fillText('DC', x + w * 0.78, y + h * 0.65);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ─── Motor shaft (orange = fast, low torque) ──────────────────────────────

  _drawMotorShaft(ctx, frame) {
    if (!this.state) return;
    const isActive = this._isActive(frame);
    const alpha    = isActive ? 1.0 : 0.42;
    const fromX    = 198;
    const toX      = DRIVER.x;
    const shY      = DRIVER.y;

    ctx.save();

    // Glow halo
    ctx.strokeStyle = `rgba(255, 120, 20, ${alpha * 0.28})`;
    ctx.lineWidth   = 18;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, shY);
    ctx.lineTo(toX, shY);
    ctx.stroke();

    // Core shaft
    ctx.strokeStyle = `rgba(255, 155, 45, ${alpha})`;
    ctx.lineWidth   = 6;
    ctx.stroke();

    // Animated flow dots
    if (isActive) {
      const motorSpeed = this.state.powerInfo.speed;
      const t = (performance.now() * 0.0035 * motorSpeed) % 1;
      for (let i = 0; i < 5; i++) {
        const p  = (t + i * 0.2) % 1;
        const dx = fromX + (toX - fromX) * p;
        ctx.fillStyle = `rgba(255, 235, 120, ${0.95 - i * 0.1})`;
        ctx.beginPath();
        ctx.arc(dx, shY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Labels
    const labelX = fromX + (toX - fromX) * 0.38;
    ctx.fillStyle = `rgba(255, 155, 45, ${alpha * 0.88})`;
    ctx.font      = '700 9px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MOTOR SHAFT', labelX, shY - 11);
    ctx.fillText('FAST · LOW TORQUE', labelX, shY + 21);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  // ─── Gear train (two-pass for arm z-order) ────────────────────────────────

  _drawInstalledGearTrain(ctx, frame, mode = 'all') {
    const s = this.state;
    if (!s) return;
    const g       = s.gearInfo;
    const driverR = pitchRadius(g.driverTeeth);
    const drivenR = pitchRadius(g.drivenTeeth);
    const driven  = { x: DRIVER.x + driverR + drivenR + GEAR_SEPARATION, y: DRIVER.y };
    const angles  = gearAngles(frame, s);
    const stress  = this._stressActive(frame) ? s.stress : null;

    if (mode === 'plate') {
      // Dark mount surface behind gears; arm drawn in front of this, gears in front of arm
      ctx.fillStyle   = '#0f1e30';
      roundRect(ctx, 430, 242, 520, 298, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,190,255,0.15)';
      ctx.lineWidth   = 2.5;
      ctx.stroke();
      return;
    }

    // Draw gears
    this._drawGear(ctx, DRIVER.x, DRIVER.y, g.driverTeeth, angles.driver,
      '#f2c95e', 'MOTOR', 0, stress);
    this._drawGear(ctx, driven.x, driven.y, g.drivenTeeth, angles.driven,
      '#cfd7e4', 'ARM', drivenGearPhase(g.drivenTeeth), stress);
    this._clockHand(ctx, DRIVER.x, DRIVER.y, driverR, angles.driver, 1.25);
    this._clockHand(ctx, driven.x, driven.y, drivenR, angles.driven, 1.12);

    // Mesh contact marker
    ctx.strokeStyle = 'rgba(255,230,150,0.32)';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(DRIVER.x + driverR - 2, DRIVER.y);
    ctx.lineTo(driven.x - drivenR + 2, driven.y);
    ctx.stroke();

    // Tooth count labels
    ctx.fillStyle = '#d9f6ff';
    ctx.font      = '900 14px Arial, sans-serif';
    ctx.fillText(`${g.driverTeeth} teeth`, DRIVER.x - 48, DRIVER.y + driverR + 44);
    ctx.fillText(`${g.drivenTeeth} teeth`, driven.x - 56, driven.y + drivenR + 44);

    // Arm shaft label
    const isActive = this._isActive(frame);
    if (isActive) {
      const armAlpha = this.state.stress < 1 ? 0.85 : 0.4;
      ctx.fillStyle  = `rgba(80, 200, 255, ${armAlpha})`;
      ctx.font       = '700 9px Orbitron, sans-serif';
      ctx.textAlign  = 'center';
      ctx.fillText('ARM SHAFT', driven.x + drivenR + 40, DRIVER.y - 12);
      ctx.fillText('SLOW · HIGH TORQUE', driven.x + drivenR + 40, DRIVER.y + 4);
      ctx.textAlign  = 'left';
    }
  }

  _drawGear(ctx, x, y, teeth, angle, fill, label, phase = 0, stress = null) {
    const pr    = pitchRadius(teeth);
    const outer = pr + 8;
    const root  = Math.max(12, pr - 8);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    mainGearPath(ctx, 0, 0, root, outer, teeth, phase);
    ctx.fillStyle   = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,12,24,0.46)';
    ctx.lineWidth   = 1.25;
    ctx.lineJoin    = 'round';
    ctx.stroke();

    if (stress !== null) {
      const color     = stressColor(stress);
      ctx.shadowColor = color;
      ctx.shadowBlur  = 14;
      mainGearPath(ctx, 0, 0, root, outer, teeth, phase);
      ctx.fillStyle   = hexToRgba(color, 0.32);
      ctx.fill();
      ctx.shadowBlur  = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 2.2;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(0, 0, pr * 0.28, 0, Math.PI * 2);
    ctx.fillStyle   = '#172235';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#08111f';
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(220,245,255,0.74)';
    ctx.font      = '900 11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - outer - 12);
    ctx.textAlign = 'left';
  }

  // ─── Arm and load ─────────────────────────────────────────────────────────

  _drawArmAndLoad(ctx, frame) {
    const s = this.state;
    if (!s) return;
    const geom      = this._armGeometry(frame);
    const len       = 285;
    const armStartX = geom.drivenR * 0.42;
    const armTipX   = armStartX + len;
    const holeX     = armTipX - 18;
    const stress    = this._stressActive(frame) ? s.stress : null;
    const isActive  = this._isActive(frame);

    ctx.save();
    ctx.translate(geom.pivot.x, geom.pivot.y);
    ctx.rotate(geom.angle);

    if (isActive) {
      ctx.shadowColor = stress !== null && stress >= 1
        ? 'rgba(255, 80, 50, 0.55)'
        : 'rgba(40, 190, 255, 0.55)';
      ctx.shadowBlur  = 20;
    }

    ctx.fillStyle = 'rgba(70, 200, 216, 0.92)';
    roundRect(ctx, armStartX, -22, len, 44, 20);
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.strokeStyle = 'rgba(220,255,255,0.45)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    if (stress !== null) {
      ctx.fillStyle = hexToRgba(stressColor(stress), 0.28);
      roundRect(ctx, armStartX + 8, -15, len - 40, 30, 14);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(holeX, 0, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const hole = rotatePoint(geom.pivot, holeX, 0, geom.angle);
    this._drawHangingLoad(ctx, hole, s.load, stress);
  }

  // ─── Crash effects ────────────────────────────────────────────────────────

  _drawCrashEffects(ctx, frame) {
    if (!frame.crash || !this.state) return;
    const geom = this._armGeometry(frame);
    const now  = performance.now();

    for (let i = 0; i < 12; i++) {
      const baseAngle = (i / 12) * Math.PI * 2;
      const wobble    = Math.sin(now * 0.006 + i) * 0.4;
      const angle     = baseAngle + wobble;
      const dist      = 30 + (i % 4) * 18 + Math.sin(now * 0.003 + i * 1.3) * 10;
      const px        = geom.hand.x + Math.cos(angle) * dist;
      const py        = geom.hand.y + Math.sin(angle) * dist;
      const alpha     = 0.75 - i * 0.04;
      const r         = 3 + (i % 3) * 1.5;
      ctx.fillStyle = i % 2 === 0
        ? `rgba(255, ${110 + i * 10}, 30, ${alpha})`
        : `rgba(100, 220, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.font        = '900 36px Orbitron, sans-serif';
    ctx.textAlign   = 'center';
    const pulse     = 0.85 + Math.sin(now * 0.012) * 0.15;
    ctx.globalAlpha = pulse;
    ctx.fillStyle   = '#ff5533';
    ctx.shadowColor = '#ff5533';
    ctx.shadowBlur  = 20;
    ctx.fillText('CRASH!', geom.hand.x, Math.min(geom.hand.y - 30, 160));
    ctx.shadowBlur  = 0;
    ctx.globalAlpha = 1;
    ctx.textAlign   = 'left';
    ctx.restore();

    ctx.fillStyle = 'rgba(255, 180, 50, 0.6)';
    ctx.beginPath();
    ctx.arc(geom.hand.x, 95, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  _armGeometry(frame) {
    const s       = this.state;
    const g       = s.gearInfo;
    const driverR = pitchRadius(g.driverTeeth);
    const drivenR = pitchRadius(g.drivenTeeth);
    const pivot   = { x: DRIVER.x + driverR + drivenR + GEAR_SEPARATION, y: DRIVER.y };
    const angle   = deg(ARM_MAX_DEG - frame.armLift * (ARM_MAX_DEG - ARM_MIN_DEG));
    const hand    = {
      x: pivot.x + Math.cos(angle) * (drivenR * 0.42 + 321),
      y: pivot.y + Math.sin(angle) * (drivenR * 0.42 + 321),
    };
    return { pivot, angle, drivenR, hand };
  }

  _drawHangingLoad(ctx, hole, loadId, stress = null) {
    const size    = loadSize(loadId);
    const wireLen = 28;
    const eyeletR = 8;
    const eyelet  = { x: hole.x, y: hole.y + wireLen };
    const loadCtr = { x: eyelet.x, y: eyelet.y + eyeletR + size / 2 - 2 };

    ctx.save();
    ctx.strokeStyle = stress === null ? 'rgba(220,240,255,0.78)' : stressColor(stress);
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(hole.x, hole.y + 2);
    ctx.lineTo(eyelet.x, eyelet.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(eyelet.x, eyelet.y, eyeletR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
    ctx.stroke();
    ctx.fillStyle   = 'rgba(8,18,32,0.72)';
    ctx.beginPath();
    ctx.arc(eyelet.x, eyelet.y, eyeletR - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    this._drawLoad(ctx, loadCtr.x, loadCtr.y, loadId, stress);
  }

  _drawLoad(ctx, x, y, loadId, stress = null) {
    const assetKey = { light: 'loadLight', medium: 'loadMedium', heavy: 'loadHeavy' }[loadId];
    const img      = assetKey ? this.assets[assetKey] : null;
    const size     = loadSize(loadId);
    const load     = ARM_LOAD[loadId] ?? ARM_LOAD.medium;

    if (img) {
      ctx.save();
      if (stress !== null) {
        ctx.shadowColor = stressColor(stress);
        ctx.shadowBlur  = 10;
      }
      ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
      ctx.shadowBlur  = 0;
      ctx.restore();
      return;
    }

    const colors = { light: '#9fe6ff', medium: '#f0c95f', heavy: '#d36a55' };
    ctx.save();
    ctx.fillStyle = colors[loadId] ?? colors.medium;
    roundRect(ctx, x - size / 2, y - size / 2, size, size, 10);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    roundRect(ctx, x - size / 2 + 4, y - size / 2 + 4, size * 0.45, size * 0.22, 6);
    ctx.fill();

    if (stress !== null) {
      ctx.fillStyle = hexToRgba(stressColor(stress), 0.28);
      roundRect(ctx, x - size / 2, y - size / 2, size, size, 10);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.45)';
    ctx.lineWidth   = 3;
    ctx.stroke();

    ctx.fillStyle = '#07111f';
    ctx.font      = '900 11px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${load.weightKg.toFixed(1)} kg`, x, y + 4);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  // ─── Caption bar ──────────────────────────────────────────────────────────

  _drawCaption(ctx, caption) {
    if (!caption) return;
    ctx.fillStyle = 'rgba(3, 10, 24, 0.88)';
    roundRect(ctx, 278, 36, 690, 40, 18);
    ctx.fill();
    ctx.fillStyle = '#ffd46a';
    ctx.font      = '900 15px Baloo 2, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, 623, 62);
    ctx.textAlign = 'left';
  }

  // ─── Interaction ──────────────────────────────────────────────────────────

  _handlePointerDown(e) {
    if (this._playing || !this.state) return;
    const pt      = this._eventPoint(e);
    const gearHit = this._gearCardHit(pt);
    if (gearHit) {
      e.preventDefault();
      this.onGearSelect?.(gearHit);
      return;
    }
    const geom = this._armGeometry(this._frame);
    const dist  = distanceToSegment(pt, geom.hand, geom.pivot);
    if (dist > 44) return;
    e.preventDefault();
    this._drag = {
      startAngle:    geom.angle,
      startArmTurns: this._frame.manualArmTurns ?? 0,
    };
    this.canvas.setPointerCapture?.(e.pointerId);
    document.addEventListener('pointermove', this._onPointerMove);
    document.addEventListener('pointerup',   this._onPointerUp);
  }

  _handlePointerMove(e) {
    if (!this._drag || !this.state) return;
    e.preventDefault();
    const pt      = this._eventPoint(e);
    const geom    = this._armGeometry(this._frame);
    const angle   = Math.atan2(pt.y - geom.pivot.y, pt.x - geom.pivot.x);
    const clamped    = clamp(angle, deg(ARM_MIN_DEG), deg(ARM_MAX_DEG));
    const delta      = normalizeAngle(clamped - this._drag.startAngle);
    const armTurns   = this._drag.startArmTurns + delta / (Math.PI * 2);
    this._frame = {
      ...this._frame,
      armLift:        angleToLift(clamped),
      manualArmTurns: armTurns,
      driverTurns:    armTurns * this.state.ratio,
      caption:        'Drag the arm to feel the gear ratio.',
    };
    this._draw(this._frame);
  }

  _handlePointerUp() {
    this._drag = null;
    document.removeEventListener('pointermove', this._onPointerMove);
    document.removeEventListener('pointerup',   this._onPointerUp);
  }

  _eventPoint(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top)  * (H / rect.height),
    };
  }

  _gearCardHit(pt) {
    if (pt.x < GEAR_CARD_X || pt.x > GEAR_CARD_X + GEAR_CARD_W) return null;
    for (const card of GEAR_CARDS) {
      if (pt.y >= card.y && pt.y <= card.y + card.h) return card.id;
    }
    return null;
  }

  _isActive(frame) {
    return this._playing
      || !!this._drag
      || Math.abs(frame.driverTurns    ?? 0) > 0.01
      || Math.abs(frame.manualArmTurns ?? 0) > 0.01;
  }

  _stressActive(frame) {
    return this._isActive(frame);
  }

  _clockHand(ctx, x, y, r, angle, scale = 1.55) {
    const handAngle = angle - Math.PI / 2;
    const len       = Math.max(16, r * scale);
    const end       = {
      x: x + Math.cos(handAngle) * len,
      y: y + Math.sin(handAngle) * len,
    };
    ctx.save();
    ctx.strokeStyle = '#e94343';
    ctx.lineWidth   = 2.4;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = '#ff6868';
    ctx.beginPath();
    ctx.arc(end.x, end.y, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Gear geometry helpers ─────────────────────────────────────────────────

function pitchRadius(teeth) {
  return teeth * GEAR_PITCH / (Math.PI * 2);
}

function simpleGear(ctx, x, y, r, teeth, fill, angle = 0, phase = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = fill;
  const root  = Math.max(3, r - 1.8);
  const outer = r + 2.6;
  ctx.beginPath();
  ctx.arc(0, 0, root + 0.8, 0, Math.PI * 2);
  ctx.fill();
  roundedGearPath(ctx, 0, 0, root, outer, teeth, phase);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth   = 0.55;
  ctx.lineJoin    = 'round';
  ctx.stroke();
  ctx.restore();
}

function drivenGearPhase(teeth) {
  return Math.PI - Math.PI / teeth;
}

function mainGearPath(ctx, x, y, root, outer, teeth, phase = 0) {
  ctx.beginPath();
  const step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a  = phase + i * step;
    const p0 = polar(x, y, root,  a - step * 0.43);
    const p1 = polar(x, y, outer, a - step * 0.23);
    const p2 = polar(x, y, outer, a + step * 0.23);
    const p3 = polar(x, y, root,  a + step * 0.43);
    if (i === 0) ctx.moveTo(p0.x, p0.y); else ctx.lineTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midpoint(p1, p2).x, midpoint(p1, p2).y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
  }
  ctx.closePath();
}

function roundedGearPath(ctx, x, y, root, outer, teeth, phase = 0) {
  ctx.beginPath();
  const step = Math.PI * 2 / teeth;
  for (let i = 0; i < teeth; i++) {
    const a  = phase + i * step;
    const p0 = polar(x, y, root,  a - step * 0.48);
    const p1 = polar(x, y, outer, a - step * 0.34);
    const p2 = polar(x, y, outer, a + step * 0.34);
    const p3 = polar(x, y, root,  a + step * 0.48);
    if (i === 0) ctx.moveTo(p0.x, p0.y); else ctx.lineTo(p0.x, p0.y);
    ctx.quadraticCurveTo(p1.x, p1.y, midpoint(p1, p2).x, midpoint(p1, p2).y);
    ctx.quadraticCurveTo(p2.x, p2.y, p3.x, p3.y);
  }
  ctx.closePath();
}

// ─── Math helpers ──────────────────────────────────────────────────────────

function polar(x, y, r, a) {
  return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function rotatePoint(origin, x, y, angle) {
  return {
    x: origin.x + Math.cos(angle) * x - Math.sin(angle) * y,
    y: origin.y + Math.sin(angle) * x + Math.cos(angle) * y,
  };
}

function loadSize(loadId) {
  return { light: 34, medium: 48, heavy: 64 }[loadId] ?? 48;
}

function stressColor(stress) {
  if (stress >= 1)    return '#f04b4b';
  if (stress >= 0.72) return '#ffd34d';
  return '#3dde72';
}

function hexToRgba(hex, alpha) {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

function gearTurns(frame, state) {
  if (frame.manualArmTurns) return frame.manualArmTurns;
  return frame.driverTurns * state.gearInfo.driverTeeth / state.gearInfo.drivenTeeth;
}

function gearAngles(frame, state) {
  if (frame.manualArmTurns) {
    return {
      driven: frame.manualArmTurns * Math.PI * 2,
      driver: -frame.manualArmTurns * state.ratio * Math.PI * 2,
    };
  }
  return {
    driver: frame.driverTurns * Math.PI * 2,
    driven: -gearTurns(frame, state) * Math.PI * 2,
  };
}

function deg(value) { return value * Math.PI / 180; }

function angleToLift(angle) {
  return (ARM_MAX_DEG - angle * 180 / Math.PI) / (ARM_MAX_DEG - ARM_MIN_DEG);
}

function normalizeAngle(angle) {
  while (angle >  Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function distanceToSegment(p, a, b) {
  const dx   = b.x - a.x;
  const dy   = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (!len2) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img   = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src     = src;
  });
}

function clamp(v, min = 0, max = 1) {
  return Math.max(min, Math.min(max, v));
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
