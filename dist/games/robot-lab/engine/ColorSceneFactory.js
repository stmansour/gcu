/**
 * ColorSceneFactory
 *
 * Draws programmatic source scenes onto a canvas element.
 * Each scene is chosen to contain strong, well-separated RGB areas so that
 * mis-routed channels produce obviously wrong results.
 *
 * Also draws the white calibration patch — a neutral white square that
 * appears in every scene. When gains are correctly balanced the patch
 * should look pure white (R=G=B=255). Kids use it as a reference.
 */

const W = 400;
const H = 300;

/** Draw a white calibration patch at the bottom-right of any scene. */
function drawCalibPatch(ctx) {
  const pw = 56, ph = 40, margin = 10;
  const x  = W - pw - margin;
  const y  = H - ph - margin;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(x, y, pw, ph);
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth   = 1;
  ctx.strokeRect(x, y, pw, ph);
  ctx.fillStyle   = 'rgba(0,0,0,0.35)';
  ctx.font        = '9px sans-serif';
  ctx.textAlign   = 'center';
  ctx.fillText('WHITE', x + pw / 2, y + ph / 2 + 3);
}

// ── Individual scene drawers ───────────────────────────────────────────────

function drawFruit(ctx) {
  // Warm cream background
  ctx.fillStyle = '#FFF8E7';
  ctx.fillRect(0, 0, W, H);

  // Table surface
  ctx.fillStyle = '#A0784C';
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
  // table edge highlight
  ctx.fillStyle = '#C49A6C';
  ctx.fillRect(0, H * 0.62, W, 4);

  // Bowl (dark grey ellipse)
  ctx.fillStyle = '#555566';
  ctx.beginPath();
  ctx.ellipse(W / 2, H * 0.72, 130, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Red apple
  ctx.fillStyle = '#CC2200';
  ctx.beginPath();
  ctx.arc(W * 0.32, H * 0.52, 46, 0, Math.PI * 2);
  ctx.fill();
  // apple highlight
  ctx.fillStyle = 'rgba(255,180,180,0.45)';
  ctx.beginPath();
  ctx.arc(W * 0.30, H * 0.46, 14, 0, Math.PI * 2);
  ctx.fill();
  // stem
  ctx.strokeStyle = '#553311';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.32, H * 0.46 - 46);
  ctx.lineTo(W * 0.34, H * 0.46 - 56);
  ctx.stroke();
  // leaf
  ctx.fillStyle = '#33AA22';
  ctx.beginPath();
  ctx.ellipse(W * 0.37, H * 0.46 - 58, 12, 6, -0.6, 0, Math.PI * 2);
  ctx.fill();

  // Yellow banana (arc)
  ctx.fillStyle = '#FFCC00';
  ctx.lineWidth = 22;
  ctx.lineCap   = 'round';
  ctx.strokeStyle = '#FFCC00';
  ctx.beginPath();
  ctx.arc(W * 0.57, H * 0.3, 58, Math.PI * 0.6, Math.PI * 1.15);
  ctx.stroke();
  // banana tip dots
  ctx.fillStyle = '#996600';
  ctx.beginPath(); ctx.arc(W * 0.32, H * 0.395, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.575, H * 0.25, 4, 0, Math.PI * 2); ctx.fill();

  // Green pear
  ctx.fillStyle = '#55BB33';
  // pear body
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.6, 30, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  // pear top (narrower)
  ctx.beginPath();
  ctx.ellipse(W * 0.68, H * 0.47, 18, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  // pear highlight
  ctx.fillStyle = 'rgba(200,255,180,0.35)';
  ctx.beginPath();
  ctx.ellipse(W * 0.66, H * 0.44, 7, 10, -0.3, 0, Math.PI * 2);
  ctx.fill();
  // stem
  ctx.strokeStyle = '#553311';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W * 0.68, H * 0.25);
  ctx.lineTo(W * 0.69, H * 0.18);
  ctx.stroke();

  // Orange
  ctx.fillStyle = '#FF8800';
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.6, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,150,0.4)';
  ctx.beginPath();
  ctx.arc(W * 0.80, H * 0.55, 10, 0, Math.PI * 2);
  ctx.fill();

  drawCalibPatch(ctx);
}

function drawGarden(ctx) {
  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.62);
  skyGrad.addColorStop(0,   '#1A6ECC');
  skyGrad.addColorStop(1,   '#88CCFF');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, H * 0.62);

  // Grass
  const grassGrad = ctx.createLinearGradient(0, H * 0.58, 0, H);
  grassGrad.addColorStop(0, '#44BB22');
  grassGrad.addColorStop(1, '#228800');
  ctx.fillStyle = grassGrad;
  ctx.fillRect(0, H * 0.58, W, H * 0.42);

  // Sun
  ctx.fillStyle = '#FFE500';
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.15, 36, 0, Math.PI * 2);
  ctx.fill();
  // sun glow
  ctx.fillStyle = 'rgba(255,230,0,0.2)';
  ctx.beginPath();
  ctx.arc(W * 0.82, H * 0.15, 52, 0, Math.PI * 2);
  ctx.fill();

  // Cloud 1
  ctx.fillStyle = '#FFFFFF';
  for (const [cx, cy, r] of [[W*0.2,H*0.12,22],[W*0.26,H*0.09,28],[W*0.32,H*0.12,22],[W*0.38,H*0.13,18]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  }
  // Cloud 2
  for (const [cx, cy, r] of [[W*0.52,H*0.2,16],[W*0.57,H*0.17,20],[W*0.62,H*0.2,16]]) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill();
  }

  // Red tulips
  const tulips = [0.12, 0.28, 0.44, 0.58, 0.73];
  for (const tx of tulips) {
    const x = W * tx, y = H * 0.58;
    // stem
    ctx.strokeStyle = '#33AA22';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
    // petals
    ctx.fillStyle = '#DD1111';
    ctx.beginPath();
    ctx.ellipse(x, y - 50, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF4444';
    ctx.beginPath();
    ctx.ellipse(x - 9, y - 44, 9, 14, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 9, y - 44, 9, 14, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCalibPatch(ctx);
}

function drawColorCheck(ctx) {
  // Classic color checker layout
  ctx.fillStyle = '#222233';
  ctx.fillRect(0, 0, W, H);

  const swatches = [
    // Row 1: primaries and secondaries
    ['#FF0000','#00CC00','#0000FF','#FFFF00','#FF8800','#CC00CC'],
    // Row 2: cyan, pastels, skin tones
    ['#00CCCC','#FF88AA','#FFBB88','#AADDFF','#EECCFF','#AACCAA'],
    // Row 3: greyscale + near-white
    ['#000000','#333333','#666666','#999999','#CCCCCC','#FFFFFF'],
  ];

  const cols   = 6;
  const rows   = 3;
  const margin = 16;
  const gap    = 8;
  const sw     = (W - margin * 2 - gap * (cols - 1)) / cols;
  const sh     = (H - margin * 2 - gap * (rows - 1)) / rows - 6;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = margin + c * (sw + gap);
      const y = margin + r * (sh + gap);
      ctx.fillStyle   = swatches[r][c];
      ctx.beginPath();
      ctx.roundRect(x, y, sw, sh, 6);
      ctx.fill();
      // label
      ctx.fillStyle = (r === 2 && c < 2) ? '#AAAAAA' : 'rgba(0,0,0,0.5)';
      ctx.font      = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(swatches[r][c], x + sw / 2, y + sh - 5);
    }
  }
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Try to load a pre-generated PNG for a scene, falling back to programmatic drawing.
 * Call this instead of drawScene() when real images may be available.
 *
 * @param {'fruit'|'garden'|'colorcheck'} sceneId
 * @param {HTMLCanvasElement} canvas
 * @param {string} [basePath] — folder that contains scene-{id}.png files
 * @returns {Promise<boolean>} true if an image was loaded, false if canvas-drawn fallback was used
 */
export function drawSceneAsync(sceneId, canvas, basePath = 'games/robot-lab/assets/images') {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      drawAvatar(img, canvas);   // reuse the same center-fit + calib-patch logic
      resolve(true);
    };
    img.onerror = () => {
      // No real image — fall back to procedural canvas drawing
      drawScene(sceneId, canvas);
      resolve(false);
    };
    img.src = `${basePath}/scene-${sceneId}.png`;
  });
}

/**
 * Draw a named scene onto a canvas element.
 * Resizes the canvas to W×H (400×300).
 * @param {'fruit'|'garden'|'colorcheck'} sceneId
 * @param {HTMLCanvasElement} canvas
 */
export function drawScene(sceneId, canvas) {
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  switch (sceneId) {
    case 'fruit':      drawFruit(canvas.getContext('2d')); break;
    case 'garden':     drawGarden(canvas.getContext('2d')); break;
    case 'colorcheck': drawColorCheck(canvas.getContext('2d')); break;
    default:
      ctx.fillStyle = '#334';
      ctx.fillRect(0, 0, W, H);
  }
}

/**
 * Draw the avatar image onto a canvas, scaled to W×H.
 * @param {HTMLImageElement} img
 * @param {HTMLCanvasElement} canvas
 */
export function drawAvatar(img, canvas) {
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  // fit inside W×H, centered, with a warm background
  ctx.fillStyle = '#F5EDD8';
  ctx.fillRect(0, 0, W, H);
  const scale = Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const dw    = img.naturalWidth  * scale;
  const dh    = img.naturalHeight * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  drawCalibPatch(ctx);
}

export const SCENE_W = W;
export const SCENE_H = H;
