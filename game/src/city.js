// The city of Vice Harbor: a 2600x1900 road grid on the coast, six districts,
// buildings, parks and the sea. Pure data — no drawing, no DOM — so the
// simulation and the tests can use it without a browser.
export const CITY_W = 2600;
export const CITY_H = 1900;
export const ROAD_W = 96;
export const SEA_Y = 1760;

export const DISTRICTS = [
  { name: 'Downtown', x: 880, y: 80, w: 640, h: 520, tint: '#3d5a80' },
  { name: 'Palm Court', x: 880, y: 640, w: 640, h: 520, tint: '#7fb069' },
  { name: 'Canal Row', x: 80, y: 640, w: 640, h: 520, tint: '#e07a5f' },
  { name: 'The Docks', x: 80, y: 1220, w: 640, h: 460, tint: '#8d99ae' },
  { name: 'Marina', x: 1640, y: 1220, w: 880, h: 460, tint: '#48cae4' },
  { name: 'Sunset Beach', x: 1640, y: 80, w: 880, h: 1080, tint: '#f4a261' },
];

export const VERTICAL_ROADS = [200, 600, 1000, 1400, 1800, 2200];
export const HORIZONTAL_ROADS = [200, 560, 920, 1280, 1620];

const BUILDING_COLORS = ['#6c757d', '#495057', '#7d8597', '#5c677d', '#8e9aaf', '#6b705c'];

export function buildCity(rng) {
  const buildings = [];
  const parks = [];
  // City blocks sit between the roads. Each block gets a few buildings.
  for (let i = 0; i < VERTICAL_ROADS.length - 1; i++) {
    for (let j = 0; j < HORIZONTAL_ROADS.length - 1; j++) {
      const bx = VERTICAL_ROADS[i] + ROAD_W / 2 + 16;
      const by = HORIZONTAL_ROADS[j] + ROAD_W / 2 + 16;
      const bw = VERTICAL_ROADS[i + 1] - VERTICAL_ROADS[i] - ROAD_W - 32;
      const bh = HORIZONTAL_ROADS[j + 1] - HORIZONTAL_ROADS[j] - ROAD_W - 32;
      if (bw < 60 || bh < 60) continue;
      if (rng.chance(0.12)) {
        parks.push({ x: bx, y: by, w: bw, h: bh });
        continue;
      }
      const count = rng.int(3, 5);
      for (let k = 0; k < count; k++) {
        const w = rng.range(70, Math.max(80, bw / 2));
        const h = rng.range(70, Math.max(80, bh / 2));
        const x = bx + rng.range(0, Math.max(1, bw - w));
        const y = by + rng.range(0, Math.max(1, bh - h));
        buildings.push({
          x, y, w, h,
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(['#495057', '#343a40', '#6c757d']),
          district: districtAt(x + w / 2, y + h / 2),
        });
      }
    }
  }
  // The beach strip along the sea stays open.
  return { buildings, parks };
}

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  }
  return 'Vice Harbor';
}

export function onRoad(x, y) {
  for (const rx of VERTICAL_ROADS) {
    if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  }
  for (const ry of HORIZONTAL_ROADS) {
    if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  }
  return false;
}

// Closest point on the road grid, used to keep traffic and pedestrians on roads.
export function nearestRoadPoint(x, y) {
  let bestX = VERTICAL_ROADS[0];
  let bestDx = Infinity;
  for (const rx of VERTICAL_ROADS) {
    const d = Math.abs(x - rx);
    if (d < bestDx) { bestDx = d; bestX = rx; }
  }
  let bestY = HORIZONTAL_ROADS[0];
  let bestDy = Infinity;
  for (const ry of HORIZONTAL_ROADS) {
    const d = Math.abs(y - ry);
    if (d < bestDy) { bestDy = d; bestY = ry; }
  }
  return bestDx <= bestDy ? { x: bestX, y } : { x, y: bestY };
}

export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    return { x: rng.pick(VERTICAL_ROADS), y: rng.range(120, SEA_Y - 120) };
  }
  return { x: rng.range(120, CITY_W - 120), y: rng.pick(HORIZONTAL_ROADS) };
}

// Circle (x, y, r) against buildings, the sea and the map edge.
export function hitsSolid(city, x, y, r) {
  if (x < r || y < r || x > CITY_W - r || y > CITY_H - r) return true;
  if (y + r > SEA_Y) return true;
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// Push a circle out of solid things; returns the corrected position.
export function resolveCollision(city, x, y, r) {
  if (y + r > SEA_Y) y = SEA_Y - r;
  if (x < r) x = r;
  if (y < r) y = r;
  if (x > CITY_W - r) x = CITY_W - r;
  if (y > CITY_H - r) y = CITY_H - r;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 === 0) { y = b.y - r; continue; }
      const d = Math.sqrt(d2);
      x = cx + (dx / d) * r;
      y = cy + (dy / d) * r;
    }
  }
  return { x, y };
}
