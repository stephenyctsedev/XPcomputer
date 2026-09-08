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
