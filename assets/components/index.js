/**
 * Component metadata extracted from the JSON files alongside each PNG asset.
 *
 * All pixel measurements are in the PNG's own coordinate space (2× resolution).
 *   termA = terminal_left  (top  for _v, left  for _h)
 *   termB = terminal_right (bottom for _v, right for _h)
 *
 * Placement formula (see SchematicRenderer._computeImageRect):
 *   scale  = svgSpan / pixSpan
 *   imgX   = svgA.x − termA.x * scale
 *   imgY   = svgA.y − termA.y * scale
 *   imgW   = width  * scale
 *   imgH   = height * scale
 */

export const COMPONENTS = {
  battery_h: {
    width: 251, height: 152,
    termA: { x:   0, y: 76 },
    termB: { x: 250, y: 76 },
  },
  battery_v: {
    width: 144, height: 252,
    termA: { x: 72, y:   0 },
    termB: { x: 72, y: 251 },
  },
  resistor_v: {
    width: 98,  height: 396,
    termA: { x: 49, y:   0 },
    termB: { x: 49, y: 395 },
  },
  resistor_h: {
    width: 388, height: 96,
    termA: { x:   0, y: 48 },
    termB: { x: 387, y: 48 },
  },
  capacitor_v: {
    width: 108, height: 288,
    termA: { x: 54, y:   0 },
    termB: { x: 54, y: 287 },
  },
  // NOTE: capacitor_h.json has a copy-paste error (type says "inductor_h") and
  // termB.x (359) exceeds width (284). Not used in Chapter 1 — fix before use.
  capacitor_h: {
    width: 284, height: 118,
    termA: { x:   0, y: 68 },
    termB: { x: 359, y: 68 },
  },
  inductor_v: {
    width: 98,  height: 368,
    termA: { x: 29, y:   0 },
    termB: { x: 29, y: 367 },
  },
  inductor_h: {
    width: 359, height: 96,
    termA: { x:   0, y: 68 },
    termB: { x: 358, y: 68 },
  },
};

/**
 * Base URL for PNG files — resolves to the directory containing this module.
 * Works on localhost, Capacitor, and any other origin.
 */
export const COMPONENTS_BASE_URL = new URL('./', import.meta.url).href;
