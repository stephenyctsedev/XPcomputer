import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../../WindowManager.js';
import { createMenus } from '../../Menu.js';
import { fromState } from './engine.js';
import { openSolitaire } from './Solitaire.js';

const full = (suit) => Array.from({ length: 13 }, (_, i) => `${suit}${i + 1}`);

describe('Solitaire window', () => {
  let ctx, played, mem;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    played = [];
    mem = new Map();
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      menus: createMenus(document.querySelector('#screen')),
      dialogs: { message: vi.fn(() => Promise.resolve('No')) },
      sounds: { play: (n) => played.push(n) },
      storage: { get: (k) => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
    };
  });
  const open = (dealer) => openSolitaire(ctx, { dealer, reducedMotion: true });
  const pointer = (el, type, init = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init }));

  it('renders the deal, draws from the stock, and sends a card home on double-click', () => {
    const win = open(() => fromState({ draw: 1, stock: ['S5', 'H1'], tableau: [['H12'], ['S13'], [], [], [], [], []] }));
    expect(win.el.querySelectorAll('.sol-card')).toHaveLength(3);
    expect(win.el.querySelector('.sol-score').textContent).toBe('Score: 0');
    win.el.querySelector('.sol-stock').click();
    expect(win.el.querySelector('.sol-waste .sol-card').dataset.id).toBe('H1');
    expect(played).toContain('cardFlip');
    win.el.querySelector('.sol-waste .sol-card').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(win.el.querySelector('.sol-foundation .sol-card').dataset.id).toBe('H1');
    expect(win.el.querySelector('.sol-score').textContent).toBe('Score: 10');
    expect(played).toContain('cardPlace');
    expect(openSolitaire(ctx)).toBe(win);
  });

  it('drags a run onto another column and undoes it with Ctrl+Z', () => {
    const win = open(() => fromState({ tableau: [['H12'], ['S13'], [], [], [], [], []] }));
    const queen = win.el.querySelector('.sol-card[data-id="H12"]');
    pointer(queen, 'pointerdown', { clientX: 20, clientY: 20 });
    expect(win.el.querySelector('.sol-drag')).not.toBeNull();
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 30 }));
    pointer(win.el.querySelector('.sol-col[data-col="1"]'), 'pointerup', { clientX: 120, clientY: 30 });
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(2);
    expect(win.el.querySelector('.sol-drag')).toBeNull();
    win.el.querySelector('.sol-table').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(1);
    expect(win.el.querySelectorAll('.sol-col[data-col="0"] .sol-card')).toHaveLength(1);
  });

  it('drops an invalid move back where it came from', () => {
    const win = open(() => fromState({ tableau: [['H12'], ['H13'], [], [], [], [], []] }));
    pointer(win.el.querySelector('.sol-card[data-id="H12"]'), 'pointerdown', { clientX: 5, clientY: 5 });
    pointer(win.el.querySelector('.sol-col[data-col="1"]'), 'pointerup');
    expect(win.el.querySelectorAll('.sol-col[data-col="0"] .sol-card')).toHaveLength(1);
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(1);
  });

  it('wins with the last foundation card and offers a new deal', async () => {
    const win = open(() => fromState({ waste: ['C13'], foundations: [full('S'), full('H'), full('D'), full('C').slice(0, 12)] }));
    win.el.querySelector('.sol-waste .sol-card').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('You won');
    expect(played).toContain('win');
  });

  it('saves options and redeals with draw three', () => {
    const win = open(() => fromState({ stock: ['S1', 'S2', 'S3', 'S4'] }));
    win.el.querySelector('.xp-menubar-item').click();
    [...document.querySelectorAll('.xp-menu-item')].find((b) => b.textContent.includes('Options')).click();
    const dlg = ctx.wm.windows.find((w) => w.appId === 'dialog');
    dlg.el.querySelector('#sol-draw3').checked = true;
    dlg.el.querySelector('[data-result="OK"]').click();
    expect(JSON.parse(mem.get('xpcomputer.sol.options')).draw).toBe(3);
    win.el.querySelector('.sol-stock').click();
    expect(win.el.querySelectorAll('.sol-waste .sol-card')).toHaveLength(3);
  });
});
