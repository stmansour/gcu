/**
 * Hub — Entry point for the entire GCU app.
 * Boots core systems, registers all scenes, starts at avatar select
 * (or jumps straight to hub if a player was already chosen).
 */

import { SceneManager } from '../core/scene/index.js';
import { LayoutManager } from '../core/layout/index.js';
import { GameStorage } from '../core/storage/index.js';
import { AvatarSelectScene } from './scenes/AvatarSelectScene.js';
import { HubScene } from './scenes/HubScene.js';
import { initArtStudio } from '../games/art-studio/index.js';
import { initRobotLab }  from '../games/robot-lab/index.js';
import { initPuzzleForest } from '../games/puzzle-forest/index.js';

const app = document.getElementById('app');
if (!app) throw new Error('[GCU] #app element not found');

const sceneManager = new SceneManager(app);
LayoutManager.getInstance();

/**
 * Game registry.
 * - available: true  → portal is interactive and launches the game
 * - available: false → portal shows "Coming Soon"
 * - previewImage     → path to portal card background image (null = show icon placeholder)
 *                      See gcu/assets/images/portals/*.prompt.txt for generation prompts.
 *
 * Order matches concept art: Robot Lab | Art Studio | Gym Arena | Puzzle Forest
 */
const games = [
  {
    id: 'robot-lab',
    name: 'Robot Lab',
    icon: '🤖',
    available: true,
    sceneId: 'robot-lab-title',
    previewImage: 'assets/images/portals/portal-robot-lab.png',
  },
  {
    id: 'art-studio',
    name: 'Art Studio',
    icon: '🎨',
    available: false,
    sceneId: 'art-studio-title',
    previewImage: 'assets/images/portals/portal-art-studio.png',
  },
  {
    id: 'gym-arena',
    name: 'Gym Arena',
    icon: '🤸',
    available: false,
    sceneId: 'gym-arena-title',
    previewImage: 'assets/images/portals/portal-gym-arena.png',
  },
  {
    id: 'puzzle-forest',
    name: 'Puzzle Forest',
    icon: '🌲',
    available: true,
    sceneId: 'puzzle-forest-title',
    previewImage: 'assets/images/portals/portal-puzzle-forest.png',
  },
];

// Register hub scenes
sceneManager.register('avatar-select', new AvatarSelectScene({ sceneManager }));
sceneManager.register('hub', new HubScene({ sceneManager, games }));

// Register game scenes
await initArtStudio(sceneManager);
initRobotLab(sceneManager);
await initPuzzleForest(sceneManager);

// Start: skip avatar select if a player is already saved
const storage = new GameStorage('global');
const savedAvatar = await storage.get('selected-avatar', null);

if (savedAvatar) {
  sceneManager.go('hub', { avatarId: savedAvatar });
} else {
  sceneManager.go('avatar-select');
}
