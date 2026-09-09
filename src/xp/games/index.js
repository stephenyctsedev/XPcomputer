/** Games are code-split: each module downloads the first time its app is launched. */
export const GAME_LOADERS = {
  winmine: { name: 'Minesweeper', icon: 'mine', load: () => import('./minesweeper/Minesweeper.js'), open: 'openMinesweeper' },
  sol: { name: 'Solitaire', icon: 'cards', load: () => import('./solitaire/Solitaire.js'), open: 'openSolitaire', options: (ctx) => ({ reducedMotion: ctx.reducedMotion }) },
  pinball: { name: 'Pinball', icon: 'pinball', load: () => import('./pinball/Pinball.js'), open: 'openPinball' },
};

export function registerGames(registry, loaders = GAME_LOADERS) {
  for (const [id, def] of Object.entries(loaders)) {
    registry.register(id, {
      name: def.name,
      icon: def.icon,
      launch: async (ctx) => {
        const mod = await def.load();
        return def.options ? mod[def.open](ctx, def.options(ctx)) : mod[def.open](ctx);
      },
    });
  }
}
