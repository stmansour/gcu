/**
 * LayoutManager — device detection, orientation, safe areas, breakpoints.
 * Singleton. Used by hub and all games for responsive layout.
 */

const BREAKPOINTS = [
  'phone-portrait',
  'phone-landscape',
  'tablet-portrait',
  'tablet-landscape',
  'desktop',
];

let instance = null;
let breakpointListeners = [];

function getDevice() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const ua = navigator.userAgent || '';
  const isIPad = /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/.test(ua);
  if (isIPad) return 'ipad';
  if (isIPhone) return 'iphone';
  return 'desktop';
}

function getOrientation() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  return w >= h ? 'landscape' : 'portrait';
}

function getBreakpoint() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const device = getDevice();
  const portrait = h >= w;
  if (device === 'desktop') {
    return w >= 1280 ? 'desktop' : (portrait ? 'tablet-portrait' : 'tablet-landscape');
  }
  if (device === 'ipad') {
    return portrait ? 'tablet-portrait' : 'tablet-landscape';
  }
  return portrait ? 'phone-portrait' : 'phone-landscape';
}

function getSafeArea() {
  const style = getComputedStyle(document.documentElement);
  const parse = (v) => {
    if (!v || v === '0px') return 0;
    return parseInt(v, 10) || 0;
  };
  return {
    top: parse(style.getPropertyValue('--safe-top') || style.getPropertyValue('env(safe-area-inset-top)')),
    bottom: parse(style.getPropertyValue('--safe-bottom') || style.getPropertyValue('env(safe-area-inset-bottom)')),
    left: parse(style.getPropertyValue('--safe-left') || style.getPropertyValue('env(safe-area-inset-left)')),
    right: parse(style.getPropertyValue('--safe-right') || style.getPropertyValue('env(safe-area-inset-right)')),
  };
}

export class LayoutManager {
  static getInstance() {
    if (!instance) instance = new LayoutManager();
    return instance;
  }

  constructor() {
    this._device = getDevice();
    this._orientation = getOrientation();
    this._breakpoint = getBreakpoint();
    this._safeArea = getSafeArea();
    this._resizeHandler = () => this._update();
    window.addEventListener('resize', this._resizeHandler);
  }

  get device() {
    return this._device;
  }

  get orientation() {
    return this._orientation;
  }

  get breakpoint() {
    return this._breakpoint;
  }

  get safeArea() {
    return { ...this._safeArea };
  }

  _update() {
    const prevBp = this._breakpoint;
    this._device = getDevice();
    this._orientation = getOrientation();
    this._breakpoint = getBreakpoint();
    this._safeArea = getSafeArea();
    if (prevBp !== this._breakpoint) {
      breakpointListeners.forEach((fn) => fn(this._breakpoint));
    }
  }

  onBreakpointChange(fn) {
    breakpointListeners.push(fn);
    return () => {
      breakpointListeners = breakpointListeners.filter((f) => f !== fn);
    };
  }

  async lockOrientation(orientation) {
    if (typeof window.Capacitor === 'undefined' || !window.Capacitor.Plugins?.ScreenOrientation) return;
    const { ScreenOrientation } = window.Capacitor.Plugins;
    await ScreenOrientation.lock({ orientation });
  }

  destroy() {
    window.removeEventListener('resize', this._resizeHandler);
    breakpointListeners = [];
    instance = null;
  }
}
