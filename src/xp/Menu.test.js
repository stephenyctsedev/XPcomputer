import { describe, it, expect, beforeEach } from 'vitest';
import { createMenus, attachMenubar } from './Menu.js';

describe('menus', () => {
  let screen, menus;
  beforeEach(() => {
    document.body.innerHTML = '<div id="screen"><button id="anchor">File</button><div id="bar"></div></div>';
    screen = document.querySelector('#screen');
    menus = createMenus(screen);
  });

  it('opens a menu with items, runs the action and closes', () => {
    const hits = [];
    menus.open(document.querySelector('#anchor'), [
      { label: 'New', shortcut: 'Ctrl+N', action: () => hits.push('new') },
      { separator: true },
      { label: 'Exit', disabled: true },
    ]);
    const menu = screen.querySelector('.xp-menu');
    expect(menu.querySelectorAll('.xp-menu-item')).toHaveLength(2);
    expect(menu.querySelector('.xp-menu-sep')).not.toBeNull();
    expect(menu.querySelectorAll('.xp-menu-item')[1].disabled).toBe(true);
    menu.querySelector('.xp-menu-item').click();
    expect(hits).toEqual(['new']);
    expect(screen.querySelector('.xp-menu')).toBeNull();
    expect(menus.isOpen).toBe(false);
  });

  it('closes when clicking elsewhere and replaces an open menu', () => {
    menus.open(document.querySelector('#anchor'), [{ label: 'A' }]);
    menus.open(document.querySelector('#anchor'), [{ label: 'B' }]);
    expect(screen.querySelectorAll('.xp-menu')).toHaveLength(1);
    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(screen.querySelector('.xp-menu')).toBeNull();
  });

  it('renders a menubar whose items open their menus', () => {
    attachMenubar(document.querySelector('#bar'), menus, { File: [{ label: 'Close' }], Help: [{ label: 'About' }] });
    const items = screen.querySelectorAll('.xp-menubar-item');
    expect([...items].map((i) => i.textContent)).toEqual(['File', 'Help']);
    items[1].click();
    expect(screen.querySelector('.xp-menu .xp-menu-label').textContent).toBe('About');
  });

  it('focuses the first item on open and closes on Escape', () => {
    menus.open(document.querySelector('#anchor'), [{ label: 'New' }, { label: 'Open' }]);
    const items = screen.querySelectorAll('.xp-menu-item');
    expect(document.activeElement).toBe(items[0]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(screen.querySelector('.xp-menu')).toBeNull();
    expect(menus.isOpen).toBe(false);
  });

  it('moves focus between items with ArrowDown/ArrowUp, wrapping at each end', () => {
    menus.open(document.querySelector('#anchor'), [{ label: 'A' }, { label: 'B' }, { label: 'C' }]);
    const items = screen.querySelectorAll('.xp-menu-item');
    expect(document.activeElement).toBe(items[0]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[0]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[2]);
  });

  it('skips disabled items when focusing initially and when navigating', () => {
    menus.open(document.querySelector('#anchor'), [
      { label: 'A', disabled: true },
      { label: 'B' },
      { label: 'C', disabled: true },
      { label: 'D' },
    ]);
    const items = screen.querySelectorAll('.xp-menu-item');
    expect(document.activeElement).toBe(items[1]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(items[1]);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(items[3]);
  });
});
