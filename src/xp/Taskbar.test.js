import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createWindowManager } from './WindowManager.js';
import { createTaskbar, formatClock } from './Taskbar.js';

describe('formatClock', () => {
  it('formats like the XP tray', () => {
    expect(formatClock(new Date(2026, 8, 7, 15, 7))).toBe('3:07 PM');
    expect(formatClock(new Date(2026, 8, 7, 0, 0))).toBe('12:00 AM');
    expect(formatClock(new Date(2026, 8, 7, 12, 30))).toBe('12:30 PM');
  });
});

describe('createTaskbar', () => {
  let wm, bar, played, started;
  const sounds = { available: true, play: (n) => played.push(n), isMuted: () => false, toggleMuted: () => false };
  beforeEach(() => {
    document.body.innerHTML = '<div id="layer"></div><div id="bar"></div>';
    wm = createWindowManager(document.querySelector('#layer'));
    played = [];
    started = 0;
    bar = createTaskbar(document.querySelector('#bar'), { wm, sounds, onStart: () => started++, now: () => new Date(2026, 8, 7, 9, 5) });
  });

  it('shows the clock and fires onStart', () => {
    expect(bar.el.querySelector('.xp-clock').textContent).toBe('9:05 AM');
    expect(bar.el.querySelectorAll('.xp-start .xp-start-flag svg.xp-winflag .xp-winflag-pane')).toHaveLength(4);
    bar.el.querySelector('.xp-start').click();
    expect(started).toBe(1);
  });

  it('mirrors windows as task buttons, skipping dialogs', () => {
    const a = wm.open({ appId: 'a', title: 'Notepad' });
    wm.open({ appId: 'dialog', title: 'Error', dialog: true });
    const buttons = () => [...bar.el.querySelectorAll('.xp-task')];
    expect(buttons().map((b) => b.textContent)).toEqual(['Notepad']);
    a.focus();
    expect(buttons()[0].classList.contains('active')).toBe(true);
    a.minimize();
    expect(buttons()[0].classList.contains('minimized')).toBe(true);
    buttons()[0].click();
    expect(a.isMinimized).toBe(false);
    a.setTitle('todo.txt - Notepad');
    expect(buttons()[0].textContent).toBe('todo.txt - Notepad');
    a.close();
    expect(buttons()).toHaveLength(0);
  });

  it('shows a balloon tip that runs its action on click and auto hides', () => {
    vi.useFakeTimers();
    let clicked = 0;
    bar.showBalloon({ title: 'Hi', text: 'Click me', onClick: () => clicked++, timeout: 1000 });
    const balloon = bar.el.querySelector('.xp-balloon');
    expect(balloon.hidden).toBe(false);
    expect(played).toContain('balloon');
    balloon.querySelector('.xp-balloon-text').click();
    expect(clicked).toBe(1);
    expect(balloon.hidden).toBe(true);
    bar.showBalloon({ title: 'Hi', text: 'Again', timeout: 1000 });
    vi.advanceTimersByTime(1100);
    expect(balloon.hidden).toBe(true);
    vi.useRealTimers();
  });
});
