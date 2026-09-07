import { attachMenubar } from '../Menu.js';

export function registerNotepad(registry) {
  registry.register('notepad', { name: 'Notepad', icon: 'notepad', launch: (ctx, payload = {}) => openNotepad(ctx, payload) });
}

export function openNotepad(ctx, { title = 'Untitled', text = '' } = {}) {
  const { wm, dialogs, menus } = ctx;
  const body = document.createElement('div');
  body.className = 'xp-notepad';
  body.innerHTML = '<div class="xp-notepad-menubar"></div><textarea spellcheck="false" wrap="off"></textarea>';
  const textarea = body.querySelector('textarea');
  textarea.value = text;
  let dirty = false;
  let wordWrap = false;
  textarea.addEventListener('input', () => { dirty = true; });

  const win = wm.open({ appId: 'notepad', title: `${title} - Notepad`, icon: 'notepad', width: 560, height: 420, minWidth: 300, minHeight: 200, content: body });
  const info = (message) => dialogs.message({ title: 'Notepad', kind: 'info', owner: win, text: message });
  const saved = () => { dirty = false; return info('Saved to nowhere. This is a demo, but thanks for the edits.'); };

  const realClose = win.close;
  win.close = async () => {
    if (dirty) {
      const answer = await dialogs.message({ title: 'Notepad', kind: 'question', owner: win, buttons: ['Yes', 'No', 'Cancel'], text: `The text in the ${title} file has changed.\n\nDo you want to save the changes?` });
      if (answer === 'Cancel') return;
      if (answer === 'Yes') await saved();
    }
    realClose();
  };

  attachMenubar(body.querySelector('.xp-notepad-menubar'), menus, {
    File: [
      { label: 'New', shortcut: 'Ctrl+N', action: () => { textarea.value = ''; dirty = true; win.setTitle('Untitled - Notepad'); } },
      { label: 'Open...', shortcut: 'Ctrl+O', action: () => info('Open the files from My Documents instead.') },
      { label: 'Save', shortcut: 'Ctrl+S', action: saved },
      { label: 'Save As...', action: saved },
      { separator: true },
      { label: 'Page Setup...', disabled: true },
      { label: 'Print...', shortcut: 'Ctrl+P', disabled: true },
      { separator: true },
      { label: 'Exit', action: () => win.close() },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', disabled: true },
      { separator: true },
      { label: 'Select All', shortcut: 'Ctrl+A', action: () => { textarea.focus(); textarea.select(); } },
      { label: 'Time/Date', shortcut: 'F5', action: () => { const at = textarea.selectionStart; const stamp = new Date().toLocaleString(); textarea.setRangeText(stamp, at, at, 'end'); dirty = true; } },
    ],
    Format: () => [
      { label: 'Word Wrap', checked: wordWrap, action: () => { wordWrap = !wordWrap; textarea.wrap = wordWrap ? 'soft' : 'off'; } },
      { label: 'Font...', disabled: true },
    ],
    View: [{ label: 'Status Bar', disabled: true }],
    Help: [{ label: 'Help Topics', disabled: true }, { separator: true }, { label: 'About Notepad', action: () => info('Notepad, recreated in about a hundred lines of JavaScript.') }],
  });
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'F5') { e.preventDefault(); const at = textarea.selectionStart; textarea.setRangeText(new Date().toLocaleString(), at, at, 'end'); dirty = true; }
    if (e.ctrlKey && e.key.toLowerCase() === 's') { e.preventDefault(); saved(); }
  });
  setTimeout(() => textarea.focus(), 0);
  return win;
}
