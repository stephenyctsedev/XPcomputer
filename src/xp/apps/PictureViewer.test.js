import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { openPictureViewer, SLIDE_MS } from './PictureViewer.js';

const portfolio = {
  projects: [{
    slug: 'dior-lip-glow', folder: 'Dior Lip Glow', name: 'Dior Lip Glow Face Detection',
    category: 'company', tagline: 'Gesture-controlled mini-game.', description: 'A Dior-branded mini-game.',
    tech: ['Unity', 'C#'],
    media: [
      { file: 'img1.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img1.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img1.jpg', width: 1600, height: 1067 },
      { file: 'img2.jpg', kind: 'image', src: 'portfolio/dior-lip-glow/img2.jpg', thumb: 'portfolio/dior-lip-glow/thumbs/img2.jpg', width: 1600, height: 900 },
      { file: 'clip.mp4', kind: 'video', src: 'portfolio/dior-lip-glow/clip.mp4', thumb: null },
    ],
  }],
};

describe('picture viewer', () => {
  let ctx, errors;
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div>';
    errors = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      portfolio,
      mediaBase: '/XPcomputer/',
      sounds: { isMuted: () => true },
      dialogs: { message: (opts) => { errors.push(opts); return Promise.resolve('OK'); } },
    };
  });
  const img = (win) => win.el.querySelector('.xp-viewer-stage img');
  const caption = (win) => win.el.querySelector('.xp-viewer-caption').textContent;
  const click = (win, cmd) => win.el.querySelector(`[data-cmd="${cmd}"]`).click();

  it('opens at the requested index with the project name and position', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 1 });
    expect(img(win).getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/img2.jpg');
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    expect(win.title).toBe('img2.jpg - Windows Picture and Fax Viewer');
  });

  it('navigates and disables the buttons at each end', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    expect(win.el.querySelector('[data-cmd="prev"]').disabled).toBe(true);
    click(win, 'next');
    expect(img(win).getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/img2.jpg');
    expect(win.el.querySelector('[data-cmd="prev"]').disabled).toBe(false);
    click(win, 'next');
    expect(win.el.querySelector('[data-cmd="next"]').disabled).toBe(true);
  });

  it('moves with the arrow keys', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    win.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    win.el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 1 of 3');
  });

  it('toggles between best fit and actual size', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    expect(win.el.querySelector('.xp-viewer-stage').classList.contains('xp-viewer-fit')).toBe(true);
    click(win, 'fit');
    expect(win.el.querySelector('.xp-viewer-stage').classList.contains('xp-viewer-fit')).toBe(false);
  });

  it('renders a muted video element for a video item', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 2 });
    const video = win.el.querySelector('.xp-viewer-stage video');
    expect(video.getAttribute('src')).toBe('/XPcomputer/portfolio/dior-lip-glow/clip.mp4');
    expect(video.controls).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('auto-advances in slide show mode and stops at the end', () => {
    vi.useFakeTimers();
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0, slideshow: true });
    vi.advanceTimersByTime(SLIDE_MS);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    vi.advanceTimersByTime(SLIDE_MS);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 3 of 3');
    vi.advanceTimersByTime(SLIDE_MS * 3);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 3 of 3');
    vi.useRealTimers();
  });

  it('manual navigation cancels the slide show', () => {
    vi.useFakeTimers();
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0, slideshow: true });
    click(win, 'next');
    vi.advanceTimersByTime(SLIDE_MS * 3);
    expect(caption(win)).toBe('Dior Lip Glow Face Detection — 2 of 3');
    vi.useRealTimers();
  });

  it('shows a placeholder when the image fails to load', () => {
    const win = openPictureViewer(ctx, { slug: 'dior-lip-glow', index: 0 });
    img(win).dispatchEvent(new Event('error'));
    expect(win.el.querySelector('.xp-viewer-broken')).not.toBeNull();
  });

  it('reports an error dialog for an unknown slug', () => {
    openPictureViewer(ctx, { slug: 'nope', index: 0 });
    expect(errors[0]).toMatchObject({ kind: 'error' });
  });
});
