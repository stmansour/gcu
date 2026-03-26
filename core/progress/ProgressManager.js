/**
 * ProgressManager — shared progress persistence for any game.
 *
 * Wraps GameStorage with a standardised chapter-completion API so every game
 * uses the same storage key shape: { completedChapters: string[] }.
 *
 * Usage:
 *   const pm = new ProgressManager('robot-lab');
 *   const done = await pm.getCompletedChapters();   // Set<string>
 *   await pm.markChapterComplete('ch2-optics');
 *   await pm.clearProgress();
 */

import { GameStorage } from '../storage/index.js';

export class ProgressManager {
  /** @param {string} gameId  Storage namespace, e.g. 'robot-lab' */
  constructor(gameId) {
    this._storage = new GameStorage(gameId);
  }

  /** Returns the raw progress object: { completedChapters: string[] } */
  async getProgress() {
    return this._storage.get('progress', { completedChapters: [] });
  }

  /** Returns a Set of completed chapter IDs. */
  async getCompletedChapters() {
    const p = await this.getProgress();
    return new Set(p.completedChapters ?? []);
  }

  /** Marks a chapter as complete (idempotent). */
  async markChapterComplete(chapterId) {
    const p = await this.getProgress();
    if (!p.completedChapters.includes(chapterId)) {
      p.completedChapters.push(chapterId);
      await this._storage.set('progress', p);
    }
    return p;
  }

  /** Resets all progress for this game. */
  async clearProgress() {
    await this._storage.set('progress', { completedChapters: [] });
  }
}
