/**
 * Art Studio — color mixing engine. Uses core color utils + primary-pair overrides.
 */

import { mixColors as coreMix, colorsMatch as coreMatch } from '../../../core/utils/color.js';

const PRIMARY_PAIR_OVERRIDES = {
  'red-blue': { h: 270, s: 70, l: 40 },
  'blue-red': { h: 270, s: 70, l: 40 },
  'red-yellow': { h: 25, s: 90, l: 55 },
  'yellow-red': { h: 25, s: 90, l: 55 },
  'blue-yellow': { h: 140, s: 60, l: 45 },
  'yellow-blue': { h: 140, s: 60, l: 45 },
};

function getPrimaryPairKey(blobs) {
  if (blobs.length !== 2) return null;
  const names = blobs.map((b) => b.name).sort();
  return names.join('-');
}

/**
 * Mix paint blobs. Uses core mixColors; overrides for primary pairs so e.g. blue+yellow = green.
 * @param {{ name: string, h: number, s: number, l: number }[]} colorBlobs
 * @returns {{ h: number, s: number, l: number } | null}
 */
export function mixColors(colorBlobs) {
  if (!colorBlobs.length) return null;
  if (colorBlobs.length === 1) return { h: colorBlobs[0].h, s: colorBlobs[0].s, l: colorBlobs[0].l };
  const key = getPrimaryPairKey(colorBlobs);
  if (key && PRIMARY_PAIR_OVERRIDES[key]) return { ...PRIMARY_PAIR_OVERRIDES[key] };
  const hslOnly = colorBlobs.map((b) => ({ h: b.h, s: b.s, l: b.l }));
  return coreMix(hslOnly);
}

export function colorsMatch(mixed, target, tolerance = 15) {
  return coreMatch(mixed, target, tolerance);
}
