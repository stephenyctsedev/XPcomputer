import { describe, it, expect } from 'vitest';
import { windowsFlagSvg, flagEl, flagPoint, FLAG_COLORS } from './windowsFlag.js';

describe('windows flag', () => {
  it('draws four panes in the classic colours at the requested size', () => {
    document.body.innerHTML = windowsFlagSvg(110, { glow: true });
    const svg = document.querySelector('svg.xp-winflag');
    expect(svg.getAttribute('width')).toBe('110');
    expect(svg.getAttribute('height')).toBe('99');
    expect(svg.classList.contains('xp-winflag-glow')).toBe(true);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    const panes = [...svg.querySelectorAll('.xp-winflag-pane')];
    expect(panes.map((p) => p.dataset.pane)).toEqual(['red', 'green', 'blue', 'yellow']);
    expect(panes.map((p) => p.getAttribute('fill'))).toEqual([FLAG_COLORS.red, FLAG_COLORS.green, FLAG_COLORS.blue, FLAG_COLORS.yellow]);
    for (const pane of panes) expect(pane.getAttribute('d')).toMatch(/^M[\d. ]+(L[\d. ]+)+Z$/);
    expect(svg.querySelectorAll('.xp-winflag-sheen')).toHaveLength(4);
  });

  it('lifts the right side and bows the middle so the flag ripples, staying inside the box', () => {
    const [, leftTop] = flagPoint(0, 0);
    const [, rightTop] = flagPoint(1, 0);
    const [, midTop] = flagPoint(0.5, 0);
    const [, leftBottom] = flagPoint(0, 1);
    expect(rightTop).toBeLessThan(leftTop);
    expect(midTop).toBeLessThan(leftTop);
    expect(leftBottom).toBeGreaterThan(leftTop);
    for (const u of [0, 0.25, 0.5, 0.75, 1]) {
      for (const v of [0, 0.5, 1]) {
        const [x, y] = flagPoint(u, v);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(90);
      }
    }
  });

  it('flagEl wraps the svg in a host span without glow by default', () => {
    const el = flagEl(18);
    expect(el.className).toBe('xp-winflag-host');
    expect(el.querySelector('svg.xp-winflag').getAttribute('width')).toBe('18');
    expect(el.querySelector('svg').classList.contains('xp-winflag-glow')).toBe(false);
  });
});
