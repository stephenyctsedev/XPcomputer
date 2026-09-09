import { TABLE, LETTERS } from './table.js';
import { flipperSegment } from './physics.js';

const CYAN = '#3ee9ff';
const MAGENTA = '#ff2bd6';
const DIM = 'rgba(62,233,255,0.25)';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let dpr = 1;
  const trail = [];

  function resize(nextScale, nextDpr = 1) {
    scale = nextScale;
    dpr = nextDpr;
    canvas.width = Math.round(TABLE.width * scale * dpr);
    canvas.height = Math.round(TABLE.height * scale * dpr);
    canvas.style.width = `${TABLE.width * scale}px`;
    canvas.style.height = `${TABLE.height * scale}px`;
  }
  function line(s, color, width, glow) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.shadowColor = glow ? color : 'transparent';
    ctx.shadowBlur = glow ? 10 : 0;
    ctx.beginPath();
    ctx.moveTo(s.ax, s.ay);
    ctx.lineTo(s.bx, s.by);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  function circle(x, y, r, fill, stroke) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
  }
  function glowText(text, x, y, font, color) {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
  }

  function draw(t) {
    if (!ctx) return;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, TABLE.height);
    bg.addColorStop(0, '#12081f');
    bg.addColorStop(1, '#05030c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, TABLE.width, TABLE.height);
    ctx.strokeStyle = 'rgba(120,80,255,0.12)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= TABLE.width; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TABLE.height); ctx.stroke(); }
    for (let y = 0; y <= TABLE.height; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TABLE.width, y); ctx.stroke(); }

    ctx.lineCap = 'round';
    for (const wall of t.walls) line(wall, CYAN, Math.max(2, wall.r * 2), true);
    ctx.setLineDash([4, 4]);
    line(t.gate, DIM, 2, false);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(62,233,255,0.08)';
    ctx.fillRect(t.bank.x, t.bank.y, t.bank.w, t.bank.h);
    for (const target of t.targets) line(target.seg, target.dropped ? 'rgba(255,43,214,0.2)' : MAGENTA, 6, !target.dropped);
    for (const sling of t.slingshots) line(sling.seg, sling.flash > 0 ? '#ffffff' : MAGENTA, 6, true);
    for (const b of t.bumpers) {
      circle(b.x, b.y, b.r, b.flash > 0 ? '#ffffff' : 'rgba(255,43,214,0.35)', MAGENTA);
      circle(b.x, b.y, b.r * 0.45, MAGENTA);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    t.lanes.forEach((lane, i) => {
      const lit = t.letters[i];
      circle(lane.x, lane.y, lane.r, lit ? 'rgba(255,214,0,0.9)' : 'rgba(255,255,255,0.08)', lit ? '#ffd600' : DIM);
      glowText(LETTERS[i], lane.x, lane.y - 22, 'bold 14px "Trebuchet MS", Tahoma, sans-serif', lit ? '#ffffff' : 'rgba(255,255,255,0.35)');
    });
    for (const f of [t.left, t.right]) line(flipperSegment(f), '#e8f6ff', f.r * 2, true);

    if (t.ball.inLane && t.ball.atRest) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(357, 560, 18, 120);
      const h = 120 * t.plunger.charge;
      ctx.fillStyle = MAGENTA;
      ctx.fillRect(357, 680 - h, 18, h);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '11px Tahoma, sans-serif';
      ctx.fillText('SPACE', 366, 545);
    }

    trail.push({ x: t.ball.x, y: t.ball.y });
    if (trail.length > 10) trail.shift();
    trail.forEach((p, i) => circle(p.x, p.y, t.ball.r * (i / trail.length) * 0.8, `rgba(255,255,255,${0.04 + (i / trail.length) * 0.12})`));
    const shine = ctx.createRadialGradient(t.ball.x - 3, t.ball.y - 3, 1, t.ball.x, t.ball.y, t.ball.r);
    shine.addColorStop(0, '#ffffff');
    shine.addColorStop(1, '#8fa3b8');
    circle(t.ball.x, t.ball.y, t.ball.r, shine);

    if (t.tilt) glowText('TILT', 200, 440, 'bold 48px Impact, "Arial Black", sans-serif', MAGENTA);
    if (t.state === 'over') {
      glowText('GAME OVER', 200, 440, 'bold 40px Impact, "Arial Black", sans-serif', CYAN);
      ctx.fillStyle = '#fff';
      ctx.font = '14px Tahoma, sans-serif';
      ctx.fillText('F2 for a new game', 200, 470);
    }
  }
  return { resize, draw, clearTrail: () => trail.splice(0) };
}
