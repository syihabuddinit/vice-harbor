// Save and continue. The save is a small JSON blob in localStorage; when
// there is no browser storage (tests, servers) every call quietly no-ops.
const KEY = 'vice-harbor-save-v1';

function storage() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function saveGame(world) {
  const store = storage();
  if (!store) return false;
  try {
    const data = {
      cash: world.cash,
      respect: world.respect,
      missionIndex: world.missions.index,
      missionStep: world.missions.step,
      health: world.player.health,
      x: world.player.x,
      y: world.player.y,
      time: world.time,
      seed: world.seed,
    };
    store.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function applySave(world, data) {
  if (!data) return;
  world.cash = data.cash || 0;
  world.respect = data.respect || 0;
  world.missions.index = data.missionIndex || 0;
  world.missions.step = data.missionStep || 0;
  world.missions.started = false;
  world.player.health = data.health || 100;
  world.player.x = data.x || 1150;
  world.player.y = data.y || 860;
  world.time = data.time || 0;
}
