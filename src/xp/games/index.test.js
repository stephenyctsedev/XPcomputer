import { describe, it, expect } from 'vitest';
import { createRegistry } from '../apps/registry.js';
import { registerGames, GAME_LOADERS } from './index.js';

describe('registerGames', () => {
  it('registers the three games and loads a module only when launched', async () => {
    const calls = [];
    const ctx = { reducedMotion: true, dialogs: { message() {} } };
    const registry = createRegistry(ctx);
    let loaded = 0;
    registerGames(registry, {
      sol: { name: 'Solitaire', icon: 'cards', load: async () => { loaded++; return { openSolitaire: (c, o) => calls.push(['sol', c === ctx, o]) }; }, open: 'openSolitaire', options: (c) => ({ reducedMotion: c.reducedMotion }) },
      winmine: { name: 'Minesweeper', icon: 'mine', load: async () => ({ openMinesweeper: (c) => calls.push(['winmine', c === ctx]) }), open: 'openMinesweeper' },
    });
    expect(registry.list().map((a) => a.id).sort()).toEqual(['sol', 'winmine']);
    expect(loaded).toBe(0);
    await registry.launch('sol');
    await registry.launch('winmine');
    expect(loaded).toBe(1);
    expect(calls).toEqual([['sol', true, { reducedMotion: true }], ['winmine', true]]);
  });
  it('ships loaders for all three games', () => {
    expect(Object.keys(GAME_LOADERS).sort()).toEqual(['pinball', 'sol', 'winmine']);
  });
});
