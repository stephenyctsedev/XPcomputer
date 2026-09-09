export const KEYMAP = {
  z: 'left', Z: 'left', ArrowLeft: 'left',
  '/': 'right', '?': 'right', ArrowRight: 'right',
  ' ': 'plunger', ArrowDown: 'plunger',
  x: 'nudgeLeft', X: 'nudgeLeft',
  '.': 'nudgeRight', '>': 'nudgeRight',
};

/** Keyboard → held flippers/plunger plus one-shot nudges. Other keys can be bound with onKey (F2, F3). */
export function createInput(target) {
  const held = { left: false, right: false, plunger: false };
  const pending = { nudgeLeft: false, nudgeRight: false };
  const shortcuts = new Map();
  const onDown = (e) => {
    const action = KEYMAP[e.key];
    if (action) {
      e.preventDefault();
      if (action.startsWith('nudge')) { if (!e.repeat) pending[action] = true; } else held[action] = true;
      return;
    }
    const fn = shortcuts.get(e.key);
    if (fn) { e.preventDefault(); fn(); }
  };
  const onUp = (e) => {
    const action = KEYMAP[e.key];
    if (action && !action.startsWith('nudge')) held[action] = false;
  };
  const onBlur = () => { held.left = false; held.right = false; held.plunger = false; };
  target.addEventListener('keydown', onDown);
  target.addEventListener('keyup', onUp);
  target.addEventListener('blur', onBlur);
  return {
    frame() {
      const snapshot = { ...held, ...pending };
      pending.nudgeLeft = false;
      pending.nudgeRight = false;
      return snapshot;
    },
    onKey(key, fn) { shortcuts.set(key, fn); },
    detach() {
      target.removeEventListener('keydown', onDown);
      target.removeEventListener('keyup', onUp);
      target.removeEventListener('blur', onBlur);
    },
  };
}
