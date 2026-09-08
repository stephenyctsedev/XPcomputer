import '../styles/room.css';
import { createRoom } from './index.js';
import { createLoadingScreen } from './LoadingScreen.js';

const LOWFX_KEY = 'xpcomputer.lowfx';

/** Wire the 3D room to the desktop controller. Throws if the room cannot start. */
export async function mountRoom(app, screenEl, desktop, { reducedMotion = false } = {}) {
  const container = document.createElement('div');
  container.className = 'room';
  app.append(container);
  const loading = createLoadingScreen(container);
  loading.log('XPcomputer BIOS v1.0');
  loading.log('Loading room geometry ...');
  const storage = desktop.ctx.storage;
  let room;
  try {
    room = createRoom(container, screenEl, { reducedMotion, lowFx: storage.get(LOWFX_KEY) === '1' });
  } catch (err) {
    container.remove();
    throw err;
  }
  loading.log('Warming up neon ........ OK');
  loading.log('Starting renderer ...');

  const hud = document.createElement('div');
  hud.className = 'room-hud';
  hud.innerHTML = `
    <button type="button" class="room-btn room-back" hidden>&larr; Back to room <kbd>Esc</kbd></button>
    <button type="button" class="room-btn room-lowfx" title="Turn bloom and high resolution off for slower machines">Low FX: <span></span></button>
    <div class="room-hint">Click the computer</div>`;
  container.append(hud);
  const back = hud.querySelector('.room-back');
  const lowfx = hud.querySelector('.room-lowfx');
  const hint = hud.querySelector('.room-hint');
  const renderLowFx = () => { lowfx.querySelector('span').textContent = storage.get(LOWFX_KEY) === '1' ? 'on' : 'off'; };
  renderLowFx();
  lowfx.addEventListener('click', () => {
    const next = storage.get(LOWFX_KEY) === '1' ? '0' : '1';
    storage.set(LOWFX_KEY, next);
    room.setLowFx(next === '1');
    renderLowFx();
  });

  room.on('pcClicked', () => { hint.hidden = true; room.focusScreen(); desktop.powerOn(); });
  room.on('screenFocused', () => { desktop.setInteractive(true); back.hidden = false; screenEl.focus({ preventScroll: true }); });
  room.on('screenLeft', () => { desktop.setInteractive(false); back.hidden = true; });
  room.on('firstFrame', () => loading.done());
  back.addEventListener('click', () => room.leaveScreen());

  // Capture phase: runs before the shell's own Escape handlers. If a menu or dialog is open, Escape belongs to the shell.
  const shellBusy = () => screenEl.querySelector('.xp-startmenu:not([hidden]), .xp-menu, .xp-dialog') !== null;
  const onKeydown = (e) => {
    if (e.key !== 'Escape' || room.state !== 'screen' || shellBusy()) return;
    e.preventDefault();
    room.leaveScreen();
  };
  window.addEventListener('keydown', onKeydown, true);

  const offBooted = desktop.on('booted', () => room.setPower(true));
  const offShutdown = desktop.on('shutdown', () => { room.setPower(false); room.leaveScreen(); });
  room.setPower(desktop.isOn);

  // room.dispose() only tears down what createRoom() itself registered. Wrap it so the
  // mount-level keydown listener and desktop subscriptions above are released too.
  return {
    ...room,
    get state() { return room.state; },
    dispose() {
      window.removeEventListener('keydown', onKeydown, true);
      offBooted();
      offShutdown();
      room.dispose();
    },
  };
}
