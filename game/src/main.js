// Vice Harbor — boot and fixed-step game loop.
import { VIEW_W, VIEW_H } from './config.js';
import { makeWorld, startGame, update, saveGame, loadGame, hasSave } from './world.js';
import { makeInput } from './input.js';
import { render } from './render.js';
import { applyShot, markShotReady } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W; canvas.height = VIEW_H;

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 1);
const world = makeWorld(seed);
world.input = makeInput(canvas);
const input = world.input;

const shot = applyShot(world, params);
if (!shot) world.state = 'title';

let last = performance.now();
let shotFrames = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  // Global keys.
  if (input.wasPressed('mute')) world.audio.toggleMute();
  if (world.state === 'title') {
    if (input.wasPressed('space') || input.wasPressed('confirm')) startGame(world);
    else if (input.wasPressed('continue') && hasSave(world)) loadGame(world);
  } else if (world.state === 'play') {
    if (input.wasPressed('pause')) { world.state = 'pause'; world.audio.engineStop(); }
    // Ctrl+S save: detect via keydown on window.
    update(world, input, dt);
  } else if (world.state === 'pause') {
    if (input.wasPressed('pause')) world.state = 'play';
  } else if (world.state === 'over' || world.state === 'won') {
    if (input.wasPressed('confirm') || input.wasPressed('space')) {
      const fresh = makeWorld(seed);
      Object.assign(world, fresh, { input: world.input, audio: world.audio });
      world.state = 'title';
      // Fresh clock and shot counter: the old `last` would make the first
      // frame of the new game jump a full clamped step.
      last = performance.now();
      shotFrames = 0;
    }
  }
  render(world, ctx);
  input.consume();
  if (shot) {
    shotFrames++;
    if (shotFrames >= 3) markShotReady();
  }
  requestAnimationFrame(frame);
}
// Auto-pause when the tab is hidden: the police keep chasing while the player
// is away, so pause instead of letting Mara get busted in the background.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && world.state === 'play') {
    world.state = 'pause';
    world.audio.engineStop();
  }
});
window.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
    e.preventDefault();
    if (world.state === 'play') saveGame(world);
  }
});
requestAnimationFrame(frame);
