import { describe, it, expect, beforeEach } from 'vitest';
import { createStartMenu } from './StartMenu.js';

describe('Start menu keyboard', () => {
  let menu, hits, root;
  beforeEach(() => {
    document.body.innerHTML = '<div id="sm"></div>';
    root = document.querySelector('#sm');
    hits = [];
    menu = createStartMenu(root, {
      userName: 'Stephen',
      left: [{ label: 'Internet', sublabel: 'Internet Explorer', icon: 'ie', action: () => hits.push('ie') }, { label: 'Notepad', icon: 'notepad', action: () => hits.push('notepad') }],
      right: [{ label: 'My Computer', icon: 'computer', action: () => hits.push('computer') }],
      allPrograms: [], onLogOff: () => hits.push('logoff'), onTurnOff: () => hits.push('turnoff'),
    });
  });
  it('focuses the first item on open and moves with arrows', () => {
    menu.open();
    expect(document.activeElement.textContent).toContain('Internet');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Notepad');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement.textContent).toContain('Turn Off');
    document.activeElement.click();
    expect(hits).toEqual(['turnoff']);
    expect(menu.isOpen).toBe(false);
  });
  it('has menu semantics', () => {
    expect(root.getAttribute('role')).toBe('menu');
    expect(root.querySelector('.xp-sm-item').getAttribute('role')).toBe('menuitem');
  });
});
