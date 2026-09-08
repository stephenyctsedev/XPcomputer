import { describe, it, expect } from 'vitest';
import { createGame, LEVELS } from './engine.js';

// 5×5 board, index = r*5 + c
const small = (layout, extra = {}) => createGame({ rows: 5, cols: 5, mines: layout.length, layout, ...extra });

describe('createGame', () => {
  it('starts ready with no mines placed', () => {
    const g = createGame({ ...LEVELS.beginner });
    expect(g.cells).toHaveLength(81);
    expect(g.state).toBe('ready');
    expect(g.minesLeft).toBe(10);
    expect(g.cells.filter((c) => c.mine)).toHaveLength(0);
  });

  it('places mines on the first reveal, never under the click, with correct adjacency', () => {
    const g = createGame({ ...LEVELS.expert });
    g.reveal(7, 15);
    expect(g.state).not.toBe('lost');
    expect(g.cells[g.index(7, 15)].mine).toBe(false);
    expect(g.cells.filter((c) => c.mine)).toHaveLength(99);
    g.cells.forEach((cell, i) => {
      const count = g.neighbors(i).filter((n) => g.cells[n].mine).length;
      expect(cell.adjacent).toBe(count);
    });
  });

  it('floods zero cells and wins when every safe cell is revealed', () => {
    const g = small([0]);
    const changed = g.reveal(4, 4);
    expect(g.state).toBe('won');
    expect(changed).toHaveLength(25);            // 24 safe cells + the auto-flagged mine
    expect(g.cells.filter((c) => c.revealed)).toHaveLength(24);
    expect(g.cells[0].mark).toBe('flag');
    expect(g.minesLeft).toBe(0);
    expect(g.cells[1].adjacent).toBe(1);
  });

  it('loses on a mine, reveals the others and marks wrong flags', () => {
    const g = small([12, 24]);
    g.toggleMark(0, 0);                          // wrong flag
    g.toggleMark(4, 4);                          // right flag
    g.reveal(2, 2);
    expect(g.state).toBe('lost');
    expect(g.exploded).toBe(12);
    expect(g.cells[12].revealed).toBe(true);
    expect(g.cells[24].revealed).toBe(false);    // correctly flagged mines stay flagged
    expect(g.cells[24].mark).toBe('flag');
    expect(g.cells[0].wrong).toBe(true);
    expect(g.reveal(0, 1)).toEqual([]);          // game over: nothing changes
    expect(g.toggleMark(0, 1)).toEqual([]);
  });

  it('cycles marks and refuses to reveal flagged cells', () => {
    const g = small([12]);
    expect(g.toggleMark(0, 0)).toEqual([0]);
    expect(g.cells[0].mark).toBe('flag');
    expect(g.minesLeft).toBe(0);
    g.toggleMark(0, 0);
    expect(g.cells[0].mark).toBe('question');
    expect(g.minesLeft).toBe(1);
    g.toggleMark(0, 0);
    expect(g.cells[0].mark).toBe('none');
    g.toggleMark(0, 0);
    expect(g.reveal(0, 0)).toEqual([]);
    const noMarks = small([12], { marks: false });
    noMarks.toggleMark(0, 0);
    noMarks.toggleMark(0, 0);
    expect(noMarks.cells[0].mark).toBe('none');
  });

  it('chords around a satisfied number and ignores unsatisfied ones', () => {
    const g = createGame({ rows: 3, cols: 3, mines: 2, layout: [0, 2] });
    expect(g.reveal(1, 1)).toEqual([4]);
    expect(g.cells[4].adjacent).toBe(2);
    expect(g.chord(1, 1)).toEqual([]);           // no flags yet
    g.toggleMark(0, 0);
    g.toggleMark(0, 2);
    const changed = g.chord(1, 1);
    expect(changed.sort((a, b) => a - b)).toEqual([1, 3, 5, 6, 7, 8]);
    expect(g.state).toBe('won');
  });

  it('a chord with a wrong flag can lose', () => {
    const g = createGame({ rows: 3, cols: 3, mines: 1, layout: [0] });
    g.reveal(1, 1);
    g.toggleMark(0, 1);                          // wrong flag next to the number
    g.chord(1, 1);
    expect(g.state).toBe('lost');
    expect(g.exploded).toBe(0);
  });
});
