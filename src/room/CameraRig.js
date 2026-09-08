import * as THREE from 'three';
import { fitDistance } from './cameraFit.js';
import { createTween } from './tween.js';

export const OVERVIEW = { position: [1.4, 1.6, 1.9], target: [-0.3, 0.9, -0.9] };

export function createCameraRig(camera, controls, { screenCenter, screenNormal, screenSize, reducedMotion = false, duration = 0.9, onState } = {}) {
  let state = 'overview';
  let tween = null;
  const saved = { position: new THREE.Vector3().fromArray(OVERVIEW.position), target: new THREE.Vector3().fromArray(OVERVIEW.target) };
  camera.position.copy(saved.position);
  controls.target.copy(saved.target);
  camera.lookAt(controls.target);

  const setState = (next) => { state = next; onState?.(next); };
  const screenPose = () => {
    const distance = fitDistance({ width: screenSize.width, height: screenSize.height, fovDeg: camera.fov, aspect: camera.aspect });
    return { position: screenCenter.clone().addScaledVector(screenNormal, distance), target: screenCenter.clone() };
  };
  function fly(to, endState) {
    tween?.cancel();
    controls.enabled = false;
    const from = { position: camera.position.clone(), target: controls.target.clone() };
    const t = createTween({
      duration: reducedMotion ? 0 : duration,
      onUpdate: (k) => {
        camera.position.lerpVectors(from.position, to.position, k);
        controls.target.lerpVectors(from.target, to.target, k);
        camera.lookAt(controls.target);
      },
      onComplete: () => {
        tween = null;
        controls.enabled = endState === 'overview';
        setState(endState);
      },
    });
    // createTween can finish synchronously (duration <= 0, e.g. reducedMotion),
    // firing onComplete's `tween = null` before this assignment would otherwise
    // run. Only keep the tween if it's still in flight, so a synchronous finish
    // doesn't get overwritten back to a stale non-null done tween.
    tween = t.done ? null : t;
  }

  return {
    get state() { return state; },
    toScreen() {
      if (state === 'screen' || state === 'toScreen') return;
      if (state === 'overview') { saved.position.copy(camera.position); saved.target.copy(controls.target); }
      setState('toScreen');
      fly(screenPose(), 'screen');
    },
    toOverview() {
      if (state === 'overview' || state === 'toOverview') return;
      setState('toOverview');
      fly({ position: saved.position.clone(), target: saved.target.clone() }, 'overview');
    },
    update(dt) {
      if (tween) tween.update(dt);
      else if (state === 'overview') controls.update();
    },
    onResize() {
      if (state !== 'screen') return;
      const pose = screenPose();
      camera.position.copy(pose.position);
      camera.lookAt(pose.target);
    },
  };
}
