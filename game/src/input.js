// Keyboard and mouse input. The browser side fills this state from events;
// the simulation only reads the plain control object it produces, which the
// tests can build by hand.
export function createInput() {
  return {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false },
    attach(canvas) {
      if (typeof window === 'undefined') return;
      window.addEventListener('keydown', (e) => {
        this.keys.add(e.code);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
          e.preventDefault();
        }
      });
      window.addEventListener('keyup', (e) => this.keys.delete(e.code));
      window.addEventListener('blur', () => this.keys.clear());
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
      });
      canvas.addEventListener('mousedown', () => { this.mouse.down = true; });
      window.addEventListener('mouseup', () => { this.mouse.down = false; });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },
    pressed(code) {
      return this.keys.has(code);
    },
  };
}

// Turn raw key/mouse state into the control object the world steps with.
export function readControls(input, screen) {
  const k = input.keys;
  const up = k.has('KeyW') || k.has('ArrowUp');
  const down = k.has('KeyS') || k.has('ArrowDown');
  const left = k.has('KeyA') || k.has('ArrowLeft');
  const right = k.has('KeyD') || k.has('ArrowRight');
  return {
    up, down, left, right,
    sprint: k.has('ShiftLeft') || k.has('ShiftRight'),
    shoot: input.mouse.down,
    aimScreenX: input.mouse.x,
    aimScreenY: input.mouse.y,
    enterCar: k.has('KeyE'),
    pause: k.has('KeyP') || k.has('Escape'),
    mute: k.has('KeyM'),
    save: k.has('KeyS') && (k.has('ControlLeft') || k.has('ControlRight')),
    confirm: k.has('Enter') || k.has('Space'),
    continueSave: k.has('KeyC'),
    // World-space aim, filled in by the caller from the camera.
    aimX: 0,
    aimY: 0,
    screen,
  };
}

export function blankControls() {
  return {
    up: false, down: false, left: false, right: false,
    sprint: false, shoot: false, aimScreenX: 0, aimScreenY: 0,
    enterCar: false, pause: false, mute: false, save: false,
    confirm: false, continueSave: false, aimX: 0, aimY: 0, screen: null,
  };
}
