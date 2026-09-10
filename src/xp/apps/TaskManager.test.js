import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from '../WindowManager.js';
import { openTaskManager } from './TaskManager.js';

describe('Task Manager', () => {
  let ctx;
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="layer"></div>';
    ctx = { wm: createWindowManager(document.querySelector('#layer')), dialogs: { message: vi.fn(() => Promise.resolve('OK')) }, registry: { launch: vi.fn() } };
  });
  it('lists open windows as applications and ends the selected one', () => {
    ctx.wm.open({ appId: 'notepad', title: 'todo.txt - Notepad' });
    const ie = ctx.wm.open({ appId: 'iexplore', title: 'Homepage - Internet Explorer' });
    const tm = openTaskManager(ctx);
    const rows = () => [...tm.el.querySelectorAll('.xp-tm-apps tbody tr')].map((r) => r.children[0].textContent);
    expect(rows()).toEqual(['todo.txt - Notepad', 'Homepage - Internet Explorer']);
    tm.el.querySelectorAll('.xp-tm-apps tbody tr')[1].click();
    tm.el.querySelector('[data-cmd="endtask"]').click();
    expect(ctx.wm.windows.includes(ie)).toBe(false);
    expect(rows()).toEqual(['todo.txt - Notepad']);
  });
  it('refuses to end system processes and shows real windows as processes', () => {
    ctx.wm.open({ appId: 'notepad', title: 'Untitled - Notepad' });
    const tm = openTaskManager(ctx);
    tm.el.querySelectorAll('[role="tab"]')[1].click();
    const names = [...tm.el.querySelectorAll('.xp-tm-procs tbody tr')].map((r) => r.children[0].textContent);
    expect(names).toContain('notepad.exe');
    expect(names).toContain('System Idle Process');
    [...tm.el.querySelectorAll('.xp-tm-procs tbody tr')].find((r) => r.children[0].textContent === 'System').click();
    tm.el.querySelector('[data-cmd="endprocess"]').click();
    expect(ctx.dialogs.message).toHaveBeenCalled();
    expect(ctx.dialogs.message.mock.calls[0][0].text).toContain('Access is denied');
    vi.advanceTimersByTime(2000);
    expect(tm.el.querySelector('.xp-tm-cpu').textContent).toMatch(/\d+%/);
    vi.useRealTimers();
  });
  it('resyncs process selection when unrelated window opens', () => {
    const notepad = ctx.wm.open({ appId: 'notepad', title: 'todo.txt - Notepad' });
    const tm = openTaskManager(ctx);
    tm.el.querySelectorAll('[role="tab"]')[1].click();
    const procRows = () => [...tm.el.querySelectorAll('.xp-tm-procs tbody tr')];
    let notepadRow = procRows().find((r) => r.children[0].textContent === 'notepad.exe');
    notepadRow.click();
    expect(notepadRow.classList.contains('selected')).toBe(true);
    ctx.wm.open({ appId: 'iexplore', title: 'Homepage - Internet Explorer' });
    // Re-query the fresh row from the rebuilt DOM after render()
    notepadRow = procRows().find((r) => r.children[0].textContent === 'notepad.exe');
    expect(notepadRow.classList.contains('selected')).toBe(true);
  });
});
