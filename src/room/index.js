import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { buildRoom } from './Room.js';
import { buildComputer, SCREEN } from './Computer.js';
import { createCameraRig } from './CameraRig.js';
import { createEffects } from './Effects.js';
import { createInteraction } from './Interaction.js';
import { makeRoomTextures } from './textures.js';
import { containScale } from './cameraFit.js';

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
  // Chrome does not reliably hit-test a `pointer-events: auto` element nested inside a
  // `transform-style: preserve-3d` chain whose ancestors are `pointer-events: none` (confirmed
  // live: elementFromPoint() skips straight past the whole CSS3D layer to the WebGL canvas
  // behind it, even though the element's own projected rect and computed transform are both
  // correct) -- so the screen would render fine but never actually be clickable. Once the
  // camera arrives, this plain flat layer takes over showing screenElement with a normal 2D
  // `scale()` instead, which hit-tests normally; CSS3DRenderer reclaims the element on its own
  // (it re-parents anything not already under its internal camera element) once flight resumes.
  const flatScreen = document.createElement('div');
  flatScreen.className = 'room-flat-screen';
  container.append(renderer.domElement, cssRenderer.domElement, flatScreen);

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

  const fitFlatScreen = () => {
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const scale = containScale({ boxWidth: w, boxHeight: h, contentWidth: SCREEN.pixelsWide, contentHeight: SCREEN.pixelsTall });
    screenElement.style.transform = `scale(${scale})`;
  };
  // CSS3DRenderer caches each object's *own* transform string (screenElement's position/scale
  // in the scene, which never changes) and only rewrites element.style.transform when that
  // string differs from last time -- so once fitFlatScreen() overwrites it, CSS3DRenderer has
  // no way to notice its cached value no longer matches the DOM and never restores it. Snapshot
  // the resting value it set on its own before we ever touch the element, and put that back by
  // hand when handing the element back, rather than trusting CSS3DRenderer to reapply it.
  let restingTransform = null;
  const rig = createCameraRig(camera, controls, {
    screenCenter: computer.screenCenter, screenNormal: computer.screenNormal, screenSize: computer.size, reducedMotion,
    onState: (s) => {
      if (s === 'screen') {
        restingTransform ??= screenElement.style.transform;
        flatScreen.append(screenElement);
        fitFlatScreen();
        emit('screenFocused');
      }
      if (s === 'overview') { screenElement.style.transform = restingTransform ?? ''; emit('screenLeft'); }
    },
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
    if (rig.state === 'screen') fitFlatScreen();
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
    // Skip while fully focused: screenElement now lives in flatScreen (see onState above), and
    // rendering here would just re-parent it back under CSS3DRenderer's own camera element.
    if (rig.state !== 'screen') cssRenderer.render(scene, camera);
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
