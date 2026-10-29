// Touch and keyboard input.
// Right half of the screen = jump (hold for a higher jump), left half held = duck.
// Each pointer is tracked by id, so ducking with one finger and jumping with
// another works. Taps can first be offered to `onTap` (buttons, menus); if it
// returns true the tap is used up and does not jump or duck.

class Input {
  constructor(canvas, toLogical, onTap) {
    this.canvas = canvas;
    this.toLogical = toLogical; // (clientX, clientY) -> { x, y, viewW }
    this.onTap = onTap;
    this.pointers = new Map(); // pointerId -> 'jump' | 'duck'
    this.keys = new Set();
    this.jumpQueued = false;

    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => this.keyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
  }

  down(e) {
    e.preventDefault();
    const p = this.toLogical(e.clientX, e.clientY);
    if (this.onTap(p.x, p.y)) return;
    const role = p.x > p.viewW / 2 ? 'jump' : 'duck';
    this.pointers.set(e.pointerId, role);
    if (role === 'jump') this.jumpQueued = true;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch (err) {
      // Capture is optional; release still arrives via pointerup in most cases.
    }
  }

  up(e) {
    this.pointers.delete(e.pointerId);
  }

  keyDown(e) {
    const code = e.code;
    if (code === 'Space' || code === 'ArrowUp' || code === 'ArrowDown') e.preventDefault();
    if (e.repeat) return;
    if (code === 'Space' || code === 'ArrowUp') {
      // Keyboard "tap" goes through the same menu handling as a screen tap.
      if (this.onTap(null, null)) return;
      this.jumpQueued = true;
    }
    this.keys.add(code);
  }

  clear() {
    this.pointers.clear();
    this.keys.clear();
    this.jumpQueued = false;
  }

  consumeJump() {
    const queued = this.jumpQueued;
    this.jumpQueued = false;
    return queued;
  }

  get jumpHeld() {
    if (this.keys.has('Space') || this.keys.has('ArrowUp')) return true;
    for (const role of this.pointers.values()) if (role === 'jump') return true;
    return false;
  }

  get duckHeld() {
    if (this.keys.has('ArrowDown')) return true;
    for (const role of this.pointers.values()) if (role === 'duck') return true;
    return false;
  }
}
