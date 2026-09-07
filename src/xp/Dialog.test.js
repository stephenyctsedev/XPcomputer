import { describe, it, expect, beforeEach } from 'vitest';
import { createWindowManager } from './WindowManager.js';
import { createDialogs } from './Dialog.js';

describe('dialogs', () => {
  let wm, dialogs, played;
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div>';
    wm = createWindowManager(document.querySelector('#layer'));
    played = [];
    dialogs = createDialogs(wm, { sounds: { play: (n) => played.push(n) } });
  });

  it('resolves with the clicked button and blocks the owner while open', async () => {
    const owner = wm.open({ appId: 'a', title: 'A' });
    const p = dialogs.message({ title: 'Error', text: 'Boom', kind: 'error', buttons: ['Retry', 'Cancel'], owner });
    expect(owner.el.classList.contains('xp-inert')).toBe(true);
    const dlg = wm.windows.find((w) => w.appId === 'dialog');
    expect(dlg.isDialog).toBe(true);
    expect(dlg.el.querySelector('.title-bar-text').textContent).toContain('Error');
    expect(dlg.el.querySelector('.xp-msgbox-text').textContent).toBe('Boom');
    dlg.el.querySelector('button[data-result="Retry"]').click();
    await expect(p).resolves.toBe('Retry');
    expect(owner.el.classList.contains('xp-inert')).toBe(false);
    expect(played).toContain('error');
  });

  it('resolves Cancel when closed from the title bar', async () => {
    const p = dialogs.message({ text: 'x', buttons: ['OK', 'Cancel'] });
    wm.windows[0].el.querySelector('[aria-label="Close"]').click();
    await expect(p).resolves.toBe('Cancel');
  });

  it('runs the typed command from the Run dialog', () => {
    const ran = [];
    const win = dialogs.run({ onRun: (c) => ran.push(c) });
    const input = win.el.querySelector('input');
    input.value = '  winmine ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(ran).toEqual(['winmine']);
    expect(wm.windows).toHaveLength(0);
  });
});
