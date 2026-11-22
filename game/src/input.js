// Keyboard + mouse input, with edge-triggered key presses.
export function makeInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let mouseX = 0, mouseY = 0, mouseDown = false, mouseClicked = false;
  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sprint', ShiftRight: 'sprint', KeyE: 'enter', Space: 'space',
    KeyP: 'pause', Escape: 'pause', KeyM: 'mute', KeyC: 'continue',
    Enter: 'confirm',
  };
  function onKey(e, down) {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (down) { if (!keys.has(name)) pressed.add(name); keys.add(name); }
    else keys.delete(name);
    if (name === 'space' || name === 'up' || name === 'down') e.preventDefault();
  }
  window.addEventListener('keydown', e => onKey(e, true));
  window.addEventListener('keyup', e => onKey(e, false));
  window.addEventListener('blur', () => { keys.clear(); });
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) * (canvas.width / r.width);
    mouseY = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', e => { if (e.button === 0) { mouseDown = true; mouseClicked = true; } });
  window.addEventListener('mouseup', () => { mouseDown = false; });
  return {
    keys, mouseX: () => mouseX, mouseY: () => mouseY,
    down: (n) => keys.has(n),
    axisX() { return (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0); },
    axisY() { return (keys.has('down') ? 1 : 0) - (keys.has('up') ? 1 : 0); },
    clicked() { return mouseClicked; },
    held() { return mouseDown; },
    consume() { pressed.clear(); mouseClicked = false; },
    wasPressed(n) { return pressed.has(n); },
  };
}
