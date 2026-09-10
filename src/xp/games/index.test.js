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
  it('surfaces an error dialog when a loader fails to load', async () => {
    const ctx = { reducedMotion: true, dialogs: { message: () => {} } };
    const registry = createRegistry(ctx);
    const messages = [];
    ctx.dialogs.message = (msg) => { messages.push(msg); };
    registerGames(registry, {
      broken: { name: 'Broken Game', icon: 'cards', load: async () => { throw new Error('Network failure'); }, open: 'openBroken' },
    });
    await registry.launch('broken');
    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      title: 'Windows', kind: 'error',
      text: 'Cannot start Broken Game. This program cannot be started.',
    });
  });
});
