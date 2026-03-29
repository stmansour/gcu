/**
 * SceneManager — state machine for screens. Registers scenes, handles transitions.
 */

export class SceneManager {
  /**
   * @param {HTMLElement} container - Root element to render scenes into (e.g. #app)
   */
  constructor(container) {
    this.container = container;
    this.scenes = new Map();
    this.currentSceneId = null;
    this.currentScene = null;
    this.history = [];
  }

  /**
   * @param {string} id - Scene id
   * @param {import('./Scene.js').Scene} scene - Scene instance
   */
  register(id, scene) {
    this.scenes.set(id, scene);
  }

  /**
   * Navigate to a scene. Clears container, calls exit on current, enter on next.
   * @param {string} sceneId
   * @param {object} [data] - Passed to scene.enter(container, data)
   * @param {{ transition?: string, duration?: number }} [opts]
   */
  go(sceneId, data = {}, _opts = {}) {
    const next = this.scenes.get(sceneId);
    if (!next) {
      console.warn('[SceneManager] Unknown scene:', sceneId);
      return;
    }
    const prevId = this.currentSceneId;
    const prev = this.currentScene;
    if (prev) {
      prev.exit(this.container);
      this.history.push(prevId);
    }
    this.container.innerHTML = '';
    this.currentSceneId = sceneId;
    this.currentScene = next;
    next.enter(this.container, data);
  }

  /**
   * Return to the previous scene (from history). No data passed.
   */
  back() {
    const prevId = this.history.pop();
    if (!prevId) return;
    const prev = this.scenes.get(prevId);
    if (!prev) return;
    if (this.currentScene) this.currentScene.exit(this.container);
    this.container.innerHTML = '';
    this.currentSceneId = prevId;
    this.currentScene = prev;
    prev.enter(this.container, {});
  }

  getCurrentSceneId() {
    return this.currentSceneId;
  }
}
