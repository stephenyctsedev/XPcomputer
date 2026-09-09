import './pinball.css';
import { createTable, stepTable, LETTERS } from './table.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { attachMenubar } from '../../Menu.js';

const HIGH_KEY = 'xpcomputer.pinball.high';
const STEP = 1 / 240;
const SOUND_FOR = { flipper: 'flipper', bumper: 'bumper', slingshot: 'bumper', target: 'target', letter: 'target', bank: 'win', word: 'win', extraBall: 'win', drain: 'drain', launch: 'click', tilt: 'error', nudge: 'menu' };

export function registerPinball(registry) {
  registry.register('pinball', { name: 'Pinball', icon: 'pinball', launch: (ctx) => openPinball(ctx) });
}

export function openPinball(ctx, { autoLoop = true } = {}) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('pinball')[0];
  if (existing) { existing.focus(); return existing; }

  let table = createTable();
  let high = Number(storage.get(HIGH_KEY) ?? 0) || 0;
  let paused = false;
  let raf = 0;
  let last = 0;
  let accumulator = 0;
  const pendingNudge = { nudgeLeft: false, nudgeRight: false };
  let gameOverShown = false;
  let offMinimize = null;
  let observer = null;

  const body = document.createElement('div');
  body.className = 'pb';
  body.tabIndex = 0;
  body.innerHTML = `
    <div class="pb-menubar"></div>
    <div class="pb-main">
      <div class="pb-table"><canvas width="400" height="700"></canvas></div>
      <div class="pb-panel">
        <h2>PINBALL</h2>
        <div class="pb-stat pb-score"><span>Score</span><b class="pb-score-value">0</b></div>
        <div class="pb-stat"><span>Ball</span><b class="pb-ball">1 / 3</b></div>
        <div class="pb-stat"><span>High score</span><b class="pb-high">0</b></div>
        <div class="pb-letters">${LETTERS.map((l) => `<span class="pb-letter">${l}</span>`).join('')}</div>
        <div class="pb-mission"></div>
        <div class="pb-keys"><kbd>Z</kbd> <kbd>/</kbd> flippers<br><kbd>Space</kbd> hold to launch<br><kbd>X</kbd> <kbd>.</kbd> nudge<br><kbd>F2</kbd> new game &nbsp; <kbd>F3</kbd> pause</div>
      </div>
    </div>`;
  const canvas = body.querySelector('canvas');
  const tableEl = body.querySelector('.pb-table');
  const renderer = createRenderer(canvas);
  const input = createInput(document, { enabled: () => win.isFocused });
  const q = (selector) => body.querySelector(selector);

  const win = wm.open({
    appId: 'pinball', title: 'Pinball', icon: 'pinball', width: 760, height: 620, minWidth: 620, minHeight: 500, content: body,
    onClose: () => { cancelAnimationFrame(raf); input.detach(); observer?.disconnect(); offMinimize?.(); },
  });

  function fit() {
    const w = tableEl.clientWidth || 400;
    const h = tableEl.clientHeight || 700;
    renderer.resize(Math.max(0.3, Math.min(w / 400, h / 700)), window.devicePixelRatio || 1);
  }
  observer = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
  observer?.observe(tableEl);
  fit();

  function updatePanel() {
    q('.pb-score-value').textContent = table.score.toLocaleString();
    q('.pb-ball').textContent = `${Math.min(table.ballNumber, table.ballsTotal)} / ${table.ballsTotal}`;
    q('.pb-high').textContent = high.toLocaleString();
    body.querySelectorAll('.pb-letter').forEach((span, i) => span.classList.toggle('lit', table.letters[i]));
    q('.pb-mission').textContent = table.state === 'over' ? 'Game over. Press F2 to play again.'
      : table.tilt ? 'TILT! Flippers are dead until the ball drains.'
      : paused ? 'Paused (F3 to resume)'
      : table.ball.inLane && table.ball.atRest ? 'Hold Space to charge the plunger, release to launch.'
      : `Spell ${LETTERS.join('')} in the top lanes for 10,000 and an extra ball.`;
  }
  async function onGameOver() {
    if (gameOverShown) return;
    gameOverShown = true;
    const record = table.score > high;
    if (record) { high = table.score; storage.set(HIGH_KEY, String(high)); }
    updatePanel();
    const again = await dialogs.message({ title: 'Pinball', kind: 'question', owner: win, buttons: ['Yes', 'No'], text: `Game over!\nScore: ${table.score.toLocaleString()}${record ? '  (new high score!)' : ''}\n\nPlay again?` });
    if (again === 'Yes') newGame();
  }
  function handleEvents(events) {
    for (const e of events) {
      const cue = SOUND_FOR[e.type];
      if (cue) sounds.play(cue);
      if (e.type === 'gameOver') onGameOver().catch(() => {});
    }
  }
  /** Advance the simulation by `seconds` in fixed 1/240 s steps. Nudges apply to the first step that
   * actually runs; on very high refresh rates a single call's `seconds` can be smaller than STEP, so a
   * one-shot nudge captured this frame is carried in `pendingNudge` until a step consumes it, instead of
   * being silently dropped by a call that ends up running zero substeps. */
  function advance(seconds) {
    const frameInput = input.frame();
    if (frameInput.nudgeLeft) pendingNudge.nudgeLeft = true;
    if (frameInput.nudgeRight) pendingNudge.nudgeRight = true;
    if (paused || table.state === 'over') return;
    accumulator += seconds;
    let first = true;
    while (accumulator >= STEP - 1e-12) {
      handleEvents(stepTable(table, STEP, first ? { ...frameInput, ...pendingNudge } : { ...frameInput, nudgeLeft: false, nudgeRight: false }));
      if (first) { pendingNudge.nudgeLeft = false; pendingNudge.nudgeRight = false; }
      accumulator -= STEP;
      first = false;
    }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    advance(dt);
    if (!win.isMinimized) renderer.draw(table);
    updatePanel();
  }
  function newGame() {
    table = createTable();
    gameOverShown = false;
    paused = false;
    accumulator = 0;
    renderer.clearTrail();
    updatePanel();
  }
  function togglePause() {
    if (table.state === 'over') return;
    paused = !paused;
    updatePanel();
  }

  input.onKey('F2', newGame);
  input.onKey('F3', togglePause);
  offMinimize = wm.on('minimize', (w) => { if (w === win && !paused && table.state !== 'over') togglePause(); });
  body.addEventListener('pointerdown', () => body.focus({ preventScroll: true }));
  attachMenubar(q('.pb-menubar'), menus, {
    Game: () => [
      { label: 'New Game', shortcut: 'F2', action: newGame },
      { label: paused ? 'Resume' : 'Pause', shortcut: 'F3', action: togglePause },
      { separator: true },
      { label: 'Reset High Score', action: () => { high = 0; storage.set(HIGH_KEY, '0'); updatePanel(); } },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Help: [{ label: 'About Pinball', action: async () => { await dialogs.message({ title: 'About Pinball', owner: win, text: 'An original table in plain JavaScript: circle-vs-segment physics at 240 steps per second, flippers with real angular velocity, and an S-T-E-P-H-E-N lane bonus.\n\nZ and / flip, hold Space to launch, X and . nudge (three quick nudges tilt), F2 new game, F3 pause.' }); } }],
  });

  updatePanel();
  renderer.draw(table);
  if (autoLoop && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(loop);
  setTimeout(() => body.focus({ preventScroll: true }), 0);
  win.pinball = { get table() { return table; }, advance, input, newGame, togglePause };
  return win;
}
