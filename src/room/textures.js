import * as THREE from 'three';

/** Draw with a 2D context into a CanvasTexture. Returns null where canvas 2D is unavailable. */
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Night city seen through the window: gradient sky, stars, two skyline layers with lit windows, neon haze. */
export function makeCityTexture(random = Math.random) {
  return canvasTexture(512, 512, (ctx, w, h) => {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#05030c');
    sky.addColorStop(0.55, '#2a0f4a');
    sky.addColorStop(0.8, '#6b1f6e');
    sky.addColorStop(1, '#0a0614');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + random() * 0.7})`;
      ctx.fillRect(random() * w, random() * h * 0.5, 1.5, 1.5);
    }
    ctx.fillStyle = '#120a22';
    for (let x = 0; x < w; x += 18) { const bh = 80 + random() * 140; ctx.fillRect(x, h * 0.62 - bh, 16, bh + 200); }
    for (let x = -10; x < w; x += 34 + random() * 30) {
      const bw = 30 + random() * 40, bh = 120 + random() * 220, top = h * 0.72 - bh;
      ctx.fillStyle = '#07040f';
      ctx.fillRect(x, top, bw, bh + 200);
      for (let wy = top + 8; wy < h * 0.72; wy += 12) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 9) {
          if (random() < 0.45) {
            ctx.fillStyle = random() < 0.2 ? '#3ee9ff' : random() < 0.5 ? '#ffd27a' : '#ff9ad8';
            ctx.globalAlpha = 0.5 + random() * 0.5;
            ctx.fillRect(wx, wy, 4, 6);
          }
        }
      }
      ctx.globalAlpha = 1;
      if (random() < 0.5) {
        ctx.fillStyle = random() < 0.5 ? '#ff2bd6' : '#3ee9ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 18;
        ctx.fillRect(x + 6, top + 20 + random() * 60, bw - 12, 6);
        ctx.shadowBlur = 0;
      }
    }
    const haze = ctx.createLinearGradient(0, h * 0.5, 0, h);
    haze.addColorStop(0, 'rgba(255,43,214,0)');
    haze.addColorStop(1, 'rgba(62,233,255,0.25)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, 0, w, h);
  });
}

/** Tileable floor grid used as an emissive map. */
export function makeGridTexture() {
  return canvasTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,80,255,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(w, 1); ctx.moveTo(1, 0); ctx.lineTo(1, h); ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,255,0.25)';
    ctx.lineWidth = 1;
    for (let i = 64; i < w; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  });
}

/** Neon poster with centered lines of text. */
export function makePosterTexture(lines, { bg = '#12081f', fg = '#ff2bd6', accent = '#3ee9ff' } = {}) {
  return canvasTexture(256, 358, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = fg;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = fg;
    ctx.shadowBlur = 16;
    const size = Math.min(46, Math.floor((h - 80) / lines.length / 1.2));
    ctx.font = `bold ${size}px Impact, "Arial Black", sans-serif`;
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.25));
    ctx.shadowBlur = 0;
    ctx.fillStyle = accent;
    ctx.font = '13px monospace';
    ctx.fillText('stephenyctsedev.github.io/XPcomputer', w / 2, h - 28);
  });
}

export function makeRoomTextures() {
  return {
    city: makeCityTexture(),
    grid: makeGridTexture(),
    posterA: makePosterTexture(['NOW', 'HIRING:', 'GAME', 'PROGRAMMER']),
    posterB: makePosterTexture(['STAY', 'CURIOUS'], { bg: '#081a1f', fg: '#3ee9ff', accent: '#ff2bd6' }),
  };
}
