#!/usr/bin/env node
// Usage: node scripts/sync-resume.mjs [--repo ../Resume] [--branch main] [--display-name "Stephen Tse"] [--include-phone]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildResume } from './tex-parse.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = parseArgs(process.argv.slice(2));
const repo = resolve(root, args.repo ?? '../Resume');
const branch = args.branch ?? 'main';
const sections = ['header', 'aboutme', 'contact', 'education', 'experience', 'expertise', 'language', 'portfolio'];

const files = {};
for (const name of sections) {
  const path = resolve(repo, `${name}.tex`);
  try { files[`${name}.tex`] = readFileSync(path, 'utf8'); }
  catch { fail(`cannot read ${path}. Pass --repo <path-to-Resume-checkout>.`); }
}

let resume;
try {
  resume = buildResume(files, { includePhone: Boolean(args['include-phone']), displayName: args['display-name'], sourceBranch: branch });
} catch (err) { fail(err.message); }

mkdirSync(resolve(root, 'src/data'), { recursive: true });
writeFileSync(resolve(root, 'src/data/resume.json'), JSON.stringify(resume, null, 2) + '\n', 'utf8');
console.log(`ok  src/data/resume.json — ${resume.experience.length} jobs, phone ${resume.contact.phone ? 'INCLUDED' : 'excluded'}`);

try {
  execFileSync('git', ['-C', repo, 'fetch', 'origin', 'preview'], { stdio: 'inherit' });
  const pdf = execFileSync('git', ['-C', repo, 'show', `origin/preview:resume-${branch}.pdf`], { maxBuffer: 64 * 1024 * 1024 });
  mkdirSync(resolve(root, 'public/resume'), { recursive: true });
  writeFileSync(resolve(root, 'public/resume/resume-main.pdf'), pdf);
  console.log(`ok  public/resume/resume-main.pdf — from resume-${branch}.pdf, ${(pdf.length / 1024).toFixed(0)} KB`);
} catch (err) {
  fail(`could not copy resume-${branch}.pdf from origin/preview. Has the Resume CI finished for that branch? (${err.message})`);
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
