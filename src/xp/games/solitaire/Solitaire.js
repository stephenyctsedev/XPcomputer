import './solitaire.css';
import { createGame } from './engine.js';
import { scoreDelta, applyScore, winBonus, TIME_PENALTY_STEP } from './scoring.js';
import { cardFaceSvg, cardBackSvg, BACKS, CARD_W, CARD_H } from './cards.js';
import { playWinAnimation } from './winAnimation.js';
import { attachMenubar } from '../../Menu.js';

const OPTIONS_KEY = 'xpcomputer.sol.options';
const DEFAULTS = { draw: 1, scoring: 'standard', timed: true, back: 0 };
const FACE_UP_STEP = 18;
const FACE_DOWN_STEP = 5;
const MARGIN = 12;
const TOP_Y = 10;
const TABLEAU_Y = TOP_Y + CARD_H + 22;

export function registerSolitaire(registry) {
  registry.register('sol', { name: 'Solitaire', icon: 'cards', launch: (ctx) => openSolitaire(ctx, { reducedMotion: ctx.reducedMotion }) });
}

export function openSolitaire(ctx, { dealer = null, reducedMotion = false, random = Math.random } = {}) {
  const { wm, dialogs, menus, sounds, storage } = ctx;
  const existing = wm.find('sol')[0];
  if (existing) { existing.focus(); return existing; }

  const options = loadOptions();
  let game = null;
  let score = 0;
  let scoreBeforeMove = 0;
  let seconds = 0;
  let timer = null;
  let drag = null;
  let animation = null;
  let winToken = 0;
  let lastClickId = null;
  let lastClickTime = 0;

  const body = document.createElement('div');
  body.className = 'sol';
  body.innerHTML = '<div class="sol-menubar"></div><div class="sol-table" tabindex="0"></div><div class="status-bar sol-status"><p class="status-bar-field sol-score"></p><p class="status-bar-field sol-time"></p></div>';
  const table = body.querySelector('.sol-table');
  const scoreEl = body.querySelector('.sol-score');
  const timeEl = body.querySelector('.sol-time');
  const win = wm.open({
    appId: 'sol', title: 'Solitaire', icon: 'cards', width: 640, height: 480, minWidth: 560, minHeight: 400, content: body,
    onClose: () => { stopTimer(); winToken++; animation?.stop(); observer?.disconnect(); document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); document.removeEventListener('pointercancel', onCancel); document.removeEventListener('keydown', onDocumentKeyDown); },
  });

  function loadOptions() {
    let merged;
    try { merged = { ...DEFAULTS, ...JSON.parse(storage.get(OPTIONS_KEY) ?? '{}') }; } catch { merged = { ...DEFAULTS }; }
    const back = Number(merged.back);
    merged.back = Number.isInteger(back) ? back : DEFAULTS.back;
    merged.draw = merged.draw === 3 ? 3 : 1;
    return merged;
  }
  const saveOptions = () => storage.set(OPTIONS_KEY, JSON.stringify(options));
  const colStep = () => Math.max(CARD_W + 6, Math.floor((table.clientWidth - MARGIN * 2 - CARD_W) / 6) || 0);
  const clientToTable = (x, y) => {
    const r = table.getBoundingClientRect();
    const s = (r.width / table.offsetWidth) || 1;
    return { x: (x - r.left) / s, y: (y - r.top) / s };
  };

  function cardEl(c, top) {
    const el = document.createElement('div');
    el.className = `sol-card ${c.faceUp ? 'face-up' : 'face-down'}`;
    el.dataset.id = c.id;
    el.style.top = `${top}px`;
    el.innerHTML = c.faceUp ? cardFaceSvg(c) : cardBackSvg(options.back);
    return el;
  }
  function zone(cls, x, y, data) {
    const el = document.createElement('div');
    el.className = `sol-zone ${cls}`;
    Object.assign(el.dataset, data);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    table.append(el);
    return el;
  }
  function render() {
    table.innerHTML = '';
    const step = colStep();
    const stock = zone('sol-stock', MARGIN, TOP_Y, { drop: 'stock' });
    if (game.stock.length) stock.append(cardEl(game.stock[game.stock.length - 1], 0)); else stock.classList.add('empty');
    const waste = zone('sol-waste', MARGIN + step, TOP_Y, { drop: 'waste' });
    game.waste.slice(-(game.draw === 3 ? 3 : 1)).forEach((c, i) => { const el = cardEl(c, 0); el.style.left = `${i * 14}px`; waste.append(el); });
    game.foundations.forEach((pile, index) => {
      const f = zone('sol-foundation', MARGIN + (3 + index) * step, TOP_Y, { drop: 'foundation', index });
      if (pile.length) f.append(cardEl(pile[pile.length - 1], 0));
    });
    game.tableau.forEach((col, colIndex) => {
      const z = zone('sol-col', MARGIN + colIndex * step, TABLEAU_Y, { drop: 'tableau', col: colIndex });
      let y = 0;
      for (const c of col) { z.append(cardEl(c, y)); y += c.faceUp ? FACE_UP_STEP : FACE_DOWN_STEP; }
    });
    renderStatus();
  }
  function renderStatus() {
    scoreEl.textContent = options.scoring === 'standard' ? `Score: ${score}` : 'Score: off';
    timeEl.textContent = `Time: ${seconds}`;
    timeEl.hidden = !options.timed;
  }

  function stopTimer() { clearInterval(timer); timer = null; }
  function startTimer() {
    if (timer) return;
    timer = setInterval(() => {
      seconds++;
      if (options.timed && options.scoring === 'standard' && seconds % 10 === 0) score = applyScore(score, TIME_PENALTY_STEP);
      renderStatus();
    }, 1000);
  }
  function deal() {
    winToken++;
    stopTimer();
    animation?.stop();
    animation = null;
    game = dealer ? dealer() : createGame({ draw: options.draw, random });
    game.draw = options.draw;
    score = 0;
    scoreBeforeMove = 0;
    seconds = 0;
    lastClickId = null;
    render();
  }
  /** Run an engine action; on success apply score, sound, render, and handle the win. */
  function perform(action) {
    if (!game || game.state !== 'playing') return null;
    const before = score;
    const record = action();
    if (!record) return null;
    scoreBeforeMove = before;
    if (options.scoring === 'standard') score = applyScore(score, scoreDelta(record, { draw: game.draw }));
    startTimer();
    sounds.play(record.kind === 'draw' || record.kind === 'recycle' ? 'cardFlip' : 'cardPlace');
    render();
    if (game.state === 'won') onWin();
    return record;
  }
  function undo() {
    if (game.undo()) { score = scoreBeforeMove; render(); }
  }
  async function onWin() {
    const token = ++winToken;
    stopTimer();
    if (options.scoring === 'standard') { score = applyScore(score, winBonus(seconds)); renderStatus(); }
    sounds.play('win');
    if (!reducedMotion) {
      animation = playWinAnimation(table, game.foundations, { random });
      await animation.finished;
      animation = null;
      if (token !== winToken) return;
    }
    const again = await dialogs.message({ title: 'Solitaire', kind: 'question', owner: win, buttons: ['Yes', 'No'], text: `You won!\nScore: ${score}   Time: ${seconds}\n\nDeal again?` });
    if (token !== winToken) return;
    if (again === 'Yes') deal();
  }

  // ---- pointer input ----
  const locate = (el) => game.locate(el.dataset.id);
  function positionDrag(e) {
    const p = clientToTable(e.clientX, e.clientY);
    drag.layer.style.left = `${p.x - drag.offsetX}px`;
    drag.layer.style.top = `${p.y - drag.offsetY}px`;
  }
  function onMove(e) { if (drag) positionDrag(e); }
  function onUp(e) {
    if (!drag) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    const { source, startX, startY, cardId } = drag;
    drag = null;
    // Touch/pen pointers get implicit capture: e.target stays locked to the original
    // pointerdown target (the card, now inside .sol-drag) for every subsequent event, never
    // the element actually under the finger. elementFromPoint reflects the real drop target
    // for touch and agrees with e.target for mouse (which has no capture). .sol-drag has
    // pointer-events: none, so this correctly sees through it to the zone underneath.
    const dropZone = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-drop]');
    let target = null;
    if (dropZone?.dataset.drop === 'tableau') target = { type: 'tableau', col: Number(dropZone.dataset.col) };
    else if (dropZone?.dataset.drop === 'foundation') target = { type: 'foundation', index: Number(dropZone.dataset.index) };
    const succeeded = target && perform(() => game.moveStack(source, target));
    if (!succeeded) render();
    // Real pointerdown/pointerup double-clicks never reach `dblclick` here: preventDefault()
    // on pointerdown (below) suppresses the browser's synthesized click/dblclick for this
    // interaction chain. Detect the same gesture from raw pointer events instead.
    if (succeeded) { lastClickId = null; return; }
    const moved = Math.hypot(e.clientX - startX, e.clientY - startY) > 5;
    if (moved) {
      lastClickId = null;
    } else if (lastClickId === cardId && Date.now() - lastClickTime < 500) {
      lastClickId = null;
      perform(() => game.autoToFoundation(source));
    } else {
      lastClickId = cardId;
      lastClickTime = Date.now();
    }
  }
  function onCancel() {
    // The browser took the gesture away (e.g. for a native scroll) — there is no reliable
    // drop intent here, so just abort back to the last-known-good game state.
    if (!drag) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onCancel);
    drag = null;
    lastClickId = null;
    render();
  }
  table.addEventListener('pointerdown', (e) => {
    table.focus({ preventScroll: true });
    if (e.button !== 0 || drag || !game || game.state !== 'playing') return;
    const el = e.target.closest('.sol-card');
    if (!el) return;
    const source = locate(el);
    if (!source || source.type === 'stock') return;
    const cards = game.peek(source);
    if (!cards.length || (source.type !== 'tableau' && cards[0].id !== el.dataset.id)) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const s = (rect.width / CARD_W) || 1;
    const layer = document.createElement('div');
    layer.className = 'sol-drag';
    cards.map((c) => table.querySelector(`.sol-card[data-id="${c.id}"]`)).forEach((cardNode, i) => {
      cardNode.style.top = `${i * FACE_UP_STEP}px`;
      cardNode.style.left = '0';
      layer.append(cardNode);
    });
    table.append(layer);
    drag = { source, layer, offsetX: (e.clientX - rect.left) / s, offsetY: (e.clientY - rect.top) / s, startX: e.clientX, startY: e.clientY, cardId: el.dataset.id };
    positionDrag(e);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onCancel);
  });
  table.addEventListener('click', (e) => { if (e.target.closest('.sol-stock')) perform(() => game.drawFromStock()); });
  table.addEventListener('dblclick', (e) => {
    const el = e.target.closest('.sol-card');
    if (!el || !game || game.state !== 'playing') return;
    const source = locate(el);
    if (!source || source.type === 'stock') return;
    // Same top-card guard as pointerdown: for a waste/foundation source, only the actual top
    // card is a legitimate target. Without this, double-clicking a partially-covered fanned
    // waste card (draw-three) acts on the real top card instead of the one under the pointer.
    if (source.type !== 'tableau' && game.peek(source)[0]?.id !== el.dataset.id) return;
    perform(() => game.autoToFoundation(source));
  });
  // Bound to `document` (not `table`) and gated on window focus, like Minesweeper's F2 handler:
  // `table` only gets DOM focus via a click inside it, so a table-scoped listener is dead right
  // after the window opens and after any dialog closes (focus falls back to <body>).
  function onDocumentKeyDown(e) {
    if (!win.isFocused) return;
    if (e.key === 'F2') { e.preventDefault(); deal(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  }
  document.addEventListener('keydown', onDocumentKeyDown);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (game) render(); }) : null;
  observer?.observe(table);

  // ---- dialogs ----
  function optionsDialog() {
    const content = document.createElement('div');
    content.className = 'xp-msgbox sol-options';
    content.innerHTML = `
      <fieldset><legend>Draw</legend>
        <div class="field-row"><input type="radio" id="sol-draw1" name="sol-draw" value="1"><label for="sol-draw1">Draw one</label></div>
        <div class="field-row"><input type="radio" id="sol-draw3" name="sol-draw" value="3"><label for="sol-draw3">Draw three</label></div>
      </fieldset>
      <fieldset><legend>Scoring</legend>
        <div class="field-row"><input type="radio" id="sol-std" name="sol-scoring" value="standard"><label for="sol-std">Standard</label></div>
        <div class="field-row"><input type="radio" id="sol-none" name="sol-scoring" value="none"><label for="sol-none">None</label></div>
      </fieldset>
      <div class="field-row"><input type="checkbox" id="sol-timed"><label for="sol-timed">Timed game</label></div>
      <div class="xp-msgbox-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button></div>`;
    content.querySelector(`[name="sol-draw"][value="${options.draw}"]`).checked = true;
    content.querySelector(`[name="sol-scoring"][value="${options.scoring}"]`).checked = true;
    content.querySelector('#sol-timed').checked = options.timed;
    const dlg = wm.open({ appId: 'dialog', title: 'Options', icon: 'cards', dialog: true, width: 320, height: 280, x: win.bounds.x + 40, y: win.bounds.y + 60, content });
    content.querySelector('[data-result="OK"]').addEventListener('click', () => {
      options.draw = Number(content.querySelector('[name="sol-draw"]:checked').value);
      options.scoring = content.querySelector('[name="sol-scoring"]:checked').value;
      options.timed = content.querySelector('#sol-timed').checked;
      saveOptions();
      dlg.close();
      deal();
    });
    content.querySelector('[data-result="Cancel"]').addEventListener('click', () => dlg.close());
  }
  function deckDialog() {
    const content = document.createElement('div');
    content.className = 'xp-msgbox sol-deck';
    content.innerHTML = `<div class="sol-deck-grid">${BACKS.map((b, i) => `<button type="button" class="sol-deck-choice${i === options.back ? ' selected' : ''}" data-index="${i}" title="${b.name}">${b.svg}</button>`).join('')}</div>` +
      '<div class="xp-msgbox-buttons"><button type="button" class="default" data-result="OK">OK</button><button type="button" data-result="Cancel">Cancel</button></div>';
    let choice = options.back;
    content.querySelector('.sol-deck-grid').addEventListener('click', (e) => {
      const b = e.target.closest('.sol-deck-choice');
      if (!b) return;
      choice = Number(b.dataset.index);
      content.querySelectorAll('.sol-deck-choice').forEach((x) => x.classList.toggle('selected', x === b));
    });
    const dlg = wm.open({ appId: 'dialog', title: 'Select Card Back', icon: 'cards', dialog: true, width: 300, height: 320, x: win.bounds.x + 60, y: win.bounds.y + 40, content });
    content.querySelector('[data-result="OK"]').addEventListener('click', () => { options.back = choice; saveOptions(); dlg.close(); render(); });
    content.querySelector('[data-result="Cancel"]').addEventListener('click', () => dlg.close());
  }

  attachMenubar(body.querySelector('.sol-menubar'), menus, {
    Game: () => [
      { label: 'Deal', shortcut: 'F2', action: deal },
      { separator: true },
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !game?.snapshot, action: undo },
      { label: 'Deck...', action: deckDialog },
      { label: 'Options...', action: optionsDialog },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Help: [{ label: 'About Solitaire', action: () => dialogs.message({ title: 'About Solitaire', owner: win, text: 'Klondike, rebuilt in plain JavaScript with the Windows Standard scoring rules.\n\nDrag runs between columns, double-click a card to send it home, click the stock to draw. F2 deals, Ctrl+Z undoes the last move.' }) }],
  });

  deal();
  return win;
}
