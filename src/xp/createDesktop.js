import 'xp.css/dist/XP.css';
import '../styles/xp-overrides.css';
import wallpaperUrl from './wallpaper.svg';
import { createWindowManager, DESKTOP_WIDTH } from './WindowManager.js';
import { createDialogs } from './Dialog.js';
import { createMenus } from './Menu.js';
import { createSounds, safeStorage } from './sounds.js';
import { createDesktopIcons } from './Desktop.js';
import { createTaskbar } from './Taskbar.js';
import { createStartMenu } from './StartMenu.js';
import { createBoot } from './Boot.js';
import { createRegistry } from './apps/registry.js';
import { registerInternetExplorer } from './apps/InternetExplorer.js';
import { registerAdobeReader } from './apps/AdobeReader.js';
import { registerExplorer } from './apps/Explorer.js';
import { registerNotepad } from './apps/Notepad.js';
import { registerSystemProperties } from './apps/SystemProperties.js';
import { registerMisc } from './apps/misc.js';
import { buildFileSystem, PATHS } from '../data/filesystem.js';

const RUNNABLE = ['iexplore', 'winmine', 'sol', 'pinball', 'notepad', 'explorer', 'sysprops', 'help', 'controlpanel'];
const NOT_WIN32 = ['cmd', 'calc', 'regedit', 'msconfig'];

function defaultOpenExternal(url) {
  if (url.startsWith('mailto:')) { location.href = url; return; }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function createDesktop(rootEl, { resume, pdfHref, repoUrl, storage = safeStorage(), reducedMotion = false, openExternal = defaultOpenExternal } = {}) {
  rootEl.classList.add('xp-screen');
  rootEl.tabIndex = -1;
  rootEl.innerHTML = `
    <div class="xp-desktop"><div class="xp-icons-layer"></div><div class="xp-windows"></div></div>
    <div class="xp-taskbar-root"></div>
    <div class="xp-startmenu-root"></div>
    <div class="xp-crt"></div>`;
  rootEl.style.setProperty('--xp-wallpaper', `url("${wallpaperUrl}")`);
  const desktopEl = rootEl.querySelector('.xp-desktop');

  const listeners = new Map();
  const on = (event, fn) => { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn); return () => listeners.get(event).delete(fn); };
  const emit = (event, data) => { for (const fn of listeners.get(event) ?? []) fn(data); };

  const sounds = createSounds({ storage });
  const wm = createWindowManager(rootEl.querySelector('.xp-windows'));
  const dialogs = createDialogs(wm, { sounds });
  const menus = createMenus(rootEl, { sounds });
  const fs = buildFileSystem(resume);
  const toDesktopPoint = (clientX, clientY) => {
    const rect = rootEl.getBoundingClientRect();
    const s = rect.width / DESKTOP_WIDTH || 1;
    return { x: (clientX - rect.left) / s, y: (clientY - rect.top) / s };
  };
  const ctx = { wm, dialogs, menus, sounds, resume, fs, pdfHref, repoUrl, storage, openExternal, screenEl: rootEl, toDesktopPoint };
  const registry = createRegistry(ctx);
  ctx.registry = registry;
  registerInternetExplorer(registry);
  registerAdobeReader(registry);
  registerExplorer(registry);
  registerNotepad(registry);
  registerSystemProperties(registry);
  registerMisc(registry);
  const launch = (id, payload) => () => registry.launch(id, payload);

  const icons = createDesktopIcons(rootEl.querySelector('.xp-icons-layer'), [
    { id: 'iexplore', label: 'Internet Explorer', icon: 'ie', launch: launch('iexplore') },
    { id: 'computer', label: 'My Computer', icon: 'computer', launch: launch('explorer', { path: PATHS.myComputer }) },
    { id: 'documents', label: 'My Documents', icon: 'documents', launch: launch('explorer', { path: PATHS.myDocuments }) },
    { id: 'recycle', label: 'Recycle Bin', icon: 'recycle', corner: true, launch: launch('explorer', { path: PATHS.recycleBin }) },
  ]);

  const boot = createBoot(rootEl, { sounds, reducedMotion, onState: (s) => { rootEl.dataset.power = s; }, onPowerRequest: () => powerOn() });

  function runCommand(command) {
    const key = command.trim().toLowerCase().replace(/\.exe$/, '');
    if (NOT_WIN32.includes(key)) { dialogs.message({ title: command, kind: 'error', text: `${command} is not a valid Win32 application.` }); return; }
    registry.launch(RUNNABLE.includes(key) ? key : command);
  }
  async function turnOffDialog() {
    const answer = await dialogs.message({ title: 'Turn off computer', kind: 'question', text: 'What do you want the computer to do?', buttons: ['Stand By', 'Turn Off', 'Restart', 'Cancel'], defaultButton: 1 });
    if (answer === 'Stand By') { boot.standBy(); return; }
    if (answer !== 'Turn Off' && answer !== 'Restart') return;
    wm.closeAll();
    taskbar.hideBalloon();
    await boot.shutdown({ restart: answer === 'Restart' });
    if (answer === 'Turn Off') emit('shutdown'); else onBooted();
  }
  async function logOff() {
    wm.closeAll();
    await boot.logOff();
    emit('logoff');
    onBooted();
  }

  const startMenu = createStartMenu(rootEl.querySelector('.xp-startmenu-root'), {
    userName: resume.displayName.split(' ')[0],
    sounds,
    left: [
      { label: 'Internet', sublabel: 'Internet Explorer', icon: 'ie', action: launch('iexplore') },
      { label: 'E-mail', sublabel: 'Outlook Express', icon: 'mail', action: () => openExternal(`mailto:${resume.contact.email}`) },
      { separator: true },
      { label: 'Notepad', icon: 'notepad', action: launch('notepad') },
      { label: 'Minesweeper', icon: 'mine', action: launch('winmine') },
      { label: 'Solitaire', icon: 'cards', action: launch('sol') },
      { label: 'Pinball', icon: 'pinball', action: launch('pinball') },
    ],
    right: [
      { label: 'My Documents', icon: 'documents', action: launch('explorer', { path: PATHS.myDocuments }) },
      { label: 'My Pictures', icon: 'folder', action: launch('explorer', { path: `${PATHS.myDocuments}\\My Pictures` }) },
      { label: 'My Computer', icon: 'computer', action: launch('explorer', { path: PATHS.myComputer }) },
      { separator: true },
      { label: 'Control Panel', icon: 'controlpanel', action: launch('controlpanel') },
      { separator: true },
      { label: 'Help and Support', icon: 'help', action: launch('help') },
      { label: 'Run...', icon: 'run', action: () => dialogs.run({ onRun: runCommand }) },
    ],
    allPrograms: [
      { label: 'Accessories', icon: 'folder', children: [{ label: 'Notepad', icon: 'notepad', action: launch('notepad') }] },
      { label: 'Games', icon: 'folder', children: [
        { label: 'Minesweeper', icon: 'mine', action: launch('winmine') },
        { label: 'Pinball', icon: 'pinball', action: launch('pinball') },
        { label: 'Solitaire', icon: 'cards', action: launch('sol') },
      ] },
      { label: 'Internet Explorer', icon: 'ie', action: launch('iexplore') },
    ],
    onLogOff: logOff,
    onTurnOff: turnOffDialog,
  });
  const taskbar = createTaskbar(rootEl.querySelector('.xp-taskbar-root'), { wm, sounds, onStart: () => startMenu.toggle() });
  rootEl.querySelector('.xp-startmenu-root').addEventListener('startmenu:toggle', (e) => taskbar.setStartActive(e.detail));

  let firstBoot = true;
  function onBooted() {
    emit('booted');
    if (!firstBoot) return;
    firstBoot = false;
    setTimeout(() => taskbar.showBalloon({ title: 'Welcome!', text: 'Double-click Internet Explorer to view my resume.', onClick: launch('iexplore') }), 1200);
  }
  async function powerOn() {
    if (boot.state !== 'off') return;
    await boot.powerOn();
    onBooted();
  }
  async function powerOff() {
    wm.closeAll();
    startMenu.close();
    await boot.shutdown();
    emit('shutdown');
  }
  function setInteractive(enabled) {
    rootEl.classList.toggle('xp-interactive', enabled);
    rootEl.querySelector('.xp-crt').hidden = enabled;
    if (!enabled) { startMenu.close(); menus.close(); }
  }

  desktopEl.addEventListener('pointerdown', (e) => { if (e.target === desktopEl || e.target.classList.contains('xp-icons-layer')) { icons.clear(); wm.blur(); } });
  rootEl.addEventListener('keydown', (e) => { if (e.altKey && e.key === 'F4') { e.preventDefault(); wm.focused?.close(); } });
  rootEl.addEventListener('pointerdown', () => sounds.unlock(), { once: true });
  setInteractive(false);

  return {
    el: rootEl, ctx, powerOn, powerOff, setInteractive, on,
    get isOn() { return boot.state === 'on'; },
    get powerState() { return boot.state; },
    destroy() { taskbar.destroy(); wm.closeAll(); rootEl.innerHTML = ''; },
  };
}
