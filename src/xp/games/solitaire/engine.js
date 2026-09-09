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
      if (source.type === 'foundation' || cards.length !== 1 || !canPlaceOnFoundation(cards[0], game.foundations[target.index])) return null;
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
