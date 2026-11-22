// The world: everything that exists in Vice Harbor, and the one step()
// that moves it all forward. No drawing, no DOM — the browser loop in
// main.js and the tests both drive the world through step().
import { buildCity, randomRoadPoint, SEA_Y } from './city.js';
import { makeRng } from './rng.js';
import {
  createPlayer, createCar, createPed,
  stepPlayer, stepTraffic, stepPeds, stepPolice, stepBullets, stepPickups, scarePeds,
} from './entities.js';
import { createMissionState, updateMissions, updateGuards, updateTaxi } from './missions.js';
import { startSiren, stopSiren } from './audio.js';

export function createWorld(seed) {
  const rng = makeRng(seed || 20261122);
  const city = buildCity(rng);
  const player = createPlayer(1150, 860);
  const cars = [];
  for (let i = 0; i < 14; i++) {
    const spot = randomRoadPoint(rng);
    cars.push(createCar(rng, spot.x, spot.y, 'sedan', 'traffic'));
  }
  for (let i = 0; i < 3; i++) {
    const spot = randomRoadPoint(rng);
    cars.push(createCar(rng, spot.x, spot.y, 'taxi', 'traffic'));
  }
  const peds = [];
  for (let i = 0; i < 26; i++) {
    const spot = randomRoadPoint(rng);
    peds.push(createPed(rng, spot.x, spot.y));
  }
  const pickups = [];
  for (let i = 0; i < 8; i++) {
    const spot = randomRoadPoint(rng);
    pickups.push({
      x: spot.x + rng.range(-40, 40),
      y: spot.y + rng.range(-40, 40),
      kind: i % 2 === 0 ? 'health' : 'cash',
      taken: false,
    });
  }
  return {
    seed: seed || 20261122,
    rng, city, player, cars, peds, police: [], guards: [],
    bullets: [], pickups,
    wanted: 0, cash: 120, respect: 0,
    time: 0, lastCrimeAt: -100, crimeFlash: 0,
    state: 'playing', message: '', messageTimer: 0,
    missions: createMissionState(),
    taxi: { active: false, state: 'idle', ped: null, target: null, fare: 0, spawnTimer: 12 },
    stats: { carsStolen: 0, shotsFired: 0, fares: 0 },
  };
}

export function step(world, ctrl, dt) {
  if (world.state !== 'playing') return;
  world.time += dt;
  world.crimeFlash = Math.max(0, world.crimeFlash - dt);
  if (world.message) {
    world.messageTimer += dt;
    if (world.messageTimer > 5) {
      world.message = '';
      world.messageTimer = 0;
    }
  }
  // Wanted level decays when Mara stays clean and out of sight.
  if (world.wanted > 0 && world.time - world.lastCrimeAt > 14) {
    const nearPolice = world.cars.some(
      (c) => c.driver === 'police' && Math.hypot(c.x - world.player.x, c.y - world.player.y) < 500,
    );
    if (!nearPolice) {
      world.wantedDecay = (world.wantedDecay || 0) + dt;
      if (world.wantedDecay > 5) {
        world.wanted -= 1;
        world.wantedDecay = 0;
        world.message = 'Heat dying down — wanted level ' + world.wanted;
      }
    } else {
      world.wantedDecay = 0;
    }
  }
  stepPlayer(world, ctrl, dt);
  stepTraffic(world, dt);
  stepPeds(world, dt);
  stepPolice(world, dt);
  stepBullets(world, dt);
  stepPickups(world);
  updateMissions(world, dt);
  updateGuards(world, dt);
  updateTaxi(world, dt);
  if (world.state === 'playing' && world.player.health <= 0) world.state = 'wasted';
  if (world.wanted > 0) startSiren();
  else stopSiren();
  if (world.player.y > SEA_Y) world.player.y = SEA_Y - 20;
}

export function resetWorld(world, seed) {
  const fresh = createWorld(seed || world.seed);
  for (const key of Object.keys(fresh)) world[key] = fresh[key];
}
