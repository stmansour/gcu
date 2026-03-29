/**
 * spring — Simple spring physics for pop-in effects. Uses transform/opacity only.
 */

/**
 * Animate element from -> to with spring. Uses requestAnimationFrame.
 * @param {HTMLElement} element
 * @param {{ scale?: number, opacity?: number }} from
 * @param {{ scale?: number, opacity?: number }} to
 * @param {{ stiffness?: number, damping?: number }} [opts]
 */
export function spring(element, { from = {}, to = {} }, opts = {}) {
  const stiffness = opts.stiffness ?? 200;
  const damping = opts.damping ?? 15;
  let scale = from.scale ?? 1;
  let opacity = from.opacity ?? 1;
  const targetScale = to.scale ?? 1;
  const targetOpacity = to.opacity ?? 1;
  let vScale = 0;
  let vOpacity = 0;
  element.style.willChange = 'transform, opacity';
  element.style.transform = `scale(${scale})`;
  element.style.opacity = String(opacity);

  function tick() {
    const dt = 1 / 60;
    vScale += (targetScale - scale) * stiffness * dt;
    vOpacity += (targetOpacity - opacity) * stiffness * dt;
    vScale *= 1 - damping * dt * 0.1;
    vOpacity *= 1 - damping * dt * 0.1;
    scale += vScale * dt;
    opacity += vOpacity * dt;
    if (Math.abs(vScale) < 0.001 && Math.abs(scale - targetScale) < 0.001 &&
        Math.abs(vOpacity) < 0.001 && Math.abs(opacity - targetOpacity) < 0.001) {
      scale = targetScale;
      opacity = targetOpacity;
      element.style.transform = `scale(${scale})`;
      element.style.opacity = String(opacity);
      element.style.willChange = '';
      return;
    }
    element.style.transform = `scale(${scale})`;
    element.style.opacity = String(opacity);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
