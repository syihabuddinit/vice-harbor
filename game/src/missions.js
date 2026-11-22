// Story missions for Mara Voss, plus the taxi side job.
import { dist2 } from './rng.js';
import { ROAD_X, ROAD_Y, TUNING } from './config.js';
import { freeSpotNear } from './city.js';

export const MISSIONS = [
  {
    id: 1, name: 'First Fare',
    brief: 'Lena: steal a car, pick up the package at the Marina, deliver it to the Docks.',
    steps: [
      { text: 'Steal a car (walk to one and press E)', check: w => !!w.player.car },
      { text: 'Pick up the package at the Marina', at: { x: 2200, y: 350 }, r: 70 },
      { text: 'Deliver the package to the Docks', at: { x: 2200, y: 1550 }, r: 70 },
    ],
    reward: 400,
  },
  {
    id: 2, name: 'Harbor Heist',
    brief: 'The Harbor Kings guard the port. Collect 3 crates — they shoot back.',
    steps: [
      { text: 'Collect crate 1 at the port', at: { x: 2090, y: 1450 }, r: 55 },
      { text: 'Collect crate 2 at the port', at: { x: 2280, y: 1480 }, r: 55 },
      { text: 'Collect crate 3 at the port', at: { x: 2180, y: 1620 }, r: 55 },
    ],
    reward: 500,
  },
  {
    id: 3, name: 'The Getaway',
    brief: 'Lose a 3-star wanted level and reach the Safehouse in 90 seconds.',
    steps: [
      { text: 'Reach 3 stars — make some noise', check: w => w.wanted >= 3 },
      { text: 'Lose the heat and reach the Safehouse', at: { x: 500, y: 500 }, r: 70, needWantedBelow: 1 },
    ],
    reward: 600,
    timer: 90,
  },
];

export function startMission(world, idx) {
  const m = MISSIONS[idx];
  world.mission = { def: m, step: 0, timer: m.timer ?? null, done: false };
  world.hudFlash = `Mission ${m.id}: ${m.name}`;
  world.audio.jingle();
}

export function updateMissions(world, dt) {
  const { mission, player } = world;
  if (!mission || mission.done) { updateTaxi(world, dt); return; }
  if (mission.timer !== null) {
    mission.timer -= dt;
    if (mission.timer <= 0) { failMission(world, 'Out of time!'); return; }
  }
  const step = mission.def.steps[mission.step];
  if (!step) { completeMission(world); return; }
  if (step.check) {
    if (step.check(world)) mission.step++;
  } else if (step.at) {
    const d = dist2(player.x, player.y, step.at.x, step.at.y);
    const okWanted = step.needWantedBelow === undefined || world.wanted < step.needWantedBelow;
    if (d < step.r * step.r && okWanted) {
      mission.step++;
      player.cash += TUNING.crateReward / 4;
      world.audio.pickup();
      world.hudFlash = 'Objective complete';
    }
  }
  if (mission.step >= mission.def.steps.length) completeMission(world);
  updateTaxi(world, dt);
}

function completeMission(world) {
  const m = world.mission.def;
  world.player.cash += m.reward;
  world.player.respect += 10;
  world.hudFlash = `Mission complete! +$${m.reward}`;
  world.audio.jingle();
  world.mission.done = true;
  const next = MISSIONS.findIndex(x => x.id === m.id + 1);
  if (next >= 0) {
    world.nextMissionIn = 2;
    world.nextMissionIdx = next;
  } else {
    world.hudFlash = 'All missions complete! Vice Harbor is yours.';
    world.gameWon = true;
  }
}

function failMission(world, why) {
  world.hudFlash = `Mission failed — ${why}`;
  world.audio.busted();
  world.mission = null;
  world.nextMissionIn = 3;
  world.nextMissionIdx = world.lastMissionIdx ?? 0;
}

// Taxi side job: a waving pedestrian pays to be driven to a marker.
export function updateTaxi(world, dt) {
  if (world.taxi.active) {
    const t = world.taxi;
    t.timer -= dt;
    if (t.timer <= 0) { world.taxi = { active: false }; world.hudFlash = 'Taxi fare left'; return; }
    if (dist2(world.player.x, world.player.y, t.dest.x, t.dest.y) < 70 * 70 && world.player.car) {
      world.player.cash += TUNING.taxiFare;
      world.hudFlash = `Taxi fare +$${TUNING.taxiFare}`;
      world.audio.jingle();
      world.taxi = { active: false };
    }
    return;
  }
  // Offer a taxi job every so often when the player is driving.
  world.taxiCd = (world.taxiCd ?? 8) - dt;
  if (world.taxiCd <= 0 && world.player.car) {
    world.taxiCd = 25;
    const dest = { x: ROAD_X[Math.floor(Math.random() * ROAD_X.length)], y: ROAD_Y[Math.floor(Math.random() * ROAD_Y.length)] };
    world.taxi = { active: true, dest, timer: 60 };
    world.hudFlash = 'Taxi: drive the passenger to the yellow marker';
  }
}

export function currentObjective(world) {
  if (!world.mission) return world.gameWon ? 'All missions complete!' : 'Find Lena at the Palm Court garage';
  const step = world.mission.def.steps[world.mission.step];
  if (!step) return 'Mission complete';
  return `M${world.mission.def.id} — ${step.text}`;
}

export function missionMarker(world) {
  if (!world.mission) return null;
  const step = world.mission.def.steps[world.mission.step];
  return step && step.at ? step.at : null;
}
export { freeSpotNear };
