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
});
