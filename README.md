# Vice Harbor — an original open-world crime game

An open-world crime game in the spirit of GTA 6, built from scratch for make.fun's
"Make GTA 6" bounty. Every city, character, vehicle, name, story, sound and piece
of art is original — nothing from Rockstar Games or any other commercial game.

## The story

Mara Voss, ex-getaway driver, is back in Vice Harbor. Her old crew, the Harbor
Kings, want her gone. Her sister Lena runs the Palm Court garage. Three missions:

1. **First Fare** — steal a car, pick up a package at the Marina, deliver it to the Docks.
2. **Harbor Heist** — collect three crates at the port while the guards shoot back.
3. **The Getaway** — lose a 3-star wanted level and make it to the Safehouse in 90 seconds.

## What is in the game

- A 2600×1900 city: Downtown, Palm Court, Canal Row, the Docks, Marina and Sunset Beach, on a road grid with buildings, parks, containers and the sea.
- On foot (WASD, mouse aim, click to shoot, Shift to sprint) and by car (WASD to drive, E to steal / exit — stealing a car raises your wanted level).
- Traffic (14 cars following the road grid) and 26 pedestrians who walk the streets and flee gunfire.
- Wanted level 0–5 stars: police cars chase and ram you, foot cops chase you on foot; getting busted costs $150, getting wasted costs $100. Wanted decays when you stay out of trouble.
- Combat with a pistol, cash and health pickups, a taxi side job (drive a waving passenger to the marker), cash and respect progression.
- HUD with cash, health, wanted stars, mission objective and a live minimap; title / pause / game-over screens; save with Ctrl+S and continue with C; synthesised WebAudio sound (engine, sirens, gunshots, jingles — M to mute).

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive a car |
| Mouse + click | Aim and shoot |
| E | Enter / exit the nearest car |
| Space / Enter | Start, confirm |
| P / Esc | Pause |
| Ctrl+S | Save |
| C (title) | Continue a saved game |
| M | Sound on/off |

## Run it

Serve `game/` with any static server, for example `node serve.ts`, then open
http://localhost:8080 — no network, no build step, no assets outside `game/`.

## Files

- `game/src/config.js` — tuning, palette, city constants
- `game/src/rng.js` — seeded RNG and angle helpers
- `game/src/city.js` — city generation, roads, buildings, collision
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/input.js` — keyboard + mouse
- `game/src/entities.js` — player, cars, traffic, peds, police, bullets
- `game/src/missions.js` — story and the 3 missions, taxi side job
- `game/src/world.js` — world state and the fixed-step simulation
- `game/src/render.js` — drawing, HUD, minimap, menus
- `game/src/shots.js` — staged screenshot scenes (`?shot=start|drive|chase|mission`)
- `game/src/save.js` — localStorage save / load
- `game/src/main.js` — boot and the game loop
