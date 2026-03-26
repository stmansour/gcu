/**
 * Puzzle Forest — Game entry point.
 * Registers Puzzle Forest scenes with the shared SceneManager.
 */

import { TitleScene } from './scenes/TitleScene.js';
import { PuzzleScene } from './scenes/PuzzleScene.js';
import { PuzzleLoader } from './engine/PuzzleLoader.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export async function initPuzzleForest(sceneManager) {
  const loader = new PuzzleLoader('games/puzzle-forest/puzzles/puzzles.json');
  await loader.load();

  sceneManager.register('puzzle-forest-title', new TitleScene({ sceneManager, loader }));
  sceneManager.register('puzzle-forest-puzzle', new PuzzleScene({ sceneManager, loader }));
}
