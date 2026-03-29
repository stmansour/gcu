/**
 * Puzzle Forest — Game entry point.
 * Registers Puzzle Forest scenes with the shared SceneManager.
 */

import { TitleScene } from './scenes/TitleScene.js';
import { PuzzleScene } from './scenes/PuzzleScene.js';
import { PuzzleLoader } from './engine/PuzzleLoader.js';
import { AudioClips }  from '../../core/audio/index.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export async function initPuzzleForest(sceneManager) {
  const loader = new PuzzleLoader('games/puzzle-forest/puzzles/puzzles.json');
  await loader.load();

  // Load narration manifests in the background — tiny text files finish well
  // before the user navigates into a puzzle. WAV files load lazily on first play.
  AudioClips.getInstance().loadGame(
    'puzzle-forest',
    'games/puzzle-forest/assets/audio',
  );

  sceneManager.register('puzzle-forest-title', new TitleScene({ sceneManager, loader }));
  sceneManager.register('puzzle-forest-puzzle', new PuzzleScene({ sceneManager, loader }));
}
