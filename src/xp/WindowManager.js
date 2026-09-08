import { iconEl } from './icons/index.js';

export const DESKTOP_WIDTH = 1024;
export const DESKTOP_HEIGHT = 768;
export const TASKBAR_HEIGHT = 30;

/** Keep at least `keep` px of a window inside the desktop. Pure. */
export function clampPosition(x, y, w, h, deskW, deskH, keep = 40) {
  const minX = -(w - keep);
  const maxX = deskW - keep;
  const maxY = deskH - keep;
  return { x: Math.min(Math.max(x, minX), maxX), y: Math.min(Math.max(y, 0), maxY) };
}

let idSeq = 0;

export function createWindowManager(layerEl, { deskW = DESKTOP_WIDTH, deskH = DESKTOP_HEIGHT - TASKBAR_HEIGHT, cascadeStep = 24 } = {}) {
  const windows = [];
  const listeners = new Map();
  const memory = new Map(); // appId -> last bounds
  let zTop = 10;
  let cascade = 0;
  let focused = null;

  function on(event, fn) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  }
  const emit = (event, win) => { for (const fn of listeners.get(event) ?? []) fn(win); };

  /** Pointer deltas arrive in viewport px; the desktop may be CSS-scaled. */
  function scale() {
    const rect = layerEl.getBoundingClientRect();
    return rect.width > 0 ? rect.width / deskW : 1;
  }
  function topVisible(except) {
    return windows.filter((w) => w !== except && !w.isMinimized).sort((a, b) => b.z - a.z)[0] ?? null;
  }
  function setFocused(win) {
    if (focused === win) return;
    focused?.el.classList.remove('xp-active');
    focused = win;
    if (!win) return;
    win.el.classList.add('xp-active');
    win.z = ++zTop;
    win.el.style.zIndex = String(win.z);
    emit('focus', win);
  }
  function applyBounds(win, b) {
    win.bounds = { x: b.x, y: b.y, w: b.w, h: b.h };
    Object.assign(win.el.style, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px` });
  }
  function trackPointer(onMove) {
    const up = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  }

  function open(opts) {
    const {
      appId, title, icon = 'exe', width = 500, height = 380, minWidth = 200, minHeight = 120,
      resizable = true, dialog = false, content, onClose, x, y,
    } = opts;
    const remembered = dialog ? null : memory.get(appId);
    const w = remembered?.w ?? width;
    const h = remembered?.h ?? height;
    let px = x ?? remembered?.x;
    let py = y ?? remembered?.y;
    if (px === undefined || py === undefined) {
      px = 60 + cascade * cascadeStep;
      py = 40 + cascade * cascadeStep;
      cascade = (cascade + 1) % 8;
    }
    ({ x: px, y: py } = clampPosition(px, py, w, h, deskW, deskH));

    const el = document.createElement('div');
    el.className = `window xp-window${dialog ? ' xp-dialog' : ''}`;
    el.innerHTML = `
      <div class="title-bar">
        <div class="title-bar-text"></div>
        <div class="title-bar-controls">
          <button aria-label="Minimize"></button>
          <button aria-label="Maximize"></button>
          <button aria-label="Close"></button>
        </div>
      </div>
      <div class="window-body xp-window-body"></div>
      <div class="xp-resize-handle"></div>`;
    const titleText = document.createTextNode(title);
    el.querySelector('.title-bar-text').append(iconEl(icon, 16, 'xp-title-icon'), titleText);
    const contentEl = el.querySelector('.xp-window-body');
    if (typeof content === 'string') contentEl.innerHTML = content;
    else if (content) contentEl.append(content);
    if (dialog) {
      el.querySelector('[aria-label="Minimize"]').remove();
      el.querySelector('[aria-label="Maximize"]').remove();
      el.querySelector('.xp-resize-handle').remove();
    } else if (!resizable) {
      el.querySelector('[aria-label="Maximize"]').disabled = true;
      el.querySelector('.xp-resize-handle').remove();
    }

    const win = {
      id: `win-${++idSeq}`, appId, title, icon, el, contentEl, z: 0,
      bounds: { x: px, y: py, w, h }, savedBounds: null,
      isMinimized: false, isMaximized: false, isDialog: dialog,
      get isFocused() { return focused === win; },
      focus() { if (win.isMinimized) win.restore(); else setFocused(win); },
      minimize() {
        if (win.isMinimized || dialog) return;
        win.isMinimized = true;
        el.hidden = true;
        if (focused === win) { focused = null; el.classList.remove('xp-active'); setFocused(topVisible(win)); }
        emit('minimize', win);
      },
      restore() {
        if (!win.isMinimized) return;
        win.isMinimized = false;
        el.hidden = false;
        setFocused(win);
        emit('restore', win);
      },
      maximize() {
        if (win.isMaximized || dialog || !resizable) return;
        win.savedBounds = { ...win.bounds };
        win.isMaximized = true;
        el.classList.add('xp-maximized');
        applyBounds(win, { x: 0, y: 0, w: deskW, h: deskH });
        emit('maximize', win);
      },
      toggleMaximize() {
        if (!win.isMaximized) { win.maximize(); return; }
        win.isMaximized = false;
        el.classList.remove('xp-maximized');
        applyBounds(win, win.savedBounds);
        emit('unmaximize', win);
      },
      close() {
        const idx = windows.indexOf(win);
        if (idx < 0) return;
        windows.splice(idx, 1);
        if (!dialog) memory.set(appId, { ...(win.isMaximized ? win.savedBounds : win.bounds) });
        el.remove();
        if (focused === win) { focused = null; setFocused(topVisible()); }
        onClose?.(win);
        emit('close', win);
      },
      setTitle(text) { win.title = text; titleText.data = text; emit('title', win); },
      resize(w, h) {
        if (win.isMaximized) return;
        const nw = Math.max(minWidth, w);
        const nh = Math.max(minHeight, h);
        const c = clampPosition(win.bounds.x, win.bounds.y, nw, nh, deskW, deskH);
        applyBounds(win, { x: c.x, y: c.y, w: nw, h: nh });
        emit('resize', win);
      },
    };

    const titleBar = el.querySelector('.title-bar');
    titleBar.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.title-bar-controls') || win.isMaximized) return;
      e.preventDefault();
      const s = scale();
      const start = { x: e.clientX, y: e.clientY, bx: win.bounds.x, by: win.bounds.y };
      trackPointer((ev) => {
        const c = clampPosition(start.bx + (ev.clientX - start.x) / s, start.by + (ev.clientY - start.y) / s, win.bounds.w, win.bounds.h, deskW, deskH);
        applyBounds(win, { ...win.bounds, x: c.x, y: c.y });
      });
    });
    titleBar.addEventListener('dblclick', (e) => { if (!e.target.closest('.title-bar-controls')) win.toggleMaximize(); });
    el.querySelector('.xp-resize-handle')?.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const s = scale();
      const start = { x: e.clientX, y: e.clientY, w: win.bounds.w, h: win.bounds.h };
      trackPointer((ev) => {
        const nw = Math.max(minWidth, Math.min(start.w + (ev.clientX - start.x) / s, deskW - win.bounds.x));
        const nh = Math.max(minHeight, Math.min(start.h + (ev.clientY - start.y) / s, deskH - win.bounds.y));
        applyBounds(win, { ...win.bounds, w: nw, h: nh });
      });
    });
    el.querySelector('[aria-label="Close"]').addEventListener('click', () => win.close());
    el.querySelector('[aria-label="Minimize"]')?.addEventListener('click', () => win.minimize());
    el.querySelector('[aria-label="Maximize"]')?.addEventListener('click', () => win.toggleMaximize());
    el.addEventListener('pointerdown', () => setFocused(win), true);

    applyBounds(win, win.bounds);
    windows.push(win);
    layerEl.append(el);
    emit('open', win);
    setFocused(win);
    return win;
  }

  return {
    open,
    on,
    get windows() { return [...windows]; },
    get focused() { return focused; },
    blur() { focused?.el.classList.remove('xp-active'); focused = null; },
    closeAll() { [...windows].forEach((w) => w.close()); },
    find(appId) { return windows.filter((w) => w.appId === appId); },
    deskW,
    deskH,
  };
}
