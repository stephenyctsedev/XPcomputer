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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });
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

  it('renders the mines LED with a leading minus when over-flagged', () => {
    const win = openMinesweeper(ctx);
    const cells = [...win.el.querySelectorAll('.ms-cell')].slice(0, 11);
    cells.forEach((cell) => press(cell, 2, 2));
    expect(win.el.querySelector('.ms-mines').textContent).toBe('-01');
  });

  it('restarts on F2 dispatched at the document level even when no cell is focused', () => {
    const win = openMinesweeper(ctx);
    document.activeElement?.blur?.();
    document.body.focus?.();
    const cell0 = win.el.querySelector('.ms-cell[data-i="0"]');
    press(cell0, 2, 2);
    expect(win.el.querySelector('.ms-mines').textContent).toBe('009');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
    expect(win.el.querySelector('.ms-mines').textContent).toBe('010');
  });

  it('ignores F2 when a different window has focus', () => {
    const win = openMinesweeper(ctx);
    const cell0 = win.el.querySelector('.ms-cell[data-i="0"]');
    press(cell0, 2, 2);
    expect(win.el.querySelector('.ms-mines').textContent).toBe('009');
    const other = ctx.wm.open({ appId: 'notepad', title: 'Notepad' });
    other.focus();
    expect(win.isFocused).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F2', bubbles: true }));
    expect(win.el.querySelector('.ms-mines').textContent).toBe('009');
  });

  it('snapshots time/level before the name prompt resolves and inert-guards the window meanwhile', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const win = openMinesweeper(ctx);
    const cellEls = win.el.querySelectorAll('.ms-cell');

    // Deterministic RNG (stubbed to 0) makes placeMines() put all 10 Beginner
    // mines at indices 1-10 once index 0 is revealed as the safe opener (see
    // engine.js's Fisher-Yates loop: a constant-0 random() leaves the pool
    // unshuffled, so `picks` is just the pool's first `mines` entries).
    press(cellEls[0], 0, 1);
    release(cellEls[0], 0);
    vi.advanceTimersByTime(5000);

    const mineIndices = new Set(Array.from({ length: 10 }, (_, k) => k + 1));
    for (let i = 1; i < cellEls.length; i++) {
      if (mineIndices.has(i) || cellEls[i].classList.contains('revealed')) continue;
      press(cellEls[i], 0, 1);
      release(cellEls[i], 0);
    }

    // Winning just opened the "Congratulations" name prompt; the owner window
    // must be inert for as long as that prompt is open.
    const dlg = ctx.wm.windows.find((w) => w.appId === 'dialog');
    expect(dlg).toBeTruthy();
    expect(win.el.classList.contains('xp-inert')).toBe(true);

    // Intervening interaction while the prompt is still open: switch level. This
    // mutates the closure's `levelName` and (via newGame) resets `seconds` to 0 -
    // exactly the state the buggy code would have read after the await.
    win.el.querySelector('.xp-menubar-item').click();
    [...document.querySelectorAll('.xp-menu-item')].find((b) => b.textContent.includes('Intermediate')).click();
    expect(win.el.querySelectorAll('.ms-cell')).toHaveLength(256);

    // Resolve the prompt with the default name now that state has changed underneath it.
    dlg.el.querySelector('.xp-msgbox-buttons button').click();
    await Promise.resolve();
    await Promise.resolve();

    expect(win.el.classList.contains('xp-inert')).toBe(false);
    const best = JSON.parse(ctx.storage.get('xpcomputer.winmine.best'));
    expect(best.beginner).toEqual({ time: 5, name: 'Anonymous' });
    expect(best.intermediate).toBeUndefined();
  });
});
