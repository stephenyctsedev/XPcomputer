# Portfolio Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the nine portfolio projects from `GBC_Portfolio` into XPcomputer as a browsable picture folder tree, so XPcomputer can replace the Wix portfolio.

**Architecture:** A pure parser turns the GBC `data.js` source into project records; a sync script optimizes the media and writes `src/data/portfolio.json` plus `public/portfolio/**`. The fake file system grows a folder per project under `My Pictures`, Explorer gains a Thumbnails view and a task pane that shows project prose, and a new Picture Viewer window displays each item.

**Tech Stack:** Node 24, Vite 8, plain JavaScript ES modules, Vitest 5 with jsdom, `sharp` for image work, ffmpeg once by hand for the video.

**Spec:** `docs/superpowers/specs/2026-09-08-portfolio-migration-design.md`

## Global Constraints

- No Microsoft artwork, sounds or logos. Every new icon is drawn as SVG inside `src/xp/icons/index.js`.
- Photos: max 1600 px long edge, JPEG quality 82. Thumbnails: 160 px long edge, JPEG quality 70. Video: H.264 720p, under 8 MB. Whole `public/portfolio` tree under 20 MB.
- Explorer folder display names are capped at 32 characters.
- `sharp` is a devDependency. CI runs install, test and build only, and never the sync scripts.
- All files are written as UTF-8.
- Vite `base` is `/XPcomputer/`. Runtime asset paths are always built as `${import.meta.env.BASE_URL}<relative>`; never hardcode the prefix.
- Git: Stephen must say so before any commit or push. The commit steps below assume he has said so. Never push unless he asks for a push specifically.
- Windows 11 is the development machine. Paths in generated file system nodes use backslashes; paths on disk use forward slashes.

---

### Task 1: Portfolio parser

Pure transform from GBC `data.js` source text to project records. No file IO, so it needs no GBC checkout to test.

**Files:**
- Create: `scripts/portfolio-parse.mjs`
- Create: `scripts/portfolio-parse.test.mjs`
- Create: `tests/fixtures/gbc-portfolio/data.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `slugify(text) -> string`
  - `sanitizeFolderName(name, max = 32) -> string`
  - `assetFolder(photoPath) -> string`
  - `mediaKind(fileName) -> 'image' | 'video'`
  - `outputName(fileName, kind) -> string`
  - `parseData(source) -> { about, projects, contact }`
  - `buildPortfolio(source, { sourceRef, updated }) -> { projects, source, updated }`
  - `PROJECT_META` — object keyed by GBC asset folder name
  - Each project: `{ slug, folder, name, category, tagline, description, tech: string[], media: MediaItem[] }`
  - Each `MediaItem`: `{ source, file, kind, src, thumb }` where `thumb` is `null` for video

- [ ] **Step 1: Write the fixture**

Create `tests/fixtures/gbc-portfolio/data.js`. It mimics the real file's shape with three projects: one known folder, one unknown folder to exercise the fallback, and one carrying a video.

```js
// Fixture mirroring GBC_Portfolio/data.js. Two known folders, one unknown.
const DATA = {
  about: { name: "Stephen Tse", title: "Game Programmer", bio: "Bio.", resume: "assets/resume.pdf", avatar: "assets/images/avatar.png" },
  projects: [
    {
      id: "project-1",
      category: "personal",
      name: "Personal Project - Coin Pusher Game",
      tagline: "Coin pusher game built with PlayCanvas and JavaScript.",
      description: "Touch and drop coins into the machine.",
      tech: ["PlayCanvas", "JavaScript"],
      photos: ["assets/images/coin_pusher/img1.png"]
    },
    {
      id: "project-2",
      category: "company",
      name: "MEGABOX \u00d7 EMOJI \"YEAR OF THE SMILEY TIGER\"",
      tagline: "AR game at MegaBox.",
      description: "Scan the QR code and hunt emoji.",
      tech: ["PlayCanvas", "JavaScript"],
      photos: ["assets/images/emoji/img1.jpg", "assets/images/emoji/video1.mp4"]
    },
    {
      id: "project-99",
      category: "company",
      name: "A Brand New Activation With A Very Long Name Indeed",
      tagline: "Something new.",
      description: "Not in the curated map.",
      tech: ["Unity"],
      photos: ["assets/images/brand_new/img1.jpg"]
    }
  ],
  contact: { email: "stephenyctsedev@gmail.com", linkedin: "https://example.com/in/x", github: "https://example.com/x" }
};
```

- [ ] **Step 2: Write the failing test**

Create `scripts/portfolio-parse.test.mjs`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  slugify, sanitizeFolderName, assetFolder, mediaKind, outputName,
  parseData, buildPortfolio, PROJECT_META,
} from './portfolio-parse.mjs';

const source = readFileSync(new URL('../tests/fixtures/gbc-portfolio/data.js', import.meta.url), 'utf8');

describe('primitives', () => {
  it('slugifies to lowercase kebab with no leading or trailing dashes', () => {
    expect(slugify('beer_pushing_game')).toBe('beer-pushing-game');
    expect(slugify('  Nat Geo!!  ')).toBe('nat-geo');
  });
  it('strips characters Windows forbids in a filename', () => {
    expect(sanitizeFolderName('MEGABOX \u00d7 EMOJI "TIGER"')).toBe('MEGABOX \u00d7 EMOJI TIGER');
    expect(sanitizeFolderName('a/b\\c:d*e?f<g>h|i')).toBe('abcdefghi');
  });
  it('truncates over-long names at the cap without a trailing dash or space', () => {
    const out = sanitizeFolderName('A Brand New Activation With A Very Long Name Indeed');
    expect(out.length).toBeLessThanOrEqual(32);
    expect(out).toBe('A Brand New Activation With A');
  });
  it('reads the asset folder out of a photo path', () => {
    expect(assetFolder('assets/images/coin_pusher/img1.png')).toBe('coin_pusher');
  });
  it('classifies media by extension', () => {
    expect(mediaKind('img1.PNG')).toBe('image');
    expect(mediaKind('video1.mp4')).toBe('video');
  });
  it('renames images to .jpg and leaves video alone', () => {
    expect(outputName('img1.png', 'image')).toBe('img1.jpg');
    expect(outputName('video1.mp4', 'video')).toBe('video1.mp4');
  });
});

describe('parseData', () => {
  it('returns the DATA object', () => {
    expect(parseData(source).projects).toHaveLength(3);
  });
  it('throws when DATA.projects is missing', () => {
    expect(() => parseData('const DATA = {};')).toThrow(/DATA.projects/);
  });
});

describe('buildPortfolio', () => {
  const portfolio = buildPortfolio(source, { sourceRef: 'GBC_Portfolio@abc1234', updated: '2026-09-08' });

  it('uses the curated slug and folder for a known asset folder', () => {
    const p = portfolio.projects[0];
    expect(p.slug).toBe(PROJECT_META.coin_pusher.slug);
    expect(p.folder).toBe('Coin Pusher');
  });
  it('falls back to a derived slug and a sanitized name for an unknown folder', () => {
    const p = portfolio.projects[2];
    expect(p.slug).toBe('brand-new');
    expect(p.folder).toBe('A Brand New Activation With A');
  });
  it('builds media paths under the project slug and drops the thumb for video', () => {
    const media = portfolio.projects[1].media;
    expect(media[0]).toMatchObject({
      file: 'img1.jpg', kind: 'image',
      src: 'portfolio/megabox-emoji/img1.jpg',
      thumb: 'portfolio/megabox-emoji/thumbs/img1.jpg',
      source: 'assets/images/emoji/img1.jpg',
    });
    expect(media[1]).toMatchObject({ file: 'video1.mp4', kind: 'video', thumb: null });
  });
  it('carries the prose and tech across unchanged', () => {
    expect(portfolio.projects[0].tagline).toBe('Coin pusher game built with PlayCanvas and JavaScript.');
    expect(portfolio.projects[0].tech).toEqual(['PlayCanvas', 'JavaScript']);
    expect(portfolio.projects[0].category).toBe('personal');
  });
  it('records the source reference and date', () => {
    expect(portfolio.source).toBe('GBC_Portfolio@abc1234');
    expect(portfolio.updated).toBe('2026-09-08');
  });
  it('throws when a project has no photos', () => {
    expect(() => buildPortfolio('const DATA = { projects: [{ id: "p", photos: [] }] };')).toThrow(/no photos/);
  });
  it('throws when two projects resolve to the same slug', () => {
    const dupe = 'const DATA = { projects: ['
      + '{ id: "a", name: "A", tech: [], photos: ["assets/images/dior/img1.jpg"] },'
      + '{ id: "b", name: "B", tech: [], photos: ["assets/images/dior/img2.jpg"] }] };';
    expect(() => buildPortfolio(dupe)).toThrow(/duplicate slug/);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx vitest run scripts/portfolio-parse.test.mjs`
Expected: FAIL, cannot resolve `./portfolio-parse.mjs`.

- [ ] **Step 4: Write the implementation**

Create `scripts/portfolio-parse.mjs`:

```js
// Pure transform: GBC_Portfolio/data.js source text -> XPcomputer portfolio records.
// No file IO here, so the whole transform is testable without a GBC checkout.

/**
 * Curated slug and Explorer folder name per GBC asset folder. The nine real projects are a
 * fixed set, and folder names like `jqvdm20` do not read well in a file path or a window.
 * Anything not listed falls back to the mechanical rules below.
 */
export const PROJECT_META = {
  coin_pusher: { slug: 'coin-pusher', folder: 'Coin Pusher' },
  emoji: { slug: 'megabox-emoji', folder: 'MEGABOX \u00d7 EMOJI' },
  beer_pushing_game: { slug: 'beer-happy-challenge', folder: 'Beer Happy Challenge' },
  monster_inc: { slug: 'monster-inc-cityplaza', folder: 'Monster Inc \u00d7 CityPlaza' },
  nat_geo: { slug: 'nat-geo-rac-club', folder: 'Nat Geo Kids RAC Club' },
  bt21: { slug: 'bt21-extensive-reading', folder: 'Extensive Reading BT21' },
  jqvdm20: { slug: 'jurlique-catching-game', folder: 'Jurlique Catching Game' },
  hrkr19: { slug: 'helena-rubinstein-booth', folder: 'Helena Rubinstein Booth' },
  dior: { slug: 'dior-lip-glow', folder: 'Dior Lip Glow' },
};

const VIDEO_EXT = new Set(['.mp4', '.webm', '.mov']);
const FORBIDDEN = /[\\/:*?"<>|]/g;

export function slugify(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function sanitizeFolderName(name, max = 32) {
  const clean = String(name).replace(FORBIDDEN, '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/[\s-]+$/, '');
}

export function assetFolder(photoPath) {
  const parts = String(photoPath).split('/');
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}

export function mediaKind(file) {
  const dot = String(file).lastIndexOf('.');
  return dot >= 0 && VIDEO_EXT.has(String(file).slice(dot).toLowerCase()) ? 'video' : 'image';
}

export function outputName(file, kind) {
  if (kind === 'video') return file;
  const dot = String(file).lastIndexOf('.');
  return `${dot >= 0 ? String(file).slice(0, dot) : file}.jpg`;
}

/**
 * Evaluate the GBC data.js source. It is a plain `const DATA = {...}` script with no imports,
 * and it is a trusted file in a sibling repo we own, not user input.
 */
export function parseData(source) {
  const data = new Function(`${source}\n;return typeof DATA === 'undefined' ? null : DATA;`)();
  if (!data || !Array.isArray(data.projects)) throw new Error('data.js did not define DATA.projects');
  return data;
}

export function buildPortfolio(source, { sourceRef = 'unknown', updated } = {}) {
  const data = parseData(source);
  const projects = data.projects.map((project) => {
    if (!Array.isArray(project.photos) || project.photos.length === 0) {
      throw new Error(`project ${project.id} has no photos`);
    }
    const key = assetFolder(project.photos[0]);
    const meta = PROJECT_META[key] ?? { slug: slugify(key), folder: sanitizeFolderName(project.name) };
    const media = project.photos.map((photo) => {
      const file = photo.split('/').pop();
      const kind = mediaKind(file);
      const out = outputName(file, kind);
      return {
        source: photo,
        file: out,
        kind,
        src: `portfolio/${meta.slug}/${out}`,
        thumb: kind === 'video' ? null : `portfolio/${meta.slug}/thumbs/${outputName(file, 'image')}`,
      };
    });
    return {
      slug: meta.slug,
      folder: meta.folder,
      name: project.name,
      category: project.category,
      tagline: project.tagline,
      description: project.description,
      tech: [...(project.tech ?? [])],
      media,
    };
  });

  const slugs = projects.map((p) => p.slug);
  const duplicate = slugs.find((slug, i) => slugs.indexOf(slug) !== i);
  if (duplicate) throw new Error(`duplicate slug ${duplicate}`);

  return { projects, source: sourceRef, updated: updated ?? new Date().toISOString().slice(0, 10) };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run scripts/portfolio-parse.test.mjs`
Expected: PASS, 14 tests.

- [ ] **Step 6: Run the whole suite**

Run: `npm test`
Expected: PASS, no existing test disturbed.

- [ ] **Step 7: Commit**

```bash
git add scripts/portfolio-parse.mjs scripts/portfolio-parse.test.mjs tests/fixtures/gbc-portfolio/data.js
git commit -m "feat(portfolio): pure parser for GBC portfolio data"
```

---

### Task 2: Sync script and the real import

Adds `sharp`, writes the script that touches disk, and runs it once against the real GBC checkout so the repo holds real data and real optimized media.

**Files:**
- Create: `scripts/sync-portfolio.mjs`
- Modify: `package.json`
- Create (generated, committed): `src/data/portfolio.json`
- Create (generated, committed): `public/portfolio/**`

**Interfaces:**
- Consumes: `buildPortfolio` from Task 1.
- Produces: `src/data/portfolio.json` matching the shape in spec section 4, with `width` and `height` added to every image media entry and absent on video.

- [ ] **Step 1: Add the dependency and the npm script**

Run: `npm install --save-dev sharp`

Then add the script line to `package.json` beside `sync-resume`:

```json
    "sync-resume": "node scripts/sync-resume.mjs",
    "sync-portfolio": "node scripts/sync-portfolio.mjs"
```

- [ ] **Step 2: Write the sync script**

Create `scripts/sync-portfolio.mjs`:

```js
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
```

- [ ] **Step 3: Run it and expect the video failure**

Run: `npm run sync-portfolio`
Expected: every photo is optimized and logged, then the script exits non-zero on the MEGABOX video with an ffmpeg command printed.

- [ ] **Step 4: Encode the video once**

Run the exact command the script printed. It writes `public/portfolio/megabox-emoji/video1.mp4`.

Then check the size is under 8 MB:

```bash
ls -l public/portfolio/megabox-emoji/video1.mp4
```

If it is over 8 MB, raise `-crf` to 30 and encode again.

- [ ] **Step 5: Re-run the sync to completion**

Run: `npm run sync-portfolio`
Expected: exit 0, final line reporting 9 projects and 33 media.

- [ ] **Step 6: Verify the media budget**

```bash
du -sh public/portfolio
```

Expected: under 20 MB. If not, drop the photo quality to 78 and re-run before moving on.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/sync-portfolio.mjs src/data/portfolio.json public/portfolio
git commit -m "feat(portfolio): import and optimize GBC portfolio media"
```

---

### Task 3: New icons and the file system tree

**Files:**
- Modify: `src/xp/icons/index.js`
- Modify: `src/data/filesystem.js`
- Modify: `src/data/filesystem.test.js`

**Interfaces:**
- Consumes: `src/data/portfolio.json` from Task 2.
- Produces:
  - `buildFileSystem(resume, portfolio = { projects: [] })`
  - Media node: `{ name, kind: 'file', icon: 'image' | 'video', mediaKind, src, thumb, width, height, open: { app: 'viewer', payload: { slug, index, slideshow: false } } }`
  - Project folder node: `{ name, kind: 'folder', icon: 'pictures', project, children }` where `project` is the record from portfolio.json
  - Icon names added: `pictures`, `image`, `video`

- [ ] **Step 1: Write the failing test**

Replace the `portfolio.url` assertion in `src/data/filesystem.test.js`. Find this line inside the "maps executables to apps and documents to viewers" test and delete it:

```js
    expect(resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\portfolio.url`).open).toEqual({ app: 'external', payload: { url: resume.contact.portfolio } });
```

Then add a new describe block at the end of the file:

```js
describe('portfolio folders under My Pictures', () => {
  const portfolio = {
    projects: [
      {
        slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
        category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
        tech: ['Unity', 'C#'],
        media: [
          { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
          { file: 'clip.mp4', kind: 'video', src: 'portfolio/dior-lip-glow/clip.mp4', thumb: null },
        ],
      },
    ],
  };
  const fs = buildFileSystem(resume, portfolio);
  const pictures = () => resolvePath(fs, `${PATHS.myDocuments}\\My Pictures`);

  it('builds one folder per project and drops the old Wix shortcut', () => {
    expect(pictures().children.map((c) => c.name)).toEqual(['Dior Lip Glow']);
    expect(JSON.stringify(fs)).not.toContain('wixsite');
  });
  it('carries the project record on the folder node for the task pane', () => {
    expect(pictures().children[0].project.tech).toEqual(['Unity', 'C#']);
    expect(pictures().children[0].icon).toBe('pictures');
  });
  it('opens each media file in the viewer at its own index', () => {
    const folder = resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\Dior Lip Glow`);
    expect(folder.children.map((c) => c.name)).toEqual(['img1.jpg', 'clip.mp4']);
    expect(folder.children[0].open).toEqual({ app: 'viewer', payload: { slug: 'dior-lip-glow', index: 0, slideshow: false } });
    expect(folder.children[1].open.payload.index).toBe(1);
  });
  it('marks images and video with different icons and keeps the thumb only for images', () => {
    const folder = resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\Dior Lip Glow`);
    expect(folder.children[0]).toMatchObject({ icon: 'image', mediaKind: 'image', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 });
    expect(folder.children[1]).toMatchObject({ icon: 'video', mediaKind: 'video', thumb: null });
  });
  it('degrades to an empty My Pictures when no portfolio is supplied', () => {
    const bare = buildFileSystem(resume);
    expect(resolvePath(bare, `${PATHS.myDocuments}\\My Pictures`).children).toEqual([]);
  });
  it('points the readme at My Pictures instead of an external portfolio URL', () => {
    const readme = resolvePath(fs, `${PATHS.myDocuments}\\readme.txt`);
    expect(readme.open.payload.text).toContain('My Pictures');
    expect(readme.open.payload.text).not.toContain('http');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/data/filesystem.test.js`
Expected: FAIL, My Pictures still holds `portfolio.url`.

- [ ] **Step 3: Add the three icons**

In `src/xp/icons/index.js`, add these entries to the `icons` object beside `folder`:

```js
  pictures: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/><rect x="8" y="16" width="16" height="10" fill="#fff" stroke="#8a8a8a"/><circle cx="12" cy="19" r="1.6" fill="#f5c400"/><path d="M8 26l5-6 4 4 3-3 4 5z" fill="#4b9b4b"/>'),
  image: svg('<rect x="4" y="6" width="24" height="20" fill="#fff" stroke="#7a7a7a"/><rect x="6" y="8" width="20" height="16" fill="#cfe4f7"/><circle cx="11" cy="13" r="2" fill="#f5c400"/><path d="M6 24l6-8 5 5 4-4 5 7z" fill="#4b9b4b"/>'),
  video: svg('<rect x="3" y="7" width="20" height="18" rx="1.5" fill="#2b2b2b" stroke="#6b6b6b"/><path d="M23 14l6-4v12l-6-4z" fill="#4a4a4a" stroke="#6b6b6b"/><path d="M10 12l7 4-7 4z" fill="#fff"/>'),
```

- [ ] **Step 4: Rewrite the My Pictures branch in the file system**

In `src/data/filesystem.js`, add these helpers below the existing `notepadFile` helper:

```js
const mediaFile = (item, slug, index) => ({
  name: item.file,
  kind: 'file',
  icon: item.kind === 'video' ? 'video' : 'image',
  mediaKind: item.kind,
  src: item.src,
  thumb: item.thumb ?? null,
  width: item.width ?? null,
  height: item.height ?? null,
  open: { app: 'viewer', payload: { slug, index, slideshow: false } },
});

const projectFolder = (project) => folder(
  project.folder,
  project.media.map((item, index) => mediaFile(item, project.slug, index)),
  { icon: 'pictures', project },
);
```

Change the signature and the My Pictures line:

```js
export function buildFileSystem(resume, portfolio = { projects: [] }) {
```

```js
    folder('My Pictures', (portfolio.projects ?? []).map(projectFolder), { icon: 'pictures' }),
```

- [ ] **Step 5: Repoint the readme text**

In `readmeText`, change the "Where to look" list and the contact block. Replace:

```js
Where to look:
  * Internet Explorer  -> my homepage and the PDF resume
  * My Documents\\Projects -> one text file per job
  * Start > All Programs > Games -> Minesweeper, Solitaire and Pinball

Contact: ${resume.contact.email}
LinkedIn: ${resume.contact.linkedin}
Portfolio: ${resume.contact.portfolio}
```

with:

```js
Where to look:
  * Internet Explorer  -> my homepage and the PDF resume
  * My Documents\\My Pictures -> screenshots from every project I have shipped
  * My Documents\\Projects -> one text file per job
  * Start > All Programs > Games -> Minesweeper, Solitaire and Pinball

Contact: ${resume.contact.email}
LinkedIn: ${resume.contact.linkedin}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/data/filesystem.test.js`
Expected: PASS.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS. The LinkedIn URL still appears in the readme, so the "never leaks the phone number" test is unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/xp/icons/index.js src/data/filesystem.js src/data/filesystem.test.js
git commit -m "feat(portfolio): project folders under My Pictures"
```

---

### Task 4: Explorer Thumbnails view

**Files:**
- Modify: `src/xp/apps/Explorer.js`
- Modify: `src/xp/apps/Explorer.test.js`
- Modify: `src/styles/xp-overrides.css`
- Modify: `src/xp/createDesktop.js` (add `mediaBase` to the context)

**Interfaces:**
- Consumes: media nodes from Task 3.
- Produces: `ctx.mediaBase` (string, defaults to `''`), and the CSS class `xp-view-thumbnails` on the items container.

**Watch out:** the existing test "switches to details view with a type column" picks the menu item by position with `nth-child(2)`. Thumbnails goes first in the menu, matching XP, so Details moves to `nth-child(3)`. That test must be updated in step 1 or it will fail for the wrong reason.

- [ ] **Step 1: Write the failing test**

In `src/xp/apps/Explorer.test.js`, first fix the existing positional selector. Change:

```js
    document.querySelector('.xp-menu .xp-menu-item:nth-child(2)').click();
```

to:

```js
    document.querySelector('.xp-menu .xp-menu-item:nth-child(3)').click();
```

Then add `portfolio` to the shared fixture. Below the existing imports add:

```js
const portfolio = {
  projects: [{
    slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
    category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
    tech: ['Unity', 'C#'],
    media: [
      { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
      { file: 'img2.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img2.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img2.jpg', width: 1600, height: 900 },
    ],
  }],
};
const PICTURES = `${PATHS.myDocuments}\\My Pictures`;
const PROJECT = `${PICTURES}\\Dior Lip Glow`;
```

and change the `fs` line inside `beforeEach` to:

```js
      fs: buildFileSystem(resume, portfolio),
      mediaBase: '/XPcomputer/',
```

Then add a new describe block at the end of the file:

```js
describe('explorer thumbnails', () => {
  let ctx;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume, portfolio),
      mediaBase: '/XPcomputer/',
      registry: { launch: () => {} },
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
      toDesktopPoint: (x, y) => ({ x, y }),
    };
  });

  it('auto-picks thumbnails inside a folder of media and paints the images', () => {
    const win = openExplorer(ctx, PROJECT);
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-thumbnails')).toBe(true);
    const img = win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb');
    expect(img.getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/thumbs/img1.jpg');
  });

  it('auto-picks icons for a folder of folders', () => {
    const win = openExplorer(ctx, PICTURES);
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-icons')).toBe(true);
  });

  it('an explicit view choice sticks across navigation', () => {
    const win = openExplorer(ctx, PICTURES);
    win.el.querySelector('[data-cmd="views"]').click();
    document.querySelector('.xp-menu .xp-menu-item:nth-child(3)').click();
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
    win.el.querySelector('[data-name="Dior Lip Glow"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
  });

  it('falls back to the file icon when a thumbnail fails to load', () => {
    const win = openExplorer(ctx, PROJECT);
    const img = win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb');
    img.dispatchEvent(new Event('error'));
    expect(win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb')).toBeNull();
    expect(win.el.querySelector('[data-name="img1.jpg"] .xp-ico')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: FAIL, no `xp-view-thumbnails` class and no `img.xp-item-thumb`.

- [ ] **Step 3: Implement the view in Explorer**

In `src/xp/apps/Explorer.js`, pull `mediaBase` out of the context and add the lock flag. Change:

```js
  const { wm, fs, registry, dialogs, menus, toDesktopPoint } = ctx;
  const history = [startPath];
  let index = 0;
  let view = 'icons';
```

to:

```js
  const { wm, fs, registry, dialogs, menus, toDesktopPoint, mediaBase = '' } = ctx;
  const history = [startPath];
  let index = 0;
  let view = 'icons';
  // Auto-pick stays on until the user chooses a view, then that choice owns the window.
  let viewLocked = false;
```

Replace `viewItems` and `setView`:

```js
  const viewItems = () => [
    { label: 'Thumbnails', checked: view === 'thumbnails', action: () => setView('thumbnails') },
    { label: 'Icons', checked: view === 'icons', action: () => setView('icons') },
    { label: 'Details', checked: view === 'details', action: () => setView('details') },
  ];
```

```js
  function setView(next) { view = next; viewLocked = true; render(); }
  function autoView(node) {
    const children = node.children ?? [];
    return children.length > 0 && children.every((c) => c.mediaKind) ? 'thumbnails' : 'icons';
  }
```

In `itemEl`, replace the single `el.append(iconEl(...))` line with:

```js
    if (view === 'thumbnails' && child.thumb) {
      const img = document.createElement('img');
      img.className = 'xp-item-thumb';
      img.src = `${mediaBase}${child.thumb}`;
      img.alt = '';
      img.addEventListener('error', () => img.replaceWith(iconEl(child.icon, 32)));
      el.append(img);
    } else {
      el.append(iconEl(child.icon, view === 'details' ? 16 : 32));
    }
```

At the top of `render()`, before `address.value` is set, add:

```js
    if (!viewLocked) view = autoView(node);
```

- [ ] **Step 4: Add the CSS**

In `src/styles/xp-overrides.css`, after the `.xp-view-details` rules, add:

```css
.xp-view-thumbnails { gap: 10px 12px; }
.xp-view-thumbnails .xp-item { width: 116px; }
.xp-item-thumb { width: 96px; height: 72px; object-fit: cover; background: #fff; border: 1px solid #7a7a7a; padding: 3px; }
.xp-item.selected .xp-item-thumb { border-color: #0c327d; }
```

- [ ] **Step 5: Thread mediaBase through the desktop**

In `src/xp/createDesktop.js`, add `mediaBase` to the options and the context. Change the signature:

```js
export function createDesktop(rootEl, { resume, portfolio, pdfHref, mediaBase = '', repoUrl, storage = safeStorage(), reducedMotion = false, openExternal = defaultOpenExternal } = {}) {
```

and the ctx line:

```js
  const ctx = { wm, dialogs, menus, sounds, resume, portfolio, fs, pdfHref, mediaBase, repoUrl, storage, openExternal, screenEl: rootEl, toDesktopPoint };
```

and the file system line:

```js
  const fs = buildFileSystem(resume, portfolio);
```

In `src/main.js`, import the portfolio and pass both new values:

```js
import portfolio from './data/portfolio.json';
```

```js
const mediaBase = import.meta.env.BASE_URL;
const desktop = createDesktop(screenEl, { resume, portfolio, pdfHref, mediaBase, repoUrl: REPO_URL, reducedMotion });
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: PASS, including the repositioned Details menu test.

- [ ] **Step 7: Run the whole suite and look at it**

Run: `npm test`
Then: `npm run dev` and open My Documents, then My Pictures, then any project folder. Thumbnails should paint.

- [ ] **Step 8: Commit**

```bash
git add src/xp/apps/Explorer.js src/xp/apps/Explorer.test.js src/styles/xp-overrides.css src/xp/createDesktop.js src/main.js
git commit -m "feat(explorer): thumbnails view for picture folders"
```

---

### Task 5: Picture viewer

**Files:**
- Create: `src/xp/apps/PictureViewer.js`
- Create: `src/xp/apps/PictureViewer.test.js`
- Modify: `src/xp/createDesktop.js`
- Modify: `src/styles/xp-overrides.css`

**Interfaces:**
- Consumes: `ctx.portfolio`, `ctx.mediaBase`, `ctx.sounds.isMuted()`, and the viewer payload from Task 3.
- Produces:
  - `registerPictureViewer(registry)` registering app id `viewer`
  - `openPictureViewer(ctx, { slug, index, slideshow })`

- [ ] **Step 1: Write the failing test**

Create `src/xp/apps/PictureViewer.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { openPictureViewer, SLIDE_MS } from './PictureViewer.js';

const portfolio = {
  projects: [{
    slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
    category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
    tech: ['Unity', 'C#'],
    media: [
      { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
      { file: 'img2.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img2.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img2.jpg', width: 1600, height: 900 },
      { file: 'clip.mp4', kind: 'video', src: 'portfolio/dior-lip-glow/clip.mp4', thumb: null },
    ],
  }],
};

describe('picture viewer', () => {
  let ctx, errors;
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div>';
    errors = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      portfolio,
      mediaBase: '/XPcomputer/',
      sounds: { isMuted: () => true },
      dialogs: { message: (opts) => { errors.push(opts); return Promise.resolve('OK'); } },
    };
  });
  const img = (win) => win.el.querySelector('.xp-viewer-stage img');
  const caption = (win) => win.el.querySelector('.xp-viewer-caption').textContent;
  const click = (win, cmd) => win.el.querySelector(`[data-cmd="${cmd}"]`).click();

  it('opens at the requested index with the project name and position', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 1 });
    expect(img(win).getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/img2.jpg');
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    expect(win.title).toBe('img2.jpg - Windows Picture and Fax Viewer');
  });

  it('navigates and disables the buttons at each end', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    expect(win.el.querySelector('[data-cmd="prev"]').disabled).toBe(true);
    click(win, 'next');
    expect(img(win).getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/img2.jpg');
    expect(win.el.querySelector('[data-cmd="prev"]').disabled).toBe(false);
    click(win, 'next');
    expect(win.el.querySelector('[data-cmd="next"]').disabled).toBe(true);
  });

  it('moves with the arrow keys', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    win.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    win.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 1 of 3');
  });

  it('toggles between best fit and actual size', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    expect(win.el.querySelector('.xp-viewer-stage').classList.contains('xp-viewer-fit')).toBe(true);
    click(win, 'fit');
    expect(win.el.querySelector('.xp-viewer-stage').classList.contains('xp-viewer-fit')).toBe(false);
  });

  it('renders a muted video element for a video item', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 2 });
    const video = win.el.querySelector('.xp-viewer-stage video');
    expect(video.getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/clip.mp4');
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('auto-advances in slide show mode and stops at the end', () => {
    vi.useFakeTimers();
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0, slideshow: true });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    vi.advanceTimersByTime(SLIDE_MS);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 3 of 3');
    vi.advanceTimersByTime(SLIDE_MS * 3);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 3 of 3');
    vi.useRealTimers();
  });

  it('manual navigation cancels the slide show', () => {
    vi.useFakeTimers();
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0, slideshow: true });
    click(win, 'next');
    vi.advanceTimersByTime(SLIDE_MS * 3);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    vi.useRealTimers();
  });

  it('shows a placeholder when the image fails to load', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    img(win).dispatchEvent(new Event('error'));
    expect(win.el.querySelector('.xp-viewer-broken')).not.toBeNull();
  });

  it('reports an error dialog for an unknown slug', () => {
    openPictureViewer(ctx, { slug: 'nope', index: 0 });
    expect(errors[0]).toMatchObject({ kind: 'error' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/xp/apps/PictureViewer.test.js`
Expected: FAIL, cannot resolve `./PictureViewer.js`.

- [ ] **Step 3: Write the viewer**

Create `src/xp/apps/PictureViewer.js`:

```js
import { iconEl } from '../icons/index.js';

export const SLIDE_MS = 4000;
const MAX_W = 900;
const MAX_H = 620;
const VIDEO_SIZE = { width: 800, height: 600 };

export function registerPictureViewer(registry) {
  registry.register('viewer', { name: 'Windows Picture and Fax Viewer', icon: 'image', launch: openPictureViewer });
}

/** Window big enough for the image at best fit, with room for the caption strip and buttons. */
function windowSize(item) {
  if (item.kind === 'video' || !item.width || !item.height) return VIDEO_SIZE;
  const scale = Math.min(1, MAX_W / item.width, MAX_H / item.height);
  return { width: Math.round(item.width * scale) + 24, height: Math.round(item.height * scale) + 96 };
}

export function openPictureViewer(ctx, payload = {}) {
  const { wm, portfolio, mediaBase = '', sounds, dialogs } = ctx;
  const project = (portfolio?.projects ?? []).find((p) => p.slug === payload.slug);
  if (!project || project.media.length === 0) {
    return dialogs.message({
      title: 'Windows Picture and Fax Viewer', kind: 'error',
      text: 'Windows cannot open this picture. It may have been moved or deleted.',
    });
  }

  let index = Math.min(Math.max(Number(payload.index) || 0, 0), project.media.length - 1);
  let fit = true;
  let timer = null;

  const body = document.createElement('div');
  body.className = 'xp-viewer';
  body.innerHTML = `
    <div class="xp-viewer-stage xp-viewer-fit" tabindex="0"></div>
    <div class="xp-viewer-caption"></div>
    <div class="xp-viewer-bar">
      <button class="xp-tb" data-cmd="prev"><span class="xp-tb-ico" data-icon="arrowLeft"></span>Previous</button>
      <button class="xp-tb" data-cmd="next">Next<span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="fit">Actual Size</button>
    </div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));

  const stage = body.querySelector('.xp-viewer-stage');
  const caption = body.querySelector('.xp-viewer-caption');
  const button = (cmd) => body.querySelector(`[data-cmd="${cmd}"]`);

  const win = wm.open({
    appId: 'viewer', title: `${project.media[index].file} - Windows Picture and Fax Viewer`, icon: 'image',
    minWidth: 320, minHeight: 240, content: body, ...windowSize(project.media[index]),
  });

  function stopSlideshow() {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  }

  function scheduleSlide() {
    stopSlideshow();
    if (index >= project.media.length - 1) return;
    timer = setTimeout(() => { index += 1; render(); scheduleSlide(); }, SLIDE_MS);
  }

  function go(delta) {
    const next = index + delta;
    if (next < 0 || next >= project.media.length) return;
    stopSlideshow();
    index = next;
    render();
  }

  function render() {
    const item = project.media[index];
    stage.replaceChildren();
    stage.classList.toggle('xp-viewer-fit', fit);

    if (item.kind === 'video') {
      const video = document.createElement('video');
      video.src = `${mediaBase}${item.src}`;
      video.controls = true;
      // The tray speaker is the one place sound is turned on and off; honour it here too.
      video.muted = Boolean(sounds?.isMuted?.());
      stage.append(video);
    } else {
      const image = document.createElement('img');
      image.src = `${mediaBase}${item.src}`;
      image.alt = `${project.name} screenshot ${index + 1}`;
      image.addEventListener('error', () => {
        const broken = document.createElement('div');
        broken.className = 'xp-viewer-broken';
        broken.textContent = 'This picture could not be displayed.';
        stage.replaceChildren(broken);
      });
      stage.append(image);
    }

    caption.textContent = `${project.name} — ${index + 1} of ${project.media.length}`;
    win.setTitle(`${item.file} - Windows Picture and Fax Viewer`);
    button('prev').disabled = index === 0;
    button('next').disabled = index === project.media.length - 1;
    button('fit').textContent = fit ? 'Actual Size' : 'Best Fit';
  }

  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (cmd === 'prev') go(-1);
    else if (cmd === 'next') go(1);
    else if (cmd === 'fit') { fit = !fit; render(); }
  });
  win.el.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'Escape') win.close();
  });

  render();
  // The stage takes focus so the arrow keys work as soon as the window opens.
  stage.focus();
  if (payload.slideshow) scheduleSlide();
  return win;
}
```

- [ ] **Step 4: Add the CSS**

In `src/styles/xp-overrides.css`, after the thumbnails rules from Task 4, add:

```css
.xp-viewer { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #5a5a5a; }
.xp-viewer-stage { flex: 1; display: flex; align-items: center; justify-content: center; overflow: auto; min-height: 0; padding: 6px; }
.xp-viewer-stage img, .xp-viewer-stage video { max-width: none; }
.xp-viewer-fit img, .xp-viewer-fit video { max-width: 100%; max-height: 100%; object-fit: contain; }
.xp-viewer-broken { color: #fff; font-size: 11px; padding: 20px; text-align: center; }
.xp-viewer-caption { background: #ece9d8; padding: 3px 8px; font-size: 11px; border-top: 1px solid #d8d2bd; }
.xp-viewer-bar { background: #ece9d8; display: flex; align-items: center; gap: 4px; padding: 4px 6px; }
```

- [ ] **Step 5: Register the app**

In `src/xp/createDesktop.js`, add the import beside the other app imports:

```js
import { registerPictureViewer } from './apps/PictureViewer.js';
```

and the register call after `registerMisc(registry);`:

```js
  registerPictureViewer(registry);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/xp/apps/PictureViewer.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 7: Run the whole suite and look at it**

Run: `npm test`
Then: `npm run dev`, open a project folder, and double-click a thumbnail. Check Previous and Next, the fit toggle, and the arrow keys.

- [ ] **Step 8: Commit**

```bash
git add src/xp/apps/PictureViewer.js src/xp/apps/PictureViewer.test.js src/xp/createDesktop.js src/styles/xp-overrides.css
git commit -m "feat(portfolio): picture and fax viewer window"
```

---

### Task 6: Task pane project details and the slide show link

**Files:**
- Modify: `src/xp/apps/Explorer.js`
- Modify: `src/xp/apps/Explorer.test.js`

**Interfaces:**
- Consumes: the `project` field on folder nodes from Task 3, and app id `viewer` from Task 5.
- Produces: no new exports. The task pane Details group renders project prose, and the File and Folder Tasks group gains a slide show link.

- [ ] **Step 1: Write the failing test**

First give the `explorer thumbnails` describe block from Task 4 a launch spy. Change its declaration and `beforeEach` so they read:

```js
  let ctx, launched;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    launched = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume, portfolio),
      mediaBase: '/XPcomputer/',
      registry: { launch: (id, p) => launched.push([id, p]) },
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
      toDesktopPoint: (x, y) => ({ x, y }),
    };
  });
```

Then add these tests to that same block:

```js
  it('shows the project prose in the task pane details group', () => {
    const win = openExplorer(ctx, PROJECT);
    const details = win.el.querySelector('.xp-taskpane').textContent;
    expect(details).toContain('Dior Lip Glow Face Detection');
    expect(details).toContain('Gesture-controlled mini-game.');
    expect(details).toContain('A Dior-branded mini-game.');
    expect(details).toContain('Unity, C#');
  });

  it('replaces the details group with the file when one is selected', () => {
    const win = openExplorer(ctx, PROJECT);
    win.el.querySelector('[data-name="img2.jpg"]').click();
    const details = win.el.querySelector('.xp-taskpane').textContent;
    expect(details).toContain('img2.jpg');
    expect(details).toContain('1600 x 900');
  });

  it('offers a slide show link that launches the viewer at the first item', () => {
    const win = openExplorer(ctx, PROJECT);
    const link = [...win.el.querySelectorAll('.xp-taskpane a')].find((a) => a.textContent === 'View as a slide show');
    link.click();
    expect(launched.at(-1)).toEqual(['viewer', { slug: 'dior-lip-glow', index: 0, slideshow: true }]);
  });

  it('offers no slide show link outside a project folder', () => {
    const win = openExplorer(ctx, PICTURES);
    const link = [...win.el.querySelectorAll('.xp-taskpane a')].find((a) => a.textContent === 'View as a slide show');
    expect(link).toBeUndefined();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: FAIL, the task pane shows only the folder name and type.

- [ ] **Step 3: Implement the details group**

In `src/xp/apps/Explorer.js`, add this helper just above `renderTaskPane`:

```js
  function detailsLines(node, selected) {
    if (selected?.mediaKind) {
      const size = selected.width && selected.height ? `${selected.width} x ${selected.height}` : 'Video file';
      return [`<b>${esc(selected.name)}</b><br>${esc(size)}`];
    }
    if (node.project) {
      const p = node.project;
      return [`<b>${esc(p.name)}</b>`, esc(p.tagline), esc(p.description), `<i>${esc(p.tech.join(', '))}</i>`];
    }
    return [`<b>${esc(node.name)}</b><br>${TYPE_NAMES[node.kind] ?? 'File'}`];
  }
```

Change `renderTaskPane` to take the selection and use the helper. Replace the signature:

```js
  function renderTaskPane(node, selected = null) {
```

Inside the `else` branch that builds File and Folder Tasks, replace the single `groups.push(['File and Folder Tasks', ...])` line with:

```js
      const tasks = [link('Make a new folder', 'unavailable'), link('Publish this folder to the Web', 'unavailable'), link('Share this folder', 'unavailable')];
      if (node.project) tasks.unshift(link('View as a slide show', `slideshow:${node.project.slug}`));
      groups.push(['File and Folder Tasks', tasks]);
```

Replace the Details push:

```js
    groups.push(['Details', detailsLines(node, selected)]);
```

- [ ] **Step 4: Re-render the pane on selection**

In `itemEl`, extend the existing click listener:

```js
    el.addEventListener('click', () => {
      items.querySelectorAll('.selected').forEach((s) => s.classList.remove('selected'));
      el.classList.add('selected');
      renderTaskPane(currentNode(), child);
    });
```

- [ ] **Step 5: Handle the slide show action**

In the task pane click handler, add the branch before the `unavailable` check:

```js
    if (action.startsWith('nav:')) navigate(action.slice(4));
    else if (action.startsWith('slideshow:')) registry.launch('viewer', { slug: action.slice(10), index: 0, slideshow: true });
    else if (action === 'unavailable') notAvailable();
    else registry.launch(action);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: PASS.

- [ ] **Step 7: Run the whole suite and look at it**

Run: `npm test`
Then: `npm run dev`, open a project folder, read the left pane, click a photo, then click the slide show link.

- [ ] **Step 8: Commit**

```bash
git add src/xp/apps/Explorer.js src/xp/apps/Explorer.test.js
git commit -m "feat(explorer): project details and slide show in the task pane"
```

---

### Task 7: Discoverability

**Files:**
- Modify: `src/xp/createDesktop.js`
- Modify: `src/xp/apps/Homepage.js`
- Modify: `src/xp/apps/Homepage.test.js`
- Modify: `src/xp/apps/InternetExplorer.js`

**Interfaces:**
- Consumes: app id `explorer` with a `path` payload.
- Produces: the homepage emits `data-app="explorer"` with `data-path` on its Projects and Portfolio links; Internet Explorer forwards that path through the registry.

- [ ] **Step 1: Write the failing test**

In `src/xp/apps/Homepage.test.js`, add:

```js
  it('links Projects and Portfolio into My Pictures rather than off-site', () => {
    const html = renderHomepage(resume, { pdfHref: '/x.pdf', repoUrl: 'https://example.com' });
    expect(html).toContain('data-app="explorer"');
    expect(html).toContain('data-path="C:\\Documents and Settings\\Stephen\\My Documents\\My Pictures"');
    expect(html).toContain('>Projects<');
    expect(html).not.toContain(resume.contact.portfolio);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/xp/apps/Homepage.test.js`
Expected: FAIL, the homepage still renders the external portfolio URL.

- [ ] **Step 3: Change the homepage links**

In `src/xp/apps/Homepage.js`, import the path constant at the top:

```js
import { PATHS } from '../../data/filesystem.js';
```

Add a helper beside `external`:

```js
  const PICTURES = `${PATHS.myDocuments}\\My Pictures`;
  const pictures = (label) => `<a href="#projects" data-app="explorer" data-path="${esc(PICTURES)}">${esc(label)}</a>`;
```

Add Projects to the nav row, between Experience and Expertise:

```js
<tr><td class="nav"><a href="#about">About Me</a> | <a href="#experience">Experience</a> | ${pictures('Projects')} | <a href="#expertise">Expertise</a> | <a href="#education">Education</a> | <a href="#contact">Contact</a> | ${pdfLink('Download my resume (PDF)')}</td></tr>
```

Replace the Portfolio line in the links list:

```js
    <li>Portfolio: ${pictures('My project screenshots')}</li>
```

- [ ] **Step 4: Forward the path through Internet Explorer**

In `src/xp/apps/InternetExplorer.js`, inside the iframe click handler, replace:

```js
      if (a.dataset.app) registry.launch(a.dataset.app);
```

with:

```js
      if (a.dataset.app) registry.launch(a.dataset.app, a.dataset.path ? { path: a.dataset.path } : undefined);
```

- [ ] **Step 5: Add the desktop shortcut and update the balloon and Start icon**

In `src/xp/createDesktop.js`, add a fifth desktop icon after My Documents:

```js
    { id: 'pictures', label: 'My Pictures', icon: 'pictures', launch: launch('explorer', { path: `${PATHS.myDocuments}\\My Pictures` }) },
```

Change the existing Start menu My Pictures entry from the generic folder icon:

```js
      { label: 'My Pictures', icon: 'pictures', action: launch('explorer', { path: `${PATHS.myDocuments}\\My Pictures` }) },
```

Change the balloon tip text:

```js
    setTimeout(() => taskbar.showBalloon({ title: 'Welcome!', text: 'Open Internet Explorer for my resume, or My Pictures for my project screenshots.', onClick: launch('iexplore') }), 1200);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS. If `createDesktop.test.js` or `Desktop.test.js` asserts a desktop icon count, update it to five.

- [ ] **Step 7: Look at it**

Run: `npm run dev`. Check the new desktop icon, the balloon on boot, the Start menu icon, and both homepage links inside Internet Explorer.

- [ ] **Step 8: Commit**

```bash
git add src/xp/createDesktop.js src/xp/apps/Homepage.js src/xp/apps/Homepage.test.js src/xp/apps/InternetExplorer.js
git commit -m "feat(portfolio): surface the projects from the desktop and homepage"
```

---

### Task 8: Documentation

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: no code.

- [ ] **Step 1: Document the content pipeline**

In `README.md`, after the "Update the resume content" section, add:

```markdown
## Update the portfolio content

`src/data/portfolio.json` and `public/portfolio/` are the source of truth. Edit
the JSON directly to change a title, a description or a folder name.

The importer that first brought the content over from the sibling `GBC_Portfolio`
repo is still here and still works:

    npm run sync-portfolio
    npm run sync-portfolio -- --repo ../GBC_Portfolio

It re-optimizes every photo, so it overwrites hand edits. The video is the one
manual step: the script never runs ffmpeg, and prints the exact command to run
when the encoded file is missing.
```

- [ ] **Step 2: Extend the QA checklist**

Add these lines to the "Manual QA checklist" list in `README.md`:

```markdown
- [ ] My Pictures lists every project folder; each opens in Thumbnails view with images painted
- [ ] The task pane shows the project name, tagline, description and tech tags; clicking a photo shows its dimensions
- [ ] Double-clicking a photo opens the viewer; Previous, Next, arrow keys and the fit toggle all work; the buttons disable at each end
- [ ] "View as a slide show" advances on its own and stops at the last photo; clicking Next cancels it
- [ ] The MEGABOX video plays in the viewer and starts muted when the tray speaker is muted
- [ ] The desktop My Pictures icon, the Start menu entry and the homepage Projects link all reach the folder
```

- [ ] **Step 3: Update the controls and roadmap**

Add to the "Controls" list:

```markdown
- Picture viewer: left and right arrows move between photos, Escape closes, and the button strip toggles best fit and actual size.
```

Change the roadmap so the portfolio appears before Solitaire:

```markdown
4. ~~Portfolio import from GBC, replacing the Wix site~~ done
5. Solitaire
6. Pinball
7. Polish and performance pass
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: portfolio pipeline, QA checklist and roadmap"
```

---

### Task 9: Wix cutover

Cross-repo. This runs only after everything above is merged to `main` here and deployed, and after Stephen has confirmed the live site looks right.

**Files:**
- Modify (in the sibling `Resume` repo): `portfolio.tex` on `main`, `bmo-job` and `non-tech-resume`
- Modify (regenerated here): `src/data/resume.json`, `public/resume/resume-main.pdf`

**Interfaces:**
- Consumes: a deployed XPcomputer at `https://stephenyctsedev.github.io/XPcomputer/`.
- Produces: a resume PDF whose link and QR code point at XPcomputer.

- [ ] **Step 1: Confirm the deployed site**

Open `https://stephenyctsedev.github.io/XPcomputer/`, walk the QA checklist lines added in Task 8, and confirm the thumbnails and the video load over the network rather than only in dev.

- [ ] **Step 2: Change the URL on each Resume branch**

For each of `main`, `bmo-job` and `non-tech-resume`, in the `Resume` repo:

```bash
git checkout main
```

Then edit `portfolio.tex` so both the visible link and the QR target change. It currently reads:

```latex
  \href{https://stephenyctse.wixsite.com/portfolio}{\color{white}stephenyctse.wixsite.com/portfolio}\\[8pt]
  \qrcode[height=3.5cm]{https://stephenyctse.wixsite.com/portfolio}%
```

It becomes:

```latex
  \href{https://stephenyctsedev.github.io/XPcomputer/}{\color{white}stephenyctsedev.github.io/XPcomputer}\\[8pt]
  \qrcode[height=3.5cm]{https://stephenyctsedev.github.io/XPcomputer/}%
```

Commit on each branch:

```bash
git add portfolio.tex
git commit -m "chore: point the portfolio link at XPcomputer"
```

- [ ] **Step 3: Wait for the Resume CI**

Push each branch and wait for the workflow to publish `resume-<branch>.pdf` to the `preview` branch. Confirm all three are rebuilt before continuing.

- [ ] **Step 4: Pull the rebuilt resume back into this repo**

Run: `npm run sync-resume`
Expected: `src/data/resume.json` now carries the XPcomputer URL in `contact.portfolio`, and `public/resume/resume-main.pdf` is the rebuilt file.

- [ ] **Step 5: Verify nothing still says Wix**

```bash
grep -rin "wixsite" src public README.md
```

Expected: no matches outside `docs/`, where the spec records the history on purpose.

- [ ] **Step 6: Commit**

```bash
git add src/data/resume.json public/resume/resume-main.pdf
git commit -m "chore: retire the Wix portfolio link"
```

- [ ] **Step 7: Leave the Wix site standing**

Do not delete it. Replace its homepage with a short line pointing at
`https://stephenyctsedev.github.io/XPcomputer/`, because resumes already sent
carry a QR code aimed at the old address and cannot be recalled.
