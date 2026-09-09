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
