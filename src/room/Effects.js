import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Bloom composer with a Low FX bypass (plain render, pixel ratio 1). */
export function createEffects(renderer, scene, camera, { lowFx = false } = {}) {
  let low = Boolean(lowFx);
  let width = 1;
  let height = 1;
  const composer = new EffectComposer(renderer);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.8, 0.4, 0.85);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function setSize(w, h) {
    width = w;
    height = h;
    const ratio = Math.min(window.devicePixelRatio || 1, low ? 1 : 2);
    renderer.setPixelRatio(ratio);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(ratio);
    composer.setSize(w, h);
    bloom.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
  }

  return {
    render() { if (low) renderer.render(scene, camera); else composer.render(); },
    setSize,
    setLowFx(value) { low = Boolean(value); setSize(width, height); },
    get lowFx() { return low; },
    bloom,
    dispose() { composer.dispose(); },
  };
}
