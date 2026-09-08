// Minesweeper rules. Pure: no DOM, no timers.
export const LEVELS = {
  beginner: { rows: 9, cols: 9, mines: 10 },
  intermediate: { rows: 16, cols: 16, mines: 40 },
  expert: { rows: 16, cols: 30, mines: 99 },
};

/** `layout` (array of mine indices) skips random placement; used by tests. */
export function createGame({ rows, cols, mines, random = Math.random, marks = true, layout = null }) {
  const total = rows * cols;
  const cells = Array.from({ length: total }, () => ({ mine: false, adjacent: 0, revealed: false, mark: 'none', wrong: false }));
  const game = { rows, cols, mines, marks, cells, state: 'ready', flags: 0, revealed: 0, exploded: null };
  const index = (r, c) => r * cols + c;
  const inBounds = (r, c) => r >= 0 && r < rows && c >= 0 && c < cols;
  const neighbors = (i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const out = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if ((dr !== 0 || dc !== 0) && inBounds(r + dr, c + dc)) out.push(index(r + dr, c + dc));
      }
    }
    return out;
  };
  const over = () => game.state === 'won' || game.state === 'lost';

  function placeMines(safeIndex) {
    let picks = layout;
    if (!picks) {
      const pool = [];
      for (let i = 0; i < total; i++) if (i !== safeIndex) pool.push(i);
      for (let k = 0; k < mines; k++) {
        const j = k + Math.floor(random() * (pool.length - k));
        [pool[k], pool[j]] = [pool[j], pool[k]];
      }
      picks = pool.slice(0, mines);
    }
    for (const i of picks) cells[i].mine = true;
    for (let i = 0; i < total; i++) cells[i].adjacent = neighbors(i).filter((n) => cells[n].mine).length;
  }

  function lose(at, changed) {
    game.state = 'lost';
    game.exploded = at;
    cells.forEach((cell, i) => {
      if (cell.mine && !cell.revealed && cell.mark !== 'flag') { cell.revealed = true; changed.push(i); }
      if (!cell.mine && cell.mark === 'flag') { cell.wrong = true; changed.push(i); }
    });
  }

  function checkWin(changed) {
    if (game.revealed !== total - mines) return;
    game.state = 'won';
    cells.forEach((cell, i) => {
      if (cell.mine && cell.mark !== 'flag') { cell.mark = 'flag'; game.flags++; changed.push(i); }
    });
  }

  function reveal(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const start = index(r, c);
    if (cells[start].revealed || cells[start].mark === 'flag') return [];
    if (game.state === 'ready') { placeMines(start); game.state = 'playing'; }
    const changed = [];
    const stack = [start];
    while (stack.length) {
      const i = stack.pop();
      const cell = cells[i];
      if (cell.revealed || cell.mark === 'flag') continue;
      cell.revealed = true;
      cell.mark = 'none';
      game.revealed++;
      changed.push(i);
      if (cell.mine) { lose(i, changed); return changed; }
      if (cell.adjacent === 0) for (const n of neighbors(i)) if (!cells[n].revealed) stack.push(n);
    }
    checkWin(changed);
    return changed;
  }

  function toggleMark(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const i = index(r, c);
    const cell = cells[i];
    if (cell.revealed) return [];
    if (cell.mark === 'none') { cell.mark = 'flag'; game.flags++; }
    else if (cell.mark === 'flag') { cell.mark = game.marks ? 'question' : 'none'; game.flags--; }
    else cell.mark = 'none';
    return [i];
  }

  function chord(r, c) {
    if (over() || !inBounds(r, c)) return [];
    const i = index(r, c);
    const cell = cells[i];
    if (!cell.revealed || cell.adjacent === 0) return [];
    const around = neighbors(i);
    if (around.filter((n) => cells[n].mark === 'flag').length !== cell.adjacent) return [];
    const changed = [];
    for (const n of around) {
      if (cells[n].revealed || cells[n].mark === 'flag') continue;
      changed.push(...reveal(Math.floor(n / cols), n % cols));
      if (game.state === 'lost') break;
    }
    return changed;
  }

  Object.defineProperty(game, 'minesLeft', { get: () => mines - game.flags });
  return Object.assign(game, { reveal, toggleMark, chord, index, neighbors });
}
