/**
 * Robot Lab — Game entry point.
 * Registers all Robot Lab scenes with the shared SceneManager.
 *
 * Scene ID convention: robot-lab-[concept]
 *   robot-lab-title    — title / chapter picker
 *   robot-lab-circuit  — Ch 1: Electricity (circuit wiring)
 *   robot-lab-optics   — Ch 2: Optics (lens placement)
 *   (future chapters follow the same pattern)
 */

import { TitleScene }           from './scenes/TitleScene.js';
import { CircuitMissionScene }  from './scenes/CircuitMissionScene.js';
import { OpticsMissionScene }   from './scenes/OpticsMissionScene.js';
import { ColorMissionScene }    from './scenes/ColorMissionScene.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export function initRobotLab(sceneManager) {
  sceneManager.register('robot-lab-title',   new TitleScene({ sceneManager }));
  sceneManager.register('robot-lab-circuit', new CircuitMissionScene({ sceneManager }));
  sceneManager.register('robot-lab-optics',  new OpticsMissionScene({ sceneManager }));
  sceneManager.register('robot-lab-color',   new ColorMissionScene({ sceneManager }));
}
