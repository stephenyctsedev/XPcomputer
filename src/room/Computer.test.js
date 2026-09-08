import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildComputer, SCREEN } from './Computer.js';

const make = () => {
  const scene = new THREE.Scene();
  const el = document.createElement('div');
  const pc = buildComputer(scene, { screenElement: el });
  return { scene, el, pc };
};

describe('buildComputer', () => {
  it('places the screen face on the desk facing +Z with the CSS3D object glued to it', () => {
    const { pc, el } = make();
    expect(pc.screenCenter.x).toBeCloseTo(-0.8, 5);
    expect(pc.screenCenter.y).toBeCloseTo(0.97, 5);
    expect(pc.screenCenter.z).toBeCloseTo(-1.369, 3);
    expect(pc.screenNormal.toArray().map((v) => Math.round(v * 1000) / 1000)).toEqual([0, 0, 1]);
    expect(pc.cssObject.element).toBe(el);
    expect(pc.cssObject.scale.x).toBeCloseTo(SCREEN.width / 1024, 9);
    expect(pc.cssObject.getWorldPosition(new THREE.Vector3()).distanceTo(pc.screenCenter)).toBeLessThan(0.002);
    expect(pc.size).toEqual({ width: 0.32, height: 0.24 });
  });
  it('exposes a hitbox that contains the monitor and the tower', () => {
    const { pc, scene } = make();
    const box = new THREE.Box3().setFromObject(pc.hitbox);
    expect(box.containsPoint(pc.screenCenter)).toBe(true);
    expect(box.containsPoint(new THREE.Vector3(-0.25, 0.96, -1.6))).toBe(true);

    // Probe an actual extent of the tower (its back-bottom-left corner), not just its
    // center, so a hitbox that clips the tower's depth (as previously happened) fails here.
    // Tower is BoxGeometry(0.18, 0.4, 0.42) at local (0.55, 0.2, -0.05):
    // half-extents (0.09, 0.2, 0.21) -> back corner at local (0.46, 0.0, -0.26).
    const towerBackCorner = pc.group.localToWorld(new THREE.Vector3(0.46, 0.0, -0.26));
    expect(box.containsPoint(towerBackCorner)).toBe(true);

    // Also verify full containment of the tower mesh's own world-space bounding box.
    // The tower's y-extent is intentionally flush against the hitbox's (both reach the
    // same boundary by design), so pad by a tiny epsilon to absorb matrix-transform
    // floating-point noise without weakening the actual containment check.
    const tower = scene.getObjectByName('tower');
    const towerBox = new THREE.Box3().setFromObject(tower);
    const paddedBox = box.clone().expandByScalar(1e-6);
    expect(paddedBox.containsBox(towerBox)).toBe(true);
  });
  it('lights the glow rim, LED and screen light only while powered', () => {
    const { pc, scene } = make();
    const glow = scene.getObjectByName('screenGlow');
    const light = scene.getObjectByName('screenLight');
    expect(glow.material.opacity).toBe(0);
    expect(light.intensity).toBe(0);
    pc.setPower(true);
    expect(pc.powered).toBe(true);
    expect(glow.material.opacity).toBeGreaterThan(0);
    expect(light.intensity).toBeGreaterThan(0);
    expect(() => pc.animate(1.0)).not.toThrow();
    pc.setPower(false);
    expect(light.intensity).toBe(0);
    pc.setHover(true);
    expect(scene.getObjectByName('monitorBezel').material.emissiveIntensity).toBeGreaterThan(0);
  });
});
