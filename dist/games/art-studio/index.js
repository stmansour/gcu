/**
 * Art Studio — Game module. Registers scenes with the global SceneManager.
 */

import { TitleScene } from './scenes/TitleScene.js';
import { JournalScene } from './scenes/JournalScene.js';
import { MissionScene } from './scenes/MissionScene.js';
import { SandboxScene } from './scenes/SandboxScene.js';

/**
 * @param {import('../../core/scene/SceneManager.js').SceneManager} sceneManager
 */
export async function initArtStudio(sceneManager) {
  sceneManager.register('art-studio-title', new TitleScene({ sceneManager }));
  sceneManager.register('art-studio-journal', new JournalScene({ sceneManager }));
  sceneManager.register('art-studio-mission', new MissionScene({ sceneManager }));
  sceneManager.register('art-studio-sandbox', new SandboxScene({ sceneManager }));
  const audio = (await import('../../core/audio/index.js')).AudioManager.getInstance();
  await Promise.all([
    audio.load('chime', 'assets/audio/chime.mp3', 'sfx'),
    audio.load('splat', 'assets/audio/splat.mp3', 'sfx'),
    audio.load('celebrate', 'assets/audio/celebrate.mp3', 'sfx'),
  ]).catch(() => {});
}
