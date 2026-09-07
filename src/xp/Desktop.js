import { iconEl } from './icons/index.js';

/** Desktop icon column. Single click selects, double click / Enter launches, arrows move. */
export function createDesktopIcons(container, defs) {
  container.classList.add('xp-icons');
  let selected = null;
  const buttons = defs.map((def) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `xp-desktop-icon${def.corner ? ' xp-desktop-icon-corner' : ''}`;
    b.dataset.id = def.id;
    b.append(iconEl(def.icon, 32));
    const label = document.createElement('span');
    label.className = 'xp-desktop-icon-label';
    label.textContent = def.label;
    b.append(label);
    b.addEventListener('click', (e) => { e.stopPropagation(); select(b); });
    b.addEventListener('dblclick', () => def.launch());
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter') def.launch(); });
    container.append(b);
    return b;
  });
  function select(b) {
    selected?.classList.remove('selected');
    selected = b;
    b?.classList.add('selected');
    b?.focus();
  }
  container.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const i = buttons.indexOf(selected);
    select(buttons[(i + (e.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length]);
  });
  return { select, clear: () => select(null), buttons };
}
