/**
 * PuzzleLoader — loads and caches Puzzle Forest puzzle definitions.
 */

export class PuzzleLoader {
  constructor(url) {
    this.url = url;
    this._data = null;
  }

  async load() {
    if (this._data) return this._data;
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`[PuzzleLoader] Failed to load ${this.url}`);
    this._data = await res.json();
    return this._data;
  }

  getCategories() {
    return this._data?.categories ?? [];
  }

  getCategory(categoryId) {
    return this.getCategories().find((category) => category.id === categoryId) ?? null;
  }

  getPuzzlesByCategory(categoryId) {
    const puzzles = this._data?.puzzles ?? [];
    return puzzles.filter((puzzle) => puzzle.categoryId === categoryId);
  }
}
