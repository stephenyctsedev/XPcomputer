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
