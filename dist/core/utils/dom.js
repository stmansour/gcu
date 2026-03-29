/**
 * dom — Safe DOM helpers.
 */

/**
 * @param {string} tag
 * @param {{ className?: string, dataset?: object, [key: string]: any }} [attrs]
 * @param {(Node|string)[]} [children]
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'className') node.className = v;
    else if (k === 'dataset' && v && typeof v === 'object') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v != null && v !== false) node.setAttribute(k, String(v));
  }
  children.forEach((c) => node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
  return node;
}

export function toggleClass(element, className, force) {
  if (force === undefined) element.classList.toggle(className);
  else element.classList.toggle(className, !!force);
}
