// Player, cars, traffic, pedestrians, police, bullets and pickups.
import { WORLD_W, WORLD_H, ROAD_X, ROAD_Y, TUNING, PALETTE, onRoad, nearestRoadX, nearestRoadY } from './config.js';
import { clamp, dist2, angleTo, turnToward, pick } from './rng.js';
import { moveWithCollision, collidesWithSolid, roadPoint } from './city.js';

export function makePlayer(x, y) {
  return { x, y, angle: -Math.PI / 2, hp: TUNING.playerHp, speed: 0, car: null, shootCd: 0, cash: 120, respect: 0 };
}
export function makeCar(x, y, angle, color, kind = 'traffic') {
  return { x, y, angle, color, kind, speed: 0, w: 46, h: 22, driver: kind === 'traffic' };
}
export function spawnTraffic(city, rng, n = 14) {
  const cars = [];
  for (let i = 0; i < n; i++) {
    const p = roadPoint(rng);
    const vertical = Math.abs(p.x - nearestRoadX(p.x)) < 4;
    const angle = vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI);
    cars.push(makeCar(p.x, p.y, angle, pick(rng, PALETTE.traffic), 'traffic'));
  }
  return cars;
}
export function spawnPeds(city, rng, n = 26) {
  const peds = [];
  for (let i = 0; i < n; i++) {
    const p = roadPoint(rng);
    peds.push({ x: p.x, y: p.y, angle: rng() * Math.PI * 2, speed: 28 + rng() * 26, color: pick(rng, PALETTE.ped), flee: 0, wait: rng() * 2, taxi: false });
  }
  return peds;
}

export function updatePlayer(world, dt) {
  const { player, input, city, audio } = world;
  player.shootCd = Math.max(0, player.shootCd - dt);
  if (player.car) {
    const car = player.car;
    const fwd = input.axisY() * -1; // W = forward
    const steer = input.axisX();
    if (fwd !== 0) car.speed = clamp(car.speed + fwd * TUNING.carAccel * dt, -180, TUNING.carMax);
    else car.speed *= Math.max(0, 1 - 1.6 * dt);
    if (input.down('space')) car.speed *= Math.max(0, 1 - 4 * dt);
    if (Math.abs(car.speed) > 8) car.angle += steer * TUNING.carTurn * dt * Math.sign(car.speed) * (0.5 + Math.abs(car.speed) / TUNING.carMax);
    const dx = Math.cos(car.angle) * car.speed * dt;
    const dy = Math.sin(car.angle) * car.speed * dt;
    const ox = car.x, oy = car.y;
    moveWithCollision(city, car, dx, dy, 24);
    if ((car.x === ox && Math.abs(dx) > 0.5) || (car.y === oy && Math.abs(dy) > 0.5)) { if (Math.abs(car.speed) > 200) audio.crash(); car.speed *= 0.4; }
    player.x = car.x; player.y = car.y; player.angle = car.angle;
    audio.engineStart(Math.abs(car.speed) / TUNING.carMax);
    if (input.wasPressed('enter')) exitCar(world);
  } else {
    audio.engineStop();
    const sp = TUNING.walkSpeed * (input.down('sprint') ? TUNING.sprintMul : 1);
    const ax = input.axisX(), ay = input.axisY();
    const len = Math.hypot(ax, ay) || 1;
    moveWithCollision(city, player, (ax / len) * sp * dt * (ax || ay ? 1 : 0), (ay / len) * sp * dt * (ax || ay ? 1 : 0), 13);
    const wx = world.cam.x + input.mouseX(), wy = world.cam.y + input.mouseY();
    player.angle = angleTo(player.x, player.y, wx, wy);
    if ((input.clicked() || input.held()) && player.shootCd <= 0) {
      player.shootCd = 0.28;
      world.bullets.push({ x: player.x + Math.cos(player.angle) * 20, y: player.y + Math.sin(player.angle) * 20, vx: Math.cos(player.angle) * TUNING.bulletSpeed, vy: Math.sin(player.angle) * TUNING.bulletSpeed, from: 'player', life: 0.9 });
      audio.shoot();
      if (world.wanted < 1) world.wanted = 1;
    }
    if (input.wasPressed('enter')) tryEnterCar(world);
  }
  player.x = clamp(player.x, 16, WORLD_W - 16);
  player.y = clamp(player.y, 16, WORLD_H - 16);
}

export function tryEnterCar(world) {
  const { player } = world;
  let best = null, bd = 70 * 70;
  for (const c of world.cars) {
    const d = dist2(player.x, player.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return;
  if (best.kind === 'traffic') {
    best.kind = 'player'; best.driver = false;
    world.wanted = Math.max(world.wanted, 1);
    world.hudFlash = 'Car stolen! Wanted level up';
  } else if (best.kind === 'parked') {
    best.kind = 'player';
    world.wanted = Math.max(world.wanted, 1);
    world.hudFlash = 'Car stolen! Wanted level up';
  }
  player.car = best;
  // Remove the traffic car from the traffic list flow by marking it player-owned.
  world.cars = world.cars.filter(c => c !== best);
  world.cars.push(best);
}

export function exitCar(world) {
  const { player } = world;
  const car = player.car; if (!car) return;
  player.car = null;
  car.speed = 0;
  player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
  player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
  if (collidesWithSolid(world.city, player.x, player.y, 13)) { player.x = car.x; player.y = car.y; }
}

export function updateTraffic(world, dt) {
  for (const c of world.cars) {
    if (c.kind !== 'traffic') continue;
    const vertical = Math.abs(Math.sin(c.angle)) > 0.7;
    const targetSpeed = 110;
    c.speed += (targetSpeed - c.speed) * dt * 0.8;
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // Stay on the road: if the next step leaves the road, turn around.
    if (!onRoad(nx, ny)) { c.angle += Math.PI; c.x = nearestRoadX(c.x); c.y = nearestRoadY(c.y); continue; }
    c.x = nx; c.y = ny;
    if (c.x < 40 || c.x > WORLD_W - 40 || c.y < 40 || c.y > WORLD_H - 40) c.angle += Math.PI;
  }
}

export function updatePeds(world, dt) {
  for (const p of world.peds) {
    p.wait -= dt;
    const nearShot = world.bullets.some(b => dist2(b.x, b.y, p.x, p.y) < 90 * 90);
    const nearCar = world.player.car && dist2(world.player.x, world.player.y, p.x, p.y) < 110 * 110 && Math.abs(world.player.car.speed) > 200;
    if (nearShot || nearCar) p.flee = 1.6;
    if (p.flee > 0) {
      p.flee -= dt;
      p.angle = angleTo(world.player.x, world.player.y, p.x, p.y);
      const sp = p.speed * 2.2;
      const nx = p.x + Math.cos(p.angle) * sp * dt, ny = p.y + Math.sin(p.angle) * sp * dt;
      if (!collidesWithSolid(world.city, nx, ny, 10)) { p.x = nx; p.y = ny; }
      continue;
    }
    if (p.wait > 0) continue;
    p.wait = 1 + Math.random() * 2.5;
    p.angle = Math.random() * Math.PI * 2;
    const nx = p.x + Math.cos(p.angle) * p.speed * dt * 4;
    const ny = p.y + Math.sin(p.angle) * p.speed * dt * 4;
    if (onRoad(nx, ny) && !collidesWithSolid(world.city, nx, ny, 10)) { p.x = nx; p.y = ny; }
  }
}

export function updateBullets(world, dt) {
  const { bullets, player } = world;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    let dead = b.life <= 0 || collidesWithSolid(world.city, b.x, b.y, 2);
    if (!dead && b.from === 'player') {
      for (const cop of world.police) {
        if (dist2(b.x, b.y, cop.x, cop.y) < 20 * 20) { cop.hp -= TUNING.bulletDamage; dead = true; world.wanted = Math.min(5, world.wanted + 0.5); break; }
      }
      if (!dead) for (const c of world.cars) {
        if (c.kind === 'traffic' && dist2(b.x, b.y, c.x, c.y) < 24 * 24) { dead = true; world.wanted = Math.min(5, world.wanted + 0.5); break; }
      }
    }
    if (!dead && b.from === 'cop') {
      if (dist2(b.x, b.y, player.x, player.y) < 16 * 16) { player.hp -= 8; dead = true; }
    }
    if (dead) bullets.splice(i, 1);
  }
}

export function updatePolice(world, dt) {
  const { player } = world;
  // Spawn pressure scales with wanted level.
  const want = Math.floor(world.wanted);
  const targetCars = want >= 3 ? 3 : want >= 1 ? 2 : 0;
  const targetCops = want >= 2 && !player.car ? 2 : 0;
  while (world.policeCars.length < targetCars) {
    const a = Math.random() * Math.PI * 2;
    const x = clamp(player.x + Math.cos(a) * 420, 60, WORLD_W - 60);
    const y = clamp(player.y + Math.sin(a) * 420, 60, WORLD_H - 60);
    world.policeCars.push(makeCar(nearestRoadX(x), nearestRoadY(y), 0, PALETTE.police, 'police'));
  }
  while (world.police.length < targetCops) {
    const a = Math.random() * Math.PI * 2;
    world.police.push({ x: clamp(player.x + Math.cos(a) * 260, 40, WORLD_W - 40), y: clamp(player.y + Math.sin(a) * 260, 40, WORLD_H - 40), angle: 0, hp: 60, shootCd: 1 + Math.random(), speed: 150 });
  }
  for (const pc of world.policeCars) {
    const ang = angleTo(pc.x, pc.y, player.x, player.y);
    pc.angle = turnToward(pc.angle, ang, 2.2 * dt);
    pc.speed = 430;
    const nx = pc.x + Math.cos(pc.angle) * pc.speed * dt, ny = pc.y + Math.sin(pc.angle) * pc.speed * dt;
    if (!collidesWithSolid(world.city, nx, ny, 22)) { pc.x = nx; pc.y = ny; }
    if (dist2(pc.x, pc.y, player.x, player.y) < 46 * 46) {
      if (player.car) { player.car.speed *= 0.92; pc.speed = 0; }
      player.hp -= TUNING.policeRamDamage * dt * 3;
      if (Math.random() < dt * 0.5) world.audio.crash();
    }
  }
  for (let i = world.police.length - 1; i >= 0; i--) {
    const cop = world.police[i];
    if (cop.hp <= 0) { world.police.splice(i, 1); world.player.cash += 20; continue; }
    const ang = angleTo(cop.x, cop.y, player.x, player.y);
    cop.angle = ang;
    cop.shootCd -= dt;
    const d = Math.hypot(player.x - cop.x, player.y - cop.y);
    if (d > 60) {
      const nx = cop.x + Math.cos(ang) * cop.speed * dt, ny = cop.y + Math.sin(ang) * cop.speed * dt;
      if (!collidesWithSolid(world.city, nx, ny, 12)) { cop.x = nx; cop.y = ny; }
    }
    if (d < 380 && cop.shootCd <= 0) {
      cop.shootCd = 1.1;
      world.bullets.push({ x: cop.x + Math.cos(ang) * 18, y: cop.y + Math.sin(ang) * 18, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, from: 'cop', life: 1.2 });
      world.audio.shoot();
    }
  }
  // Wanted decays slowly when the player is out of trouble.
  const nearestCop = Math.min(
    ...world.policeCars.map(c => Math.hypot(c.x - player.x, c.y - player.y)),
    ...world.police.map(c => Math.hypot(c.x - player.x, c.y - player.y)),
    9999,
  );
  if (nearestCop > 500 && world.wanted > 0) world.wanted = Math.max(0, world.wanted - TUNING.wantedDecay * dt);
  if (world.wanted < 1) { world.policeCars.length = 0; world.police.length = 0; }
}
