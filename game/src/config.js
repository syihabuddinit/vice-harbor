// Vice Harbor — tuning, palette and city constants. All original.
export const WORLD_W = 2600;
export const WORLD_H = 1900;
export const VIEW_W = 1280;
export const VIEW_H = 720;

// Road grid: vertical roads every 260 px, horizontal every 240 px.
export const ROAD_X = [120, 380, 640, 900, 1160, 1420, 1680, 1940, 2200, 2460];
export const ROAD_Y = [110, 350, 590, 830, 1070, 1310, 1550, 1790];
export const ROAD_HALF = 26;

export const DISTRICTS = [
  { name: 'Downtown', x: 900, y: 350, w: 900, h: 480 },
  { name: 'Palm Court', x: 120, y: 830, w: 780, h: 480 },
  { name: 'Canal Row', x: 1420, y: 830, w: 520, h: 480 },
  { name: 'The Docks', x: 1940, y: 1070, w: 520, h: 720 },
  { name: 'Marina', x: 1940, y: 110, w: 520, h: 720 },
  { name: 'Sunset Beach', x: 120, y: 1550, w: 1300, h: 240 },
];

export const PALETTE = {
  grass: '#2e5d3a', road: '#33373f', roadLine: '#d8c95a', sidewalk: '#6b6f78',
  building: ['#7a6a8a', '#8a7a5a', '#5a7a8a', '#9a5a6a', '#6a8a5a', '#7a5a7a'],
  water: '#2a6a9a', sand: '#d8c98a', park: '#3a7a4a', container: ['#b85a3a', '#3a8ab8', '#b8a03a'],
  player: '#ff5a7a', playerCar: '#ff2a5a', police: '#2a6aff', traffic: ['#e8e8e8', '#e8b83a', '#3ab86a', '#b83a3a', '#7a5ae8'],
  ped: ['#f0d0a0', '#a0c8f0', '#f0a0c8', '#c8f0a0', '#f0e0a0'],
};

export const TUNING = {
  walkSpeed: 210, sprintMul: 1.55, carAccel: 620, carMax: 520, carTurn: 2.9,
  carBrake: 900, bulletSpeed: 760, bulletDamage: 34, playerHp: 100,
  wantedDecay: 0.045, policeRamDamage: 9, bustedFine: 150, wastedFine: 100,
  taxiFare: 60, crateReward: 80,
};

export function districtAt(x, y) {
  for (const d of DISTRICTS) if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d.name;
  return 'Vice Harbor';
}

export function nearestRoadX(x) {
  let best = ROAD_X[0], bd = 1e9;
  for (const r of ROAD_X) { const d = Math.abs(r - x); if (d < bd) { bd = d; best = r; } }
  return best;
}
export function nearestRoadY(y) {
  let best = ROAD_Y[0], bd = 1e9;
  for (const r of ROAD_Y) { const d = Math.abs(r - y); if (d < bd) { bd = d; best = r; } }
  return best;
}
export function onRoad(x, y) {
  return ROAD_X.some(r => Math.abs(x - r) < ROAD_HALF + 14) || ROAD_Y.some(r => Math.abs(y - r) < ROAD_HALF + 14);
}
