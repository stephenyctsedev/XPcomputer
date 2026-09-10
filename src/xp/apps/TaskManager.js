const SYSTEM_PROCESSES = [
  ['System Idle Process', 'SYSTEM', 96, '16 K'], ['System', 'SYSTEM', 0, '212 K'], ['smss.exe', 'SYSTEM', 0, '388 K'],
  ['csrss.exe', 'SYSTEM', 1, '3,412 K'], ['winlogon.exe', 'SYSTEM', 0, '2,104 K'], ['services.exe', 'SYSTEM', 0, '3,760 K'],
  ['svchost.exe', 'SYSTEM', 0, '4,916 K'], ['svchost.exe', 'NETWORK SERVICE', 0, '3,208 K'], ['spoolsv.exe', 'SYSTEM', 0, '4,020 K'],
  ['neon.exe', 'Stephen', 1, '1,337 K'], ['explorer.exe', 'Stephen', 1, '18,204 K'],
];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerTaskManager(registry) {
  registry.register('taskmgr', { name: 'Windows Task Manager', icon: 'exe', launch: openTaskManager });
}

export function openTaskManager(ctx) {
  const { wm, dialogs, registry } = ctx;
  const existing = wm.find('taskmgr')[0];
  if (existing) { existing.focus(); return existing; }
  const content = document.createElement('div');
  content.className = 'xp-tm';
  content.innerHTML = `
    <menu role="tablist">
      <li role="tab" aria-selected="true"><a href="#apps">Applications</a></li>
      <li role="tab"><a href="#procs">Processes</a></li>
      <li role="tab"><a href="#perf">Performance</a></li>
    </menu>
    <div class="window" role="tabpanel" data-tab="apps">
      <div class="sunken-panel xp-tm-list"><table class="xp-tm-apps"><thead><tr><th>Task</th><th>Status</th></tr></thead><tbody></tbody></table></div>
      <div class="xp-msgbox-buttons xp-tm-buttons"><button type="button" data-cmd="endtask">End Task</button><button type="button" data-cmd="switchto">Switch To</button><button type="button" data-cmd="newtask">New Task...</button></div>
    </div>
    <div class="window" role="tabpanel" data-tab="procs" hidden>
      <div class="sunken-panel xp-tm-list"><table class="xp-tm-procs"><thead><tr><th>Image Name</th><th>User Name</th><th>CPU</th><th>Mem Usage</th></tr></thead><tbody></tbody></table></div>
      <div class="xp-msgbox-buttons xp-tm-buttons"><button type="button" data-cmd="endprocess">End Process</button></div>
    </div>
    <div class="window" role="tabpanel" data-tab="perf" hidden>
      <div class="xp-tm-perf"><fieldset><legend>CPU Usage</legend><div class="xp-tm-gauge xp-tm-cpu">3%</div></fieldset><fieldset><legend>PF Usage</legend><div class="xp-tm-gauge">312 MB</div></fieldset></div>
      <fieldset><legend>Totals</legend><div class="xp-tm-totals">Handles 8,214 &nbsp; Threads 402 &nbsp; Processes <span class="xp-tm-count"></span></div></fieldset>
    </div>
    <div class="status-bar"><p class="status-bar-field xp-tm-status-procs"></p><p class="status-bar-field xp-tm-status-cpu">CPU Usage: 3%</p><p class="status-bar-field">Commit Charge: 312M / 1250M</p></div>`;
  const win = wm.open({ appId: 'taskmgr', title: 'Windows Task Manager', icon: 'exe', width: 440, height: 480, minWidth: 380, minHeight: 360, content, onClose: () => { clearInterval(timer); unsubscribe.forEach((off) => off()); } });
  const appsBody = content.querySelector('.xp-tm-apps tbody');
  const procsBody = content.querySelector('.xp-tm-procs tbody');
  const appWindows = () => wm.windows.filter((w) => !w.isDialog && w !== win);
  let selectedApp = null;
  let selectedProc = null;

  function select(tbody, row, setter) {
    tbody.querySelectorAll('tr.selected').forEach((r) => r.classList.remove('selected'));
    row?.classList.add('selected');
    setter(row ? row.dataset.key : null);
  }
  function render() {
    appsBody.innerHTML = appWindows().map((w) => `<tr data-key="${w.id}"><td>${esc(w.title)}</td><td>Running</td></tr>`).join('');
    const live = appWindows().map((w) => [`${w.appId}.exe`, 'Stephen', 0, `${(4000 + w.title.length * 137).toLocaleString()} K`, w.id]);
    procsBody.innerHTML = [...live, ...SYSTEM_PROCESSES.map((p) => [...p, ''])]
      .map(([name, user, cpu, mem, id]) => `<tr data-key="${id || `sys:${name}`}"><td>${esc(name)}</td><td>${esc(user)}</td><td>${String(cpu).padStart(2, '0')}</td><td>${mem}</td></tr>`).join('');
    const count = live.length + SYSTEM_PROCESSES.length;
    content.querySelector('.xp-tm-status-procs').textContent = `Processes: ${count}`;
    content.querySelector('.xp-tm-count').textContent = String(count);
    if (selectedApp) select(appsBody, appsBody.querySelector(`[data-key="${selectedApp}"]`), (k) => { selectedApp = k; });
    if (selectedProc) select(procsBody, procsBody.querySelector(`[data-key="${selectedProc}"]`), (k) => { selectedProc = k; });
  }
  appsBody.addEventListener('click', (e) => select(appsBody, e.target.closest('tr'), (k) => { selectedApp = k; }));
  procsBody.addEventListener('click', (e) => select(procsBody, e.target.closest('tr'), (k) => { selectedProc = k; }));
  content.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    e.preventDefault();
    const name = tab.querySelector('a').getAttribute('href').slice(1);
    content.querySelectorAll('[role="tab"]').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
    content.querySelectorAll('[role="tabpanel"]').forEach((p) => { p.hidden = p.dataset.tab !== name; });
  });
  content.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    const app = appWindows().find((w) => w.id === selectedApp);
    if (cmd === 'endtask') app?.close();
    else if (cmd === 'switchto') app?.focus();
    else if (cmd === 'newtask') registry.launch('run');
    else if (cmd === 'endprocess') {
      const target = appWindows().find((w) => w.id === selectedProc);
      if (target) target.close();
      else if (selectedProc) dialogs.message({ title: 'Unable to Terminate Process', kind: 'error', owner: win, text: 'The operation could not be completed.\n\nAccess is denied.' });
    }
  });
  const unsubscribe = ['open', 'close', 'title'].map((ev) => wm.on(ev, render));
  const timer = setInterval(() => {
    const cpu = 2 + Math.floor(Math.random() * 6) + (appWindows().length > 2 ? 10 : 0);
    content.querySelector('.xp-tm-cpu').textContent = `${cpu}%`;
    content.querySelector('.xp-tm-status-cpu').textContent = `CPU Usage: ${cpu}%`;
  }, 1000);
  render();
  return win;
}
