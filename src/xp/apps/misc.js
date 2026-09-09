/** Small apps that are dialogs or side effects rather than windows. */
export function registerMisc(registry) {
  registry.register('error', {
    name: 'Error', icon: 'errorIcon',
    launch: (ctx, { title = 'Windows', text = '', buttons = ['OK'], owner = null } = {}) => ctx.dialogs.message({ title, text, kind: 'error', buttons, owner }),
  });
  registry.register('external', { name: 'Open link', icon: 'url', launch: (ctx, { url }) => ctx.openExternal(url) });
  registry.register('controlpanel', {
    name: 'Control Panel', icon: 'controlpanel',
    launch: (ctx) => ctx.dialogs.message({ title: 'Restrictions', kind: 'error', text: 'This operation has been cancelled due to restrictions in effect on this computer. Please contact your system administrator (Stephen).' }),
  });
  registry.register('help', {
    name: 'Help and Support', icon: 'help',
    launch: (ctx) => {
      const body = document.createElement('div');
      body.className = 'xp-help';
      body.innerHTML = `
        <h3>Help and Support Center</h3>
        <p>This is ${ctx.resume.displayName}'s interactive resume. The computer, the operating system and the games are recreated in plain JavaScript.</p>
        <p><b>Where to look</b></p>
        <ul><li>Internet Explorer: homepage and the PDF resume</li><li>My Documents &gt; Projects: one text file per job</li><li>Start &gt; All Programs &gt; Games</li></ul>
        <p><b>Keys</b>: Escape leaves the computer (3D mode), Alt+F4 closes a window, F2 starts a new game.</p>
        <p><a href="#" data-cmd="source">Source code on GitHub</a></p>`;
      body.addEventListener('click', (e) => { if (e.target.closest('[data-cmd="source"]')) { e.preventDefault(); ctx.openExternal(ctx.repoUrl); } });
      return ctx.wm.open({ appId: 'help', title: 'Help and Support Center', icon: 'help', width: 520, height: 400, content: body });
    },
  });
  for (const [id, name] of [['pinball', 'Pinball']]) {
    registry.register(id, {
      name, icon: { sol: 'cards', pinball: 'pinball' }[id],
      launch: (ctx) => ctx.dialogs.message({ title: name, kind: 'info', text: `${name} installs in a later update. Check back soon!` }),
    });
  }
}
