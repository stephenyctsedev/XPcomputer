import { describe, it, expect, beforeEach } from 'vitest';
import resume from '../../data/resume.json';
import { buildFileSystem, PATHS } from '../../data/filesystem.js';
import { createWindowManager } from '../WindowManager.js';
import { createMenus } from '../Menu.js';
import { openExplorer } from './Explorer.js';

const portfolio = {
  projects: [{
    slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
    category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
    tech: ['Unity', 'C#'],
    media: [
      { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
      { file: 'img2.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img2.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img2.jpg', width: 1600, height: 900 },
    ],
  }],
};
const PICTURES = `${PATHS.myDocuments}\\My Pictures`;
const PROJECT = `${PICTURES}\\Dior Lip Glow`;

describe('explorer', () => {
  let ctx, launched;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    launched = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume, portfolio),
      mediaBase: '/XPcomputer/',
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
    document.querySelector('.xp-menu .xp-menu-item:nth-child(3)').click();
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
    expect(win.el.querySelector('[data-name="sol.exe"] .xp-item-type').textContent).toBe('Application');
  });
});

describe('explorer thumbnails', () => {
  let ctx, launched;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    launched = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      fs: buildFileSystem(resume, portfolio),
      mediaBase: '/XPcomputer/',
      registry: { launch: (id, p) => launched.push([id, p]) },
      dialogs: { message: () => Promise.resolve('OK') },
      menus: createMenus(document.querySelector('#screen')),
      toDesktopPoint: (x, y) => ({ x, y }),
    };
  });

  it('auto-picks thumbnails inside a folder of media and paints the images', () => {
    const win = openExplorer(ctx, PROJECT);
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-thumbnails')).toBe(true);
    const img = win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb');
    expect(img.getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/thumbs/img1.jpg');
  });

  it('auto-picks icons for a folder of folders', () => {
    const win = openExplorer(ctx, PICTURES);
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-icons')).toBe(true);
  });

  it('an explicit view choice sticks across navigation', () => {
    const win = openExplorer(ctx, PICTURES);
    win.el.querySelector('[data-cmd="views"]').click();
    document.querySelector('.xp-menu .xp-menu-item:nth-child(3)').click();
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
    win.el.querySelector('[data-name="Dior Lip Glow"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(win.el.querySelector('.xp-explorer-items').classList.contains('xp-view-details')).toBe(true);
  });

  it('falls back to the file icon when a thumbnail fails to load', () => {
    const win = openExplorer(ctx, PROJECT);
    const img = win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb');
    img.dispatchEvent(new Event('error'));
    expect(win.el.querySelector('[data-name="img1.jpg"] img.xp-item-thumb')).toBeNull();
    expect(win.el.querySelector('[data-name="img1.jpg"] .xp-ico')).not.toBeNull();
  });

  it('shows the project prose in the task pane details group', () => {
    const win = openExplorer(ctx, PROJECT);
    const details = win.el.querySelector('.xp-taskpane').textContent;
    expect(details).toContain('Dior Lip Glow Face Detection');
    expect(details).toContain('Gesture-controlled mini-game.');
    expect(details).toContain('A Dior-branded mini-game.');
    expect(details).toContain('Unity, C#');
  });

  it('replaces the details group with the file when one is selected', () => {
    const win = openExplorer(ctx, PROJECT);
    win.el.querySelector('[data-name="img2.jpg"]').click();
    const details = win.el.querySelector('.xp-taskpane').textContent;
    expect(details).toContain('img2.jpg');
    expect(details).toContain('1600 x 900');
  });

  it('offers a slide show link that launches the viewer at the first item', () => {
    const win = openExplorer(ctx, PROJECT);
    const link = [...win.el.querySelectorAll('.xp-taskpane a')].find((a) => a.textContent === 'View as a slide show');
    link.click();
    expect(launched.at(-1)).toEqual(['viewer', { slug: 'dior-lip-glow', index: 0, slideshow: true }]);
  });

  it('offers no slide show link outside a project folder', () => {
    const win = openExplorer(ctx, PICTURES);
    const link = [...win.el.querySelectorAll('.xp-taskpane a')].find((a) => a.textContent === 'View as a slide show');
    expect(link).toBeUndefined();
  });
});
