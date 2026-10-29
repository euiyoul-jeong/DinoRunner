// Things that scroll toward the player: obstacles to avoid and prey to eat.

const ENTITY_TYPES = {
  cactus: { kind: 'obstacle', frames: ['cactus'], day: '#3B6D11', night: '#97C459' },
  rock: { kind: 'obstacle', frames: ['rock'], day: '#888780', night: '#B4B2A9' },
  pteranodon: { kind: 'obstacle', frames: ['pteranodon'], day: '#6B4423', night: '#C9935A', big: true, glide: true, bob: 2 },
  trike: { kind: 'obstacle', frames: ['trikeA', 'trikeB'], day: '#B8322A', night: '#E8746C', big: true, walk: 0.5 },
  compy: { kind: 'prey', frames: ['compyA', 'compyB'], day: '#BA7517', night: '#EF9F27', walk: 0.8, food: 20, points: 50 },
  pachy: { kind: 'prey', frames: ['pachyA', 'pachyB'], day: '#185FA5', night: '#85B7EB', walk: 0.6, food: 30, points: 100 },

  // Water mode
  reefLow: { kind: 'obstacle', frames: ['reefLow'], day: '#5F5E5A', night: '#888780' },
  reefHigh: { kind: 'obstacle', frames: ['reefHigh'], day: '#5F5E5A', night: '#888780' },
  mosasaurus: { kind: 'obstacle', frames: ['mosasaurus'], day: '#2C4A6B', night: '#7FA3C9', big: true, walk: 1, bob: 6 },
  spinosaurus: { kind: 'obstacle', frames: ['spinosaurus'], day: '#55652E', night: '#A3B56E', big: true, walk: 0.6, bob: 2 },
  fish: { kind: 'prey', frames: ['fish'], day: '#EF9F27', night: '#FAC775', walk: 1.2, bob: 4, food: 15, points: 50 },
  plesio: { kind: 'prey', frames: ['plesio'], day: '#1D9E75', night: '#5DCAA5', walk: 0.8, bob: 3, food: 30, points: 100 },
};

const CHARGE_BOOST = 2; // extra speed of a charging triceratops
const CHARGE_START_X = 120; // starts charging this far inside the right edge

class Entity {
  // opts: { y, high, charge, water }
  constructor(typeName, x, opts) {
    this.typeName = typeName;
    this.type = ENTITY_TYPES[typeName];
    const size = spriteSize(this.type.frames[0]);
    this.w = size.w;
    this.h = size.h;
    this.x = x;
    this.y = opts.y;
    this.high = !!opts.high; // pteranodon at head height (duck under it)
    this.charge = !!opts.charge;
    this.water = !!opts.water; // swims in the sea (no ground shadow)
    this.phase = Math.random() * 6; // bob offset
    this.age = 0;
    this.bobY = 0; // gentle up-and-down for gliders and swimmers
    this.v = 0;
    this.used = false; // eaten, or already hit the player
  }

  get kind() {
    return this.type.kind;
  }

  update(speed, viewW) {
    let v = speed + (this.type.walk || 0);
    if (this.charge && this.x < viewW - CHARGE_START_X) v += CHARGE_BOOST;
    this.v = v;
    this.x -= v;
    this.age++;
    if (this.type.bob) this.bobY = Math.round(Math.sin(this.age / 14 + this.phase) * this.type.bob);
  }

  isCharging(viewW) {
    return this.charge && this.x < viewW - CHARGE_START_X && !this.used;
  }

  // Slightly smaller than the sprite so near misses don't count as hits.
  hitbox() {
    return { x: this.x + 4, y: this.y + this.bobY + 4, w: this.w - 8, h: this.h - 6 };
  }

  draw(ctx, world, frameCount, viewW) {
    if (this.x > viewW) return;
    const t = this.type;
    const frame = t.frames[Math.floor(frameCount / 8) % t.frames.length];
    ctx.globalAlpha = this.used ? 0.45 : 1;
    drawSprite(ctx, frame, this.x, this.y + this.bobY, mixColor(t.day, t.night, world.night));
    ctx.globalAlpha = 1;

    // Ground shadow under a low-flying pteranodon
    if (t.glide && !this.high && !this.water) {
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = world.color('ink');
      ctx.fillRect(Math.round(this.x) + 18, GROUND_Y + 3, this.w - 36, 3);
      ctx.globalAlpha = 1;
    }

    // Dust kicked up by a charging triceratops
    if (this.isCharging(viewW)) {
      ctx.fillStyle = world.color('groundLine');
      for (let k = 0; k < 3; k++) {
        ctx.fillRect(Math.round(this.x + this.w + 4 + k * 10 + ((frameCount * 3) % 10)), GROUND_Y - 6 - k * 4, 6, 3);
      }
    }
  }
}

function overlaps(a, b) {
  return a.x + 6 < b.x + b.w && a.x + a.w - 8 > b.x && a.y + 4 < b.y + b.h && a.y + a.h - 2 > b.y;
}
