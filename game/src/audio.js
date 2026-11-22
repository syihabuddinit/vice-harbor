// Synthesised WebAudio sounds — no audio files, everything generated.
export function makeAudio() {
  let ctx = null, muted = false, engineOsc = null, engineGain = null;
  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12, slideTo = null) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, vol = 0.1, low = 400) {
    if (muted) return;
    const c = ensure(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low;
    const g = c.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  return {
    get muted() { return muted; },
    toggleMute() { muted = !muted; if (muted && engineGain) engineGain.gain.value = 0; return muted; },
    shoot() { noise(0.09, 0.22, 1800); tone(180, 0.08, 'square', 0.08, 60); },
    crash() { noise(0.25, 0.25, 500); },
    pickup() { tone(660, 0.09, 'sine', 0.12); setTimeout(() => tone(990, 0.12, 'sine', 0.12), 80); },
    jingle() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 110)); },
    siren() { tone(700, 0.4, 'sine', 0.05, 1100); },
    busted() { tone(330, 0.3, 'sawtooth', 0.1, 110); },
    engineStart(speed01) {
      const c = ensure(); if (!c) return;
      if (!engineOsc) {
        engineOsc = c.createOscillator(); engineGain = c.createGain();
        engineOsc.type = 'sawtooth'; engineGain.gain.value = 0;
        engineOsc.connect(engineGain).connect(c.destination); engineOsc.start();
      }
      engineOsc.frequency.value = 50 + speed01 * 140;
      engineGain.gain.value = muted ? 0 : 0.02 + speed01 * 0.03;
    },
    engineStop() { if (engineGain) engineGain.gain.value = 0; },
  };
}
