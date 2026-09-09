// 2D pinball physics helpers. Pure functions; collisions mutate the ball they are given.

export function closestPointOnSegment(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return { x: a.x, y: a.y };
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

export function pointInCircle(p, c) {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
}

/** Shared response: push the ball out along n and reflect the (relative) velocity if it moves into the surface. */
function respond(ball, nx, ny, penetration, { restitution = 0.6, kick = 0, surfaceVelocity = null }) {
  ball.x += nx * penetration;
  ball.y += ny * penetration;
  const svx = surfaceVelocity?.x ?? 0;
  const svy = surfaceVelocity?.y ?? 0;
  const relVn = (ball.vx - svx) * nx + (ball.vy - svy) * ny;
  if (relVn < 0) {
    ball.vx -= (1 + restitution) * relVn * nx;
    ball.vy -= (1 + restitution) * relVn * ny;
    if (kick) { ball.vx += nx * kick; ball.vy += ny * kick; }
  }
  return true;
}

export function collideCircleSegment(ball, seg, options = {}) {
  const c = closestPointOnSegment(ball, { x: seg.ax, y: seg.ay }, { x: seg.bx, y: seg.by });
  const dx = ball.x - c.x;
  const dy = ball.y - c.y;
  const dist = Math.hypot(dx, dy);
  const reach = ball.r + (seg.r ?? 0);
  if (dist >= reach) return false;
  let nx;
  let ny;
  if (dist > 1e-9) { nx = dx / dist; ny = dy / dist; }
  else {
    // Ball centre exactly on the segment: use the segment normal facing the ball's previous side (against its velocity).
    const sx = seg.bx - seg.ax;
    const sy = seg.by - seg.ay;
    const len = Math.hypot(sx, sy) || 1;
    nx = -sy / len;
    ny = sx / len;
    if (nx * ball.vx + ny * ball.vy > 0) { nx = -nx; ny = -ny; }
  }
  return respond(ball, nx, ny, reach - dist, options);
}

export function collideCircleCircle(ball, circle, options = {}) {
  const dx = ball.x - circle.x;
  const dy = ball.y - circle.y;
  const dist = Math.hypot(dx, dy);
  const reach = ball.r + circle.r;
  if (dist >= reach) return false;
  const nx = dist > 1e-9 ? dx / dist : 0;
  const ny = dist > 1e-9 ? dy / dist : -1;
  return respond(ball, nx, ny, reach - dist, options);
}

/** A flipper is a capsule from the pivot (px, py) of `length`, rotated by `angle` (0 = pointing +x, negative = up). */
export function flipperSegment(f) {
  return { ax: f.px, ay: f.py, bx: f.px + Math.cos(f.angle) * f.length, by: f.py + Math.sin(f.angle) * f.length, r: f.r };
}

/** Velocity of the flipper surface at `point` for angular velocity `omega` (rad/s, negative = swinging up). */
export function flipperSurfaceVelocity(f, omega, point) {
  const rx = point.x - f.px;
  const ry = point.y - f.py;
  return { x: -omega * ry, y: omega * rx };
}

export function integrate(ball, dt, { gravity = 900, maxSpeed = 1400 } = {}) {
  ball.vy += gravity * dt;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed) { ball.vx *= maxSpeed / speed; ball.vy *= maxSpeed / speed; }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
}
