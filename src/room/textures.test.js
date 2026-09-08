import { describe, it, expect, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { canvasTexture, makeRoomTextures } from './textures.js';

const fakeContext = () => new Proxy({}, {
  get: (_, key) => (key === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => {}),
  set: () => true,
});

describe('textures', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns null instead of throwing when canvas 2D is unavailable', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    expect(canvasTexture(8, 8, () => {})).toBeNull();
    expect(makeRoomTextures()).toEqual({ city: null, grid: null, posterA: null, posterB: null });
  });

  it('draws into a CanvasTexture in sRGB when a context exists', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(fakeContext);
    let drawn = null;
    const tex = canvasTexture(64, 32, (ctx, w, h) => { drawn = [w, h]; ctx.fillRect(0, 0, w, h); });
    expect(tex).toBeInstanceOf(THREE.CanvasTexture);
    expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(drawn).toEqual([64, 32]);
    const set = makeRoomTextures();
    for (const key of ['city', 'grid', 'posterA', 'posterB']) expect(set[key], key).toBeInstanceOf(THREE.CanvasTexture);
  });
});
