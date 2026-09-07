# XP Computer Portfolio — Phase 1 Implementation Plan (Skeleton, Resume Pipeline, XP Shell)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working fake Windows XP desktop in the browser (flat mode) where a recruiter can boot the PC, open Internet Explorer, read Stephen's resume as a retro homepage, and download the real PDF.

**Architecture:** A pure-DOM Windows XP shell (`src/xp/`) mounted by `createDesktop()` into a 1024×768 element, with apps registered in a small app registry and windows managed by one window manager. Content comes from `src/data/resume.json`, generated from the LaTeX resume by `scripts/sync-resume.mjs`. `src/main.js` picks a mode and, in flat mode, letterboxes the desktop to the viewport. The 3D room is Phase 2 and is not touched here.

**Tech Stack:** Vite, plain JavaScript ES modules, XP.css (MIT), Vitest + jsdom, WebAudio, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` (sections 3, 5, 6, 8, 9, 10, 11, 12, 13, 14 phase 1)

## Global Constraints

- Plain JavaScript ES modules; no TypeScript, no UI framework.
- Node 20+, npm. Vite `base: '/XPcomputer/'`.
- `src/xp/**` must never import from `three` or `src/room/**`.
- Game engines and parsers are pure modules with no DOM access.
- No Microsoft bitmaps, icons, wallpapers, sounds, fonts, logos or card art. All icons are our own SVG; all sounds are synthesized.
- The phone number never appears in `resume.json` or on the site unless `--include-phone` is passed to the sync script.
- Display name: "Stephen Tse". Full name "YIU CHUNG TSE, STEPHEN" appears only in System Properties.
- Files are written as UTF-8.
- **Never `git commit` or `git push` unless Stephen says so.** Where this plan says "Commit", stage the files with `git add` and stop; Stephen commits when he asks for it. If he says "commit as you go", use the messages given.
- The desktop element is exactly 1024×768 CSS px; taskbar height 30 px.
- `localStorage` keys are prefixed `xpcomputer.`; every access is wrapped in try/catch.

---

## File Structure (Phase 1)

| File | Responsibility |
|---|---|
| `package.json`, `vite.config.js`, `vitest.config.js`, `index.html` | Project skeleton, scripts, test environment |
| `.github/workflows/deploy.yml` | Test, build, deploy to Pages on push to main |
| `src/main.js` | Pick mode; flat mode letterbox; wire desktop controller |
| `src/modes.js` | Pure `pickMode()` decision |
| `src/styles/base.css` | Page reset, flat-mode stage |
| `src/styles/xp-overrides.css` | All shell styling on top of XP.css (desktop, icons, taskbar, start menu, boot, windows, explorer, IE chrome, dialogs) |
| `scripts/tex-parse.mjs` | Pure LaTeX extraction functions |
| `scripts/tex-parse.test.mjs` | Parser tests against fixtures |
| `scripts/sync-resume.mjs` | CLI: .tex → `src/data/resume.json`, copy PDF |
| `tests/fixtures/resume-tex/*.tex` | Snapshot of the Resume repo sources |
| `src/data/resume.json` | Generated content |
| `src/data/filesystem.js` (+ test) | Fake drive tree from resume |
| `src/xp/sounds.js` | WebAudio synth + mute persistence |
| `src/xp/WindowManager.js` (+ test) | Windows: open/focus/minimize/maximize/close/drag/resize/z-order |
| `src/xp/Dialog.js` (+ test) | Message boxes, Run dialog |
| `src/xp/apps/registry.js` | App id → launcher |
| `src/xp/apps/Homepage.js` (+ test), `homepage.css` | Retro resume HTML for the IE iframe |
| `src/xp/apps/InternetExplorer.js` | IE6-style chrome around srcdoc iframe |
| `src/xp/apps/AdobeReader.js` | PDF window with fallback |
| `src/xp/apps/Explorer.js` | My Computer / My Documents / Recycle Bin |
| `src/xp/apps/Notepad.js` | Text viewer |
| `src/xp/apps/SystemProperties.js` | Tabbed "specs" dialog |
| `src/xp/icons/index.js` | Own SVG icon strings + `iconEl()` helper |
| `src/xp/wallpaper.svg` | Original wallpaper |
| `src/xp/Desktop.js` | Icon grid, selection, open |
| `src/xp/Taskbar.js` (+ test) | Start button, task buttons, tray, clock, balloon |
| `src/xp/StartMenu.js` | Two-column menu with flyouts |
| `src/xp/Boot.js` (+ test) | Power on/off, log off, stand by state machine |
| `src/xp/createDesktop.js` | Mounts everything, returns controller |
| `README.md` | What/how to run/test/sync/deploy, licensing, QA checklist |

---

### Task 1: Project skeleton, mode picker, deploy workflow

**Files:**
- Create: `package.json`, `vite.config.js`, `vitest.config.js`, `index.html`, `.gitignore`
- Create: `src/modes.js`, `src/modes.test.js`, `src/main.js`, `src/styles/base.css`
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Produces: `pickMode({ query, hasWebGL2, coarsePointer, viewportWidth }) → 'room' | 'flat'` (src/modes.js). Task 11 replaces `src/main.js`.

- [ ] **Step 1: Initialize npm and install dependencies**

Run from `C:\Users\stephen\Documents\Project\XPcomputer`:

```bash
npm init -y
npm install three xp.css
npm install --save-dev vite vitest jsdom
ls node_modules/xp.css/dist
```

Expected: the last command lists `XP.css` (note the capital letters). If the file is named differently, use that exact name in every `import 'xp.css/dist/XP.css'` line in this plan.

- [ ] **Step 2: Write package.json scripts and .gitignore**

Edit `package.json` so it contains these fields (keep the dependency versions npm wrote):

```json
{
  "name": "xpcomputer",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "sync-resume": "node scripts/sync-resume.mjs"
  }
}
```

Create `.gitignore`:

```
node_modules/
dist/
.vite/
*.log
```

- [ ] **Step 3: Write vite.config.js and vitest.config.js**

`vite.config.js`:

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/XPcomputer/',
  build: { target: 'es2020', sourcemap: false },
});
```

`vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.js', 'scripts/**/*.test.mjs'],
  },
});
```

- [ ] **Step 4: Write the failing test for pickMode**

`src/modes.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { pickMode } from './modes.js';

describe('pickMode', () => {
  const desktop = { query: '', hasWebGL2: true, coarsePointer: false, viewportWidth: 1440 };

  it('picks room on a capable desktop', () => {
    expect(pickMode(desktop)).toBe('room');
  });
  it('forces flat with ?mode=flat', () => {
    expect(pickMode({ ...desktop, query: '?mode=flat' })).toBe('flat');
  });
  it('forces room with ?mode=room even on touch', () => {
    expect(pickMode({ ...desktop, query: '?mode=room', coarsePointer: true })).toBe('room');
  });
  it('falls back to flat without WebGL2', () => {
    expect(pickMode({ ...desktop, hasWebGL2: false })).toBe('flat');
  });
  it('falls back to flat on coarse pointers', () => {
    expect(pickMode({ ...desktop, coarsePointer: true })).toBe('flat');
  });
  it('falls back to flat under 900px wide', () => {
    expect(pickMode({ ...desktop, viewportWidth: 899 })).toBe('flat');
    expect(pickMode({ ...desktop, viewportWidth: 900 })).toBe('room');
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `npx vitest run src/modes.test.js`
Expected: FAIL — cannot resolve `./modes.js`.

- [ ] **Step 6: Implement modes.js**

`src/modes.js`:

```js
/**
 * Decide which experience to load.
 * @param {{query?: string, hasWebGL2?: boolean, coarsePointer?: boolean, viewportWidth?: number}} env
 * @returns {'room' | 'flat'}
 */
export function pickMode({ query = '', hasWebGL2 = true, coarsePointer = false, viewportWidth = 1280 } = {}) {
  const forced = new URLSearchParams(query).get('mode');
  if (forced === 'flat' || forced === 'room') return forced;
  if (!hasWebGL2 || coarsePointer || viewportWidth < 900) return 'flat';
  return 'room';
}

/** Read the real browser environment (not unit tested). */
export function detectEnv() {
  let hasWebGL2 = false;
  try {
    hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
  } catch { hasWebGL2 = false; }
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return { query: location.search, hasWebGL2, coarsePointer, viewportWidth: innerWidth };
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `npx vitest run src/modes.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 8: Write index.html, base.css, and a placeholder main.js**

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Stephen Tse — XP Computer</title>
    <meta name="description" content="Stephen Tse's interactive resume: a cyberpunk bedroom with an old PC running Windows XP." />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`src/styles/base.css`:

```css
html, body { margin: 0; height: 100%; background: #000; color: #ddd; font-family: Tahoma, Verdana, sans-serif; }
#app { position: fixed; inset: 0; overflow: hidden; }
.flat-stage { position: absolute; inset: 0; display: grid; place-items: center; background: #000; }
.flat-notice { position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; font-size: 12px; color: #777; }
```

Placeholder `src/main.js` (replaced in Task 11):

```js
import './styles/base.css';
import { pickMode, detectEnv } from './modes.js';

const mode = pickMode(detectEnv());
document.querySelector('#app').textContent = `XPcomputer — mode: ${mode}`;
```

- [ ] **Step 9: Verify the dev server renders the placeholder**

Run: `npx vite --open` (or `npm run dev` and open the printed URL).
Expected: black page reading "XPcomputer — mode: room" on desktop; append `?mode=flat` to see "flat". Stop the server afterwards.

- [ ] **Step 10: Write the deploy workflow**

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 11: Write the initial README**

`README.md`:

```markdown
# XPcomputer

Stephen Tse's interactive resume: a cyberpunk bedroom (three.js) with an old PC
running a fake Windows XP. Internet Explorer shows the resume, My Computer and
My Documents are explorable, and the Start menu has Minesweeper, Solitaire and
Pinball. Live at https://stephenyctsedev.github.io/XPcomputer/

## Run locally

    npm install
    npm run dev          # http://localhost:5173/XPcomputer/
    npm run dev -- --open

Add `?mode=flat` to skip the 3D room, `?mode=room` to force it.

## Test

    npm test

## Update the resume content

Check out the wanted branch in the sibling `../Resume` repo, wait for its CI to
publish `resume-<branch>.pdf` to the `preview` branch, then:

    npm run sync-resume                 # main branch, phone number excluded
    npm run sync-resume -- --branch bmo-job --display-name "Stephen Tse"

This rewrites `src/data/resume.json` and `public/resume/resume-main.pdf`.

## Build and deploy

    npm run build        # dist/

Pushing to `main` runs tests, builds, and deploys to GitHub Pages
(`.github/workflows/deploy.yml`). Pages source must be set to "GitHub Actions".

## Licensing

Code is MIT. Uses three.js (MIT) and XP.css (MIT). No Microsoft artwork,
sounds, logos or card art are included; everything is drawn or synthesized here.
```

- [ ] **Step 12: Stage the skeleton**

```bash
git add package.json package-lock.json vite.config.js vitest.config.js index.html .gitignore src/ .github/ README.md
git status --short
```

Suggested commit message when Stephen asks: `chore: project skeleton, mode picker, Pages workflow`

---
### Task 2: Resume pipeline — LaTeX parser, sync script, resume.json, PDF

**Files:**
- Create: `tests/fixtures/resume-tex/{header,aboutme,contact,education,experience,expertise,language,portfolio}.tex`
- Create: `scripts/tex-parse.mjs`, `scripts/tex-parse.test.mjs`, `scripts/sync-resume.mjs`
- Generate: `src/data/resume.json`, `public/resume/resume-main.pdf`

**Interfaces:**
- Produces: `buildResume(files, { includePhone, displayName, sourceBranch, updated }) → resume` where `resume` matches spec §8.1: `{ fullName, displayName, title, summary, contact: { email, location, linkedin, portfolio, phone? }, expertise: string[], languages: {name, level}[], education: {year, degree, school}[], experience: {period, title, company, bullets: string[]}[], sourceBranch, updated }`.
- Produces: `src/data/resume.json` consumed by Tasks 6, 7, 8, 11.

- [ ] **Step 1: Snapshot the .tex sources as fixtures**

```bash
mkdir -p tests/fixtures/resume-tex
for f in header aboutme contact education experience expertise language portfolio; do cp "../Resume/$f.tex" tests/fixtures/resume-tex/; done
ls tests/fixtures/resume-tex
```

Expected: 8 files.

- [ ] **Step 2: Write the failing parser tests**

`scripts/tex-parse.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  stripComments, readGroup, unescapeLatex, parseHeader, parseAboutMe, parseContact,
  parseEducation, parseExperience, parseExpertise, parseLanguages, parsePortfolio,
  deriveDisplayName, buildResume,
} from './tex-parse.mjs';

const fx = (name) => readFileSync(new URL(`../tests/fixtures/resume-tex/${name}.tex`, import.meta.url), 'utf8');
const files = Object.fromEntries(
  ['header', 'aboutme', 'contact', 'education', 'experience', 'expertise', 'language', 'portfolio']
    .map((n) => [`${n}.tex`, fx(n)]),
);

describe('primitives', () => {
  it('strips % comments but keeps escaped \\%', () => {
    expect(stripComments('a \\% b % comment\nc')).toBe('a \\% b \nc');
  });
  it('reads a nested brace group', () => {
    expect(readGroup('x{a{b}c}y', 1)).toEqual({ content: 'a{b}c', end: 8 });
  });
  it('unescapes common LaTeX', () => {
    expect(unescapeLatex('C\\#  \\& Node.js\\\\[3pt] 2018 -- 2020 {\\bfseries X}')).toBe('C# & Node.js 2018 – 2020 X');
  });
});

describe('sections', () => {
  it('parses header', () => {
    expect(parseHeader(files['header.tex'])).toEqual({ fullName: 'YIU CHUNG TSE, STEPHEN', title: 'Game Programmer' });
  });
  it('parses about me as one clean paragraph', () => {
    const s = parseAboutMe(files['aboutme.tex']);
    expect(s.startsWith('As a passionate and adaptable software developer')).toBe(true);
    expect(s.endsWith('as a software programmer.')).toBe(true);
    expect(s).not.toMatch(/[\\%{}]/);
  });
  it('parses contact', () => {
    expect(parseContact(files['contact.tex'])).toEqual({
      phone: '(204) 227-0624',
      email: 'stephenyctsedev@gmail.com',
      location: 'Winnipeg, Manitoba, Canada',
      linkedin: 'https://www.linkedin.com/in/stephenyctse/',
    });
  });
  it('parses education', () => {
    expect(parseEducation(files['education.tex'])).toEqual([
      { year: '2018', degree: 'Higher Diploma in Game Software Development', school: 'Hong Kong Institute of Vocational Education (Tsing Yi, Hong Kong)' },
      { year: '2013', degree: 'Diploma in Vocational Education (Information Technology)', school: 'Youth College (Kwai Chung, Hong Kong)' },
    ]);
  });
  it('parses experience entries with bullets', () => {
    const jobs = parseExperience(files['experience.tex']);
    expect(jobs).toHaveLength(4);
    expect(jobs[0]).toMatchObject({ period: '2023 – Present', title: 'Store Associate', company: 'Sun Wah Supermarket, Winnipeg, Canada' });
    expect(jobs[0].bullets).toHaveLength(4);
    expect(jobs[3].title).toBe('Game Programmer');
    expect(jobs[3].bullets[0]).toMatch(/^Develop interactive photo\/video booths/);
  });
  it('parses expertise table cells', () => {
    expect(parseExpertise(files['expertise.tex'])).toEqual(['Unity', 'SQL', 'Java', 'PHP', 'JavaScript', 'Python', 'C#', 'Node.js', 'PlayCanvas', 'Socket.IO']);
  });
  it('parses languages', () => {
    expect(parseLanguages(files['language.tex'])).toEqual([
      { name: 'Cantonese', level: 'Native Speaker' }, { name: 'English', level: 'Basic' }, { name: 'Mandarin', level: 'Advanced' },
    ]);
  });
  it('parses portfolio url', () => {
    expect(parsePortfolio(files['portfolio.tex'])).toBe('https://stephenyctse.wixsite.com/portfolio');
  });
});

describe('buildResume', () => {
  it('derives the display name', () => {
    expect(deriveDisplayName('YIU CHUNG TSE, STEPHEN')).toBe('Stephen Tse');
  });
  it('excludes the phone by default and includes it on request', () => {
    const r = buildResume(files, { updated: '2026-09-07' });
    expect(r.contact.phone).toBeUndefined();
    expect(JSON.stringify(r)).not.toContain('227-0624');
    expect(r.displayName).toBe('Stephen Tse');
    expect(r.sourceBranch).toBe('main');
    expect(r.updated).toBe('2026-09-07');
    expect(buildResume(files, { includePhone: true }).contact.phone).toBe('(204) 227-0624');
  });
  it('throws naming the missing section instead of writing partial data', () => {
    expect(() => buildResume({ ...files, 'experience.tex': '' })).toThrow(/experience/);
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run scripts/tex-parse.test.mjs`
Expected: FAIL — cannot resolve `./tex-parse.mjs`.

- [ ] **Step 4: Implement tex-parse.mjs**

`scripts/tex-parse.mjs`:

```js
// Pure LaTeX extraction for the Resume repo's known macros. No filesystem access here.

export function stripComments(tex) {
  return tex.split('\n').map((line) => {
    let out = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '\\') { out += ch + (line[i + 1] ?? ''); i++; continue; }
      if (ch === '%') break;
      out += ch;
    }
    return out;
  }).join('\n');
}

/** str[start] must be "{". Returns the inner text and the index after the matching "}". */
export function readGroup(str, start) {
  if (str[start] !== '{') throw new Error(`expected "{" at index ${start}`);
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') { i++; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return { content: str.slice(start + 1, i), end: i + 1 };
    }
  }
  throw new Error('unbalanced braces');
}

export function readArgs(str, start, count) {
  let i = start;
  const args = [];
  for (let k = 0; k < count; k++) {
    while (i < str.length && /\s/.test(str[i])) i++;
    const g = readGroup(str, i);
    args.push(g.content);
    i = g.end;
  }
  return { args, end: i };
}

export function unescapeLatex(s) {
  return s
    .replace(/\\\\(\[[^\]]*\])?/g, ' ')                       // "\\" and "\\[5pt]" line breaks
    .replace(/\\#/g, '#').replace(/\\&/g, '&').replace(/\\%/g, '%').replace(/\\_/g, '_').replace(/\\\$/g, '$')
    .replace(/---/g, '—').replace(/--/g, '–')
    .replace(/\\fontsize\{[^}]*\}\{[^}]*\}/g, ' ')             // two-argument command, drop both
    .replace(/\\(?:color|textcolor|vspace|hspace|href|qrcode)(\[[^\]]*\])?\{[^}]*\}/g, ' ') // drop first argument
    .replace(/\\[a-zA-Z]+\*?/g, ' ')                           // any remaining command name
    .replace(/\\ /g, ' ')                                      // control space
    .replace(/[{}]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHeader(tex) {
  const src = stripComments(tex);
  const name = src.match(/\\bfseries\\color\{darktext\}([^}]+)\}/)?.[1] ?? '';
  const title = src.match(/\\large\\color\{darktext\}([^}]+)\}/)?.[1] ?? '';
  return { fullName: unescapeLatex(name), title: unescapeLatex(title) };
}

export function parseAboutMe(tex) {
  const src = stripComments(tex);
  const i = src.indexOf('{\\normalsize');
  return i < 0 ? '' : unescapeLatex(readGroup(src, i).content);
}

export function parseContact(tex) {
  const src = stripComments(tex);
  const phone = src.match(/\\faPhone\{\}\\enspace\{\}([^\\\n]+)/)?.[1] ?? '';
  const location = src.match(/\\faMapMarker\{\}\\enspace\{\}([^\\\n]+)/)?.[1] ?? '';
  const email = src.match(/mailto:([^}]+)\}/)?.[1] ?? '';
  const linkedin = src.match(/\\href\{(https?:\/\/[^}]*linkedin[^}]*)\}/)?.[1] ?? '';
  return { phone: unescapeLatex(phone), email: email.trim(), location: unescapeLatex(location), linkedin: linkedin.trim() };
}

export function parseEducation(tex) {
  const src = stripComments(tex);
  const years = [...src.matchAll(/\{\\itshape\s*([^}]*)\}/g)];
  return years.map((m, k) => {
    const segStart = m.index + m[0].length;
    const segEnd = k + 1 < years.length ? years[k + 1].index : src.length;
    const seg = src.slice(segStart, segEnd);
    const gi = seg.indexOf('{\\color{eduBlue}');
    if (gi < 0) throw new Error(`education entry ${m[1]}: degree group not found`);
    const g = readGroup(seg, gi);
    const rest = seg.slice(g.end).replace(/^\s*\\par\s*\\vspace\{[^}]*\}/, '');
    return { year: unescapeLatex(m[1]), degree: unescapeLatex(g.content), school: unescapeLatex(rest.split('\\par')[0]) };
  });
}

export function parseExperience(tex) {
  const src = stripComments(tex);
  const out = [];
  let pos = src.indexOf('\\expEntry');
  while (pos >= 0) {
    const { args, end } = readArgs(src, pos + '\\expEntry'.length, 4);
    const [period, title, company, items] = args;
    out.push({
      period: unescapeLatex(period),
      title: unescapeLatex(title),
      company: unescapeLatex(company),
      bullets: items.split('\\item').map(unescapeLatex).filter(Boolean),
    });
    pos = src.indexOf('\\expEntry', end);
  }
  return out;
}

export function parseExpertise(tex) {
  return stripComments(tex).split('\n')
    .filter((line) => line.includes('&'))
    .flatMap((line) => line.split('&').map(unescapeLatex))
    .filter(Boolean);
}

export function parseLanguages(tex) {
  const src = stripComments(tex);
  const i = src.indexOf('{\\small');
  const body = i >= 0 ? readGroup(src, i).content : src;
  return body.split('\n').map(unescapeLatex).filter((l) => l.includes(':')).map((l) => {
    const [name, ...rest] = l.split(':');
    return { name: name.trim(), level: rest.join(':').trim() };
  });
}

export function parsePortfolio(tex) {
  return stripComments(tex).match(/\\href\{([^}]+)\}/)?.[1]?.trim() ?? '';
}

const titleCase = (s) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

/** "YIU CHUNG TSE, STEPHEN" -> "Stephen Tse" (given name after the comma + last word before it). */
export function deriveDisplayName(fullName) {
  const [before, after] = fullName.split(',').map((s) => s.trim());
  if (!after) return titleCase(fullName);
  return titleCase(`${after} ${before.split(/\s+/).pop()}`);
}

export function validateResume(r) {
  const missing = [];
  const need = (ok, name) => { if (!ok) missing.push(name); };
  need(r.fullName, 'fullName'); need(r.title, 'title'); need(r.summary, 'summary');
  need(r.contact.email, 'contact.email'); need(r.contact.location, 'contact.location');
  need(r.contact.linkedin, 'contact.linkedin'); need(r.contact.portfolio, 'contact.portfolio');
  need(r.expertise.length, 'expertise'); need(r.languages.length, 'languages');
  need(r.education.length, 'education'); need(r.experience.length, 'experience');
  r.experience.forEach((e, i) => need(e.period && e.title && e.company && e.bullets.length, `experience[${i}]`));
  return missing;
}

/** files: { 'header.tex': string, ... } (all eight). Throws if any section is empty. */
export function buildResume(files, { includePhone = false, displayName, sourceBranch = 'main', updated } = {}) {
  const header = parseHeader(files['header.tex'] ?? '');
  const contact = parseContact(files['contact.tex'] ?? '');
  const resume = {
    fullName: header.fullName,
    displayName: displayName || deriveDisplayName(header.fullName),
    title: header.title,
    summary: parseAboutMe(files['aboutme.tex'] ?? ''),
    contact: {
      email: contact.email,
      location: contact.location,
      linkedin: contact.linkedin,
      portfolio: parsePortfolio(files['portfolio.tex'] ?? ''),
      ...(includePhone ? { phone: contact.phone } : {}),
    },
    expertise: parseExpertise(files['expertise.tex'] ?? ''),
    languages: parseLanguages(files['language.tex'] ?? ''),
    education: parseEducation(files['education.tex'] ?? ''),
    experience: parseExperience(files['experience.tex'] ?? ''),
    sourceBranch,
    updated: updated ?? new Date().toISOString().slice(0, 10),
  };
  const missing = validateResume(resume);
  if (missing.length) throw new Error(`Resume parse incomplete, empty sections: ${missing.join(', ')}`);
  return resume;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run scripts/tex-parse.test.mjs`
Expected: PASS, 14 tests. If a section assertion fails, print the parsed value with `console.log` in the test, compare with the fixture, and fix the parser (not the expectation) unless the fixture genuinely differs from what this plan quotes.

- [ ] **Step 6: Write the sync script**

`scripts/sync-resume.mjs`:

```js
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
```

- [ ] **Step 7: Run the sync and verify the outputs**

```bash
npm run sync-resume
node -e "const r=require('./src/data/resume.json'); console.log(Object.keys(r).join(','), '| phone:', r.contact.phone ?? 'none', '| jobs:', r.experience.length)"
ls -la public/resume
```

Expected: two `ok` lines; keys `fullName,displayName,title,summary,contact,expertise,languages,education,experience,sourceBranch,updated`; `phone: none`; `jobs: 4`; a PDF larger than 20 KB.

- [ ] **Step 8: Stage**

```bash
git add scripts/ tests/fixtures/ src/data/resume.json public/resume/resume-main.pdf
```

Suggested commit message: `feat: resume sync script parsing the LaTeX sources into resume.json`

---
### Task 3: Shell assets — own SVG icons, wallpaper, synthesized sounds

**Files:**
- Create: `src/xp/icons/index.js`, `src/xp/wallpaper.svg`
- Create: `src/xp/sounds.js`, `src/xp/sounds.test.js`

**Interfaces:**
- Produces: `icons` (object of SVG strings keyed by name), `iconEl(name, size = 32, className = '') → HTMLSpanElement`, `iconDataUri(name) → string` from `src/xp/icons/index.js`. Icon names used later: `ie, computer, documents, recycle, folder, txt, pdf, drive, floppy, cd, notepad, url, exe, mine, cards, pinball, help, run, controlpanel, mail, user, speaker, speakerMuted, shield, errorIcon, infoIcon, questionIcon, arrowLeft, arrowRight, arrowUp, stop, refresh, home, search, star, clock, power, logoff, flag`.
- Produces: `createSounds({ storage, AudioCtx }) → { available, play(name), unlock(), isMuted(), setMuted(bool), toggleMuted() }` and `safeStorage() → { get(k), set(k, v) }` from `src/xp/sounds.js`. Cue names: `startup, shutdown, click, error, balloon, menu, cardFlip, cardPlace, mineTick, mineBoom, win, flipper, bumper, target, drain`.

- [ ] **Step 1: Write the icon module**

`src/xp/icons/index.js`:

```js
// Our own XP-flavoured icons. Nothing here is copied from Microsoft artwork.
const svg = (body, viewBox = '0 0 32 32') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="100%">${body}</svg>`;

export const icons = {
  ie: svg('<circle cx="16" cy="16" r="13" fill="#2f7fe0"/><circle cx="16" cy="16" r="9" fill="none" stroke="#fff" stroke-width="3"/><path d="M8 16h16" stroke="#fff" stroke-width="3"/><path d="M4 22c8 6 20 2 26-8" fill="none" stroke="#f5c400" stroke-width="2.5"/>'),
  computer: svg('<rect x="3" y="4" width="20" height="15" rx="1.5" fill="#d7d3c8" stroke="#6b6b6b"/><rect x="5" y="6" width="16" height="11" fill="#2a5db0"/><rect x="9" y="20" width="8" height="2" fill="#8a8a8a"/><rect x="7" y="22" width="12" height="2" fill="#bdbdbd"/><rect x="24" y="8" width="6" height="18" fill="#e6e2d6" stroke="#6b6b6b"/><rect x="25.5" y="10" width="3" height="1.5" fill="#444"/><circle cx="27" cy="23" r="1" fill="#3fbf3f"/>'),
  documents: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><rect x="9" y="4" width="12" height="15" fill="#fff" stroke="#8a8a8a"/><path d="M11 8h8M11 11h8M11 14h6" stroke="#9aa" stroke-width="1"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/>'),
  recycle: svg('<path d="M8 8h16l-2 20H10z" fill="#cfd8e3" stroke="#6a7c8f"/><path d="M12 10v16M16 10v16M20 10v16" stroke="#8fa3b8"/><rect x="6" y="5" width="20" height="3" fill="#b9c6d4" stroke="#6a7c8f"/><path d="M13 5l1-2h4l1 2" fill="none" stroke="#6a7c8f"/>'),
  folder: svg('<path d="M2 8h10l3 3h15v16H2z" fill="#f2c94c" stroke="#b58a12"/><path d="M2 13h28v14H2z" fill="#f7d774" stroke="#b58a12"/>'),
  txt: svg('<path d="M7 2h13l6 6v22H7z" fill="#fff" stroke="#7a7a7a"/><path d="M20 2v6h6" fill="#e0e0e0" stroke="#7a7a7a"/><path d="M10 12h12M10 16h12M10 20h12M10 24h8" stroke="#666" stroke-width="1.2"/>'),
  pdf: svg('<path d="M7 2h13l6 6v22H7z" fill="#fff" stroke="#7a7a7a"/><path d="M20 2v6h6" fill="#e0e0e0" stroke="#7a7a7a"/><rect x="9" y="14" width="14" height="10" fill="#d33"/><text x="16" y="22" font-size="7" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">PDF</text>'),
  drive: svg('<rect x="3" y="10" width="26" height="12" rx="1" fill="#d9d9d9" stroke="#6b6b6b"/><rect x="5" y="12" width="18" height="8" fill="#a9a9a9"/><circle cx="26" cy="16" r="1.2" fill="#3fbf3f"/>'),
  floppy: svg('<rect x="4" y="4" width="24" height="24" rx="1" fill="#2b2b2b"/><rect x="9" y="4" width="14" height="9" fill="#cfcfcf"/><rect x="12" y="6" width="4" height="5" fill="#2b2b2b"/><rect x="8" y="18" width="16" height="10" fill="#e8e8e8"/>'),
  cd: svg('<circle cx="16" cy="16" r="13" fill="#d8e6f3" stroke="#7a8fa6"/><circle cx="16" cy="16" r="4" fill="#fff" stroke="#7a8fa6"/><path d="M6 12a11 11 0 0 1 8-7" fill="none" stroke="#fff" stroke-width="2"/>'),
  notepad: svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#7a7a7a"/><rect x="6" y="3" width="20" height="5" fill="#3a7bd5"/><path d="M10 13h12M10 17h12M10 21h9" stroke="#666" stroke-width="1.2"/>'),
  url: svg('<rect x="6" y="3" width="20" height="26" fill="#fff" stroke="#7a7a7a"/><circle cx="16" cy="16" r="7" fill="#2f7fe0"/><path d="M9 16h14M16 9v14" stroke="#fff"/>'),
  exe: svg('<rect x="4" y="6" width="24" height="20" rx="2" fill="#e9e9e9" stroke="#6b6b6b"/><rect x="6" y="8" width="20" height="4" fill="#2a5db0"/><path d="M10 17h5v5h-5zM17 17h5v5h-5z" fill="#7aa9ee"/>'),
  mine: svg('<circle cx="16" cy="17" r="8" fill="#222"/><path d="M16 5v24M4 17h24M8 9l16 16M24 9L8 25" stroke="#222" stroke-width="2"/><circle cx="13" cy="14" r="2" fill="#fff"/>'),
  cards: svg('<rect x="5" y="8" width="14" height="19" rx="1.5" fill="#fff" stroke="#555" transform="rotate(-10 12 17)"/><rect x="13" y="6" width="14" height="19" rx="1.5" fill="#fff" stroke="#555" transform="rotate(8 20 15)"/><path d="M20 12l3 4-3 4-3-4z" fill="#d22"/>'),
  pinball: svg('<rect x="6" y="2" width="20" height="28" rx="6" fill="#1b1f3a" stroke="#6ee7ff"/><circle cx="16" cy="12" r="3" fill="#ff4fd8"/><circle cx="11" cy="18" r="2" fill="#6ee7ff"/><circle cx="21" cy="18" r="2" fill="#6ee7ff"/><circle cx="16" cy="25" r="1.8" fill="#eee"/>'),
  help: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5"/><text x="16" y="22" font-size="17" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">?</text>'),
  run: svg('<rect x="4" y="8" width="24" height="16" rx="2" fill="#fff" stroke="#6b6b6b"/><path d="M8 13h12M8 17h8" stroke="#666" stroke-width="1.5"/><path d="M22 16l4 3-4 3z" fill="#3a7bd5"/>'),
  controlpanel: svg('<rect x="4" y="6" width="24" height="20" rx="2" fill="#e9e9e9" stroke="#6b6b6b"/><circle cx="11" cy="14" r="3" fill="#3a7bd5"/><circle cx="21" cy="14" r="3" fill="#e0a020"/><rect x="8" y="20" width="16" height="3" fill="#9c9c9c"/>'),
  mail: svg('<rect x="3" y="8" width="26" height="17" fill="#fff" stroke="#6b6b6b"/><path d="M3 8l13 10 13-10" fill="none" stroke="#6b6b6b"/>'),
  user: svg('<circle cx="16" cy="11" r="6" fill="#f0c27b"/><path d="M4 30c1-8 6-11 12-11s11 3 12 11z" fill="#3a7bd5"/>'),
  speaker: svg('<path d="M6 12h6l6-5v18l-6-5H6z" fill="#555"/><path d="M21 11c3 3 3 7 0 10M24 8c5 5 5 11 0 16" fill="none" stroke="#555" stroke-width="2"/>'),
  speakerMuted: svg('<path d="M6 12h6l6-5v18l-6-5H6z" fill="#555"/><path d="M21 12l8 8M29 12l-8 8" stroke="#c33" stroke-width="2.5"/>'),
  shield: svg('<path d="M16 3l11 4v9c0 7-5 12-11 14C10 28 5 23 5 16V7z" fill="#e33" stroke="#900"/><text x="16" y="22" font-size="14" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">!</text>'),
  errorIcon: svg('<circle cx="16" cy="16" r="13" fill="#d33" stroke="#900"/><path d="M10 10l12 12M22 10L10 22" stroke="#fff" stroke-width="3"/>'),
  infoIcon: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5" stroke="#1b4f9c"/><path d="M16 13v10M16 9v1.5" stroke="#fff" stroke-width="3"/>'),
  questionIcon: svg('<circle cx="16" cy="16" r="13" fill="#3a7bd5" stroke="#1b4f9c"/><text x="16" y="22" font-size="17" font-family="Arial" font-weight="bold" fill="#fff" text-anchor="middle">?</text>'),
  arrowLeft: svg('<path d="M20 6L10 16l10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  arrowRight: svg('<path d="M12 6l10 10-10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  arrowUp: svg('<path d="M6 20l10-10 10 10" fill="none" stroke="#2a7a2a" stroke-width="4"/>'),
  stop: svg('<circle cx="16" cy="16" r="12" fill="#d33"/><path d="M10 10l12 12M22 10L10 22" stroke="#fff" stroke-width="3"/>'),
  refresh: svg('<path d="M25 14a10 10 0 1 0 2 8" fill="none" stroke="#2a7a2a" stroke-width="3"/><path d="M26 6v8h-8" fill="none" stroke="#2a7a2a" stroke-width="3"/>'),
  home: svg('<path d="M4 16L16 5l12 11" fill="none" stroke="#555" stroke-width="3"/><path d="M8 15v12h16V15" fill="#f5deb3" stroke="#555"/>'),
  search: svg('<circle cx="14" cy="14" r="8" fill="none" stroke="#3a7bd5" stroke-width="3"/><path d="M20 20l8 8" stroke="#3a7bd5" stroke-width="3"/>'),
  star: svg('<path d="M16 3l4 9 9 1-7 6 2 10-8-5-8 5 2-10-7-6 9-1z" fill="#f5c400" stroke="#b58a12"/>'),
  clock: svg('<circle cx="16" cy="16" r="12" fill="#fff" stroke="#555"/><path d="M16 9v7l5 3" fill="none" stroke="#555" stroke-width="2"/>'),
  power: svg('<circle cx="16" cy="16" r="11" fill="#d33"/><path d="M16 9v7" stroke="#fff" stroke-width="3"/><path d="M11 12a7 7 0 1 0 10 0" fill="none" stroke="#fff" stroke-width="3"/>'),
  logoff: svg('<circle cx="16" cy="16" r="11" fill="#e0a020"/><path d="M12 16h8M17 12l4 4-4 4" fill="none" stroke="#fff" stroke-width="3"/>'),
  flag: svg('<path d="M8 4v24" stroke="#555" stroke-width="2"/><path d="M9 5h14l-3 5 3 5H9z" fill="#d33"/>'),
};

/** Inline SVG wrapped in a span sized `size` px. Unknown names fall back to the exe icon. */
export function iconEl(name, size = 32, className = '') {
  const span = document.createElement('span');
  span.className = `xp-ico ${className}`.trim();
  span.style.width = `${size}px`;
  span.style.height = `${size}px`;
  span.innerHTML = icons[name] ?? icons.exe;
  return span;
}

export function iconDataUri(name) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(icons[name] ?? icons.exe)}`;
}
```

- [ ] **Step 2: Write the wallpaper**

`src/xp/wallpaper.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 768" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a63c9"/><stop offset="0.6" stop-color="#7fb6ef"/><stop offset="1" stop-color="#cfe6fb"/>
    </linearGradient>
    <linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd14f"/><stop offset="1" stop-color="#3f8f1f"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="768" fill="url(#sky)"/>
  <g fill="#fff" opacity="0.85">
    <ellipse cx="220" cy="150" rx="90" ry="30"/><ellipse cx="270" cy="130" rx="60" ry="28"/>
    <ellipse cx="760" cy="200" rx="110" ry="32"/><ellipse cx="820" cy="180" rx="70" ry="30"/>
  </g>
  <path d="M0 520 C 200 420, 380 470, 560 430 C 740 390, 900 460, 1024 400 L 1024 768 L 0 768 Z" fill="url(#hill)"/>
  <path d="M0 620 C 250 560, 520 640, 1024 560 L 1024 768 L 0 768 Z" fill="#3a8a1e" opacity="0.9"/>
</svg>
```

- [ ] **Step 3: Write the failing sounds test**

`src/xp/sounds.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createSounds } from './sounds.js';

const memStorage = () => { const m = new Map(); return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v), m }; };

class FakeCtx {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 44100; this.oscillators = 0; }
  createOscillator() {
    this.oscillators++;
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
    return { type: '', frequency: param, connect: () => ({ connect() {} }), start() {}, stop() {} };
  }
  createGain() {
    const param = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return { gain: param, connect: () => ({ connect() {} }) };
  }
  createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
  createBufferSource() { return { buffer: null, connect: () => ({ connect() {} }), start() {} }; }
  resume() { return Promise.resolve(); }
}

describe('createSounds', () => {
  it('is silent and safe without an AudioContext', () => {
    const s = createSounds({ storage: memStorage(), AudioCtx: undefined });
    expect(s.available).toBe(false);
    expect(() => s.play('startup')).not.toThrow();
  });
  it('persists the mute state', () => {
    const storage = memStorage();
    const s = createSounds({ storage, AudioCtx: FakeCtx });
    expect(s.isMuted()).toBe(false);
    s.setMuted(true);
    expect(storage.get('xpcomputer.muted')).toBe('1');
    expect(createSounds({ storage, AudioCtx: FakeCtx }).isMuted()).toBe(true);
    expect(s.toggleMuted()).toBe(false);
  });
  it('schedules oscillators for a cue and nothing while muted', () => {
    let ctx;
    class Recording extends FakeCtx { constructor() { super(); ctx = this; } }
    const s = createSounds({ storage: memStorage(), AudioCtx: Recording });
    s.play('startup');
    expect(ctx.oscillators).toBe(4);
    s.setMuted(true);
    s.play('startup');
    expect(ctx.oscillators).toBe(4);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npx vitest run src/xp/sounds.test.js`
Expected: FAIL — cannot resolve `./sounds.js`.

- [ ] **Step 5: Implement sounds.js**

`src/xp/sounds.js`:

```js
// Every cue is synthesized with WebAudio. No sample files, nothing recorded from Windows.
const KEY = 'xpcomputer.muted';

// [frequencyHz, startOffsetSec, durationSec, oscillatorType?, gain?, slideToHz?]
const CUES = {
  startup: [[523.25, 0, 0.35], [659.25, 0.12, 0.35], [783.99, 0.24, 0.45], [1046.5, 0.4, 0.7]],
  shutdown: [[783.99, 0, 0.3], [659.25, 0.15, 0.3], [523.25, 0.3, 0.3], [392, 0.45, 0.6]],
  click: [[1200, 0, 0.03, 'square', 0.15]],
  error: [[440, 0, 0.18, 'square', 0.25], [330, 0.18, 0.3, 'square', 0.25]],
  balloon: [[880, 0, 0.08], [1320, 0.08, 0.15]],
  menu: [[600, 0, 0.04, 'triangle', 0.12]],
  cardFlip: [[900, 0, 0.03, 'triangle', 0.15], [1400, 0.03, 0.04, 'triangle', 0.1]],
  cardPlace: [[300, 0, 0.05, 'triangle', 0.2]],
  mineTick: [[1000, 0, 0.02, 'square', 0.1]],
  win: [[523.25, 0, 0.15], [659.25, 0.15, 0.15], [783.99, 0.3, 0.15], [1046.5, 0.45, 0.5]],
  flipper: [[180, 0, 0.05, 'square', 0.2]],
  bumper: [[700, 0, 0.06, 'square', 0.25], [1050, 0.03, 0.08, 'square', 0.2]],
  target: [[1500, 0, 0.08, 'triangle', 0.2]],
  drain: [[400, 0, 0.4, 'sawtooth', 0.2, 80]],
};

export function safeStorage() {
  return {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };
}

export function createSounds({ storage = safeStorage(), AudioCtx = globalThis.AudioContext } = {}) {
  const available = typeof AudioCtx === 'function';
  let ctx = null;
  let muted = storage.get(KEY) === '1';

  function unlock() {
    if (!available || ctx) return;
    try { ctx = new AudioCtx(); } catch { ctx = null; }
  }

  function tone(freq, at, dur, type = 'sine', gain = 0.2, slideTo) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(at, dur, gain) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(amp).connect(ctx.destination);
    src.start(ctx.currentTime + at);
  }

  function play(name) {
    if (muted || !available) return;
    unlock();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (name === 'mineBoom') { noise(0, 0.4, 0.4); tone(90, 0, 0.35, 'sawtooth', 0.3, 40); return; }
    for (const [freq, at, dur, type, gain, slideTo] of CUES[name] ?? []) tone(freq, at, dur, type, gain, slideTo);
  }

  const api = {
    available,
    play,
    unlock,
    isMuted: () => muted,
    setMuted(value) { muted = Boolean(value); storage.set(KEY, muted ? '1' : '0'); },
    toggleMuted() { api.setMuted(!muted); return muted; },
  };
  return api;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npx vitest run src/xp/sounds.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 7: Stage**

```bash
git add src/xp/icons src/xp/wallpaper.svg src/xp/sounds.js src/xp/sounds.test.js
```

Suggested commit message: `feat: own XP-style icons, wallpaper and synthesized sound cues`

---
### Task 4: Window manager

**Files:**
- Create: `src/xp/WindowManager.js`, `src/xp/WindowManager.test.js`
- Create: `src/styles/xp-overrides.css` (window section; later tasks append)

**Interfaces:**
- Consumes: `iconEl(name, size, className)` from Task 3.
- Produces: `DESKTOP_WIDTH = 1024`, `DESKTOP_HEIGHT = 768`, `TASKBAR_HEIGHT = 30`, `clampPosition(x, y, w, h, deskW, deskH, keep = 40) → {x, y}`, and `createWindowManager(layerEl, { deskW, deskH, cascadeStep }) → wm`.
- `wm.open({ appId, title, icon?, width?, height?, minWidth?, minHeight?, resizable?, dialog?, content?: string|HTMLElement, onClose?(win), x?, y? }) → win`
- `win = { id, appId, title, icon, el, contentEl, bounds: {x,y,w,h}, isMinimized, isMaximized, isDialog, isFocused, focus(), minimize(), restore(), maximize(), toggleMaximize(), close(), setTitle(text) }`
- `wm.on(event, fn) → unsubscribe` for events `open, focus, minimize, restore, maximize, unmaximize, close, title`; `wm.windows` (array copy), `wm.focused`, `wm.blur()`, `wm.closeAll()`, `wm.find(appId) → win[]`, `wm.deskW`, `wm.deskH`.

- [ ] **Step 1: Confirm the XP.css class names this task relies on**

```bash
grep -c "title-bar-controls" node_modules/xp.css/dist/XP.css
grep -o "\.window-body[^{]*{[^}]*}" node_modules/xp.css/dist/XP.css | head -3
```

Expected: first count ≥ 1. Note any `margin`/`padding` on `.window-body` and `.window`; the CSS in Step 5 zeroes the body margin so app content fills the frame.

- [ ] **Step 2: Write the failing tests**

`src/xp/WindowManager.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createWindowManager, clampPosition } from './WindowManager.js';

describe('clampPosition', () => {
  it('keeps 40px of the window inside the desktop', () => {
    expect(clampPosition(-500, -10, 300, 200, 1024, 738)).toEqual({ x: -260, y: 0 });
    expect(clampPosition(2000, 2000, 300, 200, 1024, 738)).toEqual({ x: 984, y: 698 });
    expect(clampPosition(100, 100, 300, 200, 1024, 738)).toEqual({ x: 100, y: 100 });
  });
});

describe('createWindowManager', () => {
  let layer, wm, events;
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div>';
    layer = document.querySelector('#layer');
    wm = createWindowManager(layer);
    events = [];
    for (const ev of ['open', 'focus', 'minimize', 'restore', 'maximize', 'unmaximize', 'close']) wm.on(ev, (w) => events.push(`${ev}:${w.title}`));
  });

  it('opens a window with XP.css chrome and focuses it', () => {
    const win = wm.open({ appId: 'notepad', title: 'Untitled - Notepad', content: '<p>hi</p>' });
    expect(layer.querySelector('.window .title-bar-text').textContent).toContain('Untitled - Notepad');
    expect(win.contentEl.innerHTML).toBe('<p>hi</p>');
    expect(win.isFocused).toBe(true);
    expect(events).toEqual(['open:Untitled - Notepad', 'focus:Untitled - Notepad']);
  });

  it('raises focused windows above others and cascades positions', () => {
    const a = wm.open({ appId: 'a', title: 'A' });
    const b = wm.open({ appId: 'b', title: 'B' });
    expect(Number(b.el.style.zIndex)).toBeGreaterThan(Number(a.el.style.zIndex));
    expect(b.bounds.x - a.bounds.x).toBe(24);
    a.focus();
    expect(Number(a.el.style.zIndex)).toBeGreaterThan(Number(b.el.style.zIndex));
    expect(wm.focused).toBe(a);
  });

  it('minimizes, restores and refocuses', () => {
    const a = wm.open({ appId: 'a', title: 'A' });
    const b = wm.open({ appId: 'b', title: 'B' });
    b.minimize();
    expect(b.el.hidden).toBe(true);
    expect(wm.focused).toBe(a);
    b.restore();
    expect(b.el.hidden).toBe(false);
    expect(wm.focused).toBe(b);
    expect(events).toContain('minimize:B');
    expect(events).toContain('restore:B');
  });

  it('maximizes to the desktop area and restores the old bounds', () => {
    const a = wm.open({ appId: 'a', title: 'A', width: 300, height: 200 });
    const before = { ...a.bounds };
    a.maximize();
    expect(a.isMaximized).toBe(true);
    expect(a.el.style.width).toBe('1024px');
    expect(a.el.style.height).toBe('738px');
    a.toggleMaximize();
    expect(a.isMaximized).toBe(false);
    expect(a.bounds).toEqual(before);
    expect(events).toContain('maximize:A');
    expect(events).toContain('unmaximize:A');
  });

  it('closes, removes the element, calls onClose and remembers bounds per app', () => {
    let closed = 0;
    const a = wm.open({ appId: 'ie', title: 'IE', width: 640, height: 480, x: 100, y: 50, onClose: () => closed++ });
    a.el.querySelector('[aria-label="Close"]').click();
    expect(layer.children.length).toBe(0);
    expect(closed).toBe(1);
    expect(wm.windows).toHaveLength(0);
    const again = wm.open({ appId: 'ie', title: 'IE' });
    expect(again.bounds).toMatchObject({ x: 100, y: 50, w: 640, h: 480 });
  });

  it('drags by the title bar and clamps to the desktop', () => {
    const a = wm.open({ appId: 'a', title: 'A', width: 300, height: 200, x: 100, y: 100 });
    const bar = a.el.querySelector('.title-bar');
    bar.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 150, clientY: 110, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 250, clientY: 160 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(a.bounds).toMatchObject({ x: 200, y: 150 });
    bar.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 250, clientY: 160, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: -5000, clientY: -5000 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(a.bounds).toMatchObject({ x: -260, y: 0 });
  });

  it('resizes from the corner handle within min size and desktop bounds', () => {
    const a = wm.open({ appId: 'a', title: 'A', width: 300, height: 200, x: 100, y: 100, minWidth: 200, minHeight: 120 });
    const handle = a.el.querySelector('.xp-resize-handle');
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 400, clientY: 300, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 500, clientY: 320 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(a.bounds).toMatchObject({ w: 400, h: 220 });
    handle.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 320, button: 0 }));
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: -5000, clientY: 5000 }));
    document.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    expect(a.bounds).toMatchObject({ w: 200, h: 638 });
  });

  it('dialogs have no minimize/maximize controls and are not remembered', () => {
    const d = wm.open({ appId: 'dialog', title: 'Error', dialog: true });
    expect(d.el.querySelector('[aria-label="Minimize"]')).toBeNull();
    expect(d.el.querySelector('[aria-label="Maximize"]')).toBeNull();
    expect(d.el.querySelector('.xp-resize-handle')).toBeNull();
    d.setTitle('Warning');
    expect(d.el.querySelector('.title-bar-text').textContent).toContain('Warning');
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/xp/WindowManager.test.js`
Expected: FAIL — cannot resolve `./WindowManager.js`.

- [ ] **Step 4: Implement WindowManager.js**

`src/xp/WindowManager.js`:

```js
import { iconEl } from './icons/index.js';

export const DESKTOP_WIDTH = 1024;
export const DESKTOP_HEIGHT = 768;
export const TASKBAR_HEIGHT = 30;

/** Keep at least `keep` px of a window inside the desktop. Pure. */
export function clampPosition(x, y, w, h, deskW, deskH, keep = 40) {
  const minX = -(w - keep);
  const maxX = deskW - keep;
  const maxY = deskH - keep;
  return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, 0), maxY) };
}

let idSeq = 0;

export function createWindowManager(layerEl, { deskW = DESKTOP_WIDTH, deskH = DESKTOP_HEIGHT - TASKBAR_HEIGHT, cascadeStep = 24 } = {}) {
  const windows = [];
  const listeners = new Map();
  const memory = new Map(); // appId -> last bounds
  let zTop = 10;
  let cascade = 0;
  let focused = null;

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  }
  const emit = (event, win) => { for (const fn of listeners.get(event) ?? []) fn(win); };

  /** Pointer deltas arrive in viewport px; the desktop may be CSS-scaled. */
  function scale() {
    const rect = layerEl.getBoundingClientRect();
    return rect.width > 0 ? rect.width / deskW : 1;
  }
  function topVisible(except) {
    return windows.filter((w) => w !== except && !w.isMinimized).sort((a, b) => b.z - a.z)[0] ?? null;
  }
  function setFocused(win) {
    if (focused === win) return;
    focused?.el.classList.remove('xp-active');
    focused = win;
    if (!win) return;
    win.el.classList.add('xp-active');
    win.z = ++zTop;
    win.el.style.zIndex = String(win.z);
    emit('focus', win);
  }
  function applyBounds(win, b) {
    win.bounds = { x: b.x, y: b.y, w: b.w, h: b.h };
    Object.assign(win.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
  }
  function trackPointer(onMove) {
    const up = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function open(opts) {
    const {
      appId, title, icon = 'exe', width = 500, height = 380, minWidth = 200, minHeight = 120,
      resizable = true, dialog = false, content, onClose, x, y,
    } = opts;
    const remembered = dialog ? null : memory.get(appId);
    const w = remembered?.w ?? width;
    const h = remembered?.h ?? height;
    let px = x ?? remembered?.x;
    let py = y ?? remembered?.y;
    if (px === undefined || py === undefined) {
      px = 60 + cascade * cascadeStep;
      py = 40 + cascade * cascadeStep;
      cascade = (cascade + 1) % 8;
    }
    ({ x: px, y: py } = clampPosition(px, py, w, h, deskW, deskH));

    const el = document.createElement('div');
    el.className = `window xp-window${dialog ? ' xp-dialog' : ''}`;
    el.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text"></div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="window-body xp-window-body"></div>
      <div class="xp-resize-handle"></div>`;
    const titleText = document.createTextNode(title);
    el.querySelector('.title-bar-text').append(iconEl(icon, 16, 'xp-title-icon'), titleText);
    const contentEl = el.querySelector('.xp-window-body');
    if (typeof content === 'string') contentEl.innerHTML = content;
    else if (content) contentEl.append(content);
    if (dialog) {
      el.querySelector('[aria-label="Minimize"]').remove();
      el.querySelector('[aria-label="Maximize"]').remove();
      el.querySelector('.xp-resize-handle').remove();
    } else if (!resizable) {
      el.querySelector('[aria-label="Maximize"]').disabled = true;
      el.querySelector('.xp-resize-handle').remove();
    }

    const win = {
      id: `win-${++idSeq}`, appId, title, icon, el, contentEl, z: 0,
      bounds: { x: px, y: py, w, h }, savedBounds: null,
      isMinimized: false, isMaximized: false, isDialog: dialog,
      get isFocused() { return focused === win; },
      focus() { if (win.isMinimized) win.restore(); else setFocused(win); },
      minimize() {
        if (win.isMinimized || dialog) return;
        win.isMinimized = true;
        el.hidden = true;
        if (focused === win) { focused = null; el.classList.remove('xp-active'); setFocused(topVisible(win)); }
        emit('minimize', win);
      },
      restore() {
        if (!win.isMinimized) return;
        win.isMinimized = false;
        el.hidden = false;
        setFocused(win);
        emit('restore', win);
      },
      maximize() {
        if (win.isMaximized || dialog || !resizable) return;
        win.savedBounds = { ...win.bounds };
        win.isMaximized = true;
        el.classList.add('xp-maximized');
        applyBounds(win, { x: 0, y: 0, w: deskW, h: deskH });
        emit('maximize', win);
      },
      toggleMaximize() {
        if (!win.isMaximized) { win.maximize(); return; }
        win.isMaximized = false;
        el.classList.remove('xp-maximized');
        applyBounds(win, win.savedBounds);
        emit('unmaximize', win);
      },
      close() {
        const idx = windows.indexOf(win);
        if (idx < 0) return;
        windows.splice(idx, 1);
        if (!dialog) memory.set(appId, { ...(win.isMaximized ? win.savedBounds : win.bounds) });
        el.remove();
        if (focused === win) { focused = null; setFocused(topVisible()); }
        onClose?.(win);
        emit('close', win);
      },
      setTitle(text) { win.title = text; titleText.data = text; emit('title', win); },
    };

    const titleBar = el.querySelector('.title-bar');
    titleBar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.title-bar-controls') || win.isMaximized) return;
      e.preventDefault();
      const s = scale();
      const start = { x: e.clientX, y: e.clientY, bx: win.bounds.x, by: win.bounds.y };
      trackPointer((ev) => {
        const c = clampPosition(start.bx + (ev.clientX - start.x) / s, start.by + (ev.clientY - start.y) / s, win.bounds.w, win.bounds.h, deskW, deskH);
        applyBounds(win, { ...win.bounds, x: c.x, y: c.y });
      });
    });
    titleBar.addEventListener('dblclick', (e) => { if (!e.target.closest('.title-bar-controls')) win.toggleMaximize(); });
    el.querySelector('.xp-resize-handle')?.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const s = scale();
      const start = { x: e.clientX, y: e.clientY, w: win.bounds.w, h: win.bounds.h };
      trackPointer((ev) => {
        const nw = Math.max(minWidth, Math.min(start.w + (ev.clientX - start.x) / s, deskW - win.bounds.x));
        const nh = Math.max(minHeight, Math.min(start.h + (ev.clientY - start.y) / s, deskH - win.bounds.y));
        applyBounds(win, { ...win.bounds, w: nw, h: nh });
      });
    });
    el.querySelector('[aria-label="Close"]').addEventListener('click', () => win.close());
    el.querySelector('[aria-label="Minimize"]')?.addEventListener('click', () => win.minimize());
    el.querySelector('[aria-label="Maximize"]')?.addEventListener('click', () => win.toggleMaximize());
    el.addEventListener('pointerdown', () => setFocused(win), true);

    applyBounds(win, win.bounds);
    windows.push(win);
    layerEl.append(el);
    emit('open', win);
    setFocused(win);
    return win;
  }

  return {
    open,
    on,
    get windows() { return [...windows]; },
    get focused() { return focused; },
    blur() { focused?.el.classList.remove('xp-active'); focused = null; },
    closeAll() { [...windows].forEach((w) => w.close()); },
    find(appId) { return windows.filter((w) => w.appId === appId); },
    deskW,
    deskH,
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/xp/WindowManager.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 6: Create the override stylesheet with the window section**

`src/styles/xp-overrides.css`:

```css
/* Shell styling layered over XP.css. Sections are appended per task. */

/* ---- Icons ---- */
.xp-ico { display: inline-block; vertical-align: middle; line-height: 0; flex: none; }
.xp-ico svg { width: 100%; height: 100%; display: block; }

/* ---- Windows ---- */
.xp-window { position: absolute; display: flex; flex-direction: column; box-sizing: border-box; }
.xp-window .title-bar { cursor: default; user-select: none; -webkit-user-select: none; }
.xp-window .title-bar-text { display: flex; align-items: center; gap: 5px; overflow: hidden; white-space: nowrap; }
.xp-window .xp-window-body { flex: 1; min-height: 0; margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden; background: #ece9d8; }
.xp-window:not(.xp-active) .title-bar { filter: saturate(0.35) brightness(1.15); }
.xp-window:not(.xp-active) .title-bar-text { color: #d8d2bd; }
.xp-resize-handle { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; }
.xp-maximized, .xp-maximized .title-bar { border-radius: 0 !important; }
.xp-inert { pointer-events: none; }
.xp-inert .title-bar { filter: saturate(0.35) brightness(1.15); }
```

- [ ] **Step 7: Stage**

```bash
git add src/xp/WindowManager.js src/xp/WindowManager.test.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: window manager with drag, resize, minimize, maximize and z-order`

---
### Task 5: Dialogs (message boxes and Run)

**Files:**
- Create: `src/xp/Dialog.js`, `src/xp/Dialog.test.js`
- Modify: `src/styles/xp-overrides.css` (append dialog section)

**Interfaces:**
- Consumes: `wm` from Task 4, `iconEl` from Task 3, `sounds` from Task 3.
- Produces: `createDialogs(wm, { sounds }) → dialogs` with `dialogs.message({ title?, text, kind?: 'error'|'info'|'question'|'warning', buttons?: string[], owner?: win, defaultButton?: number }) → Promise<string>` (resolves with the clicked label; closing via the title bar resolves `'Cancel'` if present, else the last button) and `dialogs.run({ onRun(command) }) → win`.

- [ ] **Step 1: Write the failing tests**

`src/xp/Dialog.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createWindowManager } from './WindowManager.js';
import { createDialogs } from './Dialog.js';

describe('dialogs', () => {
  let wm, dialogs, played;
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div>';
    wm = createWindowManager(document.querySelector('#layer'));
    played = [];
    dialogs = createDialogs(wm, { sounds: { play: (n) => played.push(n) } });
  });

  it('resolves with the clicked button and blocks the owner while open', async () => {
    const owner = wm.open({ appId: 'a', title: 'A' });
    const p = dialogs.message({ title: 'Error', text: 'Boom', kind: 'error', buttons: ['Retry', 'Cancel'], owner });
    expect(owner.el.classList.contains('xp-inert')).toBe(true);
    const dlg = wm.windows.find((w) => w.appId === 'dialog');
    expect(dlg.isDialog).toBe(true);
    expect(dlg.el.querySelector('.title-bar-text').textContent).toContain('Error');
    expect(dlg.el.querySelector('.xp-msgbox-text').textContent).toBe('Boom');
    dlg.el.querySelector('button[data-result="Retry"]').click();
    await expect(p).resolves.toBe('Retry');
    expect(owner.el.classList.contains('xp-inert')).toBe(false);
    expect(played).toContain('error');
  });

  it('resolves Cancel when closed from the title bar', async () => {
    const p = dialogs.message({ text: 'x', buttons: ['OK', 'Cancel'] });
    wm.windows[0].el.querySelector('[aria-label="Close"]').click();
    await expect(p).resolves.toBe('Cancel');
  });

  it('runs the typed command from the Run dialog', () => {
    const ran = [];
    const win = dialogs.run({ onRun: (c) => ran.push(c) });
    const input = win.el.querySelector('input');
    input.value = '  winmine ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(ran).toEqual(['winmine']);
    expect(wm.windows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/xp/Dialog.test.js`
Expected: FAIL — cannot resolve `./Dialog.js`.

- [ ] **Step 3: Implement Dialog.js**

`src/xp/Dialog.js`:

```js
import { iconEl } from './icons/index.js';

const KIND_ICON = { error: 'errorIcon', info: 'infoIcon', question: 'questionIcon', warning: 'shield' };

export function createDialogs(wm, { sounds } = {}) {
  function centerOn(owner, w, h) {
    const box = owner ? owner.bounds : { x: 0, y: 0, w: wm.deskW, h: wm.deskH };
    return { x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2) };
  }

  function message({ title = 'Windows', text = '', kind = 'info', buttons = ['OK'], owner = null, defaultButton = 0 } = {}) {
    return new Promise((resolve) => {
      const body = document.createElement('div');
      body.className = 'xp-msgbox';
      const row = document.createElement('div');
      row.className = 'xp-msgbox-row';
      const textEl = document.createElement('div');
      textEl.className = 'xp-msgbox-text';
      textEl.textContent = text;
      row.append(iconEl(KIND_ICON[kind] ?? 'infoIcon', 32), textEl);
      const buttonRow = document.createElement('div');
      buttonRow.className = 'xp-msgbox-buttons';
      body.append(row, buttonRow);

      let result = null;
      let win = null;
      const fallback = buttons.includes('Cancel') ? 'Cancel' : buttons[buttons.length - 1];
      buttons.forEach((label, i) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.dataset.result = label;
        if (i === defaultButton) b.classList.add('default');
        b.addEventListener('click', () => { result = label; win.close(); });
        buttonRow.append(b);
      });
      body.addEventListener('keydown', (e) => { if (e.key === 'Escape') { result = fallback; win.close(); } });

      const w = 380;
      const h = Math.min(420, 120 + Math.ceil(text.length / 48) * 16);
      owner?.el.classList.add('xp-inert');
      sounds?.play(kind === 'error' ? 'error' : 'balloon');
      win = wm.open({
        appId: 'dialog', title, icon: KIND_ICON[kind] ?? 'infoIcon', dialog: true, width: w, height: h, ...centerOn(owner, w, h), content: body,
        onClose: () => { owner?.el.classList.remove('xp-inert'); resolve(result ?? fallback); },
      });
      body.querySelector('button.default')?.focus();
    });
  }

  function run({ onRun }) {
    const body = document.createElement('div');
    body.className = 'xp-msgbox xp-rundlg';
    body.innerHTML = `
      <div class="xp-msgbox-row"><span class="xp-run-icon"></span>
        <div class="xp-msgbox-text">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div></div>
      <div class="xp-run-field"><label for="xp-run-input">Open:</label><input id="xp-run-input" type="text" autocomplete="off" spellcheck="false"></div>
      <div class="xp-msgbox-buttons"><button data-result="OK" class="default">OK</button><button data-result="Cancel">Cancel</button></div>`;
    body.querySelector('.xp-run-icon').append(iconEl('run', 32));
    const w = 400, h = 180;
    const win = wm.open({ appId: 'run', title: 'Run', icon: 'run', dialog: true, width: w, height: h, x: 0, y: wm.deskH - h, content: body });
    const input = body.querySelector('input');
    const submit = () => { const command = input.value.trim(); win.close(); if (command) onRun(command); };
    body.querySelector('[data-result="OK"]').addEventListener('click', submit);
    body.querySelector('[data-result="Cancel"]').addEventListener('click', () => win.close());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') win.close();
    });
    setTimeout(() => input.focus(), 0);
    return win;
  }

  return { message, run };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/xp/Dialog.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Append the dialog styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Dialogs ---- */
.xp-msgbox { display: flex; flex-direction: column; gap: 12px; padding: 14px 12px 10px; flex: 1; font-size: 11px; }
.xp-msgbox-row { display: flex; gap: 12px; align-items: flex-start; }
.xp-msgbox-text { flex: 1; line-height: 1.45; white-space: pre-line; }
.xp-msgbox-buttons { display: flex; justify-content: center; gap: 6px; margin-top: auto; }
.xp-msgbox-buttons button { min-width: 75px; }
.xp-rundlg .xp-msgbox-buttons { justify-content: flex-end; }
.xp-run-field { display: flex; gap: 8px; align-items: center; }
.xp-run-field input { flex: 1; }
```

- [ ] **Step 6: Stage**

```bash
git add src/xp/Dialog.js src/xp/Dialog.test.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: XP message boxes and Run dialog`

---

### Task 6: App registry and fake file system

**Files:**
- Create: `src/xp/apps/registry.js`, `src/xp/apps/registry.test.js`
- Create: `src/data/filesystem.js`, `src/data/filesystem.test.js`

**Interfaces:**
- Produces: `createRegistry(ctx) → registry` with `register(id, { name, icon, launch(ctx, payload) })`, `get(id)`, `has(id)`, `list() → [{id, name, icon}]`, `launch(id, payload)` (unknown id → `ctx.dialogs.message` error "Windows cannot find 'id'…"). `ctx` is the shell context built in Task 11: `{ wm, dialogs, sounds, registry, resume, fs, pdfHref, repoUrl, openExternal(url), storage }`.
- Produces: `PATHS = { myComputer: 'My Computer', recycleBin: 'Recycle Bin', myDocuments: 'C:\\Documents and Settings\\Stephen\\My Documents', desktop: 'C:\\Documents and Settings\\Stephen\\Desktop' }`, `buildFileSystem(resume) → fs` (`{ root, recycle }`), `resolvePath(fs, path) → node | null`, `parentPath(path) → string | null`. Node shape: `{ name, kind: 'root'|'drive'|'folder'|'file'|'shortcut'|'exe', icon, path, children?, open?: { app, payload? } }`. `open.app` values used: `iexplore, reader, explorer, notepad, external, error, pinball, winmine, sol`.

- [ ] **Step 1: Write the failing registry test**

`src/xp/apps/registry.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRegistry } from './registry.js';

describe('registry', () => {
  it('launches registered apps with the shell context and payload', () => {
    const calls = [];
    const ctx = { dialogs: { message: (o) => calls.push(o) } };
    const registry = createRegistry(ctx);
    registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: (c, payload) => calls.push([c === ctx, payload]) });
    registry.launch('notepad', { title: 'a.txt' });
    expect(calls).toEqual([[true, { title: 'a.txt' }]]);
    expect(registry.list()).toEqual([{ id: 'notepad', name: 'Notepad', icon: 'notepad' }]);
  });
  it('shows a Windows cannot find error for unknown ids', () => {
    const calls = [];
    const registry = createRegistry({ dialogs: { message: (o) => calls.push(o) } });
    registry.launch('cmd');
    expect(calls[0]).toMatchObject({ kind: 'error' });
    expect(calls[0].text).toContain("Windows cannot find 'cmd'");
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement registry.js**

Run: `npx vitest run src/xp/apps/registry.test.js` → FAIL (module missing).

`src/xp/apps/registry.js`:

```js
/** App id -> launcher. Desktop icons, Start menu, Run and Explorer all launch through here. */
export function createRegistry(ctx) {
  const apps = new Map();
  return {
    ctx,
    register(id, def) { apps.set(id, def); return def; },
    get: (id) => apps.get(id) ?? null,
    has: (id) => apps.has(id),
    list: () => [...apps.entries()].map(([id, def]) => ({ id, name: def.name, icon: def.icon })),
    launch(id, payload) {
      const def = apps.get(id);
      if (!def) {
        return ctx.dialogs.message({
          title: 'Windows', kind: 'error',
          text: `Windows cannot find '${id}'. Make sure you typed the name correctly, and then try again.`,
        });
      }
      return def.launch(ctx, payload);
    },
  };
}
```

Run: `npx vitest run src/xp/apps/registry.test.js` → PASS, 2 tests.

- [ ] **Step 3: Write the failing file system test**

`src/data/filesystem.test.js`:

```js
import { describe, it, expect } from 'vitest';
import resume from './resume.json';
import { buildFileSystem, resolvePath, parentPath, PATHS } from './filesystem.js';

describe('fake file system', () => {
  const fs = buildFileSystem(resume);

  it('has the three drives and shared documents under My Computer', () => {
    expect(resolvePath(fs, PATHS.myComputer)).toBe(fs.root);
    expect(fs.root.children.map((c) => c.name)).toEqual(['3½ Floppy (A:)', 'Local Disk (C:)', 'CD Drive (D:)', 'Shared Documents']);
    expect(resolvePath(fs, 'A:').open).toMatchObject({ app: 'error', payload: { buttons: ['Retry', 'Cancel'] } });
  });
  it('generates one project file per job with the job details', () => {
    const projects = resolvePath(fs, `${PATHS.myDocuments}\\Projects`);
    expect(projects.children).toHaveLength(resume.experience.length);
    const first = projects.children[0];
    expect(first.name).toBe('Sun Wah Supermarket.txt');
    expect(first.open.app).toBe('notepad');
    expect(first.open.payload.text).toContain(resume.experience[0].bullets[0]);
    expect(first.path).toBe(`${PATHS.myDocuments}\\Projects\\Sun Wah Supermarket.txt`);
  });
  it('maps executables to apps and documents to viewers', () => {
    expect(resolvePath(fs, 'C:\\WINDOWS\\system32\\sol.exe').open).toEqual({ app: 'sol' });
    expect(resolvePath(fs, `${PATHS.myDocuments}\\resume.pdf`).open).toEqual({ app: 'reader' });
    expect(resolvePath(fs, `${PATHS.myDocuments}\\My Pictures\\portfolio.url`).open).toEqual({ app: 'external', payload: { url: resume.contact.portfolio } });
  });
  it('walks parents up to My Computer or Recycle Bin', () => {
    expect(parentPath('C:\\WINDOWS\\system32')).toBe('C:\\WINDOWS');
    expect(parentPath('C:')).toBe(PATHS.myComputer);
    expect(parentPath(PATHS.myComputer)).toBeNull();
    expect(parentPath('Recycle Bin\\old_resume_2018.doc')).toBe(PATHS.recycleBin);
    expect(resolvePath(fs, PATHS.recycleBin).children).toHaveLength(2);
    expect(resolvePath(fs, 'C:\\Nope')).toBeNull();
  });
  it('never leaks the phone number into generated text', () => {
    expect(JSON.stringify(fs)).not.toMatch(/\(\d{3}\) \d{3}-\d{4}/);
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/data/filesystem.test.js`
Expected: FAIL — cannot resolve `./filesystem.js`.

- [ ] **Step 5: Implement filesystem.js**

`src/data/filesystem.js`:

```js
const SEP = '\\';

export const PATHS = {
  myComputer: 'My Computer',
  recycleBin: 'Recycle Bin',
  myDocuments: 'C:\\Documents and Settings\\Stephen\\My Documents',
  desktop: 'C:\\Documents and Settings\\Stephen\\Desktop',
};

const folder = (name, children = [], extra = {}) => ({ name, kind: 'folder', icon: 'folder', children, ...extra });
const file = (name, icon, open) => ({ name, kind: 'file', icon, open });
const exe = (name, app, icon = 'exe') => ({ name, kind: 'exe', icon, open: { app } });
const shortcut = (name, icon, open) => ({ name, kind: 'shortcut', icon, open });
const notepadFile = (name, text) => file(name, 'txt', { app: 'notepad', payload: { title: name, text } });
const driveError = (title, text) => ({ app: 'error', payload: { title, text, buttons: ['Retry', 'Cancel'] } });
const binError = { app: 'error', payload: { title: 'Recycle Bin', text: 'This file is in the Recycle Bin. Restore it before opening it.' } };

const safeName = (company) => company.split(',')[0].trim().replace(/[\\/:*?"<>|]/g, '');

const jobText = (job) => [job.title, job.company, job.period, '', ...job.bullets.map((b) => `- ${b}`)].join('\n');

const readmeText = (resume) => `${resume.displayName} — ${resume.title}
==============================

Thanks for looking around my computer.

This is an interactive resume: a three.js cyberpunk bedroom with an old PC
running a fake Windows XP. Everything you see is built from scratch in plain
JavaScript. No Microsoft artwork or sounds are used.

Where to look:
  * Internet Explorer  -> my homepage and the PDF resume
  * My Documents\\Projects -> one text file per job
  * Start > All Programs > Games -> Minesweeper, Solitaire, Pinball

Contact: ${resume.contact.email}
LinkedIn: ${resume.contact.linkedin}
Portfolio: ${resume.contact.portfolio}
`;

const todoText = `TODO
----
[x] Learn Unity
[x] Ship mobile apps
[x] Move to Canada
[x] Build a fake Windows XP in a browser
[ ] Defragment C:
[ ] Beat my own Pinball high score
[ ] Get hired (you can help with this one)
`;

export function buildFileSystem(resume) {
  const projects = resume.experience.map((job) => notepadFile(`${safeName(job.company)}.txt`, jobText(job)));
  const myDocuments = folder('My Documents', [
    folder('My Pictures', [shortcut('portfolio.url', 'url', { app: 'external', payload: { url: resume.contact.portfolio } })]),
    folder('My Music', []),
    folder('Projects', projects),
    file('resume.pdf', 'pdf', { app: 'reader' }),
    notepadFile('readme.txt', readmeText(resume)),
    notepadFile('todo.txt', todoText),
  ], { icon: 'documents' });
  const desktop = folder('Desktop', [
    shortcut('Internet Explorer', 'ie', { app: 'iexplore' }),
    shortcut('My Documents', 'documents', { app: 'explorer', payload: { path: PATHS.myDocuments } }),
  ]);
  const cDrive = { name: 'Local Disk (C:)', kind: 'drive', icon: 'drive', children: [
    folder('Documents and Settings', [folder('Stephen', [desktop, myDocuments], { icon: 'user' })]),
    folder('Program Files', [
      folder('Internet Explorer', [exe('iexplore.exe', 'iexplore', 'ie')]),
      folder('Windows NT', [folder('Pinball', [exe('pinball.exe', 'pinball', 'pinball')])]),
    ]),
    folder('WINDOWS', [folder('system32', [exe('winmine.exe', 'winmine', 'mine'), exe('sol.exe', 'sol', 'cards'), exe('notepad.exe', 'notepad', 'notepad')])]),
  ] };
  const root = { name: PATHS.myComputer, kind: 'root', icon: 'computer', children: [
    { name: '3½ Floppy (A:)', kind: 'drive', icon: 'floppy', children: [], open: driveError('3½ Floppy (A:)', 'Please insert a disk into drive A:.') },
    cDrive,
    { name: 'CD Drive (D:)', kind: 'drive', icon: 'cd', children: [], open: driveError('CD Drive (D:)', 'Please insert a disc into drive D:.') },
    shortcut('Shared Documents', 'documents', { app: 'explorer', payload: { path: PATHS.myDocuments } }),
  ] };
  const recycle = { name: PATHS.recycleBin, kind: 'root', icon: 'recycle', children: [
    file('old_resume_2018.doc', 'txt', binError),
    file('cover_letter_FINAL_v3_really_final.doc', 'txt', binError),
  ] };
  assignPaths(root, '');
  assignPaths(recycle, '');
  return { root, recycle };
}

function assignPaths(node, parent) {
  if (node.kind === 'root') node.path = node.name;
  else if (node.kind === 'drive') node.path = `${node.name.match(/\(([A-Z]):\)/)[1]}:`;
  else node.path = `${parent}${SEP}${node.name}`;
  for (const child of node.children ?? []) assignPaths(child, node.path);
}

export function resolvePath(fs, path) {
  if (!path || path === PATHS.myComputer) return fs.root;
  if (path === PATHS.recycleBin) return fs.recycle;
  if (path.startsWith(`${PATHS.recycleBin}${SEP}`)) {
    const name = path.slice(PATHS.recycleBin.length + 1);
    return fs.recycle.children.find((c) => c.name === name) ?? null;
  }
  const [drive, ...parts] = path.split(SEP);
  let node = fs.root.children.find((c) => c.kind === 'drive' && c.path === drive) ?? null;
  for (const part of parts) {
    if (!node) return null;
    node = node.children?.find((c) => c.name === part) ?? null;
  }
  return node;
}

export function parentPath(path) {
  if (path === PATHS.myComputer || path === PATHS.recycleBin) return null;
  const i = path.lastIndexOf(SEP);
  if (i < 0) return PATHS.myComputer;
  return path.slice(0, i);
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/data/filesystem.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 7: Stage**

```bash
git add src/xp/apps/registry.js src/xp/apps/registry.test.js src/data/filesystem.js src/data/filesystem.test.js
```

Suggested commit message: `feat: app registry and generated fake file system`

---
### Task 7: Popup menus, Homepage, Internet Explorer, Adobe Reader

**Files:**
- Create: `src/xp/Menu.js`, `src/xp/Menu.test.js`
- Create: `src/xp/apps/Homepage.js`, `src/xp/apps/Homepage.test.js`, `src/xp/apps/homepage.css`
- Create: `src/xp/apps/InternetExplorer.js`, `src/xp/apps/AdobeReader.js`
- Modify: `src/styles/xp-overrides.css` (append menus/toolbar, IE, Reader sections)

**Interfaces:**
- Consumes: `wm`, `registry`, `iconEl`, `dialogs`, and the shell context fields `resume, pdfHref, repoUrl, storage, openExternal(url), menus`.
- Produces: `createMenus(screenEl, { sounds }) → menus` with `menus.open(anchorEl, items, { align })`, `menus.openAt(x, y, items)` (desktop coordinates), `menus.close()`, `menus.isOpen`; items are `{ label, action?, disabled?, checked?, shortcut?, separator? }`. `attachMenubar(barEl, menus, defs)` where `defs = { File: items[], ... }` renders `.xp-menubar-item` spans into `barEl`.
- Produces: `renderHomepage(resume, { pdfHref, repoUrl, visitors }) → string` (full HTML document).
- Produces: `registerInternetExplorer(registry)` (app id `iexplore`), `registerAdobeReader(registry)` (app id `reader`).

- [ ] **Step 1: Write the failing menu test**

`src/xp/Menu.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createMenus, attachMenubar } from './Menu.js';

describe('menus', () => {
  let screen, menus;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><button id="anchor">File</button><div id="bar"></div></div>';
    screen = document.querySelector('#screen');
    menus = createMenus(screen);
  });

  it('opens a menu with items, runs the action and closes', () => {
    const hits = [];
    menus.open(document.querySelector('#anchor'), [
      { label: 'New', shortcut: 'Ctrl+N', action: () => hits.push('new') },
      { separator: true },
      { label: 'Exit', disabled: true },
    ]);
    const menu = screen.querySelector('.xp-menu');
    expect(menu.querySelectorAll('.xp-menu-item')).toHaveLength(2);
    expect(menu.querySelector('.xp-menu-sep')).not.toBeNull();
    expect(menu.querySelectorAll('.xp-menu-item')[1].disabled).toBe(true);
    menu.querySelector('.xp-menu-item').click();
    expect(hits).toEqual(['new']);
    expect(screen.querySelector('.xp-menu')).toBeNull();
    expect(menus.isOpen).toBe(false);
  });

  it('closes when clicking elsewhere and replaces an open menu', () => {
    menus.open(document.querySelector('#anchor'), [{ label: 'A' }]);
    menus.open(document.querySelector('#anchor'), [{ label: 'B' }]);
    expect(screen.querySelectorAll('.xp-menu')).toHaveLength(1);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(screen.querySelector('.xp-menu')).toBeNull();
  });

  it('renders a menubar whose items open their menus', () => {
    attachMenubar(document.querySelector('#bar'), menus, { File: [{ label: 'Close' }], Help: [{ label: 'About' }] });
    const items = screen.querySelectorAll('.xp-menubar-item');
    expect([...items].map((i) => i.textContent)).toEqual(['File', 'Help']);
    items[1].click();
    expect(screen.querySelector('.xp-menu .xp-menu-label').textContent).toBe('About');
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement Menu.js**

Run: `npx vitest run src/xp/Menu.test.js` → FAIL (module missing).

`src/xp/Menu.js`:

```js
/** One popup menu at a time, appended to the screen element so it can overflow windows. */
export function createMenus(screenEl, { sounds } = {}) {
  let current = null;

  function onDocumentDown(e) { if (current && !current.contains(e.target)) close(); }
  function close() {
    if (!current) return;
    current.remove();
    current = null;
    document.removeEventListener('pointerdown', onDocumentDown, true);
  }
  /** Viewport rect -> desktop-space coordinates (the screen may be CSS-scaled). */
  function toLocal(rect) {
    const base = screenEl.getBoundingClientRect();
    const s = (base.width / screenEl.offsetWidth) || 1;
    return { x: (rect.left - base.left) / s, y: (rect.top - base.top) / s, w: rect.width / s, h: rect.height / s };
  }
  function build(items) {
    const menu = document.createElement('div');
    menu.className = 'xp-menu';
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'xp-menu-sep';
        menu.append(sep);
        continue;
      }
      const row = document.createElement('button');
      row.className = 'xp-menu-item';
      row.type = 'button';
      row.disabled = Boolean(item.disabled);
      row.innerHTML = '<span class="xp-menu-check"></span><span class="xp-menu-label"></span><span class="xp-menu-shortcut"></span>';
      row.querySelector('.xp-menu-check').textContent = item.checked ? '✓' : '';
      row.querySelector('.xp-menu-label').textContent = item.label;
      row.querySelector('.xp-menu-shortcut').textContent = item.shortcut ?? '';
      row.addEventListener('click', () => { close(); item.action?.(); });
      menu.append(row);
    }
    return menu;
  }
  function place(menu, x, y) {
    screenEl.append(menu);
    current = menu;
    const maxX = Math.max(0, (screenEl.offsetWidth || 1024) - menu.offsetWidth);
    const maxY = Math.max(0, (screenEl.offsetHeight || 768) - menu.offsetHeight);
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
    document.addEventListener('pointerdown', onDocumentDown, true);
    sounds?.play('menu');
    return menu;
  }
  function open(anchorEl, items, { align = 'below' } = {}) {
    close();
    const a = toLocal(anchorEl.getBoundingClientRect());
    return place(build(items), a.x, align === 'below' ? a.y + a.h : a.y);
  }
  function openAt(x, y, items) {
    close();
    return place(build(items), x, y);
  }
  return { open, openAt, close, get isOpen() { return current !== null; } };
}

/** defs: { File: items[], Edit: items[] ... }. Items may be arrays or functions returning arrays (evaluated on open). */
export function attachMenubar(barEl, menus, defs) {
  barEl.classList.add('xp-menubar');
  barEl.innerHTML = '';
  for (const [name, items] of Object.entries(defs)) {
    const span = document.createElement('span');
    span.className = 'xp-menubar-item';
    span.textContent = name;
    span.addEventListener('click', () => {
      menus.open(span, typeof items === 'function' ? items() : items);
      span.classList.add('open');
      const check = setInterval(() => { if (!menus.isOpen) { span.classList.remove('open'); clearInterval(check); } }, 100);
    });
    barEl.append(span);
  }
}
```

Run: `npx vitest run src/xp/Menu.test.js` → PASS, 3 tests.

- [ ] **Step 3: Write the failing Homepage test**

`src/xp/apps/Homepage.test.js`:

```js
import { describe, it, expect } from 'vitest';
import resume from '../../data/resume.json';
import { renderHomepage } from './Homepage.js';

const opts = { pdfHref: '/XPcomputer/resume/resume-main.pdf', repoUrl: 'https://github.com/stephenyctsedev/XPcomputer', visitors: 42 };

describe('renderHomepage', () => {
  const html = renderHomepage(resume, opts);

  it('renders every resume section', () => {
    expect(html).toContain(resume.displayName);
    expect(html).toContain(resume.title);
    expect(html).toContain(resume.summary.slice(0, 40));
    for (const job of resume.experience) { expect(html).toContain(job.title); expect(html).toContain(job.bullets[0]); }
    for (const skill of resume.expertise) expect(html).toContain(skill);
    for (const e of resume.education) expect(html).toContain(e.degree);
    for (const l of resume.languages) expect(html).toContain(`${l.name}: ${l.level}`);
    expect(html).toContain(`mailto:${resume.contact.email}`);
    expect(html).toContain(resume.contact.linkedin);
    expect(html).toContain(resume.contact.portfolio);
    expect(html).toContain(`Last updated: ${resume.updated}`);
  });
  it('links the PDF through the reader app and the repo externally', () => {
    expect(html).toMatch(/<a[^>]+href="\/XPcomputer\/resume\/resume-main.pdf"[^>]+data-app="reader"/);
    expect(html).toContain(opts.repoUrl);
  });
  it('shows a six digit visitor counter', () => {
    const digits = [...html.matchAll(/<span class="digit">(\d)<\/span>/g)].map((m) => m[1]).join('');
    expect(digits).toBe('000042');
  });
  it('never shows the phone number or the legal full name', () => {
    expect(html).not.toMatch(/\(\d{3}\) \d{3}-\d{4}/);
    expect(html).not.toContain(resume.fullName);
  });
  it('escapes HTML in content', () => {
    expect(renderHomepage({ ...resume, displayName: '<b>x</b>' }, opts)).toContain('&lt;b&gt;x&lt;/b&gt;');
  });
});
```

- [ ] **Step 4: Run it to verify it fails**

Run: `npx vitest run src/xp/apps/Homepage.test.js`
Expected: FAIL — cannot resolve `./Homepage.js`.

- [ ] **Step 5: Implement homepage.css and Homepage.js**

`src/xp/apps/homepage.css`:

```css
body { margin: 0; font-family: Verdana, Arial, sans-serif; font-size: 12px; color: #223;
  background: #e6eef7 url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='8' height='8'><rect width='8' height='8' fill='%23e6eef7'/><rect width='4' height='4' fill='%23dde7f3'/></svg>"); }
.page { background: #fff; border: 2px solid #4a6ea9; margin: 12px auto; }
.banner { background: linear-gradient(#0a246a, #3a6ea5); color: #fff; padding: 0 0 10px; text-align: center; }
.banner h1 { font-family: "Times New Roman", serif; font-size: 34px; margin: 10px 0 2px; letter-spacing: 1px; text-shadow: 2px 2px 0 #000; }
.banner h2 { font-size: 13px; font-weight: normal; margin: 0; color: #ffe680; }
.marquee { overflow: hidden; white-space: nowrap; background: #000; color: #0f0; font-family: "Courier New", monospace; font-size: 12px; padding: 3px 0; }
.marquee span { display: inline-block; padding-left: 100%; animation: marquee 22s linear infinite; }
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-100%); } }
.digit { display: inline-block; background: #222; color: #ff0; border: 1px solid #888; padding: 0 3px; margin: 0 1px; font-weight: bold; }
.construction { background: repeating-linear-gradient(45deg, #ffcc00 0 12px, #222 12px 24px); color: #fff; text-align: center; font-weight: bold; padding: 4px; text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000; }
.nav { background: #d4dff0; padding: 6px 12px; text-align: center; border-bottom: 1px solid #9ab; }
a { color: #00c; } a:visited { color: #609; } a.pdf { font-weight: bold; }
.content { padding: 12px 20px 20px; line-height: 1.5; }
h3 { font-family: "Times New Roman", serif; color: #0a246a; border-bottom: 1px dotted #9ab; margin: 18px 0 8px; font-size: 18px; }
.jobs td { vertical-align: top; border-bottom: 1px solid #dde; }
.period { white-space: nowrap; color: #666; width: 110px; font-size: 11px; }
.skills td { vertical-align: top; padding-right: 40px; }
ul { margin: 4px 0 8px; padding-left: 20px; }
.footer { background: #d4dff0; text-align: center; font-size: 10px; color: #445; padding: 6px; border-top: 1px solid #9ab; }
```

`src/xp/apps/Homepage.js`:

```js
import homepageCss from './homepage.css?raw';

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Early-2000s personal homepage as a full HTML document for an <iframe srcdoc>. */
export function renderHomepage(resume, { pdfHref, repoUrl, visitors = 1337 } = {}) {
  const { displayName, title, summary, contact, expertise, languages, education, experience, updated } = resume;
  const half = Math.ceil(expertise.length / 2);
  const columns = [expertise.slice(0, half), expertise.slice(half)];
  const counter = String(visitors).padStart(6, '0').split('').map((d) => `<span class="digit">${d}</span>`).join('');
  const pdfLink = (label) => `<a class="pdf" href="${esc(pdfHref)}" data-app="reader" target="_blank" rel="noopener">${label}</a>`;
  const external = (href, label) => `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}</a>`;

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(displayName)}'s Homepage</title><style>${homepageCss}</style></head>
<body>
<table class="page" width="760" cellpadding="0" cellspacing="0">
<tr><td class="banner">
  <div class="marquee"><span>*** Welcome to my homepage! *** You are visitor number ${counter} *** Thanks for stopping by! ***</span></div>
  <h1>${esc(displayName)}</h1>
  <h2>${esc(title)} &middot; ${esc(contact.location)}</h2>
</td></tr>
<tr><td class="construction">&#9888; This site is under construction &#9888; Best viewed in Internet Explorer 6 at 1024&times;768</td></tr>
<tr><td class="nav"><a href="#about">About Me</a> | <a href="#experience">Experience</a> | <a href="#expertise">Expertise</a> | <a href="#education">Education</a> | <a href="#contact">Contact</a> | ${pdfLink('Download my resume (PDF)')}</td></tr>
<tr><td class="content">
  <h3 id="about">About Me</h3>
  <p>${esc(summary)}</p>
  <h3 id="experience">Experience</h3>
  <table class="jobs" width="100%" cellpadding="6" cellspacing="0">
  ${experience.map((job) => `<tr><td class="period">${esc(job.period)}</td><td><b>${esc(job.title)}</b><br><i>${esc(job.company)}</i><ul>${job.bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul></td></tr>`).join('\n  ')}
  </table>
  <h3 id="expertise">Expertise</h3>
  <table class="skills" cellpadding="2"><tr>${columns.map((col) => `<td><ul>${col.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></td>`).join('')}</tr></table>
  <h3 id="education">Education</h3>
  <table class="edu" cellpadding="4">${education.map((e) => `<tr><td class="period">${esc(e.year)}</td><td><b>${esc(e.degree)}</b><br>${esc(e.school)}</td></tr>`).join('')}</table>
  <h3>Languages</h3>
  <ul>${languages.map((l) => `<li>${esc(l.name)}: ${esc(l.level)}</li>`).join('')}</ul>
  <h3 id="contact">Contact &amp; Links</h3>
  <ul class="links">
    <li>E-mail: <a href="mailto:${esc(contact.email)}">${esc(contact.email)}</a></li>
    <li>LinkedIn: ${external(contact.linkedin, contact.linkedin)}</li>
    <li>Portfolio: ${external(contact.portfolio, contact.portfolio)}</li>
    <li>${pdfLink('Download my resume (PDF)')}</li>
    <li>${external(repoUrl, "View this site's source on GitHub")}</li>
  </ul>
</td></tr>
<tr><td class="footer">Last updated: ${esc(updated)} &middot; Made with Notepad and patience &middot; &copy; ${esc(displayName)}</td></tr>
</table>
</body></html>`;
}
```

- [ ] **Step 6: Run the Homepage tests to verify they pass**

Run: `npx vitest run src/xp/apps/Homepage.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 7: Implement InternetExplorer.js**

`src/xp/apps/InternetExplorer.js`:

```js
import { iconEl } from '../icons/index.js';
import { attachMenubar } from '../Menu.js';
import { renderHomepage } from './Homepage.js';

export const HOME_URL = 'http://www.stephentse.local/index.html';
const VISITOR_KEY = 'xpcomputer.visitors';

export function registerInternetExplorer(registry) {
  registry.register('iexplore', { name: 'Internet Explorer', icon: 'ie', launch: openInternetExplorer });
}

function nextVisitorNumber(storage) {
  const count = Number(storage.get(VISITOR_KEY) ?? 0) + 1;
  storage.set(VISITOR_KEY, String(count));
  return 1337 + count;
}

export function openInternetExplorer(ctx) {
  const { wm, dialogs, menus, registry, resume, pdfHref, repoUrl, storage, openExternal } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-ie';
  body.innerHTML = `
    <div class="xp-ie-menubar"></div>
    <div class="xp-ie-toolbar">
      <button class="xp-tb" data-cmd="back" disabled><span class="xp-tb-ico" data-icon="arrowLeft"></span>Back</button>
      <button class="xp-tb" data-cmd="forward" disabled><span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="stop" title="Stop"><span class="xp-tb-ico" data-icon="stop"></span></button>
      <button class="xp-tb" data-cmd="refresh" title="Refresh"><span class="xp-tb-ico" data-icon="refresh"></span></button>
      <button class="xp-tb" data-cmd="home" title="Home"><span class="xp-tb-ico" data-icon="home"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="search"><span class="xp-tb-ico" data-icon="search"></span>Search</button>
      <button class="xp-tb" data-cmd="favorites"><span class="xp-tb-ico" data-icon="star"></span>Favorites</button>
      <button class="xp-tb" data-cmd="history" title="History"><span class="xp-tb-ico" data-icon="clock"></span></button>
    </div>
    <div class="xp-ie-address"><label>Address</label><div class="xp-ie-url"><span class="xp-ie-url-ico"></span><input type="text" readonly></div><button class="xp-tb" data-cmd="go">Go</button></div>
    <div class="xp-ie-page"><iframe title="Homepage"></iframe></div>
    <div class="status-bar xp-ie-status"><p class="status-bar-field xp-ie-status-main">Done</p><p class="status-bar-field">Internet</p></div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));
  body.querySelector('.xp-ie-url-ico').append(iconEl('ie', 16));
  body.querySelector('.xp-ie-url input').value = HOME_URL;
  const iframe = body.querySelector('iframe');
  const status = body.querySelector('.xp-ie-status-main');

  const win = wm.open({ appId: 'iexplore', title: `${resume.displayName}'s Homepage - Microsoft Internet Explorer`.replace('Microsoft ', ''), icon: 'ie', width: 800, height: 600, minWidth: 420, minHeight: 300, content: body });

  const notAvailable = () => dialogs.message({ title: 'Internet Explorer', kind: 'info', owner: win, text: 'This feature is not available in the demo. Try the homepage links instead.' });
  const favorites = () => [
    { label: 'Homepage', action: load },
    { label: 'Resume (PDF)', action: () => registry.launch('reader') },
    { separator: true },
    { label: 'LinkedIn', action: () => openExternal(resume.contact.linkedin) },
    { label: 'Portfolio', action: () => openExternal(resume.contact.portfolio) },
    { label: 'Source on GitHub', action: () => openExternal(repoUrl) },
  ];
  attachMenubar(body.querySelector('.xp-ie-menubar'), menus, {
    File: [{ label: 'New Window', action: () => openInternetExplorer(ctx) }, { label: 'Save As...', action: () => registry.launch('reader') }, { separator: true }, { label: 'Close', action: () => win.close() }],
    Edit: [{ label: 'Cut', disabled: true }, { label: 'Copy', disabled: true }, { label: 'Paste', disabled: true }],
    View: [{ label: 'Refresh', shortcut: 'F5', action: load }, { label: 'Source', action: () => openExternal(repoUrl) }],
    Favorites: favorites,
    Tools: [{ label: 'Internet Options...', action: notAvailable }],
    Help: [{ label: 'About Internet Explorer', action: () => dialogs.message({ title: 'About Internet Explorer', owner: win, text: 'A loving recreation in plain JavaScript. No Microsoft code inside.' }) }],
  });

  function load() {
    status.textContent = 'Opening page...';
    iframe.srcdoc = renderHomepage(resume, { pdfHref, repoUrl, visitors: nextVisitorNumber(storage) });
  }
  iframe.addEventListener('load', () => {
    status.textContent = 'Done';
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      const href = a.getAttribute('href') ?? '';
      if (href.startsWith('#')) return;
      e.preventDefault();
      if (a.dataset.app) registry.launch(a.dataset.app);
      else openExternal(href);
    });
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    if (cmd === 'refresh' || cmd === 'home' || cmd === 'go') load();
    else if (cmd === 'stop') status.textContent = 'Done';
    else if (cmd === 'favorites') menus.open(e.target.closest('[data-cmd]'), favorites());
    else if (cmd === 'search' || cmd === 'history') notAvailable();
  });
  load();
  return win;
}
```

- [ ] **Step 8: Implement AdobeReader.js**

`src/xp/apps/AdobeReader.js`:

```js
import { iconEl } from '../icons/index.js';

export function registerAdobeReader(registry) {
  registry.register('reader', { name: 'Adobe Reader', icon: 'pdf', launch: openAdobeReader });
}

export function openAdobeReader(ctx) {
  const { wm, pdfHref, openExternal } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-reader';
  body.innerHTML = `
    <div class="xp-reader-toolbar">
      <a class="xp-tb" href="${pdfHref}" download="Stephen-Tse-Resume.pdf"><span class="xp-tb-ico"></span>Save a Copy</a>
      <button class="xp-tb" data-cmd="newtab">Open in new tab</button>
      <span class="xp-reader-hint">resume-main.pdf</span>
    </div>
    <div class="xp-reader-page">
      <iframe title="resume.pdf"></iframe>
      <div class="xp-reader-fallback" hidden>
        <p>This browser cannot display PDF files inside a window.</p>
        <p><a href="${pdfHref}" download="Stephen-Tse-Resume.pdf">Download resume-main.pdf</a></p>
      </div>
    </div>`;
  body.querySelector('.xp-tb-ico').append(iconEl('pdf', 16));
  const iframe = body.querySelector('iframe');
  const fallback = body.querySelector('.xp-reader-fallback');
  const showFallback = (show) => { iframe.hidden = show; fallback.hidden = !show; };

  if (navigator.pdfViewerEnabled === false) {
    showFallback(true);
  } else {
    let loaded = false;
    iframe.addEventListener('load', () => { loaded = true; showFallback(false); });
    iframe.src = pdfHref;
    setTimeout(() => { if (!loaded) showFallback(true); }, 4000);
  }
  body.querySelector('[data-cmd="newtab"]').addEventListener('click', () => openExternal(pdfHref));
  return wm.open({ appId: 'reader', title: 'resume.pdf - Adobe Reader', icon: 'pdf', width: 760, height: 640, minWidth: 420, minHeight: 320, content: body });
}
```

- [ ] **Step 9: Append the menu, toolbar, IE and Reader styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Menus & toolbars ---- */
.xp-menubar { display: flex; gap: 2px; padding: 1px 4px; background: #ece9d8; border-bottom: 1px solid #d8d2bd; font-size: 11px; user-select: none; }
.xp-menubar-item { padding: 2px 6px; cursor: default; }
.xp-menubar-item:hover, .xp-menubar-item.open { background: #316ac5; color: #fff; }
.xp-menu { position: absolute; z-index: 100000; min-width: 170px; background: #fff; border: 1px solid #aca899; box-shadow: 2px 2px 3px rgba(0,0,0,.3); padding: 2px; font-size: 11px; }
.xp-menu-item { display: grid; grid-template-columns: 18px 1fr auto; align-items: center; gap: 6px; width: 100%; border: 0; background: none; padding: 3px 8px 3px 2px; text-align: left; font: inherit; color: #000; cursor: default; box-shadow: none; min-width: 0; min-height: 0; border-radius: 0; }
.xp-menu-item:hover:not(:disabled) { background: #316ac5; color: #fff; }
.xp-menu-item:disabled { color: #a0a0a0; }
.xp-menu-shortcut { opacity: .7; padding-left: 16px; }
.xp-menu-sep { height: 1px; background: #aca899; margin: 3px 2px; }
.xp-tb { display: inline-flex; align-items: center; gap: 4px; border: 1px solid transparent; background: transparent; padding: 2px 6px; font-size: 11px; color: #000; text-decoration: none; min-width: 0; min-height: 0; box-shadow: none; border-radius: 3px; cursor: default; font-family: inherit; }
.xp-tb:hover:not(:disabled) { border-color: #9db9e4; background: linear-gradient(#fff, #e3ecf9); }
.xp-tb:disabled { opacity: .45; }
.xp-tb-sep { width: 1px; height: 22px; background: #c9c3b2; margin: 0 4px; }

/* ---- Internet Explorer ---- */
.xp-ie { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #ece9d8; }
.xp-ie-toolbar { display: flex; align-items: center; gap: 2px; padding: 3px 6px; border-bottom: 1px solid #d8d2bd; }
.xp-ie-address { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-bottom: 1px solid #d8d2bd; font-size: 11px; }
.xp-ie-url { flex: 1; display: flex; align-items: center; gap: 4px; background: #fff; border: 1px solid #7f9db9; padding: 1px 4px; }
.xp-ie-url input { flex: 1; border: 0; outline: 0; font: inherit; background: transparent; padding: 2px 0; box-shadow: none; min-height: 0; }
.xp-ie-page { flex: 1; min-height: 0; background: #fff; border: 1px solid #7f9db9; margin: 0 2px; }
.xp-ie-page iframe { width: 100%; height: 100%; border: 0; display: block; }
.xp-ie-status { margin: 0; }
.xp-ie-status-main { flex: 1; }

/* ---- Adobe Reader ---- */
.xp-reader { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.xp-reader-toolbar { display: flex; align-items: center; gap: 6px; padding: 4px 6px; border-bottom: 1px solid #d8d2bd; font-size: 11px; }
.xp-reader-hint { margin-left: auto; color: #666; }
.xp-reader-page { flex: 1; min-height: 0; background: #7a7a7a; position: relative; }
.xp-reader-page iframe { width: 100%; height: 100%; border: 0; display: block; }
.xp-reader-fallback { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; background: #ece9d8; font-size: 12px; }
```

- [ ] **Step 10: Run the whole suite and stage**

Run: `npm test`
Expected: all tests pass (modes 6, tex-parse 14, sounds 3, WindowManager 9, Dialog 3, registry 2, filesystem 5, Menu 3, Homepage 5).

```bash
git add src/xp/Menu.js src/xp/Menu.test.js src/xp/apps/Homepage.js src/xp/apps/Homepage.test.js src/xp/apps/homepage.css src/xp/apps/InternetExplorer.js src/xp/apps/AdobeReader.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: retro homepage inside Internet Explorer, Adobe Reader window, popup menus`

---
### Task 8: Explorer, Notepad, System Properties, misc apps

**Files:**
- Create: `src/xp/apps/Explorer.js`, `src/xp/apps/Explorer.test.js`
- Create: `src/xp/apps/Notepad.js`, `src/xp/apps/SystemProperties.js`, `src/xp/apps/misc.js`
- Modify: `src/styles/xp-overrides.css` (append Explorer, Notepad, System Properties sections)

**Interfaces:**
- Consumes: `wm, fs, registry, dialogs, menus, openExternal, repoUrl, resume, toDesktopPoint(clientX, clientY) → {x, y}` from the shell context (Task 11 provides `toDesktopPoint`), `resolvePath/parentPath/PATHS` (Task 6), `attachMenubar` (Task 7).
- Produces: `registerExplorer(registry)` (id `explorer`, payload `{ path }`), `openExplorer(ctx, path) → win`; `registerNotepad(registry)` (id `notepad`, payload `{ title, text }`); `registerSystemProperties(registry)` (id `sysprops`); `registerMisc(registry)` registering `error` (payload `{ title, text, buttons?, owner? }` → error dialog), `external` (payload `{ url }`), `controlpanel`, `help`, and placeholder `winmine`, `sol`, `pinball` (info dialog "installs in a later update"; Phases 3–5 replace these).

- [ ] **Step 1: Write the failing Explorer test**

`src/xp/apps/Explorer.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import resume from '../../data/resume.json';
import { buildFileSystem, PATHS } from '../../data/filesystem.js';
import { createWindowManager } from '../WindowManager.js';
import { createMenus } from '../Menu.js';
import { openExplorer } from './Explorer.js';

describe('explorer', () => {
  let ctx, launched;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    launched = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume),
      registry: { launch: (id, payload) => launched.push([id, payload]) },
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
      toDesktopPoint: (x, y) => ({ x, y }),
    };
  });
  const labels = (win) => [...win.el.querySelectorAll('.xp-item:not(.xp-item-header) .xp-item-label')].map((l) => l.textContent);
  const address = (win) => win.el.querySelector('.xp-ie-url input').value;

  it('lists My Computer, navigates into C:, and goes back up', () => {
    const win = openExplorer(ctx, PATHS.myComputer);
    expect(labels(win)).toEqual(['3½ Floppy (A:)', 'Local Disk (C:)', 'CD Drive (D:)', 'Shared Documents']);
    expect(win.el.querySelector('.xp-explorer-status').textContent).toBe('4 object(s)');
    win.el.querySelector('[data-name="Local Disk (C:)"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(address(win)).toBe('C:');
    expect(win.title).toBe('Local Disk (C:)');
    expect(labels(win)).toEqual(['Documents and Settings', 'Program Files', 'WINDOWS']);
    win.el.querySelector('[data-cmd="up"]').click();
    expect(address(win)).toBe('My Computer');
    win.el.querySelector('[data-cmd="back"]').click();
    expect(address(win)).toBe('C:');
    win.el.querySelector('[data-cmd="forward"]').click();
    expect(address(win)).toBe('My Computer');
  });

  it('opens files through the registry and drives through the error app', () => {
    const docs = openExplorer(ctx, PATHS.myDocuments);
    docs.el.querySelector('[data-name="resume.pdf"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(launched[0][0]).toBe('reader');
    const pc = openExplorer(ctx, PATHS.myComputer);
    pc.el.querySelector('[data-name="3½ Floppy (A:)"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(launched[1][0]).toBe('error');
    expect(launched[1][1]).toMatchObject({ title: '3½ Floppy (A:)', buttons: ['Retry', 'Cancel'] });
    pc.el.querySelector('[data-name="Shared Documents"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(address(pc)).toBe(PATHS.myDocuments);
  });

  it('switches to details view with a type column', () => {
    const win = openExplorer(ctx, 'C:\\WINDOWS\\system32');
    win.el.querySelector('[data-cmd="views"]').click();
    document.querySelector('.xp-menu .xp-menu-item:nth-child(2)').click();
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
    expect(win.el.querySelector('[data-name="sol.exe"] .xp-item-type').textContent).toBe('Application');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: FAIL — cannot resolve `./Explorer.js`.

- [ ] **Step 3: Implement Explorer.js**

`src/xp/apps/Explorer.js`:

```js
import { iconEl } from '../icons/index.js';
import { attachMenubar } from '../Menu.js';
import { resolvePath, parentPath, PATHS } from '../../data/filesystem.js';

const TYPE_NAMES = { root: 'System Folder', drive: 'Local Disk', folder: 'File Folder', file: 'File', shortcut: 'Shortcut', exe: 'Application' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerExplorer(registry) {
  registry.register('explorer', {
    name: 'Windows Explorer', icon: 'folder',
    launch: (ctx, payload = {}) => openExplorer(ctx, payload.path ?? PATHS.myComputer),
  });
}

export function openExplorer(ctx, startPath = PATHS.myComputer) {
  const { wm, fs, registry, dialogs, menus, toDesktopPoint } = ctx;
  const history = [startPath];
  let index = 0;
  let view = 'icons';

  const body = document.createElement('div');
  body.className = 'xp-explorer';
  body.innerHTML = `
    <div class="xp-explorer-menubar"></div>
    <div class="xp-ie-toolbar">
      <button class="xp-tb" data-cmd="back"><span class="xp-tb-ico" data-icon="arrowLeft"></span>Back</button>
      <button class="xp-tb" data-cmd="forward" title="Forward"><span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <button class="xp-tb" data-cmd="up" title="Up"><span class="xp-tb-ico" data-icon="arrowUp"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="search"><span class="xp-tb-ico" data-icon="search"></span>Search</button>
      <button class="xp-tb" data-cmd="folders"><span class="xp-tb-ico" data-icon="folder"></span>Folders</button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="views"><span class="xp-tb-ico" data-icon="exe"></span>Views</button>
    </div>
    <div class="xp-ie-address"><label>Address</label><div class="xp-ie-url"><span class="xp-ie-url-ico"></span><input type="text" readonly></div><button class="xp-tb" data-cmd="go">Go</button></div>
    <div class="xp-explorer-main"><div class="xp-taskpane"></div><div class="xp-explorer-items" tabindex="0"></div></div>
    <div class="status-bar"><p class="status-bar-field xp-explorer-status"></p><p class="status-bar-field xp-explorer-place"></p></div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));
  const address = body.querySelector('.xp-ie-url input');
  const addressIcon = body.querySelector('.xp-ie-url-ico');
  const items = body.querySelector('.xp-explorer-items');
  const taskpane = body.querySelector('.xp-taskpane');
  const status = body.querySelector('.xp-explorer-status');
  const place = body.querySelector('.xp-explorer-place');
  const button = (cmd) => body.querySelector(`[data-cmd="${cmd}"]`);

  const win = wm.open({ appId: 'explorer', title: 'My Computer', icon: 'computer', width: 720, height: 500, minWidth: 420, minHeight: 280, content: body });
  const current = () => history[index];
  const currentNode = () => resolvePath(fs, current()) ?? fs.root;
  const selectedNode = () => currentNode().children?.find((c) => c.name === items.querySelector('.xp-item.selected')?.dataset.name);
  const notAvailable = () => dialogs.message({ title: 'Windows Explorer', kind: 'info', owner: win, text: 'This feature is not available in the demo.' });
  const viewItems = () => [
    { label: 'Icons', checked: view === 'icons', action: () => setView('icons') },
    { label: 'Details', checked: view === 'details', action: () => setView('details') },
  ];

  function navigate(path) {
    history.splice(index + 1);
    history.push(path);
    index = history.length - 1;
    render();
  }
  function go(delta) { index = Math.min(Math.max(index + delta, 0), history.length - 1); render(); }
  function setView(next) { view = next; render(); }
  function openNode(node) {
    if (node.open?.app === 'explorer') { navigate(node.open.payload.path); return; }
    if (node.open) { registry.launch(node.open.app, { ...(node.open.payload ?? {}), owner: win }); return; }
    if (node.children) navigate(node.path);
  }

  function itemEl(child) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'xp-item';
    el.dataset.name = child.name;
    el.append(iconEl(child.icon, view === 'details' ? 16 : 32));
    const label = document.createElement('span');
    label.className = 'xp-item-label';
    label.textContent = child.name;
    el.append(label);
    if (view === 'details') {
      const type = document.createElement('span');
      type.className = 'xp-item-type';
      type.textContent = TYPE_NAMES[child.kind] ?? 'File';
      el.append(type);
    }
    el.addEventListener('click', () => { items.querySelectorAll('.selected').forEach((s) => s.classList.remove('selected')); el.classList.add('selected'); });
    el.addEventListener('dblclick', () => openNode(child));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openNode(child); });
    return el;
  }

  function renderTaskPane(node) {
    const link = (label, action) => `<a href="#" data-action="${esc(action)}">${esc(label)}</a>`;
    const groups = [];
    if (node === fs.root) {
      groups.push(['System Tasks', [link('View system information', 'sysprops'), link('Add or remove programs', 'unavailable'), link('Change a setting', 'controlpanel')]]);
      groups.push(['Other Places', [link('My Network Places', 'unavailable'), link('My Documents', `nav:${PATHS.myDocuments}`), link('Control Panel', 'controlpanel')]]);
    } else if (node === fs.recycle) {
      groups.push(['Recycle Bin Tasks', [link('Empty the Recycle Bin', 'unavailable'), link('Restore all items', 'unavailable')]]);
      groups.push(['Other Places', [link('My Computer', `nav:${PATHS.myComputer}`), link('My Documents', `nav:${PATHS.myDocuments}`)]]);
    } else {
      const parent = parentPath(node.path);
      const parentLabel = parent === PATHS.myComputer ? 'My Computer' : parent.split('\\').pop();
      groups.push(['File and Folder Tasks', [link('Make a new folder', 'unavailable'), link('Publish this folder to the Web', 'unavailable'), link('Share this folder', 'unavailable')]]);
      groups.push(['Other Places', [link(parentLabel, `nav:${parent}`), link('My Documents', `nav:${PATHS.myDocuments}`), link('My Computer', `nav:${PATHS.myComputer}`)]]);
    }
    groups.push(['Details', [`<b>${esc(node.name)}</b><br>${TYPE_NAMES[node.kind] ?? 'File'}`]]);
    taskpane.innerHTML = groups.map(([title, lines]) =>
      `<div class="xp-taskpane-group"><div class="xp-taskpane-title">${title}</div><div class="xp-taskpane-body">${lines.map((l) => `<div>${l}</div>`).join('')}</div></div>`).join('');
  }

  function render() {
    const node = currentNode();
    address.value = node.path;
    addressIcon.replaceChildren(iconEl(node.icon, 16));
    win.setTitle(node.name);
    place.textContent = node.path.startsWith(PATHS.recycleBin) ? 'Recycle Bin' : 'My Computer';
    items.className = `xp-explorer-items xp-view-${view}`;
    items.innerHTML = view === 'details'
      ? '<div class="xp-item xp-item-header"><span class="xp-ico" style="width:16px;height:16px"></span><span class="xp-item-label">Name</span><span class="xp-item-type">Type</span></div>'
      : '';
    for (const child of node.children ?? []) items.append(itemEl(child));
    status.textContent = `${node.children?.length ?? 0} object(s)`;
    renderTaskPane(node);
    button('back').disabled = index === 0;
    button('forward').disabled = index >= history.length - 1;
    button('up').disabled = parentPath(node.path) === null;
  }

  attachMenubar(body.querySelector('.xp-explorer-menubar'), menus, {
    File: () => [
      { label: 'Open', disabled: !selectedNode(), action: () => { const n = selectedNode(); if (n) openNode(n); } },
      { separator: true },
      { label: 'Close', action: () => win.close() },
    ],
    Edit: [{ label: 'Select All', shortcut: 'Ctrl+A', action: () => items.querySelectorAll('.xp-item:not(.xp-item-header)').forEach((i) => i.classList.add('selected')) }],
    View: viewItems,
    Favorites: [{ label: 'Homepage', action: () => registry.launch('iexplore') }],
    Tools: [{ label: 'Folder Options...', action: notAvailable }],
    Help: [{ label: 'About Windows', action: () => registry.launch('sysprops') }],
  });
  taskpane.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-action]');
    if (!a) return;
    e.preventDefault();
    const action = a.dataset.action;
    if (action.startsWith('nav:')) navigate(action.slice(4));
    else if (action === 'unavailable') notAvailable();
    else registry.launch(action);
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    if (cmd === 'back') go(-1);
    else if (cmd === 'forward') go(1);
    else if (cmd === 'up') { const p = parentPath(current()); if (p !== null) navigate(p); }
    else if (cmd === 'views') menus.open(e.target.closest('[data-cmd]'), viewItems());
    else if (cmd === 'go') render();
    else notAvailable();
  });
  items.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { x, y } = toDesktopPoint(e.clientX, e.clientY);
    const node = currentNode();
    menus.openAt(x, y, [
      { label: 'View', action: () => menus.openAt(x, y, viewItems()) },
      { label: 'Refresh', action: render },
      { separator: true },
      { label: 'Properties', action: () => (node === fs.root ? registry.launch('sysprops') : notAvailable()) },
    ]);
  });

  render();
  return win;
}
```

- [ ] **Step 4: Run the Explorer tests to verify they pass**

Run: `npx vitest run src/xp/apps/Explorer.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Implement Notepad.js**

`src/xp/apps/Notepad.js`:

```js
import { attachMenubar } from '../Menu.js';

export function registerNotepad(registry) {
  registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: (ctx, payload = {}) => openNotepad(ctx, payload) });
}

export function openNotepad(ctx, { title = 'Untitled', text = '' } = {}) {
  const { wm, dialogs, menus } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-notepad';
  body.innerHTML = '<div class="xp-notepad-menubar"></div><textarea spellcheck="false" wrap="off"></textarea>';
  const textarea = body.querySelector('textarea');
  textarea.value = text;
  let dirty = false;
  let wordWrap = false;
  textarea.addEventListener('input', () => { dirty = true; });

  const win = wm.open({ appId: 'notepad', title: `${title} - Notepad`, icon: 'notepad', width: 560, height: 420, minWidth: 300, minHeight: 200, content: body });
  const info = (message) => dialogs.message({ title: 'Notepad', kind: 'info', owner: win, text: message });
  const saved = () => { dirty = false; return info('Saved to nowhere. This is a demo, but thanks for the edits.'); };

  const realClose = win.close;
  win.close = async () => {
    if (dirty) {
      const answer = await dialogs.message({ title: 'Notepad', kind: 'question', owner: win, buttons: ['Yes', 'No', 'Cancel'], text: `The text in the ${title} file has changed.\n\nDo you want to save the changes?` });
      if (answer === 'Cancel') return;
      if (answer === 'Yes') await saved();
    }
    realClose();
  };

  attachMenubar(body.querySelector('.xp-notepad-menubar'), menus, {
    File: [
      { label: 'New', shortcut: 'Ctrl+N', action: () => { textarea.value = ''; dirty = true; win.setTitle('Untitled - Notepad'); } },
      { label: 'Open...', shortcut: 'Ctrl+O', action: () => info('Open the files from My Documents instead.') },
      { label: 'Save', shortcut: 'Ctrl+S', action: saved },
      { label: 'Save As...', action: saved },
      { separator: true },
      { label: 'Page Setup...', disabled: true },
      { label: 'Print...', shortcut: 'Ctrl+P', disabled: true },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
      { separator: true },
      { label: 'Select All', shortcut: 'Ctrl+A', action: () => { textarea.focus(); textarea.select(); } },
      { label: 'Time/Date', shortcut: 'F5', action: () => { const at = textarea.selectionStart; const stamp = new Date().toLocaleString(); textarea.setRangeText(stamp, at, at, 'end'); dirty = true; } },
    ],
    Format: () => [
      { label: 'Word Wrap', checked: wordWrap, action: () => { wordWrap = !wordWrap; textarea.wrap = wordWrap ? 'soft' : 'off'; } },
      { label: 'Font...', disabled: true },
    ],
    View: [{ label: 'Status Bar', disabled: true }],
    Help: [{ label: 'Help Topics', disabled: true }, { separator: true }, { label: 'About Notepad', action: () => info('Notepad, recreated in about a hundred lines of JavaScript.') }],
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'F5') { e.preventDefault(); const at = textarea.selectionStart; textarea.setRangeText(new Date().toLocaleString(), at, at, 'end'); dirty = true; }
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saved(); }
  });
  setTimeout(() => textarea.focus(), 0);
  return win;
}
```

- [ ] **Step 6: Implement SystemProperties.js and misc.js**

`src/xp/apps/SystemProperties.js`:

```js
import { iconEl } from '../icons/index.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerSystemProperties(registry) {
  registry.register('sysprops', { name: 'System Properties', icon: 'computer', launch: openSystemProperties });
}

export function openSystemProperties(ctx) {
  const { wm, resume, repoUrl, openExternal } = ctx;
  const years = Math.max(1, new Date().getFullYear() - 2018);
  const body = document.createElement('div');
  body.className = 'xp-sysprops';
  body.innerHTML = `
    <menu role="tablist">
      <li role="tab" aria-selected="true"><a href="#general">General</a></li>
      <li role="tab"><a href="#hardware">Hardware</a></li>
      <li role="tab"><a href="#about">About</a></li>
    </menu>
    <div class="window" role="tabpanel" data-tab="general"><div class="xp-sysprops-grid">
      <span class="xp-sysprops-ico"></span>
      <div><b>System:</b><br>Stephen XP<br>Game Programmer Edition<br>Version ${new Date().getFullYear()}</div>
      <div><b>Registered to:</b><br>${esc(resume.displayName)}<br>${esc(resume.fullName)}<br>${esc(resume.contact.location)}</div>
      <div><b>Computer:</b><br>${esc(resume.title)}<br>${years}+ years of experience<br>${esc(resume.expertise[0])} inside<br>${resume.languages.length} languages installed</div>
    </div></div>
    <div class="window" role="tabpanel" data-tab="hardware" hidden>
      <p><b>Device Manager</b> — installed skills</p>
      <ul class="xp-devices">${resume.expertise.map((s) => `<li><span class="xp-dev-ico"></span>${esc(s)}</li>`).join('')}</ul>
    </div>
    <div class="window" role="tabpanel" data-tab="about" hidden>
      <p><b>XPcomputer</b> is an interactive resume built with three.js, plain JavaScript and XP.css.</p>
      <p>No Microsoft artwork, sounds or logos are used; everything is drawn or synthesized in code.</p>
      <p><a href="#" data-cmd="source">View the source on GitHub</a></p>
    </div>
    <div class="xp-msgbox-buttons xp-sysprops-buttons"><button class="default" data-cmd="ok">OK</button><button data-cmd="cancel">Cancel</button><button disabled>Apply</button></div>`;
  body.querySelector('.xp-sysprops-ico').append(iconEl('computer', 48));
  for (const holder of body.querySelectorAll('.xp-dev-ico')) holder.append(iconEl('exe', 16));

  const win = wm.open({ appId: 'sysprops', title: 'System Properties', icon: 'computer', dialog: true, width: 420, height: 470, content: body });
  body.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    e.preventDefault();
    const name = tab.querySelector('a').getAttribute('href').slice(1);
    for (const t of body.querySelectorAll('[role="tab"]')) t.setAttribute('aria-selected', String(t === tab));
    for (const panel of body.querySelectorAll('[role="tabpanel"]')) panel.hidden = panel.dataset.tab !== name;
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (cmd === 'ok' || cmd === 'cancel') win.close();
    if (cmd === 'source') { e.preventDefault(); openExternal(repoUrl); }
  });
  return win;
}
```

`src/xp/apps/misc.js`:

```js
/** Small apps that are dialogs or side effects rather than windows. */
export function registerMisc(registry) {
  registry.register('error', {
    name: 'Error', icon: 'errorIcon',
    launch: (ctx, { title = 'Windows', text = '', buttons = ['OK'], owner = null } = {}) => ctx.dialogs.message({ title, text, kind: 'error', buttons, owner }),
  });
  registry.register('external', { name: 'Open link', icon: 'url', launch: (ctx, { url }) => ctx.openExternal(url) });
  registry.register('controlpanel', {
    name: 'Control Panel', icon: 'controlpanel',
    launch: (ctx) => ctx.dialogs.message({ title: 'Restrictions', kind: 'error', text: 'This operation has been cancelled due to restrictions in effect on this computer. Please contact your system administrator (Stephen).' }),
  });
  registry.register('help', {
    name: 'Help and Support', icon: 'help',
    launch: (ctx) => {
      const body = document.createElement('div');
      body.className = 'xp-help';
      body.innerHTML = `
        <h3>Help and Support Center</h3>
        <p>This is ${ctx.resume.displayName}'s interactive resume. The computer, the operating system and the games are recreated in plain JavaScript.</p>
        <p><b>Where to look</b></p>
        <ul><li>Internet Explorer: homepage and the PDF resume</li><li>My Documents &gt; Projects: one text file per job</li><li>Start &gt; All Programs &gt; Games</li></ul>
        <p><b>Keys</b>: Escape leaves the computer (3D mode), Alt+F4 closes a window, F2 starts a new game.</p>
        <p><a href="#" data-cmd="source">Source code on GitHub</a></p>`;
      body.addEventListener('click', (e) => { if (e.target.closest('[data-cmd="source"]')) { e.preventDefault(); ctx.openExternal(ctx.repoUrl); } });
      return ctx.wm.open({ appId: 'help', title: 'Help and Support Center', icon: 'help', width: 520, height: 400, content: body });
    },
  });
  for (const [id, name] of [['winmine', 'Minesweeper'], ['sol', 'Solitaire'], ['pinball', 'Pinball']]) {
    registry.register(id, {
      name, icon: { winmine: 'mine', sol: 'cards', pinball: 'pinball' }[id],
      launch: (ctx) => ctx.dialogs.message({ title: name, kind: 'info', text: `${name} installs in a later update. Check back soon!` }),
    });
  }
}
```

- [ ] **Step 7: Append the Explorer, Notepad, System Properties and Help styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Explorer ---- */
.xp-explorer { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.xp-explorer-main { flex: 1; display: flex; min-height: 0; border-top: 1px solid #d8d2bd; }
.xp-taskpane { width: 190px; flex: none; overflow-y: auto; padding: 10px; background: linear-gradient(#7aa7e6, #6f97dc); font-size: 11px; }
.xp-taskpane-group { background: #d6dff7; border-radius: 4px 4px 0 0; margin-bottom: 10px; overflow: hidden; }
.xp-taskpane-title { background: linear-gradient(90deg, #fff, #c6d3f7); color: #0c327d; font-weight: bold; padding: 4px 8px; }
.xp-taskpane-body { padding: 6px 10px; line-height: 1.7; color: #215dc6; }
.xp-taskpane-body a { color: #215dc6; text-decoration: none; }
.xp-taskpane-body a:hover { color: #428eff; text-decoration: underline; }
.xp-explorer-items { flex: 1; overflow: auto; background: #fff; padding: 10px; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 4px 8px; outline: none; }
.xp-item { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 84px; padding: 6px 2px; border: 1px solid transparent; background: none; box-shadow: none; min-width: 0; min-height: 0; font: inherit; font-size: 11px; color: #000; cursor: default; border-radius: 0; }
.xp-item-label { text-align: center; word-break: break-word; line-height: 1.2; }
.xp-item.selected { background: #316ac5; color: #fff; }
.xp-item:hover:not(.selected) { border-color: #c6d3f7; background: #eef3fc; }
.xp-view-details { flex-direction: column; flex-wrap: nowrap; gap: 0; padding: 4px; }
.xp-view-details .xp-item { flex-direction: row; width: 100%; padding: 2px 4px; gap: 8px; }
.xp-view-details .xp-item-label { flex: 1; text-align: left; }
.xp-view-details .xp-item-type { width: 120px; color: #555; text-align: left; }
.xp-item-header { border-bottom: 1px solid #d8d2bd; color: #444; pointer-events: none; }

/* ---- Notepad ---- */
.xp-notepad { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.xp-notepad textarea { flex: 1; resize: none; border: 0; outline: 0; margin: 0; padding: 4px; font: 13px/1.35 "Lucida Console", Consolas, monospace; box-shadow: none; border-radius: 0; background: #fff; }

/* ---- System Properties & Help ---- */
.xp-sysprops { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 10px; font-size: 11px; }
.xp-sysprops [role="tabpanel"] { flex: 1; overflow: auto; padding: 12px; }
.xp-sysprops-grid { display: grid; grid-template-columns: 56px 1fr; gap: 12px 10px; line-height: 1.6; }
.xp-sysprops-grid .xp-sysprops-ico { grid-row: span 3; }
.xp-devices { list-style: none; padding: 0; margin: 6px 0; columns: 2; }
.xp-devices li { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
.xp-sysprops-buttons { justify-content: flex-end; padding-top: 10px; }
.xp-help { padding: 12px 16px; font-size: 12px; line-height: 1.5; overflow: auto; background: #fff; flex: 1; }
.xp-help h3 { color: #0c327d; margin-top: 0; }
```

- [ ] **Step 8: Run the suite and stage**

Run: `npm test` → all green.

```bash
git add src/xp/apps/Explorer.js src/xp/apps/Explorer.test.js src/xp/apps/Notepad.js src/xp/apps/SystemProperties.js src/xp/apps/misc.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: Explorer over the fake drive, Notepad, System Properties and helper apps`

---
### Task 9: Desktop icons, taskbar, Start menu

**Files:**
- Create: `src/xp/Desktop.js`, `src/xp/Taskbar.js`, `src/xp/Taskbar.test.js`, `src/xp/StartMenu.js`
- Modify: `src/styles/xp-overrides.css` (append desktop, taskbar, start menu sections)

**Interfaces:**
- Consumes: `wm`, `sounds`, `iconEl`.
- Produces: `createDesktopIcons(containerEl, [{ id, label, icon, corner?, launch() }]) → { select(buttonEl|null), clear(), buttons }`.
- Produces: `formatClock(date) → '3:07 PM'`, `createTaskbar(rootEl, { wm, sounds, onStart, now }) → { el, tick(), showBalloon({ title, text, onClick, timeout }), hideBalloon(), setStartActive(bool), destroy() }`.
- Produces: `createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) → { open(), close(), toggle(), isOpen }` where `left`/`right` are `[{ label, sublabel?, icon, action } | { separator: true }]` and `allPrograms` is `[{ label, icon, action?, children?: [...] }]`.

- [ ] **Step 1: Write the desktop icon grid**

`src/xp/Desktop.js`:

```js
import { iconEl } from './icons/index.js';

/** Desktop icon column. Single click selects, double click / Enter launches, arrows move. */
export function createDesktopIcons(container, defs) {
  container.classList.add('xp-icons');
  let selected = null;
  const buttons = defs.map((def) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `xp-desktop-icon${def.corner ? ' xp-desktop-icon-corner' : ''}`;
    b.dataset.id = def.id;
    b.append(iconEl(def.icon, 32));
    const label = document.createElement('span');
    label.className = 'xp-desktop-icon-label';
    label.textContent = def.label;
    b.append(label);
    b.addEventListener('click', (e) => { e.stopPropagation(); select(b); });
    b.addEventListener('dblclick', () => def.launch());
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') def.launch(); });
    container.append(b);
    return b;
  });
  function select(b) {
    selected?.classList.remove('selected');
    selected = b;
    b?.classList.add('selected');
    b?.focus();
  }
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = buttons.indexOf(selected);
    select(buttons[(i + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]);
  });
  return { select, clear: () => select(null), buttons };
}
```

- [ ] **Step 2: Write the failing taskbar test**

`src/xp/Taskbar.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from './WindowManager.js';
import { createTaskbar, formatClock } from './Taskbar.js';

describe('formatClock', () => {
  it('formats like the XP tray', () => {
    expect(formatClock(new Date(2026, 8, 7, 15, 7))).toBe('3:07 PM');
    expect(formatClock(new Date(2026, 8, 7, 0, 0))).toBe('12:00 AM');
    expect(formatClock(new Date(2026, 8, 7, 12, 30))).toBe('12:30 PM');
  });
});

describe('createTaskbar', () => {
  let wm, bar, played, started;
  const sounds = { available: true, play: (n) => played.push(n), isMuted: () => false, toggleMuted: () => false };
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div><div id="bar"></div>';
    wm = createWindowManager(document.querySelector('#layer'));
    played = [];
    started = 0;
    bar = createTaskbar(document.querySelector('#bar'), { wm, sounds, onStart: () => started++, now: () => new Date(2026, 8, 7, 9, 5) });
  });

  it('shows the clock and fires onStart', () => {
    expect(bar.el.querySelector('.xp-clock').textContent).toBe('9:05 AM');
    bar.el.querySelector('.xp-start').click();
    expect(started).toBe(1);
  });

  it('mirrors windows as task buttons, skipping dialogs', () => {
    const a = wm.open({ appId: 'a', title: 'Notepad' });
    wm.open({ appId: 'dialog', title: 'Error', dialog: true });
    const buttons = () => [...bar.el.querySelectorAll('.xp-task')];
    expect(buttons().map((b) => b.textContent)).toEqual(['Notepad']);
    a.focus();
    expect(buttons()[0].classList.contains('active')).toBe(true);
    a.minimize();
    expect(buttons()[0].classList.contains('minimized')).toBe(true);
    buttons()[0].click();
    expect(a.isMinimized).toBe(false);
    a.setTitle('todo.txt - Notepad');
    expect(buttons()[0].textContent).toBe('todo.txt - Notepad');
    a.close();
    expect(buttons()).toHaveLength(0);
  });

  it('shows a balloon tip that runs its action on click and auto hides', () => {
    vi.useFakeTimers();
    let clicked = 0;
    bar.showBalloon({ title: 'Hi', text: 'Click me', onClick: () => clicked++, timeout: 1000 });
    const balloon = bar.el.querySelector('.xp-balloon');
    expect(balloon.hidden).toBe(false);
    expect(played).toContain('balloon');
    balloon.querySelector('.xp-balloon-text').click();
    expect(clicked).toBe(1);
    expect(balloon.hidden).toBe(true);
    bar.showBalloon({ title: 'Hi', text: 'Again', timeout: 1000 });
    vi.advanceTimersByTime(1100);
    expect(balloon.hidden).toBe(true);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 3: Run it to verify it fails, then implement Taskbar.js**

Run: `npx vitest run src/xp/Taskbar.test.js` → FAIL (module missing).

`src/xp/Taskbar.js`:

```js
import { iconEl } from './icons/index.js';

export function formatClock(date) {
  const hours = date.getHours();
  const h12 = hours % 12 || 12;
  return `${h12}:${String(date.getMinutes()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function createTaskbar(rootEl, { wm, sounds, onStart, now = () => new Date() }) {
  rootEl.classList.add('xp-taskbar');
  rootEl.innerHTML = `
    <button class="xp-start" type="button"><span class="xp-start-flag"><i></i><i></i><i></i><i></i></span>start</button>
    <div class="xp-tasks"></div>
    <div class="xp-tray"><button class="xp-tray-mute" type="button" title="Volume"></button><span class="xp-clock"></span></div>
    <div class="xp-balloon" hidden><button class="xp-balloon-close" type="button" aria-label="Close">×</button><div class="xp-balloon-title"></div><div class="xp-balloon-text"></div></div>`;
  const start = rootEl.querySelector('.xp-start');
  const tasks = rootEl.querySelector('.xp-tasks');
  const clock = rootEl.querySelector('.xp-clock');
  const mute = rootEl.querySelector('.xp-tray-mute');
  const balloon = rootEl.querySelector('.xp-balloon');

  start.addEventListener('click', (e) => { e.stopPropagation(); onStart(); });

  const renderMute = () => {
    mute.replaceChildren(iconEl(sounds.isMuted() ? 'speakerMuted' : 'speaker', 16));
    mute.title = sounds.isMuted() ? 'Sound is muted (click to unmute)' : 'Volume (click to mute)';
  };
  if (sounds.available) { renderMute(); mute.addEventListener('click', () => { sounds.toggleMuted(); renderMute(); sounds.play('click'); }); }
  else mute.hidden = true;

  const tick = () => { const d = now(); clock.textContent = formatClock(d); clock.title = d.toDateString(); };
  tick();
  const clockTimer = setInterval(tick, 15000);

  const buttons = new Map();
  const renderTasks = () => {
    for (const [win, b] of buttons) {
      b.classList.toggle('active', win.isFocused && !win.isMinimized);
      b.classList.toggle('minimized', win.isMinimized);
      b.querySelector('.xp-task-label').textContent = win.title;
    }
  };
  wm.on('open', (win) => {
    if (win.isDialog) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-task';
    b.append(iconEl(win.icon, 16));
    const label = document.createElement('span');
    label.className = 'xp-task-label';
    label.textContent = win.title;
    b.append(label);
    b.addEventListener('click', () => {
      if (win.isMinimized) win.restore();
      else if (win.isFocused) win.minimize();
      else win.focus();
    });
    tasks.append(b);
    buttons.set(win, b);
    renderTasks();
  });
  wm.on('close', (win) => { buttons.get(win)?.remove(); buttons.delete(win); renderTasks(); });
  for (const ev of ['focus', 'minimize', 'restore', 'title']) wm.on(ev, renderTasks);

  let balloonTimer = null;
  function hideBalloon() { balloon.hidden = true; clearTimeout(balloonTimer); }
  function showBalloon({ title, text, onClick, timeout = 8000 }) {
    balloon.querySelector('.xp-balloon-title').textContent = title;
    balloon.querySelector('.xp-balloon-text').textContent = text;
    balloon.hidden = false;
    sounds.play('balloon');
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(hideBalloon, timeout);
    balloon.onclick = (e) => { hideBalloon(); if (!e.target.closest('.xp-balloon-close')) onClick?.(); };
  }

  return { el: rootEl, tick, showBalloon, hideBalloon, setStartActive: (on) => start.classList.toggle('active', on), destroy: () => clearInterval(clockTimer) };
}
```

Run: `npx vitest run src/xp/Taskbar.test.js` → PASS, 4 tests.

- [ ] **Step 4: Implement StartMenu.js**

`src/xp/StartMenu.js`:

```js
import { iconEl } from './icons/index.js';

export function createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) {
  rootEl.classList.add('xp-startmenu');
  rootEl.hidden = true;
  rootEl.innerHTML = `
    <div class="xp-sm-header"><span class="xp-sm-avatar"></span><span class="xp-sm-user"></span></div>
    <div class="xp-sm-columns"><div class="xp-sm-left"></div><div class="xp-sm-right"></div></div>
    <div class="xp-sm-footer">
      <button type="button" class="xp-sm-footer-btn" data-cmd="logoff"><span class="xp-sm-footer-ico"></span>Log Off</button>
      <button type="button" class="xp-sm-footer-btn" data-cmd="turnoff"><span class="xp-sm-footer-ico"></span>Turn Off Computer</button>
    </div>
    <div class="xp-sm-flyouts"></div>`;
  rootEl.querySelector('.xp-sm-avatar').append(iconEl('user', 40));
  rootEl.querySelector('.xp-sm-user').textContent = userName;
  rootEl.querySelectorAll('.xp-sm-footer-ico')[0].append(iconEl('logoff', 22));
  rootEl.querySelectorAll('.xp-sm-footer-ico')[1].append(iconEl('power', 22));
  const leftCol = rootEl.querySelector('.xp-sm-left');
  const rightCol = rootEl.querySelector('.xp-sm-right');
  const flyouts = rootEl.querySelector('.xp-sm-flyouts');
  let isOpen = false;

  function row(item, { iconSize = 24, arrow = false } = {}) {
    if (item.separator) { const sep = document.createElement('div'); sep.className = 'xp-sm-sep'; return sep; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-sm-item';
    b.append(iconEl(item.icon, iconSize));
    const text = document.createElement('span');
    text.className = 'xp-sm-text';
    text.innerHTML = `<span class="xp-sm-label"></span>${item.sublabel ? '<span class="xp-sm-sublabel"></span>' : ''}`;
    text.querySelector('.xp-sm-label').textContent = item.label;
    if (item.sublabel) text.querySelector('.xp-sm-sublabel').textContent = item.sublabel;
    b.append(text);
    if (arrow || item.children) { const a = document.createElement('span'); a.className = 'xp-sm-arrow'; a.textContent = '▸'; b.append(a); }
    return b;
  }

  function clearFlyouts(fromLevel = 0) {
    [...flyouts.children].filter((f) => Number(f.dataset.level) >= fromLevel).forEach((f) => f.remove());
  }
  function showFlyout(items, level, anchorEl) {
    clearFlyouts(level);
    const panel = document.createElement('div');
    panel.className = 'xp-sm-flyout';
    panel.dataset.level = String(level);
    for (const item of items) {
      const el = row(item, { iconSize: 16 });
      if (item.children) el.addEventListener('mouseenter', () => showFlyout(item.children, level + 1, el));
      else if (item.action) el.addEventListener('mouseenter', () => clearFlyouts(level + 1));
      if (!item.separator && item.action) el.addEventListener('click', () => { close(); item.action(); });
      panel.append(el);
    }
    flyouts.append(panel);
    const menuRect = rootEl.getBoundingClientRect();
    const scale = menuRect.width / rootEl.offsetWidth || 1;
    const anchorRect = anchorEl.getBoundingClientRect();
    panel.style.left = `${level === 0 ? rootEl.offsetWidth - 4 : rootEl.offsetWidth + level * 190}px`;
    panel.style.bottom = `${Math.max(0, (menuRect.bottom - anchorRect.bottom) / scale - 2)}px`;
  }

  for (const item of left) {
    const el = row(item, { iconSize: item.sublabel ? 32 : 24 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    leftCol.append(el);
  }
  const all = row({ label: 'All Programs', icon: 'exe' }, { arrow: true });
  all.classList.add('xp-sm-allprograms');
  all.addEventListener('click', () => showFlyout(allPrograms, 0, all));
  all.addEventListener('mouseenter', () => showFlyout(allPrograms, 0, all));
  leftCol.append(all);
  for (const item of right) {
    const el = row(item, { iconSize: 22 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    rightCol.append(el);
  }
  rootEl.querySelector('[data-cmd="logoff"]').addEventListener('click', () => { close(); onLogOff(); });
  rootEl.querySelector('[data-cmd="turnoff"]').addEventListener('click', () => { close(); onTurnOff(); });
  rootEl.querySelector('.xp-sm-columns').addEventListener('mouseenter', (e) => { if (!e.target.closest('.xp-sm-allprograms')) clearFlyouts(0); }, true);
  rootEl.querySelector('.xp-sm-right').addEventListener('mouseenter', () => clearFlyouts(0));

  function onDocumentDown(e) { if (isOpen && !rootEl.contains(e.target) && !e.target.closest('.xp-start')) close(); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    if (isOpen) return;
    isOpen = true;
    rootEl.hidden = false;
    sounds?.play('menu');
    document.addEventListener('pointerdown', onDocumentDown, true);
    document.addEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: true }));
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    rootEl.hidden = true;
    clearFlyouts(0);
    document.removeEventListener('pointerdown', onDocumentDown, true);
    document.removeEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: false }));
  }
  return { open, close, toggle: () => (isOpen ? close() : open()), get isOpen() { return isOpen; } };
}
```

- [ ] **Step 5: Append the desktop, taskbar and Start menu styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Desktop icons ---- */
.xp-icons { position: absolute; inset: 0; padding: 6px; display: flex; flex-direction: column; align-content: flex-start; gap: 6px; pointer-events: none; }
.xp-desktop-icon { pointer-events: auto; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 76px; padding: 4px 2px; border: 1px solid transparent; background: none; box-shadow: none; min-width: 0; min-height: 0; font: inherit; font-size: 11px; color: #fff; text-shadow: 1px 1px 2px #000; cursor: default; border-radius: 0; }
.xp-desktop-icon-label { text-align: center; line-height: 1.2; }
.xp-desktop-icon.selected { background: rgba(49,106,197,.55); border-color: rgba(255,255,255,.5); }
.xp-desktop-icon.selected .xp-ico { filter: brightness(.7) sepia(.3) hue-rotate(180deg); }
.xp-desktop-icon:focus { outline: 1px dotted #fff; outline-offset: -2px; }
.xp-desktop-icon-corner { position: absolute; right: 6px; bottom: 6px; }

/* ---- Taskbar ---- */
.xp-taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 30px; display: flex; align-items: stretch; background: linear-gradient(#3168d5 0%, #4993e6 4%, #2b5fd3 8%, #245edb 60%, #1f4fbf 100%); border-top: 1px solid #0f2f8a; font-size: 11px; color: #fff; user-select: none; z-index: 99999; }
.xp-start { display: flex; align-items: center; gap: 6px; padding: 0 22px 0 8px; margin: 0; border: 0; border-radius: 0 12px 12px 0; background: linear-gradient(#3d9b3d, #2f7d2f 60%, #266b26); color: #fff; font: italic bold 15px/1 "Trebuchet MS", Tahoma, sans-serif; text-shadow: 1px 1px 1px #123; box-shadow: inset 1px 1px 0 rgba(255,255,255,.35), 2px 0 4px rgba(0,0,0,.35); min-width: 0; min-height: 0; cursor: default; }
.xp-start:hover, .xp-start.active { background: linear-gradient(#57b857, #3d9b3d 60%, #2f7d2f); }
.xp-start-flag { display: grid; grid-template-columns: 8px 8px; gap: 1px; transform: skewY(-8deg); }
.xp-start-flag i { display: block; width: 8px; height: 7px; border-radius: 1px; }
.xp-start-flag i:nth-child(1) { background: #f35325; } .xp-start-flag i:nth-child(2) { background: #81bc06; }
.xp-start-flag i:nth-child(3) { background: #05a6f0; } .xp-start-flag i:nth-child(4) { background: #ffba08; }
.xp-tasks { flex: 1; display: flex; align-items: center; gap: 3px; padding: 0 6px; overflow: hidden; }
.xp-task { display: flex; align-items: center; gap: 6px; height: 22px; width: 160px; padding: 0 8px; border: 1px solid #1a3f9e; border-radius: 3px; background: linear-gradient(#4b8ef0, #3a7ae0); color: #fff; font: inherit; box-shadow: inset 1px 1px 0 rgba(255,255,255,.3); min-width: 0; min-height: 0; cursor: default; }
.xp-task-label { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.xp-task.active { background: linear-gradient(#1e50b8, #245edb); box-shadow: inset 1px 1px 3px rgba(0,0,0,.5); font-weight: bold; }
.xp-task.minimized { font-weight: normal; opacity: .9; }
.xp-tray { display: flex; align-items: center; gap: 8px; padding: 0 12px 0 10px; background: linear-gradient(#1290e9, #0d7fd6 60%, #0a6fc4); border-left: 1px solid #0a4fa5; box-shadow: inset 2px 0 3px rgba(0,0,0,.25); }
.xp-tray-mute { border: 0; background: none; box-shadow: none; min-width: 0; min-height: 0; padding: 2px; cursor: default; }
.xp-clock { font-size: 11px; }
.xp-balloon { position: absolute; right: 8px; bottom: 34px; width: 280px; background: #ffffe1; color: #000; border: 1px solid #000; border-radius: 8px; padding: 10px 12px 10px 12px; box-shadow: 2px 2px 4px rgba(0,0,0,.35); font-size: 11px; cursor: default; }
.xp-balloon::after { content: ""; position: absolute; right: 30px; bottom: -12px; border: 12px solid transparent; border-top-color: #ffffe1; border-bottom: 0; }
.xp-balloon-title { font-weight: bold; margin-bottom: 4px; padding-right: 16px; }
.xp-balloon-close { position: absolute; right: 6px; top: 4px; border: 1px solid #888; background: #fff; width: 14px; height: 14px; padding: 0; line-height: 10px; font-size: 11px; min-width: 0; min-height: 0; box-shadow: none; border-radius: 0; }

/* ---- Start menu ---- */
.xp-startmenu { position: absolute; left: 0; bottom: 30px; width: 400px; background: #fff; border: 1px solid #0f2f8a; border-radius: 6px 6px 0 0; box-shadow: 3px 3px 6px rgba(0,0,0,.4); font-size: 11px; color: #000; z-index: 99998; user-select: none; }
.xp-sm-header { display: flex; align-items: center; gap: 8px; height: 56px; padding: 0 10px; background: linear-gradient(#245edb, #3a7ae0 40%, #2b5fd3); border-radius: 6px 6px 0 0; color: #fff; font-weight: bold; font-size: 14px; text-shadow: 1px 1px 1px #123; }
.xp-sm-avatar { display: grid; place-items: center; width: 44px; height: 44px; background: #fff; border: 2px solid #9db9e4; border-radius: 4px; }
.xp-sm-columns { display: flex; border-top: 2px solid #f0a028; }
.xp-sm-left { width: 200px; background: #fff; padding: 6px 3px; display: flex; flex-direction: column; }
.xp-sm-right { width: 200px; background: #d3e5fa; border-left: 1px solid #95bdee; padding: 6px 3px; display: flex; flex-direction: column; }
.xp-sm-item { display: flex; align-items: center; gap: 6px; width: 100%; padding: 4px 6px; border: 0; background: none; box-shadow: none; min-width: 0; min-height: 0; font: inherit; color: #000; text-align: left; cursor: default; border-radius: 0; }
.xp-sm-item:hover { background: #316ac5; color: #fff; }
.xp-sm-text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.xp-sm-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-sm-item:has(.xp-sm-sublabel) .xp-sm-label { font-weight: bold; }
.xp-sm-sublabel { color: #6a7d9c; font-size: 10px; }
.xp-sm-item:hover .xp-sm-sublabel { color: #d8e6fb; }
.xp-sm-right .xp-sm-item { font-weight: bold; color: #0c327d; }
.xp-sm-right .xp-sm-item:hover { color: #fff; }
.xp-sm-sep { height: 1px; margin: 4px 6px; background: linear-gradient(90deg, transparent, #b8c8e0, transparent); }
.xp-sm-allprograms { margin-top: auto; font-weight: bold; }
.xp-sm-arrow { margin-left: auto; color: #3a7d2f; }
.xp-sm-footer { display: flex; justify-content: flex-end; gap: 4px; padding: 6px 8px; background: linear-gradient(#3a7ae0, #245edb); border-radius: 0 0 0 0; }
.xp-sm-footer-btn { display: flex; align-items: center; gap: 4px; border: 0; background: none; box-shadow: none; min-width: 0; min-height: 0; padding: 2px 6px; color: #fff; font: inherit; cursor: default; border-radius: 3px; }
.xp-sm-footer-btn:hover { background: rgba(255,255,255,.2); }
.xp-sm-flyout { position: absolute; width: 190px; background: #fff; border: 1px solid #0f2f8a; box-shadow: 3px 3px 6px rgba(0,0,0,.4); padding: 2px; border-left: 3px solid #245edb; }
.xp-sm-flyout .xp-sm-item { padding: 3px 6px; }
```

- [ ] **Step 6: Run the suite and stage**

Run: `npm test` → all green.

```bash
git add src/xp/Desktop.js src/xp/Taskbar.js src/xp/Taskbar.test.js src/xp/StartMenu.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: desktop icons, Luna taskbar with tray clock and balloon tips, Start menu with flyouts`

---
### Task 10: Boot, shutdown, log off, stand by

**Files:**
- Create: `src/xp/Boot.js`, `src/xp/Boot.test.js`
- Modify: `src/styles/xp-overrides.css` (append boot section)

**Interfaces:**
- Consumes: `sounds` (`play`, `unlock`), `iconEl`.
- Produces: `createBoot(screenEl, { sounds, reducedMotion, onState(state), onPowerRequest() }) → boot` with `boot.powerOn() → Promise`, `boot.shutdown({ restart }) → Promise`, `boot.standBy()`, `boot.logOff() → Promise` (resolves after the user clicks the logon tile and the welcome screen finishes), `boot.state` ∈ `off | booting | on | shutting-down | standby | logon`, `boot.el`. Clicking the overlay skips the current boot phase, wakes from stand by, or calls `onPowerRequest` when off.

- [ ] **Step 1: Write the failing test**

`src/xp/Boot.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBoot } from './Boot.js';

describe('boot sequence', () => {
  let screen, boot, played, states, powerRequests;
  const layer = () => screen.querySelector('.xp-boot');
  const visible = () => [...layer().children].filter((el) => !el.hidden).map((el) => el.className.split(' ')[0]);
  const skipAll = async () => { const p = boot.powerOn(); for (let i = 0; i < 3; i++) { layer().click(); await vi.advanceTimersByTimeAsync(0); } await p; };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="screen"></div>';
    screen = document.querySelector('#screen');
    played = []; states = []; powerRequests = 0;
    boot = createBoot(screen, { sounds: { play: (n) => played.push(n), unlock() {} }, onState: (s) => states.push(s), onPowerRequest: () => powerRequests++ });
  });
  afterEach(() => vi.useRealTimers());

  it('starts off, asks for power on click, then walks bios -> logo -> welcome -> on', async () => {
    expect(boot.state).toBe('off');
    expect(visible()).toEqual(['xp-off']);
    layer().click();
    expect(powerRequests).toBe(1);
    const done = boot.powerOn();
    expect(boot.state).toBe('booting');
    expect(visible()).toEqual(['xp-bios']);
    await vi.advanceTimersByTimeAsync(9 * 160 + 400 + 10);
    expect(visible()).toEqual(['xp-bootlogo']);
    await vi.advanceTimersByTimeAsync(2510);
    expect(visible()).toEqual(['xp-welcome']);
    await vi.advanceTimersByTimeAsync(1010);
    await done;
    expect(boot.state).toBe('on');
    expect(layer().hidden).toBe(true);
    expect(played).toEqual(['startup']);
    expect(states).toEqual(['booting', 'on']);
  });

  it('skips phases on click', async () => {
    const done = boot.powerOn();
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toEqual(['xp-bootlogo']);
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toEqual(['xp-welcome']);
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(boot.state).toBe('on');
  });

  it('shuts down to black and can restart', async () => {
    await skipAll();
    const off = boot.shutdown();
    expect(boot.state).toBe('shutting-down');
    expect(visible()).toEqual(['xp-shutdown']);
    await vi.advanceTimersByTimeAsync(1810);
    await off;
    expect(boot.state).toBe('off');
    expect(visible()).toEqual(['xp-off']);
    expect(played).toContain('shutdown');
    const restart = boot.powerOn();
    expect(boot.state).toBe('booting');
    for (let i = 0; i < 3; i++) { layer().click(); await vi.advanceTimersByTimeAsync(0); }
    await restart;
    expect(boot.state).toBe('on');
  });

  it('stands by until a click', async () => {
    await skipAll();
    boot.standBy();
    expect(boot.state).toBe('standby');
    expect(visible()).toEqual(['xp-off']);
    layer().click();
    expect(boot.state).toBe('on');
    expect(layer().hidden).toBe(true);
  });

  it('logs off to the logon screen and comes back when the user tile is clicked', async () => {
    await skipAll();
    const back = boot.logOff();
    expect(boot.state).toBe('logon');
    await vi.advanceTimersByTimeAsync(1210);
    expect(visible()).toEqual(['xp-logon']);
    screen.querySelector('.xp-logon-user').click();
    await vi.advanceTimersByTimeAsync(810);
    await back;
    expect(boot.state).toBe('on');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/Boot.test.js`
Expected: FAIL — cannot resolve `./Boot.js`.

- [ ] **Step 3: Implement Boot.js**

`src/xp/Boot.js`:

```js
import { iconEl } from './icons/index.js';

const BIOS_LINES = [
  'XPcomputer BIOS v1.0   (C) 2026 Stephen Tse',
  'CPU: Game Programmer @ 3.0 GHz',
  'Memory Test: 6+ years of experience ..... OK',
  '',
  'Detecting Primary Master   ... resume.pdf',
  'Detecting Primary Slave    ... projects.txt',
  'Detecting Secondary Master ... none',
  '',
  'Booting from C: ...',
];

export function createBoot(screenEl, { sounds, reducedMotion = false, onState, onPowerRequest } = {}) {
  const layer = document.createElement('div');
  layer.className = 'xp-boot';
  layer.innerHTML = `
    <pre class="xp-bios" hidden></pre>
    <div class="xp-bootlogo" hidden>
      <div class="xp-bootlogo-brand"><span class="xp-flag"><i></i><i></i><i></i><i></i></span><span class="xp-bootlogo-text">Windows <b>XP</b></span></div>
      <div class="xp-progress"><i></i><i></i><i></i></div>
      <div class="xp-bootlogo-foot">Stephen Tse Edition</div>
    </div>
    <div class="xp-welcome" hidden><div class="xp-welcome-text">welcome</div></div>
    <div class="xp-logon" hidden>
      <div class="xp-logon-head">To begin, click your user name</div>
      <button type="button" class="xp-logon-user"><span class="xp-logon-avatar"></span><span>Stephen</span></button>
    </div>
    <div class="xp-shutdown" hidden><div class="xp-shutdown-text">Windows is shutting down...</div></div>
    <div class="xp-off" hidden><span class="xp-off-hint">click to turn on</span></div>`;
  layer.querySelector('.xp-logon-avatar').append(iconEl('user', 40));
  screenEl.append(layer);

  const panes = Object.fromEntries(['bios', 'bootlogo', 'welcome', 'logon', 'shutdown', 'off'].map((k) => [k, layer.querySelector(`.xp-${k}`)]));
  const shutdownText = panes.shutdown.querySelector('.xp-shutdown-text');
  const speed = reducedMotion ? 0.2 : 1;
  let state = 'off';
  let skipRequested = false;
  let resolveWait = null;
  let resolveLogon = null;

  const setState = (next) => { state = next; layer.dataset.state = next; onState?.(next); };
  const showOnly = (name) => {
    for (const [key, el] of Object.entries(panes)) el.hidden = key !== name;
    layer.hidden = name === null;
  };
  const wait = (ms) => new Promise((resolve) => {
    if (skipRequested) { resolve(); return; }
    resolveWait = resolve;
    setTimeout(() => { if (resolveWait === resolve) { resolveWait = null; resolve(); } }, Math.round(ms * speed));
  });
  const requestSkip = () => { skipRequested = true; const r = resolveWait; resolveWait = null; r?.(); };
  const phase = async (name, run) => { skipRequested = false; showOnly(name); await run(); };
  const finishBoot = () => { showOnly(null); setState('on'); sounds?.play('startup'); };

  layer.addEventListener('click', () => {
    if (state === 'booting' || state === 'logon' || state === 'shutting-down') requestSkip();
    else if (state === 'standby') wake();
    else if (state === 'off') onPowerRequest?.();
  });
  panes.logon.querySelector('.xp-logon-user').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (state !== 'logon' || panes.logon.hidden) return;
    await phase('welcome', () => wait(800));
    finishBoot();
    resolveLogon?.();
    resolveLogon = null;
  });

  async function powerOn() {
    if (state !== 'off') return;
    setState('booting');
    sounds?.unlock();
    await phase('bios', async () => {
      panes.bios.textContent = '';
      for (const line of BIOS_LINES) { panes.bios.textContent += `${line}\n`; await wait(160); }
      await wait(400);
    });
    await phase('bootlogo', () => wait(2500));
    await phase('welcome', () => wait(1000));
    finishBoot();
  }
  async function shutdown({ restart = false } = {}) {
    if (state !== 'on') return;
    setState('shutting-down');
    sounds?.play('shutdown');
    shutdownText.textContent = 'Windows is shutting down...';
    await phase('shutdown', () => wait(1800));
    showOnly('off');
    setState('off');
    if (restart) await powerOn();
  }
  function standBy() {
    if (state !== 'on') return;
    setState('standby');
    showOnly('off');
  }
  function wake() {
    if (state !== 'standby') return;
    showOnly(null);
    setState('on');
  }
  function logOff() {
    if (state !== 'on') return Promise.resolve();
    setState('logon');
    return new Promise((resolve) => {
      resolveLogon = resolve;
      (async () => {
        shutdownText.textContent = 'Logging off...';
        await phase('shutdown', () => wait(1200));
        showOnly('logon');
      })();
    });
  }

  showOnly('off');
  return { powerOn, shutdown, standBy, logOff, get state() { return state; }, el: layer };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/xp/Boot.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Append the boot styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Boot / power ---- */
.xp-boot { position: absolute; inset: 0; z-index: 200000; background: #000; color: #ccc; font-family: "Lucida Console", Consolas, monospace; cursor: default; }
.xp-boot > * { position: absolute; inset: 0; }
.xp-off { background: #000; display: grid; place-items: center; }
.xp-off-hint { color: #2a2a2a; font: 13px Tahoma, sans-serif; letter-spacing: 1px; }
.xp-bios { margin: 0; padding: 24px 28px; font-size: 15px; line-height: 1.5; color: #c8c8c8; white-space: pre-wrap; }
.xp-bios::after { content: "_"; animation: xp-blink 1s steps(1) infinite; }
@keyframes xp-blink { 50% { opacity: 0; } }
.xp-bootlogo { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 44px; background: #000; }
.xp-bootlogo-brand { display: flex; align-items: center; gap: 18px; }
.xp-bootlogo-text { font: 300 46px/1 "Trebuchet MS", "Franklin Gothic Medium", Tahoma, sans-serif; color: #fff; letter-spacing: -1px; }
.xp-bootlogo-text b { font-weight: bold; color: #f0a028; font-size: 30px; vertical-align: top; margin-left: 2px; }
.xp-flag { display: grid; grid-template-columns: 26px 26px; gap: 3px; transform: skewY(-10deg) rotate(-4deg); filter: drop-shadow(0 0 6px rgba(255,255,255,.35)); }
.xp-flag i { display: block; width: 26px; height: 22px; border-radius: 3px; }
.xp-flag i:nth-child(1) { background: #f35325; } .xp-flag i:nth-child(2) { background: #81bc06; }
.xp-flag i:nth-child(3) { background: #05a6f0; } .xp-flag i:nth-child(4) { background: #ffba08; }
.xp-progress { width: 170px; height: 14px; border: 1px solid #8a8a8a; border-radius: 3px; overflow: hidden; position: relative; }
.xp-progress i { position: absolute; top: 2px; bottom: 2px; width: 9px; background: linear-gradient(#5b8be8, #2a5cc8); border-radius: 1px; animation: xp-progress 2s linear infinite; }
.xp-progress i:nth-child(2) { animation-delay: .13s; } .xp-progress i:nth-child(3) { animation-delay: .26s; }
@keyframes xp-progress { from { left: -12px; } to { left: 172px; } }
.xp-bootlogo-foot { position: absolute; bottom: 30px; left: 30px; font: 12px Tahoma, sans-serif; color: #888; }
.xp-welcome, .xp-logon, .xp-shutdown { background: linear-gradient(#5a7edc, #3d64c9 45%, #2f56b8); color: #fff; font-family: Tahoma, sans-serif; }
.xp-welcome { display: grid; place-items: center; }
.xp-welcome-text { font: italic 46px/1 "Trebuchet MS", Tahoma, sans-serif; text-shadow: 2px 2px 3px rgba(0,0,0,.4); }
.xp-logon { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; }
.xp-logon-head { font-size: 16px; }
.xp-logon-user { display: flex; align-items: center; gap: 14px; padding: 8px 24px 8px 8px; border: 1px solid rgba(255,255,255,.4); border-radius: 6px; background: rgba(255,255,255,.12); color: #fff; font: bold 16px Tahoma, sans-serif; box-shadow: none; min-width: 0; min-height: 0; cursor: default; }
.xp-logon-user:hover { background: rgba(255,255,255,.28); }
.xp-logon-avatar { display: grid; place-items: center; width: 48px; height: 48px; background: #fff; border-radius: 4px; }
.xp-shutdown { display: grid; place-items: center; }
.xp-shutdown-text { font-size: 18px; }
@media (prefers-reduced-motion: reduce) { .xp-progress i, .xp-bios::after { animation: none; } }
```

- [ ] **Step 6: Stage**

```bash
git add src/xp/Boot.js src/xp/Boot.test.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: boot, shutdown, restart, stand by and log off screens`

---
### Task 11: Assemble the desktop and run it in flat mode

**Files:**
- Create: `src/xp/createDesktop.js`, `src/xp/createDesktop.test.js`
- Modify: `src/main.js` (replace the Task 1 placeholder), `src/styles/xp-overrides.css` (append screen section)

**Interfaces:**
- Consumes: everything from Tasks 3–10.
- Produces: `createDesktop(rootEl, { resume, pdfHref, repoUrl, storage?, reducedMotion?, openExternal? }) → desktop` with `desktop.el`, `powerOn() → Promise`, `powerOff() → Promise`, `setInteractive(bool)`, `on(event, fn)` for `booted | shutdown | logoff`, `isOn`, `powerState`, `ctx` (the shell context, see Task 6), `destroy()`. This is the exact surface Phase 2's room wiring uses.
- Shell context gains `screenEl` (the root) and `toDesktopPoint(clientX, clientY)`.

- [ ] **Step 1: Write the failing smoke test**

`src/xp/createDesktop.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import resume from '../data/resume.json';
import { createDesktop } from './createDesktop.js';

describe('createDesktop', () => {
  beforeEach(() => { vi.useFakeTimers(); document.body.innerHTML = '<div id="root"></div>'; });
  afterEach(() => vi.useRealTimers());
  const mount = () => createDesktop(document.querySelector('#root'), {
    resume, pdfHref: '/XPcomputer/resume/resume-main.pdf', repoUrl: 'https://github.com/stephenyctsedev/XPcomputer', openExternal: () => {}, reducedMotion: true,
  });

  it('mounts four desktop icons and boots to the desktop', async () => {
    const desktop = mount();
    expect([...desktop.el.querySelectorAll('.xp-desktop-icon-label')].map((l) => l.textContent)).toEqual(['Internet Explorer', 'My Computer', 'My Documents', 'Recycle Bin']);
    expect(desktop.isOn).toBe(false);
    const booted = [];
    desktop.on('booted', () => booted.push(1));
    const p = desktop.powerOn();
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(desktop.isOn).toBe(true);
    expect(booted).toEqual([1]);
    await vi.advanceTimersByTimeAsync(1500);
    expect(desktop.el.querySelector('.xp-balloon').hidden).toBe(false);
  });

  it('launches apps from icons and the Start menu', () => {
    const desktop = mount();
    desktop.el.querySelector('[data-id="iexplore"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(desktop.el.querySelector('.xp-window .title-bar-text').textContent).toContain('Internet Explorer');
    desktop.el.querySelector('.xp-start').click();
    expect(desktop.el.querySelector('.xp-startmenu').hidden).toBe(false);
    [...desktop.el.querySelectorAll('.xp-sm-item')].find((b) => b.textContent.includes('My Computer')).click();
    expect(desktop.el.querySelector('.xp-startmenu').hidden).toBe(true);
    expect(desktop.ctx.wm.windows.map((w) => w.appId)).toEqual(['iexplore', 'explorer']);
  });

  it('runs commands and closes the focused window with Alt+F4', () => {
    const desktop = mount();
    desktop.ctx.registry.launch('notepad', { title: 'a.txt', text: 'hi' });
    desktop.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'F4', altKey: true, bubbles: true }));
    expect(desktop.ctx.wm.windows).toHaveLength(0);
  });

  it('toggles interactivity and the CRT overlay', () => {
    const desktop = mount();
    expect(desktop.el.classList.contains('xp-interactive')).toBe(false);
    expect(desktop.el.querySelector('.xp-crt').hidden).toBe(false);
    desktop.setInteractive(true);
    expect(desktop.el.classList.contains('xp-interactive')).toBe(true);
    expect(desktop.el.querySelector('.xp-crt').hidden).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/createDesktop.test.js`
Expected: FAIL — cannot resolve `./createDesktop.js`.

- [ ] **Step 3: Implement createDesktop.js**

`src/xp/createDesktop.js`:

```js
import 'xp.css/dist/XP.css';
import '../styles/xp-overrides.css';
import wallpaperUrl from './wallpaper.svg';
import { createWindowManager, DESKTOP_WIDTH } from './WindowManager.js';
import { createDialogs } from './Dialog.js';
import { createMenus } from './Menu.js';
import { createSounds, safeStorage } from './sounds.js';
import { createDesktopIcons } from './Desktop.js';
import { createTaskbar } from './Taskbar.js';
import { createStartMenu } from './StartMenu.js';
import { createBoot } from './Boot.js';
import { createRegistry } from './apps/registry.js';
import { registerInternetExplorer } from './apps/InternetExplorer.js';
import { registerAdobeReader } from './apps/AdobeReader.js';
import { registerExplorer } from './apps/Explorer.js';
import { registerNotepad } from './apps/Notepad.js';
import { registerSystemProperties } from './apps/SystemProperties.js';
import { registerMisc } from './apps/misc.js';
import { buildFileSystem, PATHS } from '../data/filesystem.js';

const RUNNABLE = ['iexplore', 'winmine', 'sol', 'pinball', 'notepad', 'explorer', 'sysprops', 'help', 'controlpanel'];
const NOT_WIN32 = ['cmd', 'calc', 'regedit', 'msconfig'];

function defaultOpenExternal(url) {
  if (url.startsWith('mailto:')) { location.href = url; return; }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function createDesktop(rootEl, { resume, pdfHref, repoUrl, storage = safeStorage(), reducedMotion = false, openExternal = defaultOpenExternal } = {}) {
  rootEl.classList.add('xp-screen');
  rootEl.tabIndex = -1;
  rootEl.innerHTML = `
    <div class="xp-desktop"><div class="xp-icons-layer"></div><div class="xp-windows"></div></div>
    <div class="xp-taskbar-root"></div>
    <div class="xp-startmenu-root"></div>
    <div class="xp-crt"></div>`;
  rootEl.style.setProperty('--xp-wallpaper', `url("${wallpaperUrl}")`);
  const desktopEl = rootEl.querySelector('.xp-desktop');

  const listeners = new Map();
  const on = (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event).delete(fn); };
  const emit = (event, data) => { for (const fn of listeners.get(event) ?? []) fn(data); };

  const sounds = createSounds({ storage });
  const wm = createWindowManager(rootEl.querySelector('.xp-windows'));
  const dialogs = createDialogs(wm, { sounds });
  const menus = createMenus(rootEl, { sounds });
  const fs = buildFileSystem(resume);
  const toDesktopPoint = (clientX, clientY) => {
    const rect = rootEl.getBoundingClientRect();
    const s = rect.width / DESKTOP_WIDTH || 1;
    return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s };
  };
  const ctx = { wm, dialogs, menus, sounds, resume, fs, pdfHref, repoUrl, storage, openExternal, screenEl: rootEl, toDesktopPoint };
  const registry = createRegistry(ctx);
  ctx.registry = registry;
  registerInternetExplorer(registry);
  registerAdobeReader(registry);
  registerExplorer(registry);
  registerNotepad(registry);
  registerSystemProperties(registry);
  registerMisc(registry);
  const launch = (id, payload) => () => registry.launch(id, payload);

  const icons = createDesktopIcons(rootEl.querySelector('.xp-icons-layer'), [
    { id: 'iexplore', label: 'Internet Explorer', icon: 'ie', launch: launch('iexplore') },
    { id: 'computer', label: 'My Computer', icon: 'computer', launch: launch('explorer', { path: PATHS.myComputer }) },
    { id: 'documents', label: 'My Documents', icon: 'documents', launch: launch('explorer', { path: PATHS.myDocuments }) },
    { id: 'recycle', label: 'Recycle Bin', icon: 'recycle', corner: true, launch: launch('explorer', { path: PATHS.recycleBin }) },
  ]);

  const boot = createBoot(rootEl, { sounds, reducedMotion, onState: (s) => { rootEl.dataset.power = s; }, onPowerRequest: () => powerOn() });

  function runCommand(command) {
    const key = command.trim().toLowerCase().replace(/\.exe$/, '');
    if (NOT_WIN32.includes(key)) { dialogs.message({ title: command, kind: 'error', text: `${command} is not a valid Win32 application.` }); return; }
    registry.launch(RUNNABLE.includes(key) ? key : command);
  }
  async function turnOffDialog() {
    const answer = await dialogs.message({ title: 'Turn off computer', kind: 'question', text: 'What do you want the computer to do?', buttons: ['Stand By', 'Turn Off', 'Restart', 'Cancel'], defaultButton: 1 });
    if (answer === 'Stand By') { boot.standBy(); return; }
    if (answer !== 'Turn Off' && answer !== 'Restart') return;
    wm.closeAll();
    taskbar.hideBalloon();
    await boot.shutdown({ restart: answer === 'Restart' });
    if (answer === 'Turn Off') emit('shutdown'); else onBooted();
  }
  async function logOff() {
    wm.closeAll();
    await boot.logOff();
    emit('logoff');
    onBooted();
  }

  const startMenu = createStartMenu(rootEl.querySelector('.xp-startmenu-root'), {
    userName: resume.displayName.split(' ')[0],
    sounds,
    left: [
      { label: 'Internet', sublabel: 'Internet Explorer', icon: 'ie', action: launch('iexplore') },
      { label: 'E-mail', sublabel: 'Outlook Express', icon: 'mail', action: () => openExternal(`mailto:${resume.contact.email}`) },
      { separator: true },
      { label: 'Notepad', icon: 'notepad', action: launch('notepad') },
      { label: 'Minesweeper', icon: 'mine', action: launch('winmine') },
      { label: 'Solitaire', icon: 'cards', action: launch('sol') },
      { label: 'Pinball', icon: 'pinball', action: launch('pinball') },
    ],
    right: [
      { label: 'My Documents', icon: 'documents', action: launch('explorer', { path: PATHS.myDocuments }) },
      { label: 'My Pictures', icon: 'folder', action: launch('explorer', { path: `${PATHS.myDocuments}\\My Pictures` }) },
      { label: 'My Computer', icon: 'computer', action: launch('explorer', { path: PATHS.myComputer }) },
      { separator: true },
      { label: 'Control Panel', icon: 'controlpanel', action: launch('controlpanel') },
      { separator: true },
      { label: 'Help and Support', icon: 'help', action: launch('help') },
      { label: 'Run...', icon: 'run', action: () => dialogs.run({ onRun: runCommand }) },
    ],
    allPrograms: [
      { label: 'Accessories', icon: 'folder', children: [{ label: 'Notepad', icon: 'notepad', action: launch('notepad') }] },
      { label: 'Games', icon: 'folder', children: [
        { label: 'Minesweeper', icon: 'mine', action: launch('winmine') },
        { label: 'Pinball', icon: 'pinball', action: launch('pinball') },
        { label: 'Solitaire', icon: 'cards', action: launch('sol') },
      ] },
      { label: 'Internet Explorer', icon: 'ie', action: launch('iexplore') },
    ],
    onLogOff: logOff,
    onTurnOff: turnOffDialog,
  });
  const taskbar = createTaskbar(rootEl.querySelector('.xp-taskbar-root'), { wm, sounds, onStart: () => startMenu.toggle() });
  rootEl.querySelector('.xp-startmenu-root').addEventListener('startmenu:toggle', (e) => taskbar.setStartActive(e.detail));

  let firstBoot = true;
  function onBooted() {
    emit('booted');
    if (!firstBoot) return;
    firstBoot = false;
    setTimeout(() => taskbar.showBalloon({ title: 'Welcome!', text: 'Double-click Internet Explorer to view my resume.', onClick: launch('iexplore') }), 1200);
  }
  async function powerOn() {
    if (boot.state !== 'off') return;
    await boot.powerOn();
    onBooted();
  }
  async function powerOff() {
    wm.closeAll();
    startMenu.close();
    await boot.shutdown();
    emit('shutdown');
  }
  function setInteractive(enabled) {
    rootEl.classList.toggle('xp-interactive', enabled);
    rootEl.querySelector('.xp-crt').hidden = enabled;
    if (!enabled) { startMenu.close(); menus.close(); }
  }

  desktopEl.addEventListener('pointerdown', (e) => { if (e.target === desktopEl || e.target.classList.contains('xp-icons-layer')) { icons.clear(); wm.blur(); } });
  rootEl.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'F4') { e.preventDefault(); wm.focused?.close(); } });
  rootEl.addEventListener('pointerdown', () => sounds.unlock(), { once: true });
  setInteractive(false);

  return {
    el: rootEl, ctx, powerOn, powerOff, setInteractive, on,
    get isOn() { return boot.state === 'on'; },
    get powerState() { return boot.state; },
    destroy() { taskbar.destroy(); wm.closeAll(); rootEl.innerHTML = ''; },
  };
}
```

- [ ] **Step 4: Append the screen styles**

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Screen root ---- */
.xp-screen { position: relative; width: 1024px; height: 768px; overflow: hidden; background: #000; font-family: Tahoma, "Trebuchet MS", Verdana, sans-serif; font-size: 11px; color: #000; outline: none;
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='20' height='24' viewBox='0 0 20 24'><path d='M2 1v19l5-4 3 7 3-1-3-7h6z' fill='%23fff' stroke='%23000' stroke-width='1.2' stroke-linejoin='round'/></svg>") 2 2, default; }
/* While the screen is not interactive (camera away from the monitor) nothing inside may receive pointer events,
   including descendants that set pointer-events: auto for themselves. */
.xp-screen:not(.xp-interactive), .xp-screen:not(.xp-interactive) * { pointer-events: none !important; }
.xp-screen a, .xp-screen .xp-taskpane a, .xp-screen .xp-sm-item, .xp-screen .xp-desktop-icon { cursor: inherit; }
.xp-screen *, .xp-screen *::before, .xp-screen *::after { box-sizing: border-box; }
.xp-desktop { position: absolute; left: 0; top: 0; width: 1024px; height: 738px; background: #3a6ea5 var(--xp-wallpaper) center / cover no-repeat; overflow: hidden; }
.xp-icons-layer { position: absolute; inset: 0; }
.xp-windows { position: absolute; inset: 0; pointer-events: none; }
.xp-windows > * { pointer-events: auto; }
.xp-crt { position: absolute; inset: 0; z-index: 300000; pointer-events: none; background: repeating-linear-gradient(rgba(0,0,0,0) 0 2px, rgba(0,0,0,.22) 2px 3px), radial-gradient(ellipse at center, rgba(0,0,0,.05) 50%, rgba(0,0,0,.6) 100%); transition: opacity .4s; }
.xp-crt[hidden] { display: block !important; opacity: 0; }
```

- [ ] **Step 5: Run the smoke test**

Run: `npx vitest run src/xp/createDesktop.test.js`
Expected: PASS, 4 tests. If Vite reports it cannot resolve `xp.css/dist/XP.css`, use the file name found in Task 1 Step 1.

- [ ] **Step 6: Replace main.js with the flat-mode wiring**

`src/main.js`:

```js
import './styles/base.css';
import { pickMode, detectEnv } from './modes.js';
import { createDesktop } from './xp/createDesktop.js';
import resume from './data/resume.json';

const REPO_URL = 'https://github.com/stephenyctsedev/XPcomputer';
const pdfHref = `${import.meta.env.BASE_URL}resume/resume-main.pdf`;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mode = pickMode(detectEnv());

const screenEl = document.createElement('div');
const desktop = createDesktop(screenEl, { resume, pdfHref, repoUrl: REPO_URL, reducedMotion });

if (mode === 'room') {
  // Phase 2 replaces this branch with `import('./room/index.js')` and the camera wiring from the spec §3.2.
  console.info('[XPcomputer] The 3D room ships in Phase 2; showing the flat desktop.');
}
mountFlat(document.querySelector('#app'), screenEl, desktop, mode === 'flat');

/** Center and scale the 1024x768 screen to the viewport; interactive immediately; boots on load. */
function mountFlat(app, screen, desk, showNotice) {
  const stage = document.createElement('div');
  stage.className = 'flat-stage';
  stage.append(screen);
  app.append(stage);
  if (showNotice) {
    const note = document.createElement('div');
    note.className = 'flat-notice';
    note.textContent = 'The 3D room needs a desktop browser with WebGL2. The computer itself works everywhere.';
    stage.append(note);
  }
  const fit = () => {
    const scale = Math.min(innerWidth / 1024, (innerHeight - (showNotice ? 28 : 0)) / 768);
    screen.style.transform = `scale(${scale})`;
  };
  fit();
  addEventListener('resize', fit);
  desk.setInteractive(true);
  desk.powerOn();
}
```

- [ ] **Step 7: Verify by hand in the browser**

Run: `npm run dev -- --open` and append `?mode=flat`. Walk this list and fix anything that misbehaves before moving on:

1. BIOS text types out; a click jumps to the boot logo; the progress bar slides; "welcome"; desktop appears and the startup chime plays (after the first click, browsers allow audio).
2. The balloon tip appears after about a second; clicking it opens Internet Explorer.
3. Homepage renders inside IE with the marquee, counter, and every section; "Download my resume (PDF)" opens the Adobe Reader window with the PDF visible; "Save a Copy" downloads it; LinkedIn opens a new tab.
4. Windows drag, resize from the corner, minimize to the taskbar, maximize on title double-click, close. Task buttons highlight the focused window.
5. My Computer lists the drives; C: → Documents and Settings → Stephen → My Documents → Projects → a .txt opens in Notepad; A: shows the "insert a disk" error; My Computer task pane → "View system information" opens System Properties with the three tabs.
6. Start menu: every left and right item works; All Programs → Games shows the three placeholders; Run → `sol` shows the placeholder, `cmd` shows the Win32 error, `xyz` shows "Windows cannot find".
7. Turn Off Computer → Stand By blanks the screen and a click wakes it; Turn Off shows "shutting down" then black with "click to turn on"; clicking boots again; Restart reboots; Log Off shows the logon tile.
8. Resize the browser window: the desktop letterboxes and stays sharp. Mute toggle in the tray silences sounds and persists after reload.

- [ ] **Step 8: Run everything and stage**

Run: `npm test` → all green. Run: `npm run build` → `dist/` produced with no warnings about missing assets.

```bash
git add src/xp/createDesktop.js src/xp/createDesktop.test.js src/main.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: assemble the XP desktop and run it in flat mode`

---

### Task 12: README, QA checklist, phase hand-off

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Extend the README**

Replace the `## Licensing` section of `README.md` with the following (keep everything above it):

```markdown
## Controls

- Desktop: single click selects an icon, double click or Enter opens it; Alt+F4 closes the focused window; Escape closes dialogs.
- Start > Run accepts `iexplore`, `explorer`, `notepad`, `winmine`, `sol`, `pinball`.
- The tray speaker toggles sound (remembered between visits).
- 3D room (Phase 2): click the PC to sit down, Escape or "Back to room" to stand up.

## Manual QA checklist

Run before every release, in Chrome and Firefox at minimum (Edge and Safari when available):

- [ ] Boot plays and can be skipped by clicking; startup chime after the first click
- [ ] Balloon tip appears once per boot and opens Internet Explorer
- [ ] Homepage shows every resume section and no phone number
- [ ] PDF opens in the Adobe Reader window; Save a Copy downloads it; fallback shows when PDFs cannot embed
- [ ] Every desktop icon, Start menu item, All Programs entry and Run command does something sensible
- [ ] Windows drag, resize, minimize, maximize, close; task buttons stay in sync
- [ ] Explorer: drives, folders, Back/Forward/Up, Views, task pane links, right-click Properties
- [ ] Notepad edit → close asks to save
- [ ] Turn Off, Restart, Stand By, Log Off all recover to a working desktop
- [ ] `?mode=flat` letterboxes at any window size; phone width shows the notice
- [ ] Mute persists across reload

## Roadmap

1. Skeleton, resume pipeline, XP shell, IE/Explorer/Notepad (this plan) — done when the checklist passes
2. three.js cyberpunk bedroom with the CSS3D screen
3. Minesweeper
4. Solitaire
5. Pinball
6. Polish and performance pass

## Licensing

Code is MIT. Uses three.js (MIT) and XP.css (MIT). No Microsoft artwork,
sounds, logos or card art are included; every icon, wallpaper, boot screen and
sound is drawn or synthesized in this repository.
```

- [ ] **Step 2: Final verification**

Run: `npm test` and `npm run build`. Both must succeed. Walk the QA checklist once in Chrome at `?mode=flat` and once at the default URL (which also shows the flat desktop until Phase 2).

- [ ] **Step 3: Stage and hand back**

```bash
git add README.md
git status --short
```

Report to Stephen: tests passing, build size from the Vite output, and which QA items were verified. Ask whether to commit (suggested message: `docs: README controls, QA checklist and roadmap`) and whether to create the public `stephenyctsedev/XPcomputer` repo and push, which turns on the Pages deploy.

---

## Next plans

- **Phase 2 — 3D room:** starts with a half-day spike proving `CSS3DRenderer` + `UnrealBloomPass` coexist with the desktop element from `createDesktop()`, then builds `src/room/*` per spec §4 and replaces the `mode === 'room'` branch in `src/main.js`.
- **Phases 3–5 — games:** each replaces one placeholder registration in `src/xp/apps/misc.js` with a real app module under `src/xp/games/`.
- **Phase 6 — polish** per spec §14.
