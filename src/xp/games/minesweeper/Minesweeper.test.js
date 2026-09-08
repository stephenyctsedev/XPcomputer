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
