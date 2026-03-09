/**
 * device — Platform detection (iPad, iPhone, desktop, Capacitor).
 */

export function isCapacitor() {
  return typeof window !== 'undefined' && window.Capacitor != null;
}

export function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isIPad() {
  const ua = navigator.userAgent || '';
  return /iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isIPhone() {
  return /iPhone/.test(navigator.userAgent || '');
}
