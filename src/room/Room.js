import * as THREE from 'three';

export const ROOM = { width: 4, depth: 4, height: 2.7 };
const MAGENTA = 0xff2bd6;
const CYAN = 0x3ee9ff;

const std = (opts) => new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0.05, ...opts });
const neonMat = (hex, intensity = 3.5) => std({ color: 0x000000, emissive: new THREE.Color(hex), emissiveIntensity: intensity });
function box(w, h, d, material, x, y, z, name) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  if (name) mesh.name = name;
  return mesh;
}
function plane(w, h, material, name) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  mesh.name = name;
  return mesh;
}

export function buildRoom(scene, textures = {}) {
  const group = new THREE.Group();
  group.name = 'room';

  // ---- shell ----
  const wallMat = std({ color: 0x1b1e2e });
  if (textures.grid) { textures.grid.wrapS = textures.grid.wrapT = THREE.RepeatWrapping; textures.grid.repeat.set(4, 4); }
  const floor = plane(4, 4, std({ color: 0x14121c, roughness: 0.6, emissive: new THREE.Color(0x3a1e6e), emissiveIntensity: textures.grid ? 0.7 : 0.12, emissiveMap: textures.grid ?? null }), 'floor');
  floor.rotation.x = -Math.PI / 2;
  const ceiling = plane(4, 4, std({ color: 0x0e1018 }), 'ceiling');
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  const backWall = plane(4, ROOM.height, wallMat, 'backWall');
  backWall.position.set(0, ROOM.height / 2, -2);
  const leftWall = plane(4, ROOM.height, wallMat, 'leftWall');
  leftWall.rotation.y = Math.PI / 2;
  leftWall.position.set(-2, ROOM.height / 2, 0);
  const rightWall = plane(4, ROOM.height, wallMat, 'rightWall');
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.position.set(2, ROOM.height / 2, 0);
  group.add(floor, ceiling, backWall, leftWall, rightWall);
  group.add(box(3.9, 0.02, 0.02, neonMat(CYAN, 2.5), 0, 0.03, -1.98, 'baseboardNeon'));

  // ---- bed (right side) ----
  const bed = new THREE.Group();
  bed.name = 'bed';
  bed.position.set(1.3, 0, -0.8);
  const frameMat = std({ color: 0x2a2233 });
  bed.add(box(1.1, 0.22, 2.1, frameMat, 0, 0.2, 0));
  bed.add(box(1.0, 0.24, 2.0, std({ color: 0x3b3552 }), 0, 0.43, 0));
  bed.add(box(0.9, 0.06, 1.3, std({ color: 0x5a2d82, roughness: 1 }), 0, 0.58, 0.25));
  bed.add(box(0.5, 0.1, 0.32, std({ color: 0xd9d4e8 }), 0, 0.6, -0.8));
  bed.add(box(1.1, 0.5, 0.06, frameMat, 0, 0.5, -1.05));
  bed.add(box(1.06, 0.015, 2.06, neonMat(MAGENTA, 3), 0, 0.085, 0, 'bedUnderglow'));
  group.add(bed);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(0.7, 32), std({ color: 0x25203a, roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.1, 0.005, 0.3);
  rug.name = 'rug';
  group.add(rug);

  // ---- desk + chair (back left) ----
  const desk = new THREE.Group();
  desk.name = 'desk';
  desk.position.set(-0.8, 0, -1.55);
  const woodMat = std({ color: 0x3a2f2a, roughness: 0.7 });
  desk.add(box(1.5, 0.04, 0.7, woodMat, 0, 0.74, 0, 'deskTop'));
  for (const [x, z] of [[-0.7, -0.3], [0.7, -0.3], [-0.7, 0.3], [0.7, 0.3]]) desk.add(box(0.05, 0.72, 0.05, woodMat, x, 0.36, z));
  group.add(desk);

  const chair = new THREE.Group();
  chair.name = 'chair';
  chair.position.set(-0.8, 0, -0.85);
  const chairMat = std({ color: 0x151520, roughness: 0.6 });
  chair.add(box(0.46, 0.07, 0.46, chairMat, 0, 0.48, 0));
  chair.add(box(0.46, 0.55, 0.06, chairMat, 0, 0.8, 0.22));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 12), std({ color: 0x777777, metalness: 0.6, roughness: 0.3 }));
  pole.position.y = 0.24;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.04, 16), chairMat);
  base.position.y = 0.03;
  chair.add(pole, base);
  group.add(chair);

  // ---- shelf on the left wall ----
  const shelf = new THREE.Group();
  shelf.name = 'shelf';
  shelf.position.set(-1.84, 0, -0.4);
  shelf.add(box(0.3, 0.03, 1.2, woodMat, 0, 1.5, 0));
  shelf.add(box(0.3, 0.03, 1.2, woodMat, 0, 1.95, 0));
  [0x8a2be2, 0x20b2aa, 0xff6f61, 0x4682b4, 0xffd166].forEach((c, i) => shelf.add(box(0.2, 0.22, 0.05, std({ color: c }), 0, 1.63, -0.45 + i * 0.07)));
  const lavaLamp = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.14, 4, 12), neonMat(0xff7a18, 2));
  lavaLamp.position.set(0, 2.1, 0.35);
  lavaLamp.name = 'lavaLamp';
  shelf.add(lavaLamp);
  group.add(shelf);

  // ---- window with the city backdrop ----
  const win = new THREE.Group();
  win.name = 'window';
  win.position.set(1.4, 1.7, -1.985);
  const city = plane(1.0, 1.0, textures.city ? new THREE.MeshBasicMaterial({ map: textures.city }) : new THREE.MeshBasicMaterial({ color: 0x1a0f33 }), 'city');
  const frame = std({ color: 0x0c0c12 });
  win.add(city,
    box(1.08, 0.05, 0.06, frame, 0, 0.52, 0.02), box(1.08, 0.05, 0.06, frame, 0, -0.52, 0.02),
    box(0.05, 1.08, 0.06, frame, -0.52, 0, 0.02), box(0.05, 1.08, 0.06, frame, 0.52, 0, 0.02),
    box(0.03, 1.0, 0.04, frame, 0, 0, 0.02), box(1.0, 0.03, 0.04, frame, 0, 0, 0.02));
  group.add(win);

  // ---- neon signs ----
  const boltCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.15, 0.35, 0), new THREE.Vector3(0.05, 0.1, 0), new THREE.Vector3(-0.05, 0.05, 0), new THREE.Vector3(0.15, -0.35, 0),
  ], false, 'catmullrom', 0);
  const neonBolt = new THREE.Mesh(new THREE.TubeGeometry(boltCurve, 24, 0.012, 8, false), neonMat(MAGENTA));
  neonBolt.position.set(-0.2, 2.0, -1.96);
  neonBolt.name = 'neonBolt';
  const ringMat = neonMat(CYAN);
  const neonRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.012, 8, 48), ringMat);
  neonRing.rotation.y = Math.PI / 2;
  neonRing.position.set(-1.96, 1.75, 0.7);
  neonRing.name = 'neonRing';
  group.add(neonBolt, neonRing);

  // ---- posters ----
  const posterA = plane(0.5, 0.7, textures.posterA ? new THREE.MeshBasicMaterial({ map: textures.posterA }) : std({ color: 0x221a33 }), 'posterA');
  posterA.position.set(0.35, 1.75, -1.985);
  const posterB = plane(0.5, 0.7, textures.posterB ? new THREE.MeshBasicMaterial({ map: textures.posterB }) : std({ color: 0x1a2a33 }), 'posterB');
  posterB.rotation.y = Math.PI / 2;
  posterB.position.set(-1.985, 1.7, -1.2);
  group.add(posterA, posterB);

  // ---- lights ----
  const ambient = new THREE.AmbientLight(0x404060, 0.35);
  ambient.name = 'ambient';
  const magentaLight = new THREE.PointLight(MAGENTA, 5, 4.5, 2);
  magentaLight.position.set(1.3, 0.25, -0.8);
  magentaLight.name = 'magentaLight';
  const cyanLight = new THREE.PointLight(CYAN, 4, 4, 2);
  cyanLight.position.set(-1.6, 1.75, 0.7);
  cyanLight.name = 'cyanLight';
  const deskLamp = new THREE.SpotLight(0xffd9a0, 6, 3, Math.PI / 5, 0.5, 1.5);
  deskLamp.position.set(-1.45, 1.55, -1.3);
  deskLamp.target.position.set(-0.9, 0.75, -1.5);
  deskLamp.name = 'deskLamp';
  group.add(ambient, magentaLight, cyanLight, deskLamp, deskLamp.target);

  scene.add(group);
  group.updateMatrixWorld(true);
  scene.fog = new THREE.FogExp2(0x0b0714, 0.11);
  scene.background = new THREE.Color(0x0b0714);

  let flickerIn = 0;
  return {
    group,
    lights: { ambient, magentaLight, cyanLight, deskLamp },
    animate(time, dt) {
      flickerIn -= dt;
      if (flickerIn <= 0) {
        ringMat.emissiveIntensity = Math.random() < 0.15 ? 0.6 + Math.random() * 1.5 : 3.5;
        cyanLight.intensity = ringMat.emissiveIntensity * 1.15;
        flickerIn = 0.08 + Math.random() * 0.25;
      }
      lavaLamp.material.emissiveIntensity = 1.6 + Math.sin(time * 1.3) * 0.5;
    },
  };
}
