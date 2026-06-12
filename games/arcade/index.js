/**
 * Arcade — Game entry point.
 * Registers the arcade game-picker scene with the shared SceneManager.
 */

import { ArcadeScene } from './scenes/ArcadeScene.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export function initArcade(sceneManager) {
  sceneManager.register('arcade-title', new ArcadeScene({ sceneManager }));
}
