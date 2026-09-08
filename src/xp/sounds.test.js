import { describe, it, expect } from 'vitest';
import { createSounds } from './sounds.js';

const memStorage = () => { const m = new Map(); return { get: (k) => m.get(k) ?? null, set: (k, v) => m.set(k, v), m }; };

class FakeCtx {
  constructor() { this.currentTime = 0; this.state = 'running'; this.destination = {}; this.sampleRate = 44100; this.oscillators = 0; }
  createOscillator() {
    this.oscillators++;
    const param = { setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
    return { type: '', frequency: param, connect: () => ({ connect() {} }), start() {}, stop() {} };
  }
  createGain() {
    const param = { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} };
    return { gain: param, connect: () => ({ connect() {} }) };
  }
  createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
  createBufferSource() { return { buffer: null, connect: () => ({ connect() {} }), start() {} }; }
  resume() { return Promise.resolve(); }
}

describe('createSounds', () => {
  it('is silent and safe without an AudioContext', () => {
    const s = createSounds({ storage: memStorage(), AudioCtx: undefined });
    expect(s.available).toBe(false);
    expect(() => s.play('startup')).not.toThrow();
  });
  it('persists the mute state', () => {
    const storage = memStorage();
    const s = createSounds({ storage, AudioCtx: FakeCtx });
    expect(s.isMuted()).toBe(false);
    s.setMuted(true);
    expect(storage.get('xpcomputer.muted')).toBe('1');
    expect(createSounds({ storage, AudioCtx: FakeCtx }).isMuted()).toBe(true);
    expect(s.toggleMuted()).toBe(false);
  });
  it('schedules oscillators for a cue and nothing while muted', () => {
    let ctx;
    class Recording extends FakeCtx { constructor() { super(); ctx = this; } }
    const s = createSounds({ storage: memStorage(), AudioCtx: Recording });
    s.play('startup');
    expect(ctx.oscillators).toBe(4);
    s.setMuted(true);
    s.play('startup');
    expect(ctx.oscillators).toBe(4);
  });
});
