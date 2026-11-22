// Everything Vice Harbor shows: the sun-soaked city, the cars and people,
// the HUD with its minimap, and the menus. All drawing happens here and
// nowhere else; the simulation never touches the canvas.
import { CITY_W, CITY_H, ROAD_W, SEA_Y, DISTRICTS, VERTICAL_ROADS, HORIZONTAL_ROADS, districtAt } from './city.js';
import { objectiveText, currentMission } from './missions.js';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function makeCamera(viewW, viewH) {
  return { x: CITY_W / 2, y: CITY_H / 2, w: viewW, h: viewH };
}

export function followCamera(camera, x, y) {
  camera.x = clamp(x, camera.w / 2, CITY_W - camera.w / 2);
  camera.y = clamp(y, camera.h / 2, CITY_H - camera.h / 2);
}

function toScreen(camera, x, y) {
  return { x: x - camera.x + camera.w / 2, y: y - camera.y + camera.h / 2 };
}

function drawGround(ctx, camera) {
  const tl = toScreen(camera, 0, 0);
  const br = toScreen(camera, CITY_W, CITY_H);
  ctx.fillStyle = '#c9b18c';
  ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
  // Sea along the south edge.
  const seaTop = toScreen(camera, 0, SEA_Y);
  ctx.fillStyle = '#219ebc';
  ctx.fillRect(tl.x, seaTop.y, br.x - tl.x, br.y - seaTop.y);
  ctx.fillStyle = '#8ecae6';
  ctx.fillRect(tl.x, seaTop.y, br.x - tl.x, 6);
  // Beach strip.
  ctx.fillStyle = '#e9d8a6';
  ctx.fillRect(tl.x, seaTop.y - 26, br.x - tl.x, 26);
  // Roads.
  ctx.fillStyle = '#3a3f44';
  for (const rx of VERTICAL_ROADS) {
    const s = toScreen(camera, rx - ROAD_W / 2, 0);
    ctx.fillRect(s.x, tl.y, ROAD_W, br.y - tl.y);
  }
  for (const ry of HORIZONTAL_ROADS) {
    const s = toScreen(camera, 0, ry - ROAD_W / 2);
    ctx.fillRect(tl.x, s.y, br.x - tl.x, ROAD_W);
  }
  // Lane dashes.
  ctx.fillStyle = '#f8f9fa';
  for (const rx of VERTICAL_ROADS) {
    for (let y = 0; y < CITY_H; y += 56) {
      const s = toScreen(camera, rx, y);
      ctx.fillRect(s.x - 2, s.y, 4, 28);
    }
  }
  for (const ry of HORIZONTAL_ROADS) {
    for (let x = 0; x < CITY_W; x += 56) {
      const s = toScreen(camera, x, ry);
      ctx.fillRect(s.x, s.y - 2, 28, 4);
    }
  }
}

function drawDistricts(ctx, camera) {
  ctx.textAlign = 'center';
  for (const d of DISTRICTS) {
    const s = toScreen(camera, d.x + d.w / 2, d.y + d.h / 2);
    if (s.x < -200 || s.x > camera.w + 200 || s.y < -100 || s.y > camera.h + 100) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(d.name.toUpperCase(), s.x, s.y);
  }
}

function drawCity(ctx, world, camera) {
  drawGround(ctx, camera);
  for (const park of world.city.parks) {
    const s = toScreen(camera, park.x, park.y);
    ctx.fillStyle = '#74c69d';
    ctx.fillRect(s.x, s.y, park.w, park.h);
    ctx.fillStyle = '#2d6a4f';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(s.x + 20 + i * 30, s.y + park.h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const b of world.city.buildings) {
    const s = toScreen(camera, b.x, b.y);
    if (s.x > camera.w + 50 || s.y > camera.h + 50 || s.x + b.w < -50 || s.y + b.h < -50) continue;
    ctx.fillStyle = b.color;
    ctx.fillRect(s.x, s.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(s.x + 5, s.y + 5, b.w - 10, b.h - 10);
    ctx.fillStyle = 'rgba(255, 214, 120, 0.85)';
    for (let wx = s.x + 12; wx < s.x + b.w - 14; wx += 22) {
      for (let wy = s.y + 12; wy < s.y + b.h - 14; wy += 22) {
        ctx.fillRect(wx, wy, 10, 8);
      }
    }
  }
  drawDistricts(ctx, camera);
}

function drawCar(ctx, camera, car) {
  const s = toScreen(camera, car.x, car.y);
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(car.angle);
  const len = car.kind === 'truck' ? 52 : 44;
  const wid = 22;
  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-len / 2, -wid / 2, len, wid, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 30, 40, 0.85)';
  ctx.fillRect(-6, -wid / 2 + 3, 14, wid - 6);
  if (car.kind === 'police') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-len / 2 + 4, -wid / 2 + 2, 10, wid - 4);
    ctx.fillStyle = '#e63946';
    ctx.fillRect(-2, -wid / 2 - 2, 6, 5);
    ctx.fillStyle = '#4361ee';
    ctx.fillRect(-2, wid / 2 - 3, 6, 5);
  }
  if (car.kind === 'taxi') {
    ctx.fillStyle = '#222222';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
  }
  ctx.fillStyle = '#ffe66d';
  ctx.fillRect(len / 2 - 3, -wid / 2 + 3, 3, 5);
  ctx.fillRect(len / 2 - 3, wid / 2 - 8, 3, 5);
  ctx.restore();
}

function drawPed(ctx, camera, ped) {
  const s = toScreen(camera, ped.x, ped.y);
  ctx.fillStyle = ped.color;
  ctx.beginPath();
  ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222222';
  ctx.beginPath();
  ctx.arc(s.x + Math.cos(ped.angle) * 4, s.y + Math.sin(ped.angle) * 4, 4, 0, Math.PI * 2);
  ctx.fill();
  if (ped.waving) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 16 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawMarkers(ctx, world, camera) {
  const ms = world.missions;
  const mission = currentMission(ms);
  if (mission && ms.started && ms.step < mission.steps.length) {
    const t = mission.steps[ms.step].target;
    if (t) {
      const s = toScreen(camera, t.x, t.y);
      const pulse = 26 + Math.sin(Date.now() / 200) * 6;
      ctx.strokeStyle = '#ffd60a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd60a';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 34);
      ctx.lineTo(s.x - 8, s.y - 18);
      ctx.lineTo(s.x + 8, s.y - 18);
      ctx.closePath();
      ctx.fill();
    }
  }
  if (world.taxi.active && world.taxi.state === 'riding' && world.taxi.target) {
    const s = toScreen(camera, world.taxi.target.x, world.taxi.target.y);
    ctx.strokeStyle = '#06d6a0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 24, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const pk of world.pickups) {
    const s = toScreen(camera, pk.x, pk.y);
    ctx.fillStyle = pk.kind === 'health' ? '#ef476f' : '#06d6a0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(pk.kind === 'health' ? '+' : '$', s.x, s.y + 4);
  }
}

function drawMinimap(ctx, world, camera) {
  const mw = 220;
  const mh = 160;
  const mx = camera.w - mw - 14;
  const my = camera.h - mh - 14;
  const sx = mw / CITY_W;
  const sy = mh / CITY_H;
  ctx.fillStyle = 'rgba(10, 16, 24, 0.78)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx, my, mw, mh);
  ctx.fillStyle = '#219ebc';
  ctx.fillRect(mx, my + SEA_Y * sy, mw, mh - SEA_Y * sy);
  ctx.fillStyle = '#555555';
  for (const rx of VERTICAL_ROADS) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
  for (const ry of HORIZONTAL_ROADS) ctx.fillRect(mx, my + ry * sy, mw, 2);
  ctx.fillStyle = '#ffd60a';
  ctx.fillRect(mx + world.player.x * sx - 3, my + world.player.y * sy - 3, 6, 6);
  const ms = world.missions;
  const mission = currentMission(ms);
  if (mission && ms.started && ms.step < mission.steps.length) {
    const t = mission.steps[ms.step].target;
    if (t) {
      ctx.fillStyle = '#ff006e';
      ctx.beginPath();
      ctx.arc(mx + t.x * sx, my + t.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#4361ee';
  for (const car of world.cars) {
    if (car.driver === 'police') ctx.fillRect(mx + car.x * sx - 2, my + car.y * sy - 2, 4, 4);
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(districtAt(world.player.x, world.player.y), mx + 6, my + 14);
}

function drawHud(ctx, world, camera) {
  ctx.textAlign = 'left';
  // Cash and respect, top left.
  ctx.fillStyle = 'rgba(10, 16, 24, 0.78)';
  ctx.fillRect(12, 12, 210, 64);
  ctx.fillStyle = '#06d6a0';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('$' + world.cash, 24, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px sans-serif';
  ctx.fillText('Respect ' + world.respect, 24, 62);
  // Wanted stars, top right.
  ctx.fillStyle = 'rgba(10, 16, 24, 0.78)';
  ctx.fillRect(camera.w - 190, 12, 178, 44);
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < world.wanted ? '#ffd60a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', camera.w - 168 + i * 32, 44);
  }
  // Objective bar, top centre.
  const obj = objectiveText(world.missions);
  ctx.font = '15px sans-serif';
  const ow = Math.min(560, ctx.measureText(obj).width + 28);
  ctx.fillStyle = 'rgba(10, 16, 24, 0.78)';
  ctx.fillRect(camera.w / 2 - ow / 2, 12, ow, 34);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(obj, camera.w / 2, 34);
  // Health bar, bottom left.
  ctx.fillStyle = 'rgba(10, 16, 24, 0.78)';
  ctx.fillRect(12, camera.h - 44, 220, 30);
  ctx.fillStyle = '#333333';
  ctx.fillRect(22, camera.h - 36, 200, 14);
  ctx.fillStyle = world.player.health > 30 ? '#06d6a0' : '#ef476f';
  ctx.fillRect(22, camera.h - 36, 200 * Math.max(0, world.player.health / 100), 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('HEALTH ' + Math.ceil(Math.max(0, world.player.health)), 24, camera.h - 48);
  // Mission timer.
  const ms = world.missions;
  if (ms.started && ms.timer > 0) {
    ctx.fillStyle = ms.timer < 15 ? '#ef476f' : '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(ms.timer) + 's', camera.w / 2, 78);
  }
  // Toast message.
  if (world.message) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, camera.w / 2, camera.h - 60);
  }
  drawMinimap(ctx, world, camera);
}

function drawMenu(ctx, camera, title, lines, hint) {
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  ctx.fillRect(0, 0, camera.w, camera.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd60a';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText(title, camera.w / 2, camera.h / 2 - 90);
  ctx.fillStyle = '#ffffff';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, camera.w / 2, camera.h / 2 - 40 + i * 30));
  ctx.fillStyle = '#8ecae6';
  ctx.font = '16px sans-serif';
  ctx.fillText(hint, camera.w / 2, camera.h / 2 + 60);
}

export function render(ctx, world, camera, ui) {
  ctx.clearRect(0, 0, camera.w, camera.h);
  drawCity(ctx, world, camera);
  drawMarkers(ctx, world, camera);
  for (const ped of world.peds) drawPed(ctx, camera, ped);
  for (const car of world.cars) drawCar(ctx, camera, car);
  for (const cop of world.police) {
    const s = toScreen(camera, cop.x, cop.y);
    ctx.fillStyle = '#1d3557';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', s.x, s.y + 3);
  }
  for (const g of world.guards) {
    const s = toScreen(camera, g.x, g.y);
    ctx.fillStyle = '#6d6875';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HK', s.x, s.y + 3);
  }
  // Mara.
  const p = world.player;
  if (p.onFoot) {
    const s = toScreen(camera, p.x, p.y);
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + Math.cos(p.angle) * 18, s.y + Math.sin(p.angle) * 18);
    ctx.stroke();
  }
  for (const b of world.bullets) {
    const s = toScreen(camera, b.x, b.y);
    ctx.fillStyle = '#ffe66d';
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  drawHud(ctx, world, camera);
  if (ui === 'title') {
    drawMenu(ctx, camera, 'VICE HARBOR', [
      'Mara Voss is back. The Harbor Kings want her gone.',
      'Steal cars, outrun the Harbor PD, finish all three missions.',
      'WASD move / drive · Mouse aim · Click shoot · E enter car · Shift sprint',
      'Ctrl+S save · C continue · P pause · M mute',
    ], 'Press Enter to start');
  } else if (ui === 'paused') {
    drawMenu(ctx, camera, 'PAUSED', ['Take a breath. The Harbor waits.'], 'Press P to keep playing');
  } else if (ui === 'busted') {
    drawMenu(ctx, camera, 'BUSTED', ['The Harbor PD caught Mara. Fine: $150.', 'Cash: $' + world.cash], 'Press Enter to try again');
  } else if (ui === 'wasted') {
    drawMenu(ctx, camera, 'WASTED', ['Mara went down. Hospital bill: $100.', 'Cash: $' + world.cash], 'Press Enter to try again');
  } else if (ui === 'failed') {
    drawMenu(ctx, camera, 'MISSION FAILED', ['Out of time. The Harbor Kings are laughing.'], 'Press Enter to retry the mission');
  } else if (ui === 'win') {
    drawMenu(ctx, camera, 'VICE HARBOR IS YOURS', [
      'All three missions done. Mara owns this city now.',
      'Cash $' + world.cash + ' · Respect ' + world.respect,
    ], 'Press Enter to free roam');
  }
}
