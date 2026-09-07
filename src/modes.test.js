import { describe, it, expect } from 'vitest';
import { pickMode } from './modes.js';

describe('pickMode', () => {
  const desktop = { query: '', hasWebGL2: true, coarsePointer: false, viewportWidth: 1440 };

  it('picks room on a capable desktop', () => {
    expect(pickMode(desktop)).toBe('room');
  });
  it('forces flat with ?mode=flat', () => {
    expect(pickMode({ ...desktop, query: '?mode=flat' })).toBe('flat');
  });
  it('forces room with ?mode=room even on touch', () => {
    expect(pickMode({ ...desktop, query: '?mode=room', coarsePointer: true })).toBe('room');
  });
  it('falls back to flat without WebGL2', () => {
    expect(pickMode({ ...desktop, hasWebGL2: false })).toBe('flat');
  });
  it('falls back to flat on coarse pointers', () => {
    expect(pickMode({ ...desktop, coarsePointer: true })).toBe('flat');
  });
  it('falls back to flat under 900px wide', () => {
    expect(pickMode({ ...desktop, viewportWidth: 899 })).toBe('flat');
    expect(pickMode({ ...desktop, viewportWidth: 900 })).toBe('room');
  });
});
