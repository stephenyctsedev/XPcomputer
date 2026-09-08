import { describe, it, expect, beforeEach } from 'vitest';
import resume from '../../data/resume.json';
import { buildFileSystem, PATHS } from '../../data/filesystem.js';
import { createWindowManager } from '../WindowManager.js';
import { createMenus } from '../Menu.js';
import { openExplorer } from './Explorer.js';

describe('explorer', () => {
  let ctx, launched;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    launched = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume),
      registry: { launch: (id, payload) => launched.push([id, payload]) },
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
      toDesktopPoint: (x, y) => ({ x, y }),
    };
  });
  const labels = (win) => [...win.el.querySelectorAll('.xp-item:not(.xp-item-header) .xp-item-label')].map((l) => l.textContent);
  const address = (win) => win.el.querySelector('.xp-ie-url input').value;

  it('lists My Computer, navigates into C:, and goes back up', () => {
    const win = openExplorer(ctx, PATHS.myComputer);
    expect(labels(win)).toEqual(['3½ Floppy (A:)', 'Local Disk (C:)', 'CD Drive (D:)', 'Shared Documents']);
    expect(win.el.querySelector('.xp-explorer-status').textContent).toBe('4 object(s)');
    win.el.querySelector('[data-name="Local Disk (C:)"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(address(win)).toBe('C:');
    expect(win.title).toBe('Local Disk (C:)');
    expect(labels(win)).toEqual(['Documents and Settings', 'Program Files', 'WINDOWS']);
    win.el.querySelector('[data-cmd="up"]').click();
    expect(address(win)).toBe('My Computer');
    win.el.querySelector('[data-cmd="back"]').click();
    expect(address(win)).toBe('C:');
    win.el.querySelector('[data-cmd="forward"]').click();
    expect(address(win)).toBe('My Computer');
  });

  it('opens files through the registry and drives through the error app', () => {
    const docs = openExplorer(ctx, PATHS.myDocuments);
    docs.el.querySelector('[data-name="resume.pdf"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(launched[0][0]).toBe('reader');
    const pc = openExplorer(ctx, PATHS.myComputer);
    pc.el.querySelector('[data-name="3½ Floppy (A:)"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(launched[1][0]).toBe('error');
    expect(launched[1][1]).toMatchObject({ title: '3½ Floppy (A:)', buttons: ['Retry', 'Cancel'] });
    pc.el.querySelector('[data-name="Shared Documents"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(address(pc)).toBe(PATHS.myDocuments);
  });

  it('switches to details view with a type column', () => {
    const win = openExplorer(ctx, 'C:\\WINDOWS\\system32');
    win.el.querySelector('[data-cmd="views"]').click();
    document.querySelector('.xp-menu .xp-menu-item:nth-child(2)').click();
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
    expect(win.el.querySelector('[data-name="sol.exe"] .xp-item-type').textContent).toBe('Application');
  });
});
