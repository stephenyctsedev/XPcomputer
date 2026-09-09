import { describe, it, expect } from 'vitest';
import { scoreDelta, applyScore, winBonus, TIME_PENALTY_STEP } from './scoring.js';

describe('scoreDelta', () => {
  it('scores the Windows Standard moves', () => {
    expect(scoreDelta({ kind: 'wasteToTableau', count: 1, flipped: false })).toBe(5);
    expect(scoreDelta({ kind: 'wasteToFoundation', count: 1, flipped: false })).toBe(10);
    expect(scoreDelta({ kind: 'tableauToFoundation', count: 1, flipped: false })).toBe(10);
    expect(scoreDelta({ kind: 'tableauToFoundation', count: 1, flipped: true })).toBe(15);
    expect(scoreDelta({ kind: 'tableauToTableau', count: 3, flipped: true })).toBe(5);
    expect(scoreDelta({ kind: 'tableauToTableau', count: 3, flipped: false })).toBe(0);
    expect(scoreDelta({ kind: 'foundationToTableau', count: 1, flipped: false })).toBe(-15);
    expect(scoreDelta({ kind: 'draw', count: 3 })).toBe(0);
    expect(scoreDelta(null)).toBe(0);
  });
  it('penalises recycling after the first pass in draw one and after the fourth in draw three', () => {
    expect(scoreDelta({ kind: 'recycle', passes: 1 }, { draw: 1 })).toBe(-100);
    expect(scoreDelta({ kind: 'recycle', passes: 2 }, { draw: 1 })).toBe(-100);
    expect(scoreDelta({ kind: 'recycle', passes: 3 }, { draw: 3 })).toBe(0);
    expect(scoreDelta({ kind: 'recycle', passes: 4 }, { draw: 3 })).toBe(-20);
    expect(scoreDelta({ kind: 'recycle', passes: 9 }, { draw: 3 })).toBe(-20);
  });
});

describe('applyScore, time and bonus', () => {
  it('never goes below zero', () => {
    expect(applyScore(5, -15)).toBe(0);
    expect(applyScore(5, 10)).toBe(15);
  });
  it('takes 2 points every 10 seconds and awards 700000/seconds after 30 s', () => {
    expect(TIME_PENALTY_STEP).toBe(-2);
    expect(winBonus(30)).toBe(0);
    expect(winBonus(31)).toBe(22581);
    expect(winBonus(120)).toBe(5833);
  });
});
