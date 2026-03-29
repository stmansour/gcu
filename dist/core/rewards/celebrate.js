/**
 * celebrate — Shared celebration effects (small / medium / large).
 */

import { particles } from '../animation/particles.js';
import { AudioManager } from '../audio/AudioManager.js';

/**
 * @param {'small'|'medium'|'large'} intensity
 * @param {{ origin?: { x: number, y: number }, colors?: string[], duration?: number, message?: string, onComplete?: () => void }} [opts]
 */
export function celebrate(intensity, opts = {}) {
  const container = document.getElementById('app');
  if (!container) return;
  const origin = opts.origin ?? { x: container.offsetWidth / 2, y: container.offsetHeight / 2 };
  const colors = opts.colors ?? ['#FFD700', '#FF6B6B', '#5CBDB9'];
  const audio = AudioManager.getInstance();
  if (intensity === 'small') {
    particles({ origin, count: 8, colors, type: 'sparkle', duration: 600, container });
    audio.play('chime');
  } else if (intensity === 'medium') {
    particles({ origin, count: 16, colors, type: 'confetti', duration: 1000, container });
    audio.play('chime');
  } else {
    particles({ origin, count: 24, colors, type: 'confetti', duration: 1500, container });
    audio.play('celebrate');
    if (opts.onComplete) setTimeout(opts.onComplete, opts.duration ?? 2500);
  }
}
