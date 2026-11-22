// Vice Harbor city generation: road grid, buildings, parks, port, beach, collision.
import { WORLD_W, WORLD_H, ROAD_X, ROAD_Y, ROAD_HALF, PALETTE, onRoad } from './config.js';
import { mulberry32, pick, range } from './rng.js';

export function buildCity(seed = 1) {
  const rng = mulberry32(seed);
  const buildings = [];
  // One building per road block, inset from the roads, never on a road.
  for (let ix = 0; ix < ROAD_X.length - 1; ix++) {
    for (let iy = 0; iy < ROAD_Y.length - 1; iy++) {
      const x0 = ROAD_X[ix] + ROAD_HALF + 14;
      const y0 = ROAD_Y[iy] + ROAD_HALF + 14;
      const x1 = ROAD_X[ix + 1] - ROAD_HALF - 14;
      const y1 = ROAD_Y[iy + 1] - ROAD_HALF - 14;
      const w = x1 - x0, h = y1 - y0;
      if (w < 40 || h < 40) continue;
      // Beach strip at the bottom is open sand, no buildings.
      if (y0 > 1520) continue;
      // A few blocks are parks instead of buildings.
      if (rng() < 0.14) {
        buildings.push({ x: x0, y: y0, w, h, park: true, color: PALETTE.park });
        continue;
      }
      const bw = w * range(rng, 0.45, 0.8);
      const bh = h * range(rng, 0.45, 0.8);
      const bx = x0 + (w - bw) / 2 + range(rng, -8, 8);
      const by = y0 + (h - bh) / 2 + range(rng, -8, 8);
      buildings.push({ x: bx, y: by, w: bw, h: bh, park: false, color: pick(rng, PALETTE.building), roof: pick(rng, ['#4a4038', '#38343a', '#3a4a5a']) });
    }
  }
  // Port containers at the Docks (bottom-right), stacked in rows.
  const containers = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 5; c++) {
      containers.push({ x: 2050 + c * 92, y: 1420 + r * 62, w: 80, h: 44, color: pick(rng, PALETTE.container) });
    }
  }
  // Sea along the right edge past the Marina, and a beach band at the bottom.
  const water = { x: 2480, y: 110, w: WORLD_W - 2480, h: 720 };
  const beach = { x: 0, y: 1560, w: 1420, h: WORLD_H - 1560 };
  return { buildings, containers, water, beach, seed };
}

export function collidesWithSolid(city, x, y, r) {
  if (x < r || y < r || x > WORLD_W - r || y > WORLD_H - r) return true;
  for (const b of city.buildings) {
    if (b.park) continue;
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  for (const c of city.containers) {
    if (x + r > c.x && x - r < c.x + c.w && y + r > c.y && y - r < c.y + c.h) return true;
  }
  return false;
}

// Slide along solids: try x then y separately, so the player slides along walls.
export function moveWithCollision(city, e, dx, dy, r) {
  if (!collidesWithSolid(city, e.x + dx, e.y, r)) e.x += dx;
  if (!collidesWithSolid(city, e.x, e.y + dy, r)) e.y += dy;
}

export function roadPoint(rng) {
  // A random point on a road, for spawning cars / markers.
  if (rng() < 0.5) return { x: pick(rng, ROAD_X), y: range(rng, 80, WORLD_H - 80) };
  return { x: range(rng, 80, WORLD_W - 80), y: pick(rng, ROAD_Y) };
}

export function freeSpotNear(city, x, y, r = 16) {
  // Nudge a point onto the nearest road if it sits inside a building.
  if (!collidesWithSolid(city, x, y, r)) return { x, y };
  // Search outward in a spiral of road intersections.
  for (const rx of ROAD_X) for (const ry of ROAD_Y) {
    if (!collidesWithSolid(city, rx, ry, r)) return { x: rx, y: ry };
  }
  return { x: 500, y: 500 };
}
export { onRoad };
