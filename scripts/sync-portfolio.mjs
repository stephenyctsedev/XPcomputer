#!/usr/bin/env node
// Usage: node scripts/sync-portfolio.mjs [--repo ../GBC_Portfolio]
// Reads GBC_Portfolio/data.js, optimizes every photo into public/portfolio/<slug>/,
// writes thumbnails, and emits src/data/portfolio.json.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { buildPortfolio } from './portfolio-parse.mjs';

const MAX_EDGE = 1600;
const THUMB_EDGE = 160;

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const repo = resolve(root, args.repo ?? '../GBC_Portfolio');

const dataPath = resolve(repo, 'data.js');
let source;
try { source = readFileSync(dataPath, 'utf8'); }
catch { fail(`cannot read ${dataPath}. Pass --repo <path-to-GBC_Portfolio>.`); }

let sourceRef = 'GBC_Portfolio@unknown';
try {
  const sha = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  sourceRef = `GBC_Portfolio@${sha}`;
} catch { /* not a git checkout; keep the placeholder */ }

let portfolio;
try { portfolio = buildPortfolio(source, { sourceRef }); }
catch (err) { fail(err.message); }

let totalBytes = 0;
for (const project of portfolio.projects) {
  const outDir = resolve(root, 'public/portfolio', project.slug);
  mkdirSync(resolve(outDir, 'thumbs'), { recursive: true });

  for (const item of project.media) {
    const from = resolve(repo, item.source);
    const to = resolve(outDir, item.file);

    if (item.kind === 'video') {
      if (!existsSync(to)) failVideo(from, to);
      totalBytes += readFileSync(to).length;
      console.log(`ok  ${item.src}  already encoded, left alone`);
      continue;
    }

    if (!existsSync(from)) fail(`missing photo ${from} (project ${project.slug})`);
    const pipeline = sharp(from).rotate();
    const before = await pipeline.metadata();
    const out = await pipeline
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    writeFileSync(to, out.data);
    await sharp(from).rotate()
      .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toFile(resolve(outDir, 'thumbs', item.file));

    item.width = out.info.width;
    item.height = out.info.height;
    totalBytes += out.data.length;
    console.log(`ok  ${item.src}  ${before.width}x${before.height} -> ${out.info.width}x${out.info.height}, ${kb(out.data.length)}`);
  }
}

// `source` is the path inside the GBC checkout. It is useful while importing and meaningless
// to the site, so it never reaches the committed JSON.
const clean = {
  projects: portfolio.projects.map((p) => ({
    ...p,
    media: p.media.map(({ source: _ignored, ...rest }) => rest),
  })),
  source: portfolio.source,
  updated: portfolio.updated,
};
mkdirSync(resolve(root, 'src/data'), { recursive: true });
writeFileSync(resolve(root, 'src/data/portfolio.json'), JSON.stringify(clean, null, 2) + '\n', 'utf8');

const count = clean.projects.reduce((n, p) => n + p.media.length, 0);
console.log(`ok  src/data/portfolio.json — ${clean.projects.length} projects, ${count} media, ${kb(totalBytes)} total`);

function kb(bytes) { return `${(bytes / 1024).toFixed(0)} KB`; }

function failVideo(from, to) {
  fail([
    `${to} does not exist, and this script does not run ffmpeg.`,
    'Encode it once by hand, then re-run this script:',
    '',
    `  ffmpeg -i "${from}" -vf "scale=-2:720" -c:v libx264 -crf 28 -preset slow -c:a aac -b:a 96k -movflags +faststart "${to}"`,
    '',
    'Target is under 8 MB. Check the size before re-running.',
  ].join('\n'));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) { out[key] = next; i++; } else out[key] = true;
  }
  return out;
}

function fail(message) {
  console.error(`ERROR ${message}`);
  process.exit(1);
}
