/**
 * Distance along the screen normal at which a width×height plane exactly fills the
 * viewport (limited by whichever axis is tighter), times a safety margin.
 */
export function fitDistance({ width, height, fovDeg, aspect, margin = 1.04 }) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const byHeight = (height / 2) / tanHalf;
  const byWidth = (width / 2) / (tanHalf * aspect);
  return Math.max(byHeight, byWidth) * margin;
}

/** Uniform scale that fits contentWidth x contentHeight entirely inside boxWidth x boxHeight ("contain" fit). */
export function containScale({ boxWidth, boxHeight, contentWidth, contentHeight }) {
  return Math.min(boxWidth / contentWidth, boxHeight / contentHeight);
}

/**
 * Pick the room's render size: the container's own box, falling back to the window when the
 * container hasn't been laid out yet. Both can read 0 for one synchronous tick right at mount
 * (observed live: some embedding contexts -- e.g. a preview surface still negotiating its own
 * viewport -- report window.innerWidth/innerHeight as 0 until their first 'resize' event fires).
 * Returns null when neither source has a usable size yet, so callers can skip sizing the
 * renderer rather than feeding it 0 (which allocates zero-sized WebGL render targets and spams
 * GL_INVALID_FRAMEBUFFER_OPERATION on every frame) or NaN (0/0) into camera.aspect.
 */
export function resolveRoomSize({ clientWidth, clientHeight, innerWidth, innerHeight }) {
  const w = clientWidth || innerWidth;
  const h = clientHeight || innerHeight;
  return w > 0 && h > 0 ? { w, h } : null;
}
