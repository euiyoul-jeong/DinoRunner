// Decides what comes next and when. Tuned for kids: wide gaps, scary
// obstacles unlock only after some points, and more prey when the T-rex is hungry.

const UNLOCK_PTERANODON = 300;
const UNLOCK_TRIKE = 600;
const UNLOCK_CHARGE = 1000;
const CHARGE_CHANCE = 0.25;
const DOUBLE_CACTUS_SCORE = 150;
const DOUBLE_CACTUS_CHANCE = 0.35;
const HUNGRY_FULLNESS = 40; // below this, prey shows up more often
const BIG_SPAWN_LEAD = 160; // big obstacles start further off-screen while "!" warns
const FIRST_GAP = 260;

class Spawner {
  constructor() {
    this.reset();
  }

  reset() {
    this.gap = FIRST_GAP;
  }

  pickType(score, fullness, mode) {
    const preyBoost = fullness < HUNGRY_FULLNESS ? 1.5 : 1;
    if (mode === 'water') {
      return weightedPick([
        ['reefLow', 24],
        ['reefHigh', 14],
        ['mosasaurus', 12],
        ['spinosaurus', 8],
        ['fish', 26 * preyBoost],
        ['plesio', 14 * preyBoost],
      ]);
    }
    const pool = [
      ['cactus', 30],
      ['rock', 14],
      ['compy', 22 * preyBoost],
      ['pachy', 13 * preyBoost],
    ];
    if (score >= UNLOCK_PTERANODON) pool.push(['pteranodon', 12]);
    if (score >= UNLOCK_TRIKE) pool.push(['trike', 9]);
    return weightedPick(pool);
  }

  // Adds new entities to `list` when the gap since the last one has scrolled by.
  update(speed, score, fullness, viewW, list, mode) {
    this.gap -= speed;
    if (this.gap > 0) return;

    const name = this.pickType(score, fullness, mode);
    const type = ENTITY_TYPES[name];
    const size = spriteSize(type.frames[0]);
    const x = type.big ? viewW + BIG_SPAWN_LEAD : viewW + 10;
    let y = GROUND_Y - size.h;
    let high = false;

    if (mode === 'water') {
      if (name === 'spinosaurus') {
        y = WATER_TOP - 18; // sail sticks out above the surface
      } else if (name === 'mosasaurus') {
        y = randomBetween(WATER_TOP + 30, GROUND_Y - size.h - 10);
      } else if (type.kind === 'prey') {
        y = randomBetween(WATER_TOP + 10, GROUND_Y - size.h - 6);
      }
      list.push(new Entity(name, x, { y, water: true }));
      this.gap = nextGap(speed, type);
      return;
    }

    if (name === 'pteranodon') {
      high = Math.random() < 0.5;
      // High: bottom sits above a ducking T-rex but below a standing one.
      y = high ? GROUND_Y - 32 - size.h : GROUND_Y - size.h - 6;
    }

    if (name === 'cactus' && score > DOUBLE_CACTUS_SCORE && Math.random() < DOUBLE_CACTUS_CHANCE) {
      list.push(new Entity(name, x, { y }));
      list.push(new Entity(name, x + size.w + 2, { y }));
    } else {
      const charge = name === 'trike' && score >= UNLOCK_CHARGE && Math.random() < CHARGE_CHANCE;
      list.push(new Entity(name, x, { y, high, charge }));
    }

    this.gap = nextGap(speed, type);
  }
}

// Distance until the next spawn: roomy, and roomier after a big obstacle.
function nextGap(speed, type) {
  return 300 + speed * 16 + Math.random() * 200 + (type.big ? 120 : 0);
}

function weightedPick(pool) {
  const total = pool.reduce((sum, [, weight]) => sum + weight, 0);
  let r = Math.random() * total;
  for (const [name, weight] of pool) {
    if ((r -= weight) < 0) return name;
  }
  return pool[0][0];
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}
