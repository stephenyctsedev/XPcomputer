// Our own SVG recreation of a four-colour waving flag. Generated from a wave formula; no Microsoft file involved.
export const FLAG_COLORS = { red: '#f35325', green: '#81bc06', blue: '#05a6f0', yellow: '#ffba08' };

// Pane extents in flag space (u across, v down) with a 4% gap between panes.
export const PANES = [
  { name: 'red', u: [0, 0.48], v: [0, 0.48] },
  { name: 'green', u: [0.52, 1], v: [0, 0.48] },
  { name: 'blue', u: [0, 0.48], v: [0.52, 1] },
  { name: 'yellow', u: [0.52, 1], v: [0.52, 1] },
];

/**
 * A point on the rippling flag: the right side is lifted and the middle bows upward,
 * more so along the top edge than the bottom. Result lies in a 100×90 box.
 */
export function flagPoint(u, v) {
  const x = 6 + 88 * u;
  const y = 20 + 62 * v - 14 * u - 8 * Math.sin(Math.PI * u) * (1 - 0.5 * v);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
}

function panePath({ u: [u0, u1], v: [v0, v1] }, steps = 8) {
  const points = [];
  for (let i = 0; i <= steps; i++) points.push(flagPoint(u0 + ((u1 - u0) * i) / steps, v0));
  for (let i = 1; i <= steps; i++) points.push(flagPoint(u1, v0 + ((v1 - v0) * i) / steps));
  for (let i = 1; i <= steps; i++) points.push(flagPoint(u1 - ((u1 - u0) * i) / steps, v1));
  for (let i = 1; i < steps; i++) points.push(flagPoint(u0, v1 - ((v1 - v0) * i) / steps));
  return `M${points.map((p) => p.join(' ')).join('L')}Z`;
}

// Each call gets its own gradient id so multiple flags (boot logo + Start button) can be
// mounted in the document at the same time without colliding <linearGradient> ids.
let sheenIdCounter = 0;

export function windowsFlagSvg(size = 100, { glow = false } = {}) {
  const height = Math.round(size * 0.9);
  const sheenId = `xp-winflag-sheen-${++sheenIdCounter}`;
  const panes = PANES.map((pane) => {
    const d = panePath(pane);
    return `<path class="xp-winflag-pane" data-pane="${pane.name}" fill="${FLAG_COLORS[pane.name]}" d="${d}"/>` +
      `<path class="xp-winflag-sheen" fill="url(#${sheenId})" d="${d}"/>`;
  }).join('');
  return `<svg class="xp-winflag${glow ? ' xp-winflag-glow' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 90" width="${size}" height="${height}" aria-hidden="true" focusable="false">` +
    `<defs><linearGradient id="${sheenId}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>` +
    `${panes}</svg>`;
}

/** The flag inside a span, ready to append into the boot screen or the Start button. */
export function flagEl(size, options) {
  const span = document.createElement('span');
  span.className = 'xp-winflag-host';
  span.innerHTML = windowsFlagSvg(size, options);
  return span;
}
