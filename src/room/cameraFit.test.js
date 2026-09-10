import { describe, it, expect } from 'vitest';
import { fitDistance, containScale, resolveRoomSize } from './cameraFit.js';

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

describe('resolveRoomSize', () => {
  it('prefers the container size when it has been laid out', () => {
    expect(resolveRoomSize({ clientWidth: 800, clientHeight: 600, innerWidth: 1280, innerHeight: 720 })).toEqual({ w: 800, h: 600 });
  });
  it('falls back to the window when the container has no size yet', () => {
    expect(resolveRoomSize({ clientWidth: 0, clientHeight: 0, innerWidth: 1280, innerHeight: 720 })).toEqual({ w: 1280, h: 720 });
  });
  // Regression: some embedding contexts report window.innerWidth/innerHeight as 0 too for one
  // synchronous tick right at mount (seen live via a preview surface still negotiating its own
  // viewport). Feeding that straight into camera.aspect (NaN) and the renderer/composer
  // (zero-sized WebGL render targets -> GL_INVALID_FRAMEBUFFER_OPERATION every frame) was the bug;
  // resolveRoomSize must report "not ready" instead of 0 so callers skip sizing until a real resize.
  it('reports not ready when both the container and the window are still 0x0', () => {
    expect(resolveRoomSize({ clientWidth: 0, clientHeight: 0, innerWidth: 0, innerHeight: 0 })).toBeNull();
  });
  it('reports not ready when only the height side is still 0', () => {
    expect(resolveRoomSize({ clientWidth: 800, clientHeight: 0, innerWidth: 0, innerHeight: 0 })).toBeNull();
  });
});
