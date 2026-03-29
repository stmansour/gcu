/**
 * Avatar manifest — all character metadata and asset paths.
 * Paths are relative to gcu/ (the app root / index.html location).
 */

export const AVATAR_IDS = ['leon', 'andre', 'jr', 'kaila', 'alanna'];

/**
 * Per-character metadata: display name, age, signature color, description.
 * Color is used for selection highlights and character-specific UI accents.
 */
export const AVATAR_META = {
  leon:   { displayName: 'Leon',   color: '#5A9E6F' },  // warm green (his plaid jacket)
  andre:  { displayName: 'Andre',  color: '#D4831A' },  // warm amber (his vest)
  jr:     { displayName: 'JR',     color: '#3A82C4' },  // sky blue (his soccer jersey)
  kaila:  { displayName: 'Kaila',  color: '#9B59B6' },  // artistic purple
  alanna: { displayName: 'Alanna', color: '#D4408A' },  // gymnast pink (her leotard)
};

/**
 * Primary avatar image per kid (neutral front-facing, full body).
 * Leon and Andre have clean neutral backgrounds — ideal for avatar picker.
 * JR, Kaila, Alanna have scene backgrounds — usable now, neutral versions to come.
 * See gcu/assets/characters/*.prompt.txt for generation prompts.
 */
export const AVATAR_IMAGES = {
  leon:   'CharacterSheets/Leon/avatars/carousel/Leon-avatar-000.png',
  andre:  'CharacterSheets/Andre/avatars/carousel/Andre - 000 deg.png',
  jr:     'CharacterSheets/JR/avatars/jr-neutral.png',
  kaila:  'CharacterSheets/Kaila/avatars/kaila-neutral.png',
  alanna: 'CharacterSheets/Alanna/avatars/alanna-neutral.png',
};

/**
 * 360° rotation videos per kid (used for spinning avatar display).
 * Only Leon, Andre, and JR have videos currently.
 */
export const AVATAR_VIDEOS = {
  leon:   'CharacterSheets/Leon/videos/leon-360.mp4',
  andre:  'CharacterSheets/Andre/videos/andre-rotation.mp4',
  jr:     'CharacterSheets/JR/videos/JR_Video_Ready_Angles_Questioned.mp4',
};

/**
 * Small badge image — tightly cropped face/upper body, for corner companion use.
 * Falls back to AVATAR_IMAGES if not available.
 */
export const AVATAR_BADGE_IMAGES = {
  leon:   'CharacterSheets/Leon/avatars/carousel/Leon-avatar-000.png',
  andre:  'CharacterSheets/Andre/avatars/carousel/Andre - 000 deg.png',
  jr:     'CharacterSheets/JR/avatars/jr-neutral.png',
  kaila:  'CharacterSheets/Kaila/avatars/kaila-neutral.png',
  alanna: 'CharacterSheets/Alanna/avatars/alanna-neutral.png',
};
