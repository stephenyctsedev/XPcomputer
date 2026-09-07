# XP Computer Portfolio — Phase 4 Implementation Plan (Solitaire)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Solitaire placeholder with a complete Klondike: draw one or three, Windows Standard scoring with timer, drag-and-drop of runs, double-click to foundations, one-level undo, selectable card backs, and the bouncing-card win animation.

**Architecture:** A pure engine (`engine.js`: deck, deal, rules, moves, stock/waste, undo, win) and a pure scoring module (`scoring.js`) are unit tested exhaustively. `cards.js` renders our own SVG card faces and backs. `Solitaire.js` is the DOM window: it re-renders the whole table from engine state after every move, handles pointer drag/drop by moving card elements into a drag layer and reading the drop zone under the pointer on release, and owns the timer, options and dialogs. `winAnimation.js` draws the bouncing cards on a canvas overlay. Registers as app id `sol`.

**Tech Stack:** Plain JavaScript, Vitest + jsdom, XP.css chrome, canvas 2D for the win animation.

**Spec:** `docs/superpowers/specs/2026-09-07-xp-computer-portfolio-design.md` §7 intro and §7.2. Depends on Phase 1 (registry, window manager incl. `win.resize` from Phase 3 Task 2, menus, dialogs, sounds, storage).

## Global Constraints

- Engine and scoring modules have no DOM access.
- Klondike rules: tableau descending, alternating colours, only Kings to empty columns; foundations ascending by suit from Ace; only face-up runs move; one card at a time to a foundation.
- Standard scoring (Windows): waste→tableau +5, waste→foundation +10, tableau→foundation +10, turning a tableau card +5, foundation→tableau −15; recycling the waste −100 per pass after the first in draw-one, −20 per pass after the fourth in draw-three; timed game −2 every 10 s; win bonus `round(700000 / seconds)` when the game took more than 30 s; the score never drops below 0.
- Undo is one level (the last move), like Windows XP.
- Own card art: SVG faces and six CSS/SVG backs. Card size 71×96 CSS px.
- `prefers-reduced-motion`: the win animation is replaced by a plain dialog.
- Options and deck choice persist under `localStorage` key `xpcomputer.sol.options` via the shell `storage`.
- Single instance: launching `sol` while open focuses the existing window.
- Files are UTF-8. **Never `git commit` or `git push` unless Stephen says so**; "Stage" steps run `git add` only.

---

## File Structure (Phase 4)

| File | Responsibility |
|---|---|
| `src/xp/games/solitaire/engine.js` (+ test) | Deck, seeded shuffle, deal, rules, moves, stock/waste, undo, win, locate |
| `src/xp/games/solitaire/scoring.js` (+ test) | Standard scoring deltas, time penalty, win bonus |
| `src/xp/games/solitaire/cards.js` (+ test) | SVG card faces (pips, face cards) and six backs |
| `src/xp/games/solitaire/Solitaire.js` (+ test) | Window, table rendering, drag/drop, menus, dialogs, timer, score |
| `src/xp/games/solitaire/winAnimation.js` | Canvas bouncing cards |
| `src/xp/games/solitaire/solitaire.css` | Felt, card placement, drag layer, dialogs |
| `src/xp/apps/misc.js`, `src/xp/createDesktop.js` | Swap placeholder for the real app |
| `README.md` | Controls and QA items |

---

### Task 1: Klondike engine

**Files:**
- Create: `src/xp/games/solitaire/engine.js`, `src/xp/games/solitaire/engine.test.js`

**Interfaces:**
- Produces: `SUITS = ['S','H','D','C']`, `isRed(suit)`, `card(id, faceUp = true) → { id, suit, rank, faceUp }` (id like `'H12'`), `createDeck()`, `shuffle(cards, random)`, `mulberry32(seed) → random fn`, `canStackOnTableau(card, column)`, `canPlaceOnFoundation(card, pile)`.
- Produces: `createGame({ draw = 1, random }) → game` and `fromState({ draw, stock, waste, foundations, tableau, passes, moves }) → game` (piles may hold ids or card objects; ids are face up except in `stock`).
- `game = { draw, stock, waste, foundations[4], tableau[7], passes, moves, state: 'playing'|'won', peek(loc) → cards, locate(id) → loc|null, moveStack(source, target) → record|null, drawFromStock() → record|null, autoToFoundation(source) → record|null, undo() → boolean, isWon() }`.
- Locations: `{ type: 'tableau', col, index }`, `{ type: 'waste' }`, `{ type: 'foundation', index }`, `{ type: 'stock' }`. Records: `{ kind: 'tableauToTableau'|'wasteToTableau'|'wasteToFoundation'|'tableauToFoundation'|'foundationToTableau', count, flipped }`, `{ kind: 'draw', count }`, `{ kind: 'recycle', passes }`.
- Pile orientation: the last array element is the top card. `stock` top is drawn first; in draw-three the third card drawn ends on top of the waste.

- [ ] **Step 1: Write the failing tests**

`src/xp/games/solitaire/engine.test.js`:

```js
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
    const g = fromState({ tableau: [[card('D9', false), 'C8', 'H7'], ['S9'], [], [], [], [], []] });
    const rec = g.moveStack({ type: 'tableau', col: 0, index: 1 }, { type: 'tableau', col: 1 });
    expect(rec).toEqual({ kind: 'tableauToTableau', count: 2, flipped: true });
    expect(g.tableau[1].map((c) => c.id)).toEqual(['S9', 'C8', 'H7']);
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
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/xp/games/solitaire/engine.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement engine.js**

`src/xp/games/solitaire/engine.js`:

```js
// Klondike rules. Pure: no DOM, no timers. The last element of every pile is its top card.
export const SUITS = ['S', 'H', 'D', 'C'];
export const isRed = (suit) => suit === 'H' || suit === 'D';

export function card(id, faceUp = true) {
  return { id, suit: id[0], rank: Number(id.slice(1)), faceUp };
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push(card(`${suit}${rank}`, false));
  return deck;
}

export function shuffle(cards, random = Math.random) {
  const out = cards.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Small seeded PRNG so tests and "game numbers" are reproducible. */
export function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function canStackOnTableau(c, column) {
  if (column.length === 0) return c.rank === 13;
  const top = column[column.length - 1];
  return top.faceUp && isRed(top.suit) !== isRed(c.suit) && top.rank === c.rank + 1;
}

export function canPlaceOnFoundation(c, pile) {
  if (pile.length === 0) return c.rank === 1;
  const top = pile[pile.length - 1];
  return top.suit === c.suit && top.rank === c.rank - 1;
}

const clone = (value) => JSON.parse(JSON.stringify(value));
const capitalize = (s) => s[0].toUpperCase() + s.slice(1);

export function createGame({ draw = 1, random = Math.random } = {}) {
  const deck = shuffle(createDeck(), random);
  const tableau = Array.from({ length: 7 }, () => []);
  let k = 0;
  for (let col = 0; col < 7; col++) {
    for (let n = 0; n <= col; n++) {
      const c = deck[k++];
      c.faceUp = n === col;
      tableau[col].push(c);
    }
  }
  return fromState({ draw, stock: deck.slice(k), waste: [], foundations: [[], [], [], []], tableau });
}

/** Build a game from explicit piles. Entries may be ids ('H12') or card objects; ids are face up except in stock. */
export function fromState({ draw = 1, stock = [], waste = [], foundations = [[], [], [], []], tableau = [[], [], [], [], [], [], []], passes = 0, moves = 0 } = {}) {
  const norm = (list, faceUp) => list.map((c) => (typeof c === 'string' ? card(c, faceUp) : { ...c }));
  const game = {
    draw, passes, moves, state: 'playing', snapshot: null,
    stock: norm(stock, false),
    waste: norm(waste, true),
    foundations: foundations.map((pile) => norm(pile, true)),
    tableau: tableau.map((col) => norm(col, true)),
  };
  const pileOf = (loc) => {
    if (loc.type === 'waste') return game.waste;
    if (loc.type === 'foundation') return game.foundations[loc.index];
    if (loc.type === 'tableau') return game.tableau[loc.col];
    return game.stock;
  };
  const isWon = () => game.foundations.reduce((n, pile) => n + pile.length, 0) === 52;
  const takeSnapshot = () => {
    game.snapshot = clone({ stock: game.stock, waste: game.waste, foundations: game.foundations, tableau: game.tableau, passes: game.passes, moves: game.moves });
  };

  function peek(loc) {
    if (!loc) return [];
    if (loc.type === 'tableau') {
      const run = game.tableau[loc.col].slice(loc.index);
      return run.length && run.every((c) => c.faceUp) ? run : [];
    }
    if (loc.type === 'waste' || loc.type === 'foundation') {
      const pile = pileOf(loc);
      return pile.length ? [pile[pile.length - 1]] : [];
    }
    return [];
  }

  function locate(id) {
    for (let col = 0; col < 7; col++) {
      const index = game.tableau[col].findIndex((c) => c.id === id);
      if (index >= 0) return { type: 'tableau', col, index };
    }
    for (let index = 0; index < 4; index++) if (game.foundations[index].some((c) => c.id === id)) return { type: 'foundation', index };
    if (game.waste.some((c) => c.id === id)) return { type: 'waste' };
    if (game.stock.some((c) => c.id === id)) return { type: 'stock' };
    return null;
  }

  function moveStack(source, target) {
    if (game.state !== 'playing' || !source || !target) return null;
    const cards = peek(source);
    if (!cards.length) return null;
    if (target.type === 'foundation') {
      if (cards.length !== 1 || !canPlaceOnFoundation(cards[0], game.foundations[target.index])) return null;
    } else if (target.type === 'tableau') {
      if (source.type === 'tableau' && source.col === target.col) return null;
      if (!canStackOnTableau(cards[0], game.tableau[target.col])) return null;
    } else {
      return null;
    }
    takeSnapshot();
    const from = pileOf(source);
    from.splice(from.length - cards.length, cards.length);
    pileOf(target).push(...cards);
    let flipped = false;
    if (source.type === 'tableau') {
      const exposed = from[from.length - 1];
      if (exposed && !exposed.faceUp) { exposed.faceUp = true; flipped = true; }
    }
    game.moves++;
    if (isWon()) game.state = 'won';
    return { kind: `${source.type}To${capitalize(target.type)}`, count: cards.length, flipped };
  }

  function drawFromStock() {
    if (game.state !== 'playing') return null;
    if (game.stock.length === 0) {
      if (game.waste.length === 0) return null;
      takeSnapshot();
      game.stock = game.waste.slice().reverse().map((c) => ({ ...c, faceUp: false }));
      game.waste = [];
      game.passes++;
      return { kind: 'recycle', passes: game.passes };
    }
    takeSnapshot();
    const n = Math.min(game.draw, game.stock.length);
    const drawn = game.stock.splice(game.stock.length - n, n).reverse();
    for (const c of drawn) { c.faceUp = true; game.waste.push(c); }
    return { kind: 'draw', count: n };
  }

  function autoToFoundation(source) {
    const cards = peek(source);
    if (cards.length !== 1) return null;
    const index = game.foundations.findIndex((pile) => canPlaceOnFoundation(cards[0], pile));
    return index < 0 ? null : moveStack(source, { type: 'foundation', index });
  }

  function undo() {
    if (!game.snapshot) return false;
    Object.assign(game, clone(game.snapshot));
    game.snapshot = null;
    game.state = 'playing';
    return true;
  }

  return Object.assign(game, { peek, locate, moveStack, drawFromStock, autoToFoundation, undo, isWon });
}
```

- [ ] **Step 4: Run them to verify they pass**

Run: `npx vitest run src/xp/games/solitaire/engine.test.js`
Expected: PASS, 11 tests.

- [ ] **Step 5: Stage**

```bash
git add src/xp/games/solitaire/engine.js src/xp/games/solitaire/engine.test.js
```

Suggested commit message: `feat(solitaire): Klondike engine with deal, rules, stock/waste, undo and win detection`

---
### Task 2: Standard scoring

**Files:**
- Create: `src/xp/games/solitaire/scoring.js`, `src/xp/games/solitaire/scoring.test.js`

**Interfaces:**
- Produces: `scoreDelta(record, { draw }) → number` for engine records; `applyScore(score, delta) → number` (floors at 0); `timePenaltyStep = -2` applied by the UI every 10 s; `winBonus(seconds) → number`.

- [ ] **Step 1: Write the failing tests**

`src/xp/games/solitaire/scoring.test.js`:

```js
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
    expect(winBonus(31)).toBe(Math.round(700000 / 31));
    expect(winBonus(120)).toBe(5833);
  });
});
```

- [ ] **Step 2: Run it to verify it fails, then implement scoring.js**

Run: `npx vitest run src/xp/games/solitaire/scoring.test.js` → FAIL (module missing).

`src/xp/games/solitaire/scoring.js`:

```js
// Windows "Standard" Klondike scoring. Pure.
const MOVE_POINTS = { wasteToTableau: 5, wasteToFoundation: 10, tableauToFoundation: 10, tableauToTableau: 0, foundationToTableau: -15, draw: 0 };
const FLIP_POINTS = 5;
export const TIME_PENALTY_STEP = -2;   // every 10 seconds in a timed game

export function scoreDelta(record, { draw = 1 } = {}) {
  if (!record) return 0;
  if (record.kind === 'recycle') {
    if (draw === 1) return record.passes >= 1 ? -100 : 0;
    return record.passes >= 4 ? -20 : 0;
  }
  return (MOVE_POINTS[record.kind] ?? 0) + (record.flipped ? FLIP_POINTS : 0);
}

export const applyScore = (score, delta) => Math.max(0, score + delta);

export const winBonus = (seconds) => (seconds > 30 ? Math.round(700000 / seconds) : 0);
```

Run: `npx vitest run src/xp/games/solitaire/scoring.test.js` → PASS, 4 tests.

- [ ] **Step 3: Stage**

```bash
git add src/xp/games/solitaire/scoring.js src/xp/games/solitaire/scoring.test.js
```

Suggested commit message: `feat(solitaire): Windows Standard scoring rules`

---

### Task 3: Card artwork

**Files:**
- Create: `src/xp/games/solitaire/cards.js`, `src/xp/games/solitaire/cards.test.js`

**Interfaces:**
- Produces: `CARD_W = 71`, `CARD_H = 96`, `SUIT_GLYPH`, `rankLabel(rank)`, `cardFaceSvg(card) → string`, `BACKS = [{ name, svg }] × 6`, `cardBackSvg(index) → string`.

- [ ] **Step 1: Write the failing test**

`src/xp/games/solitaire/cards.test.js`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails, then implement cards.js**

Run: `npx vitest run src/xp/games/solitaire/cards.test.js` → FAIL (module missing).

`src/xp/games/solitaire/cards.js`:

```js
import { isRed } from './engine.js';

export const CARD_W = 71;
export const CARD_H = 96;
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED = '#c8102e';
const BLACK = '#111';

export const rankLabel = (rank) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[rank] ?? String(rank);

// Pip positions as (column, row) in [-1, 1]; rows below 0 are drawn upside down like printed cards.
const PIPS = {
  2: [[0, -1], [0, 1]],
  3: [[0, -1], [0, 0], [0, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  7: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  8: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  9: [[-1, -1], [1, -1], [-1, -0.33], [1, -0.33], [0, 0], [-1, 0.33], [1, 0.33], [-1, 1], [1, 1]],
  10: [[-1, -1], [1, -1], [0, -0.66], [-1, -0.33], [1, -0.33], [-1, 0.33], [1, 0.33], [0, 0.66], [-1, 1], [1, 1]],
};

export function cardFaceSvg(c) {
  const color = isRed(c.suit) ? RED : BLACK;
  const glyph = SUIT_GLYPH[c.suit];
  const label = rankLabel(c.rank);
  const corner = (x, y, flip) =>
    `<g transform="translate(${x} ${y})${flip ? ' rotate(180)' : ''}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" text-anchor="middle">` +
    `<text y="0" font-size="12">${label}</text><text y="11" font-size="11">${glyph}</text></g>`;
  let center;
  if (c.rank === 1) {
    center = `<text x="35.5" y="62" text-anchor="middle" font-size="40" fill="${color}">${glyph}</text>`;
  } else if (c.rank > 10) {
    center = `<rect x="18" y="22" width="35" height="52" fill="#f3e9c6" stroke="${color}"/>` +
      `<text x="35.5" y="57" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="${color}">${label}</text>` +
      `<text x="24" y="33" font-size="9" fill="${color}">${glyph}</text>` +
      `<text x="47" y="68" font-size="9" fill="${color}" transform="rotate(180 47 65)">${glyph}</text>`;
  } else {
    center = PIPS[c.rank].map(([px, py]) => {
      const x = 35.5 + px * 15;
      const y = 48 + py * 24;
      const flip = py > 0 ? ` transform="rotate(180 ${x} ${y})"` : '';
      return `<text class="pip" x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" fill="${color}"${flip}>${glyph}</text>`;
    }).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 71 96" width="71" height="96">` +
    `<rect x="0.5" y="0.5" width="70" height="95" rx="5" fill="#fff" stroke="#555"/>${corner(9, 13, false)}${corner(62, 83, true)}${center}</svg>`;
}

const back = (id, bg, defs, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 71 96" width="71" height="96"><defs>${defs}</defs>` +
  `<rect x="0.5" y="0.5" width="70" height="95" rx="5" fill="${bg}" stroke="#555"/><rect x="5" y="5" width="61" height="86" rx="3" fill="${fill}" stroke="rgba(255,255,255,.7)"/></svg>`;

export const BACKS = [
  { name: 'Blue stripes', svg: back('b0', '#1b4fbf', '<pattern id="b0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#3a6fdc"/></pattern>', 'url(#b0)') },
  { name: 'Red checks', svg: back('b1', '#b22222', '<pattern id="b1" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#e8e8e8"/><rect x="4" y="4" width="4" height="4" fill="#e8e8e8"/></pattern>', 'url(#b1)') },
  { name: 'Green dots', svg: back('b2', '#1e7a3a', '<pattern id="b2" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="#9be3a8"/></pattern>', 'url(#b2)') },
  { name: 'Neon grid', svg: back('b3', '#0b0714', '<pattern id="b3" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#3ee9ff" stroke-width="1"/></pattern>', 'url(#b3)') },
  { name: 'Purple chevrons', svg: back('b4', '#4b2a7f', '<pattern id="b4" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6l6-6 6 6-6 6z" fill="#8b5cd6"/></pattern>', 'url(#b4)') },
  { name: 'Classic navy', svg: back('b5', '#123c78', '<pattern id="b5" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="0.9" fill="#7fa3e0"/></pattern>', 'url(#b5)') },
];

export const cardBackSvg = (index = 0) => BACKS[((index % BACKS.length) + BACKS.length) % BACKS.length].svg;
```

Run: `npx vitest run src/xp/games/solitaire/cards.test.js` → PASS, 3 tests.

- [ ] **Step 3: Stage**

```bash
git add src/xp/games/solitaire/cards.js src/xp/games/solitaire/cards.test.js
```

Suggested commit message: `feat(solitaire): SVG card faces and six card backs`

---
### Task 4: Win animation and stylesheet

**Files:**
- Create: `src/xp/games/solitaire/winAnimation.js`, `src/xp/games/solitaire/solitaire.css`

**Interfaces:**
- Produces: `playWinAnimation(tableEl, foundations, { random }) → { finished: Promise, stop() }`. Draws bouncing cards on a canvas appended to the table; any pointerdown on the canvas ends it. Verified visually in Task 5.

- [ ] **Step 1: Implement winAnimation.js**

`src/xp/games/solitaire/winAnimation.js`:

```js
import { CARD_W, CARD_H, SUIT_GLYPH, rankLabel } from './cards.js';
import { isRed } from './engine.js';

/** The classic cascade: cards leave the foundations one by one, bounce along the bottom and fly out, leaving trails. */
export function playWinAnimation(table, foundations, { random = Math.random } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sol-win';
  const W = table.clientWidth || 640;
  const H = table.clientHeight || 400;
  canvas.width = W;
  canvas.height = H;
  table.append(canvas);
  const ctx = canvas.getContext('2d');
  const piles = foundations.map((pile) => pile.slice());
  const zones = [...table.querySelectorAll('.sol-foundation')].map((z) => ({ x: z.offsetLeft, y: z.offsetTop }));
  let turn = 0;
  let current = null;
  let stopped = false;
  let raf = 0;
  let resolveDone;
  const finished = new Promise((resolve) => { resolveDone = resolve; });

  function pop() {
    for (let n = 0; n < 4; n++) {
      const i = (turn + n) % 4;
      if (!piles[i].length) continue;
      turn = i + 1;
      return { card: piles[i].pop(), x: zones[i]?.x ?? 0, y: zones[i]?.y ?? 0, vx: (random() < 0.5 ? -1 : 1) * (2 + random() * 4), vy: -(2 + random() * 3) };
    }
    return null;
  }
  function drawCard(c) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(c.x, c.y, CARD_W, CARD_H, 5); else ctx.rect(c.x, c.y, CARD_W, CARD_H);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#555';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isRed(c.card.suit) ? '#c8102e' : '#111';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(rankLabel(c.card.rank), c.x + 6, c.y + 16);
    ctx.font = '30px Arial';
    ctx.fillText(SUIT_GLYPH[c.card.suit], c.x + 22, c.y + 62);
  }
  function step() {
    if (stopped) return;
    if (!current) {
      current = pop();
      if (!current) { finish(); return; }
    }
    current.vy += 0.5;
    current.x += current.vx;
    current.y += current.vy;
    if (current.y + CARD_H > H) { current.y = H - CARD_H; current.vy = -current.vy * 0.82; }
    drawCard(current);
    if (current.x > W || current.x + CARD_W < 0) current = null;
    raf = requestAnimationFrame(step);
  }
  function finish() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    canvas.remove();
    resolveDone();
  }
  canvas.addEventListener('pointerdown', finish);
  if (!ctx || typeof requestAnimationFrame !== 'function') finish();
  else raf = requestAnimationFrame(step);
  return { finished, stop: finish };
}
```

- [ ] **Step 2: Write the stylesheet**

`src/xp/games/solitaire/solitaire.css`:

```css
.sol { display: flex; flex-direction: column; flex: 1; min-height: 0; }
.sol-table { position: relative; flex: 1; min-height: 0; background: #008000; overflow: hidden; outline: none; user-select: none; -webkit-user-select: none; }
.sol-zone { position: absolute; width: 71px; height: 96px; border-radius: 5px; box-sizing: border-box; }
.sol-stock, .sol-waste, .sol-foundation { border: 1px solid rgba(0,0,0,.35); box-shadow: inset 0 0 0 1px rgba(255,255,255,.15); }
.sol-stock.empty::after { content: "○"; position: absolute; inset: 0; display: grid; place-items: center; font-size: 40px; color: rgba(0,0,0,.35); }
.sol-col { height: auto; bottom: 0; min-height: 96px; }
.sol-card { position: absolute; left: 0; width: 71px; height: 96px; }
.sol-card svg { display: block; width: 71px; height: 96px; border-radius: 5px; box-shadow: 1px 1px 2px rgba(0,0,0,.4); }
.sol-card.face-up { cursor: grab; }
.sol-drag { position: absolute; z-index: 50; pointer-events: none; width: 71px; }
.sol-win { position: absolute; inset: 0; z-index: 60; }
.sol-status { margin: 0; }
.sol-status .status-bar-field { min-width: 120px; }
.sol-options fieldset { margin-bottom: 8px; }
.sol-deck-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; justify-items: center; }
.sol-deck-choice { padding: 3px; border: 2px solid transparent; background: none; box-shadow: none; min-width: 0; min-height: 0; border-radius: 3px; }
.sol-deck-choice svg { width: 53px; height: 72px; display: block; }
.sol-deck-choice.selected { border-color: #316ac5; background: #d6e3f7; }
```

- [ ] **Step 3: Stage**

```bash
git add src/xp/games/solitaire/winAnimation.js src/xp/games/solitaire/solitaire.css
```

Suggested commit message: `feat(solitaire): bouncing-card win animation and table styles`

---

### Task 5: Solitaire window

**Files:**
- Create: `src/xp/games/solitaire/Solitaire.js`, `src/xp/games/solitaire/Solitaire.test.js`
- Modify: `src/xp/apps/misc.js` (drop the `sol` placeholder), `src/xp/createDesktop.js` (register; add `reducedMotion` to the shell context)

**Interfaces:**
- Consumes: Tasks 1–4, `attachMenubar`, `win.resize`/events from the window manager, shell context `{ wm, dialogs, menus, sounds, storage, reducedMotion }`.
- Produces: `registerSolitaire(registry)` (app id `sol`), `openSolitaire(ctx, { dealer?, reducedMotion?, random? }) → win`. `dealer` is a test hook returning a game from `fromState`.

- [ ] **Step 1: Write the failing UI test**

`src/xp/games/solitaire/Solitaire.test.js`:

```js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../../WindowManager.js';
import { createMenus } from '../../Menu.js';
import { fromState } from './engine.js';
import { openSolitaire } from './Solitaire.js';

const full = (suit) => Array.from({ length: 13 }, (_, i) => `${suit}${i + 1}`);

describe('Solitaire window', () => {
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
  const open = (dealer) => openSolitaire(ctx, { dealer, reducedMotion: true });
  const pointer = (el, type, init = {}) => el.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0, ...init }));

  it('renders the deal, draws from the stock, and sends a card home on double-click', () => {
    const win = open(() => fromState({ draw: 1, stock: ['S5', 'H1'], tableau: [['H12'], ['S13'], [], [], [], [], []] }));
    expect(win.el.querySelectorAll('.sol-card')).toHaveLength(3);
    expect(win.el.querySelector('.sol-score').textContent).toBe('Score: 0');
    win.el.querySelector('.sol-stock').click();
    expect(win.el.querySelector('.sol-waste .sol-card').dataset.id).toBe('H1');
    expect(played).toContain('cardFlip');
    win.el.querySelector('.sol-waste .sol-card').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    expect(win.el.querySelector('.sol-foundation .sol-card').dataset.id).toBe('H1');
    expect(win.el.querySelector('.sol-score').textContent).toBe('Score: 10');
    expect(played).toContain('cardPlace');
    expect(openSolitaire(ctx)).toBe(win);
  });

  it('drags a run onto another column and undoes it with Ctrl+Z', () => {
    const win = open(() => fromState({ tableau: [['H12'], ['S13'], [], [], [], [], []] }));
    const queen = win.el.querySelector('.sol-card[data-id="H12"]');
    pointer(queen, 'pointerdown', { clientX: 20, clientY: 20 });
    expect(win.el.querySelector('.sol-drag')).not.toBeNull();
    document.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 120, clientY: 30 }));
    pointer(win.el.querySelector('.sol-col[data-col="1"]'), 'pointerup', { clientX: 120, clientY: 30 });
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(2);
    expect(win.el.querySelector('.sol-drag')).toBeNull();
    win.el.querySelector('.sol-table').dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(1);
    expect(win.el.querySelectorAll('.sol-col[data-col="0"] .sol-card')).toHaveLength(1);
  });

  it('drops an invalid move back where it came from', () => {
    const win = open(() => fromState({ tableau: [['H12'], ['H13'], [], [], [], [], []] }));
    pointer(win.el.querySelector('.sol-card[data-id="H12"]'), 'pointerdown', { clientX: 5, clientY: 5 });
    pointer(win.el.querySelector('.sol-col[data-col="1"]'), 'pointerup');
    expect(win.el.querySelectorAll('.sol-col[data-col="0"] .sol-card')).toHaveLength(1);
    expect(win.el.querySelectorAll('.sol-col[data-col="1"] .sol-card')).toHaveLength(1);
  });

  it('wins with the last foundation card and offers a new deal', async () => {
    const win = open(() => fromState({ waste: ['C13'], foundations: [full('S'), full('H'), full('D'), full('C').slice(0, 12)] }));
    win.el.querySelector('.sol-waste .sol-card').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('You won');
    expect(played).toContain('win');
  });

  it('saves options and redeals with draw three', () => {
    const win = open(() => fromState({ stock: ['S1', 'S2', 'S3', 'S4'] }));
    win.el.querySelector('.xp-menubar-item').click();
    [...document.querySelectorAll('.xp-menu-item')].find((b) => b.textContent.includes('Options')).click();
    const dlg = ctx.wm.windows.find((w) => w.appId === 'dialog');
    dlg.el.querySelector('#sol-draw3').checked = true;
    dlg.el.querySelector('[data-result="OK"]').click();
    expect(JSON.parse(mem.get('xpcomputer.sol.options')).draw).toBe(3);
    win.el.querySelector('.sol-stock').click();
    expect(win.el.querySelectorAll('.sol-waste .sol-card')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/xp/games/solitaire/Solitaire.test.js`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement Solitaire.js**

`src/xp/games/solitaire/Solitaire.js`:

```js
import './solitaire.css';
import { createGame } from './engine.js';
import { scoreDelta, applyScore, winBonus, TIME_PENALTY_STEP } from './scoring.js';
import { cardFaceSvg, cardBackSvg, BACKS, CARD_W, CARD_H } from './cards.js';
import { playWinAnimation } from './winAnimation.js';
import { attachMenubar } from '../../Menu.js';

const OPTIONS_KEY = 'xpcomputer.sol.options';
const DEFAULTS = { draw: 1, scoring: 'standard', timed: true, back: 0 };
const FACE_UP_STEP = 18;
const FACE_DOWN_STEP = 5;
const MARGIN = 12;
const TOP_Y = 10;
const TABLEAU_Y = TOP_Y + CARD_H + 22;

export function registerSolitaire(registry) {
  registry.register('sol', { name: 'Solitaire', icon: 'cards', launch: (ctx) => openSolitaire(ctx, { reducedMotion: ctx.reducedMotion }) });
}

export function openSolitaire(ctx, { dealer = null, reducedMotion = false, random = Math.random } = {}) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('sol')[0];
  if (existing) { existing.focus(); return existing; }

  const options = loadOptions();
  let game = null;
  let score = 0;
  let scoreBeforeMove = 0;
  let seconds = 0;
  let timer = null;
  let drag = null;
  let animation = null;

  const body = document.createElement('div');
  body.className = 'sol';
  body.innerHTML = '<div class="sol-menubar"></div><div class="sol-table" tabindex="0"></div><div class="status-bar sol-status"><p class="status-bar-field sol-score"></p><p class="status-bar-field sol-time"></p></div>';
  const table = body.querySelector('.sol-table');
  const scoreEl = body.querySelector('.sol-score');
  const timeEl = body.querySelector('.sol-time');
  const win = wm.open({
    appId: 'sol', title: 'Solitaire', icon: 'cards', width: 640, height: 480, minWidth: 560, minHeight: 400, content: body,
    onClose: () => { stopTimer(); animation?.stop(); observer?.disconnect(); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); },
  });

  function loadOptions() {
    try { return { ...DEFAULTS, ...JSON.parse(storage.get(OPTIONS_KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
  }
  const saveOptions = () => storage.set(OPTIONS_KEY, JSON.stringify(options));
  const colStep = () => Math.max(CARD_W + 6, Math.floor((table.clientWidth - MARGIN * 2 - CARD_W) / 6) || 0);
  const clientToTable = (x, y) => {
    const r = table.getBoundingClientRect();
    const s = (r.width / table.offsetWidth) || 1;
    return { x: (x - r.left) / s, y: (y - r.top) / s };
  };

  function cardEl(c, top) {
    const el = document.createElement('div');
    el.className = `sol-card ${c.faceUp ? 'face-up' : 'face-down'}`;
    el.dataset.id = c.id;
    el.style.top = `${top}px`;
    el.innerHTML = c.faceUp ? cardFaceSvg(c) : cardBackSvg(options.back);
    return el;
  }
  function zone(cls, x, y, data) {
    const el = document.createElement('div');
    el.className = `sol-zone ${cls}`;
    Object.assign(el.dataset, data);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    table.append(el);
    return el;
  }
  function render() {
    table.innerHTML = '';
    const step = colStep();
    const stock = zone('sol-stock', MARGIN, TOP_Y, { drop: 'stock' });
    if (game.stock.length) stock.append(cardEl(game.stock[game.stock.length - 1], 0)); else stock.classList.add('empty');
    const waste = zone('sol-waste', MARGIN + step, TOP_Y, { drop: 'waste' });
    game.waste.slice(-(game.draw === 3 ? 3 : 1)).forEach((c, i) => { const el = cardEl(c, 0); el.style.left = `${i * 14}px`; waste.append(el); });
    game.foundations.forEach((pile, index) => {
      const f = zone('sol-foundation', MARGIN + (3 + index) * step, TOP_Y, { drop: 'foundation', index });
      if (pile.length) f.append(cardEl(pile[pile.length - 1], 0));
    });
    game.tableau.forEach((col, colIndex) => {
      const z = zone('sol-col', MARGIN + colIndex * step, TABLEAU_Y, { drop: 'tableau', col: colIndex });
      let y = 0;
      for (const c of col) { z.append(cardEl(c, y)); y += c.faceUp ? FACE_UP_STEP : FACE_DOWN_STEP; }
    });
    renderStatus();
  }
  function renderStatus() {
    scoreEl.textContent = options.scoring === 'standard' ? `Score: ${score}` : 'Score: off';
    timeEl.textContent = `Time: ${seconds}`;
    timeEl.hidden = !options.timed;
  }

  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      seconds++;
      if (options.timed && options.scoring === 'standard' && seconds % 10 === 0) score = applyScore(score, TIME_PENALTY_STEP);
      renderStatus();
    }, 1000);
  }
  function deal() {
    stopTimer();
    animation?.stop();
    animation = null;
    game = dealer ? dealer() : createGame({ draw: options.draw, random });
    game.draw = options.draw;
    score = 0;
    scoreBeforeMove = 0;
    seconds = 0;
    render();
  }
  /** Run an engine action; on success apply score, sound, render, and handle the win. */
  function perform(action) {
    if (!game || game.state !== 'playing') return null;
    const before = score;
    const record = action();
    if (!record) return null;
    scoreBeforeMove = before;
    if (options.scoring === 'standard') score = applyScore(score, scoreDelta(record, { draw: game.draw }));
    startTimer();
    sounds.play(record.kind === 'draw' || record.kind === 'recycle' ? 'cardFlip' : 'cardPlace');
    render();
    if (game.state === 'won') onWin();
    return record;
  }
  function undo() {
    if (game.undo()) { score = scoreBeforeMove; render(); }
  }
  async function onWin() {
    stopTimer();
    if (options.scoring === 'standard') { score = applyScore(score, winBonus(seconds)); renderStatus(); }
    sounds.play('win');
    if (!reducedMotion) {
      animation = playWinAnimation(table, game.foundations, { random });
      await animation.finished;
      animation = null;
    }
    const again = await dialogs.message({ title: 'Solitaire', kind: 'question', owner: win, buttons: ['Yes', 'No'], text: `You won!\nScore: ${score}   Time: ${seconds}\n\nDeal again?` });
    if (again === 'Yes') deal();
  }

  // ---- pointer input ----
  const locate = (el) => game.locate(el.dataset.id);
  function positionDrag(e) {
    const p = clientToTable(e.clientX, e.clientY);
    drag.layer.style.left = `${p.x - drag.offsetX}px`;
    drag.layer.style.top = `${p.y - drag.offsetY}px`;
  }
  function onMove(e) { if (drag) positionDrag(e); }
  function onUp(e) {
    if (!drag) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    const { source } = drag;
    drag = null;
    const dropZone = e.target?.closest?.('[data-drop]');
    let target = null;
    if (dropZone?.dataset.drop === 'tableau') target = { type: 'tableau', col: Number(dropZone.dataset.col) };
    else if (dropZone?.dataset.drop === 'foundation') target = { type: 'foundation', index: Number(dropZone.dataset.index) };
    if (!target || !perform(() => game.moveStack(source, target))) render();
  }
  table.addEventListener('pointerdown', (e) => {
    table.focus({ preventScroll: true });
    if (e.button !== 0 || drag || !game || game.state !== 'playing') return;
    const el = e.target.closest('.sol-card');
    if (!el) return;
    const source = locate(el);
    if (!source || source.type === 'stock') return;
    const cards = game.peek(source);
    if (!cards.length || (source.type !== 'tableau' && cards[0].id !== el.dataset.id)) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const s = (rect.width / CARD_W) || 1;
    const layer = document.createElement('div');
    layer.className = 'sol-drag';
    cards.map((c) => table.querySelector(`.sol-card[data-id="${c.id}"]`)).forEach((cardNode, i) => {
      cardNode.style.top = `${i * FACE_UP_STEP}px`;
      cardNode.style.left = '0';
      layer.append(cardNode);
    });
    table.append(layer);
    drag = { source, layer, offsetX: (e.clientX - rect.left) / s, offsetY: (e.clientY - rect.top) / s };
    positionDrag(e);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
  table.addEventListener('click', (e) => { if (e.target.closest('.sol-stock')) perform(() => game.drawFromStock()); });
  table.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.sol-card');
    if (!el || !game || game.state !== 'playing') return;
    const source = locate(el);
    if (source && source.type !== 'stock') perform(() => game.autoToFoundation(source));
  });
  table.addEventListener('keydown', (e) => {
    if (e.key === 'F2') { e.preventDefault(); deal(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (game) render(); }) : null;
  observer?.observe(table);

  // ---- dialogs ----
  function optionsDialog() {
    const content = document.createElement('div');
    content.className = 'xp-msgbox sol-options';
    content.innerHTML = `
      <fieldset><legend>Draw</legend>
        <div class="field-row"><input type="radio" id="sol-draw1" name="sol-draw" value="1"><label for="sol-draw1">Draw one</label></div>
        <div class="field-row"><input type="radio" id="sol-draw3" name="sol-draw" value="3"><label for="sol-draw3">Draw three</label></div>
      </fieldset>
      <fieldset><legend>Scoring</legend>
        <div class="field-row"><input type="radio" id="sol-std" name="sol-scoring" value="standard"><label for="sol-std">Standard</label></div>
        <div class="field-row"><input type="radio" id="sol-none" name="sol-scoring" value="none"><label for="sol-none">None</label></div>
      </fieldset>
      <div class="field-row"><input type="checkbox" id="sol-timed"><label for="sol-timed">Timed game</label></div>
      <div class="xp-msgbox-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button></div>`;
    content.querySelector(`[name="sol-draw"][value="${options.draw}"]`).checked = true;
    content.querySelector(`[name="sol-scoring"][value="${options.scoring}"]`).checked = true;
    content.querySelector('#sol-timed').checked = options.timed;
    const dlg = wm.open({ appId: 'dialog', title: 'Options', icon: 'cards', dialog: true, width: 320, height: 280, x: win.bounds.x + 40, y: win.bounds.y + 60, content });
    content.querySelector('[data-result="OK"]').addEventListener('click', () => {
      options.draw = Number(content.querySelector('[name="sol-draw"]:checked').value);
      options.scoring = content.querySelector('[name="sol-scoring"]:checked').value;
      options.timed = content.querySelector('#sol-timed').checked;
      saveOptions();
      dlg.close();
      deal();
    });
    content.querySelector('[data-result="Cancel"]').addEventListener('click', () => dlg.close());
  }
  function deckDialog() {
    const content = document.createElement('div');
    content.className = 'xp-msgbox sol-deck';
    content.innerHTML = `<div class="sol-deck-grid">${BACKS.map((b, i) => `<button type="button" class="sol-deck-choice${i === options.back ? ' selected' : ''}" data-index="${i}" title="${b.name}">${b.svg}</button>`).join('')}</div>` +
      '<div class="xp-msgbox-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button></div>';
    let choice = options.back;
    content.querySelector('.sol-deck-grid').addEventListener('click', (e) => {
      const b = e.target.closest('.sol-deck-choice');
      if (!b) return;
      choice = Number(b.dataset.index);
      content.querySelectorAll('.sol-deck-choice').forEach((x) => x.classList.toggle('selected', x === b));
    });
    const dlg = wm.open({ appId: 'dialog', title: 'Select Card Back', icon: 'cards', dialog: true, width: 300, height: 320, x: win.bounds.x + 60, y: win.bounds.y + 40, content });
    content.querySelector('[data-result="OK"]').addEventListener('click', () => { options.back = choice; saveOptions(); dlg.close(); render(); });
    content.querySelector('[data-result="Cancel"]').addEventListener('click', () => dlg.close());
  }

  attachMenubar(body.querySelector('.sol-menubar'), menus, {
    Game: () => [
      { label: 'Deal', shortcut: 'F2', action: deal },
      { separator: true },
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !game?.snapshot, action: undo },
      { label: 'Deck...', action: deckDialog },
      { label: 'Options...', action: optionsDialog },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Help: [{ label: 'About Solitaire', action: () => dialogs.message({ title: 'About Solitaire', owner: win, text: 'Klondike, rebuilt in plain JavaScript with the Windows Standard scoring rules.\n\nDrag runs between columns, double-click a card to send it home, click the stock to draw. F2 deals, Ctrl+Z undoes the last move.' }) }],
  });

  deal();
  return win;
}
```

- [ ] **Step 4: Register the app and drop the placeholder**

`src/xp/apps/misc.js`: the placeholder loop now only covers Pinball:

```js
  for (const [id, name] of [['pinball', 'Pinball']]) {
```

`src/xp/createDesktop.js`: add `reducedMotion` to the shell context and register:

```js
import { registerSolitaire } from './games/solitaire/Solitaire.js';
// … in the ctx literal add:
//   reducedMotion,
// … after registerMinesweeper(registry):
  registerSolitaire(registry);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/xp/games/solitaire` then `npm test`.
Expected: Solitaire UI 5 tests pass; the whole suite is green. If the "wins" test resolves the dialog too early, add one more `await Promise.resolve()`; the chain is perform → onWin → dialogs.message.

- [ ] **Step 6: Verify by hand**

Run: `npm run dev -- --open` with `?mode=flat`. Start → Solitaire (also Run → `sol`).

1. Deal shows 28 tableau cards, 24 in stock, empty foundations; window resizes redistribute the columns; the status bar shows Score/Time.
2. Click the stock: draw one flips one card; with Draw three (Options) three fan out and only the top one drags.
3. Drag a King to an empty column, a run onto an opposite-colour card one rank higher; invalid drops snap back; dropping on the same column does nothing.
4. Double-click an Ace → foundation (+10); drag it back to a tableau (−15); turning a card gives +5. Recycling the waste in draw one costs 100 after the first pass.
5. Timer starts on the first move and ticks; −2 every 10 s with Standard + Timed. Undo (Ctrl+Z or menu) reverts one move and its score.
6. Deck… changes all backs immediately; the choice and Options survive reload.
7. Win (use a browser console trick: run the game to the end, or temporarily deal a near-won state through the `dealer` hook): cards cascade and bounce with trails; a click stops it; the dialog offers a new deal. With reduced motion enabled in the OS the dialog appears directly.
8. Sounds: flip on draw, place on drop, fanfare on win; mute silences all.

- [ ] **Step 7: Stage**

```bash
git add src/xp/games/solitaire src/xp/apps/misc.js src/xp/createDesktop.js
```

Suggested commit message: `feat(solitaire): playable Klondike window with drag and drop, scoring, undo, decks and win cascade`

---

### Task 6: README and QA

- [ ] **Step 1: Document**

In `README.md` under `## Controls` add:

```markdown
- Solitaire: drag runs, double-click sends a card to its foundation, click the stock to draw, F2 deals, Ctrl+Z undoes one move. Options and card back are remembered.
```

Under `## Manual QA checklist` add:

```markdown
- [ ] Solitaire: draw one/three, valid and invalid drops, scoring and timer, undo, deck change, win cascade and dialog
```

Mark roadmap item 4 done.

- [ ] **Step 2: Verify and hand back**

Run `npm test` and `npm run build`; walk the Solitaire QA line in flat mode and on the CRT in room mode.

```bash
git add README.md
git status --short
```

Ask whether to commit (suggested: `docs: Solitaire controls and QA`).
