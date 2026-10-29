// Pixel-art sprites drawn from text rows.
// Each character is one pixel: '.' is transparent, 'X' uses the color passed to
// drawSprite (so body colors can shift between day and night), and any other
// letter is a fixed color from PALETTE.

const PIXEL = 3;

const PALETTE = {
  W: '#F1EFE8', // white horns, beak, teeth
  R: '#E24B4A', // red eye
  Y: '#FAC775', // yellow eye
  F: '#F0997B', // triceratops frill
  D: '#B5D4F4', // pachycephalosaurus dome
  E: '#2C2C2A', // dark eye on prey
  C: '#ED93B1', // coral on reefs
  G: '#639922', // seaweed
  S: '#D85A30', // spinosaurus sail
  B: '#C9A877', // bone on the HUD drumstick
};

const SPRITES = {
  // T-rex (player), facing right
  rexRunA: [
    '........XXXXXX..', '.......XX.XXXXX.', '.......XXXXXXXXX', '.......XXXXXXXXX',
    '.......XXXXX....', '.......XXXXXXX..', 'X.....XXXXX.....', 'XX...XXXXXXXX...',
    'XXX.XXXXXXX.X...', 'XXXXXXXXXXX.....', '.XXXXXXXXXX.....', '..XXXXXXXX......',
    '...XXX.XX.......', '...XX....XX.....',
  ],
  rexRunB: [
    '........XXXXXX..', '.......XX.XXXXX.', '.......XXXXXXXXX', '.......XXXXXXXXX',
    '.......XXXXX....', '.......XXXXXXX..', 'X.....XXXXX.....', 'XX...XXXXXXXX...',
    'XXX.XXXXXXX.X...', 'XXXXXXXXXXX.....', '.XXXXXXXXXX.....', '..XXXXXXXX......',
    '...XX..XXX......', '...XXX..........',
  ],
  rexEat: [
    '........XXXXXX..', '.......XX.XXXXXX', '.......XXXXXXXX.', '.......XXXX.....',
    '.......XXXX.X...', '.......XXXXXXXX.', 'X.....XXXXX.....', 'XX...XXXXXXXX...',
    'XXX.XXXXXXX.X...', 'XXXXXXXXXXX.....', '.XXXXXXXXXX.....', '..XXXXXXXX......',
    '...XXX.XX.......', '...XX....XX.....',
  ],
  rexDuckA: [
    'X..........XXXXXXX..', 'XX.......XXXX.XXXXXX', 'XXX..XXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXXX....', '..XXXXXXXXXXXXXXXX..',
    '...XXXXXXXX.........', '...XXX.XX...........', '...XX....XX.........',
  ],
  rexDuckB: [
    'X..........XXXXXXX..', 'XX.......XXXX.XXXXXX', 'XXX..XXXXXXXXXXXXXXX',
    'XXXXXXXXXXXXXXXXXXXX', '.XXXXXXXXXXXXXXX....', '..XXXXXXXXXXXXXXXX..',
    '...XXXXXXXX.........', '...XX..XXX..........', '...XXX..............',
  ],

  // Obstacles, facing left
  cactus: [
    '...XX...', '..XXXX..', 'X.XXXX..', 'X.XXXX.X', 'X.XXXX.X', 'XXXXXX.X', '..XXXXXX',
    '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..', '..XXXX..',
  ],
  rock: ['...XXXX...', '..XXXXXXX.', '.XXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  // Pteranodon glides with wings spread; it never flaps.
  pteranodon: [
    '...........XXX..............', '.........XXX................',
    'WWWWWWXXRX..................', '....WWXXXXXXXXXXXXXXXXXXXXXX',
    '........XXXXXXXXXXXXXXXXXXX.', '..........XXXXXXXXXXXXXXX...',
    '...........XXXXXXXXXXX......', '............XX..XXXXX.......',
    '.............X......XX......',
  ],
  // Adult triceratops: two brow horns, one nose horn, frill behind the head.
  trikeA: [
    '.........FF.............', 'WW......FFFF............', '..WWW..FFFFFF...........',
    'WW...WWFFFFFF...........', '..WWWXXXFFXXXXXXXX......', '.W.XXYXXXXXXXXXXXXXXX...',
    '.WXXXXXXXXXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXXXXXXXXXX', '..XXXXXXXXXXXXXXXXXXX...',
    '....XXXXXXXXXXXXXXXX....', '....XXX.XXX...XXX.XXX...', '....XXX.XXX...XXX.XXX...',
    '....XX...XX...XX...XX...',
  ],
  trikeB: [
    '.........FF.............', 'WW......FFFF............', '..WWW..FFFFFF...........',
    'WW...WWFFFFFF...........', '..WWWXXXFFXXXXXXXX......', '.W.XXYXXXXXXXXXXXXXXX...',
    '.WXXXXXXXXXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXXXXXXXXXX', '..XXXXXXXXXXXXXXXXXXX...',
    '....XXXXXXXXXXXXXXXX....', '...XXX..XXX..XXX..XXX...', '..XX.....XX.XX.....XX...',
    '..X.......X.X.......X...',
  ],

  // Prey, facing left
  compyA: ['XX........', 'XEX.......', '.XX.......', '.XXXXXX...', '..XXXXXXXX', '...XXXX...', '...X..X...', '..X....X..'],
  compyB: ['XX........', 'XEX.......', '.XX.......', '.XXXXXX...', '..XXXXXXXX', '...XXXX...', '....XX....', '....XX....'],
  pachyA: [
    '..DDD.......', '.DDDDD......', '.DDDDD......', 'XXEXXX......', 'XXXXXXXXXX..',
    '..XXXXXXXXXX', '...XXXXXXX.X', '...XXXXXX...', '...X...X....', '..XX..XX....',
  ],
  pachyB: [
    '..DDD.......', '.DDDDD......', '.DDDDD......', 'XXEXXX......', 'XXXXXXXXXX..',
    '..XXXXXXXXXX', '...XXXXXXX.X', '...XXXXXX...', '....X.X.....', '....XX.X....',
  ],

  // Water obstacles, facing left
  reefLow: [
    '....CC......', '...CCCC..G..', '....CC..GG..', '..XXXX..G...', '.XXXXXX.G...',
    '.XXXXXXXGX..', 'XXXXXXXXXXX.', 'XXXXXXXXXXXX', 'XXXX.XXXXXXX', 'XXXXXXXXXXXX',
    'XXXXXXXX.XXX', 'XXXXXXXXXXXX', 'XX.XXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXXXXX',
  ],
  reefHigh: [
    '...CC.......', '..CCCC...G..', '...CC...GG..', '...XXX..G...', '..XXXX..G...',
    '..XXXXX.G...', '..XXXXXXG...', '...XXXXX....', '...XXXXX.CC.', '..XXXXXXCCCC',
    '..XXXXXXXCC.', '..XXX.XXXX..', '.XXXXXXXXX..', '.XXXXXXXXX..', '.XXXXXXXXXX.',
    'GXXXXX.XXXX.', 'GXXXXXXXXXX.', '.GXXXXXXXXX.', '.XXXXXXXXXXX', 'XXXXXXXXXXXX',
    'XXXXXXX.XXXX', 'XXXXXXXXXXXX', 'XXX.XXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXXXXX.XX',
    'XXXXXXXXXXXX', 'X.XXXXXXXXXX', 'XXXXXXXXXXXX', 'XXXXXX.XXXXX', 'XXXXXXXXXXXX',
  ],
  // Mosasaurus: long toothy jaw, flippers, tail fin
  mosasaurus: [
    '......XXXXXX..................', '...XXXXXRXXXXXXXXXX........XX.',
    'WXWXWXXXXXXXXXXXXXXXXXXXXXXXX.', 'XXXXXXXXXXXXXXXXXXXXXXXXXXX...',
    '.WXWXWXXXXXXXXXXXXXXXXXXXXXX..', '......XXXXXXXXXXXXXXXXXXXXXXX.',
    '..........XXX.......XXX....XX.', '...........XX........XX.......',
  ],
  // Spinosaurus swimming at the surface with its sail out of the water
  spinosaurus: [
    '............SS..............', '..........SSSSSS............', '.........SSSSSSSSS..........',
    '........SSSSSSSSSSS.........', '........SSSSSSSSSSSS........', '........SSSSSSSSSSSSS.......',
    '.......XXXXXXXXXXXXXXX......', '...XXXRXXXXXXXXXXXXXXXXXX...', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    'WXWXXXXXXXXXXXXXXXXXXXXXXXX.', '......XXXXXXXXXXXXXXXXXX....', '........XX....XXX....XX.....',
    '.........XX....XX.....XX....',
  ],

  // Water prey, facing left
  fish: ['..XXX..X', '.XXXXXXX', 'XEXXXXX.', '.XXXXXXX', '..XXX..X'],
  plesio: [
    'XX............', 'XEX...........', '.XX...........', '..XX..XXXXX...',
    '...XXXXXXXXXX.', '....XXXXXXXXXX', '....XX..XXX...', '...XX....XX...',
  ],

  // HUD fullness icon: a drumstick with the bone sticking out
  meat: ['....XXXX..', '...XXXXXX.', '..XXXXXXXX', '..XXXXXXXX', '..XXXXXXX.', '..BXXXXX..', '.BB.......', 'BBB.......', '.B........'],
};

function spriteSize(name, pixel = PIXEL) {
  const rows = SPRITES[name];
  return { w: rows[0].length * pixel, h: rows.length * pixel };
}

function drawSprite(ctx, name, x, y, bodyColor, pixel = PIXEL) {
  const rows = SPRITES[name];
  const ox = Math.round(x);
  const oy = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '.') continue;
      ctx.fillStyle = PALETTE[ch] || bodyColor;
      ctx.fillRect(ox + c * pixel, oy + r * pixel, pixel, pixel);
    }
  }
}
