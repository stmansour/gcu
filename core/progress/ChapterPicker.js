/**
 * ChapterPicker — shared modal overlay for jumping to any unlocked chapter.
 *
 * Shown on a game's title screen when the player has existing progress.
 * Accessible chapters: every completed chapter + the first uncompleted one
 * (the chapter the player is currently working on).
 *
 * Returns a Promise resolving to one of:
 *   { action: 'select', chapterId }  — jump to a specific chapter
 *   { action: 'clear'  }             — progress was cleared (caller should nav to ch1)
 *   { action: 'cancel' }             — player pressed Back
 */
export class ChapterPicker {
  /**
   * @param {HTMLElement}             container         Scene root element
   * @param {object}                  opts
   * @param {Array<{id,label}>}       opts.chapters     Full ordered chapter array
   * @param {Set<string>}             opts.completedChapters
   * @returns {Promise<{action:string, chapterId?:string}>}
   */
  static show(container, { chapters, completedChapters }) {
    return new Promise((resolve) => {
      // The "current" chapter is the first one not yet completed.
      const currentIdx = chapters.findIndex(ch => !completedChapters.has(ch.id));

      const overlay = document.createElement('div');
      overlay.className = 'cp-overlay';

      const rowsHTML = chapters.map((ch, i) => {
        const done       = completedChapters.has(ch.id);
        const isCurrent  = i === currentIdx;
        const accessible = done || isCurrent;

        const state = done ? 'done' : isCurrent ? 'current' : 'locked';
        const icon  = done ? '✓'    : isCurrent ? '▶'       : '◌';

        return `<li class="cp-item cp-item--${state}"
                    data-id="${ch.id}"
                    tabindex="${accessible ? '0' : '-1'}"
                    role="button"
                    aria-disabled="${accessible ? 'false' : 'true'}">
          <span class="cp-item__icon">${icon}</span>
          <span class="cp-item__num">Ch ${i + 1}</span>
          <span class="cp-item__label">${ch.label}</span>
        </li>`;
      }).join('');

      overlay.innerHTML = `
        <div class="cp-dialog" role="dialog" aria-label="Choose your chapter">
          <h2 class="cp-dialog__title">Choose Your Chapter</h2>
          <ul class="cp-list" role="list">${rowsHTML}</ul>
          <div class="cp-dialog__footer">
            <button type="button" class="cp-btn cp-btn--begin">Start from Beginning</button>
            <button type="button" class="cp-btn cp-btn--clear">Clear Progress</button>
          </div>
          <button type="button" class="cp-btn cp-btn--back">← Back</button>
        </div>
      `;

      container.appendChild(overlay);

      const cleanup = () => overlay.remove();
      const go = (result) => { cleanup(); resolve(result); };

      // ── Chapter row clicks ──────────────────────────────────────────────────
      overlay.querySelectorAll('.cp-item--done, .cp-item--current').forEach(el => {
        const activate = () => go({ action: 'select', chapterId: el.dataset.id });
        el.addEventListener('click', activate);
        el.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
        });
      });

      // ── Start from Beginning ────────────────────────────────────────────────
      overlay.querySelector('.cp-btn--begin').addEventListener('click', () => {
        go({ action: 'select', chapterId: chapters[0].id });
      });

      // ── Clear Progress (two-click confirmation) ─────────────────────────────
      const clearBtn = overlay.querySelector('.cp-btn--clear');
      let confirmPending = false;
      let confirmTimer   = null;

      clearBtn.addEventListener('click', () => {
        if (!confirmPending) {
          confirmPending = true;
          clearBtn.textContent = 'Are you sure?';
          clearBtn.classList.add('cp-btn--confirm');
          confirmTimer = setTimeout(() => {
            confirmPending = false;
            clearBtn.textContent = 'Clear Progress';
            clearBtn.classList.remove('cp-btn--confirm');
          }, 3000);
        } else {
          clearTimeout(confirmTimer);
          go({ action: 'clear' });
        }
      });

      // ── Back / cancel ───────────────────────────────────────────────────────
      overlay.querySelector('.cp-btn--back').addEventListener('click', () => {
        go({ action: 'cancel' });
      });
    });
  }
}
