import { describe, it, expect } from 'vitest';
import { fitDistance } from './cameraFit.js';

describe('fitDistance', () => {
  const screen = { width: 0.32, height: 0.24, fovDeg: 50 };
  it('fits by height on wide viewports', () => {
    expect(fitDistance({ ...screen, aspect: 16 / 9 })).toBeCloseTo(0.2676, 3);
  });
  it('fits by width on narrow viewports', () => {
    expect(fitDistance({ ...screen, aspect: 1 })).toBeCloseTo(0.3568, 3);
  });
  it('is continuous at the 4:3 boundary and honours margin', () => {
    expect(fitDistance({ ...screen, aspect: 4 / 3, margin: 1 })).toBeCloseTo(0.2573, 3);
  });
  it('moves closer for wider fields of view', () => {
    expect(fitDistance({ ...screen, fovDeg: 70, aspect: 16 / 9 })).toBeLessThan(0.2676);
  });
});
