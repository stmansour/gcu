/**
 * color — HSL/RGB/hex conversion, mixing, comparison. Used by Art Studio and Robot Lab.
 */

/**
 * @param {number} h 0-360
 * @param {number} s 0-100
 * @param {number} l 0-100
 * @returns {string} hex
 */
export function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  const r = Math.round(f(0) * 255);
  const g = Math.round(f(8) * 255);
  const b = Math.round(f(4) * 255);
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} hex
 * @returns {{ h: number, s: number, l: number }}
 */
export function hexToHsl(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Mix array of { h, s, l } (subtractive-style: more pigments = darker).
 * @param {{ h: number, s: number, l: number }[]} colorBlobs
 * @returns {{ h: number, s: number, l: number } | null}
 */
export function mixColors(colorBlobs) {
  if (!colorBlobs.length) return null;
  if (colorBlobs.length === 1) return { ...colorBlobs[0] };
  let sinSum = 0;
  let cosSum = 0;
  let sSum = 0;
  let lSum = 0;
  const n = colorBlobs.length;
  for (const c of colorBlobs) {
    const rad = (c.h * Math.PI) / 180;
    sinSum += Math.sin(rad);
    cosSum += Math.cos(rad);
    sSum += c.s;
    lSum += c.l;
  }
  let h = (Math.atan2(sinSum / n, cosSum / n) * 180) / Math.PI;
  if (h < 0) h += 360;
  const avgS = sSum / n;
  let avgL = lSum / n;
  const darken = Math.max(0.7, 1 - (n - 1) * 0.08);
  avgL *= darken;
  return {
    h,
    s: Math.min(100, avgS),
    l: Math.max(5, Math.min(95, avgL)),
  };
}

/**
 * @param {{ h: number, s: number, l: number }} mixed
 * @param {{ h: number, s: number, l: number }} target
 * @param {number} tolerance
 * @returns {{ isMatch: boolean, score: number, proximity: number }}
 */
export function colorsMatch(mixed, target, tolerance = 15) {
  const hueDiff = Math.min(
    Math.abs(mixed.h - target.h),
    360 - Math.abs(mixed.h - target.h)
  );
  const satDiff = Math.abs(mixed.s - target.s);
  const lightDiff = Math.abs(mixed.l - target.l);
  const score = hueDiff * 1.0 + satDiff * 0.5 + lightDiff * 0.5;
  return {
    isMatch: score <= tolerance,
    score,
    proximity: Math.max(0, 1 - score / (tolerance * 2)),
  };
}
