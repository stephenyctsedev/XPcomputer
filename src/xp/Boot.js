import { iconEl } from './icons/index.js';

const BIOS_LINES = [
  'XPcomputer BIOS v1.0   (C) 2026 Stephen Tse',
  'CPU: Game Programmer @ 3.0 GHz',
  'Memory Test: 6+ years of experience ..... OK',
  '',
  'Detecting Primary Master   ... resume.pdf',
  'Detecting Primary Slave    ... projects.txt',
  'Detecting Secondary Master ... none',
  '',
  'Booting from C: ...',
];

export function createBoot(screenEl, { sounds, reducedMotion = false, onState, onPowerRequest } = {}) {
  const layer = document.createElement('div');
  layer.className = 'xp-boot';
  layer.innerHTML = `
    <pre class="xp-bios" hidden></pre>
    <div class="xp-bootlogo" hidden>
      <div class="xp-bootlogo-brand"><span class="xp-flag"><i></i><i></i><i></i><i></i></span><span class="xp-bootlogo-text">Windows <b>XP</b></span></div>
      <div class="xp-progress"><i></i><i></i><i></i></div>
      <div class="xp-bootlogo-foot">Stephen Tse Edition</div>
    </div>
    <div class="xp-welcome" hidden><div class="xp-welcome-text">welcome</div></div>
    <div class="xp-logon" hidden>
      <div class="xp-logon-head">To begin, click your user name</div>
      <button type="button" class="xp-logon-user"><span class="xp-logon-avatar"></span><span>Stephen</span></button>
    </div>
    <div class="xp-shutdown" hidden><div class="xp-shutdown-text">Windows is shutting down...</div></div>
    <div class="xp-off" hidden><span class="xp-off-hint">click to turn on</span></div>`;
  layer.querySelector('.xp-logon-avatar').append(iconEl('user', 40));
  screenEl.append(layer);

  const panes = Object.fromEntries(['bios', 'bootlogo', 'welcome', 'logon', 'shutdown', 'off'].map((k) => [k, layer.querySelector(`.xp-${k}`)]));
  const shutdownText = panes.shutdown.querySelector('.xp-shutdown-text');
  const speed = reducedMotion ? 0.2 : 1;
  let state = 'off';
  let skipRequested = false;
  let resolveWait = null;
  let resolveLogon = null;

  const setState = (next) => { state = next; layer.dataset.state = next; onState?.(next); };
  const showOnly = (name) => {
    for (const [key, el] of Object.entries(panes)) el.hidden = key !== name;
    layer.hidden = name === null;
  };
  const wait = (ms) => new Promise((resolve) => {
    if (skipRequested) { resolve(); return; }
    resolveWait = resolve;
    setTimeout(() => { if (resolveWait === resolve) { resolveWait = null; resolve(); } }, Math.round(ms * speed));
  });
  const requestSkip = () => { skipRequested = true; const r = resolveWait; resolveWait = null; r?.(); };
  const phase = async (name, run) => { skipRequested = false; showOnly(name); await run(); };
  const finishBoot = () => { showOnly(null); setState('on'); sounds?.play('startup'); };

  layer.addEventListener('click', () => {
    if (state === 'booting' || state === 'logon' || state === 'shutting-down') requestSkip();
    else if (state === 'standby') wake();
    else if (state === 'off') onPowerRequest?.();
  });
  panes.logon.querySelector('.xp-logon-user').addEventListener('click', async (e) => {
    e.stopPropagation();
    if (state !== 'logon' || panes.logon.hidden) return;
    await phase('welcome', () => wait(800));
    finishBoot();
    resolveLogon?.();
    resolveLogon = null;
  });

  async function powerOn() {
    if (state !== 'off') return;
    setState('booting');
    sounds?.unlock();
    await phase('bios', async () => {
      panes.bios.textContent = '';
      for (const line of BIOS_LINES) { panes.bios.textContent += `${line}\n`; await wait(160); }
      await wait(400);
    });
    await phase('bootlogo', () => wait(2500));
    await phase('welcome', () => wait(1000));
    finishBoot();
  }
  async function shutdown({ restart = false } = {}) {
    if (state !== 'on') return;
    setState('shutting-down');
    sounds?.play('shutdown');
    shutdownText.textContent = 'Windows is shutting down...';
    await phase('shutdown', () => wait(1800));
    showOnly('off');
    setState('off');
    if (restart) await powerOn();
  }
  function standBy() {
    if (state !== 'on') return;
    setState('standby');
    showOnly('off');
  }
  function wake() {
    if (state !== 'standby') return;
    showOnly(null);
    setState('on');
  }
  function logOff() {
    if (state !== 'on') return Promise.resolve();
    setState('logon');
    return new Promise((resolve) => {
      resolveLogon = resolve;
      (async () => {
        shutdownText.textContent = 'Logging off...';
        await phase('shutdown', () => wait(1200));
        showOnly('logon');
      })();
    });
  }

  showOnly('off');
  return { powerOn, shutdown, standBy, logOff, get state() { return state; }, el: layer };
}
