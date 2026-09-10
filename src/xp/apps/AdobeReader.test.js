import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { openAdobeReader } from './AdobeReader.js';

describe('Adobe Reader', () => {
  let ctx, opened;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="layer"></div>';
    opened = [];
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      pdfHref: '/resume/resume-main.pdf',
      openExternal: (href) => opened.push(href),
    };
  });
  afterEach(() => {
    vi.useRealTimers();
    delete navigator.pdfViewerEnabled;
  });

  const iframe = (win) => win.el.querySelector('.xp-reader-page iframe');
  const fallback = (win) => win.el.querySelector('.xp-reader-fallback');

  it('points the iframe at the PDF and keeps the fallback hidden while it loads', () => {
    const win = openAdobeReader(ctx);
    expect(iframe(win).src).toContain('/resume/resume-main.pdf');
    expect(iframe(win).hidden).toBe(false);
    expect(fallback(win).hidden).toBe(true);
  });

  it('keeps the fallback hidden once the PDF actually loads', () => {
    const win = openAdobeReader(ctx);
    iframe(win).dispatchEvent(new Event('load'));
    expect(iframe(win).hidden).toBe(false);
    expect(fallback(win).hidden).toBe(true);
    vi.advanceTimersByTime(4001);
    // The load already resolved; the timeout guard must not flip it back.
    expect(iframe(win).hidden).toBe(false);
    expect(fallback(win).hidden).toBe(true);
  });

  it('swaps to the fallback if the iframe never fires load within the timeout', () => {
    const win = openAdobeReader(ctx);
    vi.advanceTimersByTime(4001);
    expect(iframe(win).hidden).toBe(true);
    expect(fallback(win).hidden).toBe(false);
  });

  it('shows the fallback immediately when the browser cannot embed PDFs', () => {
    Object.defineProperty(navigator, 'pdfViewerEnabled', { value: false, configurable: true });
    const win = openAdobeReader(ctx);
    expect(iframe(win).hidden).toBe(true);
    expect(fallback(win).hidden).toBe(false);
  });

  it('Save a Copy downloads the PDF and Open in new tab opens it externally', () => {
    const win = openAdobeReader(ctx);
    const save = win.el.querySelector('.xp-reader-toolbar a.xp-tb');
    expect(save.getAttribute('href')).toBe('/resume/resume-main.pdf');
    expect(save.hasAttribute('download')).toBe(true);
    win.el.querySelector('[data-cmd="newtab"]').click();
    expect(opened).toEqual(['/resume/resume-main.pdf']);
  });
});
