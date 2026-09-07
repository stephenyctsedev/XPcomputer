# XP Computer Portfolio — Phase 6 Implementation Plan (Polish, Performance, Release)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the finished site feel complete and ship it: lazy-loaded games so the first paint stays fast, the remaining XP flourishes (desktop right-click and Display Properties, Task Manager, keyboard navigation in the Start menu), an accessibility and performance pass, cross-browser fixes, and the public deploy.

**Architecture:** Small additive changes to the Phase 1 shell: a `games/index.js` that registers the three games as dynamic imports, two new small apps (`DisplayProperties.js`, `TaskManager.js`), keyboard handling inside `StartMenu.js`, ARIA attributes and focus styles in the existing CSS, and documentation. No new subsystems.

**Tech Stack:** Plain JavaScript, Vitest + jsdom, Vite code splitting, Chrome Lighthouse for measurement.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §9, §12, §13, §14 phase 6. Depends on Phases 1–5.

## Global Constraints

- Flat mode must never download three.js; game modules load only when launched.
- No Microsoft artwork or sounds anywhere; Task Manager and Display Properties are recreations in CSS and text.
- All new `localStorage` keys are prefixed `xpcomputer.` and read/written through the shell `storage`.
- **Never `git commit` or `git push` unless Stephen says so.** Creating the public GitHub repository and pushing are Stephen's explicit calls (Task 8 asks, never assumes).
- Files are UTF-8.

---

## File Structure (Phase 6)

| File | Responsibility |
|---|---|
| `src/xp/games/index.js` (+ test) | Lazy registration of `winmine`, `sol`, `pinball` |
| `src/xp/apps/DisplayProperties.js` (+ test) | Wallpaper picker dialog; `applyWallpaper()` |
| `src/xp/apps/TaskManager.js` (+ test) | Applications/Processes/Performance tabs over real windows |
| `src/xp/StartMenu.js` (+ test) | Arrow-key navigation, ARIA |
| `src/xp/createDesktop.js` | Wire the above; desktop and taskbar context menus; `taskmgr` in Run |
| `src/styles/xp-overrides.css` | Focus-visible styles, Task Manager and Display Properties layout |
| `src/xp/Taskbar.js`, `src/xp/Menu.js`, `src/xp/Desktop.js` | ARIA attributes |
| `README.md` | Performance numbers, browser notes, screenshots section, final checklist |

---

### Task 1: Lazy-load the games

**Files:**
- Create: `src/xp/games/index.js`, `src/xp/games/index.test.js`
- Modify: `src/xp/createDesktop.js`

**Interfaces:**
- Produces: `GAME_LOADERS` and `registerGames(registry, loaders = GAME_LOADERS)`. Each loader is `{ name, icon, load: () => Promise<module>, open: 'exportName', options?(ctx) }`. Launching returns a promise of the window.

- [ ] **Step 1: Write the failing test**

`src/xp/games/index.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createRegistry } from '../apps/registry.js';
import { registerGames, GAME_LOADERS } from './index.js';

describe('registerGames', () => {
  it('registers the three games and loads a module only when launched', async () => {
    const calls = [];
    const ctx = { reducedMotion: true, dialogs: { message() {} } };
    const registry = createRegistry(ctx);
    let loaded = 0;
    registerGames(registry, {
      sol: { name: 'Solitaire', icon: 'cards', load: async () => { loaded++; return { openSolitaire: (c, o) => calls.push(['sol', c === ctx, o]) }; }, open: 'openSolitaire', options: (c) => ({ reducedMotion: c.reducedMotion }) },
      winmine: { name: 'Minesweeper', icon: 'mine', load: async () => ({ openMinesweeper: (c) => calls.push(['winmine', c === ctx]) }), open: 'openMinesweeper' },
    });
    expect(registry.list().map((a) => a.id).sort()).toEqual(['sol', 'winmine']);
    expect(loaded).toBe(0);
    await registry.launch('sol');
    await registry.launch('winmine');
    expect(loaded).toBe(1);
    expect(calls).toEqual([['sol', true, { reducedMotion: true }], ['winmine', true]]);
  });
  it('ships loaders for all three games', () => {
    expect(Object.keys(GAME_LOADERS).sort()).toEqual(['pinball', 'sol', 'winmine']);
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement**

Run: `npx vitest run src/xp/games/index.test.js` → FAIL (module missing).

`src/xp/games/index.js`:

```js
/** Games are code-split: each module downloads the first time its app is launched. */
export const GAME_LOADERS = {
  winmine: { name: 'Minesweeper', icon: 'mine', load: () => import('./minesweeper/Minesweeper.js'), open: 'openMinesweeper' },
  sol: { name: 'Solitaire', icon: 'cards', load: () => import('./solitaire/Solitaire.js'), open: 'openSolitaire', options: (ctx) => ({ reducedMotion: ctx.reducedMotion }) },
  pinball: { name: 'Pinball', icon: 'pinball', load: () => import('./pinball/Pinball.js'), open: 'openPinball' },
};

export function registerGames(registry, loaders = GAME_LOADERS) {
  for (const [id, def] of Object.entries(loaders)) {
    registry.register(id, {
      name: def.name,
      icon: def.icon,
      launch: async (ctx) => {
        const mod = await def.load();
        return def.options ? mod[def.open](ctx, def.options(ctx)) : mod[def.open](ctx);
      },
    });
  }
}
```

In `src/xp/createDesktop.js`: remove the three static imports (`registerMinesweeper`, `registerSolitaire`, `registerPinball`) and their calls; add `import { registerGames } from './games/index.js';` and call `registerGames(registry);` after `registerMisc(registry)`.

Run: `npx vitest run src/xp/games/index.test.js src/xp/createDesktop.test.js` → PASS.

- [ ] **Step 3: Confirm the split in the build**

Run: `npm run build`
Expected: the output lists separate chunks whose names include `Minesweeper`, `Solitaire`, `Pinball` and the room (`mount`), and the main entry chunk is under 200 KB uncompressed. Record the sizes for Task 7.

- [ ] **Step 4: Stage**

```bash
git add src/xp/games/index.js src/xp/games/index.test.js src/xp/createDesktop.js
```

Suggested commit message: `perf: lazy-load the three games as separate chunks`

---

### Task 2: Desktop context menu and Display Properties

**Files:**
- Create: `src/xp/apps/DisplayProperties.js`, `src/xp/apps/DisplayProperties.test.js`
- Modify: `src/xp/createDesktop.js`, `src/styles/xp-overrides.css`

**Interfaces:**
- Produces: `WALLPAPERS = { hills, neon, none }` each `{ name, css(wallpaperUrl) }`, `applyWallpaper(desktopEl, key, wallpaperUrl)`, `registerDisplayProperties(registry)` (app id `display`), `openDisplayProperties(ctx)`. Shell context gains `desktopEl` and `wallpaperUrl`. Wallpaper choice persists under `xpcomputer.wallpaper`.

- [ ] **Step 1: Write the failing test**

`src/xp/apps/DisplayProperties.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { applyWallpaper, openDisplayProperties, WALLPAPERS } from './DisplayProperties.js';

describe('Display Properties', () => {
  let ctx, mem, desktopEl;
  beforeEach(() => {
    document.body.innerHTML = '<div id="desk"></div><div id="layer"></div>';
    desktopEl = document.querySelector('#desk');
    mem = new Map();
    ctx = { wm: createWindowManager(document.querySelector('#layer')), desktopEl, wallpaperUrl: '/wp.svg', storage: { get: (k) => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) } };
  });
  it('applies each wallpaper as a CSS background', () => {
    applyWallpaper(desktopEl, 'hills', '/wp.svg');
    expect(desktopEl.style.background).toContain('/wp.svg');
    applyWallpaper(desktopEl, 'neon', '/wp.svg');
    expect(desktopEl.style.background).toContain('gradient');
    applyWallpaper(desktopEl, 'bogus', '/wp.svg');
    expect(desktopEl.style.background).toContain('/wp.svg');
    expect(Object.keys(WALLPAPERS)).toEqual(['hills', 'neon', 'none']);
  });
  it('previews a selection and saves it on OK', () => {
    const win = openDisplayProperties(ctx);
    const select = win.el.querySelector('select');
    select.value = 'neon';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(win.el.querySelector('.xp-display-preview').style.background).toContain('gradient');
    win.el.querySelector('[data-result="OK"]').click();
    expect(mem.get('xpcomputer.wallpaper')).toBe('neon');
    expect(desktopEl.style.background).toContain('gradient');
    expect(ctx.wm.windows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement**

Run: `npx vitest run src/xp/apps/DisplayProperties.test.js` → FAIL (module missing).

`src/xp/apps/DisplayProperties.js`:

```js
import { iconEl } from '../icons/index.js';

export const WALLPAPERS = {
  hills: { name: 'Rolling Hills', css: (url) => `#3a6ea5 url("${url}") center / cover no-repeat` },
  neon: { name: 'Neon Night', css: () => 'radial-gradient(ellipse at 30% 20%, #4b2a7f, transparent 55%), radial-gradient(ellipse at 80% 80%, #0b5c73, transparent 50%), #0b0714' },
  none: { name: 'None', css: () => '#3a6ea5' },
};
const KEY = 'xpcomputer.wallpaper';

export function applyWallpaper(desktopEl, key, wallpaperUrl) {
  const wallpaper = WALLPAPERS[key] ?? WALLPAPERS.hills;
  desktopEl.style.background = wallpaper.css(wallpaperUrl);
}

export function registerDisplayProperties(registry) {
  registry.register('display', { name: 'Display Properties', icon: 'controlpanel', launch: openDisplayProperties });
}

export function openDisplayProperties(ctx) {
  const { wm, storage, desktopEl, wallpaperUrl } = ctx;
  let choice = WALLPAPERS[storage.get(KEY)] ? storage.get(KEY) : 'hills';
  const content = document.createElement('div');
  content.className = 'xp-display';
  content.innerHTML = `
    <menu role="tablist"><li role="tab"><a href="#themes">Themes</a></li><li role="tab" aria-selected="true"><a href="#desktop">Desktop</a></li><li role="tab"><a href="#settings">Settings</a></li></menu>
    <div class="window" role="tabpanel">
      <div class="xp-display-monitor"><div class="xp-display-preview"></div><span class="xp-display-stand"></span></div>
      <div class="field-row-stacked"><label for="xp-wallpaper">Background:</label>
        <select id="xp-wallpaper">${Object.entries(WALLPAPERS).map(([k, w]) => `<option value="${k}">${w.name}</option>`).join('')}</select></div>
      <p class="xp-display-note">Themes and Settings are display-only in this demo.</p>
    </div>
    <div class="xp-msgbox-buttons xp-display-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button><button type="button" data-result="Apply">Apply</button></div>`;
  const preview = content.querySelector('.xp-display-preview');
  const select = content.querySelector('select');
  select.value = choice;
  const showPreview = () => { preview.style.background = WALLPAPERS[choice].css(wallpaperUrl); };
  showPreview();
  select.addEventListener('change', () => { choice = select.value; showPreview(); });
  const win = wm.open({ appId: 'display', title: 'Display Properties', icon: 'controlpanel', dialog: true, width: 400, height: 430, content });
  const apply = () => { storage.set(KEY, choice); applyWallpaper(desktopEl, choice, wallpaperUrl); };
  content.addEventListener('click', (e) => {
    const result = e.target.closest('[data-result]')?.dataset.result;
    if (result === 'OK') { apply(); win.close(); }
    else if (result === 'Apply') apply();
    else if (result === 'Cancel') win.close();
  });
  content.querySelector('.xp-display-stand').append(iconEl('computer', 0));
  return win;
}
```

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Display Properties ---- */
.xp-display { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 10px; font-size: 11px; }
.xp-display [role="tabpanel"] { flex: 1; padding: 12px; }
.xp-display-monitor { width: 200px; margin: 0 auto 12px; }
.xp-display-preview { height: 140px; border: 8px solid #d7d3c8; border-radius: 6px; box-shadow: inset 0 0 0 2px #333; }
.xp-display-stand { display: block; width: 60px; height: 10px; margin: 0 auto; background: #bdb8ac; border-radius: 0 0 4px 4px; }
.xp-display-note { color: #666; margin: 12px 0 0; }
.xp-display-buttons { justify-content: flex-end; padding-top: 10px; }
```

In `src/xp/createDesktop.js`:

```js
import { registerDisplayProperties, applyWallpaper } from './apps/DisplayProperties.js';
// ctx gains: desktopEl, wallpaperUrl
// after registerMisc(registry):
  registerDisplayProperties(registry);
// after the ctx is built, replace rootEl.style.setProperty('--xp-wallpaper', …) with:
  applyWallpaper(desktopEl, storage.get('xpcomputer.wallpaper') ?? 'hills', wallpaperUrl);
// desktop right-click:
  desktopEl.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.xp-window, .xp-desktop-icon')) return;
    e.preventDefault();
    const { x, y } = toDesktopPoint(e.clientX, e.clientY);
    menus.openAt(x, y, [
      { label: 'Arrange Icons By Name', action: () => sounds.play('click') },
      { label: 'Refresh', action: () => sounds.play('click') },
      { separator: true },
      { label: 'Properties', action: launch('display') },
    ]);
  });
```

Run: `npx vitest run src/xp/apps/DisplayProperties.test.js src/xp/createDesktop.test.js` → PASS.

- [ ] **Step 3: Stage**

```bash
git add src/xp/apps/DisplayProperties.js src/xp/apps/DisplayProperties.test.js src/xp/createDesktop.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: desktop context menu and Display Properties wallpaper picker`

---

### Task 3: Task Manager

**Files:**
- Create: `src/xp/apps/TaskManager.js`, `src/xp/apps/TaskManager.test.js`
- Modify: `src/xp/createDesktop.js` (register, taskbar right-click, `taskmgr` in Run), `src/styles/xp-overrides.css`

**Interfaces:**
- Produces: `registerTaskManager(registry)` (app id `taskmgr`), `openTaskManager(ctx)`. Reads live windows from `ctx.wm` and refreshes on `open`, `close`, `title`.

- [ ] **Step 1: Write the failing test**

`src/xp/apps/TaskManager.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { openTaskManager } from './TaskManager.js';

describe('Task Manager', () => {
  let ctx;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="layer"></div>';
    ctx = { wm: createWindowManager(document.querySelector('#layer')), dialogs: { message: vi.fn(() => Promise.resolve('OK')) }, registry: { launch: vi.fn() } };
  });
  it('lists open windows as applications and ends the selected one', () => {
    ctx.wm.open({ appId: 'notepad', title: 'todo.txt - Notepad' });
    const ie = ctx.wm.open({ appId: 'iexplore', title: 'Homepage - Internet Explorer' });
    const tm = openTaskManager(ctx);
    const rows = () => [...tm.el.querySelectorAll('.xp-tm-apps tbody tr')].map((r) => r.children[0].textContent);
    expect(rows()).toEqual(['todo.txt - Notepad', 'Homepage - Internet Explorer']);
    tm.el.querySelectorAll('.xp-tm-apps tbody tr')[1].click();
    tm.el.querySelector('[data-cmd="endtask"]').click();
    expect(ctx.wm.windows.includes(ie)).toBe(false);
    expect(rows()).toEqual(['todo.txt - Notepad']);
  });
  it('refuses to end system processes and shows real windows as processes', () => {
    ctx.wm.open({ appId: 'notepad', title: 'Untitled - Notepad' });
    const tm = openTaskManager(ctx);
    tm.el.querySelectorAll('[role="tab"]')[1].click();
    const names = [...tm.el.querySelectorAll('.xp-tm-procs tbody tr')].map((r) => r.children[0].textContent);
    expect(names).toContain('notepad.exe');
    expect(names).toContain('System Idle Process');
    [...tm.el.querySelectorAll('.xp-tm-procs tbody tr')].find((r) => r.children[0].textContent === 'System').click();
    tm.el.querySelector('[data-cmd="endprocess"]').click();
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('Access is denied');
    vi.advanceTimersByTime(2000);
    expect(tm.el.querySelector('.xp-tm-cpu').textContent).toMatch(/\d+%/);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement**

Run: `npx vitest run src/xp/apps/TaskManager.test.js` → FAIL (module missing).

`src/xp/apps/TaskManager.js`:

```js
const SYSTEM_PROCESSES = [
  ['System Idle Process', 'SYSTEM', 96, '16 K'], ['System', 'SYSTEM', 0, '212 K'], ['smss.exe', 'SYSTEM', 0, '388 K'],
  ['csrss.exe', 'SYSTEM', 1, '3,412 K'], ['winlogon.exe', 'SYSTEM', 0, '2,104 K'], ['services.exe', 'SYSTEM', 0, '3,760 K'],
  ['svchost.exe', 'SYSTEM', 0, '4,916 K'], ['svchost.exe', 'NETWORK SERVICE', 0, '3,208 K'], ['spoolsv.exe', 'SYSTEM', 0, '4,020 K'],
  ['neon.exe', 'Stephen', 1, '1,337 K'], ['explorer.exe', 'Stephen', 1, '18,204 K'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerTaskManager(registry) {
  registry.register('taskmgr', { name: 'Windows Task Manager', icon: 'exe', launch: openTaskManager });
}

export function openTaskManager(ctx) {
  const { wm, dialogs, registry } = ctx;
  const existing = wm.find('taskmgr')[0];
  if (existing) { existing.focus(); return existing; }
  const content = document.createElement('div');
  content.className = 'xp-tm';
  content.innerHTML = `
    <menu role="tablist">
      <li role="tab" aria-selected="true"><a href="#apps">Applications</a></li>
      <li role="tab"><a href="#procs">Processes</a></li>
      <li role="tab"><a href="#perf">Performance</a></li>
    </menu>
    <div class="window" role="tabpanel" data-tab="apps">
      <div class="sunken-panel xp-tm-list"><table class="xp-tm-apps"><thead><tr><th>Task</th><th>Status</th></tr></thead><tbody></tbody></table></div>
      <div class="xp-msgbox-buttons xp-tm-buttons"><button type="button" data-cmd="endtask">End Task</button><button type="button" data-cmd="switchto">Switch To</button><button type="button" data-cmd="newtask">New Task...</button></div>
    </div>
    <div class="window" role="tabpanel" data-tab="procs" hidden>
      <div class="sunken-panel xp-tm-list"><table class="xp-tm-procs"><thead><tr><th>Image Name</th><th>User Name</th><th>CPU</th><th>Mem Usage</th></tr></thead><tbody></tbody></table></div>
      <div class="xp-msgbox-buttons xp-tm-buttons"><button type="button" data-cmd="endprocess">End Process</button></div>
    </div>
    <div class="window" role="tabpanel" data-tab="perf" hidden>
      <div class="xp-tm-perf"><fieldset><legend>CPU Usage</legend><div class="xp-tm-gauge xp-tm-cpu">3%</div></fieldset><fieldset><legend>PF Usage</legend><div class="xp-tm-gauge">312 MB</div></fieldset></div>
      <fieldset><legend>Totals</legend><div class="xp-tm-totals">Handles 8,214 &nbsp; Threads 402 &nbsp; Processes <span class="xp-tm-count"></span></div></fieldset>
    </div>
    <div class="status-bar"><p class="status-bar-field xp-tm-status-procs"></p><p class="status-bar-field xp-tm-status-cpu">CPU Usage: 3%</p><p class="status-bar-field">Commit Charge: 312M / 1250M</p></div>`;
  const win = wm.open({ appId: 'taskmgr', title: 'Windows Task Manager', icon: 'exe', width: 440, height: 480, minWidth: 380, minHeight: 360, content, onClose: () => { clearInterval(timer); unsubscribe.forEach((off) => off()); } });
  const appsBody = content.querySelector('.xp-tm-apps tbody');
  const procsBody = content.querySelector('.xp-tm-procs tbody');
  const appWindows = () => wm.windows.filter((w) => !w.isDialog && w !== win);
  let selectedApp = null;
  let selectedProc = null;

  function select(tbody, row, setter) {
    tbody.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'));
    row?.classList.add('selected');
    setter(row ? row.dataset.key : null);
  }
  function render() {
    appsBody.innerHTML = appWindows().map((w) => `<tr data-key="${w.id}"><td>${esc(w.title)}</td><td>Running</td></tr>`).join('');
    const live = appWindows().map((w) => [`${w.appId}.exe`, 'Stephen', 0, `${(4000 + w.title.length * 137).toLocaleString()} K`, w.id]);
    procsBody.innerHTML = [...live, ...SYSTEM_PROCESSES.map((p) => [...p, ''])]
      .map(([name, user, cpu, mem, id]) => `<tr data-key="${id || `sys:${name}`}"><td>${esc(name)}</td><td>${esc(user)}</td><td>${String(cpu).padStart(2, '0')}</td><td>${mem}</td></tr>`).join('');
    const count = live.length + SYSTEM_PROCESSES.length;
    content.querySelector('.xp-tm-status-procs').textContent = `Processes: ${count}`;
    content.querySelector('.xp-tm-count').textContent = String(count);
    if (selectedApp) select(appsBody, appsBody.querySelector(`[data-key="${selectedApp}"]`), (k) => { selectedApp = k; });
  }
  appsBody.addEventListener('click', (e) => select(appsBody, e.target.closest('tr'), (k) => { selectedApp = k; }));
  procsBody.addEventListener('click', (e) => select(procsBody, e.target.closest('tr'), (k) => { selectedProc = k; }));
  content.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    e.preventDefault();
    const name = tab.querySelector('a').getAttribute('href').slice(1);
    content.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    content.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.dataset.tab !== name; });
  });
  content.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    const app = appWindows().find((w) => w.id === selectedApp);
    if (cmd === 'endtask') app?.close();
    else if (cmd === 'switchto') app?.focus();
    else if (cmd === 'newtask') registry.launch('run');
    else if (cmd === 'endprocess') {
      const target = appWindows().find((w) => w.id === selectedProc);
      if (target) target.close();
      else if (selectedProc) dialogs.message({ title: 'Unable to Terminate Process', kind: 'error', owner: win, text: 'The operation could not be completed.\n\nAccess is denied.' });
    }
  });
  const unsubscribe = ['open', 'close', 'title'].map((ev) => wm.on(ev, render));
  const timer = setInterval(() => {
    const cpu = 2 + Math.floor(Math.random() * 6) + (appWindows().length > 2 ? 10 : 0);
    content.querySelector('.xp-tm-cpu').textContent = `${cpu}%`;
    content.querySelector('.xp-tm-status-cpu').textContent = `CPU Usage: ${cpu}%`;
  }, 1000);
  render();
  return win;
}
```

`registry.launch('run')` requires a `run` app: in `src/xp/createDesktop.js` register one next to the others:

```js
  registry.register('run', { name: 'Run', icon: 'run', launch: () => dialogs.run({ onRun: runCommand }) });
```

and add `'taskmgr'` and `'display'` to `RUNNABLE`. Also give the taskbar a right-click menu in `createDesktop.js`:

```js
  rootEl.querySelector('.xp-taskbar-root').addEventListener('contextmenu', (e) => {
    if (e.target.closest('.xp-task, .xp-start')) return;
    e.preventDefault();
    const { x, y } = toDesktopPoint(e.clientX, e.clientY);
    menus.openAt(x, y - 60, [{ label: 'Task Manager', action: launch('taskmgr') }, { separator: true }, { label: 'Properties', action: launch('display') }]);
  });
```

Register: `import { registerTaskManager } from './apps/TaskManager.js';` and `registerTaskManager(registry);`.

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Task Manager ---- */
.xp-tm { display: flex; flex-direction: column; flex: 1; min-height: 0; padding: 8px; font-size: 11px; }
.xp-tm [role="tabpanel"] { flex: 1; display: flex; flex-direction: column; min-height: 0; padding: 8px; }
.xp-tm-list { flex: 1; overflow: auto; background: #fff; }
.xp-tm table { width: 100%; border-collapse: collapse; }
.xp-tm th { text-align: left; font-weight: normal; padding: 2px 6px; background: #ece9d8; border-right: 1px solid #aca899; border-bottom: 1px solid #aca899; position: sticky; top: 0; }
.xp-tm td { padding: 2px 6px; white-space: nowrap; }
.xp-tm tr.selected td { background: #316ac5; color: #fff; }
.xp-tm-buttons { justify-content: flex-end; padding-top: 8px; }
.xp-tm-perf { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.xp-tm-gauge { height: 70px; display: grid; place-items: center; background: #000; color: #0f0; font: bold 18px "Courier New", monospace; border: 1px solid #555; }
```

Run: `npx vitest run src/xp/apps/TaskManager.test.js src/xp/createDesktop.test.js` → PASS.

- [ ] **Step 3: Stage**

```bash
git add src/xp/apps/TaskManager.js src/xp/apps/TaskManager.test.js src/xp/createDesktop.js src/styles/xp-overrides.css
```

Suggested commit message: `feat: Task Manager over live windows, taskbar context menu`

---

### Task 4: Start menu keyboard navigation and ARIA

**Files:**
- Create: `src/xp/StartMenu.test.js`
- Modify: `src/xp/StartMenu.js`, `src/xp/Taskbar.js`, `src/xp/Menu.js`, `src/xp/Desktop.js`, `src/styles/xp-overrides.css`

- [ ] **Step 1: Write the failing test**

`src/xp/StartMenu.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { createStartMenu } from './StartMenu.js';

describe('Start menu keyboard', () => {
  let menu, hits, root;
  beforeEach(() => {
    document.body.innerHTML = '<div id="sm"></div>';
    root = document.querySelector('#sm');
    hits = [];
    menu = createStartMenu(root, {
      userName: 'Stephen',
      left: [{ label: 'Internet', sublabel: 'Internet Explorer', icon: 'ie', action: () => hits.push('ie') }, { label: 'Notepad', icon: 'notepad', action: () => hits.push('notepad') }],
      right: [{ label: 'My Computer', icon: 'computer', action: () => hits.push('computer') }],
      allPrograms: [], onLogOff: () => hits.push('logoff'), onTurnOff: () => hits.push('turnoff'),
    });
  });
  it('focuses the first item on open and moves with arrows', () => {
    menu.open();
    expect(document.activeElement.textContent).toContain('Internet');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Notepad');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Turn Off');
    document.activeElement.click();
    expect(hits).toEqual(['turnoff']);
    expect(menu.isOpen).toBe(false);
  });
  it('has menu semantics', () => {
    expect(root.getAttribute('role')).toBe('menu');
    expect(root.querySelector('.xp-sm-item').getAttribute('role')).toBe('menuitem');
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement**

Run: `npx vitest run src/xp/StartMenu.test.js` → FAIL.

In `src/xp/StartMenu.js`:

- In `createStartMenu`, right after `rootEl.classList.add('xp-startmenu')`, add `rootEl.setAttribute('role', 'menu');`.
- In `row()`, after `b.className = 'xp-sm-item';`, add `b.setAttribute('role', 'menuitem');`. Give the two footer buttons `role="menuitem"` in the template.
- Replace `onKey` with:

```js
  const focusables = () => [...rootEl.querySelectorAll('.xp-sm-item, .xp-sm-footer-btn')].filter((b) => !b.closest('.xp-sm-flyout'));
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = focusables();
    const index = items.indexOf(document.activeElement);
    const next = e.key === 'ArrowDown' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
    items[next]?.focus();
  }
```

- In `open()`, after `rootEl.hidden = false;`, add `focusables()[0]?.focus();`.

ARIA touches:
- `src/xp/Taskbar.js`: give the mute button `aria-label="Toggle sound"` and the Start button `aria-haspopup="menu"`; in `setStartActive(on)` also set `start.setAttribute('aria-expanded', String(on))`.
- `src/xp/Menu.js`: `menu.setAttribute('role', 'menu')` in `build()`, `row.setAttribute('role', 'menuitem')` per item.
- `src/xp/Desktop.js`: each icon button gets `aria-label = def.label`.

Append to `src/styles/xp-overrides.css`:

```css
/* ---- Focus visibility ---- */
.xp-screen :is(.xp-sm-item, .xp-sm-footer-btn, .xp-menu-item, .xp-task, .xp-tb, .xp-item, .ms-cell, .sol-deck-choice):focus-visible { outline: 1px dotted #000; outline-offset: -2px; }
.xp-screen :is(.xp-sm-item, .xp-sm-footer-btn, .xp-task):focus-visible { outline-color: #fff; }
```

Run: `npx vitest run src/xp/StartMenu.test.js src/xp/Taskbar.test.js src/xp/Menu.test.js src/xp/createDesktop.test.js` → PASS.

- [ ] **Step 3: Stage**

```bash
git add src/xp/StartMenu.js src/xp/StartMenu.test.js src/xp/Taskbar.js src/xp/Menu.js src/xp/Desktop.js src/styles/xp-overrides.css
```

Suggested commit message: `a11y: keyboard navigation in the Start menu, menu roles, focus styles`

---

### Task 5: Cross-browser pass

**Files:**
- Modify: `src/styles/xp-overrides.css`, `src/styles/room.css` (only if a fix is needed)

- [ ] **Step 1: Test matrix**

Run `npm run build && npm run preview` and open the preview URL in Chrome, Edge, Firefox and (if available) Safari. For each: room mode load, click PC, boot, IE + PDF, one game, Escape, Turn Off, `?mode=flat`, phone emulation.

- [ ] **Step 2: Known fixes to apply only when observed**

- Firefox renders 3D-transformed text softly: add to `src/styles/room.css`
  `.room-css-layer .xp-screen { backface-visibility: hidden; transform-style: flat; }` and re-check crispness when focused.
- Safari blocks audio until a user gesture inside the same frame: confirm `sounds.unlock()` runs from the PC click (it does via the room's pointer handler when the screen becomes interactive; if not, call `sounds.unlock()` in `mount.js` on `pcClicked` through `desktop.ctx.sounds.unlock()`).
- Safari PDF in iframe shows only page one without scroll: the Adobe Reader fallback text already offers download; no code change.
- Any browser where the CRT overlay stays visible when focused: check `.xp-crt[hidden]` gets `display:block!important; opacity:0` (Phase 1 CSS) and that no later rule resets `display`.

- [ ] **Step 3: Record**

Add a "Browser notes" section to `README.md` listing tested versions and any quirks with their workaround.

```bash
git add README.md src/styles
```

Suggested commit message: `fix: cross-browser adjustments and browser notes`

---

### Task 6: Performance measurement

- [ ] **Step 1: Bundle**

Run: `npm run build`. Copy the chunk table into `README.md` under a new `## Performance` heading: entry chunk, room chunk, each game chunk, CSS, gzip sizes as printed by Vite. Confirm the entry chunk contains no three.js (search `dist/assets/index-*.js` for `WebGLRenderer`: `grep -c WebGLRenderer dist/assets/index-*.js` must print 0).

- [ ] **Step 2: Lighthouse**

Run: `npm run preview`, open Chrome DevTools → Lighthouse → Desktop → Performance + Accessibility + Best Practices on `?mode=flat` and on the default URL. Targets: Performance ≥ 90 flat / ≥ 75 room, Accessibility ≥ 90. Record the four numbers in the README. If Accessibility flags contrast on the taskbar clock or Start menu sublabels, darken `.xp-sm-sublabel` to `#4a5d7c` and re-run.

- [ ] **Step 3: Runtime**

In room mode, open DevTools Performance, record 10 s of orbiting: no long tasks over 50 ms after load, steady 60 fps (or 30 fps on integrated GPUs with Low FX off). Switch tabs for 10 s: CPU drops to idle (render loop paused). Record the observation.

```bash
git add README.md
```

Suggested commit message: `docs: performance numbers`

---

### Task 7: Final QA, README, screenshots

- [ ] **Step 1: Full checklist**

Walk every line of `## Manual QA checklist` in `README.md` in Chrome and Firefox, in flat mode and in the room. Fix anything that fails before continuing; each fix gets its own staged change with a suggested commit message.

- [ ] **Step 2: README**

Add `## Screenshots` with three images Stephen captures himself (room overview, focused CRT with IE, one game) saved under `docs/screenshots/` and referenced with relative paths. Add `## How it was built` (three paragraphs: the CSS3D screen trick, the pure engines with tests, the no-Microsoft-assets rule). Mark roadmap item 6 done.

```bash
git add README.md docs/screenshots
```

Suggested commit message: `docs: screenshots, build notes, final QA`

---

### Task 8: Release

- [ ] **Step 1: Ask before anything outward-facing**

Report the state (tests green, build size, QA done) and ask Stephen two explicit questions: (1) commit the polish work with the suggested messages? (2) create the public repository `stephenyctsedev/XPcomputer` and push `main`?

- [ ] **Step 2: Only after an explicit yes**

```bash
gh repo create stephenyctsedev/XPcomputer --public --source=. --remote=origin --description "Stephen Tse's interactive resume: a cyberpunk bedroom with a PC running a fake Windows XP" 
git push -u origin main
```

Then in the repository settings → Pages → Source: "GitHub Actions". Watch the first workflow run with `gh run watch`, then open https://stephenyctsedev.github.io/XPcomputer/ and repeat the smoke test (room loads, IE shows the resume, PDF downloads).

- [ ] **Step 3: Hand back**

Report the live URL, the workflow result, and anything left on the roadmap.
