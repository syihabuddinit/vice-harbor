// The story of Vice Harbor: three missions for Mara Voss, plus the taxi
// side job. Missions are a small state machine over the world — proximity,
// timers and the wanted level move them forward.
import { playJingle, playPickup } from './audio.js';

export const MISSIONS = [
  {
    name: 'First Fare',
    intro: 'Mara is back in Vice Harbor. Steal a car, grab the package at the Marina, and deliver it to the Docks.',
    steps: [
      { text: 'Steal a car (walk up to one and press E)', target: null },
      { text: 'Pick up the package at the Marina', target: { x: 2050, y: 1560, r: 60 } },
      { text: 'Deliver the package to the Docks', target: { x: 420, y: 1560, r: 60 } },
    ],
    reward: 200,
  },
  {
    name: 'Harbor Heist',
    intro: 'The Harbor Kings are moving crates at the port. Take all three — the guards will shoot back.',
    steps: [
      { text: 'Collect crate 1 of 3 at the port', target: { x: 300, y: 1500, r: 55 } },
      { text: 'Collect crate 2 of 3 at the port', target: { x: 560, y: 1600, r: 55 } },
      { text: 'Collect crate 3 of 3 at the port', target: { x: 720, y: 1440, r: 55 } },
    ],
    reward: 400,
  },
  {
    name: 'The Getaway',
    intro: 'Three stars and the whole Harbor PD on your tail. Lose them and reach the Safehouse in 90 seconds.',
    steps: [
      { text: 'Lose the cops, then reach the Safehouse in Palm Court', target: { x: 1150, y: 860, r: 70 } },
    ],
    reward: 600,
    timer: 90,
  },
];

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    started: false,
    timer: 0,
    done: false,
    allDone: false,
    crates: 0,
  };
}

export function currentMission(state) {
  return MISSIONS[state.index] || null;
}

export function objectiveText(state) {
  const m = currentMission(state);
  if (!m) return 'Vice Harbor is yours — free roam, earn cash, stay out of trouble.';
  if (!state.started) return m.name + ' — ' + m.intro;
  const step = m.steps[state.step];
  return m.name + ': ' + (step ? step.text : 'Done');
}

function near(world, target) {
  if (!target) return false;
  const dx = world.player.x - target.x;
  const dy = world.player.y - target.y;
  return dx * dx + dy * dy < target.r * target.r;
}

export function updateMissions(world, dt) {
  const ms = world.missions;
  if (ms.allDone) return;
  const m = currentMission(ms);
  if (!m) {
    ms.allDone = true;
    return;
  }
  if (!ms.started) {
    ms.started = true;
    ms.timer = m.timer || 0;
    world.message = m.name + ' — ' + m.intro;
    if (m.name === 'The Getaway') {
      world.wanted = Math.max(world.wanted, 3);
      world.lastCrimeAt = world.time;
    }
    if (m.name === 'Harbor Heist') {
      for (let i = 0; i < 3; i++) {
        const t = m.steps[i].target;
        world.guards.push({
          x: t.x + 40, y: t.y + 40, angle: 0, shootCooldown: 1 + i * 0.7, kind: 'guard',
        });
      }
    }
  }
  if (ms.timer > 0) {
    ms.timer -= dt;
    if (ms.timer <= 0) {
      world.state = 'failed';
      world.message = m.name + ' failed — out of time';
      return;
    }
  }
  const step = m.steps[ms.step];
  if (!step) return;
  if (m.name === 'First Fare' && ms.step === 0) {
    if (!world.player.onFoot) {
      ms.step = 1;
      world.message = 'Car stolen — now the Marina';
      playPickup();
    }
    return;
  }
  if (near(world, step.target)) {
    if (m.name === 'Harbor Heist') {
      ms.crates += 1;
      world.cash += 100;
      world.message = 'Crate ' + ms.crates + ' of 3 secured (+$100)';
    } else if (m.name === 'The Getaway') {
      if (world.wanted > 0) {
        world.message = 'Lose the cops first — wanted level ' + world.wanted;
        return;
      }
    } else {
      world.message = m.name + ': step done';
    }
    playPickup();
    ms.step += 1;
    if (ms.step >= m.steps.length) {
      world.cash += m.reward;
      world.respect += 25;
      world.message = m.name + ' complete! +$' + m.reward + ' — respect up';
      playJingle(true);
      ms.index += 1;
      ms.step = 0;
      ms.started = false;
      ms.timer = 0;
      world.guards = [];
      if (ms.index >= MISSIONS.length) {
        ms.allDone = true;
        world.state = 'win';
      }
    }
  }
}

// Guards at the port shoot at Mara during Harbor Heist.
export function updateGuards(world, dt) {
  const p = world.player;
  for (const g of world.guards) {
    g.shootCooldown -= dt;
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (d < 520 && g.shootCooldown <= 0) {
      const angle = Math.atan2(p.y - g.y, p.x - g.x);
      world.bullets.push({
        x: g.x + Math.cos(angle) * 20,
        y: g.y + Math.sin(angle) * 20,
        vx: Math.cos(angle) * 620,
        vy: Math.sin(angle) * 620,
        life: 1.1,
        from: 'guard',
      });
      g.shootCooldown = 1.1;
    }
  }
}

// --- Taxi side job ----------------------------------------------------------
export function updateTaxi(world, dt) {
  const taxi = world.taxi;
  const p = world.player;
  if (!taxi.active) {
    // A waving pedestrian appears now and then near the player.
    taxi.spawnTimer -= dt;
    if (taxi.spawnTimer <= 0) {
      taxi.spawnTimer = 20;
      const ped = world.rng.pick(world.peds);
      if (ped) {
        ped.waving = true;
        taxi.ped = ped;
        taxi.state = 'waiting';
        taxi.active = true;
        taxi.fare = 60 + world.rng.int(0, 4) * 20;
        world.message = 'Someone is waving for a taxi — grab a yellow cab (E)';
      }
    }
    return;
  }
  if (taxi.state === 'waiting') {
    const ped = taxi.ped;
    if (!ped) { taxi.active = false; return; }
    if (!p.onFoot && p.car && p.car.kind === 'taxi' && Math.hypot(p.x - ped.x, p.y - ped.y) < 70) {
      taxi.state = 'riding';
      ped.waving = false;
      world.peds = world.peds.filter((q) => q !== ped);
      taxi.target = { x: 1150, y: 300, r: 70 };
      world.message = 'Passenger aboard — take them to Downtown';
    }
    return;
  }
  if (taxi.state === 'riding') {
    const t = taxi.target;
    if (Math.hypot(p.x - t.x, p.y - t.y) < t.r) {
      world.cash += taxi.fare;
      world.respect += 5;
      world.message = 'Fare delivered +$' + taxi.fare;
      playJingle(true);
      taxi.active = false;
      taxi.state = 'idle';
      taxi.spawnTimer = 18;
    }
  }
}

export function startTaxi(world) {
  if (world.taxi.active) return;
  world.taxi.active = true;
  world.taxi.state = 'waiting';
  world.taxi.fare = 60 + world.rng.int(0, 4) * 20;
}
