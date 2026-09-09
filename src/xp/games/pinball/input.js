export const KEYMAP = {
  z: 'left', Z: 'left', ArrowLeft: 'left',
  '/': 'right', '?': 'right', ArrowRight: 'right',
  ' ': 'plunger', ArrowDown: 'plunger',
  x: 'nudgeLeft', X: 'nudgeLeft',
  '.': 'nudgeRight', '>': 'nudgeRight',
};

/** Keyboard → held flippers/plunger plus one-shot nudges. Other keys can be bound with onKey (F2, F3).
 * `target` gets the keydown/keyup listeners (pass `document` to stay input-live regardless of which
 * element has DOM focus). `enabled` (default: always true) gates keydown only — keyup always runs so a
 * held flipper/plunger key reliably releases even if focus/enabled state changes mid-press. */
export function createInput(target, { enabled } = {}) {
  const isEnabled = enabled ?? (() => true);
  const held = { left: false, right: false, plunger: false };
  const pending = { nudgeLeft: false, nudgeRight: false };
  const shortcuts = new Map();
  const onDown = (e) => {
    if (!isEnabled()) return;
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
  window.addEventListener('blur', onBlur);
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
      window.removeEventListener('blur', onBlur);
    },
  };
}
