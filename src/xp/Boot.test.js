import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createBoot } from './Boot.js';

describe('boot sequence', () => {
  let screen, boot, played, states, powerRequests;
  const layer = () => screen.querySelector('.xp-boot');
  const visible = () => [...layer().children].filter((el) => !el.hidden).map((el) => el.className.split(' ')[0]);
  const skipAll = async () => { const p = boot.powerOn(); for (let i = 0; i < 3; i++) { layer().click(); await vi.advanceTimersByTimeAsync(0); } await p; };

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<div id="screen"></div>';
    screen = document.querySelector('#screen');
    played = []; states = []; powerRequests = 0;
    boot = createBoot(screen, { sounds: { play: (n) => played.push(n), unlock() {} }, onState: (s) => states.push(s), onPowerRequest: () => powerRequests++ });
  });
  afterEach(() => vi.useRealTimers());

  it('shows the four-colour flag beside the Windows XP wordmark on the logo screen', () => {
    const logo = layer().querySelector('.xp-bootlogo');
    expect(logo.querySelectorAll('.xp-flag svg.xp-winflag .xp-winflag-pane')).toHaveLength(4);
    expect(logo.querySelector('.xp-flag i')).toBeNull();
    expect(logo.querySelector('.xp-bootlogo-text').textContent.replace(/\s+/g, ' ').trim()).toBe('Windows XP');
  });

  it('starts off, asks for power on click, then walks bios -> logo -> welcome -> on', async () => {
    expect(boot.state).toBe('off');
    expect(visible()).toEqual(['xp-off']);
    layer().click();
    expect(powerRequests).toBe(1);
    const done = boot.powerOn();
    expect(boot.state).toBe('booting');
    expect(visible()).toEqual(['xp-bios']);
    await vi.advanceTimersByTimeAsync(9 * 160 + 400 + 10);
    expect(visible()).toEqual(['xp-bootlogo']);
    await vi.advanceTimersByTimeAsync(2510);
    expect(visible()).toEqual(['xp-welcome']);
    await vi.advanceTimersByTimeAsync(1010);
    await done;
    expect(boot.state).toBe('on');
    expect(layer().hidden).toBe(true);
    expect(played).toEqual(['startup']);
    expect(states).toEqual(['booting', 'on']);
  });

  it('skips phases on click', async () => {
    const done = boot.powerOn();
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toEqual(['xp-bootlogo']);
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    expect(visible()).toEqual(['xp-welcome']);
    layer().click();
    await vi.advanceTimersByTimeAsync(0);
    await done;
    expect(boot.state).toBe('on');
  });

  it('shuts down to black and can restart', async () => {
    await skipAll();
    const off = boot.shutdown();
    expect(boot.state).toBe('shutting-down');
    expect(visible()).toEqual(['xp-shutdown']);
    await vi.advanceTimersByTimeAsync(1810);
    await off;
    expect(boot.state).toBe('off');
    expect(visible()).toEqual(['xp-off']);
    expect(played).toContain('shutdown');
    const restart = boot.powerOn();
    expect(boot.state).toBe('booting');
    for (let i = 0; i < 3; i++) { layer().click(); await vi.advanceTimersByTimeAsync(0); }
    await restart;
    expect(boot.state).toBe('on');
  });

  it('stands by until a click', async () => {
    await skipAll();
    boot.standBy();
    expect(boot.state).toBe('standby');
    expect(visible()).toEqual(['xp-off']);
    layer().click();
    expect(boot.state).toBe('on');
    expect(layer().hidden).toBe(true);
  });

  it('logs off to the logon screen and comes back when the user tile is clicked', async () => {
    await skipAll();
    const back = boot.logOff();
    expect(boot.state).toBe('logon');
    await vi.advanceTimersByTimeAsync(1210);
    expect(visible()).toEqual(['xp-logon']);
    screen.querySelector('.xp-logon-user').click();
    await vi.advanceTimersByTimeAsync(810);
    await back;
    expect(boot.state).toBe('on');
  });
});
