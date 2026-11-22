// Synthesised sound for Vice Harbor: engine hum, sirens, gunshots and
// jingles, all made with WebAudio — no audio files, no network. Every
// function is a no-op when there is no browser audio (tests, servers).
let ctx = null;
let muted = false;
let sirenNodes = null;

function audio() {
  if (typeof window === 'undefined' || muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(value) {
  muted = value;
  if (muted) stopSiren();
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, slideTo) {
  const ac = audio();
  if (!ac) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'square';
  osc.frequency.setValueAtTime(freq, ac.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + dur);
  gain.gain.setValueAtTime(vol || 0.12, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + dur);
}

export function playClick() {
  tone(660, 0.06, 'square', 0.06);
}

export function playGunshot() {
  const ac = audio();
  if (!ac) return;
  const dur = 0.14;
  const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.25, ac.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
  src.connect(gain).connect(ac.destination);
  src.start();
}

export function playPickup() {
  tone(880, 0.09, 'sine', 0.12);
  setTimeout(() => tone(1320, 0.12, 'sine', 0.12), 70);
}

export function playJingle(win) {
  const notes = win ? [523, 659, 784, 1047] : [392, 330, 262, 196];
  notes.forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.14), i * 110));
}

export function playCrash() {
  tone(90, 0.3, 'sawtooth', 0.2, 40);
}

export function startSiren() {
  const ac = audio();
  if (!ac || sirenNodes) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(700, ac.currentTime);
  gain.gain.setValueAtTime(0.05, ac.currentTime);
  const lfo = ac.createOscillator();
  const lfoGain = ac.createGain();
  lfo.frequency.value = 0.9;
  lfoGain.gain.value = 260;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  lfo.start();
  sirenNodes = { osc, lfo, gain };
}

export function stopSiren() {
  if (!sirenNodes) return;
  try {
    sirenNodes.osc.stop();
    sirenNodes.lfo.stop();
  } catch { /* already stopped */ }
  sirenNodes = null;
}

export function engineHum(rpm) {
  const ac = audio();
  if (!ac) return;
  tone(60 + rpm * 90, 0.1, 'sawtooth', 0.03);
}
