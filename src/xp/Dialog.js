import { iconEl } from './icons/index.js';

const KIND_ICON = { error: 'errorIcon', info: 'infoIcon', question: 'questionIcon', warning: 'shield' };

export function createDialogs(wm, { sounds } = {}) {
  function centerOn(owner, w, h) {
    const box = owner ? owner.bounds : { x: 0, y: 0, w: wm.deskW, h: wm.deskH };
    return { x: Math.round(box.x + (box.w - w) / 2), y: Math.round(box.y + (box.h - h) / 2) };
  }

  function message({ title = 'Windows', text = '', kind = 'info', buttons = ['OK'], owner = null, defaultButton = 0 } = {}) {
    return new Promise((resolve) => {
      const body = document.createElement('div');
      body.className = 'xp-msgbox';
      const row = document.createElement('div');
      row.className = 'xp-msgbox-row';
      const textEl = document.createElement('div');
      textEl.className = 'xp-msgbox-text';
      textEl.textContent = text;
      row.append(iconEl(KIND_ICON[kind] ?? 'infoIcon', 32), textEl);
      const buttonRow = document.createElement('div');
      buttonRow.className = 'xp-msgbox-buttons';
      body.append(row, buttonRow);

      let result = null;
      let win = null;
      const fallback = buttons.includes('Cancel') ? 'Cancel' : buttons[buttons.length - 1];
      buttons.forEach((label, i) => {
        const b = document.createElement('button');
        b.textContent = label;
        b.dataset.result = label;
        if (i === defaultButton) b.classList.add('default');
        b.addEventListener('click', () => { result = label; win.close(); });
        buttonRow.append(b);
      });
      body.addEventListener('keydown', (e) => { if (e.key === 'Escape') { result = fallback; win.close(); } });

      const w = 380;
      const h = Math.min(420, 120 + Math.ceil(text.length / 48) * 16);
      owner?.el.classList.add('xp-inert');
      sounds?.play(kind === 'error' ? 'error' : 'balloon');
      win = wm.open({
        appId: 'dialog', title, icon: KIND_ICON[kind] ?? 'infoIcon', dialog: true, width: w, height: h, ...centerOn(owner, w, h), content: body,
        onClose: () => { owner?.el.classList.remove('xp-inert'); resolve(result ?? fallback); },
      });
      body.querySelector('button.default')?.focus();
    });
  }

  function run({ onRun }) {
    const body = document.createElement('div');
    body.className = 'xp-msgbox xp-rundlg';
    body.innerHTML = `
      <div class="xp-msgbox-row"><span class="xp-run-icon"></span>
        <div class="xp-msgbox-text">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</div></div>
      <div class="xp-run-field"><label for="xp-run-input">Open:</label><input id="xp-run-input" type="text" autocomplete="off" spellcheck="false"></div>
      <div class="xp-msgbox-buttons"><button data-result="OK" class="default">OK</button><button data-result="Cancel">Cancel</button></div>`;
    body.querySelector('.xp-run-icon').append(iconEl('run', 32));
    const w = 400, h = 180;
    const win = wm.open({ appId: 'run', title: 'Run', icon: 'run', dialog: true, width: w, height: h, x: 0, y: wm.deskH - h, content: body });
    const input = body.querySelector('input');
    const submit = () => { const command = input.value.trim(); win.close(); if (command) onRun(command); };
    body.querySelector('[data-result="OK"]').addEventListener('click', submit);
    body.querySelector('[data-result="Cancel"]').addEventListener('click', () => win.close());
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
      if (e.key === 'Escape') win.close();
    });
    setTimeout(() => input.focus(), 0);
    return win;
  }

  return { message, run };
}
