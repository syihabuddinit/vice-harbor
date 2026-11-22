// Staged screenshot scenes: ?shot=start|drive|chase|mission&seed=1
// Each sets up a readable scene and sets window.__shotReady when drawn.
import { makeWorld, startGame } from './world.js';
import { startMission } from './missions.js';
import { makeCar } from './entities.js';
import { PALETTE } from './config.js';

export function applyShot(world, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') || 1);
  world.seed = seed;
  if (shot === 'start') {
    world.state = 'title';
    world.cam.x = 640; world.cam.y = 200;
    world.player.x = 1160; world.player.y = 590;
    return true;
  }
  startGame(world);
  if (shot === 'drive') {
    // Mara driving through Downtown on Mission 1.
    const car = makeCar(1160, 590, 0, '#ff2a5a', 'player');
    car.speed = 320;
    world.cars.push(car);
    world.player.car = car; world.player.x = car.x; world.player.y = car.y;
    world.cam.x = 640; world.cam.y = 260;
    return true;
  }
  if (shot === 'chase') {
    startMission(world, 2);
    world.wanted = 3;
    const car = makeCar(900, 830, 0, '#ff2a5a', 'player');
    car.speed = 380;
    world.cars.push(car);
    world.player.car = car; world.player.x = car.x; world.player.y = car.y;
    for (let i = 0; i < 3; i++) {
      world.policeCars.push(makeCar(900 - 160 - i * 90, 830, 0, PALETTE.police, 'police'));
    }
    world.cam.x = 500; world.cam.y = 500;
    return true;
  }
  if (shot === 'mission') {
    startMission(world, 1);
    world.player.x = 2100; world.player.y = 1350;
    world.cam.x = 1500; world.cam.y = 1000;
    return true;
  }
  return false;
}
export function markShotReady() { window.__shotReady = true; }
