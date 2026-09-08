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

  it('removes root-level keydown/pointerdown listeners on destroy', () => {
    const desktop = mount();
    const unlockSpy = vi.spyOn(desktop.ctx.sounds, 'unlock');
    desktop.destroy();

    const keyEvent = new KeyboardEvent('keydown', { key: 'F4', altKey: true, bubbles: true, cancelable: true });
    desktop.el.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(false);

    desktop.el.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(unlockSpy).not.toHaveBeenCalled();
  });

  it('emits a sound event alongside every UI sound cue', () => {
    const desktop = mount();
    const played = [];
    desktop.on('sound', (name) => played.push(name));
    desktop.el.querySelector('.xp-start').click();
    expect(played).toContain('menu');
  });

  it('closes an open Start menu and menubar menu on destroy, leaving no document-level listeners or intervals armed', () => {
    const addSpy = vi.spyOn(document, 'addEventListener');
    const removeSpy = vi.spyOn(document, 'removeEventListener');
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    const desktop = mount();
    desktop.setInteractive(true);

    // Open the Start menu: StartMenu.js arms document pointerdown(capture)/keydown listeners.
    desktop.el.querySelector('.xp-start').click();
    expect(desktop.el.querySelector('.xp-startmenu').hidden).toBe(false);

    // Open a window's menubar menu too: Menu.js's place() arms its own document
    // pointerdown(capture) listener, and (pre-fix) attachMenubar started a polling
    // setInterval per click that never cleared unless the menu was closed first.
    desktop.ctx.registry.launch('notepad', { title: 'a.txt', text: 'hi' });
    const fileItem = [...desktop.el.querySelectorAll('.xp-menubar-item')].find((el) => el.textContent === 'File');
    fileItem.click();
    expect(desktop.ctx.menus.isOpen).toBe(true);
    // attachMenubar used to poll menus.isOpen via a 100ms setInterval per click; it should
    // now use menus' onClose callback instead, so opening a menu starts no new interval.
    expect(setIntervalSpy.mock.calls.some(([, delay]) => delay === 100)).toBe(false);

    const netCalls = (type, capture) => {
      const matches = ([callType, , opts]) => callType === type && Boolean(typeof opts === 'boolean' ? opts : opts?.capture) === capture;
      return addSpy.mock.calls.filter(matches).length - removeSpy.mock.calls.filter(matches).length;
    };

    desktop.destroy();

    // Net add/remove across the whole test must settle back to zero for every
    // document-level listener type the desktop's lifetime could have armed.
    expect(netCalls('pointerdown', true)).toBe(0);
    expect(netCalls('keydown', false)).toBe(0);
    // attachMenubar's onClose fires synchronously from menus.close() -- no polling interval involved.
    expect(fileItem.classList.contains('open')).toBe(false);
    expect(desktop.ctx.menus.isOpen).toBe(false);
  });

  it('toggles interactivity and the CRT overlay', () => {
    const desktop = mount();
    expect(desktop.el.classList.contains('xp-interactive')).toBe(false);
    expect(desktop.el.querySelector('.xp-crt').hidden).toBe(false);
    desktop.setInteractive(true);
    expect(desktop.el.classList.contains('xp-interactive')).toBe(true);
    expect(desktop.el.querySelector('.xp-crt').hidden).toBe(true);
  });

  it('emits a power event for every boot state', async () => {
    const desktop = mount();
    const states = [];
    desktop.on('power', (s) => states.push(s));
    const p = desktop.powerOn();
    expect(states).toEqual(['booting']);
    await vi.advanceTimersByTimeAsync(3000);
    await p;
    expect(states).toEqual(['booting', 'on']);
    expect(desktop.el.dataset.power).toBe('on');
    expect(desktop.powerState).toBe('on');
  });
});
