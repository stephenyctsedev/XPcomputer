# XP Computer Portfolio — Phase 3 Implementation Plan (Minesweeper)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Minesweeper placeholder with a fully playable, XP-faithful Minesweeper (Beginner/Intermediate/Expert, safe first click, flags and question marks, chording, LED counters, smiley, timer, best times).

**Architecture:** A pure rules engine (`engine.js`) with no DOM, unit tested for every rule; a thin DOM UI (`Minesweeper.js`) that renders the engine's changed cells, drives the timer and sounds, and registers as app id `winmine` in the Phase 1 registry. The window manager gains a `win.resize(w, h)` method so the window can follow the board size.

**Tech Stack:** Plain JavaScript, Vitest + jsdom, XP.css window chrome, own SVG smiley faces and flag icon.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §7 intro and §7.1. Depends on Phase 1 (registry, window manager, menus, dialogs, sounds, storage).

## Global Constraints

- Engine modules have no DOM access and no imports from `src/xp/` UI code.
- Levels: Beginner 9×9/10, Intermediate 16×16/40, Expert 16×30/99. Mines are placed on the first reveal, never on the clicked cell.
- Marks: none → flag → ? → none when "Marks (?)" is on; none ↔ flag when off.
- Best times live in `localStorage` key `xpcomputer.winmine.best` through the shell's `storage` (try/catch wrapped).
- Own artwork only: SVG faces and the Phase 1 flag icon. Classic number colours: 1 blue, 2 green, 3 red, 4 navy, 5 maroon, 6 teal, 7 black, 8 gray.
- Single instance: launching `winmine` while open focuses the existing window.
- Files are UTF-8. **Never `git commit` or `git push` unless Stephen says so**; "Stage" steps run `git add` only.

---

## File Structure (Phase 3)

| File | Responsibility |
|---|---|
| `src/xp/games/minesweeper/engine.js` (+ test) | Board state and rules: place, reveal/flood, mark, chord, win/loss |
| `src/xp/games/minesweeper/Minesweeper.js` (+ test) | Window, menus, grid rendering, input, timer, sounds, best times |
| `src/xp/games/minesweeper/minesweeper.css` | Bevelled tiles, LED counters, smiley |
| `src/xp/WindowManager.js` (+ test) | Add `win.resize(w, h)` |
| `src/xp/apps/misc.js` | Remove the `winmine` placeholder |
| `src/xp/createDesktop.js` | Register the real app |
| `README.md` | Controls and QA items |

---

### Task 1: Rules engine

**Files:**
- Create: `src/xp/games/minesweeper/engine.js`, `src/xp/games/minesweeper/engine.test.js`

**Interfaces:**
- Produces: `LEVELS = { beginner: {rows: 9, cols: 9, mines: 10}, intermediate: {rows: 16, cols: 16, mines: 40}, expert: {rows: 16, cols: 30, mines: 99} }`.
- Produces: `createGame({ rows, cols, mines, random?, marks?, layout? }) → game` where `layout` is an optional array of mine indices (tests) and `game = { rows, cols, mines, marks, cells, state: 'ready'|'playing'|'won'|'lost', flags, revealed, exploded, minesLeft, reveal(r, c) → changedIndices, toggleMark(r, c) → changedIndices, chord(r, c) → changedIndices, index(r, c), neighbors(i) }`. Each cell is `{ mine, adjacent, revealed, mark: 'none'|'flag'|'question', wrong }`.

- [ ] **Step 1: Write the failing tests**

`src/xp/games/minesweeper/engine.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createGame, LEVELS } from './engine.js';

// 5×5 board, index = r*5 + c
const small = (layout, extra = {}) => createGame({ rows: 5, cols: 5, mines: layout.length, layout, ...extra });

describe('createGame', () => {
  it('starts ready with no mines placed', () => {
    const g = createGame({ ...LEVELS.beginner });
    expect(g.cells).toHaveLength(81);
    expect(g.state).toBe('ready');
    expect(g.minesLeft).toBe(10);
    expect(g.cells.filter((c) => c.mine)).toHaveLength(0);
  });

  it('places mines on the first reveal, never under the click, with correct adjacency', () => {
    const g = createGame({ ...LEVELS.expert });
    g.reveal(7, 15);
    expect(g.state).not.toBe('lost');
    expect(g.cells[g.index(7, 15)].mine).toBe(false);
    expect(g.cells.filter((c) => c.mine)).toHaveLength(99);
    g.cells.forEach((cell, i) => {
      const count = g.neighbors(i).filter((n) => g.cells[n].mine).length;
      expect(cell.adjacent).toBe(count);
    });
  });

  it('floods zero cells and wins when every safe cell is revealed', () => {
    const g = small([0]);
    const changed = g.reveal(4, 4);
    expect(g.state).toBe('won');
    expect(changed).toHaveLength(25);            // 24 safe cells + the auto-flagged mine
    expect(g.cells.filter((c) => c.revealed)).toHaveLength(24);
    expect(g.cells[0].mark).toBe('flag');
    expect(g.minesLeft).toBe(0);
    expect(g.cells[1].adjacent).toBe(1);
  });

  it('loses on a mine, reveals the others and marks wrong flags', () => {
    const g = small([12, 24]);
    g.toggleMark(0, 0);                          // wrong flag
    g.toggleMark(4, 4);                          // right flag
    g.reveal(2, 2);
    expect(g.state).toBe('lost');
    expect(g.exploded).toBe(12);
    expect(g.cells[12].revealed).toBe(true);
    expect(g.cells[24].revealed).toBe(false);    // correctly flagged mines stay flagged
    expect(g.cells[24].mark).toBe('flag');
    expect(g.cells[0].wrong).toBe(true);
    expect(g.reveal(0, 1)).toEqual([]);          // game over: nothing changes
    expect(g.toggleMark(0, 1)).toEqual([]);
  });

  it('cycles marks and refuses to reveal flagged cells', () => {
    const g = small([12]);
    expect(g.toggleMark(0, 0)).toEqual([0]);
    expect(g.cells[0].mark).toBe('flag');
    expect(g.minesLeft).toBe(0);
    g.toggleMark(0, 0);
    expect(g.cells[0].mark).toBe('question');
    expect(g.minesLeft).toBe(1);
    g.toggleMark(0, 0);
    expect(g.cells[0].mark).toBe('none');
    g.toggleMark(0, 0);
    expect(g.reveal(0, 0)).toEqual([]);
    const noMarks = small([12], { marks: false });
    noMarks.toggleMark(0, 0);
    noMarks.toggleMark(0, 0);
    expect(noMarks.cells[0].mark).toBe('none');
  });

  it('chords around a satisfied number and ignores unsatisfied ones', () => {
    const g = createGame({ rows: 3, cols: 3, mines: 2, layout: [0, 2] });
    expect(g.reveal(1, 1)).toEqual([4]);
    expect(g.cells[4].adjacent).toBe(2);
    expect(g.chord(1, 1)).toEqual([]);           // no flags yet
    g.toggleMark(0, 0);
    g.toggleMark(0, 2);
    const changed = g.chord(1, 1);
    expect(changed.sort((a, b) => a - b)).toEqual([1, 3, 5, 6, 7, 8]);
    expect(g.state).toBe('won');
  });

  it('a chord with a wrong flag can lose', () => {
    const g = createGame({ rows: 3, cols: 3, mines: 1, layout: [0] });
    g.reveal(1, 1);
    g.toggleMark(0, 1);                          // wrong flag next to the number
    g.chord(1, 1);
    expect(g.state).toBe('lost');
    expect(g.exploded).toBe(0);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/xp/games/minesweeper/engine.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement engine.js**

`src/xp/games/minesweeper/engine.js`:

```js
// Minesweeper rules. Pure: no DOM, no timers.
export const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

/** `layout` (array of mine indices) skips random placement; used by tests. */
export function createGame({ rows, cols, mines, random = Math.random, marks = true, layout = null }) {
  const total = rows * cols;
  const cells = Array.from({ length: total }, () => ({ mine: false, adjacent: 0, revealed: false, mark: 'none', wrong: false }));
  const game = { rows, cols, mines, marks, cells, state: 'ready', flags: 0, revealed: 0, exploded: null };
  const index = (r, c) => r * cols + c;
  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const neighbors = (i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr !== 0 || dc !== 0) && inBounds(r + dr, c + dc)) out.push(index(r + dr, c + dc));
      }
    }
    return out;
  };
  const over = () => game.state === 'won' || game.state === 'lost';

  function placeMines(safeIndex) {
    let picks = layout;
    if (!picks) {
      const pool = [];
      for (let i = 0; i < total; i++) if (i !== safeIndex) pool.push(i);
      for (let k = 0; k < mines; k++) {
        const j = k + Math.floor(random() * (pool.length - k));
        [pool[k], pool[j]] = [pool[j], pool[k]];
      }
      picks = pool.slice(0, mines);
    }
    for (const i of picks) cells[i].mine = true;
    for (let i = 0; i < total; i++) cells[i].adjacent = neighbors(i).filter((n) => cells[n].mine).length;
  }

  function lose(at, changed) {
    game.state = 'lost';
    game.exploded = at;
    cells.forEach((cell, i) => {
      if (cell.mine && !cell.revealed && cell.mark !== 'flag') { cell.revealed = true; changed.push(i); }
      if (!cell.mine && cell.mark === 'flag') { cell.wrong = true; changed.push(i); }
    });
  }

  function checkWin(changed) {
    if (game.revealed !== total - mines) return;
    game.state = 'won';
    cells.forEach((cell, i) => {
      if (cell.mine && cell.mark !== 'flag') { cell.mark = 'flag'; game.flags++; changed.push(i); }
    });
  }

  function reveal(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const start = index(r, c);
    if (cells[start].revealed || cells[start].mark === 'flag') return [];
    if (game.state === 'ready') { placeMines(start); game.state = 'playing'; }
    const changed = [];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      const cell = cells[i];
      if (cell.revealed || cell.mark === 'flag') continue;
      cell.revealed = true;
      cell.mark = 'none';
      game.revealed++;
      changed.push(i);
      if (cell.mine) { lose(i, changed); return changed; }
      if (cell.adjacent === 0) for (const n of neighbors(i)) if (!cells[n].revealed) stack.push(n);
    }
    checkWin(changed);
    return changed;
  }

  function toggleMark(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const i = index(r, c);
    const cell = cells[i];
    if (cell.revealed) return [];
    if (cell.mark === 'none') { cell.mark = 'flag'; game.flags++; }
    else if (cell.mark === 'flag') { cell.mark = game.marks ? 'question' : 'none'; game.flags--; }
    else cell.mark = 'none';
    return [i];
  }

  function chord(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const i = index(r, c);
    const cell = cells[i];
    if (!cell.revealed || cell.adjacent === 0) return [];
    const around = neighbors(i);
    if (around.filter((n) => cells[n].mark === 'flag').length !== cell.adjacent) return [];
    const changed = [];
    for (const n of around) {
      if (cells[n].revealed || cells[n].mark === 'flag') continue;
      changed.push(...reveal(Math.floor(n / cols), n % cols));
      if (game.state === 'lost') break;
    }
    return changed;
  }

  Object.defineProperty(game, 'minesLeft', { get: () => mines - game.flags });
  return Object.assign(game, { reveal, toggleMark, chord, index, neighbors });
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/xp/games/minesweeper/engine.test.js`
Expected: PASS, 7 tests.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/minesweeper/engine.js src/xp/games/minesweeper/engine.test.js
```

Suggested commit message: `feat(minesweeper): pure rules engine with safe first click, flood, marks and chording`

---
### Task 2: Window resize support

**Files:**
- Modify: `src/xp/WindowManager.js`, `src/xp/WindowManager.test.js`

**Interfaces:**
- Produces: `win.resize(w, h)` — applies `max(minWidth, w)` × `max(minHeight, h)`, re-clamps the position, emits `resize`; ignored while maximized.

- [ ] **Step 1: Add the failing test**

Append inside the `describe('createWindowManager', …)` block of `src/xp/WindowManager.test.js`:

```js
  it('resizes programmatically, honours minimums and ignores maximized windows', () => {
    const a = wm.open({ appId: 'a', title: 'A', x: 900, y: 700, minWidth: 120, minHeight: 100 });
    const resized = [];
    wm.on('resize', (w) => resized.push(w.title));
    a.resize(300, 200);
    expect(a.bounds).toMatchObject({ w: 300, h: 200 });
    expect(a.bounds.x).toBeLessThanOrEqual(984);
    a.resize(10, 10);
    expect(a.bounds).toMatchObject({ w: 120, h: 100 });
    a.maximize();
    a.resize(100, 100);
    expect(a.bounds.w).toBe(1024);
    expect(resized).toEqual(['A', 'A']);
  });
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/WindowManager.test.js`
Expected: FAIL — `a.resize is not a function`.

- [ ] **Step 3: Implement**

In `src/xp/WindowManager.js`, inside the `win` object literal (after `setTitle`), add:

```js
      resize(w, h) {
        if (win.isMaximized) return;
        const nw = Math.max(minWidth, w);
        const nh = Math.max(minHeight, h);
        const c = clampPosition(win.bounds.x, win.bounds.y, nw, nh, deskW, deskH);
        applyBounds(win, { x: c.x, y: c.y, w: nw, h: nh });
        emit('resize', win);
      },
```

Also add `resize` to the events list in the module's doc comment or interface notes.

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/xp/WindowManager.test.js`
Expected: PASS, 10 tests.

- [ ] **Step 5: Stage**

```bash
git add src/xp/WindowManager.js src/xp/WindowManager.test.js
```

Suggested commit message: `feat(wm): programmatic window resize`

---

### Task 3: Minesweeper window

**Files:**
- Create: `src/xp/games/minesweeper/Minesweeper.js`, `src/xp/games/minesweeper/Minesweeper.test.js`, `src/xp/games/minesweeper/minesweeper.css`
- Modify: `src/xp/apps/misc.js` (drop the `winmine` placeholder), `src/xp/createDesktop.js` (register)

**Interfaces:**
- Consumes: `createGame`, `LEVELS` (Task 1), `win.resize` (Task 2), `attachMenubar`, `iconEl`, shell context `{ wm, dialogs, menus, sounds, storage }`.
- Produces: `registerMinesweeper(registry)` (app id `winmine`), `openMinesweeper(ctx) → win`.

- [ ] **Step 1: Write the failing UI test**

`src/xp/games/minesweeper/Minesweeper.test.js`:

```js
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createWindowManager } from '../../WindowManager.js';
import { createMenus } from '../../Menu.js';
import { openMinesweeper } from './Minesweeper.js';

describe('Minesweeper window', () => {
  let ctx, played;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    played = [];
    const mem = new Map();
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      menus: createMenus(document.querySelector('#screen')),
      dialogs: { message: () => Promise.resolve('OK') },
      sounds: { play: (n) => played.push(n) },
      storage: { get: (k) => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
    };
  });
  afterEach(() => vi.useRealTimers());
  const press = (el, button, buttons) => el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button, buttons }));
  const release = (el, button) => el.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, button }));

  it('opens a beginner board with LED counters and a single instance', () => {
    const win = openMinesweeper(ctx);
    expect(win.el.querySelectorAll('.ms-cell')).toHaveLength(81);
    expect(win.el.querySelector('.ms-mines').textContent).toBe('010');
    expect(win.el.querySelector('.ms-time').textContent).toBe('000');
    expect(win.bounds.w).toBeGreaterThan(9 * 16);
    expect(openMinesweeper(ctx)).toBe(win);
    expect(ctx.wm.windows).toHaveLength(1);
  });

  it('flags on right click, reveals on left click, and runs the timer', () => {
    const win = openMinesweeper(ctx);
    const cell0 = win.el.querySelector('.ms-cell[data-i="0"]');
    press(cell0, 2, 2);
    expect(cell0.classList.contains('flag')).toBe(true);
    expect(win.el.querySelector('.ms-mines').textContent).toBe('009');
    const cell40 = win.el.querySelector('.ms-cell[data-i="40"]');
    press(cell40, 0, 1);
    expect(win.el.querySelector('.ms-face').innerHTML).toContain('<svg');
    release(cell40, 0);
    expect(cell40.classList.contains('revealed')).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(win.el.querySelector('.ms-time').textContent).toBe('003');
    expect(played).toContain('mineTick');
  });

  it('switches level from the Game menu and resizes the window', () => {
    const win = openMinesweeper(ctx);
    const before = win.bounds.w;
    win.el.querySelector('.xp-menubar-item').click();
    [...document.querySelectorAll('.xp-menu-item')].find((b) => b.textContent.includes('Expert')).click();
    expect(win.el.querySelectorAll('.ms-cell')).toHaveLength(480);
    expect(win.el.querySelector('.ms-mines').textContent).toBe('099');
    expect(win.bounds.w).toBeGreaterThan(before);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/games/minesweeper/Minesweeper.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Write the stylesheet**

`src/xp/games/minesweeper/minesweeper.css`:

```css
.ms { display: inline-flex; flex-direction: column; background: #c0c0c0; user-select: none; -webkit-user-select: none; }
.ms-panel { padding: 6px; border: 3px solid; border-color: #fff #808080 #808080 #fff; }
.ms-status { display: flex; justify-content: space-between; align-items: center; padding: 4px 5px; margin-bottom: 6px; border: 2px solid; border-color: #808080 #fff #fff #808080; }
.ms-led { font: bold 20px/22px "Courier New", monospace; color: #f00; background: #000; padding: 0 2px; letter-spacing: 1px; border: 1px solid; border-color: #808080 #fff #fff #808080; min-width: 39px; text-align: center; }
.ms-face { width: 26px; height: 26px; padding: 1px; border: 2px solid; border-color: #fff #808080 #808080 #fff; background: #c0c0c0; box-shadow: none; min-width: 0; min-height: 0; border-radius: 0; cursor: default; }
.ms-face:active { border-color: #808080 #fff #fff #808080; }
.ms-face svg { width: 100%; height: 100%; display: block; }
.ms-grid { display: grid; border: 3px solid; border-color: #808080 #fff #fff #808080; }
.ms-cell { position: relative; width: 16px; height: 16px; padding: 0; margin: 0; border: 2px solid; border-color: #fff #808080 #808080 #fff; background: #c0c0c0; box-shadow: none; min-width: 0; min-height: 0; border-radius: 0; font: bold 11px/12px Tahoma, Verdana, sans-serif; display: grid; place-items: center; color: #000; cursor: default; }
.ms-cell:focus { outline: none; }
.ms-cell.pressed, .ms-cell.revealed { border-width: 1px 0 0 1px; border-color: #808080; }
.ms-cell.mine::before { content: "●"; font-size: 13px; line-height: 1; color: #000; }
.ms-cell.exploded { background: #f00; }
.ms-cell.wrong::after { content: "✕"; position: absolute; inset: 0; display: grid; place-items: center; color: #f00; font-size: 14px; font-weight: bold; }
.ms-cell.flag .xp-ico { pointer-events: none; }
```

- [ ] **Step 4: Implement Minesweeper.js**

`src/xp/games/minesweeper/Minesweeper.js`:

```js
import './minesweeper.css';
import { createGame, LEVELS } from './engine.js';
import { attachMenubar } from '../../Menu.js';
import { iconEl } from '../../icons/index.js';

const BEST_KEY = 'xpcomputer.winmine.best';
const CELL = 16;
const FRAME_W = 30;   // window chrome + panel borders; tune until no gap or scrollbar shows
const FRAME_H = 112;
const NUMBER_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
const FACES = {
  smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><circle cx="8.5" cy="9" r="1.4"/><circle cx="15.5" cy="9" r="1.4"/><path d="M7 14c2 3 8 3 10 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  oh: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><circle cx="8.5" cy="9" r="1.4"/><circle cx="15.5" cy="9" r="1.4"/><circle cx="12" cy="15.5" r="2.2" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  cool: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><path d="M4 9h16l-1 3h-5l-1-2h-2l-1 2H5z" fill="#000"/><path d="M8 15c2 2.5 6 2.5 8 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  dead: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><path d="M6.5 7l4 4M10.5 7l-4 4M13.5 7l4 4M17.5 7l-4 4" stroke="#000" stroke-width="1.4"/><path d="M8 16c2-2.5 6-2.5 8 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
};

export function registerMinesweeper(registry) {
  registry.register('winmine', { name: 'Minesweeper', icon: 'mine', launch: openMinesweeper });
}

export function openMinesweeper(ctx) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('winmine')[0];
  if (existing) { existing.focus(); return existing; }

  let levelName = 'beginner';
  let marks = true;
  let game = null;
  let seconds = 0;
  let timer = null;
  let pressing = null;

  const body = document.createElement('div');
  body.className = 'ms';
  body.innerHTML = `
    <div class="ms-menubar"></div>
    <div class="ms-panel">
      <div class="ms-status"><span class="ms-led ms-mines">000</span><button type="button" class="ms-face" aria-label="New game"></button><span class="ms-led ms-time">000</span></div>
      <div class="ms-grid"></div>
    </div>`;
  const grid = body.querySelector('.ms-grid');
  const face = body.querySelector('.ms-face');
  const minesLed = body.querySelector('.ms-mines');
  const timeLed = body.querySelector('.ms-time');
  const win = wm.open({ appId: 'winmine', title: 'Minesweeper', icon: 'mine', width: 200, height: 260, minWidth: 120, minHeight: 100, resizable: false, content: body, onClose: () => { stopTimer(); document.removeEventListener('pointerup', onDocumentUp); } });

  const led = (n) => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
  const setFace = (name) => { face.innerHTML = FACES[name]; };
  const rc = (cellEl) => { const i = Number(cellEl.dataset.i); return [Math.floor(i / game.cols), i % game.cols]; };
  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (seconds >= 999) return;
      seconds++;
      timeLed.textContent = led(seconds);
      sounds.play('mineTick');
    }, 1000);
  }

  function newGame() {
    stopTimer();
    seconds = 0;
    timeLed.textContent = led(0);
    const level = LEVELS[levelName];
    game = createGame({ ...level, marks });
    minesLed.textContent = led(game.minesLeft);
    setFace('smile');
    grid.style.gridTemplateColumns = `repeat(${level.cols}, ${CELL}px)`;
    grid.innerHTML = '';
    for (let i = 0; i < level.rows * level.cols; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'ms-cell';
      cell.dataset.i = String(i);
      grid.append(cell);
    }
    win.resize(level.cols * CELL + FRAME_W, level.rows * CELL + FRAME_H);
  }

  function renderCell(i) {
    const cell = game.cells[i];
    const el = grid.children[i];
    el.className = 'ms-cell';
    el.style.color = '';
    el.innerHTML = '';
    if (cell.revealed) {
      el.classList.add('revealed');
      if (cell.mine) { el.classList.add('mine'); if (game.exploded === i) el.classList.add('exploded'); }
      else if (cell.adjacent) { el.textContent = String(cell.adjacent); el.style.color = NUMBER_COLORS[cell.adjacent]; }
    } else if (cell.wrong) {
      el.classList.add('revealed', 'mine', 'wrong');
    } else if (cell.mark === 'flag') {
      el.classList.add('flag');
      el.append(iconEl('flag', 12));
    } else if (cell.mark === 'question') {
      el.textContent = '?';
    }
  }

  function afterMove(changed) {
    for (const i of changed) renderCell(i);
    minesLed.textContent = led(game.minesLeft);
    if (game.state === 'playing' && !timer) startTimer();
    if (game.state === 'lost') { stopTimer(); setFace('dead'); sounds.play('mineBoom'); }
    if (game.state === 'won') { stopTimer(); setFace('cool'); sounds.play('win'); recordBest(); }
  }

  const loadBest = () => { try { return JSON.parse(storage.get(BEST_KEY) ?? '{}') ?? {}; } catch { return {}; } };
  const saveBest = (best) => storage.set(BEST_KEY, JSON.stringify(best));
  function promptName() {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'xp-msgbox';
      content.innerHTML = `<div class="xp-msgbox-text">You have the fastest time for ${levelName} level. Please enter your name.</div><input type="text" maxlength="32" value="Anonymous"><div class="xp-msgbox-buttons"><button type="button" class="default">OK</button></div>`;
      const input = content.querySelector('input');
      const dlg = wm.open({ appId: 'dialog', title: 'Congratulations', icon: 'mine', dialog: true, width: 300, height: 150, x: win.bounds.x + 20, y: win.bounds.y + 60, content, onClose: () => resolve(input.value.trim() || 'Anonymous') });
      content.querySelector('button').addEventListener('click', () => dlg.close());
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') dlg.close(); });
      setTimeout(() => input.select(), 0);
    });
  }
  async function recordBest() {
    const best = loadBest();
    if (best[levelName] && best[levelName].time <= seconds) return;
    const name = await promptName();
    best[levelName] = { time: seconds, name };
    saveBest(best);
  }
  function showBestTimes() {
    const best = loadBest();
    const row = (key, label) => `${label}:\t${best[key] ? `${best[key].time} seconds\t${best[key].name}` : '999 seconds\tAnonymous'}`;
    dialogs.message({
      title: 'Fastest Mine Sweepers', kind: 'info', owner: win, buttons: ['Reset Scores', 'OK'], defaultButton: 1,
      text: [row('beginner', 'Beginner'), row('intermediate', 'Intermediate'), row('expert', 'Expert')].join('\n'),
    }).then((answer) => { if (answer === 'Reset Scores') saveBest({}); });
  }

  const gameMenu = () => [
    { label: 'New', shortcut: 'F2', action: newGame },
    { separator: true },
    { label: 'Beginner', checked: levelName === 'beginner', action: () => { levelName = 'beginner'; newGame(); } },
    { label: 'Intermediate', checked: levelName === 'intermediate', action: () => { levelName = 'intermediate'; newGame(); } },
    { label: 'Expert', checked: levelName === 'expert', action: () => { levelName = 'expert'; newGame(); } },
    { separator: true },
    { label: 'Marks (?)', checked: marks, action: () => { marks = !marks; if (game) game.marks = marks; } },
    { separator: true },
    { label: 'Best Times...', action: showBestTimes },
    { separator: true },
    { label: 'Exit', action: () => win.close() },
  ];
  attachMenubar(body.querySelector('.ms-menubar'), menus, {
    Game: gameMenu,
    Help: [{ label: 'About Minesweeper', action: () => dialogs.message({ title: 'About Minesweeper', owner: win, text: 'Minesweeper, rebuilt from the rules up in plain JavaScript.\n\nLeft click reveals, right click flags, middle click or Shift+click clears around a satisfied number. F2 starts a new game.' }) }],
  });

  grid.addEventListener('contextmenu', (e) => e.preventDefault());
  grid.addEventListener('pointerdown', (e) => {
    const cellEl = e.target.closest('.ms-cell');
    if (!cellEl || !game || game.state === 'won' || game.state === 'lost') return;
    if (e.button === 2) { afterMove(game.toggleMark(...rc(cellEl))); sounds.play('click'); return; }
    if (e.button === 0 || e.button === 1) {
      pressing = e.button === 1 || e.buttons === 3 || e.shiftKey ? 'chord' : 'reveal';
      setFace('oh');
      cellEl.classList.add('pressed');
    }
  });
  function onDocumentUp(e) {
    if (!pressing || !game) return;
    const mode = pressing;
    pressing = null;
    grid.querySelectorAll('.pressed').forEach((c) => c.classList.remove('pressed'));
    if (game.state === 'won' || game.state === 'lost') return;
    setFace('smile');
    const cellEl = e.target.closest?.('.ms-cell');
    if (!cellEl || !grid.contains(cellEl)) return;
    const [r, c] = rc(cellEl);
    afterMove(mode === 'chord' ? game.chord(r, c) : game.reveal(r, c));
  }
  document.addEventListener('pointerup', onDocumentUp);
  face.addEventListener('click', newGame);
  body.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); newGame(); } });

  newGame();
  return win;
}
```

- [ ] **Step 5: Register the app and drop the placeholder**

In `src/xp/apps/misc.js`, change the placeholder loop so it only covers the games not yet built:

```js
  for (const [id, name] of [['sol', 'Solitaire'], ['pinball', 'Pinball']]) {
```

In `src/xp/createDesktop.js`, add the import and call after `registerMisc(registry);`:

```js
import { registerMinesweeper } from './games/minesweeper/Minesweeper.js';
// …
  registerMinesweeper(registry);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run src/xp/games/minesweeper` then `npm test`.
Expected: Minesweeper UI 3 tests pass; whole suite green.

- [ ] **Step 7: Verify by hand and tune the frame constants**

Run: `npm run dev -- --open` with `?mode=flat`. Start → Minesweeper (also try Run → `winmine`, and My Computer → C: → WINDOWS → system32 → winmine.exe).

1. Window hugs the board with no gap or scrollbar at all three levels; if not, adjust `FRAME_W`/`FRAME_H` in `Minesweeper.js` (typical fix is ±4 px).
2. Left click reveals, zero cells flood, right click cycles flag → ? → none, "Marks (?)" off makes it flag ↔ none.
3. Middle click or Shift+click on a satisfied number clears its neighbours; on an unsatisfied one nothing happens.
4. Face: :o while pressing, sunglasses on win, dead on loss; clicking the face restarts. F2 restarts.
5. Timer starts on the first click, ticks with a sound, stops at win/loss; mute silences it.
6. Win on Beginner → name prompt → Best Times shows it; Reset Scores clears it; the value survives a reload.
7. Losing shows every mine and a red ✕ on wrong flags; the exploded cell has a red background.
8. Sounds: tick, boom, win fanfare.

- [ ] **Step 8: Stage**

```bash
git add src/xp/games/minesweeper src/xp/apps/misc.js src/xp/createDesktop.js
```

Suggested commit message: `feat(minesweeper): playable Minesweeper window with LED counters, smiley, timer and best times`

---

### Task 4: README and QA

- [ ] **Step 1: Document**

In `README.md` under `## Controls` add:

```markdown
- Minesweeper: left click reveals, right click flags (then ?), middle click or Shift+click chords, F2 new game. Best times are stored in the browser.
```

Under `## Manual QA checklist` add:

```markdown
- [ ] Minesweeper: three levels resize the window; win and loss paths; best-time prompt; sounds and mute
```

Mark roadmap item 3 done.

- [ ] **Step 2: Verify and hand back**

Run `npm test` and `npm run build`. Walk the Minesweeper QA item in flat mode and inside the 3D room (Phase 2) if it is merged: the board must be playable on the CRT.

```bash
git add README.md
git status --short
```

Ask whether to commit (suggested: `docs: Minesweeper controls and QA`).
