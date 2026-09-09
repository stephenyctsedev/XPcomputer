import { iconEl } from '../icons/index.js';
import { attachMenubar } from '../Menu.js';
import { resolvePath, parentPath, PATHS } from '../../data/filesystem.js';

const TYPE_NAMES = { root: 'System Folder', drive: 'Local Disk', folder: 'File Folder', file: 'File', shortcut: 'Shortcut', exe: 'Application' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function registerExplorer(registry) {
  registry.register('explorer', {
    name: 'Windows Explorer', icon: 'folder',
    launch: (ctx, payload = {}) => openExplorer(ctx, payload.path ?? PATHS.myComputer),
  });
}

export function openExplorer(ctx, startPath = PATHS.myComputer) {
  const { wm, fs, registry, dialogs, menus, toDesktopPoint, mediaBase = '' } = ctx;
  const history = [startPath];
  let index = 0;
  let view = 'icons';
  // Auto-pick stays on until the user chooses a view, then that choice owns the window.
  let viewLocked = false;

  const body = document.createElement('div');
  body.className = 'xp-explorer';
  body.innerHTML = `
    <div class="xp-explorer-menubar"></div>
    <div class="xp-ie-toolbar">
      <button class="xp-tb" data-cmd="back"><span class="xp-tb-ico" data-icon="arrowLeft"></span>Back</button>
      <button class="xp-tb" data-cmd="forward" title="Forward"><span class="xp-tb-ico" data-icon="arrowRight"></span></button>
      <button class="xp-tb" data-cmd="up" title="Up"><span class="xp-tb-ico" data-icon="arrowUp"></span></button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="search"><span class="xp-tb-ico" data-icon="search"></span>Search</button>
      <button class="xp-tb" data-cmd="folders"><span class="xp-tb-ico" data-icon="folder"></span>Folders</button>
      <span class="xp-tb-sep"></span>
      <button class="xp-tb" data-cmd="views"><span class="xp-tb-ico" data-icon="exe"></span>Views</button>
    </div>
    <div class="xp-ie-address"><label>Address</label><div class="xp-ie-url"><span class="xp-ie-url-ico"></span><input type="text" readonly></div><button class="xp-tb" data-cmd="go">Go</button></div>
    <div class="xp-explorer-main"><div class="xp-taskpane"></div><div class="xp-explorer-items" tabindex="0"></div></div>
    <div class="status-bar"><p class="status-bar-field xp-explorer-status"></p><p class="status-bar-field xp-explorer-place"></p></div>`;
  for (const holder of body.querySelectorAll('.xp-tb-ico')) holder.append(iconEl(holder.dataset.icon, 16));
  const address = body.querySelector('.xp-ie-url input');
  const addressIcon = body.querySelector('.xp-ie-url-ico');
  const items = body.querySelector('.xp-explorer-items');
  const taskpane = body.querySelector('.xp-taskpane');
  const status = body.querySelector('.xp-explorer-status');
  const place = body.querySelector('.xp-explorer-place');
  const button = (cmd) => body.querySelector(`[data-cmd="${cmd}"]`);

  const win = wm.open({ appId: 'explorer', title: 'My Computer', icon: 'computer', width: 720, height: 500, minWidth: 420, minHeight: 280, content: body });
  const current = () => history[index];
  const currentNode = () => resolvePath(fs, current()) ?? fs.root;
  const selectedNode = () => currentNode().children?.find((c) => c.name === items.querySelector('.xp-item.selected')?.dataset.name);
  const notAvailable = () => dialogs.message({ title: 'Windows Explorer', kind: 'info', owner: win, text: 'This feature is not available in the demo.' });
  const viewItems = () => [
    { label: 'Thumbnails', checked: view === 'thumbnails', action: () => setView('thumbnails') },
    { label: 'Icons', checked: view === 'icons', action: () => setView('icons') },
    { label: 'Details', checked: view === 'details', action: () => setView('details') },
  ];

  function navigate(path) {
    history.splice(index + 1);
    history.push(path);
    index = history.length - 1;
    render();
  }
  function go(delta) { index = Math.min(Math.max(index + delta, 0), history.length - 1); render(); }
  function setView(next) { view = next; viewLocked = true; render(); }
  function autoView(node) {
    const children = node.children ?? [];
    return children.length > 0 && children.every((c) => c.mediaKind) ? 'thumbnails' : 'icons';
  }
  function openNode(node) {
    if (node.open?.app === 'explorer') { navigate(node.open.payload.path); return; }
    if (node.open) { registry.launch(node.open.app, { ...(node.open.payload ?? {}), owner: win }); return; }
    if (node.children) navigate(node.path);
  }

  function itemEl(child) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'xp-item';
    el.dataset.name = child.name;
    if (view === 'thumbnails' && child.thumb) {
      const img = document.createElement('img');
      img.className = 'xp-item-thumb';
      img.src = `${mediaBase}${child.thumb}`;
      img.alt = '';
      img.addEventListener('error', () => img.replaceWith(iconEl(child.icon, 32)));
      el.append(img);
    } else {
      el.append(iconEl(child.icon, view === 'details' ? 16 : 32));
    }
    const label = document.createElement('span');
    label.className = 'xp-item-label';
    label.textContent = child.name;
    el.append(label);
    if (view === 'details') {
      const type = document.createElement('span');
      type.className = 'xp-item-type';
      type.textContent = TYPE_NAMES[child.kind] ?? 'File';
      el.append(type);
    }
    el.addEventListener('click', () => {
      items.querySelectorAll('.selected').forEach((s) => s.classList.remove('selected'));
      el.classList.add('selected');
      renderTaskPane(currentNode(), child);
    });
    el.addEventListener('dblclick', () => openNode(child));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') openNode(child); });
    return el;
  }

  function detailsLines(node) {
    if (node.project) {
      const p = node.project;
      return [`<b>${esc(p.name)}</b>`, esc(p.tagline), esc(p.description), `<i>${esc(p.tech.join(', '))}</i>`];
    }
    return [`<b>${esc(node.name)}</b><br>${TYPE_NAMES[node.kind] ?? 'File'}`];
  }

  // Kept separate from detailsLines so picking a photo adds to the project's description
  // instead of replacing it -- the description was disappearing before anyone could read it.
  function selectedItemLines(selected) {
    const size = selected.width && selected.height ? `${selected.width} x ${selected.height}` : 'Video file';
    return [`<b>${esc(selected.name)}</b><br>${esc(size)}`];
  }

  function renderTaskPane(node, selected = null) {
    const link = (label, action) => `<a href="#" data-action="${esc(action)}">${esc(label)}</a>`;
    const groups = [];
    if (node === fs.root) {
      groups.push(['System Tasks', [link('View system information', 'sysprops'), link('Add or remove programs', 'unavailable'), link('Change a setting', 'controlpanel')]]);
      groups.push(['Other Places', [link('My Network Places', 'unavailable'), link('My Documents', `nav:${PATHS.myDocuments}`), link('Control Panel', 'controlpanel')]]);
    } else if (node === fs.recycle) {
      groups.push(['Recycle Bin Tasks', [link('Empty the Recycle Bin', 'unavailable'), link('Restore all items', 'unavailable')]]);
      groups.push(['Other Places', [link('My Computer', `nav:${PATHS.myComputer}`), link('My Documents', `nav:${PATHS.myDocuments}`)]]);
    } else {
      const parent = parentPath(node.path);
      const parentLabel = parent === PATHS.myComputer ? 'My Computer' : parent.split('\\').pop();
      const tasks = [link('Make a new folder', 'unavailable'), link('Publish this folder to the Web', 'unavailable'), link('Share this folder', 'unavailable')];
      if (node.project) tasks.unshift(link('View as a slide show', `slideshow:${node.project.slug}`));
      groups.push(['File and Folder Tasks', tasks]);
      groups.push(['Other Places', [link(parentLabel, `nav:${parent}`), link('My Documents', `nav:${PATHS.myDocuments}`), link('My Computer', `nav:${PATHS.myComputer}`)]]);
    }
    groups.push(['Details', detailsLines(node)]);
    if (selected?.mediaKind) groups.push(['Selected Item', selectedItemLines(selected)]);
    taskpane.innerHTML = groups.map(([title, lines]) =>
      `<div class="xp-taskpane-group"><div class="xp-taskpane-title">${title}</div><div class="xp-taskpane-body">${lines.map((l) => `<div>${l}</div>`).join('')}</div></div>`).join('');
  }

  function render() {
    const node = currentNode();
    if (!viewLocked) view = autoView(node);
    address.value = node.path;
    addressIcon.replaceChildren(iconEl(node.icon, 16));
    win.setTitle(node.name);
    place.textContent = node.path.startsWith(PATHS.recycleBin) ? 'Recycle Bin' : 'My Computer';
    items.className = `xp-explorer-items xp-view-${view}`;
    items.innerHTML = view === 'details'
      ? '<div class="xp-item xp-item-header"><span class="xp-ico" style="width:16px;height:16px"></span><span class="xp-item-label">Name</span><span class="xp-item-type">Type</span></div>'
      : '';
    for (const child of node.children ?? []) items.append(itemEl(child));
    status.textContent = `${node.children?.length ?? 0} object(s)`;
    renderTaskPane(node);
    button('back').disabled = index === 0;
    button('forward').disabled = index >= history.length - 1;
    button('up').disabled = parentPath(node.path) === null;
  }

  attachMenubar(body.querySelector('.xp-explorer-menubar'), menus, {
    File: () => [
      { label: 'Open', disabled: !selectedNode(), action: () => { const n = selectedNode(); if (n) openNode(n); } },
      { separator: true },
      { label: 'Close', action: () => win.close() },
    ],
    Edit: [{ label: 'Select All', shortcut: 'Ctrl+A', action: () => items.querySelectorAll('.xp-item:not(.xp-item-header)').forEach((i) => i.classList.add('selected')) }],
    View: viewItems,
    Favorites: [{ label: 'Homepage', action: () => registry.launch('iexplore') }],
    Tools: [{ label: 'Folder Options...', action: notAvailable }],
    Help: [{ label: 'About Windows', action: () => registry.launch('sysprops') }],
  });
  taskpane.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-action]');
    if (!a) return;
    e.preventDefault();
    const action = a.dataset.action;
    if (action.startsWith('nav:')) navigate(action.slice(4));
    else if (action.startsWith('slideshow:')) registry.launch('viewer', { slug: action.slice(10), index: 0, slideshow: true });
    else if (action === 'unavailable') notAvailable();
    else registry.launch(action);
  });
  body.addEventListener('click', (e) => {
    const cmd = e.target.closest('[data-cmd]')?.dataset.cmd;
    if (!cmd) return;
    if (cmd === 'back') go(-1);
    else if (cmd === 'forward') go(1);
    else if (cmd === 'up') { const p = parentPath(current()); if (p !== null) navigate(p); }
    else if (cmd === 'views') menus.open(e.target.closest('[data-cmd]'), viewItems());
    else if (cmd === 'go') render();
    else notAvailable();
  });
  items.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const { x, y } = toDesktopPoint(e.clientX, e.clientY);
    const node = currentNode();
    menus.openAt(x, y, [
      { label: 'View', action: () => menus.openAt(x, y, viewItems()) },
      { label: 'Refresh', action: render },
      { separator: true },
      { label: 'Properties', action: () => (node === fs.root ? registry.launch('sysprops') : notAvailable()) },
    ]);
  });

  render();
  return win;
}
