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
