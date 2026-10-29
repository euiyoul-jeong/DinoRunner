// The T-rex: running, jumping, ducking, invincibility after a hit, eating face.

const REX_X = 70;
const REX_W = 48;
const REX_H = 42;
const DUCK_W = 60;
const DUCK_H = 27;

const GRAVITY = 0.5;
const FAST_FALL_GRAVITY = 1.2; // ducking in the air drops faster
const JUMP_VELOCITY = -10; // full jump: about 100px high, 40 frames in the air
const JUMP_CUT_VELOCITY = -5; // releasing early caps the rise for a lower jump
const MIN_JUMP_FRAMES = 6; // a quick tap still clears a cactus
const JUMP_BUFFER_FRAMES = 6; // a tap just before landing still counts
const INVINCIBLE_FRAMES = 90; // 1.5 seconds after a hit
const EAT_FRAMES = 12;

// Swimming: hold to rise, let go to sink slowly
const SWIM_UP = -0.45;
const SINK = 0.2;
const MAX_RISE = -4.5;
const MAX_SINK = 3;

class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.mode = 'land';
    this.scripted = false;
    this.y = GROUND_Y - REX_H;
    this.vy = 0;
    this.onGround = true;
    this.ducking = false;
    this.airFrames = 0;
    this.jumpBuffer = 0;
    this.invincible = 0;
    this.eatFrames = 0;
    this.anim = 0;
  }

  queueJump() {
    this.jumpBuffer = JUMP_BUFFER_FRAMES;
  }

  // Dive or climb animation between land and sea; the caller moves `y` each frame.
  startScripted() {
    this.scripted = true;
    this.onGround = false;
    this.ducking = false;
    this.vy = 0;
    this.jumpBuffer = 0;
  }

  // Ends the animation settled in `mode`.
  endScripted(mode) {
    this.scripted = false;
    this.mode = mode;
    this.vy = 0;
    if (mode === 'land') {
      this.y = GROUND_Y - REX_H;
      this.onGround = true;
    }
  }

  swim(held) {
    this.vy += held ? SWIM_UP : SINK;
    this.vy = Math.max(MAX_RISE, Math.min(MAX_SINK, this.vy));
    this.y += this.vy;
    const top = WATER_TOP - 6;
    const bottom = GROUND_Y - DUCK_H;
    if (this.y < top || this.y > bottom) {
      this.y = Math.max(top, Math.min(bottom, this.y));
      this.vy = 0;
    }
  }

  // Returns true on the frame a jump starts (for the sound).
  update(jumpHeld, duckHeld) {
    let jumped = false;
    this.anim++;
    if (this.invincible > 0) this.invincible--;
    if (this.eatFrames > 0) this.eatFrames--;
    if (this.scripted) return false;

    if (this.mode === 'water') {
      this.ducking = false;
      this.swim(jumpHeld || duckHeld);
      return false;
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
      if (this.onGround) {
        this.vy = JUMP_VELOCITY;
        this.onGround = false;
        this.airFrames = 0;
        this.jumpBuffer = 0;
        jumped = true;
      }
    }

    this.ducking = duckHeld;
    if (!this.onGround) {
      this.airFrames++;
      if (!jumpHeld && this.airFrames >= MIN_JUMP_FRAMES && this.vy < JUMP_CUT_VELOCITY) {
        this.vy = JUMP_CUT_VELOCITY;
      }
      this.vy += this.ducking ? FAST_FALL_GRAVITY : GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND_Y - REX_H) {
        this.y = GROUND_Y - REX_H;
        this.vy = 0;
        this.onGround = true;
      }
    }
    return jumped;
  }

  get isDucking() {
    return this.ducking && this.onGround;
  }

  hitbox() {
    if (this.mode === 'water') return { x: REX_X, y: this.y, w: DUCK_W, h: DUCK_H };
    if (this.isDucking) return { x: REX_X, y: GROUND_Y - DUCK_H, w: DUCK_W, h: DUCK_H };
    return { x: REX_X, y: this.y, w: REX_W, h: REX_H };
  }

  hurt() {
    this.invincible = INVINCIBLE_FRAMES;
  }

  eat() {
    this.eatFrames = EAT_FRAMES;
  }

  draw(ctx, color) {
    // Blink while invincible
    if (this.invincible > 0 && Math.floor(this.invincible / 4) % 2) return;
    const step = Math.floor(this.anim / 6) % 2;
    if (this.mode === 'water') {
      // Lying flat, legs paddling
      drawSprite(ctx, Math.floor(this.anim / 10) % 2 ? 'rexDuckA' : 'rexDuckB', REX_X, this.y, color);
    } else if (this.isDucking) {
      drawSprite(ctx, step ? 'rexDuckA' : 'rexDuckB', REX_X, GROUND_Y - DUCK_H, color);
    } else if (this.eatFrames > 0) {
      drawSprite(ctx, 'rexEat', REX_X, this.y, color);
    } else {
      drawSprite(ctx, !this.onGround || step ? 'rexRunA' : 'rexRunB', REX_X, this.y, color);
    }
  }
}
