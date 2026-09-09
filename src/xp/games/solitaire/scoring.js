// Windows "Standard" Klondike scoring. Pure.
const MOVE_POINTS = { wasteToTableau: 5, wasteToFoundation: 10, tableauToFoundation: 10, tableauToTableau: 0, foundationToTableau: -15, draw: 0 };
const FLIP_POINTS = 5;
export const TIME_PENALTY_STEP = -2;   // every 10 seconds in a timed game

export function scoreDelta(record, { draw = 1 } = {}) {
  if (!record) return 0;
  if (record.kind === 'recycle') {
    if (draw === 1) return record.passes >= 1 ? -100 : 0;
    return record.passes >= 4 ? -20 : 0;
  }
  return (MOVE_POINTS[record.kind] ?? 0) + (record.flipped ? FLIP_POINTS : 0);
}

export const applyScore = (score, delta) => Math.max(0, score + delta);

export const winBonus = (seconds) => (seconds > 30 ? Math.round(700000 / seconds) : 0);
