# XP Computer Portfolio — Phase 5 Implementation Plan (Pinball)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pinball placeholder with an original, playable 2D pinball table: flippers, plunger, pop bumpers, slingshots, a drop-target bank, rollover lanes that spell S-T-E-P-H-E-N, nudge and tilt, three balls, sounds and a saved high score.

**Architecture:** `physics.js` is a pure 2D collision library (circle vs segment, circle vs circle, moving flipper segments, gravity integration, speed clamp). `table.js` is the pure game: the layout of the table in a 400×700 coordinate space, the ball state machine (lane → play → drain), scoring rules and an event list per step. Both are unit tested. `render.js` draws the table on a canvas, `input.js` maps keys to a held-input object, and `Pinball.js` is the window: fixed-timestep loop, score panel, menus, pause, high score. Registers as app id `pinball`.

**Tech Stack:** Plain JavaScript, Vitest + jsdom, canvas 2D, XP.css chrome.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §7 intro and §7.3. Depends on Phase 1 (registry, window manager, menus, dialogs, sounds, storage).

## Global Constraints

- `physics.js` and `table.js` have no DOM access and no timers; the UI owns the clock.
- Table space is 400 × 700 units (px at scale 1), gravity along +y, fixed physics step `1/240` s with substeps per frame; the loop clamps a frame to 50 ms.
- Controls: `Z` left flipper, `/` right flipper, `Space` plunger (hold to charge), `X` nudge left, `.` nudge right, `F2` new game, `F3` pause. Arrow keys mirror the flippers and plunger.
- Scoring: bumper 100, slingshot 50, drop target 500, bank complete 5,000 (targets reset), each newly lit letter 250, word complete 10,000 and one extra ball per game; three balls per game.
- Tilt after three nudges within 2 s: flippers dead until the ball drains.
- Own artwork only; the menu says "Pinball". High score under `localStorage` key `xpcomputer.pinball.high`.
- Single instance. Files are UTF-8. **Never `git commit` or `git push` unless Stephen says so**; "Stage" steps run `git add` only.

---

## File Structure (Phase 5)

| File | Responsibility |
|---|---|
| `src/xp/games/pinball/physics.js` (+ test) | Vectors, circle–segment and circle–circle collision, flipper contact, integration |
| `src/xp/games/pinball/table.js` (+ test) | Layout constants, ball/plunger/flipper state, scoring, events |
| `src/xp/games/pinball/render.js` | Canvas drawing with glow, trail, lit indicators |
| `src/xp/games/pinball/input.js` | Keyboard → held-input state |
| `src/xp/games/pinball/Pinball.js` (+ test) | Window, loop, panel, menus, pause, high score, sounds |
| `src/xp/games/pinball/pinball.css` | Layout of table and panel |
| `src/xp/apps/misc.js`, `src/xp/createDesktop.js` | Swap placeholder for the real app |
| `README.md` | Controls and QA items |

---

### Task 1: Physics

**Files:**
- Create: `src/xp/games/pinball/physics.js`, `src/xp/games/pinball/physics.test.js`

**Interfaces:**
- Produces: `closestPointOnSegment(p, a, b) → {x, y}`; `collideCircleSegment(ball, seg, { restitution = 0.6, kick = 0, surfaceVelocity = null }) → boolean` where `ball = { x, y, vx, vy, r }` and `seg = { ax, ay, bx, by, r? }` (segment thickness radius, default 0); `collideCircleCircle(ball, c, { restitution, kick }) → boolean` with `c = { x, y, r }`; `flipperSegment(flipper) → seg` for `flipper = { px, py, length, angle, r }`; `flipperSurfaceVelocity(flipper, omega, point) → {x, y}`; `integrate(ball, dt, { gravity = 900, maxSpeed = 1400 })`; `pointInCircle(p, c) → boolean`.
- Collisions mutate `ball` (position pushed out of penetration, velocity reflected when moving into the surface) and return `true` only when contact happened.

- [ ] **Step 1: Write the failing tests**

`src/xp/games/pinball/physics.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { closestPointOnSegment, collideCircleSegment, collideCircleCircle, flipperSegment, flipperSurfaceVelocity, integrate, pointInCircle } from './physics.js';

describe('geometry', () => {
  it('finds the closest point on a segment, clamped to its ends', () => {
    expect(closestPointOnSegment({ x: 5, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 5, y: 0 });
    expect(closestPointOnSegment({ x: -4, y: 3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 0, y: 0 });
    expect(closestPointOnSegment({ x: 14, y: -3 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({ x: 10, y: 0 });
  });
  it('tests points in circles', () => {
    expect(pointInCircle({ x: 1, y: 1 }, { x: 0, y: 0, r: 2 })).toBe(true);
    expect(pointInCircle({ x: 3, y: 0 }, { x: 0, y: 0, r: 2 })).toBe(false);
  });
});

describe('collideCircleSegment', () => {
  const floor = { ax: 0, ay: 100, bx: 400, by: 100 };
  it('reflects a ball falling onto a floor with restitution and pushes it out', () => {
    const ball = { x: 50, y: 95, vx: 30, vy: 200, r: 8 };
    expect(collideCircleSegment(ball, floor, { restitution: 0.5 })).toBe(true);
    expect(ball.y).toBeCloseTo(92, 5);
    expect(ball.vy).toBeCloseTo(-100, 5);
    expect(ball.vx).toBeCloseTo(30, 5);
  });
  it('ignores balls that are not touching or already moving away', () => {
    expect(collideCircleSegment({ x: 50, y: 80, vx: 0, vy: 200, r: 8 }, floor)).toBe(false);
    const leaving = { x: 50, y: 95, vx: 0, vy: -50, r: 8 };
    expect(collideCircleSegment(leaving, floor)).toBe(true);     // touching: pushed out…
    expect(leaving.vy).toBe(-50);                                  // …but velocity untouched
  });
  it('honours segment thickness and adds a kick along the normal', () => {
    const thick = { ax: 0, ay: 100, bx: 400, by: 100, r: 6 };
    const ball = { x: 50, y: 88, vx: 0, vy: 100, r: 8 };
    expect(collideCircleSegment(ball, thick, { restitution: 1, kick: 40 })).toBe(true);
    expect(ball.y).toBeCloseTo(86, 5);
    expect(ball.vy).toBeCloseTo(-140, 5);
  });
  it('uses the surface velocity of a moving segment', () => {
    const ball = { x: 50, y: 95, vx: 0, vy: 0, r: 8 };
    expect(collideCircleSegment(ball, floor, { restitution: 1, surfaceVelocity: { x: 0, y: -300 } })).toBe(true);
    expect(ball.vy).toBeCloseTo(-600, 5);
  });
});

describe('collideCircleCircle', () => {
  it('bounces off a bumper and adds its kick', () => {
    const bumper = { x: 200, y: 200, r: 20 };
    const ball = { x: 200, y: 175, vx: 0, vy: 100, r: 8 };
    expect(collideCircleCircle(ball, bumper, { restitution: 0.8, kick: 50 })).toBe(true);
    expect(ball.y).toBeCloseTo(172, 5);
    expect(ball.vy).toBeCloseTo(-130, 5);
    expect(collideCircleCircle({ x: 200, y: 100, vx: 0, vy: 100, r: 8 }, bumper)).toBe(false);
  });
});

describe('flippers', () => {
  const left = { px: 140, py: 640, length: 70, angle: 0, r: 6 };
  it('builds the flipper segment from pivot, length and angle', () => {
    expect(flipperSegment(left)).toEqual({ ax: 140, ay: 640, bx: 210, by: 640, r: 6 });
    const raised = flipperSegment({ ...left, angle: -Math.PI / 2 });
    expect(raised.bx).toBeCloseTo(140, 5);
    expect(raised.by).toBeCloseTo(570, 5);
  });
  it('surface velocity grows with distance from the pivot and points up when swinging up', () => {
    const v = flipperSurfaceVelocity(left, -20, { x: 200, y: 640 });
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(-1200, 5);
    const atPivot = flipperSurfaceVelocity(left, -20, { x: 140, y: 640 });
    expect(atPivot.x).toBeCloseTo(0, 9);
    expect(atPivot.y).toBeCloseTo(0, 9);
  });
});

describe('integrate', () => {
  it('applies gravity, moves the ball and clamps speed', () => {
    const ball = { x: 0, y: 0, vx: 0, vy: 0, r: 8 };
    integrate(ball, 0.5, { gravity: 900 });
    expect(ball.vy).toBeCloseTo(450, 5);
    expect(ball.y).toBeCloseTo(225, 5);
    const fast = { x: 0, y: 0, vx: 5000, vy: 0, r: 8 };
    integrate(fast, 0.001, { gravity: 0, maxSpeed: 1400 });
    expect(Math.hypot(fast.vx, fast.vy)).toBeCloseTo(1400, 5);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/xp/games/pinball/physics.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement physics.js**

`src/xp/games/pinball/physics.js`:

```js
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
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/xp/games/pinball/physics.test.js`
Expected: PASS, 9 tests.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/pinball/physics.js src/xp/games/pinball/physics.test.js
```

Suggested commit message: `feat(pinball): 2D collision and integration helpers`

---
### Task 2: Table layout, ball state machine and scoring

**Files:**
- Create: `src/xp/games/pinball/table.js`, `src/xp/games/pinball/table.test.js`

**Interfaces:**
- Consumes: Task 1 physics.
- Produces: `TABLE = { width: 400, height: 700, ballRadius: 8 }`, `LETTERS = ['S','T','E','P','H','E','N']`, `SCORES`, `FLIPPER = { length, r, rest, raised, speed }`, `NO_INPUT`, `createTable() → t`, `stepTable(t, dt, input) → events[]`.
- `input = { left, right, plunger, nudgeLeft, nudgeRight }` (booleans; nudges are one-shot for the frame they are passed in).
- `t` fields used by the renderer and UI: `state ('playing'|'over'), time, score, ballNumber, ballsTotal, extraBallAwarded, tilt, letters[7], ball {x,y,vx,vy,r,inLane,atRest}, plunger {charge, held}, left/right {px,py,length,r,angle,omega}, walls[], gate, slingshots[{seg,flash}], bumpers[{x,y,r,flash}], targets[{seg,dropped}], lanes[{x,y,r,inside}], bank {x,y,w,h}`.
- Events: `launch, flipper, bumper, slingshot, target, bank, letter {index}, word, extraBall, nudge, tilt, drain, gameOver`.

- [ ] **Step 1: Write the failing tests**

`src/xp/games/pinball/table.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { createTable, stepTable, NO_INPUT, FLIPPER, SCORES } from './table.js';

const DT = 1 / 240;
const inPlay = (t, ball) => Object.assign(t.ball, { inLane: false, atRest: false, vx: 0, vy: 0, ...ball });
const types = (events) => events.map((e) => e.type);

describe('table', () => {
  it('starts with the ball resting in the plunger lane and three balls', () => {
    const t = createTable();
    expect(t.state).toBe('playing');
    expect(t.ballNumber).toBe(1);
    expect(t.ballsTotal).toBe(3);
    expect(t.ball.inLane).toBe(true);
    expect(t.ball.atRest).toBe(true);
    expect(t.ball.x).toBeGreaterThan(352);
    expect(t.score).toBe(0);
    expect(t.letters).toEqual([false, false, false, false, false, false, false]);
  });

  it('charges the plunger while held and launches on release', () => {
    const t = createTable();
    const held = { ...NO_INPUT, plunger: true };
    for (let i = 0; i < 120; i++) stepTable(t, DT, held);
    expect(t.plunger.charge).toBeCloseTo(0.5, 1);
    expect(t.ball.atRest).toBe(true);
    const events = stepTable(t, DT, NO_INPUT);
    expect(types(events)).toContain('launch');
    expect(t.ball.vy).toBeLessThan(-900);
    expect(t.ball.atRest).toBe(false);
    expect(t.plunger.charge).toBe(0);
  });

  it('drains, moves to the next ball and ends the game after the last one', () => {
    const t = createTable();
    for (let n = 1; n <= 3; n++) {
      inPlay(t, { x: 200, y: 760, vy: 100 });
      const events = stepTable(t, DT, NO_INPUT);
      expect(types(events)).toContain('drain');
      if (n < 3) {
        expect(t.ballNumber).toBe(n + 1);
        expect(t.ball.inLane).toBe(true);
        expect(t.ball.atRest).toBe(true);
      } else {
        expect(t.state).toBe('over');
        expect(types(events)).toContain('gameOver');
      }
    }
    expect(stepTable(t, DT, NO_INPUT)).toEqual([]);
  });

  it('scores bumpers and slingshots and kicks the ball away', () => {
    const t = createTable();
    inPlay(t, { x: 150, y: 270 - 20 - 8 + 1, vy: 50 });
    const events = stepTable(t, DT, NO_INPUT);
    expect(types(events)).toContain('bumper');
    expect(t.score).toBe(SCORES.bumper);
    expect(t.ball.vy).toBeLessThan(0);
    expect(t.bumpers[0].flash).toBeGreaterThan(0);
    inPlay(t, { x: 90, y: 524, vx: -100 });          // 10 units off the diagonal (60,500)→(105,560), moving into it
    expect(types(stepTable(t, DT, NO_INPUT))).toContain('slingshot');
    expect(t.score).toBe(SCORES.bumper + SCORES.slingshot);
  });

  it('drops the targets, pays the bank bonus and resets the bank', () => {
    const t = createTable();
    let expected = 0;
    [290, 320, 350].forEach((y, i) => {
      inPlay(t, { x: 72, y, vx: -100 });
      const events = stepTable(t, DT, NO_INPUT);
      expect(types(events)).toContain('target');
      expected += SCORES.target;
      if (i < 2) expect(t.targets[i].dropped).toBe(true);
      else {
        expected += SCORES.bank;
        expect(types(events)).toContain('bank');
        expect(t.targets.every((target) => !target.dropped)).toBe(true);
      }
    });
    expect(t.score).toBe(expected);
  });

  it('lights letters once per pass, pays the word bonus and one extra ball per game', () => {
    const t = createTable();
    const runLanes = () => {
      for (const lane of t.lanes) {
        inPlay(t, { x: lane.x, y: lane.y });
        stepTable(t, DT, NO_INPUT);
        stepTable(t, DT, NO_INPUT);                       // still inside: must not score twice
        inPlay(t, { x: lane.x, y: lane.y - 40 });
        stepTable(t, DT, NO_INPUT);
      }
    };
    runLanes();
    expect(t.score).toBe(7 * SCORES.letter + SCORES.word);
    expect(t.ballsTotal).toBe(4);
    expect(t.extraBallAwarded).toBe(true);
    expect(t.letters.every((lit) => !lit)).toBe(true);
    runLanes();
    expect(t.ballsTotal).toBe(4);
    expect(t.score).toBe(2 * (7 * SCORES.letter + SCORES.word));
  });

  it('tilts after three quick nudges, freezes the flippers, and clears on drain', () => {
    const t = createTable();
    inPlay(t, { x: 200, y: 400 });
    const nudge = { ...NO_INPUT, nudgeLeft: true };
    stepTable(t, DT, nudge);
    stepTable(t, DT, nudge);
    const events = stepTable(t, DT, nudge);
    expect(t.tilt).toBe(true);
    expect(types(events)).toContain('tilt');
    const before = t.left.angle;
    stepTable(t, DT, { ...NO_INPUT, left: true });
    expect(t.left.angle).toBe(before);
    inPlay(t, { x: 200, y: 760 });
    stepTable(t, DT, NO_INPUT);
    expect(t.tilt).toBe(false);
  });

  it('swings the flippers while held and sends the ball up on contact', () => {
    const t = createTable();
    inPlay(t, { x: 160, y: 641 });
    const rest = t.left.angle;
    let events = [];
    for (let i = 0; i < 12; i++) events = events.concat(stepTable(t, DT, { ...NO_INPUT, left: true }));
    expect(t.left.angle).toBeLessThan(rest);
    expect(t.left.angle).toBeGreaterThanOrEqual(FLIPPER.raised);
    expect(types(events)).toContain('flipper');
    expect(t.ball.vy).toBeLessThan(-100);
    for (let i = 0; i < 240; i++) stepTable(t, DT, NO_INPUT);
    expect(t.left.angle).toBeCloseTo(rest, 5);
  });
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/xp/games/pinball/table.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement table.js**

`src/xp/games/pinball/table.js`:

```js
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
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/xp/games/pinball/table.test.js`
Expected: PASS, 8 tests. If the slingshot assertion fails, check the ball start `{ x: 100, y: 525, vx: -100 }` sits within 11 units of the diagonal `(60,500)→(105,560)`; move it one unit closer rather than changing the rule.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/pinball/table.js src/xp/games/pinball/table.test.js
```

Suggested commit message: `feat(pinball): table layout, ball state machine, scoring and tilt`

---
### Task 3: Renderer, input mapping and stylesheet

**Files:**
- Create: `src/xp/games/pinball/render.js`, `src/xp/games/pinball/input.js`, `src/xp/games/pinball/pinball.css`

**Interfaces:**
- Produces: `createRenderer(canvas) → { resize(scale, dpr), draw(table), clearTrail() }` (safe when the canvas has no 2D context).
- Produces: `KEYMAP`, `createInput(targetEl) → { frame() → input, onKey(key, fn), detach() }`. `frame()` returns the held state plus one-shot nudges and clears the nudges.
- Verified through Task 4's tests and by hand.

- [ ] **Step 1: Implement render.js**

`src/xp/games/pinball/render.js`:

```js
import { TABLE, LETTERS } from './table.js';
import { flipperSegment } from './physics.js';

const CYAN = '#3ee9ff';
const MAGENTA = '#ff2bd6';
const DIM = 'rgba(62,233,255,0.25)';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let dpr = 1;
  const trail = [];

  function resize(nextScale, nextDpr = 1) {
    scale = nextScale;
    dpr = nextDpr;
    canvas.width = Math.round(TABLE.width * scale * dpr);
    canvas.height = Math.round(TABLE.height * scale * dpr);
    canvas.style.width = `${TABLE.width * scale}px`;
    canvas.style.height = `${TABLE.height * scale}px`;
  }
  function line(s, color, width, glow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = glow ? color : 'transparent';
    ctx.shadowBlur = glow ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(s.ax, s.ay);
    ctx.lineTo(s.bx, s.by);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function circle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function glowText(text, x, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  function draw(t) {
    if (!ctx) return;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, TABLE.height);
    bg.addColorStop(0, '#12081f');
    bg.addColorStop(1, '#05030c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    ctx.strokeStyle = 'rgba(120,80,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= TABLE.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TABLE.height); ctx.stroke(); }
    for (let y = 0; y <= TABLE.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TABLE.width, y); ctx.stroke(); }

    ctx.lineCap = 'round';
    for (const wall of t.walls) line(wall, CYAN, Math.max(2, wall.r * 2), true);
    ctx.setLineDash([4, 4]);
    line(t.gate, DIM, 2, false);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(62,233,255,0.08)';
    ctx.fillRect(t.bank.x, t.bank.y, t.bank.w, t.bank.h);
    for (const target of t.targets) line(target.seg, target.dropped ? 'rgba(255,43,214,0.2)' : MAGENTA, 6, !target.dropped);
    for (const sling of t.slingshots) line(sling.seg, sling.flash > 0 ? '#ffffff' : MAGENTA, 6, true);
    for (const b of t.bumpers) {
      circle(b.x, b.y, b.r, b.flash > 0 ? '#ffffff' : 'rgba(255,43,214,0.35)', MAGENTA);
      circle(b.x, b.y, b.r * 0.45, MAGENTA);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    t.lanes.forEach((lane, i) => {
      const lit = t.letters[i];
      circle(lane.x, lane.y, lane.r, lit ? 'rgba(255,214,0,0.9)' : 'rgba(255,255,255,0.08)', lit ? '#ffd600' : DIM);
      glowText(LETTERS[i], lane.x, lane.y - 22, 'bold 14px "Trebuchet MS", Tahoma, sans-serif', lit ? '#ffffff' : 'rgba(255,255,255,0.35)');
    });
    for (const f of [t.left, t.right]) line(flipperSegment(f), '#e8f6ff', f.r * 2, true);

    if (t.ball.inLane && t.ball.atRest) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(357, 560, 18, 120);
      const h = 120 * t.plunger.charge;
      ctx.fillStyle = MAGENTA;
      ctx.fillRect(357, 680 - h, 18, h);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px Tahoma, sans-serif';
      ctx.fillText('SPACE', 366, 545);
    }

    trail.push({ x: t.ball.x, y: t.ball.y });
    if (trail.length > 10) trail.shift();
    trail.forEach((p, i) => circle(p.x, p.y, t.ball.r * (i / trail.length) * 0.8, `rgba(255,255,255,${0.04 + (i / trail.length) * 0.12})`));
    const shine = ctx.createRadialGradient(t.ball.x - 3, t.ball.y - 3, 1, t.ball.x, t.ball.y, t.ball.r);
    shine.addColorStop(0, '#ffffff');
    shine.addColorStop(1, '#8fa3b8');
    circle(t.ball.x, t.ball.y, t.ball.r, shine);

    if (t.tilt) glowText('TILT', 200, 440, 'bold 48px Impact, "Arial Black", sans-serif', MAGENTA);
    if (t.state === 'over') {
      glowText('GAME OVER', 200, 440, 'bold 40px Impact, "Arial Black", sans-serif', CYAN);
      ctx.fillStyle = '#fff';
      ctx.font = '14px Tahoma, sans-serif';
      ctx.fillText('F2 for a new game', 200, 470);
    }
  }
  return { resize, draw, clearTrail: () => trail.splice(0) };
}
```

- [ ] **Step 2: Implement input.js**

`src/xp/games/pinball/input.js`:

```js
export const KEYMAP = {
  z: 'left', Z: 'left', ArrowLeft: 'left',
  '/': 'right', '?': 'right', ArrowRight: 'right',
  ' ': 'plunger', ArrowDown: 'plunger',
  x: 'nudgeLeft', X: 'nudgeLeft',
  '.': 'nudgeRight', '>': 'nudgeRight',
};

/** Keyboard → held flippers/plunger plus one-shot nudges. Other keys can be bound with onKey (F2, F3). */
export function createInput(target) {
  const held = { left: false, right: false, plunger: false };
  const pending = { nudgeLeft: false, nudgeRight: false };
  const shortcuts = new Map();
  const onDown = (e) => {
    const action = KEYMAP[e.key];
    if (action) {
      e.preventDefault();
      if (action.startsWith('nudge')) { if (!e.repeat) pending[action] = true; } else held[action] = true;
      return;
    }
    const fn = shortcuts.get(e.key);
    if (fn) { e.preventDefault(); fn(); }
  };
  const onUp = (e) => {
    const action = KEYMAP[e.key];
    if (action && !action.startsWith('nudge')) held[action] = false;
  };
  const onBlur = () => { held.left = false; held.right = false; held.plunger = false; };
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);
  return {
    frame() {
      const snapshot = { ...held, ...pending };
      pending.nudgeLeft = false;
      pending.nudgeRight = false;
      return snapshot;
    },
    onKey(key, fn) { shortcuts.set(key, fn); },
    detach() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
```

- [ ] **Step 3: Write the stylesheet**

`src/xp/games/pinball/pinball.css`:

```css
.pb { display: flex; flex-direction: column; flex: 1; min-height: 0; background: #0b0714; color: #cfe6ff; outline: none; }
.pb-main { flex: 1; display: flex; min-height: 0; }
.pb-table { flex: 1; min-width: 0; display: grid; place-items: center; background: #05030c; overflow: hidden; }
.pb-table canvas { display: block; box-shadow: 0 0 24px rgba(62,233,255,.25); }
.pb-panel { width: 220px; flex: none; padding: 14px; display: flex; flex-direction: column; gap: 12px; background: linear-gradient(#150b2a, #0b0714); border-left: 1px solid rgba(62,233,255,.3); font: 12px Tahoma, Verdana, sans-serif; }
.pb-panel h2 { margin: 0; font: bold 22px "Trebuchet MS", Tahoma, sans-serif; color: #ff2bd6; text-shadow: 0 0 12px rgba(255,43,214,.7); letter-spacing: 1px; }
.pb-stat { display: flex; justify-content: space-between; align-items: baseline; padding: 6px 8px; border: 1px solid rgba(62,233,255,.3); border-radius: 4px; background: rgba(0,0,0,.35); }
.pb-stat b { color: #fff; font-variant-numeric: tabular-nums; }
.pb-score b { font-size: 20px; color: #3ee9ff; text-shadow: 0 0 10px rgba(62,233,255,.6); }
.pb-letters { display: flex; justify-content: space-between; }
.pb-letter { width: 24px; height: 24px; display: grid; place-items: center; border: 1px solid rgba(255,214,0,.35); border-radius: 3px; color: rgba(255,255,255,.35); font-weight: bold; }
.pb-letter.lit { background: rgba(255,214,0,.85); color: #000; box-shadow: 0 0 10px rgba(255,214,0,.8); }
.pb-mission { min-height: 34px; color: #ffd6f6; line-height: 1.4; }
.pb-keys { margin-top: auto; color: rgba(207,230,255,.75); line-height: 1.8; }
.pb-keys kbd { display: inline-block; min-width: 18px; padding: 0 4px; border: 1px solid rgba(255,255,255,.35); border-radius: 3px; font: 11px monospace; color: #fff; text-align: center; }
```

- [ ] **Step 4: Stage**

```bash
git add src/xp/games/pinball/render.js src/xp/games/pinball/input.js src/xp/games/pinball/pinball.css
```

Suggested commit message: `feat(pinball): neon canvas renderer, key mapping and panel styles`

---
### Task 4: Pinball window

**Files:**
- Create: `src/xp/games/pinball/Pinball.js`, `src/xp/games/pinball/Pinball.test.js`
- Modify: `src/xp/apps/misc.js` (remove the placeholder loop entirely), `src/xp/createDesktop.js` (register)

**Interfaces:**
- Consumes: Tasks 1–3, `attachMenubar`, shell context `{ wm, dialogs, menus, sounds, storage }`.
- Produces: `registerPinball(registry)` (app id `pinball`), `openPinball(ctx, { autoLoop = true }) → win`; the window exposes `win.pinball = { table, advance(seconds), input, newGame(), togglePause() }` for tests.

- [ ] **Step 1: Write the failing UI test**

`src/xp/games/pinball/Pinball.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../../WindowManager.js';
import { createMenus } from '../../Menu.js';
import { openPinball } from './Pinball.js';

describe('Pinball window', () => {
  let ctx, played, mem;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><div id="layer"></div></div>';
    played = [];
    mem = new Map();
    ctx = {
      wm: createWindowManager(document.querySelector('#layer')),
      menus: createMenus(document.querySelector('#screen')),
      dialogs: { message: vi.fn(() => Promise.resolve('No')) },
      sounds: { play: (n) => played.push(n) },
      storage: { get: (k) => mem.get(k) ?? null, set: (k, v) => mem.set(k, v) },
    };
  });
  const open = () => openPinball(ctx, { autoLoop: false });
  const key = (el, type, k) => el.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));

  it('opens with the panel, a resting ball and a single instance', () => {
    const win = open();
    expect(win.el.querySelector('.pb-ball').textContent).toBe('1 / 3');
    expect(win.el.querySelector('.pb-score-value').textContent).toBe('0');
    expect(win.el.querySelectorAll('.pb-letter')).toHaveLength(7);
    expect(win.pinball.table.ball.atRest).toBe(true);
    expect(openPinball(ctx)).toBe(win);
  });

  it('charges with the space bar and launches on release', () => {
    const win = open();
    const body = win.el.querySelector('.pb');
    key(body, 'keydown', ' ');
    win.pinball.advance(0.5);
    expect(win.pinball.table.plunger.charge).toBeCloseTo(0.5, 1);
    key(body, 'keyup', ' ');
    win.pinball.advance(1 / 240);
    expect(win.pinball.table.ball.atRest).toBe(false);
    expect(win.pinball.table.ball.vy).toBeLessThan(-900);
    expect(played).toContain('click');
  });

  it('F2 starts a new game and F3 pauses the simulation', () => {
    const win = open();
    const body = win.el.querySelector('.pb');
    win.pinball.table.score = 4200;
    key(body, 'keydown', 'F2');
    expect(win.pinball.table.score).toBe(0);
    key(body, 'keydown', 'F3');
    win.pinball.advance(0.1);
    expect(win.pinball.table.time).toBe(0);
    expect(win.el.querySelector('.pb-mission').textContent).toContain('Paused');
  });

  it('saves the high score and offers a new game when the last ball drains', () => {
    const win = open();
    const t = win.pinball.table;
    t.score = 777;
    t.ballNumber = 3;
    Object.assign(t.ball, { inLane: false, atRest: false, x: 200, y: 760, vx: 0, vy: 100 });
    win.pinball.advance(1 / 240);
    expect(t.state).toBe('over');
    expect(mem.get('xpcomputer.pinball.high')).toBe('777');
    expect(win.el.querySelector('.pb-high').textContent).toBe('777');
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('Game over');
    expect(played).toContain('drain');
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/games/pinball/Pinball.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement Pinball.js**

`src/xp/games/pinball/Pinball.js`:

```js
import './pinball.css';
import { createTable, stepTable, LETTERS } from './table.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { attachMenubar } from '../../Menu.js';

const HIGH_KEY = 'xpcomputer.pinball.high';
const STEP = 1 / 240;
const SOUND_FOR = { flipper: 'flipper', bumper: 'bumper', slingshot: 'bumper', target: 'target', letter: 'target', bank: 'win', word: 'win', extraBall: 'win', drain: 'drain', launch: 'click', tilt: 'error', nudge: 'menu' };

export function registerPinball(registry) {
  registry.register('pinball', { name: 'Pinball', icon: 'pinball', launch: (ctx) => openPinball(ctx) });
}

export function openPinball(ctx, { autoLoop = true } = {}) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('pinball')[0];
  if (existing) { existing.focus(); return existing; }

  let table = createTable();
  let high = Number(storage.get(HIGH_KEY) ?? 0) || 0;
  let paused = false;
  let raf = 0;
  let last = 0;
  let accumulator = 0;
  let gameOverShown = false;

  const body = document.createElement('div');
  body.className = 'pb';
  body.tabIndex = 0;
  body.innerHTML = `
    <div class="pb-menubar"></div>
    <div class="pb-main">
      <div class="pb-table"><canvas width="400" height="700"></canvas></div>
      <div class="pb-panel">
        <h2>PINBALL</h2>
        <div class="pb-stat pb-score"><span>Score</span><b class="pb-score-value">0</b></div>
        <div class="pb-stat"><span>Ball</span><b class="pb-ball">1 / 3</b></div>
        <div class="pb-stat"><span>High score</span><b class="pb-high">0</b></div>
        <div class="pb-letters">${LETTERS.map((l) => `<span class="pb-letter">${l}</span>`).join('')}</div>
        <div class="pb-mission"></div>
        <div class="pb-keys"><kbd>Z</kbd> <kbd>/</kbd> flippers<br><kbd>Space</kbd> hold to launch<br><kbd>X</kbd> <kbd>.</kbd> nudge<br><kbd>F2</kbd> new game &nbsp; <kbd>F3</kbd> pause</div>
      </div>
    </div>`;
  const canvas = body.querySelector('canvas');
  const tableEl = body.querySelector('.pb-table');
  const renderer = createRenderer(canvas);
  const input = createInput(body);
  const q = (selector) => body.querySelector(selector);

  const win = wm.open({
    appId: 'pinball', title: 'Pinball', icon: 'pinball', width: 760, height: 620, minWidth: 620, minHeight: 500, content: body,
    onClose: () => { cancelAnimationFrame(raf); input.detach(); observer?.disconnect(); },
  });

  function fit() {
    const w = tableEl.clientWidth || 400;
    const h = tableEl.clientHeight || 700;
    renderer.resize(Math.max(0.3, Math.min(w / 400, h / 700)), window.devicePixelRatio || 1);
  }
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  observer?.observe(tableEl);
  fit();

  function updatePanel() {
    q('.pb-score-value').textContent = table.score.toLocaleString();
    q('.pb-ball').textContent = `${Math.min(table.ballNumber, table.ballsTotal)} / ${table.ballsTotal}`;
    q('.pb-high').textContent = high.toLocaleString();
    body.querySelectorAll('.pb-letter').forEach((span, i) => span.classList.toggle('lit', table.letters[i]));
    q('.pb-mission').textContent = table.state === 'over' ? 'Game over. Press F2 to play again.'
      : table.tilt ? 'TILT! Flippers are dead until the ball drains.'
      : paused ? 'Paused (F3 to resume)'
      : table.ball.inLane && table.ball.atRest ? 'Hold Space to charge the plunger, release to launch.'
      : `Spell ${LETTERS.join('')} in the top lanes for 10,000 and an extra ball.`;
  }
  async function onGameOver() {
    if (gameOverShown) return;
    gameOverShown = true;
    const record = table.score > high;
    if (record) { high = table.score; storage.set(HIGH_KEY, String(high)); }
    updatePanel();
    const again = await dialogs.message({ title: 'Pinball', kind: 'question', owner: win, buttons: ['Yes', 'No'], text: `Game over!\nScore: ${table.score.toLocaleString()}${record ? '  (new high score!)' : ''}\n\nPlay again?` });
    if (again === 'Yes') newGame();
  }
  function handleEvents(events) {
    for (const e of events) {
      const cue = SOUND_FOR[e.type];
      if (cue) sounds.play(cue);
      if (e.type === 'gameOver') onGameOver();
    }
  }
  /** Advance the simulation by `seconds` in fixed 1/240 s steps. Nudges apply to the first step only. */
  function advance(seconds) {
    const frameInput = input.frame();
    if (paused || table.state === 'over') return;
    accumulator += seconds;
    let first = true;
    while (accumulator >= STEP - 1e-12) {
      handleEvents(stepTable(table, STEP, first ? frameInput : { ...frameInput, nudgeLeft: false, nudgeRight: false }));
      accumulator -= STEP;
      first = false;
    }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    advance(dt);
    renderer.draw(table);
    updatePanel();
  }
  function newGame() {
    table = createTable();
    gameOverShown = false;
    paused = false;
    accumulator = 0;
    renderer.clearTrail();
    updatePanel();
  }
  function togglePause() {
    if (table.state === 'over') return;
    paused = !paused;
    updatePanel();
  }

  input.onKey('F2', newGame);
  input.onKey('F3', togglePause);
  wm.on('minimize', (w) => { if (w === win && !paused && table.state !== 'over') togglePause(); });
  body.addEventListener('pointerdown', () => body.focus({ preventScroll: true }));
  attachMenubar(q('.pb-menubar'), menus, {
    Game: () => [
      { label: 'New Game', shortcut: 'F2', action: newGame },
      { label: paused ? 'Resume' : 'Pause', shortcut: 'F3', action: togglePause },
      { separator: true },
      { label: 'Reset High Score', action: () => { high = 0; storage.set(HIGH_KEY, '0'); updatePanel(); } },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Help: [{ label: 'About Pinball', action: () => dialogs.message({ title: 'About Pinball', owner: win, text: 'An original table in plain JavaScript: circle-vs-segment physics at 240 steps per second, flippers with real angular velocity, and an S-T-E-P-H-E-N lane bonus.\n\nZ and / flip, hold Space to launch, X and . nudge (three quick nudges tilt), F2 new game, F3 pause.' }) }],
  });

  updatePanel();
  renderer.draw(table);
  if (autoLoop && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  setTimeout(() => body.focus({ preventScroll: true }), 0);
  win.pinball = { get table() { return table; }, advance, input, newGame, togglePause };
  return win;
}
```

- [ ] **Step 4: Register the app and remove the placeholder loop**

In `src/xp/apps/misc.js`, delete the whole `for (const [id, name] of [...])` placeholder block (all three games are now real).

In `src/xp/createDesktop.js`:

```js
import { registerPinball } from './games/pinball/Pinball.js';
// … after registerSolitaire(registry):
  registerPinball(registry);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/xp/games/pinball` then `npm test`.
Expected: Pinball UI 4 tests pass; whole suite green.

- [ ] **Step 6: Verify by hand and tune the feel**

Run: `npm run dev -- --open` with `?mode=flat`. Start → Pinball.

1. Table fits the window with the panel on the right; resizing rescales it.
2. Hold Space: charge bar rises; release launches the ball up the lane, around the arc, into play. A weak launch falls back and can be relaunched.
3. Z and / flip; hits send the ball up hard; the ball never tunnels through walls or flippers at full speed (if it does, halve `STEP` in `Pinball.js`).
4. Bumpers flash and kick, slingshots kick, drop targets fall and the bank resets with 5,000; passing a top lane lights its letter; all seven give 10,000 and one extra ball (ball counter shows `/ 4`).
5. X and . nudge; three fast nudges show TILT and kill the flippers until drain.
6. Draining three times ends the game, saves the high score and offers a new game; F2 restarts; F3 pauses; minimizing pauses.
7. Sounds: flipper, bumper, target, drain, fanfare on word; mute silences.
8. Feel: if the ball drains too easily between the flippers, shorten the gap by moving the guides' end points in `table.js` (`seg(20, 540, 124, 636)` / `seg(352, 540, 276, 636)`) closer to the pivots; if gravity feels floaty, raise `GRAVITY` to 1100.

- [ ] **Step 7: Stage**

```bash
git add src/xp/games/pinball src/xp/apps/misc.js src/xp/createDesktop.js
```

Suggested commit message: `feat(pinball): playable original pinball window with panel, pause and high score`

---

### Task 5: README and QA

- [ ] **Step 1: Document**

In `README.md` under `## Controls` add:

```markdown
- Pinball: Z and / flippers, hold Space to launch, X and . nudge (three quick nudges tilt), F2 new game, F3 pause. High score is stored in the browser.
```

Under `## Manual QA checklist` add:

```markdown
- [ ] Pinball: launch, flippers, bumpers, targets/bank, letters/extra ball, tilt, three-ball game over with high score, pause on minimize
```

Mark roadmap item 5 done.

- [ ] **Step 2: Verify and hand back**

Run `npm test` and `npm run build`; walk the Pinball QA line in flat mode and on the CRT in room mode (check the frame rate stays smooth with the 3D room rendering behind it; if not, lower bloom strength or suggest Low FX).

```bash
git add README.md
git status --short
```

Ask whether to commit (suggested: `docs: Pinball controls and QA`).
