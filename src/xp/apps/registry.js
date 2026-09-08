/** App id -> launcher. Desktop icons, Start menu, Run and Explorer all launch through here. */
export function createRegistry(ctx) {
  const apps = new Map();
  return {
    ctx,
    register(id, def) { apps.set(id, def); return def; },
    get: (id) => apps.get(id) ?? null,
    has: (id) => apps.has(id),
    list: () => [...apps.entries()].map(([id, def]) => ({ id, name: def.name, icon: def.icon })),
    launch(id, payload) {
      const def = apps.get(id);
      if (!def) {
        return ctx.dialogs.message({
          title: 'Windows', kind: 'error',
          text: `Windows cannot find '${id}'. Make sure you typed the name correctly, and then try again.`,
        });
      }
      return def.launch(ctx, payload);
    },
  };
}
