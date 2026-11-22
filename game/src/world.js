// World state and the fixed-step simulation.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, TUNING } from './config.js';
import { buildCity, freeSpotNear } from './city.js';
import { makeAudio } from './audio.js';
import { makePlayer, spawnTraffic, spawnPeds, updatePlayer, updateTraffic, updatePeds, updateBullets, updatePolice, makeCar } from './entities.js';
import { startMission, updateMissions, MISSIONS } from './missions.js';
import { mulberry32, pick, clamp } from './rng.js';
import { PALETTE } from './config.js';

export function makeWorld(seed = 1) {
  const city = buildCity(seed);
  const rng = mulberry32(seed * 7919 + 13);
  const spawn = freeSpotNear(city, 500, 500);
  const player = makePlayer(spawn.x, spawn.y);
  const cars = spawnTraffic(city, rng, 14);
  // A few parked cars the player can steal without traffic.
  for (const [x, y] of [[640, 590], [1160, 830], [1680, 350], [900, 1310]]) {
    cars.push(makeCar(x, y, 0, pick(rng, PALETTE.traffic), 'parked'));
  }
  const world = {
    seed, city, player, cars, peds: spawnPeds(city, rng, 26),
    bullets: [], police: [], policeCars: [],
    pickups: [],
    wanted: 0, time: 0, state: 'title', // title | play | pause | over | won
    mission: null, lastMissionIdx: 0, nextMissionIn: 0, nextMissionIdx: 0,
    taxi: { active: false }, taxiCd: 10,
    hudFlash: '', hudFlashT: 0, gameWon: false, muted: false,
    cam: { x: 0, y: 0 },
    audio: makeAudio(),
    saveSlot: 'vice-harbor-save-v1',
  };
  // Cash and health pickups scattered on roads.
  for (let i = 0; i < 10; i++) {
    const x = 200 + rng() * (WORLD_W - 400), y = 200 + rng() * (WORLD_H - 400);
    world.pickups.push({ x, y, kind: i % 3 === 0 ? 'health' : 'cash', taken: false });
  }
  return world;
}

export function startGame(world) {
  world.state = 'play';
  if (!world.mission) startMission(world, 0);
}

export function update(world, input, dt) {
  dt = Math.min(dt, 0.05);
  if (world.state !== 'play') return;
  world.time += dt;
  world.hudFlashT = Math.max(0, (world.hudFlashT || 0) - dt);
  if (world.hudFlashT <= 0) world.hudFlash = '';
  // Next mission after a short breather.
  if (!world.mission && world.nextMissionIn > 0) {
    world.nextMissionIn -= dt;
    if (world.nextMissionIn <= 0) {
      world.lastMissionIdx = world.nextMissionIdx;
      startMission(world, world.nextMissionIdx);
    }
  }
  updatePlayer(world, dt);
  updateTraffic(world, dt);
  updatePeds(world, dt);
  updateBullets(world, dt);
  updatePolice(world, dt);
  updateMissions(world, dt);
  // Pickups.
  for (const p of world.pickups) {
    if (p.taken) continue;
    const d = Math.hypot(world.player.x - p.x, world.player.y - p.y);
    if (d < 30) {
      p.taken = true;
      if (p.kind === 'cash') { world.player.cash += 40; world.hudFlash = '+$40'; }
      else { world.player.hp = Math.min(TUNING.playerHp, world.player.hp + 30); world.hudFlash = '+30 health'; }
      world.audio.pickup();
    }
  }
  // Busted / wasted.
  if (world.player.hp <= 0) {
    world.player.hp = TUNING.playerHp;
    world.player.cash = Math.max(0, world.player.cash - TUNING.wastedFine);
    world.wanted = 0;
    const s = freeSpotNear(world.city, 900, 350);
    world.player.x = s.x; world.player.y = s.y;
    if (world.player.car) { world.player.car = null; }
    world.hudFlash = `Wasted! -$${TUNING.wastedFine} — woke up at City Hospital`;
    world.audio.busted();
  }
  // Busted: a cop touches the player on foot at wanted >= 1.
  if (!world.player.car && world.wanted >= 1) {
    for (const cop of world.police) {
      if (Math.hypot(cop.x - world.player.x, cop.y - world.player.y) < 26) {
        world.player.cash = Math.max(0, world.player.cash - TUNING.bustedFine);
        world.wanted = 0;
        const s = freeSpotNear(world.city, 1160, 1070);
        world.player.x = s.x; world.player.y = s.y;
        world.hudFlash = `Busted! -$${TUNING.bustedFine} — dropped at the Precinct`;
        world.audio.busted();
        break;
      }
    }
  }
  if (world.gameWon) world.state = 'won';
  // Camera follows the player, clamped to the world.
  world.cam.x = clamp(world.player.x - VIEW_W / 2, 0, WORLD_W - VIEW_W);
  world.cam.y = clamp(world.player.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
}

export function saveGame(world) {
  try {
    localStorage.setItem(world.saveSlot, JSON.stringify({
      cash: world.player.cash, hp: world.player.hp, respect: world.player.respect,
      x: world.player.x, y: world.player.y, missionIdx: world.lastMissionIdx, time: world.time,
    }));
    world.hudFlash = 'Saved';
  } catch { world.hudFlash = 'Save failed'; }
}
export function loadGame(world) {
  try {
    const raw = localStorage.getItem(world.saveSlot);
    if (!raw) return false;
    const s = JSON.parse(raw);
    world.player.cash = s.cash; world.player.hp = s.hp; world.player.respect = s.respect;
    world.player.x = s.x; world.player.y = s.y;
    world.lastMissionIdx = s.missionIdx ?? 0;
    world.time = s.time ?? 0;
    world.state = 'play';
    startMission(world, world.lastMissionIdx);
    return true;
  } catch { return false; }
}
export function hasSave(world) {
  try { return !!localStorage.getItem(world.saveSlot); } catch { return false; }
}
