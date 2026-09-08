import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildRoom } from './Room.js';

const NAMES = ['floor', 'ceiling', 'backWall', 'leftWall', 'rightWall', 'baseboardNeon', 'bed', 'bedUnderglow', 'rug', 'desk', 'chair', 'shelf', 'lavaLamp', 'window', 'city', 'neonBolt', 'neonRing', 'posterA', 'posterB'];

describe('buildRoom', () => {
  it('builds every named piece with color fallbacks when textures are missing', () => {
    const scene = new THREE.Scene();
    const room = buildRoom(scene, {});
    for (const name of NAMES) expect(scene.getObjectByName(name), name).toBeTruthy();
    expect(scene.fog).toBeInstanceOf(THREE.FogExp2);
    const lights = [];
    scene.traverse((o) => { if (o.isLight) lights.push(o); });
    expect(lights.length).toBeGreaterThanOrEqual(4);
    expect(room.lights.deskLamp.isSpotLight).toBe(true);
    expect(() => { for (let i = 0; i < 50; i++) room.animate(i * 0.1, 0.1); }).not.toThrow();
  });
  it('puts the desk top surface at y = 0.76 for the computer to sit on', () => {
    const scene = new THREE.Scene();
    buildRoom(scene, {});
    scene.updateMatrixWorld(true);
    const top = scene.getObjectByName('deskTop');
    const box = new THREE.Box3().setFromObject(top);
    expect(box.max.y).toBeCloseTo(0.76, 5);
    expect(box.getCenter(new THREE.Vector3()).x).toBeCloseTo(-0.8, 5);
  });
  it('maps provided textures onto the window and posters', () => {
    const tex = new THREE.Texture();
    const scene = new THREE.Scene();
    buildRoom(scene, { city: tex, posterA: tex, grid: tex });
    expect(scene.getObjectByName('city').material.map).toBe(tex);
    expect(scene.getObjectByName('posterA').material.map).toBe(tex);
    expect(scene.getObjectByName('floor').material.emissiveMap).toBe(tex);
  });
});
