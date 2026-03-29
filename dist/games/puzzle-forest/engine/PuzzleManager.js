/**
 * PuzzleManager — mission state for one Puzzle Forest activity run.
 */

function shuffle(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export class PuzzleManager {
  constructor(loader) {
    this.loader = loader;
    this.category = null;
    this.mission = [];
    this.index = 0;
    this.placements = new Map();
  }

  startMission(categoryId, missionLength = 6) {
    this.category = this.loader.getCategory(categoryId);
    const available = this.loader.getPuzzlesByCategory(categoryId);
    this.mission = shuffle(available).slice(0, Math.min(missionLength, available.length));
    this.index = 0;
    this.placements = new Map();
    return this.mission;
  }

  getMissionLength() {
    return this.mission.length;
  }

  getCurrentPuzzle() {
    return this.mission[this.index] ?? null;
  }

  getCurrentPlacements() {
    return this.placements;
  }

  getSolvedCount() {
    return this.index;
  }

  getProgress() {
    return {
      solved: this.index,
      total: this.mission.length,
    };
  }

  checkPlacement(objectId, targetId) {
    const puzzle = this.getCurrentPuzzle();
    if (!puzzle) return { matched: false, reason: 'missing-puzzle' };

    const target = puzzle.targets.find((entry) => entry.id === targetId);
    const object = puzzle.objects.find((entry) => entry.id === objectId);
    if (!target || !object) return { matched: false, reason: 'unknown-item' };
    if (this.placements.has(targetId)) return { matched: false, reason: 'target-filled', target, object };

    const matched = target.accepts.includes(objectId);
    if (!matched) return { matched: false, reason: 'wrong-match', target, object };

    this.placements.set(targetId, objectId);
    const puzzleComplete = puzzle.targets.every((entry) => this.placements.has(entry.id));
    return { matched: true, puzzleComplete, target, object };
  }

  isObjectPlaced(objectId) {
    for (const placed of this.placements.values()) {
      if (placed === objectId) return true;
    }
    return false;
  }

  getPlacedObjectForTarget(targetId) {
    const puzzle = this.getCurrentPuzzle();
    const objectId = this.placements.get(targetId);
    if (!puzzle || !objectId) return null;
    return puzzle.objects.find((entry) => entry.id === objectId) ?? null;
  }

  advancePuzzle() {
    this.index += 1;
    this.placements = new Map();
    return this.index < this.mission.length;
  }

  isMissionComplete() {
    return this.index >= this.mission.length;
  }
}
