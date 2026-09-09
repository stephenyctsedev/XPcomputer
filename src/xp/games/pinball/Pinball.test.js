import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../../WindowManager.js';
import { createMenus } from '../../Menu.js';
import { openPinball } from './Pinball.js';

describe('Pinball window', () => {
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
  const open = () => openPinball(ctx, { autoLoop: false });
  const key = (el, type, k) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));

  it('opens with the panel, a resting ball and a single instance', () => {
    const win = open();
    expect(win.el.querySelector('.pb-ball').textContent).toBe('1 / 3');
    expect(win.el.querySelector('.pb-score-value').textContent).toBe('0');
    expect(win.el.querySelectorAll('.pb-letter')).toHaveLength(7);
    expect(win.pinball.table.ball.atRest).toBe(true);
    expect(openPinball(ctx)).toBe(win);
  });

  it('charges with the space bar and launches on release', () => {
    const win = open();
    const body = win.el.querySelector('.pb');
    key(body, 'keydown', ' ');
    win.pinball.advance(0.5);
    expect(win.pinball.table.plunger.charge).toBeCloseTo(0.5, 1);
    key(body, 'keyup', ' ');
    win.pinball.advance(1 / 240);
    expect(win.pinball.table.ball.atRest).toBe(false);
    expect(win.pinball.table.ball.vy).toBeLessThan(-900);
    expect(played).toContain('click');
  });

  it('F2 starts a new game and F3 pauses the simulation', () => {
    const win = open();
    const body = win.el.querySelector('.pb');
    win.pinball.table.score = 4200;
    key(body, 'keydown', 'F2');
    expect(win.pinball.table.score).toBe(0);
    key(body, 'keydown', 'F3');
    win.pinball.advance(0.1);
    expect(win.pinball.table.time).toBe(0);
    expect(win.el.querySelector('.pb-mission').textContent).toContain('Paused');
  });

  it('saves the high score and offers a new game when the last ball drains', () => {
    const win = open();
    const t = win.pinball.table;
    t.score = 777;
    t.ballNumber = 3;
    Object.assign(t.ball, { inLane: false, atRest: false, x: 200, y: 760, vx: 0, vy: 100 });
    win.pinball.advance(1 / 240);
    expect(t.state).toBe('over');
    expect(mem.get('xpcomputer.pinball.high')).toBe('777');
    expect(win.el.querySelector('.pb-high').textContent).toBe('777');
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('Game over');
    expect(played).toContain('drain');
  });

  it('unsubscribes its window-manager minimize listener when the window closes', () => {
    const win = open();
    win.close();
    // If the minimize listener registered by openPinball leaked (the bug this guards against),
    // this would call togglePause() and flip the "Paused" mission text even though the window
    // (and the game loop with it) is gone.
    win.minimize();
    expect(win.el.querySelector('.pb-mission').textContent).not.toContain('Paused');
  });
});
