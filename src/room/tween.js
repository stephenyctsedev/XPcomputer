export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Minimal time-based tween. Call update(dt) each frame; k in [0,1] goes to onUpdate. */
export function createTween({ duration, ease = easeInOutCubic, onUpdate, onComplete }) {
  let elapsed = 0;
  let done = false;
  const finish = () => { done = true; onComplete?.(); };
  if (duration <= 0) { onUpdate(1); finish(); }
  return {
    update(dt) {
      if (done) return true;
      elapsed = Math.min(elapsed + dt, duration);
      onUpdate(ease(elapsed / duration));
      if (elapsed >= duration) finish();
      return done;
    },
    get done() { return done; },
    cancel() { done = true; },
  };
}
