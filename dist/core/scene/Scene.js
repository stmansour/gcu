/**
 * Scene — base class for all screens. Lifecycle: enter(), exit().
 */

export class Scene {
  /**
   * Called when this scene becomes active. Build DOM, attach listeners.
   * @param {HTMLElement} container - App container (cleared by SceneManager on transition)
   * @param {object} [data] - Optional payload from previous scene
   */
  enter(_container, _data) {
    // Override in subclass
  }

  /**
   * Called when leaving this scene. Remove listeners, stop timers. Container is cleared by SceneManager.
   * @param {HTMLElement} container
   */
  exit(_container) {
    // Override in subclass
  }
}
