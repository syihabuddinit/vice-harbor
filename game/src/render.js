// Drawing: city, entities, HUD, minimap, menus.
import { WORLD_W, WORLD_H, VIEW_W, VIEW_H, ROAD_X, ROAD_Y, ROAD_HALF, PALETTE, districtAt } from './config.js';
import { currentObjective, missionMarker } from './missions.js';

function drawCar(ctx, x, y, angle, color, isPolice) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = '#111'; ctx.fillRect(-24, -13, 48, 26);
  ctx.fillStyle = color; ctx.fillRect(-22, -11, 44, 22);
  ctx.fillStyle = 'rgba(180,220,255,0.85)'; ctx.fillRect(-6, -10, 14, 20);
  ctx.fillStyle = '#111';
  ctx.fillRect(-16, -13, 8, 4); ctx.fillRect(-16, 9, 8, 4);
  ctx.fillRect(10, -13, 8, 4); ctx.fillRect(10, 9, 8, 4);
  if (isPolice) {
    ctx.fillStyle = '#ff2a2a'; ctx.fillRect(-4, -11, 8, 5);
    ctx.fillStyle = '#2a6aff'; ctx.fillRect(4, -11, 8, 5);
  }
  ctx.restore();
}
function drawPerson(ctx, x, y, angle, color, isPlayer) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.fillStyle = isPlayer ? '#ff5a7a' : color;
  ctx.beginPath(); ctx.arc(0, 0, isPlayer ? 12 : 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#222'; ctx.fillRect(8, -3, 10, 6);
  ctx.restore();
}

export function render(world, ctx) {
  const { city, cam } = world;
  ctx.fillStyle = PALETTE.grass; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  // Beach and sea.
  ctx.fillStyle = PALETTE.sand; ctx.fillRect(city.beach.x, city.beach.y, city.beach.w, city.beach.h);
  ctx.fillStyle = PALETTE.water; ctx.fillRect(city.water.x, city.water.y, city.water.w, city.water.h);
  ctx.fillStyle = '#7ab8d8'; ctx.fillRect(city.water.x, city.water.y, city.water.w, 6);
  // Roads.
  ctx.fillStyle = PALETTE.road;
  for (const x of ROAD_X) ctx.fillRect(x - ROAD_HALF, 0, ROAD_HALF * 2, WORLD_H);
  for (const y of ROAD_Y) ctx.fillRect(0, y - ROAD_HALF, WORLD_W, ROAD_HALF * 2);
  ctx.strokeStyle = PALETTE.roadLine; ctx.lineWidth = 3; ctx.setLineDash([18, 18]);
  ctx.beginPath();
  for (const x of ROAD_X) { ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_H); }
  for (const y of ROAD_Y) { ctx.moveTo(0, y); ctx.lineTo(WORLD_W, y); }
  ctx.stroke(); ctx.setLineDash([]);
  // Buildings and parks.
  for (const b of city.buildings) {
    ctx.fillStyle = b.color; ctx.fillRect(b.x, b.y, b.w, b.h);
    if (!b.park) {
      ctx.fillStyle = b.roof; ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,240,150,0.7)';
      for (let wx = b.x + 14; wx < b.x + b.w - 10; wx += 22)
        for (let wy = b.y + 14; wy < b.y + b.h - 10; wy += 22) ctx.fillRect(wx, wy, 6, 8);
    } else {
      ctx.fillStyle = '#2a5a34';
      ctx.beginPath(); ctx.arc(b.x + b.w * 0.3, b.y + b.h * 0.4, 12, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(b.x + b.w * 0.7, b.y + b.h * 0.6, 14, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const c of city.containers) {
    ctx.fillStyle = c.color; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.strokeRect(c.x, c.y, c.w, c.h);
  }
  // District labels.
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('DOWNTOWN', 1350, 300); ctx.fillText('PALM COURT', 510, 780);
  ctx.fillText('CANAL ROW', 1680, 780); ctx.fillText('THE DOCKS', 2200, 1020);
  ctx.fillText('MARINA', 2200, 60); ctx.fillText('SUNSET BEACH', 700, 1700);
  // Pickups.
  for (const p of world.pickups) {
    if (p.taken) continue;
    ctx.fillStyle = p.kind === 'cash' ? '#ffd23a' : '#3aff7a';
    ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.kind === 'cash' ? '$' : '+', p.x, p.y + 4);
  }
  // Mission marker / taxi destination.
  const marker = missionMarker(world);
  if (marker) {
    const pulse = 18 + Math.sin(world.time * 5) * 5;
    ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(marker.x, marker.y, pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath(); ctx.moveTo(marker.x, marker.y - 34); ctx.lineTo(marker.x - 10, marker.y - 12); ctx.lineTo(marker.x + 10, marker.y - 12); ctx.closePath(); ctx.fill();
  }
  if (world.taxi.active) {
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(world.taxi.dest.x, world.taxi.dest.y, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TAXI', world.taxi.dest.x, world.taxi.dest.y + 4);
  }
  // Crates for mission 2 are the mission markers; draw crates at the port too.
  // Traffic, police cars, player car, peds, cops, bullets.
  for (const c of world.cars) drawCar(ctx, c.x, c.y, c.angle, c.color, false);
  for (const pc of world.policeCars) drawCar(ctx, pc.x, pc.y, pc.angle, '#2a6aff', true);
  for (const p of world.peds) drawPerson(ctx, p.x, p.y, p.angle, p.color, false);
  for (const cop of world.police) drawPerson(ctx, cop.x, cop.y, cop.angle, '#2a6aff', false);
  if (world.player.car) {
    // Player car is already in world.cars; draw a highlight ring.
    ctx.strokeStyle = '#ff5a7a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(world.player.x, world.player.y, 32, 0, Math.PI * 2); ctx.stroke();
  } else {
    drawPerson(ctx, world.player.x, world.player.y, world.player.angle, '#ff5a7a', true);
  }
  ctx.fillStyle = '#ffd23a';
  for (const b of world.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();

  drawHud(world, ctx);
  if (world.state === 'title') drawTitle(world, ctx);
  if (world.state === 'pause') drawCenter(world, ctx, 'PAUSED', 'Press P to continue — Ctrl+S saves');
  if (world.state === 'over') drawCenter(world, ctx, 'GAME OVER', 'Press Enter to restart');
  if (world.state === 'won') drawCenter(world, ctx, 'VICE HARBOR IS YOURS', 'All missions complete — press Enter to keep playing');
}

function drawHud(world, ctx) {
  const { player } = world;
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 12, 300, 86);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`$${player.cash}`, 24, 38);
  ctx.fillText(`Respect ${player.respect}`, 150, 38);
  // Health bar.
  ctx.fillStyle = '#333'; ctx.fillRect(24, 50, 180, 12);
  ctx.fillStyle = player.hp > 30 ? '#3aff7a' : '#ff3a3a';
  ctx.fillRect(24, 50, 180 * Math.max(0, player.hp / 100), 12);
  ctx.fillStyle = '#fff'; ctx.font = '14px sans-serif';
  ctx.fillText(`HP ${Math.ceil(player.hp)}`, 212, 62);
  // Wanted stars.
  ctx.font = 'bold 22px sans-serif';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < Math.floor(world.wanted) ? '#ffd23a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', 24 + i * 28, 88);
  }
  // Objective.
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(12, 106, 420, 34);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 15px sans-serif';
  ctx.fillText(currentObjective(world), 24, 128);
  if (world.mission && world.mission.timer !== null) {
    ctx.fillStyle = '#ff5a5a'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${Math.ceil(world.mission.timer)}s`, 400, 128);
  }
  if (world.hudFlash) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(340, 12, 420, 34);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(world.hudFlash, 550, 34); ctx.textAlign = 'left';
  }
  // Minimap.
  const mw = 220, mh = 160, mx = VIEW_W - mw - 12, my = 12;
  const sx = mw / WORLD_W, sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#2e5d3a'; ctx.fillRect(mx, my, mw, mh);
  ctx.fillStyle = '#33373f';
  for (const x of ROAD_X) ctx.fillRect(mx + x * sx - 1, my, 2, mh);
  for (const y of ROAD_Y) ctx.fillRect(mx, my + y * sy, mw, 2);
  ctx.fillStyle = '#2a6a9a'; ctx.fillRect(mx + 2480 * sx, my + 110 * sy, (WORLD_W - 2480) * sx, 720 * sy);
  const marker = missionMarker(world);
  if (marker) { ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2); ctx.fill(); }
  for (const pc of world.policeCars) { ctx.fillStyle = '#2a6aff'; ctx.fillRect(mx + pc.x * sx - 2, my + pc.y * sy - 2, 4, 4); }
  ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(mx + player.x * sx, my + player.y * sy, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '13px sans-serif';
  ctx.fillText(districtAt(player.x, player.y), mx, my + mh + 18);
}

function drawTitle(world, ctx) {
  ctx.fillStyle = 'rgba(8,10,24,0.72)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff2a5a'; ctx.font = 'bold 84px sans-serif';
  ctx.fillText('VICE HARBOR', VIEW_W / 2, 220);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 26px sans-serif';
  ctx.fillText('An original open-world crime game', VIEW_W / 2, 262);
  ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif';
  ctx.fillText('Mara Voss is back. The Harbor Kings want her gone.', VIEW_W / 2, 320);
  ctx.fillText('Steal cars, lose the police, finish all three missions.', VIEW_W / 2, 352);
  ctx.fillStyle = '#ffd23a'; ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press SPACE to start', VIEW_W / 2, 430);
  ctx.fillStyle = '#ccc'; ctx.font = '17px sans-serif';
  ctx.fillText('WASD move / drive · Mouse aim · Click shoot · E enter car · P pause · Ctrl+S save · M mute', VIEW_W / 2, 480);
  ctx.fillText('C continues a saved game', VIEW_W / 2, 510);
  ctx.textAlign = 'left';
}

function drawCenter(world, ctx, title, sub) {
  ctx.fillStyle = 'rgba(8,10,24,0.7)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = 'bold 56px sans-serif';
  ctx.fillText(title, VIEW_W / 2, 330);
  ctx.fillStyle = '#ffd23a'; ctx.font = '22px sans-serif';
  ctx.fillText(sub, VIEW_W / 2, 380);
  ctx.textAlign = 'left';
}
