import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distRoot = path.join(repoRoot, 'dist', 'gcu');

const MAX_DIMENSION = 500;
const JPEG_QUALITY = '82';
const TEXT_EXTENSIONS = new Set(['.html', '.js', '.json', '.css']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const FULL_SIZE_PNGS = new Set([
  'assets/images/hub/hub-bg.png',
  'assets/images/hub/avatar-select-bg.png',
  'games/robot-lab/assets/images/journal-blank-page.png',
  'games/robot-lab/assets/images/swirle-eyemodule-blueprint.png',
]);

async function main() {
  await assertExists(distRoot);

  const imagePaths = await collectFiles(distRoot, (relativePath) => {
    return isOptimizableImage(relativePath);
  });

  const rewrites = new Map();
  const stats = {
    processed: 0,
    resizedPngs: 0,
    convertedJpegs: 0,
    skippedFullSize: 0,
    bytesBefore: 0,
    bytesAfter: 0,
  };

  for (const absolutePath of imagePaths) {
    const relativePath = path.relative(distRoot, absolutePath).split(path.sep).join('/');
    if (FULL_SIZE_PNGS.has(relativePath)) {
      const size = await fileSize(absolutePath);
      stats.bytesBefore += size;
      stats.bytesAfter += size;
      stats.skippedFullSize += 1;
      continue;
    }

    const ext = path.extname(relativePath).toLowerCase();
    if (ext !== '.png') {
      const size = await fileSize(absolutePath);
      stats.bytesBefore += size;
      stats.bytesAfter += size;
      continue;
    }

    const before = await fileSize(absolutePath);
    stats.bytesBefore += before;
    stats.processed += 1;

    if (isTransparentAsset(relativePath)) {
      await runSips(['-Z', String(MAX_DIMENSION), absolutePath, '--out', absolutePath]);
      const after = await fileSize(absolutePath);
      stats.bytesAfter += after;
      stats.resizedPngs += 1;
      continue;
    }

    const targetRelativePath = relativePath.replace(/\.png$/i, '.jpg');
    const targetAbsolutePath = path.join(distRoot, targetRelativePath);
    await fs.mkdir(path.dirname(targetAbsolutePath), { recursive: true });
    await runSips([
      '-Z', String(MAX_DIMENSION),
      '-s', 'format', 'jpeg',
      '--setProperty', 'formatOptions', JPEG_QUALITY,
      absolutePath,
      '--out', targetAbsolutePath,
    ]);
    await fs.unlink(absolutePath);

    const after = await fileSize(targetAbsolutePath);
    stats.bytesAfter += after;
    stats.convertedJpegs += 1;
    rewrites.set(relativePath, targetRelativePath);
  }

  await rewritePackagedReferences(distRoot, rewrites);

  const savedBytes = stats.bytesBefore - stats.bytesAfter;
  const savedPercent = stats.bytesBefore > 0
    ? ((savedBytes / stats.bytesBefore) * 100).toFixed(1)
    : '0.0';

  console.log(`optimized ${stats.processed} PNG asset(s) in dist/gcu`);
  console.log(`resized transparent PNGs: ${stats.resizedPngs}`);
  console.log(`converted opaque PNGs to JPEG: ${stats.convertedJpegs}`);
  console.log(`kept full-size PNGs: ${stats.skippedFullSize}`);
  console.log(`bytes before: ${stats.bytesBefore}`);
  console.log(`bytes after: ${stats.bytesAfter}`);
  console.log(`saved: ${savedBytes} bytes (${savedPercent}%)`);
}

function isTransparentAsset(relativePath) {
  return relativePath.toLowerCase().endsWith('-transparent.png');
}

function isOptimizableImage(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  const ext = path.extname(normalized).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return false;
  if (normalized.startsWith('assets/images/')) return true;
  if (/^games\/[^/]+\/assets\/images\//.test(normalized)) return true;
  if (/^CharacterSheets\/[^/]+\/avatars\//.test(normalized)) return true;
  return false;
}

async function rewritePackagedReferences(rootDir, rewrites) {
  if (rewrites.size === 0) return;

  const textPaths = await collectFiles(rootDir, (relativePath) => {
    return TEXT_EXTENSIONS.has(path.extname(relativePath).toLowerCase());
  });

  for (const absolutePath of textPaths) {
    const original = await fs.readFile(absolutePath, 'utf8');
    let next = original;
    for (const [from, to] of rewrites) {
      next = next.split(from).join(to);
    }
    if (next !== original) {
      await fs.writeFile(absolutePath, next);
    }
  }
}

async function collectFiles(rootDir, predicate) {
  const results = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }
      const relativePath = path.relative(rootDir, absolutePath).split(path.sep).join('/');
      if (predicate(relativePath, absolutePath)) {
        results.push(absolutePath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

async function assertExists(targetPath) {
  try {
    await fs.access(targetPath);
  } catch {
    throw new Error(`dist root not found: ${targetPath}`);
  }
}

async function fileSize(targetPath) {
  const stat = await fs.stat(targetPath);
  return stat.size;
}

function runSips(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/sips', args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`sips failed with exit code ${code}: ${args.join(' ')}`));
    });
  });
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
