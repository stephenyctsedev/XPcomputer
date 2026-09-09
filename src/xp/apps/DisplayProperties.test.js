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
