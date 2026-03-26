/**
 * Robot Lab — chapter list and scene routing table.
 *
 * Used by TitleScene (chapter picker), CircuitMissionScene, and OpticsMissionScene
 * so there's one canonical definition to update as new chapters are added.
 *
 * Scene ID convention: robot-lab-[concept]
 * When adding a new chapter, register its scene in index.js and add an entry here.
 * Chapters without an explicit entry fall back to robot-lab-circuit with the
 * chapter id passed as missionId (generic fallback for future chapters).
 */

/** Full ordered chapter list. */
export const ROBOT_LAB_CHAPTERS = [
  { id: 'ch1-power',        label: 'Electricity'     },
  { id: 'ch2-optics',       label: 'Optics'          },
  { id: 'ch3-color',        label: 'Color Sensing'   },
  { id: 'ch4-motors',       label: 'Motors'          },
  { id: 'ch5-control',      label: 'Control'         },
  { id: 'ch6-sound',        label: 'Sound'           },
  { id: 'ch7-logic',        label: 'Logic'           },
  { id: 'ch8-navigation',   label: 'Navigation'      },
  { id: 'ch9-power-mgmt',   label: 'Power'           },
  { id: 'ch10-integration', label: 'Integration'     },
];

/**
 * Maps chapter id → scene routing info.
 * Chapters with dedicated scenes are listed here; anything not listed falls
 * back to the robot-lab-circuit scene using the chapter id as missionId.
 */
export const CHAPTER_SCENES = {
  'ch1-power':  { scene: 'robot-lab-circuit', missionId: 'ch1-power' },
  'ch2-optics': { scene: 'robot-lab-optics' },
  'ch3-color':  { scene: 'robot-lab-color'  },
};
