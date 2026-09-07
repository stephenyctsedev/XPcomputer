/**
 * Decide which experience to load.
 * @param {{query?: string, hasWebGL2?: boolean, coarsePointer?: boolean, viewportWidth?: number}} env
 * @returns {'room' | 'flat'}
 */
export function pickMode({ query = '', hasWebGL2 = true, coarsePointer = false, viewportWidth = 1280 } = {}) {
  const forced = new URLSearchParams(query).get('mode');
  if (forced === 'flat' || forced === 'room') return forced;
  if (!hasWebGL2 || coarsePointer || viewportWidth < 900) return 'flat';
  return 'room';
}

/** Read the real browser environment (not unit tested). */
export function detectEnv() {
  let hasWebGL2 = false;
  try {
    hasWebGL2 = !!document.createElement('canvas').getContext('webgl2');
  } catch { hasWebGL2 = false; }
  const coarsePointer = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  return { query: location.search, hasWebGL2, coarsePointer, viewportWidth: innerWidth };
}
