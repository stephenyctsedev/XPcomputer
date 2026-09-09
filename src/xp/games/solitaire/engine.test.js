import { describe, it, expect } from 'vitest';
import { createGame, fromState, card, canStackOnTableau, canPlaceOnFoundation, mulberry32, createDeck, shuffle } from './engine.js';

describe('deal', () => {
  it('deals 7 columns of 1..7 with only the last card face up and 24 in stock', () => {
    const g = createGame({ random: mulberry32(7) });
    g.tableau.forEach((col, i) => {
      expect(col).toHaveLength(i + 1);
      col.forEach((c, k) => expect(c.faceUp).toBe(k === i));
    });
    expect(g.stock).toHaveLength(24);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
    expect(new Set([...g.stock, ...g.tableau.flat()].map((c) => c.id)).size).toBe(52);
  });
  it('shuffles deterministically with a seed', () => {
    const a = shuffle(createDeck(), mulberry32(42)).map((c) => c.id);
    const b = shuffle(createDeck(), mulberry32(42)).map((c) => c.id);
    expect(a).toEqual(b);
    expect(a).not.toEqual(createDeck().map((c) => c.id));
  });
});

describe('rules', () => {
  it('tableau: kings on empty, alternating colours descending, never on face-down', () => {
    expect(canStackOnTableau(card('S13'), [])).toBe(true);
    expect(canStackOnTableau(card('S12'), [])).toBe(false);
    expect(canStackOnTableau(card('S12'), [card('H13')])).toBe(true);
    expect(canStackOnTableau(card('S12'), [card('C13')])).toBe(false);
    expect(canStackOnTableau(card('S11'), [card('H13')])).toBe(false);
    expect(canStackOnTableau(card('S12'), [card('H13', false)])).toBe(false);
  });
  it('foundation: aces on empty, then same suit ascending', () => {
    expect(canPlaceOnFoundation(card('H1'), [])).toBe(true);
    expect(canPlaceOnFoundation(card('H2'), [])).toBe(false);
    expect(canPlaceOnFoundation(card('H2'), [card('H1')])).toBe(true);
    expect(canPlaceOnFoundation(card('S2'), [card('H1')])).toBe(false);
    expect(canPlaceOnFoundation(card('H3'), [card('H1')])).toBe(false);
  });
});

describe('moves', () => {
  it('moves a face-up run between columns and flips the exposed card', () => {
    const g = fromState({ tableau: [[card('D9', false), 'C8', 'H7'], ['H9'], [], [], [], [], []] });
    const rec = g.moveStack({ type: 'tableau', col: 0, index: 1 }, { type: 'tableau', col: 1 });
    expect(rec).toEqual({ kind: 'tableauToTableau', count: 2, flipped: true });
    expect(g.tableau[1].map((c) => c.id)).toEqual(['H9', 'C8', 'H7']);
    expect(g.tableau[0]).toHaveLength(1);
    expect(g.tableau[0][0].faceUp).toBe(true);
    expect(g.moves).toBe(1);
  });
  it('refuses illegal moves, runs that include face-down cards, and same-column moves', () => {
    const g = fromState({ tableau: [[card('D9', false), 'C8'], ['S9'], ['H10'], [], [], [], []] });
    expect(g.moveStack({ type: 'tableau', col: 0, index: 0 }, { type: 'tableau', col: 1 })).toBeNull();
    expect(g.moveStack({ type: 'tableau', col: 0, index: 1 }, { type: 'tableau', col: 2 })).toBeNull();
    expect(g.moveStack({ type: 'tableau', col: 0, index: 1 }, { type: 'tableau', col: 0 })).toBeNull();
    expect(g.moveStack({ type: 'tableau', col: 1, index: 0 }, { type: 'tableau', col: 3 })).toBeNull();
    expect(g.moves).toBe(0);
  });
  it('moves waste and tableau cards to foundations, and foundation cards back', () => {
    const g = fromState({ waste: ['S1'], tableau: [['S2'], ['H3'], [], [], [], [], []], foundations: [[], ['H1', 'H2'], [], []] });
    expect(g.moveStack({ type: 'waste' }, { type: 'foundation', index: 0 })).toEqual({ kind: 'wasteToFoundation', count: 1, flipped: false });
    expect(g.moveStack({ type: 'tableau', col: 0, index: 0 }, { type: 'foundation', index: 0 })).toEqual({ kind: 'tableauToFoundation', count: 1, flipped: false });
    expect(g.moveStack({ type: 'tableau', col: 1, index: 0 }, { type: 'foundation', index: 1 })).toEqual({ kind: 'tableauToFoundation', count: 1, flipped: false });
    expect(g.moveStack({ type: 'foundation', index: 1 }, { type: 'tableau', col: 2 })).toBeNull();
    g.tableau[2].push(card('S4'));
    expect(g.moveStack({ type: 'foundation', index: 1 }, { type: 'tableau', col: 2 })).toEqual({ kind: 'foundationToTableau', count: 1, flipped: false });
    expect(g.foundations[1].map((c) => c.id)).toEqual(['H1', 'H2']);
  });
  it('autoToFoundation finds the right pile', () => {
    const g = fromState({ waste: ['D1'], tableau: [['C2'], [], [], [], [], [], []], foundations: [['C1'], [], [], []] });
    expect(g.autoToFoundation({ type: 'waste' }).kind).toBe('wasteToFoundation');
    expect(g.foundations[1].map((c) => c.id)).toEqual(['D1']);
    expect(g.autoToFoundation({ type: 'tableau', col: 0, index: 0 }).kind).toBe('tableauToFoundation');
    expect(g.foundations[0].map((c) => c.id)).toEqual(['C1', 'C2']);
    expect(g.autoToFoundation({ type: 'tableau', col: 1, index: 0 })).toBeNull();
  });
  it('rejects foundation-to-foundation moves', () => {
    const g = fromState({ foundations: [['H1'], [], [], []], tableau: [[], [], [], [], [], [], []] });
    expect(g.moveStack({ type: 'foundation', index: 0 }, { type: 'foundation', index: 1 })).toBeNull();
  });
});

describe('stock and waste', () => {
  it('draws three keeping the third card on top, then recycles in order', () => {
    const g = fromState({ draw: 3, stock: ['S1', 'S2', 'S3', 'S4'] });
    expect(g.drawFromStock()).toEqual({ kind: 'draw', count: 3 });
    expect(g.waste.map((c) => c.id)).toEqual(['S4', 'S3', 'S2']);
    expect(g.waste.every((c) => c.faceUp)).toBe(true);
    expect(g.drawFromStock()).toEqual({ kind: 'draw', count: 1 });
    expect(g.waste.map((c) => c.id)).toEqual(['S4', 'S3', 'S2', 'S1']);
    expect(g.drawFromStock()).toEqual({ kind: 'recycle', passes: 1 });
    expect(g.stock.map((c) => c.id)).toEqual(['S1', 'S2', 'S3', 'S4']);
    expect(g.stock.every((c) => !c.faceUp)).toBe(true);
    expect(g.waste).toEqual([]);
    expect(fromState({}).drawFromStock()).toBeNull();
  });
  it('draw one takes a single card', () => {
    const g = fromState({ draw: 1, stock: ['S1', 'S2'] });
    g.drawFromStock();
    expect(g.waste.map((c) => c.id)).toEqual(['S2']);
  });
});

describe('undo, win, locate', () => {
  it('undoes exactly one move', () => {
    const g = fromState({ draw: 1, stock: ['S1'], tableau: [['H13'], [], [], [], [], [], []] });
    expect(g.undo()).toBe(false);
    g.drawFromStock();
    expect(g.waste).toHaveLength(1);
    expect(g.undo()).toBe(true);
    expect(g.waste).toHaveLength(0);
    expect(g.stock).toHaveLength(1);
    expect(g.undo()).toBe(false);
  });
  it('detects the win when the last card reaches a foundation', () => {
    const full = (suit) => Array.from({ length: 13 }, (_, i) => `${suit}${i + 1}`);
    const g = fromState({ waste: ['C13'], foundations: [full('S'), full('H'), full('D'), full('C').slice(0, 12)] });
    expect(g.state).toBe('playing');
    g.moveStack({ type: 'waste' }, { type: 'foundation', index: 3 });
    expect(g.state).toBe('won');
    expect(g.isWon()).toBe(true);
    expect(g.drawFromStock()).toBeNull();
  });
  it('locates cards by id and peeks movable runs', () => {
    const g = fromState({ stock: ['S1'], waste: ['S2'], foundations: [['H1'], [], [], []], tableau: [[card('C5', false), 'D4', 'S3'], [], [], [], [], [], []] });
    expect(g.locate('S3')).toEqual({ type: 'tableau', col: 0, index: 2 });
    expect(g.locate('H1')).toEqual({ type: 'foundation', index: 0 });
    expect(g.locate('S2')).toEqual({ type: 'waste' });
    expect(g.locate('S1')).toEqual({ type: 'stock' });
    expect(g.locate('X0')).toBeNull();
    expect(g.peek({ type: 'tableau', col: 0, index: 1 }).map((c) => c.id)).toEqual(['D4', 'S3']);
    expect(g.peek({ type: 'tableau', col: 0, index: 0 })).toEqual([]);
    expect(g.peek({ type: 'stock' })).toEqual([]);
  });
});
