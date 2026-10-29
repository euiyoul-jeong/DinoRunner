// Game loop and state machine: title -> play <-> paused -> over -> play ...
// The world is drawn on a small pixel buffer (VIEW_H tall, width follows the
// screen's aspect ratio) and scaled up crisply; text is drawn at full resolution.

const STEP = 1 / 60; // fixed physics step, same on 60/90/120Hz screens
const START_SPEED = 4; // px per frame (240px/s)
const MAX_SPEED = 8;
const SPEED_RAMP_FRAMES = 2400; // +1 speed every 40 seconds, max after ~2m40s
const START_FULLNESS = 80;
const MAX_FULLNESS = 100;
const HIT_COST = 30;
const DRAIN_BASE = 0.035; // fullness lost per frame, plus a bit more at speed
const DRAIN_PER_SPEED = 0.003;
const SLOW_FRAMES = 45; // brief slowdown after a hit
const SLOW_AMOUNT = 0.4;
const COMBO_FRAMES = 180; // eat again within 3 seconds for a combo
const MAX_COMBO = 3;
const GAME_OVER_TAP_DELAY = 40; // ignore taps right after losing
const TITLE_SPEED = 2;
const LAND_LENGTH = 1000; // points on land before diving into the sea
const WATER_LENGTH = 600; // points in the sea before climbing back out
const MODE_SPAWN_DELAY = 90; // calm moment after each switch
const BANNER_FRAMES = 120;
const DIVE_AT_X = REX_X + 20; // dive when the beach edge reaches the T-rex
const SWITCH_FRAMES = 60; // length of the dive / climb animation
const SWITCH_HOP = 36; // height of the arc while diving or leaping out
const BEST_KEY = 'dinoRunner.best';
const MIN_VIEW_W = 480;
const MAX_VIEW_W = 760;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const buffer = document.createElement('canvas');
const buf = buffer.getContext('2d');
let viewW = 640;

const world = new World();
const player = new Player();
const spawner = new Spawner();

const game = {
  state: 'title', // 'title' | 'play' | 'paused' | 'over'
  mode: 'land', // 'land' | 'water'
  pendingMode: null, // switch waits until nothing is left ahead of the T-rex
  transition: null, // dive / climb animation in progress
  modeFrames: 0,
  nextSwitchAt: LAND_LENGTH,
  banner: null,
  frame: 0,
  runFrames: 0,
  speed: START_SPEED,
  dist: 0,
  bonus: 0,
  score: 0,
  best: loadBest(),
  newBest: false,
  fullness: START_FULLNESS,
  combo: 1,
  lastEatFrame: -999,
  slow: 0,
  shake: 0,
  entities: [],
  texts: [],
  overCause: '',
  overFrames: 0,
  player,
};

function loadBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  } catch (e) {
    return 0;
  }
}

function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch (e) {
    // Storage can be unavailable; the best score just won't persist.
  }
}

function resize() {
  const cw = window.innerWidth;
  const ch = window.innerHeight;
  viewW = Math.max(MIN_VIEW_W, Math.min(MAX_VIEW_W, Math.round((VIEW_H * cw) / ch)));
  const scale = Math.min(cw / viewW, ch / VIEW_H);
  const cssW = viewW * scale;
  const cssH = VIEW_H * scale;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  buffer.width = viewW;
  buffer.height = VIEW_H;
}

function toLogical(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * viewW,
    y: ((clientY - rect.top) / rect.height) * VIEW_H,
    viewW,
  };
}

function inside(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

// Taps on buttons and menu screens. Returns true when the tap was used here.
// x/y are null for a keyboard Space/Up press.
function handleTap(x, y) {
  Sound.unlock();
  const pointer = x !== null;
  if (pointer && game.state !== 'over' && inside(x, y, Hud.muteButton(viewW))) {
    Sound.toggleMute();
    return true;
  }
  switch (game.state) {
    case 'title':
      startRun();
      return true;
    case 'paused':
      resume();
      return true;
    case 'over':
      if (game.overFrames > GAME_OVER_TAP_DELAY) startRun();
      return true;
    case 'play':
      if (pointer && inside(x, y, Hud.pauseButton(viewW))) {
        pause();
        return true;
      }
      return false;
  }
  return false;
}

function startRun() {
  player.reset();
  spawner.reset();
  world.reset();
  input.clear();
  Object.assign(game, {
    state: 'play',
    mode: 'land',
    pendingMode: null,
    transition: null,
    modeFrames: MODE_SPAWN_DELAY,
    nextSwitchAt: LAND_LENGTH,
    banner: null,
    runFrames: 0,
    speed: START_SPEED,
    dist: 0,
    bonus: 0,
    score: 0,
    newBest: false,
    fullness: START_FULLNESS,
    combo: 1,
    lastEatFrame: -999,
    slow: 0,
    shake: 0,
    entities: [],
    texts: [],
    overCause: '',
    overFrames: 0,
  });
}

function goToTitle() {
  player.reset();
  world.reset();
  game.entities = [];
  game.state = 'title';
}

function pause() {
  if (game.state !== 'play') return;
  game.state = 'paused';
  input.clear();
}

function resume() {
  if (game.state !== 'paused') return;
  game.state = 'play';
}

function endRun(cause) {
  game.state = 'over';
  game.overCause = cause;
  game.overFrames = 0;
  player.invincible = 0; // don't freeze mid-blink
  if (game.score > game.best) {
    game.best = game.score;
    game.newBest = true;
    saveBest(game.best);
  }
  Sound.play('gameover');
}

function addText(text, x, y, color) {
  game.texts.push({ text, x, y, color, life: 40 });
}

function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

// The T-rex dives off the beach (or leaps up the sandbank) while the camera
// follows it underwater (or back up). Positions here are world coordinates.
function beginSwitch(to) {
  game.transition = {
    to,
    t: 0,
    fromCam: world.camY,
    toCam: to === 'water' ? CAM_WATER : 0,
    startY: player.y + world.camY,
    endY: to === 'water' ? SEA_SURFACE + 24 : GROUND_Y - REX_H,
    lastY: player.y + world.camY,
  };
  game.banner = { text: to === 'water' ? '바다로 풍덩!' : '다시 땅으로!', life: BANNER_FRAMES };
  player.startScripted();
}

function advanceSwitch() {
  const tr = game.transition;
  tr.t++;
  const p = Math.min(1, tr.t / SWITCH_FRAMES);
  world.camY = tr.fromCam + (tr.toCam - tr.fromCam) * easeInOut(p);
  const worldY = tr.startY + (tr.endY - tr.startY) * p - Math.sin(Math.PI * p) * SWITCH_HOP;

  // Splash when the T-rex crosses the water surface
  const bodyY = worldY + 20;
  if ((tr.lastY + 20 < SEA_SURFACE) !== (bodyY < SEA_SURFACE)) {
    world.splash(REX_X + 24);
    Sound.play('splash');
  }
  tr.lastY = worldY;
  player.mode = bodyY > SEA_SURFACE ? 'water' : 'land'; // pose only
  player.y = worldY - world.camY;

  if (p >= 1) {
    game.transition = null;
    game.mode = tr.to;
    game.modeFrames = 0;
    game.nextSwitchAt = game.score + (tr.to === 'water' ? WATER_LENGTH : LAND_LENGTH);
    world.camY = tr.toCam;
    player.endScripted(tr.to);
    spawner.reset();
  }
}

function updateMode() {
  game.modeFrames++;
  if (game.banner && --game.banner.life <= 0) game.banner = null;
  if (game.transition) {
    advanceSwitch();
    return;
  }
  if (!game.pendingMode && game.score >= game.nextSwitchAt) {
    game.pendingMode = game.mode === 'land' ? 'water' : 'land';
  }
  if (!game.pendingMode) return;
  if (!world.shore) {
    // Wait until nothing is left ahead, then bring in the shore
    if (!game.entities.some((e) => !e.used && e.x + e.w > REX_X)) world.startShore(game.pendingMode, viewW);
    return;
  }
  // Climbing out starts early enough that land is under the T-rex when it lands
  const climbAtX = REX_X - 10 - BEACH_W + SWITCH_FRAMES * game.speed;
  const triggerX = game.pendingMode === 'water' ? DIVE_AT_X : climbAtX;
  if (world.shore.x <= triggerX) {
    beginSwitch(game.pendingMode);
    game.pendingMode = null;
  }
}

function stepPlay() {
  game.runFrames++;
  const base = Math.min(MAX_SPEED, START_SPEED + game.runFrames / SPEED_RAMP_FRAMES);
  if (game.slow > 0) game.slow--;
  game.speed = base * (1 - (game.slow / SLOW_FRAMES) * SLOW_AMOUNT);

  if (input.consumeJump() && game.mode === 'land' && !game.transition) player.queueJump();
  if (player.update(input.jumpHeld, input.duckHeld)) Sound.play('jump');
  if (game.mode === 'water' && !game.transition && (input.jumpHeld || input.duckHeld) && game.frame % 6 === 0) {
    world.puff(REX_X + 2, player.y + 6);
  }

  game.dist += game.speed * 0.08;
  game.fullness -= DRAIN_BASE + game.speed * DRAIN_PER_SPEED;

  updateMode();
  if (!game.pendingMode && !game.transition && game.modeFrames > MODE_SPAWN_DELAY) {
    spawner.update(game.speed, game.score, game.fullness, viewW, game.entities, game.mode);
  }
  for (const e of game.entities) {
    e.update(game.speed, viewW);
    if (e.type.big && !e.warned) {
      e.warned = true;
      Sound.play('warn');
    }
  }

  let hitThisFrame = false;
  const box = player.hitbox();
  for (const e of game.entities) {
    if (e.used || !overlaps(box, e.hitbox())) continue;
    if (e.kind === 'obstacle') {
      if (player.invincible > 0) continue;
      e.used = true;
      hitThisFrame = true;
      game.fullness -= HIT_COST;
      player.hurt();
      game.slow = SLOW_FRAMES;
      game.shake = 10;
      addText(`배부름 -${HIT_COST}`, REX_X + 10, box.y - 6, '#E24B4A');
      Sound.play('hit');
      Native.vibrate('hit');
    } else {
      e.used = true;
      e.eaten = true;
      game.combo = game.runFrames - game.lastEatFrame < COMBO_FRAMES ? Math.min(MAX_COMBO, game.combo + 1) : 1;
      game.lastEatFrame = game.runFrames;
      const points = e.type.points * game.combo;
      game.bonus += points;
      game.fullness = Math.min(MAX_FULLNESS, game.fullness + e.type.food);
      player.eat();
      addText('+' + points, e.x, e.y - 6, '#D85A30');
      Sound.play('eat');
      Native.vibrate('eat');
    }
  }
  game.entities = game.entities.filter((e) => !e.eaten && e.x + e.w > -20);

  for (const t of game.texts) {
    t.y -= 1;
    t.life--;
  }
  game.texts = game.texts.filter((t) => t.life > 0);
  if (game.shake > 0) game.shake--;

  game.score = Math.floor(game.dist + game.bonus);
  world.update(game.speed, game.score, viewW);

  if (game.fullness <= 0) {
    game.fullness = 0;
    endRun(hitThisFrame ? 'hit' : 'hunger');
  }
}

function tick() {
  game.frame++;
  switch (game.state) {
    case 'play':
      stepPlay();
      break;
    case 'title':
      player.update(false, false);
      world.update(TITLE_SPEED, 0, viewW);
      break;
    case 'over':
      game.overFrames++;
      if (game.shake > 0) game.shake--;
      break;
  }
}

function render() {
  // Pixel layer
  buf.save();
  if (game.shake > 0) buf.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 4));
  world.draw(buf, viewW);
  if (game.state !== 'title') {
    for (const e of game.entities) e.draw(buf, world, game.frame, viewW);
  }
  player.draw(buf, game.state === 'over' ? '#A32D2D' : world.color('ink'));
  buf.restore();
  if (game.state !== 'title') Hud.drawPixels(buf, game);

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(buffer, 0, 0, canvas.width, canvas.height);

  // Text layer, in logical coordinates
  const k = canvas.height / VIEW_H;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  if (game.state === 'title') {
    Hud.drawTitle(ctx, game, world, viewW);
    return;
  }
  Hud.drawWarnings(ctx, game.entities, game.frame, viewW);
  Hud.drawFloatingTexts(ctx, game.texts);
  Hud.draw(ctx, game, world, viewW);
  if (game.banner) Hud.drawBanner(ctx, game.banner, viewW);
  if (game.state === 'paused') Hud.drawPaused(ctx, world, viewW);
  if (game.state === 'over') Hud.drawGameOver(ctx, game, world, viewW);
}

let lastTime = performance.now();
let accumulator = 0;

function loop(now) {
  accumulator += Math.min(0.25, (now - lastTime) / 1000);
  lastTime = now;
  while (accumulator >= STEP) {
    tick();
    accumulator -= STEP;
  }
  render();
  requestAnimationFrame(loop);
}

const input = new Input(canvas, toLogical, handleTap);

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' || e.code === 'Escape') {
    if (game.state === 'play') pause();
    else if (game.state === 'paused') resume();
  } else if (e.code === 'KeyM') {
    Sound.toggleMute();
  }
});

Native.init({
  // Back button: pause a run, leave a menu to the title, exit from the title.
  onBack() {
    if (game.state === 'play') pause();
    else if (game.state === 'paused' || game.state === 'over') goToTitle();
    else Native.exitApp();
  },
  onBackground() {
    pause();
    Sound.suspend();
  },
});

Sound.init();
resize();
window.addEventListener('resize', resize);
requestAnimationFrame(loop);
