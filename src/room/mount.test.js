import { describe, it, expect, vi } from 'vitest';
import { mountRoom } from './mount.js';
import { createRoom } from './index.js';

// createRoom() needs a real WebGL context (no mocking infra for that exists in this repo yet),
// so it's mocked out entirely here; this test is only about mount.js's own teardown surface,
// not about createRoom()/index.js's internals (which are exercised via manual browser testing).
vi.mock('./index.js', () => ({ createRoom: vi.fn() }));
vi.mock('./LoadingScreen.js', () => ({ createLoadingScreen: () => ({ log: () => {}, done: () => {} }) }));

function makeFakeRoom(state) {
  return { focusScreen: vi.fn(), leaveScreen: vi.fn(), setPower: vi.fn(), setLowFx: vi.fn(), state, on: vi.fn(() => vi.fn()), dispose: vi.fn() };
}

function makeDesktop(offBooted, offShutdown) {
  return {
    ctx: { storage: { get: () => null, set: () => {} } },
    isOn: false,
    powerOn: vi.fn(),
    setInteractive: vi.fn(),
    on: vi.fn((event) => (event === 'booted' ? offBooted : offShutdown)),
  };
}

describe('mountRoom teardown', () => {
  it('dispose() removes its own keydown listener and unsubscribes from both desktop events', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.querySelector('#app');
    const screenEl = document.createElement('div');
    const fakeRoom = makeFakeRoom('screen');
    createRoom.mockReturnValue(fakeRoom);
    const offBooted = vi.fn();
    const offShutdown = vi.fn();
    const desktop = makeDesktop(offBooted, offShutdown);

    const returned = await mountRoom(app, screenEl, desktop, {});

    expect(desktop.on).toHaveBeenCalledWith('booted', expect.any(Function));
    expect(desktop.on).toHaveBeenCalledWith('shutdown', expect.any(Function));

    // The Escape handler is live before dispose.
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(fakeRoom.leaveScreen).toHaveBeenCalledTimes(1);

    returned.dispose();

    expect(offBooted).toHaveBeenCalledTimes(1);
    expect(offShutdown).toHaveBeenCalledTimes(1);
    expect(fakeRoom.dispose).toHaveBeenCalledTimes(1);

    // The Escape handler must be gone after dispose (no second leaveScreen() call).
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(fakeRoom.leaveScreen).toHaveBeenCalledTimes(1);
  });

  it('still exposes the underlying room methods and a live state getter', async () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = document.querySelector('#app');
    const screenEl = document.createElement('div');
    const fakeRoom = makeFakeRoom('overview');
    createRoom.mockReturnValue(fakeRoom);
    const desktop = makeDesktop(vi.fn(), vi.fn());

    const returned = await mountRoom(app, screenEl, desktop, {});

    expect(returned.state).toBe('overview');
    fakeRoom.state = 'screen';
    expect(returned.state).toBe('screen'); // reflects live changes, not a snapshot

    returned.focusScreen();
    returned.leaveScreen();
    returned.setLowFx(true);
    expect(fakeRoom.focusScreen).toHaveBeenCalledTimes(1);
    expect(fakeRoom.leaveScreen).toHaveBeenCalledTimes(1);
    expect(fakeRoom.setLowFx).toHaveBeenCalledWith(true);
  });
});
