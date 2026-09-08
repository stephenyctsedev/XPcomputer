/** One popup menu at a time, appended to the screen element so it can overflow windows. */
export function createMenus(screenEl, { sounds } = {}) {
  let current = null;
  let currentOnClose = null;

  function onDocumentDown(e) { if (current && !current.contains(e.target)) close(); }
  function close() {
    if (!current) return;
    current.remove();
    current = null;
    document.removeEventListener('pointerdown', onDocumentDown, true);
    const onClose = currentOnClose;
    currentOnClose = null;
    onClose?.();
  }
  /** Viewport rect -> desktop-space coordinates (the screen may be CSS-scaled). */
  function toLocal(rect) {
    const base = screenEl.getBoundingClientRect();
    const s = (base.width / screenEl.offsetWidth) || 1;
    return { x: (rect.left - base.left) / s, y: (rect.top - base.top) / s, w: rect.width / s, h: rect.height / s };
  }
  function build(items) {
    const menu = document.createElement('div');
    menu.className = 'xp-menu';
    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'xp-menu-sep';
        menu.append(sep);
        continue;
      }
      const row = document.createElement('button');
      row.className = 'xp-menu-item';
      row.type = 'button';
      row.disabled = Boolean(item.disabled);
      row.innerHTML = '<span class="xp-menu-check"></span><span class="xp-menu-label"></span><span class="xp-menu-shortcut"></span>';
      row.querySelector('.xp-menu-check').textContent = item.checked ? '✓' : '';
      row.querySelector('.xp-menu-label').textContent = item.label;
      row.querySelector('.xp-menu-shortcut').textContent = item.shortcut ?? '';
      row.addEventListener('click', () => { close(); item.action?.(); });
      menu.append(row);
    }
    return menu;
  }
  function place(menu, x, y, onClose) {
    screenEl.append(menu);
    current = menu;
    currentOnClose = onClose ?? null;
    const maxX = Math.max(0, (screenEl.offsetWidth || 1024) - menu.offsetWidth);
    const maxY = Math.max(0, (screenEl.offsetHeight || 768) - menu.offsetHeight);
    menu.style.left = `${Math.min(x, maxX)}px`;
    menu.style.top = `${Math.min(y, maxY)}px`;
    document.addEventListener('pointerdown', onDocumentDown, true);
    sounds?.play('menu');
    return menu;
  }
  /** onClose, if given, fires synchronously (from close()) the moment this menu stops being the open one. */
  function open(anchorEl, items, { align = 'below', onClose } = {}) {
    close();
    const a = toLocal(anchorEl.getBoundingClientRect());
    return place(build(items), a.x, align === 'below' ? a.y + a.h : a.y, onClose);
  }
  function openAt(x, y, items, onClose) {
    close();
    return place(build(items), x, y, onClose);
  }
  return { open, openAt, close, get isOpen() { return current !== null; } };
}

/** defs: { File: items[], Edit: items[] ... }. Items may be arrays or functions returning arrays (evaluated on open). */
export function attachMenubar(barEl, menus, defs) {
  barEl.classList.add('xp-menubar');
  barEl.innerHTML = '';
  for (const [name, items] of Object.entries(defs)) {
    const span = document.createElement('span');
    span.className = 'xp-menubar-item';
    span.textContent = name;
    span.addEventListener('click', () => {
      span.classList.add('open');
      menus.open(span, typeof items === 'function' ? items() : items, { onClose: () => span.classList.remove('open') });
    });
    barEl.append(span);
  }
}
