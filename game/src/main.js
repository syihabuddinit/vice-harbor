// Vice Harbor boot and game loop. The browser side only: it wires the
// canvas, the input and the world together, runs the loop, and owns the
// screens (title, pause, busted, wasted, failed, win).
import { createWorld, step, resetWorld } from './world.js';
import { createInput, readControls } from './input.js';
import { render, makeCamera, followCamera } from './render.js';
import { applyShot } from './shots.js';
import { saveGame, loadGame, applySave, hasSave } from './save.js';
import { setMuted, isMuted, playClick, playJingle } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || 20261122);
const shotName = params.get('shot');

const world = createWorld(seed);
const input = createInput();
input.attach(canvas);
const camera = makeCamera(canvas.width, canvas.height);

let ui = 'title';
let last = performance.now();
let fpsFrames = 0;
let fpsTime = 0;

function screenToWorld(sx, sy) {
  return {
    x: sx + camera.x - camera.w / 2,
    y: sy + camera.y - camera.h / 2,
  };
}

function startGame() {
  resetWorld(world, seed);
  world.state = 'playing';
  ui = 'playing';
  playClick();
}

function retryAfterEnd() {
  if (world.state === 'busted') {
    world.cash = Math.max(0, world.cash - 150);
    world.player.health = 100;
    world.player.x = 1150;
    world.player.y = 860;
    world.player.onFoot = true;
    world.player.car = null;
    world.wanted = 0;
    world.cars = world.cars.filter((c) => c.driver !== 'police');
    world.police = [];
    world.state = 'playing';
    ui = 'playing';
  } else if (world.state === 'wasted') {
    world.cash = Math.max(0, world.cash - 100);
    world.player.health = 100;
    world.player.x = 1150;
    world.player.y = 860;
    world.player.onFoot = true;
    world.player.car = null;
    world.wanted = 0;
    world.state = 'playing';
    ui = 'playing';
  } else if (world.state === 'failed') {
    world.missions.started = false;
    world.missions.step = 0;
    world.missions.timer = 0;
    world.wanted = 0;
    world.state = 'playing';
    ui = 'playing';
  } else if (world.state === 'win') {
    world.state = 'playing';
    ui = 'playing';
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const ctrl = readControls(input, null);
  const aim = screenToWorld(ctrl.aimScreenX, ctrl.aimScreenY);
  ctrl.aimX = aim.x;
  ctrl.aimY = aim.y;

  if (ctrl.mute && !frame.mutePressed) setMuted(!isMuted());
  frame.mutePressed = ctrl.mute;

  if (ui === 'title') {
    if (ctrl.confirm) {
      const save = hasSave() && ctrl.continueSave ? loadGame() : null;
      startGame();
      if (save) applySave(world, save);
    }
    followCamera(camera, world.player.x, world.player.y);
    render(ctx, world, camera, 'title');
  } else if (ui === 'playing') {
    if (ctrl.pause && !frame.pausePressed) {
      ui = 'paused';
      playClick();
    }
    frame.pausePressed = ctrl.pause;
    if (ctrl.save) {
      saveGame(world);
      world.message = 'Game saved';
    }
    if (ui === 'playing') {
      step(world, ctrl, dt);
      if (world.state === 'busted') { ui = 'busted'; playJingle(false); }
      else if (world.state === 'wasted') { ui = 'wasted'; playJingle(false); }
      else if (world.state === 'failed') { ui = 'failed'; playJingle(false); }
      else if (world.state === 'win') { ui = 'win'; playJingle(true); }
      followCamera(camera, world.player.x, world.player.y);
      render(ctx, world, camera, 'playing');
    }
  } else if (ui === 'paused') {
    if (ctrl.pause && !frame.pausePressed) {
      ui = 'playing';
      playClick();
    }
    frame.pausePressed = ctrl.pause;
    render(ctx, world, camera, 'paused');
  } else {
    // busted, wasted, failed, win
    if (ctrl.confirm && !frame.confirmPressed) retryAfterEnd();
    frame.confirmPressed = ctrl.confirm;
    followCamera(camera, world.player.x, world.player.y);
    render(ctx, world, camera, ui);
  }

  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    document.title = 'Vice Harbor — ' + fpsFrames + ' fps';
    fpsFrames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(frame);
}

// Staged screenshot mode: set the scene up, draw one frame, stop.
if (shotName) {
  const scene = applyShot(world, shotName);
  world.state = 'playing';
  followCamera(camera, scene.camera.x, scene.camera.y);
  render(ctx, world, camera, scene.title ? 'title' : 'playing');
  document.title = 'Vice Harbor — shot ' + shotName;
} else {
  requestAnimationFrame(frame);
}
