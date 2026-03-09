/**
 * animate — Promise-based CSS animation trigger. GPU-friendly (transform, opacity).
 */

/**
 * Run a CSS animation on element, resolve when done.
 * @param {HTMLElement} element
 * @param {string} animationName - CSS @keyframes name
 * @param {{ duration?: number, easing?: string }} [opts]
 * @returns {Promise<void>}
 */
export function animate(element, animationName, opts = {}) {
  const duration = opts.duration ?? 400;
  const easing = opts.easing ?? 'ease-out';
  element.style.animation = 'none';
  element.offsetHeight;
  element.style.willChange = 'transform, opacity';
  element.style.animation = `${animationName} ${duration}ms ${easing} forwards`;
  return new Promise((resolve) => {
    const done = () => {
      element.removeEventListener('animationend', done);
      element.style.willChange = '';
      element.style.animation = '';
      resolve();
    };
    element.addEventListener('animationend', done);
    setTimeout(done, duration + 50);
  });
}
