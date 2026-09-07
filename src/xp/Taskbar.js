import { iconEl } from './icons/index.js';

export function formatClock(date) {
  const hours = date.getHours();
  const h12 = hours % 12 || 12;
  return `${h12}:${String(date.getMinutes()).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
}

export function createTaskbar(rootEl, { wm, sounds, onStart, now = () => new Date() }) {
  rootEl.classList.add('xp-taskbar');
  rootEl.innerHTML = `
    <button class="xp-start" type="button"><span class="xp-start-flag"><i></i><i></i><i></i><i></i></span>start</button>
    <div class="xp-tasks"></div>
    <div class="xp-tray"><button class="xp-tray-mute" type="button" title="Volume"></button><span class="xp-clock"></span></div>
    <div class="xp-balloon" hidden><button class="xp-balloon-close" type="button" aria-label="Close">×</button><div class="xp-balloon-title"></div><div class="xp-balloon-text"></div></div>`;
  const start = rootEl.querySelector('.xp-start');
  const tasks = rootEl.querySelector('.xp-tasks');
  const clock = rootEl.querySelector('.xp-clock');
  const mute = rootEl.querySelector('.xp-tray-mute');
  const balloon = rootEl.querySelector('.xp-balloon');

  start.addEventListener('click', (e) => { e.stopPropagation(); onStart(); });

  const renderMute = () => {
    mute.replaceChildren(iconEl(sounds.isMuted() ? 'speakerMuted' : 'speaker', 16));
    mute.title = sounds.isMuted() ? 'Sound is muted (click to unmute)' : 'Volume (click to mute)';
  };
  if (sounds.available) { renderMute(); mute.addEventListener('click', () => { sounds.toggleMuted(); renderMute(); sounds.play('click'); }); }
  else mute.hidden = true;

  const tick = () => { const d = now(); clock.textContent = formatClock(d); clock.title = d.toDateString(); };
  tick();
  const clockTimer = setInterval(tick, 15000);

  const buttons = new Map();
  const renderTasks = () => {
    for (const [win, b] of buttons) {
      b.classList.toggle('active', win.isFocused && !win.isMinimized);
      b.classList.toggle('minimized', win.isMinimized);
      b.querySelector('.xp-task-label').textContent = win.title;
    }
  };
  const unsubscribers = [];
  unsubscribers.push(wm.on('open', (win) => {
    if (win.isDialog) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'xp-task';
    b.append(iconEl(win.icon, 16));
    const label = document.createElement('span');
    label.className = 'xp-task-label';
    label.textContent = win.title;
    b.append(label);
    b.addEventListener('click', () => {
      if (win.isMinimized) win.restore();
      else if (win.isFocused) win.minimize();
      else win.focus();
    });
    tasks.append(b);
    buttons.set(win, b);
    renderTasks();
  }));
  unsubscribers.push(wm.on('close', (win) => { buttons.get(win)?.remove(); buttons.delete(win); renderTasks(); }));
  for (const ev of ['focus', 'minimize', 'restore', 'title']) unsubscribers.push(wm.on(ev, renderTasks));

  let balloonTimer = null;
  function hideBalloon() { balloon.hidden = true; clearTimeout(balloonTimer); }
  function showBalloon({ title, text, onClick, timeout = 8000 }) {
    balloon.querySelector('.xp-balloon-title').textContent = title;
    balloon.querySelector('.xp-balloon-text').textContent = text;
    balloon.hidden = false;
    sounds.play('balloon');
    clearTimeout(balloonTimer);
    balloonTimer = setTimeout(hideBalloon, timeout);
    balloon.onclick = (e) => { hideBalloon(); if (!e.target.closest('.xp-balloon-close')) onClick?.(); };
  }

  return { el: rootEl, tick, showBalloon, hideBalloon, setStartActive: (on) => start.classList.toggle('active', on), destroy: () => { clearInterval(clockTimer); clearTimeout(balloonTimer); unsubscribers.forEach(fn => fn()); } };
}
