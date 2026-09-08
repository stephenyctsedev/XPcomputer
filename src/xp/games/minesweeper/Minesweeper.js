import './minesweeper.css';
import { createGame, LEVELS } from './engine.js';
import { attachMenubar } from '../../Menu.js';
import { iconEl } from '../../icons/index.js';

const BEST_KEY = 'xpcomputer.winmine.best';
const CELL = 16;
const FRAME_W = 30;   // window chrome + panel borders; tune until no gap or scrollbar shows
const FRAME_H = 112;
const NUMBER_COLORS = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];
const FACES = {
  smile: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><circle cx="8.5" cy="9" r="1.4"/><circle cx="15.5" cy="9" r="1.4"/><path d="M7 14c2 3 8 3 10 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  oh: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><circle cx="8.5" cy="9" r="1.4"/><circle cx="15.5" cy="9" r="1.4"/><circle cx="12" cy="15.5" r="2.2" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  cool: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><path d="M4 9h16l-1 3h-5l-1-2h-2l-1 2H5z" fill="#000"/><path d="M8 15c2 2.5 6 2.5 8 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
  dead: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd93b" stroke="#000"/><path d="M6.5 7l4 4M10.5 7l-4 4M13.5 7l4 4M17.5 7l-4 4" stroke="#000" stroke-width="1.4"/><path d="M8 16c2-2.5 6-2.5 8 0" fill="none" stroke="#000" stroke-width="1.5"/></svg>',
};

export function registerMinesweeper(registry) {
  registry.register('winmine', { name: 'Minesweeper', icon: 'mine', launch: openMinesweeper });
}

export function openMinesweeper(ctx) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('winmine')[0];
  if (existing) { existing.focus(); return existing; }

  let levelName = 'beginner';
  let marks = true;
  let game = null;
  let seconds = 0;
  let timer = null;
  let pressing = null;

  const body = document.createElement('div');
  body.className = 'ms';
  body.innerHTML = `
    <div class="ms-menubar"></div>
    <div class="ms-panel">
      <div class="ms-status"><span class="ms-led ms-mines">000</span><button type="button" class="ms-face" aria-label="New game"></button><span class="ms-led ms-time">000</span></div>
      <div class="ms-grid"></div>
    </div>`;
  const grid = body.querySelector('.ms-grid');
  const face = body.querySelector('.ms-face');
  const minesLed = body.querySelector('.ms-mines');
  const timeLed = body.querySelector('.ms-time');
  const win = wm.open({ appId: 'winmine', title: 'Minesweeper', icon: 'mine', width: 200, height: 260, minWidth: 120, minHeight: 100, resizable: false, content: body, onClose: () => { stopTimer(); document.removeEventListener('pointerup', onDocumentUp); } });

  const led = (n) => String(Math.max(-99, Math.min(999, n))).padStart(3, '0');
  const setFace = (name) => { face.innerHTML = FACES[name]; };
  const rc = (cellEl) => { const i = Number(cellEl.dataset.i); return [Math.floor(i / game.cols), i % game.cols]; };
  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() {
    stopTimer();
    timer = setInterval(() => {
      if (seconds >= 999) return;
      seconds++;
      timeLed.textContent = led(seconds);
      sounds.play('mineTick');
    }, 1000);
  }

  function newGame() {
    stopTimer();
    seconds = 0;
    timeLed.textContent = led(0);
    const level = LEVELS[levelName];
    game = createGame({ ...level, marks });
    minesLed.textContent = led(game.minesLeft);
    setFace('smile');
    grid.style.gridTemplateColumns = `repeat(${level.cols}, ${CELL}px)`;
    grid.innerHTML = '';
    for (let i = 0; i < level.rows * level.cols; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'ms-cell';
      cell.dataset.i = String(i);
      grid.append(cell);
    }
    win.resize(level.cols * CELL + FRAME_W, level.rows * CELL + FRAME_H);
  }

  function renderCell(i) {
    const cell = game.cells[i];
    const el = grid.children[i];
    el.className = 'ms-cell';
    el.style.color = '';
    el.innerHTML = '';
    if (cell.revealed) {
      el.classList.add('revealed');
      if (cell.mine) { el.classList.add('mine'); if (game.exploded === i) el.classList.add('exploded'); }
      else if (cell.adjacent) { el.textContent = String(cell.adjacent); el.style.color = NUMBER_COLORS[cell.adjacent]; }
    } else if (cell.wrong) {
      el.classList.add('revealed', 'mine', 'wrong');
    } else if (cell.mark === 'flag') {
      el.classList.add('flag');
      el.append(iconEl('flag', 12));
    } else if (cell.mark === 'question') {
      el.textContent = '?';
    }
  }

  function afterMove(changed) {
    for (const i of changed) renderCell(i);
    minesLed.textContent = led(game.minesLeft);
    if (game.state === 'playing' && !timer) startTimer();
    if (game.state === 'lost') { stopTimer(); setFace('dead'); sounds.play('mineBoom'); }
    if (game.state === 'won') { stopTimer(); setFace('cool'); sounds.play('win'); recordBest(); }
  }

  const loadBest = () => { try { return JSON.parse(storage.get(BEST_KEY) ?? '{}') ?? {}; } catch { return {}; } };
  const saveBest = (best) => storage.set(BEST_KEY, JSON.stringify(best));
  function promptName() {
    return new Promise((resolve) => {
      const content = document.createElement('div');
      content.className = 'xp-msgbox';
      content.innerHTML = `<div class="xp-msgbox-text">You have the fastest time for ${levelName} level. Please enter your name.</div><input type="text" maxlength="32" value="Anonymous"><div class="xp-msgbox-buttons"><button type="button" class="default">OK</button></div>`;
      const input = content.querySelector('input');
      const dlg = wm.open({ appId: 'dialog', title: 'Congratulations', icon: 'mine', dialog: true, width: 300, height: 150, x: win.bounds.x + 20, y: win.bounds.y + 60, content, onClose: () => resolve(input.value.trim() || 'Anonymous') });
      content.querySelector('button').addEventListener('click', () => dlg.close());
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') dlg.close(); });
      setTimeout(() => input.select(), 0);
    });
  }
  async function recordBest() {
    const best = loadBest();
    if (best[levelName] && best[levelName].time <= seconds) return;
    const name = await promptName();
    best[levelName] = { time: seconds, name };
    saveBest(best);
  }
  function showBestTimes() {
    const best = loadBest();
    const row = (key, label) => `${label}:\t${best[key] ? `${best[key].time} seconds\t${best[key].name}` : '999 seconds\tAnonymous'}`;
    dialogs.message({
      title: 'Fastest Mine Sweepers', kind: 'info', owner: win, buttons: ['Reset Scores', 'OK'], defaultButton: 1,
      text: [row('beginner', 'Beginner'), row('intermediate', 'Intermediate'), row('expert', 'Expert')].join('\n'),
    }).then((answer) => { if (answer === 'Reset Scores') saveBest({}); });
  }

  const gameMenu = () => [
    { label: 'New', shortcut: 'F2', action: newGame },
    { separator: true },
    { label: 'Beginner', checked: levelName === 'beginner', action: () => { levelName = 'beginner'; newGame(); } },
    { label: 'Intermediate', checked: levelName === 'intermediate', action: () => { levelName = 'intermediate'; newGame(); } },
    { label: 'Expert', checked: levelName === 'expert', action: () => { levelName = 'expert'; newGame(); } },
    { separator: true },
    { label: 'Marks (?)', checked: marks, action: () => { marks = !marks; if (game) game.marks = marks; } },
    { separator: true },
    { label: 'Best Times...', action: showBestTimes },
    { separator: true },
    { label: 'Exit', action: () => win.close() },
  ];
  attachMenubar(body.querySelector('.ms-menubar'), menus, {
    Game: gameMenu,
    Help: [{ label: 'About Minesweeper', action: () => dialogs.message({ title: 'About Minesweeper', owner: win, text: 'Minesweeper, rebuilt from the rules up in plain JavaScript.\n\nLeft click reveals, right click flags, middle click or Shift+click clears around a satisfied number. F2 starts a new game.' }) }],
  });

  grid.addEventListener('contextmenu', (e) => e.preventDefault());
  grid.addEventListener('pointerdown', (e) => {
    const cellEl = e.target.closest('.ms-cell');
    if (!cellEl || !game || game.state === 'won' || game.state === 'lost') return;
    if (e.button === 2) { afterMove(game.toggleMark(...rc(cellEl))); sounds.play('click'); return; }
    if (e.button === 0 || e.button === 1) {
      pressing = e.button === 1 || e.buttons === 3 || e.shiftKey ? 'chord' : 'reveal';
      setFace('oh');
      cellEl.classList.add('pressed');
    }
  });
  function onDocumentUp(e) {
    if (!pressing || !game) return;
    const mode = pressing;
    pressing = null;
    grid.querySelectorAll('.pressed').forEach((c) => c.classList.remove('pressed'));
    if (game.state === 'won' || game.state === 'lost') return;
    setFace('smile');
    const cellEl = e.target.closest?.('.ms-cell');
    if (!cellEl || !grid.contains(cellEl)) return;
    const [r, c] = rc(cellEl);
    afterMove(mode === 'chord' ? game.chord(r, c) : game.reveal(r, c));
  }
  document.addEventListener('pointerup', onDocumentUp);
  face.addEventListener('click', newGame);
  body.addEventListener('keydown', (e) => { if (e.key === 'F2') { e.preventDefault(); newGame(); } });

  newGame();
  return win;
}
