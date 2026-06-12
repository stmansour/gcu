/**
 * ControlRenderer.js — Chapter 5 canvas renderers
 *
 * ControlTuneRenderer:     route preview — the SAME delivery course, bumps,
 *                          scenery, and physics as the real run. Gold arrows
 *                          show push-back; blue arrows show swing calming.
 * ControlDeliveryRenderer: the delivery test run — SWIRL-E rolls across a
 *                          bumpy course while the same physics drives the
 *                          tray. Spills, tips, launches, and triumphs.
 *
 * Both renderers draw SWIRL-E procedurally so the chapter needs no new
 * image assets, and both are driven by the SAME ControlSim physics that
 * grades the run — what the player sees is what was measured.
 */

import { ControlSim, COURSES, paceAt, KNOB_MAX } from '../engine/ControlEngine.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Fixed design sizes — the browser scales the bitmap uniformly via aspect-ratio. */
const PREVIEW_W = 720;
const PREVIEW_H = 360;
const DELIVERY_W = 920;
const DELIVERY_H = 400;

/**
 * Pin a canvas to a fixed coordinate space so circles stay circles on resize.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {number} designW
 * @param {number} designH
 */
function bindFixedCanvas(canvas, designW, designH) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const apply = () => {
    canvas.width = Math.round(designW * dpr);
    canvas.height = Math.round(designH * dpr);
    canvas.style.aspectRatio = `${designW} / ${designH}`;
    canvas.style.width = '100%';
    canvas.style.height = 'auto';
    canvas.style.maxWidth = '100%';
    canvas.style.maxHeight = '100%';
    canvas.style.display = 'block';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  apply();
  const target = canvas.parentElement || canvas;
  const ro = new ResizeObserver(apply);
  ro.observe(target);
  return { ctx, disconnect: () => ro.disconnect(), designW, designH };
}

/* ── Shared drawing helpers ──────────────────────────────────────────────── */

/**
 * Draw SWIRL-E (procedural, cute, rounded) with a tray balanced on one hand.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} o
 *   x, groundY   — where his wheels touch
 *   scale        — 1.0 ≈ 230px tall
 *   theta        — tray tilt (rad)
 *   slosh        — lemonade surface offset (rim units, ±1 = at the rim)
 *   lemonade     — 0..1 cup fill
 *   mood         — 'calm' | 'worried' | 'dizzy' | 'ko' | 'happy'
 *   cupVisible   — draw the cup on the tray
 *   wobblePhase  — small body jiggle phase (radians)
 *   jolt         — vertical hop offset (px, positive = up)
 * @returns {{handX:number, handY:number, trayCx:number, trayCy:number}}
 */
function drawSwirle(ctx, o) {
  const s = o.scale;
  const jolt = o.jolt || 0;
  const baseX = o.x;
  const baseY = o.groundY - jolt;
  const jiggle = Math.sin(o.wobblePhase || 0) * clamp(Math.abs(o.theta) * 10, 0, 4) * s;

  ctx.save();
  ctx.translate(baseX + jiggle, baseY);
  ctx.scale(s, s);

  // Wheels
  ctx.fillStyle = '#1c2636';
  ctx.strokeStyle = '#5b6c84';
  ctx.lineWidth = 3;
  for (const wx of [-26, 26]) {
    ctx.beginPath();
    ctx.arc(wx, -14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#39465c';
    ctx.beginPath();
    ctx.arc(wx, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c2636';
  }

  // Body
  const bodyGrad = ctx.createLinearGradient(-45, -130, 45, -20);
  bodyGrad.addColorStop(0, '#46566e');
  bodyGrad.addColorStop(0.5, '#33405a');
  bodyGrad.addColorStop(1, '#222c42');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = '#67788f';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-42, -118, 84, 96, 20);
  ctx.fill();
  ctx.stroke();

  // Chest panel with a tiny tilt gauge — SWIRL-E's own sensor display
  ctx.fillStyle = 'rgba(10, 20, 38, 0.85)';
  ctx.beginPath();
  ctx.roundRect(-24, -100, 48, 30, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(95, 220, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -85);
  ctx.strokeStyle = Math.abs(o.theta) > 0.3 ? '#ff6a55' : Math.abs(o.theta) > 0.15 ? '#ffd257' : '#4fe080';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.rotate(clamp(o.theta, -0.9, 0.9));
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(14, 0);
  ctx.stroke();
  ctx.restore();

  // Head
  const headGrad = ctx.createLinearGradient(-30, -178, 30, -118);
  headGrad.addColorStop(0, '#54647c');
  headGrad.addColorStop(1, '#2c3850');
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = '#74859c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-30, -176, 60, 56, 16);
  ctx.fill();
  ctx.stroke();

  // Antenna
  ctx.strokeStyle = '#74859c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -176);
  ctx.lineTo(0, -190);
  ctx.stroke();
  ctx.fillStyle = '#5fdcff';
  ctx.beginPath();
  ctx.arc(0, -194, 4, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  drawEyes(ctx, o.mood, o.theta);

  // Left arm (rests at side)
  ctx.strokeStyle = '#67788f';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-40, -98);
  ctx.lineTo(-54, -64);
  ctx.stroke();
  ctx.fillStyle = '#48586e';
  ctx.beginPath();
  ctx.arc(-55, -60, 8, 0, Math.PI * 2);
  ctx.fill();

  // Right arm raised — waiter pose, hand above head height
  ctx.strokeStyle = '#67788f';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(40, -98);
  ctx.lineTo(58, -140);
  ctx.lineTo(52, -184);
  ctx.stroke();
  ctx.fillStyle = '#48586e';
  ctx.beginPath();
  ctx.arc(52, -188, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  return {
    handX: baseX + jiggle + 52 * s,
    handY: baseY - 188 * s - jolt * 0,
  };
}

function drawEyes(ctx, mood, theta) {
  const eyeY = -150;
  for (const ex of [-13, 13]) {
    // Socket
    ctx.fillStyle = '#0c1626';
    ctx.beginPath();
    ctx.arc(ex, eyeY, 10, 0, Math.PI * 2);
    ctx.fill();

    if (mood === 'ko') {
      // X eyes
      ctx.strokeStyle = '#ff6a55';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - 5, eyeY - 5); ctx.lineTo(ex + 5, eyeY + 5);
      ctx.moveTo(ex + 5, eyeY - 5); ctx.lineTo(ex - 5, eyeY + 5);
      ctx.stroke();
    } else if (mood === 'dizzy') {
      // Spiral eyes
      ctx.strokeStyle = '#5fdcff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 4; a += 0.3) {
        const r = a * 1.5;
        const px = ex + Math.cos(a + theta * 6) * r * 0.55;
        const py = eyeY + Math.sin(a + theta * 6) * r * 0.55;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else {
      // Glowing pupil; looks toward the tray tilt
      const look = clamp(theta * 14, -4, 4);
      const glow = ctx.createRadialGradient(ex + look, eyeY, 0, ex + look, eyeY, 7);
      glow.addColorStop(0, mood === 'happy' ? '#aef7ff' : '#5fdcff');
      glow.addColorStop(1, 'rgba(95, 220, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(ex + look, eyeY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = mood === 'worried' ? '#ffd257' : '#5fdcff';
      ctx.beginPath();
      ctx.arc(ex + look, eyeY, 3.4, 0, Math.PI * 2);
      ctx.fill();
      if (mood === 'happy') {
        // Smile-squint lids
        ctx.strokeStyle = '#2c3850';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(ex, eyeY - 6, 10, Math.PI * 0.15, Math.PI * 0.85, false);
        ctx.stroke();
      }
    }
  }
}

/**
 * Draw the tray + cup, tilted by theta around the hand point.
 * @returns {{cupX:number, cupY:number}} cup base position in canvas coords
 */
function drawTray(ctx, handX, handY, theta, scale, cup) {
  const trayW = 130 * scale;
  const trayH = 9 * scale;

  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(theta);

  // Tray
  const grad = ctx.createLinearGradient(0, -trayH, 0, 0);
  grad.addColorStop(0, '#f0c866');
  grad.addColorStop(1, '#b8902a');
  ctx.fillStyle = grad;
  ctx.strokeStyle = '#f3d077';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-trayW / 2, -trayH, trayW, trayH, 4 * scale);
  ctx.fill();
  ctx.stroke();
  // Tray lip
  ctx.fillStyle = '#d9ab45';
  ctx.fillRect(-trayW / 2, -trayH - 3 * scale, 4 * scale, trayH * 0.5);
  ctx.fillRect(trayW / 2 - 4 * scale, -trayH - 3 * scale, 4 * scale, trayH * 0.5);

  if (cup && cup.visible) {
    drawCup(ctx, 0, -trayH, scale, cup.lemonade, cup.slosh, theta);
  }

  ctx.restore();

  return {
    cupX: handX - Math.sin(theta) * trayH,
    cupY: handY - Math.cos(theta) * trayH,
  };
}

/**
 * Draw the lemonade cup. Called inside the tray's rotated frame, so the cup
 * tilts WITH the tray, while the lemonade surface counter-rotates to stay
 * level (plus slosh) — exactly like a real drink.
 */
function drawCup(ctx, cx, baseY, scale, lemonade, slosh, trayTheta) {
  const w = 34 * scale;
  const h = 44 * scale;
  const top = baseY - h;

  ctx.save();

  // Liquid (clipped to a slightly tapered cup shape)
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + 3 * scale, baseY);
  ctx.lineTo(cx - w / 2, top);
  ctx.lineTo(cx + w / 2, top);
  ctx.lineTo(cx + w / 2 - 3 * scale, baseY);
  ctx.closePath();
  ctx.clip();

  if (lemonade > 0.01) {
    const fillH = h * (0.18 + 0.74 * lemonade);
    const surfY = baseY - fillH;
    // Surface stays level in the world: counter-rotate by trayTheta, then add slosh tilt
    const surfaceTilt = -trayTheta + clamp(slosh, -1.6, 1.6) * 0.30;
    ctx.fillStyle = 'rgba(250, 216, 90, 0.92)';
    ctx.beginPath();
    ctx.moveTo(cx - w, surfY + Math.tan(surfaceTilt) * w);
    ctx.lineTo(cx + w, surfY - Math.tan(surfaceTilt) * w);
    ctx.lineTo(cx + w, baseY + h);
    ctx.lineTo(cx - w, baseY + h);
    ctx.closePath();
    ctx.fill();
    // Surface highlight
    ctx.strokeStyle = 'rgba(255, 245, 190, 0.9)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(cx - w / 2, surfY + Math.tan(surfaceTilt) * (w / 2));
    ctx.lineTo(cx + w / 2, surfY - Math.tan(surfaceTilt) * (w / 2));
    ctx.stroke();
  }
  ctx.restore();

  // Glass outline
  ctx.strokeStyle = 'rgba(210, 235, 255, 0.85)';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 + 3 * scale, baseY);
  ctx.lineTo(cx - w / 2, top);
  ctx.lineTo(cx + w / 2, top);
  ctx.lineTo(cx + w / 2 - 3 * scale, baseY);
  ctx.closePath();
  ctx.stroke();

  // Straw
  ctx.strokeStyle = '#ff7e8a';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.18, top + 4 * scale);
  ctx.lineTo(cx + w * 0.34, top - 12 * scale);
  ctx.stroke();
}

/* ── Spill droplet particles ─────────────────────────────────────────────── */

class Droplets {
  constructor() {
    this.list = [];
  }

  /** Spawn droplets from the cup rim. side: -1 left, +1 right. */
  spawn(x, y, side, intensity, count = 2) {
    for (let i = 0; i < count; i++) {
      this.list.push({
        x: x + side * (6 + Math.random() * 8),
        y: y - 36 - Math.random() * 10,
        vx: side * (40 + Math.random() * 90) * (0.6 + intensity),
        vy: -60 - Math.random() * 120,
        r: 2.2 + Math.random() * 2.4,
        life: 1.6,
      });
    }
    if (this.list.length > 220) this.list.splice(0, this.list.length - 220);
  }

  stepAndDraw(ctx, dt, groundY) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i];
      d.vy += 640 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      if (d.y >= groundY) {
        d.y = groundY;
        d.vy = 0;
        d.vx *= 0.4;
        d.r *= 1.12;
        d.life -= dt * 3;
      }
      if (d.life <= 0) { this.list.splice(i, 1); continue; }
      ctx.fillStyle = `rgba(250, 216, 90, ${clamp(d.life, 0, 1) * 0.9})`;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.r, d.y >= groundY - 0.5 ? d.r * 0.45 : d.r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/* ── Course scenery (shared by preview + delivery) ───────────────────────── */

const COURSE_THEMES = {
  kitchen: {
    skyTop: '#2a3450', skyBottom: '#3c4866',
    ground: '#5a7a9a', groundTop: '#6a8aaa',
    finishIcon: '🍽', finishLabel: 'DINING ROOM',
    accents: 'wet-kitchen',
  },
  garden: {
    skyTop: '#1d3250', skyBottom: '#2c4a64',
    ground: '#2e6a3c', groundTop: '#3c8450',
    finishIcon: '🧺', finishLabel: 'PICNIC TABLE',
    accents: 'stepping-stones',
  },
  backyard: {
    skyTop: '#172a48', skyBottom: '#234058',
    ground: '#2a5e38', groundTop: '#357448',
    finishIcon: '🛝', finishLabel: 'TREEHOUSE',
    accents: 'downhill',
  },
};

/**
 * Draw route-specific background accents (wet floor sign, stones, hill).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} theme from COURSE_THEMES
 * @param {number} w canvas width
 * @param {number} groundY
 */
function drawCourseScenery(ctx, theme, w, groundY) {
  ctx.save();
  if (theme.accents === 'wet-kitchen') {
    ctx.fillStyle = 'rgba(120, 180, 220, 0.22)';
    ctx.fillRect(0, groundY - 8, w, 8);
    ctx.font = '900 13px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(255, 230, 160, 0.92)';
    ctx.textAlign = 'left';
    ctx.fillText('🐢 WALK — WET FLOOR', 18, groundY - 18);
    ctx.fillStyle = 'rgba(240, 220, 150, 0.12)';
    ctx.beginPath();
    ctx.roundRect(w * 0.12, groundY * 0.22, w * 0.14, groundY * 0.35, 8);
    ctx.fill();
  } else if (theme.accents === 'stepping-stones') {
    ctx.fillStyle = 'rgba(255, 235, 160, 0.18)';
    ctx.beginPath();
    ctx.arc(w * 0.84, groundY * 0.22, 26, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 4; i++) {
      const sx = w * (0.18 + i * 0.18);
      ctx.fillStyle = 'rgba(180, 190, 200, 0.55)';
      ctx.beginPath();
      ctx.ellipse(sx, groundY + 1, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = '800 11px Orbitron, monospace';
      ctx.fillStyle = 'rgba(30, 40, 55, 0.85)';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), sx, groundY - 2);
    }
  } else if (theme.accents === 'downhill') {
    const hill = ctx.createLinearGradient(0, groundY * 0.35, w, groundY);
    hill.addColorStop(0, 'rgba(40, 90, 55, 0.15)');
    hill.addColorStop(1, 'rgba(40, 90, 55, 0.45)');
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.lineTo(w, groundY * 0.55);
    ctx.lineTo(0, groundY * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.font = '800 11px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(240, 200, 102, 0.88)';
    ctx.textAlign = 'right';
    ctx.fillText('▼ downhill', w - 16, groundY * 0.62);
  }
  ctx.restore();
}

/** Draw a labelled force arrow in world space. */
function drawForceArrow(ctx, x, y, angle, len, { color, label, sub, scale }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = clamp(2.5 * scale, 2, 4);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len, 0);
  ctx.stroke();
  const ah = clamp(9 * scale, 6, 12);
  ctx.beginPath();
  ctx.moveTo(len, 0);
  ctx.lineTo(len - ah, -ah * 0.55);
  ctx.lineTo(len - ah, ah * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.font = `900 ${Math.round(10 * scale + 5)}px Nunito, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(label, len * 0.55, -8 * scale);
  if (sub) {
    ctx.font = `700 ${Math.round(8 * scale + 4)}px Nunito, sans-serif`;
    ctx.fillText(sub, len * 0.55, 6 * scale);
  }
  ctx.restore();
}

/**
 * Visualize push-back and swing-calming so slider changes are obvious.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} handX
 * @param {number} handY
 * @param {import('../engine/ControlEngine.js').ControlSim} sim
 * @param {number} kpSlider
 * @param {number} kdSlider
 * @param {number} scale
 */
function drawControlForces(ctx, handX, handY, sim, kpSlider, kdSlider, scale) {
  const theta = sim.theta;
  const omega = sim.omega;

  // Level target — what "steady" looks like
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 240, 160, 0.55)';
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(handX - 72 * scale, handY);
  ctx.lineTo(handX + 95 * scale, handY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = `700 ${Math.round(9 * scale + 6)}px Nunito, sans-serif`;
  ctx.fillStyle = 'rgba(100, 240, 160, 0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText('LEVEL', handX - 68 * scale, handY - 6 * scale);

  // Sensor lag — dotted ghost shows what the motor is reacting to
  if (Math.abs(sim.sensedTheta - theta) > 0.012) {
    ctx.save();
    ctx.translate(handX, handY);
    ctx.rotate(sim.sensedTheta);
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.50)';
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-58 * scale, 0);
    ctx.lineTo(58 * scale, 0);
    ctx.stroke();
    ctx.restore();
    ctx.font = '700 9px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(180, 200, 230, 0.78)';
    ctx.textAlign = 'center';
    ctx.fillText('sensor (0.1s late)', handX, handY + 32 * scale);
  }

  // Push-back — gold arrow pushes tray toward level
  const tilted = Math.abs(theta) > 0.02;
  const pushMag = tilted ? clamp(Math.abs(sim.lastPush) / 14, 0.15, 1) : kpSlider / KNOB_MAX * 0.35;
  const pushLen = (22 + pushMag * 68 + kpSlider * 1.8) * scale;
  const pushAngle = tilted ? -theta : -0.22; // demo angle when level
  const pushAlpha = tilted ? clamp(0.55 + pushMag * 0.45, 0.5, 1) : 0.22 + kpSlider * 0.04;
  drawForceArrow(ctx, handX, handY - 42 * scale, pushAngle, pushLen, {
    color: `rgba(255, 210, 70, ${pushAlpha})`,
    label: 'PUSH-BACK',
    sub: `${Math.round(kpSlider)}/10`,
    scale,
  });

  // Swing calmer — blue arrows oppose wobble speed (only visible when swinging)
  const swinging = Math.abs(omega) > 0.05;
  const calmMag = swinging ? clamp(Math.abs(sim.lastCalm) / 10, 0.15, 1) : kdSlider / KNOB_MAX * 0.25;
  const calmLen = (14 + calmMag * 48 + kdSlider * 1.4) * scale;
  const calmAlpha = swinging ? clamp(0.5 + calmMag * 0.5, 0.45, 1) : 0.18 + kdSlider * 0.035;
  const calmSign = swinging ? -Math.sign(omega) : 1;
  const rimX = handX + Math.cos(theta) * 48 * scale;
  const rimY = handY + Math.sin(theta) * 48 * scale;
  drawForceArrow(ctx, rimX, rimY, theta + calmSign * Math.PI / 2, calmLen, {
    color: `rgba(95, 220, 255, ${calmAlpha})`,
    label: 'SWING CALMER',
    sub: `${Math.round(kdSlider)}/10`,
    scale,
  });

  ctx.restore();
}

/** Mini legend so first-time players know what the arrows mean. */
function drawPreviewLegend(ctx, w) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 14, 30, 0.78)';
  ctx.beginPath();
  ctx.roundRect(10, 10, 248, 58, 8);
  ctx.fill();
  ctx.font = '800 9px Orbitron, monospace';
  ctx.fillStyle = 'rgba(160, 215, 245, 0.85)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('WHAT YOU SEE', 18, 16);
  ctx.font = '700 11px Nunito, sans-serif';
  ctx.fillStyle = 'rgba(255, 210, 70, 0.95)';
  ctx.fillText('→ Gold = push-back flattens tilt', 18, 32);
  ctx.fillStyle = 'rgba(95, 220, 255, 0.95)';
  ctx.fillText('→ Blue = calms the wobble', 18, 48);
  ctx.restore();
}

/** Lemonade fill gauge (preview + delivery). */
function drawLemonadeGauge(ctx, sim, x = 14, y = 68, passFraction = null) {
  const gw = passFraction != null ? 150 : 130;
  const gh = passFraction != null ? 18 : 16;
  ctx.save();
  ctx.fillStyle = 'rgba(6, 14, 30, 0.75)';
  ctx.beginPath();
  ctx.roundRect(x - (passFraction != null ? 6 : 4), y - (passFraction != null ? 6 : 4),
    gw + (passFraction != null ? 46 : 38), gh + (passFraction != null ? 12 : 8), passFraction != null ? 9 : 7);
  ctx.fill();
  ctx.font = passFraction != null ? '14px sans-serif' : '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('🍋', x, y + gh / 2);
  const bx = x + (passFraction != null ? 24 : 22);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.roundRect(bx, y, gw, gh, passFraction != null ? 6 : 5);
  ctx.fill();
  const frac = sim.lemonade;
  const color = frac > 0.7 ? '#4fe080' : frac > 0.4 ? '#ffd257' : '#ff6a55';
  if (frac > 0.01) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(bx, y, gw * frac, gh, passFraction != null ? 6 : 5);
    ctx.fill();
  }
  if (passFraction != null) {
    ctx.strokeStyle = 'rgba(220, 235, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, y, gw, gh, 6);
    ctx.stroke();
    const passX = bx + gw * passFraction;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(passX, y - 3);
    ctx.lineTo(passX, y + gh + 3);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.font = '800 9px Orbitron, monospace';
  ctx.fillStyle = passFraction != null ? '#dce9f7' : 'rgba(220, 235, 255, 0.85)';
  ctx.fillText(`${Math.round(frac * 100)}%`, bx + gw + 6, y + gh / 2);
  ctx.restore();
}

/** Pace bar badge. */
function drawPaceBadge(ctx, course, t, w) {
  const pace = paceAt(t, course);
  const x = w - 14;
  const y = 14;
  ctx.save();
  ctx.font = '800 10px Nunito, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(220, 235, 255, 0.85)';
  ctx.fillText('PACE', x, y);
  const bw = 100;
  const bx = x - bw;
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.beginPath();
  ctx.roundRect(bx, y + 4, bw, 9, 4);
  ctx.fill();
  ctx.fillStyle = pace > 0.55 ? '#ffcc44' : '#5fdcff';
  ctx.beginPath();
  ctx.roundRect(bx, y + 4, bw * pace, 9, 4);
  ctx.fill();
  ctx.restore();
}

/* ── ControlTuneRenderer ─────────────────────────────────────────────────── */

const CHART_SECONDS = 7;
const PREVIEW_ROUTE_MARGIN = 58;

export class ControlTuneRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._layout = bindFixedCanvas(canvas, PREVIEW_W, PREVIEW_H);
    this._ctx = this._layout.ctx;
    this._w = PREVIEW_W;
    this._h = PREVIEW_H;

    this._kp = 0;
    this._kd = 0;
    this._course = null;
    this._courseId = null;
    this._sim = new ControlSim(0, 0);
    this._droplets = new Droplets();
    this._chart = [];
    this._simTime = 0;
    this._t = 0;
    this._bumpIdx = 0;
    this._bumpFlash = null;
    this._jolt = 0;
    this._fallTimer = 0;
    this._loopPause = 0;
    this._wobblePhase = 0;
    this._lastTs = null;
    this._raf = null;
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  destroy() {
    this.stop();
    this._layout?.disconnect();
  }

  /** Switch to a delivery route — preview uses the same bumps and scenery. */
  setCourse(courseId) {
    this._courseId = courseId;
    this._course = COURSES[courseId] || null;
    this.restart();
    this.start();
  }

  /** Restart the preview run from the start of the route. */
  restart() {
    this._resetRun();
  }

  _resetRun() {
    this._sim = new ControlSim(this._kp, this._kd, this._course);
    this._t = 0;
    this._bumpIdx = 0;
    this._bumpFlash = null;
    this._jolt = 0;
    this._fallTimer = 0;
    this._loopPause = 0;
    this._chart = [];
    this._simTime = 0;
    this._droplets.list = [];
  }

  /** Update knobs; physics state carries over so the change feels live. */
  setKnobs(kpSlider, kdSlider) {
    this._kp = kpSlider;
    this._kd = kdSlider;
    const old = this._sim;
    this._sim = new ControlSim(kpSlider, kdSlider, this._course);
    if (old && !old.fallen) {
      this._sim.theta = old.theta;
      this._sim.omega = old.omega;
      this._sim.slosh = old.slosh;
      this._sim.sloshVel = old.sloshVel;
      this._sim.lemonade = old.lemonade;
      this._sim.time = old.time;
    }
    this.start();
  }

  start() {
    if (!this._raf) {
      this._lastTs = null;
      this._raf = requestAnimationFrame(this._frame.bind(this));
    }
  }

  _chartH() { return clamp(this._h * 0.28, 72, 130); }
  _stageH() { return this._h - this._chartH() - 8; }
  _groundY() { return this._stageH() - 12; }
  _scale() { return clamp(this._stageH() / 300, 0.48, 1.0); }

  _xFor(t) {
    const w = this._w;
    const m = PREVIEW_ROUTE_MARGIN;
    const course = this._course;
    if (!course) return w * 0.5;
    return m + (w - m * 2 - 48) * clamp(t / course.duration, 0, 1);
  }

  _frame(ts) {
    if (this._lastTs === null) this._lastTs = ts;
    const dt = clamp((ts - this._lastTs) / 1000, 0, 0.05);
    this._lastTs = ts;

    this._simTime += dt;
    this._wobblePhase += dt * 18;

    const course = this._course;
    const sim = this._sim;

    if (course && this._loopPause <= 0) {
      this._t += dt;

      while (this._bumpIdx < course.bumps.length && course.bumps[this._bumpIdx].t <= this._t) {
        const b = course.bumps[this._bumpIdx];
        if (!sim.fallen) {
          sim.bump(b.strength * (b.dir || 1));
          this._jolt = 6 + b.strength * 7;
          this._bumpFlash = { name: b.name, t: this._t };
        }
        this._bumpIdx++;
      }

      sim.step(dt);

      if (sim.fallen) {
        this._fallTimer += dt;
        if (this._fallTimer > 1.6) {
          this._loopPause = 0.8;
          this._fallTimer = 0;
        }
      } else if (this._t >= course.duration) {
        this._loopPause = 1.0;
      }
    } else if (this._loopPause > 0) {
      this._loopPause -= dt;
      if (this._loopPause <= 0) this._resetRun();
    }

    this._jolt *= Math.pow(0.0005, dt);

    this._chart.push({ t: this._simTime, theta: sim.theta });
    while (this._chart.length && this._chart[0].t < this._simTime - CHART_SECONDS) {
      this._chart.shift();
    }

    this._draw(dt);
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  _draw(dt) {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    const chartH = this._chartH();
    const stageH = this._stageH();
    const groundY = this._groundY();
    const scale = this._scale();
    const course = this._course;
    const sim = this._sim;
    const theme = course ? COURSE_THEMES[course.id] : null;

    ctx.clearRect(0, 0, w, h);

    if (!course || !theme) {
      ctx.font = '700 14px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(200, 220, 240, 0.7)';
      ctx.textAlign = 'center';
      ctx.fillText('Pick a delivery route…', w / 2, h / 2);
      return;
    }

    // Sky + scenery + ground (same as delivery)
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, stageH);

    drawCourseScenery(ctx, theme, w, groundY);

    const gnd = ctx.createLinearGradient(0, groundY, 0, stageH);
    gnd.addColorStop(0, theme.groundTop);
    gnd.addColorStop(1, theme.ground);
    ctx.fillStyle = gnd;
    ctx.fillRect(0, groundY, w, stageH - groundY);

    // Bump markers along the route — visible BEFORE SWIRL-E reaches them
    for (const b of course.bumps) {
      const bx = this._xFor(b.t);
      const hit = this._t >= b.t;
      const upcoming = !hit && b.t - this._t < 2.5;
      ctx.fillStyle = hit ? 'rgba(255, 106, 85, 0.55)' : upcoming ? 'rgba(240, 200, 102, 0.65)' : 'rgba(20, 32, 52, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, groundY + 2, 14, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.font = '700 9px Nunito, sans-serif';
      ctx.fillStyle = hit ? 'rgba(255, 180, 160, 0.95)' : 'rgba(200, 220, 240, 0.75)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(b.name, bx, groundY - 4 - scale * 180);
    }

    // Finish marker
    const fx = this._xFor(course.duration) + 36;
    ctx.font = `${Math.round(28 * scale + 6)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(theme.finishIcon, fx, groundY + 4);
    ctx.font = '800 8px Orbitron, monospace';
    ctx.fillStyle = 'rgba(240, 200, 102, 0.85)';
    ctx.fillText(theme.finishLabel, fx, groundY + 14);

    // SWIRL-E on the route
    const x = this._xFor(Math.min(this._t, course.duration));
    const mood = sim.fallen ? 'ko'
      : Math.abs(sim.theta) > 0.32 ? 'dizzy'
      : Math.abs(sim.theta) > 0.14 ? 'worried'
      : 'calm';

    const hand = drawSwirle(ctx, {
      x: x - 30 * scale, groundY, scale,
      theta: sim.theta, slosh: sim.slosh, lemonade: sim.lemonade,
      mood, wobblePhase: this._wobblePhase, jolt: this._jolt,
    });
    drawTray(ctx, hand.handX, hand.handY, sim.theta, scale, {
      visible: true, lemonade: sim.lemonade, slosh: sim.slosh,
    });

    drawControlForces(ctx, hand.handX, hand.handY, sim, this._kp, this._kd, scale);

    if (sim.spilling && !sim.fallen) {
      this._droplets.spawn(hand.handX, hand.handY, Math.sign(sim.slosh) || 1, sim.spillIntensity, 2);
    }
    this._droplets.stepAndDraw(ctx, dt, groundY + 20);

    // Bump name popup
    if (this._bumpFlash && this._t - this._bumpFlash.t < 1.2) {
      const age = this._t - this._bumpFlash.t;
      const alpha = clamp(1.2 - age, 0, 1);
      ctx.font = '900 13px Nunito, sans-serif';
      ctx.fillStyle = `rgba(240, 200, 102, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this._bumpFlash.name, x, groundY - 200 * scale - age * 22);
    }

    if (sim.fallen) {
      ctx.font = `900 ${Math.round(15 * scale + 5)}px Orbitron, monospace`;
      ctx.fillStyle = '#ff8676';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TIPPED OVER!', w / 2, stageH * 0.16);
      ctx.font = '700 11px Nunito, sans-serif';
      ctx.fillStyle = 'rgba(220, 235, 255, 0.7)';
      ctx.fillText('Preview restarts in a moment…', w / 2, stageH * 0.16 + 20);
    }

    drawPreviewLegend(ctx, w);
    drawLemonadeGauge(ctx, sim, 14, 92);
    drawPaceBadge(ctx, course, this._t, w);

    // Route label
    ctx.font = '800 9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(240, 200, 102, 0.88)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('SAME ROUTE AS DELIVERY', w / 2, stageH - 8);

    this._drawChart(ctx, 0, h - chartH, w, chartH);
  }

  _drawChart(ctx, x, y, w, h) {
    ctx.save();

    ctx.fillStyle = 'rgba(6, 14, 30, 0.82)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y, w - 4, h - 2, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(95, 220, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const pad = 8;
    const cx0 = x + pad, cw = w - pad * 2;
    const cy = y + h / 2;
    const radPerPx = 0.55 / ((h - pad * 2) / 2);   // ±0.55 rad full scale
    const yFor = theta => cy - clamp(theta, -0.6, 0.6) / radPerPx;

    // Safe zone band (level enough to not spill)
    ctx.fillStyle = 'rgba(64, 232, 128, 0.10)';
    const bandTop = yFor(0.18);
    ctx.fillRect(cx0, yFor(0.18), cw, yFor(-0.18) - bandTop);
    // Spill lines
    ctx.strokeStyle = 'rgba(255, 106, 85, 0.45)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1;
    for (const lim of [0.42, -0.42]) {
      ctx.beginPath();
      ctx.moveTo(cx0, yFor(lim));
      ctx.lineTo(cx0 + cw, yFor(lim));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Center line
    ctx.strokeStyle = 'rgba(200, 220, 240, 0.30)';
    ctx.beginPath();
    ctx.moveTo(cx0, cy);
    ctx.lineTo(cx0 + cw, cy);
    ctx.stroke();

    // Tilt trace
    if (this._chart.length > 1) {
      const tEnd = this._chart[this._chart.length - 1].t;
      const tStart = tEnd - CHART_SECONDS;
      ctx.strokeStyle = '#5fdcff';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (const p of this._chart) {
        const px = cx0 + ((p.t - tStart) / CHART_SECONDS) * cw;
        const py = yFor(p.theta);
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Labels
    ctx.font = '800 9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(160, 215, 245, 0.75)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('TILT METER', cx0 + 2, y + 5);
    ctx.font = '700 9px Nunito, sans-serif';
    ctx.fillStyle = 'rgba(120, 240, 160, 0.8)';
    ctx.fillText('steady zone', cx0 + 2, cy - 11);
    ctx.fillStyle = 'rgba(255, 140, 120, 0.8)';
    ctx.fillText('spill!', cx0 + 2, yFor(0.42) - 11);
    ctx.textBaseline = 'bottom';
    ctx.fillText('spill!', cx0 + 2, yFor(-0.42) + 12);

    ctx.restore();
  }
}

/* ── ControlDeliveryRenderer ─────────────────────────────────────────────── */

export class ControlDeliveryRenderer {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._layout = bindFixedCanvas(canvas, DELIVERY_W, DELIVERY_H);
    this._ctx = this._layout.ctx;
    this._w = DELIVERY_W;
    this._h = DELIVERY_H;
    this._raf = null;
    this._reset();
  }

  _reset() {
    this._sim = null;
    this._course = null;
    this._t = 0;
    this._bumpIdx = 0;
    this._bumpFlash = null;     // { name, t }
    this._jolt = 0;
    this._droplets = new Droplets();
    this._cupFree = null;       // free-flying cup after a fall { x,y,vx,vy,rot,vrot }
    this._puddle = 0;
    this._outroTimer = null;
    this._wobblePhase = 0;
    this._lastTs = null;
    this._onDone = null;
    this._outcome = null;
  }

  /**
   * Run a delivery. The physics here is the same deterministic sim the engine
   * used to grade the run, so the animation always matches the verdict.
   *
   * @param {number} kpSlider
   * @param {number} kdSlider
   * @param {string} courseId
   * @param {string} outcome      — verdict from evaluateRun (drives reactions)
   * @param {() => void} onDone
   */
  run(kpSlider, kdSlider, courseId, outcome, onDone) {
    this.stop();
    this._reset();
    this._sim = new ControlSim(kpSlider, kdSlider, COURSES[courseId]);
    this._course = COURSES[courseId];
    this._outcome = outcome;
    this._onDone = onDone;
    this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
  }

  destroy() {
    this.stop();
    this._layout?.disconnect();
  }

  _xFor(t) {
    const m = 70;
    return m + (this._w - m * 2 - 60) * clamp(t / this._course.duration, 0, 1);
  }

  _frame(ts) {
    if (this._lastTs === null) this._lastTs = ts;
    const dt = clamp((ts - this._lastTs) / 1000, 0, 0.05);
    this._lastTs = ts;
    this._wobblePhase += dt * 18;

    const sim = this._sim;
    const course = this._course;
    const running = this._outroTimer === null;

    if (running) {
      this._t += dt;

      // Trigger bumps
      while (this._bumpIdx < course.bumps.length && course.bumps[this._bumpIdx].t <= this._t) {
        const b = course.bumps[this._bumpIdx];
        if (!sim.fallen) {
          sim.bump(b.strength * (b.dir || 1));
          this._jolt = 7 + b.strength * 8;
          this._bumpFlash = { name: b.name, t: this._t };
        }
        this._bumpIdx++;
      }

      sim.step(dt);

      // Cup launches when the tray goes over
      if (sim.fallen && !this._cupFree) {
        const x = this._xFor(this._t);
        const groundY = this._groundY();
        const scale = this._scale();
        const handY = groundY - 188 * scale;
        const violent = this._outcome === 'shake';
        this._cupFree = {
          x: x - 30 * scale + 52 * scale,
          y: handY - 20,
          vx: (violent ? 60 : 30) * Math.sign(sim.theta || 1),
          vy: violent ? -380 : -60,
          rot: 0,
          vrot: (violent ? 9 : 3) * Math.sign(sim.theta || 1),
          landed: false,
        };
        this._outroTimer = 2.4;
      }

      if (this._t >= course.duration && this._outroTimer === null) {
        this._outroTimer = this._outcome === 'success' ? 1.8 : 1.4;
      }
    } else {
      this._outroTimer -= dt;
      if (this._cupFree && !this._cupFree.landed) {
        // keep physics ticking for the flying cup below
      }
      if (this._outroTimer <= 0) {
        this._raf = null;
        if (this._onDone) this._onDone();
        return;
      }
    }

    this._jolt *= Math.pow(0.0005, dt);

    // Flying cup physics
    if (this._cupFree && !this._cupFree.landed) {
      const c = this._cupFree;
      c.vy += 760 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vrot * dt;
      const gy = this._groundY();
      if (c.y >= gy - 8) {
        c.y = gy - 8;
        c.landed = true;
        this._puddle = 0.01;
        // splash!
        for (let i = 0; i < 14; i++) {
          this._droplets.spawn(c.x, gy + 30, i % 2 === 0 ? 1 : -1, 1.2, 1);
        }
      }
    }
    if (this._puddle > 0) this._puddle = Math.min(1, this._puddle + dt * 1.6);

    this._draw(dt);
    if (this._raf !== null) this._raf = requestAnimationFrame(this._frame.bind(this));
  }

  _groundY() { return this._h * 0.80; }
  _scale() { return clamp(this._h / 420, 0.72, 1.0); }

  _draw(dt) {
    const ctx = this._ctx;
    const w = this._w;
    const h = this._h;
    const course = this._course;
    const theme = COURSE_THEMES[course.id];
    const sim = this._sim;
    const groundY = this._groundY();
    const scale = this._scale();

    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    drawCourseScenery(ctx, theme, w, groundY);

    // Ground
    const gnd = ctx.createLinearGradient(0, groundY, 0, h);
    gnd.addColorStop(0, theme.groundTop);
    gnd.addColorStop(1, theme.ground);
    ctx.fillStyle = gnd;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Bumps along the path
    for (const b of course.bumps) {
      const bx = this._xFor(b.t);
      ctx.fillStyle = 'rgba(20, 32, 52, 0.45)';
      ctx.beginPath();
      ctx.ellipse(bx, groundY + 2, 16, 7, 0, Math.PI, 0);
      ctx.fill();
    }

    // Finish marker
    const fx = this._xFor(course.duration) + 44;
    ctx.font = `${Math.round(34 * scale + 8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(theme.finishIcon, fx, groundY + 4);
    ctx.font = '800 9px Orbitron, monospace';
    ctx.fillStyle = 'rgba(240, 200, 102, 0.85)';
    ctx.fillText(theme.finishLabel, fx, groundY + 16);

    // SWIRL-E
    const x = this._xFor(Math.min(this._t, course.duration));
    const mood = sim.fallen ? 'ko'
      : this._outcome === 'success' && this._t >= course.duration ? 'happy'
      : Math.abs(sim.theta) > 0.32 ? 'dizzy'
      : Math.abs(sim.theta) > 0.14 ? 'worried'
      : 'calm';

    const hand = drawSwirle(ctx, {
      x: x - 30 * scale, groundY, scale,
      theta: sim.theta, slosh: sim.slosh, lemonade: sim.lemonade,
      mood, wobblePhase: this._wobblePhase, jolt: this._jolt,
    });
    drawTray(ctx, hand.handX, hand.handY, sim.theta, scale, {
      visible: !this._cupFree, lemonade: sim.lemonade, slosh: sim.slosh,
    });

    drawControlForces(ctx, hand.handX, hand.handY, sim, this._sim.kpSlider, this._sim.kdSlider, scale);

    // Spills
    if (sim.spilling && !sim.fallen) {
      this._droplets.spawn(hand.handX, hand.handY, Math.sign(sim.slosh) || 1,
        sim.spillIntensity, sim.spillIntensity > 0.5 ? 3 : 2);
    }
    this._droplets.stepAndDraw(ctx, dt, groundY + 26);

    // Free-flying cup after a fall
    if (this._cupFree) {
      const c = this._cupFree;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      drawCup(ctx, 0, 0, scale, c.landed ? 0 : 0.3, 0, 0);
      ctx.restore();
      if (this._puddle > 0) {
        ctx.fillStyle = 'rgba(250, 216, 90, 0.55)';
        ctx.beginPath();
        ctx.ellipse(c.x, groundY + 26, 30 * this._puddle + 8, 7 * this._puddle + 2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Bump name popup
    if (this._bumpFlash && this._t - this._bumpFlash.t < 1.3) {
      const age = this._t - this._bumpFlash.t;
      const alpha = clamp(1.2 - age, 0, 1);
      ctx.font = '900 14px Nunito, sans-serif';
      ctx.fillStyle = `rgba(240, 200, 102, ${alpha})`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this._bumpFlash.name, x, groundY - 250 * scale - age * 26);
    }

    // Lemonade gauge + pace
    drawLemonadeGauge(ctx, sim, 14, 12, course.passFraction);
    drawPaceBadge(ctx, course, this._t, w);

    // Outcome banner during outro
    if (this._outroTimer !== null) {
      const labels = {
        success:  { text: 'DELIVERED!',        color: '#40e880' },
        fall:     { text: 'TIPPED OVER!',      color: '#ff6a55' },
        shake:    { text: 'SHOOK APART!',      color: '#ff6a55' },
        wobble:   { text: 'LEMONADE SPRINKLER!', color: '#ffcc44' },
        sluggish: { text: 'TOO SLEEPY...',     color: '#ffcc44' },
      };
      const lbl = labels[this._outcome];
      if (lbl) {
        ctx.font = `900 ${Math.round(22 * scale + 8)}px Orbitron, monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = lbl.color;
        ctx.fillText(lbl.text, w / 2, h * 0.2);
      }
      if (this._outcome === 'success') {
        this._drawSparkles(ctx, fx, groundY, scale);
      }
    }
  }

  _drawSparkles(ctx, fx, groundY, scale) {
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const a = this._t * 3 + i * (Math.PI * 2 / 7);
      const r = 30 + Math.sin(this._t * 5 + i) * 10;
      const px = fx + Math.cos(a) * r;
      const py = groundY - 50 * scale + Math.sin(a) * r * 0.6;
      const alpha = 0.5 + 0.5 * Math.sin(this._t * 7 + i * 2);
      ctx.fillStyle = `rgba(255, 230, 130, ${alpha * 0.9})`;
      ctx.font = `${10 + (i % 3) * 4}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('✦', px, py);
    }
    ctx.restore();
  }
}
