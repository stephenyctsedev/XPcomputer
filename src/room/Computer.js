import * as THREE from 'three';
import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export const SCREEN = { width: 0.32, height: 0.24, pixelsWide: 1024 };

/** Beige PC on the desk. `position` is the desk surface point under the monitor stand. */
export function buildComputer(parent, { screenElement, position = new THREE.Vector3(-0.8, 0.76, -1.55) } = {}) {
  const group = new THREE.Group();
  group.name = 'computer';
  group.position.copy(position);
  const beige = new THREE.MeshStandardMaterial({ color: 0xd7d3c8, roughness: 0.7 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.5 });
  const add = (geometry, material, x, y, z, name) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.name = name;
    group.add(mesh);
    return mesh;
  };

  add(new THREE.BoxGeometry(0.3, 0.03, 0.26), beige, 0, 0.015, 0.05, 'monitorStand');
  add(new THREE.BoxGeometry(0.42, 0.36, 0.34), beige, 0, 0.21, -0.03, 'monitorBody');
  const bezel = add(new THREE.BoxGeometry(0.42, 0.36, 0.04), beige.clone(), 0, 0.21, 0.16, 'monitorBezel');
  const glow = add(new THREE.PlaneGeometry(SCREEN.width + 0.02, SCREEN.height + 0.02),
    new THREE.MeshBasicMaterial({ color: 0x9cc8ff, transparent: true, opacity: 0, toneMapped: false }), 0, 0.21, 0.1805, 'screenGlow');
  const face = add(new THREE.PlaneGeometry(SCREEN.width, SCREEN.height), new THREE.MeshBasicMaterial({ color: 0x000000 }), 0, 0.21, 0.181, 'screenFace');

  add(new THREE.BoxGeometry(0.18, 0.4, 0.42), beige, 0.55, 0.2, -0.05, 'tower');
  add(new THREE.BoxGeometry(0.12, 0.02, 0.005), dark, 0.55, 0.3, 0.161, 'towerDriveBay');
  const led = add(new THREE.BoxGeometry(0.012, 0.012, 0.005),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: new THREE.Color(0x3fbf3f), emissiveIntensity: 0 }), 0.5, 0.1, 0.161, 'powerLed');
  add(new THREE.BoxGeometry(0.42, 0.02, 0.14), dark, 0, 0.01, 0.3, 'keyboard');
  add(new THREE.BoxGeometry(0.06, 0.03, 0.1), dark, 0.32, 0.015, 0.3, 'mouse');

  // Cosmetic cables — thin dark meshes only, no effect on hitbox/placement math.
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8), dark, 0.48, -0.14, 0.12, 'cableA'); // power cable: tower front-left down toward the floor
  add(new THREE.BoxGeometry(0.24, 0.008, 0.02), dark, 0.34, 0.012, 0.24, 'cableB'); // keyboard toward tower
  add(new THREE.BoxGeometry(0.16, 0.006, 0.02), dark, 0.42, 0.01, 0.29, 'cableC'); // mouse toward tower

  const hitbox = add(new THREE.BoxGeometry(0.9, 0.5, 0.64), new THREE.MeshBasicMaterial({ visible: false }), 0.2, 0.25, 0.05, 'pcHitbox');

  const cssObject = new CSS3DObject(screenElement);
  cssObject.position.set(0, 0.21, 0.1815);
  cssObject.scale.setScalar(SCREEN.width / SCREEN.pixelsWide);
  cssObject.name = 'screenDom';
  group.add(cssObject);

  const screenLight = new THREE.PointLight(0x8fb8ff, 0, 2.2, 2);
  screenLight.position.set(0, 0.3, 0.6);
  screenLight.name = 'screenLight';
  group.add(screenLight);

  parent.add(group);
  group.updateMatrixWorld(true);
  const screenCenter = face.getWorldPosition(new THREE.Vector3());
  const screenNormal = new THREE.Vector3(0, 0, 1).transformDirection(group.matrixWorld).normalize();

  let powered = false;
  return {
    group, hitbox, cssObject, screenCenter, screenNormal,
    size: { width: SCREEN.width, height: SCREEN.height },
    get powered() { return powered; },
    setPower(on) {
      powered = Boolean(on);
      glow.material.opacity = powered ? 0.85 : 0;
      screenLight.intensity = powered ? 2.4 : 0;
      led.material.emissiveIntensity = powered ? 2 : 0;
    },
    setHover(on) {
      bezel.material.emissive.set(on ? 0x3355aa : 0x000000);
      bezel.material.emissiveIntensity = on ? 0.6 : 0;
    },
    animate(time) {
      if (!powered) return;
      screenLight.color.setHSL(0.58 + Math.sin(time * 0.4) * 0.04, 0.7, 0.7);
      screenLight.intensity = 2.2 + Math.sin(time * 7) * 0.15;
      led.material.emissiveIntensity = Math.sin(time * 3) > 0.9 ? 0.5 : 2;
    },
  };
}
