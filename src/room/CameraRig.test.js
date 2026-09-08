import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createCameraRig, OVERVIEW } from './CameraRig.js';

const stubControls = () => ({ enabled: true, target: new THREE.Vector3(), updates: 0, update() { this.updates++; } });
const setup = (opts = {}) => {
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 40);
  const controls = stubControls();
  const states = [];
  const rig = createCameraRig(camera, controls, {
    screenCenter: new THREE.Vector3(-0.8, 0.97, -1.369), screenNormal: new THREE.Vector3(0, 0, 1),
    screenSize: { width: 0.32, height: 0.24 }, onState: (s) => states.push(s), ...opts,
  });
  return { camera, controls, rig, states };
};

describe('createCameraRig', () => {
  it('starts at the overview pose', () => {
    const { camera, controls, rig } = setup();
    expect(rig.state).toBe('overview');
    expect(camera.position.toArray()).toEqual(OVERVIEW.position);
    expect(controls.target.toArray()).toEqual(OVERVIEW.target);
  });
  it('flies to the fitted screen pose and disables controls', () => {
    const { camera, controls, rig, states } = setup();
    rig.toScreen();
    expect(rig.state).toBe('toScreen');
    expect(controls.enabled).toBe(false);
    rig.update(0.45);
    expect(rig.state).toBe('toScreen');
    rig.update(0.5);
    expect(rig.state).toBe('screen');
    expect(camera.position.x).toBeCloseTo(-0.8, 5);
    expect(camera.position.y).toBeCloseTo(0.97, 5);
    expect(camera.position.z).toBeCloseTo(-1.369 + 0.2676, 3);
    expect(controls.enabled).toBe(false);
    expect(states).toEqual(['toScreen', 'screen']);
  });
  it('returns to where the orbit was and re-enables controls', () => {
    const { camera, controls, rig, states } = setup();
    camera.position.set(1, 1.2, 1.5);
    controls.target.set(0, 0.8, -1);
    rig.toScreen();
    rig.update(1);
    rig.toOverview();
    expect(rig.state).toBe('toOverview');
    rig.update(1);
    expect(rig.state).toBe('overview');
    expect(controls.enabled).toBe(true);
    expect(camera.position.toArray().map((v) => +v.toFixed(6))).toEqual([1, 1.2, 1.5]);
    expect(controls.target.toArray().map((v) => +v.toFixed(6))).toEqual([0, 0.8, -1]);
    expect(states).toEqual(['toScreen', 'screen', 'toOverview', 'overview']);
  });
  it('is instant with reduced motion and re-fits on resize', () => {
    const { camera, rig } = setup({ reducedMotion: true });
    rig.toScreen();
    expect(rig.state).toBe('screen');
    const before = camera.position.z;
    camera.aspect = 1;
    rig.onResize();
    expect(camera.position.z).toBeGreaterThan(before);
  });
  it('keeps driving OrbitControls after a reduced-motion round trip', () => {
    const { controls, rig } = setup({ reducedMotion: true });
    rig.toScreen();
    expect(rig.state).toBe('screen');
    rig.toOverview();
    expect(rig.state).toBe('overview');
    const before = controls.updates;
    rig.update(0.1);
    expect(controls.updates).toBe(before + 1);
  });
  it('ignores redundant requests and only drives controls in overview', () => {
    const { controls, rig } = setup();
    rig.update(0.1);
    expect(controls.updates).toBe(1);
    rig.toScreen();
    rig.update(0.1);
    expect(controls.updates).toBe(1);
    rig.toScreen();
    rig.update(1);
    rig.toOverview();
    rig.toOverview();
    rig.update(1);
    expect(rig.state).toBe('overview');
  });
});
