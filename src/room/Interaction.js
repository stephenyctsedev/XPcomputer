import * as THREE from 'three';

/** Raycast hover/click against `targets` on the WebGL canvas. A click is a press+release that moved < 6 px. */
export function createInteraction(canvas, camera, targets, { onHover, onClick, enabled = () => true } = {}) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let pressed = null;

  const hits = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(targets, false).length > 0;
  };
  const setHover = (value) => {
    if (value === hovering) return;
    hovering = value;
    canvas.style.cursor = value ? 'pointer' : '';
    onHover?.(value);
  };
  const onMove = (e) => { if (enabled()) setHover(hits(e)); else setHover(false); };
  const onDown = (e) => { if (e.button === 0) pressed = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    if (!pressed) return;
    const moved = Math.hypot(e.clientX - pressed.x, e.clientY - pressed.y);
    pressed = null;
    if (enabled() && moved < 6 && hits(e)) onClick?.();
  };
  const onLeave = () => setHover(false);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  return {
    get hovering() { return hovering; },
    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointerleave', onLeave);
    },
  };
}
