import { describe, it, expect } from 'vitest';
import { card } from './engine.js';
import { cardFaceSvg, cardBackSvg, BACKS, rankLabel } from './cards.js';

describe('card art', () => {
  it('labels ranks like a real deck', () => {
    expect([1, 2, 10, 11, 12, 13].map(rankLabel)).toEqual(['A', '2', '10', 'J', 'Q', 'K']);
  });
  it('draws red suits red, with corner indices and the right number of pips', () => {
    const queen = cardFaceSvg(card('H12'));
    expect(queen).toContain('♥');
    expect(queen).toContain('>Q<');
    expect(queen).toContain('#c8102e');
    const five = cardFaceSvg(card('S5'));
    expect((five.match(/class="pip"/g) || []).length).toBe(5);
    expect(five).toContain('#111');
    const ten = cardFaceSvg(card('D10'));
    expect((ten.match(/class="pip"/g) || []).length).toBe(10);
    expect(cardFaceSvg(card('C1'))).toContain('font-size="40"');
  });
  it('offers six distinct backs', () => {
    expect(BACKS).toHaveLength(6);
    expect(new Set(BACKS.map((b) => b.svg)).size).toBe(6);
    expect(cardBackSvg(7)).toBe(BACKS[1].svg);
    for (const b of BACKS) expect(b.svg.startsWith('<svg')).toBe(true);
  });
});
