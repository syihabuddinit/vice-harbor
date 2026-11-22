// Staged screenshot scenes. ?shot=start|drive|chase|mission sets the world
// up exactly as the screenshot names say, so a screenshot shows the game at
// its best: the city, the HUD, traffic, the police and a mission.
import { createCar, createPed } from './entities.js';
import { randomRoadPoint } from './city.js';

export function applyShot(world, name) {
  const rng = world.rng;
  const p = world.player;
  if (name === 'start') {
    // Mara on foot in Downtown, morning traffic around her.
    p.x = 1150; p.y = 700; p.onFoot = true; p.car = null;
    p.angle = -Math.PI / 2;
    return { camera: { x: 1150, y: 700 }, title: true };
  }
  if (name === 'drive') {
    // Mara driving up Palm Court with traffic ahead and the minimap live.
    const car = createCar(rng, 1000, 920, 'sedan', 'player');
    car.angle = 0;
    world.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0;
    car.speed = 260;
    return { camera: { x: 1000, y: 920 }, title: false };
  }
  if (name === 'chase') {
    // Three stars: two police cars on Mara's tail, sirens implied by the HUD.
    const car = createCar(rng, 1400, 920, 'sedan', 'player');
    car.angle = 0;
    world.cars.push(car);
    p.car = car;
    p.onFoot = false;
    p.x = car.x; p.y = car.y; p.angle = 0;
    car.speed = 320;
    world.wanted = 3;
    world.lastCrimeAt = world.time;
    for (let i = 0; i < 2; i++) {
      const pc = createCar(rng, 1400 - 160 - i * 90, 920 + (i === 0 ? -14 : 14), 'police', 'police');
      pc.angle = 0;
      pc.speed = 330;
      world.cars.push(pc);
    }
    return { camera: { x: 1400, y: 920 }, title: false };
  }
  if (name === 'mission') {
    // Harbor Heist in progress at the port: crates, guards, one crate taken.
    p.x = 480; p.y = 1520; p.onFoot = true; p.car = null;
    p.angle = Math.PI / 4;
    world.missions.index = 1;
    world.missions.started = true;
    world.missions.step = 1;
    world.missions.crates = 1;
    world.cash = 420;
    world.respect = 25;
    for (let i = 0; i < 3; i++) {
      const g = { x: 300 + i * 200, y: 1500 + (i % 2) * 80, angle: 0, shootCooldown: 1, kind: 'guard' };
      world.guards.push(g);
    }
    const ped = createPed(rng, 520, 1480);
    world.peds.push(ped);
    return { camera: { x: 500, y: 1520 }, title: false };
  }
  return { camera: { x: p.x, y: p.y }, title: false };
}

export function shotNames() {
  return ['start', 'drive', 'chase', 'mission'];
}
