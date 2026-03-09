/**
 * Robot Lab — Game entry point.
 * Registers all Robot Lab scenes with the shared SceneManager.
 */

import { TitleScene }   from './scenes/TitleScene.js';
import { MissionScene } from './scenes/MissionScene.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export function initRobotLab(sceneManager) {
  sceneManager.register('robot-lab-title',   new TitleScene({ sceneManager }));
  sceneManager.register('robot-lab-mission', new MissionScene({ sceneManager }));
}
