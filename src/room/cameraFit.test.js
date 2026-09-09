import { describe, it, expect } from 'vitest';
import { fitDistance, containScale } from './cameraFit.js';

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

describe('containScale', () => {
  it('scales down to fit a box narrower than the content', () => {
    expect(containScale({ boxWidth: 512, boxHeight: 768, contentWidth: 1024, contentHeight: 768 })).toBeCloseTo(0.5, 5);
  });
  it('scales down to fit a box shorter than the content', () => {
    expect(containScale({ boxWidth: 1024, boxHeight: 384, contentWidth: 1024, contentHeight: 768 })).toBeCloseTo(0.5, 5);
  });
  it('scales up to fill a box larger than the content', () => {
    expect(containScale({ boxWidth: 2048, boxHeight: 1536, contentWidth: 1024, contentHeight: 768 })).toBeCloseTo(2, 5);
  });
});
