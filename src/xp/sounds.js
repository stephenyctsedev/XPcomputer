// Every cue is synthesized with WebAudio. No sample files, nothing recorded from Windows.
const KEY = 'xpcomputer.muted';

// [frequencyHz, startOffsetSec, durationSec, oscillatorType?, gain?, slideToHz?]
const CUES = {
  startup: [[523.25, 0, 0.35], [659.25, 0.12, 0.35], [783.99, 0.24, 0.45], [1046.5, 0.4, 0.7]],
  shutdown: [[783.99, 0, 0.3], [659.25, 0.15, 0.3], [523.25, 0.3, 0.3], [392, 0.45, 0.6]],
  click: [[1200, 0, 0.03, 'square', 0.15]],
  error: [[440, 0, 0.18, 'square', 0.25], [330, 0.18, 0.3, 'square', 0.25]],
  balloon: [[880, 0, 0.08], [1320, 0.08, 0.15]],
  menu: [[600, 0, 0.04, 'triangle', 0.12]],
  cardFlip: [[900, 0, 0.03, 'triangle', 0.15], [1400, 0.03, 0.04, 'triangle', 0.1]],
  cardPlace: [[300, 0, 0.05, 'triangle', 0.2]],
  mineTick: [[1000, 0, 0.02, 'square', 0.1]],
  win: [[523.25, 0, 0.15], [659.25, 0.15, 0.15], [783.99, 0.3, 0.15], [1046.5, 0.45, 0.5]],
  flipper: [[180, 0, 0.05, 'square', 0.2]],
  bumper: [[700, 0, 0.06, 'square', 0.25], [1050, 0.03, 0.08, 'square', 0.2]],
  target: [[1500, 0, 0.08, 'triangle', 0.2]],
  drain: [[400, 0, 0.4, 'sawtooth', 0.2, 80]],
};

export function safeStorage() {
  return {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  };
}

export function createSounds({ storage = safeStorage(), AudioCtx = globalThis.AudioContext } = {}) {
  const available = typeof AudioCtx === 'function';
  let ctx = null;
  let muted = storage.get(KEY) === '1';

  function unlock() {
    if (!available || ctx) return;
    try { ctx = new AudioCtx(); } catch { ctx = null; }
  }

  function tone(freq, at, dur, type = 'sine', gain = 0.2, slideTo) {
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(at, dur, gain) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    src.connect(amp).connect(ctx.destination);
    src.start(ctx.currentTime + at);
  }

  function play(name) {
    if (muted || !available) return;
    unlock();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (name === 'mineBoom') { noise(0, 0.4, 0.4); tone(90, 0, 0.35, 'sawtooth', 0.3, 40); return; }
    for (const [freq, at, dur, type, gain, slideTo] of CUES[name] ?? []) tone(freq, at, dur, type, gain, slideTo);
  }

  const api = {
    available,
    play,
    unlock,
    isMuted: () => muted,
    setMuted(value) { muted = Boolean(value); storage.set(KEY, muted ? '1' : '0'); },
    toggleMuted() { api.setMuted(!muted); return muted; },
  };
  return api;
}
