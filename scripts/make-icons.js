// Draws the Android app icons, splash screens and web icons from the game's own
// T-rex sprite: sand sky, ground strip, grey T-rex standing on the ground line.
// No packages needed — PNGs are written with Node's built-in zlib.
// Run: npm run icons
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const res = path.join(root, 'android', 'app', 'src', 'main', 'res');

// Same sprite data the game draws with
const SPRITES = vm.runInNewContext(fs.readFileSync(path.join(root, 'www', 'js', 'sprites.js'), 'utf8') + ';SPRITES', {});
const REX = SPRITES.rexRunA;
const REX_COLS = REX[0].length;
const REX_ROWS = REX.length;

const SKY = [0xf7, 0xf4, 0xec];
const GROUND = [0xd9, 0xcf, 0xb8];
const LINE = [0x8a, 0x7f, 0x6a];
const INK = [0x44, 0x44, 0x41];

// ---- Tiny PNG writer -------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

class Picture {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = Buffer.alloc(w * h * 4); // RGBA, starts transparent
  }

  rect(x, y, w, h, [r, g, b]) {
    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(this.w, Math.round(x + w));
    const y1 = Math.min(this.h, Math.round(y + h));
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const i = (yy * this.w + xx) * 4;
        this.px[i] = r;
        this.px[i + 1] = g;
        this.px[i + 2] = b;
        this.px[i + 3] = 255;
      }
    }
  }

  // Clear everything outside a centred circle (round launcher icon)
  circle() {
    const c = (this.w - 1) / 2;
    const r = this.w / 2;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if ((x - c) ** 2 + (y - c) ** 2 > r * r) this.px[(y * this.w + x) * 4 + 3] = 0;
      }
    }
  }

  save(file) {
    const raw = Buffer.alloc((this.w * 4 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 4 + 1)] = 0; // no filter
      this.px.copy(raw, y * (this.w * 4 + 1) + 1, y * this.w * 4, (y + 1) * this.w * 4);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    fs.writeFileSync(
      file,
      Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0)),
      ]),
    );
  }
}

// ---- The scene ---------------------------------------------------------------

// groundAt: ground line as a fraction of the height.
// rexWidth: T-rex width as a fraction of the shorter side.
// sky: false leaves the sky transparent (adaptive icon foreground).
function scene(w, h, { groundAt, rexWidth, sky = true }) {
  const pic = new Picture(w, h);
  const groundY = Math.round(h * groundAt);
  if (sky) pic.rect(0, 0, w, groundY, SKY);
  pic.rect(0, groundY, w, h - groundY, GROUND);
  pic.rect(0, groundY, w, Math.max(1, Math.round(Math.min(w, h) * 0.02)), LINE);

  // Whole-pixel cells keep the dots sharp; feet stand on the ground line
  const cell = Math.max(1, Math.round((Math.min(w, h) * rexWidth) / REX_COLS));
  const left = Math.round((w - REX_COLS * cell) / 2);
  const top = groundY - REX_ROWS * cell;
  for (let r = 0; r < REX_ROWS; r++) {
    for (let c = 0; c < REX_COLS; c++) {
      if (REX[r][c] === 'X') pic.rect(left + c * cell, top + r * cell, cell, cell, INK);
    }
  }
  return pic;
}

function write(pic, ...parts) {
  const file = path.join(...parts);
  pic.save(file);
  console.log(path.relative(root, file), `${pic.w}x${pic.h}`);
}

// ---- Android launcher icons --------------------------------------------------

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [name, scale] of Object.entries(DENSITIES)) {
  const dir = path.join(res, `mipmap-${name}`);
  const size = 48 * scale;
  write(scene(size, size, { groundAt: 0.74, rexWidth: 0.56 }), dir, 'ic_launcher.png');

  const round = scene(size, size, { groundAt: 0.74, rexWidth: 0.5 });
  round.circle();
  write(round, dir, 'ic_launcher_round.png');

  // Adaptive icon front layer (108dp); the T-rex stays inside the middle safe zone
  const fg = 108 * scale;
  write(scene(fg, fg, { groundAt: 0.68, rexWidth: 0.4, sky: false }), dir, 'ic_launcher_foreground.png');
}

// Adaptive icon back layer = sky color
fs.writeFileSync(
  path.join(res, 'values', 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F7F4EC</color>\n</resources>\n',
);

// ---- Splash screens (keep each existing file's size) -------------------------

const SPLASHES = {
  drawable: [480, 320],
  'drawable-land-mdpi': [480, 320],
  'drawable-land-hdpi': [800, 480],
  'drawable-land-xhdpi': [1280, 720],
  'drawable-land-xxhdpi': [1600, 960],
  'drawable-land-xxxhdpi': [1920, 1280],
  'drawable-port-mdpi': [320, 480],
  'drawable-port-hdpi': [480, 800],
  'drawable-port-xhdpi': [720, 1280],
  'drawable-port-xxhdpi': [960, 1600],
  'drawable-port-xxxhdpi': [1280, 1920],
};

for (const [dir, [w, h]] of Object.entries(SPLASHES)) {
  write(scene(w, h, { groundAt: 0.66, rexWidth: 0.32 }), res, dir, 'splash.png');
}

// ---- Web icons ---------------------------------------------------------------

write(scene(64, 64, { groundAt: 0.78, rexWidth: 0.75 }), root, 'www', 'favicon.png');
write(scene(180, 180, { groundAt: 0.74, rexWidth: 0.56 }), root, 'www', 'apple-touch-icon.png');
