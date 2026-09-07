import { iconEl } from '../icons/index.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerSystemProperties(registry) {
  registry.register('sysprops', { name: 'System Properties', icon: 'computer', launch: openSystemProperties });
}

export function openSystemProperties(ctx) {
  const { wm, resume, repoUrl, openExternal } = ctx;
  const years = Math.max(1, new Date().getFullYear() - 2018);
  const body = document.createElement('div');
  body.className = 'xp-sysprops';
  body.innerHTML = `
    <menu role="tablist">
      <li role="tab" aria-selected="true"><a href="#general">General</a></li>
      <li role="tab"><a href="#hardware">Hardware</a></li>
      <li role="tab"><a href="#about">About</a></li>
    </menu>
    <div class="window" role="tabpanel" data-tab="general"><div class="xp-sysprops-grid">
      <span class="xp-sysprops-ico"></span>
      <div><b>System:</b><br>Stephen XP<br>Game Programmer Edition<br>Version ${new Date().getFullYear()}</div>
      <div><b>Registered to:</b><br>${esc(resume.displayName)}<br>${esc(resume.fullName)}<br>${esc(resume.contact.location)}</div>
      <div><b>Computer:</b><br>${esc(resume.title)}<br>${years}+ years of experience<br>${esc(resume.expertise[0])} inside<br>${resume.languages.length} languages installed</div>
    </div></div>
    <div class="window" role="tabpanel" data-tab="hardware" hidden>
      <p><b>Device Manager</b> — installed skills</p>
      <ul class="xp-devices">${resume.expertise.map((s) => `<li><span class="xp-dev-ico"></span>${esc(s)}</li>`).join('')}</ul>
    </div>
    <div class="window" role="tabpanel" data-tab="about" hidden>
      <p><b>XPcomputer</b> is an interactive resume built with three.js, plain JavaScript and XP.css.</p>
      <p>No Microsoft artwork, sounds or logos are used; everything is drawn or synthesized in code.</p>
      <p><a href="#" data-cmd="source">View the source on GitHub</a></p>
    </div>
    <div class="xp-msgbox-buttons xp-sysprops-buttons"><button class="default" data-cmd="ok">OK</button><button data-cmd="cancel">Cancel</button><button disabled>Apply</button></div>`;
  body.querySelector('.xp-sysprops-ico').append(iconEl('computer', 48));
  for (const holder of body.querySelectorAll('.xp-dev-ico')) holder.append(iconEl('exe', 16));

  const win = wm.open({ appId: 'sysprops', title: 'System Properties', icon: 'computer', dialog: true, width: 420, height: 470, content: body });
  body.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    e.preventDefault();
    const name = tab.querySelector('a').getAttribute('href').slice(1);
    for (const t of body.querySelectorAll('[role="tab"]')) t.setAttribute('aria-selected', String(t === tab));
    for (const panel of body.querySelectorAll('[role="tabpanel"]')) panel.hidden = panel.dataset.tab !== name;
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (cmd === 'ok' || cmd === 'cancel') win.close();
    if (cmd === 'source') { e.preventDefault(); openExternal(repoUrl); }
  });
  return win;
}
