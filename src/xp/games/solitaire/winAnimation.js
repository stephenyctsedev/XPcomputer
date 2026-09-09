import { CARD_W, CARD_H, SUIT_GLYPH, rankLabel } from './cards.js';
import { isRed } from './engine.js';

/** The classic cascade: cards leave the foundations one by one, bounce along the bottom and fly out, leaving trails. */
export function playWinAnimation(table, foundations, { random = Math.random } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'sol-win';
  const W = table.clientWidth || 640;
  const H = table.clientHeight || 400;
  canvas.width = W;
  canvas.height = H;
  table.append(canvas);
  const ctx = canvas.getContext('2d');
  const piles = foundations.map((pile) => pile.slice());
  const zones = [...table.querySelectorAll('.sol-foundation')].map((z) => ({ x: z.offsetLeft, y: z.offsetTop }));
  let turn = 0;
  let current = null;
  let stopped = false;
  let raf = 0;
  let resolveDone;
  const finished = new Promise((resolve) => { resolveDone = resolve; });

  function pop() {
    for (let n = 0; n < 4; n++) {
      const i = (turn + n) % 4;
      if (!piles[i].length) continue;
      turn = i + 1;
      return { card: piles[i].pop(), x: zones[i]?.x ?? 0, y: zones[i]?.y ?? 0, vx: (random() < 0.5 ? -1 : 1) * (2 + random() * 4), vy: -(2 + random() * 3) };
    }
    return null;
  }
  function drawCard(c) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(c.x, c.y, CARD_W, CARD_H, 5); else ctx.rect(c.x, c.y, CARD_W, CARD_H);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#555';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isRed(c.card.suit) ? '#c8102e' : '#111';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(rankLabel(c.card.rank), c.x + 6, c.y + 16);
    ctx.font = '30px Arial';
    ctx.fillText(SUIT_GLYPH[c.card.suit], c.x + 22, c.y + 62);
  }
  function step() {
    if (stopped) return;
    if (!current) {
      current = pop();
      if (!current) { finish(); return; }
    }
    current.vy += 0.5;
    current.x += current.vx;
    current.y += current.vy;
    if (current.y + CARD_H > H) { current.y = H - CARD_H; current.vy = -current.vy * 0.82; }
    drawCard(current);
    if (current.x > W || current.x + CARD_W < 0) current = null;
    raf = requestAnimationFrame(step);
  }
  function finish() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(raf);
    canvas.remove();
    resolveDone();
  }
  canvas.addEventListener('pointerdown', finish);
  if (!ctx || typeof requestAnimationFrame !== 'function') finish();
  else raf = requestAnimationFrame(step);
  return { finished, stop: finish };
}
