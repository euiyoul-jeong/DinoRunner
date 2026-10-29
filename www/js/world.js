// Background: sky, stars and moon, parallax mountains and clouds, the ground,
// and the sea. Also owns the day/night blend that other modules use for colors.
//
// Land and sea live in one picture: the sea surface sits just below the land's
// ground line, and the camera moves down (camY) to look underwater. A shore
// scrolls in from the right when switching, so the T-rex can dive off the beach
// or climb back up a sandbank instead of the screen cutting over.

const VIEW_H = 300;
const GROUND_Y = 252;
const NIGHT_EVERY = 700; // points between day/night switches
const WATER_TOP = 64; // sea surface on screen while underwater
const SEA_SURFACE = GROUND_Y + 10; // in world coordinates (camera at 0 = land view)
const CAM_WATER = SEA_SURFACE - WATER_TOP; // camera offset for the underwater view
const SEA_FLOOR = GROUND_Y + CAM_WATER; // sea floor, world coordinates
const BEACH_W = 140; // width of the slope between land and sea

const DAY_COLORS = {
  sky: '#f7f4ec', mountain: '#e6dfcf', cloud: '#ffffff', ground: '#d9cfb8',
  groundLine: '#8a7f6a', ink: '#444441', subtle: '#888780',
};
const NIGHT_COLORS = {
  sky: '#23253a', mountain: '#33364d', cloud: '#3d4060', ground: '#2c2e40',
  groundLine: '#8a8aa0', ink: '#e8e6de', subtle: '#9a9aae',
};
const SEA_DAY = { sea: '#4A86B8', deep: '#3A6F9E', sand: '#CDBB8E', weed: '#3B6D11', foam: '#B5D4F4' };
const SEA_NIGHT = { sea: '#1B3558', deep: '#142A47', sand: '#3A3A4A', weed: '#2E5E3A', foam: '#5F7EA6' };

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
}

function mixColor(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')';
}

function wrap(value, size) {
  return ((value % size) + size) % size;
}

class World {
  constructor() {
    this.reset();
  }

  reset() {
    this.night = 0; // 0 = day, 1 = night, blended in between
    this.base = 'land'; // terrain under the T-rex when no shore is on screen
    this.shore = null; // { x, next } — terrain to the right of x is `next`
    this.camY = 0;
    this.mountainOffset = 0;
    this.groundOffset = 0;
    this.clouds = [[100, 60], [340, 40], [560, 80]];
    this.bubbles = []; // world coordinates
    this.drops = []; // splash droplets, world coordinates
  }

  color(key) {
    return mixColor(DAY_COLORS[key], NIGHT_COLORS[key], this.night);
  }

  seaColor(key) {
    return mixColor(SEA_DAY[key], SEA_NIGHT[key], this.night);
  }

  // Bring the next shore in from the right edge.
  startShore(next, viewW) {
    this.shore = { x: viewW + 20, next };
  }

  update(speed, score, viewW) {
    const target = Math.floor(score / NIGHT_EVERY) % 2;
    this.night += (target - this.night) * 0.02;
    this.mountainOffset = (this.mountainOffset + speed * 0.12) % 320;
    this.groundOffset += speed;
    for (const cloud of this.clouds) {
      cloud[0] -= speed * 0.25;
      if (cloud[0] < -60) cloud[0] = viewW + Math.random() * 100;
    }

    if (this.shore) {
      this.shore.x -= speed;
      if (this.shore.x + BEACH_W < -10) {
        this.base = this.shore.next;
        this.shore = null;
      }
    }

    if (this.camY > CAM_WATER / 2 && Math.random() < 0.08) {
      this.bubbles.push({ x: Math.random() * viewW, y: SEA_FLOOR - 4, r: 1 + Math.random() * 2 });
    }
    for (const b of this.bubbles) {
      b.y -= 0.6 + b.r * 0.3;
      b.x -= speed * 0.3;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > SEA_SURFACE + 4 && b.x > -10);

    for (const d of this.drops) {
      d.x += d.vx - speed * 0.5;
      d.y += d.vy;
      d.vy += 0.25;
      d.life--;
    }
    this.drops = this.drops.filter((d) => d.life > 0);
  }

  // A few bubbles behind the swimming T-rex (screen coordinates in).
  puff(x, screenY) {
    this.bubbles.push({ x, y: screenY + this.camY, r: 1 + Math.random() * 1.5 });
  }

  // Water spray where the T-rex breaks the surface.
  splash(x) {
    for (let i = 0; i < 14; i++) {
      this.drops.push({
        x: x + (Math.random() - 0.5) * 30,
        y: SEA_SURFACE,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 4,
        life: 30 + Math.random() * 15,
      });
    }
  }

  // Horizontal spans [x0, x1] of land and sea on screen right now.
  spans(viewW) {
    const far = viewW + 20;
    if (!this.shore) {
      return this.base === 'water' ? { land: [], sea: [[-20, far]] } : { land: [[-20, far]], sea: [] };
    }
    const sx = this.shore.x;
    if (this.shore.next === 'water') {
      // Land on the left, the beach drops away into the sea on the right
      return { land: [[-20, sx]], sea: [[sx, far]] };
    }
    // Sea on the left, a sandbank rises to land on the right
    return { land: [[sx + BEACH_W, far]], sea: [[-20, sx + BEACH_W]] };
  }

  draw(ctx, viewW) {
    ctx.fillStyle = this.color('sky');
    ctx.fillRect(-10, -10, viewW + 20, VIEW_H + 20);

    // Far things move less with the camera
    if (this.night > 0.05) {
      const sy = -this.camY * 0.3;
      ctx.globalAlpha = this.night;
      ctx.fillStyle = '#FAC775';
      for (let i = 0; i < 24; i++) ctx.fillRect((i * 137 + 40) % viewW, (i * 53) % 150 + 10 + sy, 2, 2);
      const moonX = viewW - 120;
      ctx.beginPath();
      ctx.arc(moonX, 60 + sy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.color('sky');
      ctx.beginPath();
      ctx.arc(moonX + 7, 55 + sy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = this.color('cloud');
    for (const [cx, cy] of this.clouds) {
      const y = Math.round(cy - this.camY * 0.5);
      ctx.fillRect(Math.round(cx), y, 46, 9);
      ctx.fillRect(Math.round(cx) + 9, y - 7, 24, 7);
    }

    ctx.save();
    ctx.translate(0, -Math.round(this.camY));

    ctx.fillStyle = this.color('mountain');
    for (let i = -1; i < Math.ceil(viewW / 320) + 1; i++) {
      const bx = i * 320 - this.mountainOffset;
      ctx.beginPath();
      ctx.moveTo(bx, GROUND_Y);
      ctx.lineTo(bx + 110, GROUND_Y - 80);
      ctx.lineTo(bx + 190, GROUND_Y - 40);
      ctx.lineTo(bx + 250, GROUND_Y - 95);
      ctx.lineTo(bx + 340, GROUND_Y);
      ctx.fill();
    }

    const { land, sea } = this.spans(viewW);
    for (const [x0, x1] of sea) this.clipped(ctx, x0, x1, () => this.drawSea(ctx, viewW));
    for (const [x0, x1] of land) this.clipped(ctx, x0, x1, () => this.drawLand(ctx, viewW));
    if (this.shore) this.drawBeach(ctx);

    ctx.fillStyle = '#E6F1FB';
    for (const d of this.drops) ctx.fillRect(Math.round(d.x), Math.round(d.y), 3, 3);
    ctx.restore();
  }

  clipped(ctx, x0, x1, paint) {
    if (x1 <= x0) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x0, -1000, x1 - x0, 3000);
    ctx.clip();
    paint();
    ctx.restore();
  }

  drawLand(ctx, viewW) {
    ctx.fillStyle = this.color('ground');
    ctx.fillRect(-20, GROUND_Y, viewW + 40, SEA_FLOOR + 80 - GROUND_Y);
    ctx.fillStyle = this.color('groundLine');
    ctx.fillRect(-20, GROUND_Y, viewW + 40, 2);
    for (let i = 0; i < 30; i++) {
      const px = wrap(i * 97 - this.groundOffset, viewW);
      ctx.fillRect(Math.round(px), GROUND_Y + 8 + (i % 4) * 9, i % 3 ? 3 : 6, 2);
    }
  }

  drawSea(ctx, viewW) {
    ctx.fillStyle = this.seaColor('sea');
    ctx.fillRect(-20, SEA_SURFACE, viewW + 40, SEA_FLOOR - SEA_SURFACE);
    ctx.fillStyle = this.seaColor('deep');
    ctx.fillRect(-20, SEA_SURFACE + 110, viewW + 40, SEA_FLOOR - SEA_SURFACE - 110);

    // Light rays from the surface
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      const rx = wrap(i * 190 - this.groundOffset * 0.1, viewW + 200) - 100;
      ctx.beginPath();
      ctx.moveTo(rx, SEA_SURFACE);
      ctx.lineTo(rx + 40, SEA_SURFACE);
      ctx.lineTo(rx + 110, SEA_FLOOR);
      ctx.lineTo(rx + 60, SEA_FLOOR);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Wavy surface
    ctx.fillStyle = this.seaColor('foam');
    for (let x = -6; x < viewW + 6; x += 6) {
      const wave = Math.round(Math.sin((x + this.groundOffset * 0.6) / 18) * 2);
      ctx.fillRect(x, SEA_SURFACE - 2 + wave, 6, 3);
    }

    // Sandy floor and swaying seaweed
    ctx.fillStyle = this.seaColor('sand');
    ctx.fillRect(-20, SEA_FLOOR, viewW + 40, 80);
    ctx.fillStyle = this.seaColor('weed');
    for (let i = 0; i < 12; i++) {
      const wx = wrap(i * 113 - this.groundOffset * 0.5, viewW + 40) - 20;
      const tall = 14 + (i % 3) * 10;
      for (let s = 0; s < tall; s += 3) {
        const sway = Math.round(Math.sin(s / 6 + this.groundOffset / 40 + i) * 2);
        ctx.fillRect(Math.round(wx) + sway, SEA_FLOOR - s - 3, 3, 3);
      }
    }

    ctx.fillStyle = '#E6F1FB';
    for (const b of this.bubbles) ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.ceil(b.r), Math.ceil(b.r));
  }

  // Sand slope joining land and sea at the shore
  drawBeach(ctx) {
    const sx = Math.round(this.shore.x);
    ctx.fillStyle = this.seaColor('sand');
    ctx.beginPath();
    if (this.shore.next === 'water') {
      // Beach edge, then the slope runs down under the water
      ctx.moveTo(sx - 1, GROUND_Y);
      ctx.lineTo(sx + 26, SEA_SURFACE + 4);
      ctx.lineTo(sx + BEACH_W, SEA_FLOOR);
      ctx.lineTo(sx + BEACH_W, SEA_FLOOR + 80);
      ctx.lineTo(sx - 1, SEA_FLOOR + 80);
    } else {
      // Sandbank rising from the sea floor up to the land
      ctx.moveTo(sx, SEA_FLOOR);
      ctx.lineTo(sx + BEACH_W - 26, SEA_SURFACE + 4);
      ctx.lineTo(sx + BEACH_W + 1, GROUND_Y);
      ctx.lineTo(sx + BEACH_W + 1, SEA_FLOOR + 80);
      ctx.lineTo(sx, SEA_FLOOR + 80);
    }
    ctx.closePath();
    ctx.fill();
  }
}
