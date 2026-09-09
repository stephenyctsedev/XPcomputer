import { isRed } from './engine.js';

export const CARD_W = 71;
export const CARD_H = 96;
export const SUIT_GLYPH = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED = '#c8102e';
const BLACK = '#111';

export const rankLabel = (rank) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[rank] ?? String(rank);

// Pip positions as (column, row) in [-1, 1]; rows below 0 are drawn upside down like printed cards.
const PIPS = {
  2: [[0, -1], [0, 1]],
  3: [[0, -1], [0, 0], [0, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  7: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [-1, 1], [1, 1]],
  8: [[-1, -1], [1, -1], [0, -0.5], [-1, 0], [1, 0], [0, 0.5], [-1, 1], [1, 1]],
  9: [[-1, -1], [1, -1], [-1, -0.33], [1, -0.33], [0, 0], [-1, 0.33], [1, 0.33], [-1, 1], [1, 1]],
  10: [[-1, -1], [1, -1], [0, -0.66], [-1, -0.33], [1, -0.33], [-1, 0.33], [1, 0.33], [0, 0.66], [-1, 1], [1, 1]],
};

export function cardFaceSvg(c) {
  const color = isRed(c.suit) ? RED : BLACK;
  const glyph = SUIT_GLYPH[c.suit];
  const label = rankLabel(c.rank);
  const corner = (x, y, flip) =>
    `<g transform="translate(${x} ${y})${flip ? ' rotate(180)' : ''}" fill="${color}" font-family="Arial, Helvetica, sans-serif" font-weight="bold" text-anchor="middle">` +
    `<text y="0" font-size="12">${label}</text><text y="11" font-size="11">${glyph}</text></g>`;
  let center;
  if (c.rank === 1) {
    center = `<text x="35.5" y="62" text-anchor="middle" font-size="40" fill="${color}">${glyph}</text>`;
  } else if (c.rank > 10) {
    center = `<rect x="18" y="22" width="35" height="52" fill="#f3e9c6" stroke="${color}"/>` +
      `<text x="35.5" y="57" text-anchor="middle" font-family="Georgia, serif" font-size="26" font-weight="bold" fill="${color}">${label}</text>` +
      `<text x="24" y="33" font-size="9" fill="${color}">${glyph}</text>` +
      `<text x="47" y="68" font-size="9" fill="${color}" transform="rotate(180 47 65)">${glyph}</text>`;
  } else {
    center = PIPS[c.rank].map(([px, py]) => {
      const x = 35.5 + px * 15;
      const y = 48 + py * 24;
      const flip = py > 0 ? ` transform="rotate(180 ${x} ${y})"` : '';
      return `<text class="pip" x="${x}" y="${y + 5}" text-anchor="middle" font-size="15" fill="${color}"${flip}>${glyph}</text>`;
    }).join('');
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 71 96" width="71" height="96">` +
    `<rect x="0.5" y="0.5" width="70" height="95" rx="5" fill="#fff" stroke="#555"/>${corner(9, 13, false)}${corner(62, 83, true)}${center}</svg>`;
}

const back = (id, bg, defs, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 71 96" width="71" height="96"><defs>${defs}</defs>` +
  `<rect x="0.5" y="0.5" width="70" height="95" rx="5" fill="${bg}" stroke="#555"/><rect x="5" y="5" width="61" height="86" rx="3" fill="${fill}" stroke="rgba(255,255,255,.7)"/></svg>`;

export const BACKS = [
  { name: 'Blue stripes', svg: back('b0', '#1b4fbf', '<pattern id="b0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="4" height="8" fill="#3a6fdc"/></pattern>', 'url(#b0)') },
  { name: 'Red checks', svg: back('b1', '#b22222', '<pattern id="b1" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#e8e8e8"/><rect x="4" y="4" width="4" height="4" fill="#e8e8e8"/></pattern>', 'url(#b1)') },
  { name: 'Green dots', svg: back('b2', '#1e7a3a', '<pattern id="b2" width="10" height="10" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="2" fill="#9be3a8"/></pattern>', 'url(#b2)') },
  { name: 'Neon grid', svg: back('b3', '#0b0714', '<pattern id="b3" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M10 0H0V10" fill="none" stroke="#3ee9ff" stroke-width="1"/></pattern>', 'url(#b3)') },
  { name: 'Purple chevrons', svg: back('b4', '#4b2a7f', '<pattern id="b4" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6l6-6 6 6-6 6z" fill="#8b5cd6"/></pattern>', 'url(#b4)') },
  { name: 'Classic navy', svg: back('b5', '#123c78', '<pattern id="b5" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="0.9" fill="#7fa3e0"/></pattern>', 'url(#b5)') },
];

export const cardBackSvg = (index = 0) => BACKS[((index % BACKS.length) + BACKS.length) % BACKS.length].svg;
