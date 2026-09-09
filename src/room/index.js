import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { buildRoom } from './Room.js';
import { buildComputer } from './Computer.js';
import { createCameraRig } from './CameraRig.js';
import { createEffects } from './Effects.js';
import { createInteraction } from './Interaction.js';
import { makeRoomTextures } from './textures.js';

/** Dispose every geometry/material (and any map/emissiveMap texture they hold) under `root`. */
function disposeSceneResources(root) {
  root.traverse((node) => {
    node.geometry?.dispose();
    if (!node.material) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      material.map?.dispose();
      material.emissiveMap?.dispose();
      material.dispose();
    }
  });
}

export function createRoom(container, screenElement, { reducedMotion = false, lowFx = false } = {}) {
  const listeners = new Map();
  const on = (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event).delete(fn); };
  const emit = (event, data) => { for (const fn of listeners.get(event) ?? []) fn(data); };

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'room-canvas';
  const cssRenderer = new CSS3DRenderer();
  cssRenderer.domElement.className = 'room-css-layer';
  container.append(renderer.domElement, cssRenderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 40);
  const room = buildRoom(scene, makeRoomTextures());
  const computer = buildComputer(scene, { screenElement });

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 1.0;
  controls.maxDistance = 4.5;
  controls.minPolarAngle = 0.55;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;
  controls.minAzimuthAngle = -1.15;
  controls.maxAzimuthAngle = 1.15;

  const rig = createCameraRig(camera, controls, {
    screenCenter: computer.screenCenter, screenNormal: computer.screenNormal, screenSize: computer.size, reducedMotion,
    onState: (s) => { if (s === 'screen') emit('screenFocused'); if (s === 'overview') emit('screenLeft'); },
  });
  const effects = createEffects(renderer, scene, camera, { lowFx });
  const interaction = createInteraction(renderer.domElement, camera, [computer.hitbox], {
    enabled: () => rig.state === 'overview',
    onHover: (h) => computer.setHover(h),
    onClick: () => emit('pcClicked'),
  });

  const resize = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    effects.setSize(w, h);
    cssRenderer.setSize(w, h);
    rig.onResize();
  };
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = false;
  let frames = 0;
  let raf = 0;
  const frame = () => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    rig.update(dt);
    room.animate(t, dt);
    computer.animate(t);
    effects.render();
    cssRenderer.render(scene, camera);
    if (++frames === 2) emit('firstFrame');
  };
  const start = () => { if (running) return; running = true; clock.getDelta(); frame(); };
  // Cancel the outstanding rAF handle explicitly: per spec a callback already queued when the
  // document becomes hidden is RETAINED (not dropped) and still fires on the tab resuming, so
  // relying on the `running` flag alone lets that stale callback schedule its own next frame
  // (via requestAnimationFrame(frame) above) racing the newly-started loop — compounding on
  // every subsequent hide/show cycle.
  const stop = () => {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const onVisibility = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVisibility);
  start();

  return {
    focusScreen: () => rig.toScreen(),
    leaveScreen: () => rig.toOverview(),
    setPower: (onOff) => computer.setPower(onOff),
    setLowFx: (v) => effects.setLowFx(v),
    get state() { return rig.state; },
    on,
    dispose() {
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      interaction.dispose();
      rig.dispose();
      controls.dispose();
      effects.dispose();
      disposeSceneResources(scene);
      renderer.dispose();
      container.replaceChildren();
    },
  };
}
