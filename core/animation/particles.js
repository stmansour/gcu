/**
 * particles — Burst of colored particles (confetti, sparkle). Transform + opacity only.
 */

/**
 * @param {object} opts
 * @param {{ x: number, y: number }} opts.origin
 * @param {number} [opts.count=12]
 * @param {string[]} [opts.colors]
 * @param {string} [opts.type='confetti']
 * @param {number} [opts.duration=800]
 * @param {HTMLElement} opts.container
 */
export function particles({ origin, count = 12, colors = ['#FFD700', '#FF6B6B', '#5CBDB9'], type = 'confetti', duration = 800, container }) {
  if (!container) return;
  const fragment = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'particle particle--' + type;
    const color = colors[i % colors.length];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const vel = 80 + Math.random() * 120;
    const dx = Math.cos(angle) * vel;
    const dy = Math.sin(angle) * vel;
    el.style.cssText = `
      position: absolute;
      left: ${origin.x}px;
      top: ${origin.y}px;
      width: 8px;
      height: 8px;
      background: ${color};
      border-radius: ${type === 'confetti' ? '1px' : '50%'};
      pointer-events: none;
      will-change: transform, opacity;
      transform: translate(-50%, -50%) scale(0);
      opacity: 1;
    `;
    el.dataset.dx = String(dx);
    el.dataset.dy = String(dy);
    container.appendChild(el);
    fragment.appendChild(el);
  }
  const start = performance.now();
  function tick(t) {
    const elapsed = t - start;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - (1 - progress) ** 2;
    const opacity = 1 - progress;
    container.querySelectorAll('.particle').forEach((el) => {
      const dx = parseFloat(el.dataset.dx || 0);
      const dy = parseFloat(el.dataset.dy || 0);
      el.style.transform = `translate(${-50 + dx * easeOut}px, ${-50 + dy * easeOut}px) scale(${easeOut})`;
      el.style.opacity = String(opacity);
    });
    if (progress < 1) requestAnimationFrame(tick);
    else container.querySelectorAll('.particle').forEach((p) => p.remove());
  }
  requestAnimationFrame(tick);
}
