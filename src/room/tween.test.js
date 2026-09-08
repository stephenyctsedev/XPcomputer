import { describe, it, expect } from 'vitest';
import { easeInOutCubic, lerp, createTween } from './tween.js';

describe('easing', () => {
  it('easeInOutCubic hits the anchors', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5);
    expect(easeInOutCubic(0.25)).toBeCloseTo(0.0625);
  });
  it('lerp interpolates', () => { expect(lerp(2, 4, 0.25)).toBe(2.5); });
});

describe('createTween', () => {
  it('advances with dt, clamps at the end and completes once', () => {
    const ks = []; let completed = 0;
    const t = createTween({ duration: 1, ease: (x) => x, onUpdate: (k) => ks.push(k), onComplete: () => completed++ });
    expect(t.update(0.25)).toBe(false);
    expect(t.update(0.5)).toBe(false);
    expect(t.update(0.5)).toBe(true);
    expect(t.update(0.5)).toBe(true);
    expect(ks).toEqual([0.25, 0.75, 1]);
    expect(completed).toBe(1);
    expect(t.done).toBe(true);
  });
  it('completes synchronously when duration is 0', () => {
    const ks = []; let completed = 0;
    const t = createTween({ duration: 0, onUpdate: (k) => ks.push(k), onComplete: () => completed++ });
    expect(ks).toEqual([1]);
    expect(completed).toBe(1);
    expect(t.done).toBe(true);
  });
  it('can be cancelled', () => {
    let completed = 0;
    const t = createTween({ duration: 1, onUpdate: () => {}, onComplete: () => completed++ });
    t.cancel();
    expect(t.update(2)).toBe(true);
    expect(completed).toBe(0);
  });
});
