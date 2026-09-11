import { describe, it, expect } from 'vitest';
import { createTable, stepTable, STEP, TABLE, NO_INPUT } from './table.js';

/** Regions the ball can never legitimately occupy, so a sweep must not start a ball inside one. */
const SOLID = [
  (x, y) => x > 20 && x < 60 && y > 280 && y < 365,                          // drop-target bank body
  (x, y) => y > 470 && y < 530 && x > 60 && x < 60 + 45 * (y - 470) / 60,    // left slingshot body
  (x, y) => y > 470 && y < 530 && x < 312 && x > 312 - 45 * (y - 470) / 60,  // right slingshot body
];
const inSolid = (x, y) => SOLID.some((f) => f(x, y));

/** Release a ball in play and report where it ends up. 'drain' means it left the table. */
function release(x, y, vx, seconds = 12) {
  const t = createTable();
  Object.assign(t.ball, { x, y, vx, vy: 0, inLane: false, atRest: false });
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (stepTable(t, STEP, NO_INPUT).some((e) => e.type === 'drain')) return 'drain';
  }
  return `stuck at (${t.ball.x.toFixed(0)}, ${t.ball.y.toFixed(0)})`;
}

describe('the table has no ball traps', () => {
  it('drains every ball released across the playfield within 12 seconds', () => {
    const stuck = [];
    let released = 0;
    for (let i = 0; i < 27; i++) {
      const x = 32 + i * 12;
      for (const y of [260, 360, 460]) {
        if (inSolid(x, y)) continue;
        for (const vx of [-300, 0, 300]) {
          released++;
          const outcome = release(x, y, vx);
          if (outcome !== 'drain') stuck.push(`(${x}, ${y}) vx=${vx} -> ${outcome}`);
        }
      }
    }
    expect(released).toBeGreaterThan(200);
    expect(stuck).toEqual([]);
  });

  it('leaves a clear gap between the flipper tips of 1.5 to 2.5 ball diameters', () => {
    const t = createTable();
    const tip = (f) => ({ x: f.px + Math.cos(f.angle) * f.length, y: f.py + Math.sin(f.angle) * f.length });
    const left = tip(t.left);
    const right = tip(t.right);
    const clear = Math.hypot(right.x - left.x, right.y - left.y) - t.left.r - t.right.r;
    expect(clear).toBeGreaterThanOrEqual(TABLE.ballRadius * 3);
    expect(clear).toBeLessThanOrEqual(TABLE.ballRadius * 5);
  });

  it('gives both outlanes room for the ball between the wall and the slingshot', () => {
    const t = createTable();
    const bodies = t.walls
      .filter((w) => w.ax === w.bx && w.ay === 470 && w.by === 530)
      .sort((a, b) => a.ax - b.ax);
    expect(bodies).toHaveLength(2);
    expect(bodies[0].ax - 20).toBeGreaterThanOrEqual(TABLE.ballRadius * 4);   // left wall sits at x=20
    expect(352 - bodies[1].ax).toBeGreaterThanOrEqual(TABLE.ballRadius * 4);  // right playfield wall at x=352
  });
});
