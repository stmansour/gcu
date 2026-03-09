/**
 * JournalPage — Grandpa's notebook page component. Handwriting font, optional sketch.
 */

import { el } from '../utils/dom.js';

/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} opts.body - HTML or text
 * @param {string} [opts.buttonLabel] - e.g. "Let's Try It!"
 * @param {() => void} [opts.onButton]
 * @returns {HTMLElement}
 */
export function journalPage(opts) {
  const root = el('div', { className: 'journal-page' });
  root.innerHTML = `
    <div class="journal-page__inner">
      <div class="journal-page__paper">
        ${opts.title ? `<h2 class="journal-page__title">${opts.title}</h2>` : ''}
        <div class="journal-page__body scrollable">${opts.body}</div>
        ${opts.buttonLabel && opts.onButton
          ? `<button type="button" class="journal-page__btn" data-tap min-height="60">${opts.buttonLabel}</button>`
          : ''}
      </div>
    </div>
  `;
  const btn = root.querySelector('.journal-page__btn');
  if (btn && opts.onButton) btn.addEventListener('click', opts.onButton);
  return root;
}
