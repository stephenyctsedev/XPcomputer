// The table: layout in a 400×700 space, ball state machine and scoring. Pure; the UI owns the clock.
import { closestPointOnSegment, collideCircleSegment, collideCircleCircle, flipperSegment, flipperSurfaceVelocity, integrate, pointInCircle } from './physics.js';

export const TABLE = { width: 400, height: 700, ballRadius: 8 };
export const LETTERS = ['S', 'T', 'E', 'P', 'H', 'E', 'N'];
export const SCORES = { bumper: 100, slingshot: 50, target: 500, bank: 5000, letter: 250, word: 10000 };
export const FLIPPER = { length: 68, r: 6, rest: 0.45, raised: -0.5, speed: 24 };
export const NO_INPUT = Object.freeze({ left: false, right: false, plunger: false, nudgeLeft: false, nudgeRight: false });

const GRAVITY = 900;
const LANE_X = 366;
const LANE_FLOOR = 690;
const seg = (ax, ay, bx, by, r = 0) => ({ ax, ay, bx, by, r });

function buildWalls() {
  const walls = [
    seg(20, 180, 20, 540), seg(20, 540, 124, 636),             // left wall + inlane guide
    seg(352, 180, 352, 540), seg(352, 540, 276, 636),          // right playfield wall + guide
    seg(380, 180, 380, LANE_FLOOR), seg(352, LANE_FLOOR, 380, LANE_FLOOR), // plunger lane
    seg(20, 275, 60, 275), seg(60, 275, 60, 365), seg(60, 365, 20, 365),   // drop-target bank block
    seg(60, 500, 60, 560), seg(60, 560, 105, 560),             // left slingshot body
    seg(340, 500, 340, 560), seg(340, 560, 295, 560),          // right slingshot body
  ];
  for (const x of [104, 142, 181, 219, 258, 296]) walls.push(seg(x, 195, x, 235, 2));   // lane dividers
  const n = 24;
  for (let k = 0; k < n; k++) {                                // top arc, centre (200,180) radius 180
    const a0 = Math.PI + (k / n) * Math.PI;
    const a1 = Math.PI + ((k + 1) / n) * Math.PI;
    walls.push(seg(200 + 180 * Math.cos(a0), 180 + 180 * Math.sin(a0), 200 + 180 * Math.cos(a1), 180 + 180 * Math.sin(a1)));
  }
  return walls;
}

const spawnBall = () => ({ x: LANE_X, y: LANE_FLOOR - TABLE.ballRadius, vx: 0, vy: 0, r: TABLE.ballRadius, inLane: true, atRest: true });

export function createTable() {
  return {
    state: 'playing', time: 0, score: 0, ballNumber: 1, ballsTotal: 3, extraBallAwarded: false, tilt: false, nudges: [],
    letters: LETTERS.map(() => false),
    ball: spawnBall(),
    plunger: { charge: 0, held: false },
    left: { px: 128, py: 640, length: FLIPPER.length, r: FLIPPER.r, angle: FLIPPER.rest, omega: 0 },
    right: { px: 272, py: 640, length: FLIPPER.length, r: FLIPPER.r, angle: Math.PI - FLIPPER.rest, omega: 0 },
    walls: buildWalls(),
    gate: seg(352, 178, 380, 178, 2),
    bank: { x: 20, y: 275, w: 40, h: 90 },
    slingshots: [{ seg: seg(60, 500, 105, 560, 3), flash: 0 }, { seg: seg(340, 500, 295, 560, 3), flash: 0 }],
    bumpers: [{ x: 150, y: 270, r: 20, flash: 0 }, { x: 250, y: 270, r: 20, flash: 0 }, { x: 200, y: 345, r: 20, flash: 0 }],
    targets: [290, 320, 350].map((y) => ({ seg: seg(63, y - 11, 63, y + 11, 2), dropped: false })),
    lanes: [85, 123, 162, 200, 238, 277, 315].map((x) => ({ x, y: 215, r: 10, inside: false })),
  };
}

const approach = (value, target, maxDelta) => (Math.abs(target - value) <= maxDelta ? target : value + Math.sign(target - value) * maxDelta);

function moveFlipper(f, raised, mirrored, dt, frozen) {
  const target = frozen ? (mirrored ? Math.PI - FLIPPER.rest : FLIPPER.rest) : mirrored ? Math.PI - (raised ? FLIPPER.raised : FLIPPER.rest) : raised ? FLIPPER.raised : FLIPPER.rest;
  const previous = f.angle;
  f.angle = approach(previous, target, FLIPPER.speed * dt);
  f.omega = dt > 0 ? (f.angle - previous) / dt : 0;
}

function drain(t, events) {
  events.push({ type: 'drain' });
  t.tilt = false;
  t.nudges = [];
  if (t.ballNumber >= t.ballsTotal) {
    t.state = 'over';
    events.push({ type: 'gameOver' });
    return;
  }
  t.ballNumber++;
  t.ball = spawnBall();
}

export function stepTable(t, dt, input = NO_INPUT) {
  const events = [];
  if (t.state !== 'playing') return events;
  t.time += dt;
  for (const item of [...t.bumpers, ...t.slingshots]) item.flash = Math.max(0, item.flash - dt);
  moveFlipper(t.left, input.left, false, dt, t.tilt);
  moveFlipper(t.right, input.right, true, dt, t.tilt);

  const ball = t.ball;
  if (ball.inLane && ball.atRest) {
    if (input.plunger) {
      t.plunger.held = true;
      t.plunger.charge = Math.min(1, t.plunger.charge + dt);
    } else if (t.plunger.held) {
      ball.vy = -(650 + 750 * t.plunger.charge);
      ball.atRest = false;
      t.plunger.held = false;
      t.plunger.charge = 0;
      events.push({ type: 'launch' });
    }
    return events;
  }

  if (!t.tilt && (input.nudgeLeft || input.nudgeRight)) {
    ball.vx += input.nudgeLeft ? -90 : 90;
    ball.vy -= 30;
    t.nudges = t.nudges.filter((at) => t.time - at < 2).concat(t.time);
    events.push({ type: 'nudge' });
    if (t.nudges.length >= 3) { t.tilt = true; events.push({ type: 'tilt' }); }
  }

  integrate(ball, dt, { gravity: GRAVITY, maxSpeed: 1400 });

  for (const wall of t.walls) collideCircleSegment(ball, wall, { restitution: 0.55 });
  if (ball.vy > 0) collideCircleSegment(ball, t.gate, { restitution: 0.3 });          // one-way gate over the lane
  for (const f of [t.left, t.right]) {
    const s = flipperSegment(f);
    const contact = closestPointOnSegment(ball, { x: s.ax, y: s.ay }, { x: s.bx, y: s.by });
    if (collideCircleSegment(ball, s, { restitution: 0.5, surfaceVelocity: flipperSurfaceVelocity(f, f.omega, contact) })) events.push({ type: 'flipper' });
  }
  for (const sling of t.slingshots) {
    if (collideCircleSegment(ball, sling.seg, { restitution: 0.7, kick: 260 })) { t.score += SCORES.slingshot; sling.flash = 0.15; events.push({ type: 'slingshot' }); }
  }
  for (const bumper of t.bumpers) {
    if (collideCircleCircle(ball, bumper, { restitution: 1.0, kick: 320 })) { t.score += SCORES.bumper; bumper.flash = 0.15; events.push({ type: 'bumper' }); }
  }
  for (const target of t.targets) {
    if (target.dropped || !collideCircleSegment(ball, target.seg, { restitution: 0.5 })) continue;
    target.dropped = true;
    t.score += SCORES.target;
    events.push({ type: 'target' });
    if (t.targets.every((x) => x.dropped)) {
      t.score += SCORES.bank;
      t.targets.forEach((x) => { x.dropped = false; });
      events.push({ type: 'bank' });
    }
  }
  t.lanes.forEach((lane, index) => {
    const inside = pointInCircle(ball, lane);
    if (inside && !lane.inside && !t.letters[index]) {
      t.letters[index] = true;
      t.score += SCORES.letter;
      events.push({ type: 'letter', index });
      if (t.letters.every(Boolean)) {
        t.score += SCORES.word;
        events.push({ type: 'word' });
        if (!t.extraBallAwarded) { t.extraBallAwarded = true; t.ballsTotal++; events.push({ type: 'extraBall' }); }
        t.letters = LETTERS.map(() => false);
      }
    }
    lane.inside = inside;
  });

  if (ball.inLane && ball.y < 180) ball.inLane = false;
  if (ball.inLane && !ball.atRest && ball.y > LANE_FLOOR - 30 && Math.abs(ball.vy) < 20) { ball.atRest = true; ball.vx = 0; ball.vy = 0; ball.x = LANE_X; ball.y = LANE_FLOOR - ball.r; }
  if (ball.y - ball.r > TABLE.height + 30) drain(t, events);
  return events;
}
