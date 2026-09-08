import { iconEl } from './icons/index.js';

export function createStartMenu(rootEl, { userName, left, right, allPrograms, onLogOff, onTurnOff, sounds }) {
  rootEl.classList.add('xp-startmenu');
  rootEl.hidden = true;
  rootEl.innerHTML = `
    <div class="xp-sm-header"><span class="xp-sm-avatar"></span><span class="xp-sm-user"></span></div>
    <div class="xp-sm-columns"><div class="xp-sm-left"></div><div class="xp-sm-right"></div></div>
    <div class="xp-sm-footer">
      <button type="button" class="xp-sm-footer-btn" data-cmd="logoff"><span class="xp-sm-footer-ico"></span>Log Off</button>
      <button type="button" class="xp-sm-footer-btn" data-cmd="turnoff"><span class="xp-sm-footer-ico"></span>Turn Off Computer</button>
    </div>
    <div class="xp-sm-flyouts"></div>`;
  rootEl.querySelector('.xp-sm-avatar').append(iconEl('user', 40));
  rootEl.querySelector('.xp-sm-user').textContent = userName;
  rootEl.querySelectorAll('.xp-sm-footer-ico')[0].append(iconEl('logoff', 22));
  rootEl.querySelectorAll('.xp-sm-footer-ico')[1].append(iconEl('power', 22));
  const leftCol = rootEl.querySelector('.xp-sm-left');
  const rightCol = rootEl.querySelector('.xp-sm-right');
  const flyouts = rootEl.querySelector('.xp-sm-flyouts');
  let isOpen = false;

  function row(item, { iconSize = 24, arrow = false } = {}) {
    if (item.separator) { const sep = document.createElement('div'); sep.className = 'xp-sm-sep'; return sep; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-sm-item';
    b.append(iconEl(item.icon, iconSize));
    const text = document.createElement('span');
    text.className = 'xp-sm-text';
    text.innerHTML = `<span class="xp-sm-label"></span>${item.sublabel ? '<span class="xp-sm-sublabel"></span>' : ''}`;
    text.querySelector('.xp-sm-label').textContent = item.label;
    if (item.sublabel) text.querySelector('.xp-sm-sublabel').textContent = item.sublabel;
    b.append(text);
    if (arrow || item.children) { const a = document.createElement('span'); a.className = 'xp-sm-arrow'; a.textContent = '▸'; b.append(a); }
    return b;
  }

  function clearFlyouts(fromLevel = 0) {
    [...flyouts.children].filter((f) => Number(f.dataset.level) >= fromLevel).forEach((f) => f.remove());
  }
  function showFlyout(items, level, anchorEl) {
    clearFlyouts(level);
    const panel = document.createElement('div');
    panel.className = 'xp-sm-flyout';
    panel.dataset.level = String(level);
    for (const item of items) {
      const el = row(item, { iconSize: 16 });
      if (item.children) el.addEventListener('mouseenter', () => showFlyout(item.children, level + 1, el));
      else if (item.action) el.addEventListener('mouseenter', () => clearFlyouts(level + 1));
      if (!item.separator && item.action) el.addEventListener('click', () => { close(); item.action(); });
      panel.append(el);
    }
    flyouts.append(panel);
    const menuRect = rootEl.getBoundingClientRect();
    const scale = menuRect.width / rootEl.offsetWidth || 1;
    const anchorRect = anchorEl.getBoundingClientRect();
    panel.style.left = `${level === 0 ? rootEl.offsetWidth - 4 : rootEl.offsetWidth + level * 190}px`;
    panel.style.bottom = `${Math.max(0, (menuRect.bottom - anchorRect.bottom) / scale - 2)}px`;
  }

  for (const item of left) {
    const el = row(item, { iconSize: item.sublabel ? 32 : 24 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    leftCol.append(el);
  }
  const all = row({ label: 'All Programs', icon: 'exe' }, { arrow: true });
  all.classList.add('xp-sm-allprograms');
  all.addEventListener('click', () => showFlyout(allPrograms, 0, all));
  all.addEventListener('mouseenter', () => showFlyout(allPrograms, 0, all));
  leftCol.append(all);
  for (const item of right) {
    const el = row(item, { iconSize: 22 });
    if (!item.separator) el.addEventListener('click', () => { close(); item.action(); });
    rightCol.append(el);
  }
  rootEl.querySelector('[data-cmd="logoff"]').addEventListener('click', () => { close(); onLogOff(); });
  rootEl.querySelector('[data-cmd="turnoff"]').addEventListener('click', () => { close(); onTurnOff(); });
  rootEl.querySelector('.xp-sm-columns').addEventListener('mouseenter', (e) => { if (!e.target.closest('.xp-sm-allprograms')) clearFlyouts(0); }, true);
  rootEl.querySelector('.xp-sm-right').addEventListener('mouseenter', () => clearFlyouts(0));

  function onDocumentDown(e) { if (isOpen && !rootEl.contains(e.target) && !e.target.closest('.xp-start')) close(); }
  function onKey(e) { if (e.key === 'Escape') close(); }
  function open() {
    if (isOpen) return;
    isOpen = true;
    rootEl.hidden = false;
    sounds?.play('menu');
    document.addEventListener('pointerdown', onDocumentDown, true);
    document.addEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: true }));
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    rootEl.hidden = true;
    clearFlyouts(0);
    document.removeEventListener('pointerdown', onDocumentDown, true);
    document.removeEventListener('keydown', onKey);
    rootEl.dispatchEvent(new CustomEvent('startmenu:toggle', { detail: false }));
  }
  return { open, close, toggle: () => (isOpen ? close() : open()), get isOpen() { return isOpen; } };
}
