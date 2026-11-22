// Everyone who moves in Vice Harbor: Mara on foot and by car, traffic,
// pedestrians, the police, bullets and pickups. Pure simulation — it reads
// the world, moves things, and reports what happened; drawing lives in
// render.js and sound in audio.js.
import { CITY_W, CITY_H, SEA_Y, VERTICAL_ROADS, HORIZONTAL_ROADS, hitsSolid, resolveCollision, nearestRoadPoint, randomRoadPoint } from './city.js';
import { playGunshot, playCrash, playPickup } from './audio.js';

export const CAR_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#7209b7', '#4361ee', '#adb5bd', '#06d6a0'];
export const PED_COLORS = ['#ffbe0b', '#fb8500', '#8ecae6', '#ffb703', '#90be6d', '#f28482', '#b5179e'];

let nextCarId = 1;

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0,
    onFoot: true, health: 100, car: null,
    shootCooldown: 0, invulnerable: 0,
  };
}

export function createCar(rng, x, y, kind, driver) {
  const car = {
    id: nextCarId++,
    x, y, angle: rng ? rng.range(0, Math.PI * 2) : 0,
    speed: 0, color: rng ? rng.pick(CAR_COLORS) : '#e63946',
    kind: kind || 'sedan', driver: driver || 'traffic',
    target: null, stuck: 0, cruise: rng ? rng.range(120, 200) : 150,
  };
  if (kind === 'police') car.color = '#1d3557';
  if (kind === 'taxi') car.color = '#ffd60a';
  return car;
}

export function createPed(rng, x, y) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2), speed: rng.range(28, 55),
    color: rng.pick(PED_COLORS), state: 'walk', target: null,
    fleeTimer: 0, waving: false,
  };
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function turnToward(angle, target, maxTurn) {
  let d = target - angle;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return angle + Math.max(-maxTurn, Math.min(maxTurn, d));
}

// --- The player -------------------------------------------------------------
export function stepPlayer(world, ctrl, dt) {
  const p = world.player;
  p.shootCooldown = Math.max(0, p.shootCooldown - dt);
  p.invulnerable = Math.max(0, p.invulnerable - dt);
  if (p.health < 100) p.health = Math.min(100, p.health + dt * 1.5);

  if (p.onFoot) {
    const run = ctrl.sprint ? 240 : 150;
    let mx = (ctrl.right ? 1 : 0) - (ctrl.left ? 1 : 0);
    let my = (ctrl.down ? 1 : 0) - (ctrl.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len > 0) {
      mx /= len; my /= len;
      p.x += mx * run * dt;
      p.y += my * run * dt;
      p.angle = Math.atan2(my, mx);
      const fixed = resolveCollision(world.city, p.x, p.y, 14);
      p.x = fixed.x; p.y = fixed.y;
    }
    if (ctrl.aimX !== undefined && (ctrl.aimX !== 0 || ctrl.aimY !== 0)) {
      p.angle = angleTo(p.x, p.y, ctrl.aimX, ctrl.aimY);
    }
    if (ctrl.shoot && p.shootCooldown <= 0) {
      shoot(world, p.x, p.y, p.angle, 'player');
      p.shootCooldown = 0.28;
    }
    if (ctrl.enterCar) tryEnterCar(world);
  } else if (p.car) {
    driveCar(world, p.car, ctrl, dt, true);
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    if (ctrl.enterCar) exitCar(world);
  }
}

function driveCar(world, car, ctrl, dt, isPlayer) {
  const accel = 420;
  const maxSpeed = car.kind === 'police' ? 430 : 380;
  const reverseMax = 140;
  if (ctrl.up) car.speed += accel * dt;
  else if (ctrl.down) car.speed -= accel * dt * 0.9;
  else {
    const drag = 260 * dt;
    car.speed = Math.abs(car.speed) <= drag ? 0 : car.speed - Math.sign(car.speed) * drag;
  }
  car.speed = Math.max(-reverseMax, Math.min(maxSpeed, car.speed));
  const steer = ((ctrl.left ? 1 : 0) - (ctrl.right ? 1 : 0)) * 2.4 * dt * Math.sign(car.speed || 1);
  car.angle += steer * Math.min(1, Math.abs(car.speed) / 120 + 0.25);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (hitsSolid(world.city, nx, ny, 20)) {
    if (isPlayer && Math.abs(car.speed) > 180) playCrash();
    car.speed *= -0.35;
  } else {
    car.x = nx;
    car.y = ny;
  }
  if (car.x < 20) car.x = 20;
  if (car.y < 20) car.y = 20;
  if (car.x > CITY_W - 20) car.x = CITY_W - 20;
  if (car.y > CITY_H - 20) car.y = CITY_H - 20;
}

function tryEnterCar(world) {
  const p = world.player;
  let best = null;
  let bestD = 70;
  for (const car of world.cars) {
    if (car.driver === 'police') continue;
    const d = dist(p.x, p.y, car.x, car.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  if (!best) return false;
  p.car = best;
  p.onFoot = false;
  best.driver = 'player';
  if (best.kind !== 'taxi' || !world.taxi.active) raiseWanted(world, 1, 'car stolen');
  world.message = best.kind === 'taxi' ? 'Taxi taken — look for a waving passenger' : 'Car taken — the cops noticed';
  return true;
}

function exitCar(world) {
  const p = world.player;
  const car = p.car;
  if (!car) return;
  car.driver = 'parked';
  car.speed = 0;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  const fixed = resolveCollision(world.city, p.x, p.y, 14);
  p.x = fixed.x; p.y = fixed.y;
  p.car = null;
  p.onFoot = true;
}

export function shoot(world, x, y, angle, from) {
  world.bullets.push({
    x: x + Math.cos(angle) * 22,
    y: y + Math.sin(angle) * 22,
    vx: Math.cos(angle) * 720,
    vy: Math.sin(angle) * 720,
    life: 0.9,
    from,
  });
  playGunshot();
  if (from === 'player') raiseWanted(world, 1, 'shots fired');
}

export function raiseWanted(world, amount, reason) {
  const before = world.wanted;
  world.wanted = Math.min(5, world.wanted + amount);
  if (world.wanted > before) {
    world.lastCrimeAt = world.time;
    world.crimeFlash = 1.2;
    if (reason) world.message = reason + ' — wanted level ' + world.wanted;
  }
}

// --- Traffic ----------------------------------------------------------------
// Traffic follows the road grid: each car drives along one road to the next
// intersection, then goes straight, turns, or reverses — never cutting
// across blocks. That keeps the streets looking alive and the cars out of
// the buildings.
function nearestLine(lines, value) {
  let best = lines[0];
  let bestD = Infinity;
  for (const line of lines) {
    const d = Math.abs(value - line);
    if (d < bestD) { bestD = d; best = line; }
  }
  return { line: best, dist: bestD };
}

// Next intersection along a road in a direction, or null at the road's end.
function nextCrossing(axis, pos, dir) {
  const lines = axis === 'v' ? HORIZONTAL_ROADS : VERTICAL_ROADS;
  let best = null;
  for (const line of lines) {
    if (dir > 0 && line > pos + 4 && (best === null || line < best)) best = line;
    if (dir < 0 && line < pos - 4 && (best === null || line > best)) best = line;
  }
  return best;
}

function initRoad(car) {
  const v = nearestLine(VERTICAL_ROADS, car.x);
  const h = nearestLine(HORIZONTAL_ROADS, car.y);
  if (v.dist <= h.dist) {
    car.x = v.line;
    const dir = Math.sin(car.angle) >= 0 ? 1 : -1;
    let target = nextCrossing('v', car.y, dir);
    let useDir = dir;
    if (target === null) {
      useDir = -dir;
      target = nextCrossing('v', car.y, useDir);
    }
    car.road = { axis: 'v', line: v.line, dir: useDir, target };
  } else {
    car.y = h.line;
    const dir = Math.cos(car.angle) >= 0 ? 1 : -1;
    let target = nextCrossing('h', car.x, dir);
    let useDir = dir;
    if (target === null) {
      useDir = -dir;
      target = nextCrossing('h', car.x, useDir);
    }
    car.road = { axis: 'h', line: h.line, dir: useDir, target };
  }
}

function chooseNextRoad(car, rng) {
  const road = car.road;
  const roll = rng.next();
  const pos = road.axis === 'v' ? car.y : car.x;
  if (roll < 0.6) {
    // Straight on: next intersection in the same direction.
    let target = nextCrossing(road.axis, pos, road.dir);
    if (target === null) {
      road.dir = -road.dir;
      target = nextCrossing(road.axis, pos, road.dir);
    }
    road.target = target;
  } else if (roll < 0.85) {
    // Turn onto the crossing road at this intersection.
    const other = road.axis === 'v' ? 'h' : 'v';
    const dir = rng.chance(0.5) ? 1 : -1;
    let target = nextCrossing(other, road.axis === 'v' ? car.x : car.y, dir);
    let useDir = dir;
    if (target === null) {
      useDir = -dir;
      target = nextCrossing(other, road.axis === 'v' ? car.x : car.y, useDir);
    }
    car.road = { axis: other, line: road.target, dir: useDir, target };
  } else {
    // Reverse.
    road.dir = -road.dir;
    road.target = nextCrossing(road.axis, pos, road.dir);
  }
}

export function stepTraffic(world, dt) {
  const rng = world.rng;
  for (const car of world.cars) {
    if (car.driver !== 'traffic') continue;
    if (!car.road) initRoad(car);
    const road = car.road;
    const wantAngle = road.axis === 'v'
      ? (road.dir > 0 ? Math.PI / 2 : -Math.PI / 2)
      : (road.dir > 0 ? 0 : Math.PI);
    car.angle = turnToward(car.angle, wantAngle, 3.5 * dt);
    let blocked = false;
    for (const other of world.cars) {
      if (other === car) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      if (ahead > 0 && ahead < 70 && Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle)) < 26) {
        blocked = true;
        break;
      }
    }
    const targetSpeed = blocked ? 0 : car.cruise;
    car.speed += Math.max(-300 * dt, Math.min(220 * dt, targetSpeed - car.speed));
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Ease back onto the road's centre line so turns stay clean.
    if (road.axis === 'v') car.x += (road.line - car.x) * Math.min(1, 5 * dt);
    else car.y += (road.line - car.y) * Math.min(1, 5 * dt);
    const along = road.axis === 'v' ? car.y : car.x;
    const reached = road.dir > 0 ? along >= road.target - 8 : along <= road.target + 8;
    if (reached) chooseNextRoad(car, rng);
  }
}

// --- Pedestrians ------------------------------------------------------------
export function stepPeds(world, dt) {
  const rng = world.rng;
  for (const ped of world.peds) {
    if (ped.fleeTimer > 0) {
      ped.fleeTimer -= dt;
      const away = angleTo(world.player.x, world.player.y, ped.x, ped.y);
      ped.angle = away;
      ped.x += Math.cos(away) * 150 * dt;
      ped.y += Math.sin(away) * 150 * dt;
      const fixed = resolveCollision(world.city, ped.x, ped.y, 10);
      ped.x = fixed.x; ped.y = fixed.y;
      continue;
    }
    if (world.wanted >= 3 && dist(ped.x, ped.y, world.player.x, world.player.y) < 260) {
      ped.fleeTimer = 2;
      continue;
    }
    if (!ped.target || dist(ped.x, ped.y, ped.target.x, ped.target.y) < 24) {
      const spot = randomRoadPoint(rng);
      ped.target = { x: spot.x + rng.range(-30, 30), y: spot.y + rng.range(-30, 30) };
    }
    const want = angleTo(ped.x, ped.y, ped.target.x, ped.target.y);
    ped.angle = turnToward(ped.angle, want, 3 * dt);
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    const fixed = resolveCollision(world.city, ped.x, ped.y, 10);
    ped.x = fixed.x; ped.y = fixed.y;
  }
}

export function scarePeds(world, x, y, radius) {
  for (const ped of world.peds) {
    if (dist(ped.x, ped.y, x, y) < radius) ped.fleeTimer = 2.5;
  }
}

// --- Police -----------------------------------------------------------------
export function stepPolice(world, dt) {
  const p = world.player;
  const wanted = world.wanted;
  // How many police cars and foot cops the wanted level calls for.
  const wantCars = wanted >= 1 ? Math.min(3, wanted) : 0;
  const wantCops = wanted >= 2 ? wanted - 1 : 0;
  let cars = world.cars.filter((c) => c.driver === 'police');
  let cops = world.police.filter((c) => c.kind === 'cop');
  if (wanted > 0) {
    while (cars.length < wantCars) {
      const spot = randomRoadPoint(world.rng);
      const car = createCar(world.rng, spot.x, spot.y, 'police', 'police');
      world.cars.push(car);
      cars.push(car);
    }
    while (cops.length < wantCops) {
      const spot = randomRoadPoint(world.rng);
      const cop = { x: spot.x, y: spot.y, angle: 0, speed: 175, kind: 'cop', color: '#1d3557' };
      world.police.push(cop);
      cops.push(cop);
    }
  }
  for (const car of cars) {
    if (wanted === 0) {
      car.driver = 'parked';
      continue;
    }
    const want = angleTo(car.x, car.y, p.x, p.y);
    car.angle = turnToward(car.angle, want, 2.2 * dt);
    car.speed = Math.min(345, car.speed + 300 * dt);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (hitsSolid(world.city, nx, ny, 20)) {
      car.angle += 0.6;
      car.speed *= 0.6;
    } else {
      car.x = nx;
      car.y = ny;
    }
    // Ramming the player's car hurts it; ramming Mara on foot hurts her.
    // A ram only lands once a second, or a police car glued to the player
    // would pin the car at a crawl forever.
    car.ramCd = Math.max(0, (car.ramCd || 0) - dt);
    if (p.car && dist(car.x, car.y, p.car.x, p.car.y) < 46 && car.ramCd <= 0) {
      p.car.speed *= 0.7;
      car.speed *= 0.4;
      car.ramCd = 1.0;
      if (Math.abs(car.speed) > 120) playCrash();
    }
    if (p.onFoot && dist(car.x, car.y, p.x, p.y) < 34 && p.invulnerable <= 0) {
      p.health -= 12;
      p.invulnerable = 0.8;
      playCrash();
    }
    // A police car that falls far behind loses Mara and gives up.
    if (dist(car.x, car.y, p.x, p.y) > 800) car.lost = true;
  }
  if (cars.some((c) => c.lost)) {
    world.cars = world.cars.filter((c) => !c.lost);
  }
  for (const cop of cops) {
    if (wanted === 0) continue;
    const d = dist(cop.x, cop.y, p.x, p.y);
    const want = angleTo(cop.x, cop.y, p.x, p.y);
    cop.angle = want;
    if (d > 30) {
      cop.x += Math.cos(want) * cop.speed * dt;
      cop.y += Math.sin(want) * cop.speed * dt;
      const fixed = resolveCollision(world.city, cop.x, cop.y, 10);
      cop.x = fixed.x; cop.y = fixed.y;
    } else if (p.onFoot && p.invulnerable <= 0) {
      p.health -= 18 * dt * 2;
      if (p.health <= 0) world.state = 'wasted';
    }
    // Busted: a cop catches Mara standing still on foot.
    if (p.onFoot && d < 26 && Math.abs(p.speed || 0) < 30 && world.state === 'playing') {
      world.state = 'busted';
    }
  }
  // Clean up police when the heat dies down.
  if (wanted === 0) {
    world.cars = world.cars.filter((c) => c.driver !== 'police');
    world.police = world.police.filter((c) => c.kind !== 'cop');
  }
}

// --- Bullets and pickups ----------------------------------------------------
export function stepBullets(world, dt) {
  for (const b of world.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || b.x < 0 || b.y < 0 || b.x > CITY_W || b.y > CITY_H) continue;
    if (hitsSolid(world.city, b.x, b.y, 2)) {
      b.life = 0;
      continue;
    }
    for (const ped of world.peds) {
      if (dist(b.x, b.y, ped.x, ped.y) < 14) {
        b.life = 0;
        ped.fleeTimer = 3;
        world.peds = world.peds.filter((q) => q !== ped);
        scarePeds(world, ped.x, ped.y, 300);
        if (b.from === 'player') raiseWanted(world, 1, 'pedestrian down');
        break;
      }
    }
    if (b.life <= 0) continue;
    const p = world.player;
    if (b.from !== 'player' && p.onFoot && dist(b.x, b.y, p.x, p.y) < 14 && p.invulnerable <= 0) {
      p.health -= 10;
      p.invulnerable = 0.6;
      b.life = 0;
      if (p.health <= 0) world.state = 'wasted';
    }
  }
  world.bullets = world.bullets.filter((b) => b.life > 0);
}

export function stepPickups(world) {
  const p = world.player;
  for (const pk of world.pickups) {
    if (pk.taken) continue;
    if (dist(p.x, p.y, pk.x, pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'health') {
        p.health = Math.min(100, p.health + 40);
        world.message = 'Health +40';
      } else {
        world.cash += 50;
        world.message = 'Found $50';
      }
      playPickup();
    }
  }
  world.pickups = world.pickups.filter((pk) => !pk.taken);
}
