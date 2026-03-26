#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

const PROJECT_ROOT = '/Users/stevemansour/Documents/src/html/gcu';
const PROMPT_DIR = path.join(PROJECT_ROOT, 'games/puzzle-forest/assets/images');
const API_URL = 'https://api.openai.com/v1/images';

function parseArgs(argv) {
  const args = {
    force: false,
    dryRun: false,
    concurrency: 2,
    model: process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1.5',
    dir: PROMPT_DIR,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--dir') args.dir = path.resolve(argv[++i]);
    else if (arg === '--model') args.model = argv[++i];
    else if (arg === '--concurrency') args.concurrency = Math.max(1, Number(argv[++i] || 1));
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Generate Puzzle Forest images from .prompt.txt files.

Usage:
  node scripts/generate-puzzle-forest-images.mjs [options]

Options:
  --dir <path>           Prompt directory
  --model <name>         Image model to use (default: gpt-image-1.5 or OPENAI_IMAGE_MODEL)
  --concurrency <n>      Parallel requests (default: 2)
  --force                Regenerate even if target PNG already exists
  --dry-run              Parse prompts and print planned outputs without calling the API
  --help                 Show this help

Environment:
  OPENAI_API_KEY         Required unless using --dry-run
  OPENAI_IMAGE_MODEL     Optional default model override
`);
}

function parsePromptFile(text, filename) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const metadata = {};
  const sections = { PROMPT: [], STYLE: [], NOTES: [] };
  let currentSection = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const metaMatch = line.match(/^(TARGET FILE|SIZE|BACKGROUND):\s*(.+)$/);
    if (metaMatch) {
      metadata[metaMatch[1]] = metaMatch[2].trim();
      currentSection = null;
      continue;
    }
    if (/^(PROMPT|STYLE|NOTES):\s*$/.test(line)) {
      currentSection = line.slice(0, -1);
      continue;
    }
    if (currentSection) sections[currentSection].push(rawLine);
  }

  const targetFile = metadata['TARGET FILE'];
  const size = metadata.SIZE || '1024x1024';
  const background = (metadata.BACKGROUND || 'opaque').toLowerCase().includes('transparent')
    ? 'transparent'
    : 'opaque';

  if (!targetFile) throw new Error(`Missing TARGET FILE in ${filename}`);

  const prompt = [
    sections.PROMPT.join('\n').trim(),
    sections.STYLE.length ? `Style requirements:\n${sections.STYLE.join('\n').trim()}` : '',
    sections.NOTES.length ? `Important notes:\n${sections.NOTES.join('\n').trim()}` : '',
  ].filter(Boolean).join('\n\n');

  return { targetFile, size, background, prompt };
}

async function collectJobs(dir, force) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const promptFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.prompt.txt'))
    .map((entry) => entry.name)
    .sort();

  const jobs = [];
  for (const file of promptFiles) {
    const fullPath = path.join(dir, file);
    const parsed = parsePromptFile(await fs.readFile(fullPath, 'utf8'), file);
    const outputPath = path.join(dir, parsed.targetFile);
    let exists = false;
    try {
      await fs.access(outputPath);
      exists = true;
    } catch {}

    if (exists && !force) {
      jobs.push({ ...parsed, promptPath: fullPath, outputPath, skip: true });
      continue;
    }

    jobs.push({ ...parsed, promptPath: fullPath, outputPath, skip: false });
  }
  return jobs;
}

async function generateImage(job, args, apiKey) {
  const body = {
    model: args.model,
    prompt: job.prompt,
    size: job.size,
    quality: 'high',
    output_format: 'png',
    background: job.background,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API ${response.status} for ${path.basename(job.promptPath)}: ${errorText}`);
  }

  const json = await response.json();
  const imageBase64 = json?.data?.[0]?.b64_json;
  if (!imageBase64) {
    throw new Error(`No image data returned for ${path.basename(job.promptPath)}`);
  }

  const imageBuffer = Buffer.from(imageBase64, 'base64');
  await fs.writeFile(job.outputPath, imageBuffer);

  const metadata = {
    model: args.model,
    promptFile: path.basename(job.promptPath),
    outputFile: path.basename(job.outputPath),
    size: job.size,
    background: job.background,
    revised_prompt: json?.data?.[0]?.revised_prompt ?? null,
    created_at: new Date().toISOString(),
  };
  await fs.writeFile(`${job.outputPath}.json`, JSON.stringify(metadata, null, 2));
}

async function runQueue(jobs, workerCount, workerFn) {
  let index = 0;
  const results = [];

  async function worker() {
    while (true) {
      const current = index;
      index += 1;
      if (current >= jobs.length) return;
      results[current] = await workerFn(jobs[current], current);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = process.env.OPENAI_API_KEY;
  if (!args.dryRun && !apiKey) {
    throw new Error('OPENAI_API_KEY is required unless using --dry-run');
  }

  const jobs = await collectJobs(args.dir, args.force);
  const runnable = jobs.filter((job) => !job.skip);
  const skipped = jobs.filter((job) => job.skip);

  console.log(`Prompt directory: ${args.dir}`);
  console.log(`Model: ${args.model}`);
  console.log(`Jobs: ${runnable.length} to generate, ${skipped.length} skipped`);

  if (skipped.length) {
    for (const job of skipped) {
      console.log(`skip  ${path.basename(job.outputPath)} (already exists)`);
    }
  }

  if (args.dryRun) {
    for (const job of runnable) {
      console.log(`plan  ${path.basename(job.promptPath)} -> ${path.basename(job.outputPath)} [${job.size}, ${job.background}]`);
    }
    return;
  }

  const failures = [];
  await runQueue(runnable, args.concurrency, async (job, index) => {
    const label = `${index + 1}/${runnable.length}`;
    console.log(`start ${label} ${path.basename(job.outputPath)}`);
    try {
      await generateImage(job, args, apiKey);
      console.log(`done  ${label} ${path.basename(job.outputPath)}`);
    } catch (error) {
      failures.push({ job, error });
      console.error(`fail  ${label} ${path.basename(job.outputPath)}\n${error.message}`);
    }
  });

  if (failures.length) {
    process.exitCode = 1;
    console.error(`\n${failures.length} image generation job(s) failed.`);
    for (const { job } of failures) {
      console.error(`- ${path.basename(job.promptPath)}`);
    }
    return;
  }

  console.log('\nAll requested images generated successfully.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
