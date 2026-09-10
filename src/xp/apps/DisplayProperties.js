import { iconEl } from '../icons/index.js';

export const WALLPAPERS = {
  hills: { name: 'Rolling Hills', css: (url) => `#3a6ea5 url("${url}") center / cover no-repeat` },
  neon: { name: 'Neon Night', css: () => 'radial-gradient(ellipse at 30% 20%, #4b2a7f, transparent 55%), radial-gradient(ellipse at 80% 80%, #0b5c73, transparent 50%), #0b0714' },
  none: { name: 'None', css: () => '#3a6ea5' },
};
const KEY = 'xpcomputer.wallpaper';

export function applyWallpaper(desktopEl, key, wallpaperUrl) {
  const wallpaper = WALLPAPERS[key] ?? WALLPAPERS.hills;
  desktopEl.style.background = wallpaper.css(wallpaperUrl);
}

export function registerDisplayProperties(registry) {
  registry.register('display', { name: 'Display Properties', icon: 'controlpanel', launch: openDisplayProperties });
}

export function openDisplayProperties(ctx) {
  const { wm, storage, desktopEl, wallpaperUrl } = ctx;
  const existing = wm.find('display')[0];
  if (existing) { existing.focus(); return existing; }
  let choice = WALLPAPERS[storage.get(KEY)] ? storage.get(KEY) : 'hills';
  const content = document.createElement('div');
  content.className = 'xp-display';
  content.innerHTML = `
    <menu role="tablist"><li role="tab"><a href="#themes">Themes</a></li><li role="tab" aria-selected="true"><a href="#desktop">Desktop</a></li><li role="tab"><a href="#settings">Settings</a></li></menu>
    <div class="window" role="tabpanel">
      <div class="xp-display-monitor"><div class="xp-display-preview"></div><span class="xp-display-stand"></span></div>
      <div class="field-row-stacked"><label for="xp-wallpaper">Background:</label>
        <select id="xp-wallpaper">${Object.entries(WALLPAPERS).map(([k, w]) => `<option value="${k}">${w.name}</option>`).join('')}</select></div>
      <p class="xp-display-note">Themes and Settings are display-only in this demo.</p>
    </div>
    <div class="xp-msgbox-buttons xp-display-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button><button type="button" data-result="Apply">Apply</button></div>`;
  const preview = content.querySelector('.xp-display-preview');
  const select = content.querySelector('select');
  select.value = choice;
  const showPreview = () => { preview.style.background = WALLPAPERS[choice].css(wallpaperUrl); };
  showPreview();
  select.addEventListener('change', () => { choice = select.value; showPreview(); });
  const win = wm.open({ appId: 'display', title: 'Display Properties', icon: 'controlpanel', dialog: true, width: 400, height: 430, content });
  const apply = () => { storage.set(KEY, choice); applyWallpaper(desktopEl, choice, wallpaperUrl); };
  content.querySelector('[role="tablist"]').addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (!tab) return;
    e.preventDefault();
  });
  content.addEventListener('click', (e) => {
    const result = e.target.closest('[data-result]')?.dataset.result;
    if (result === 'OK') { apply(); win.close(); }
    else if (result === 'Apply') apply();
    else if (result === 'Cancel') win.close();
  });
  content.querySelector('.xp-display-stand').append(iconEl('computer', 0));
  return win;
}
