// On-screen text and buttons: fullness bar, score, pause/mute buttons, touch
// hints, floating "+50" texts, "!" warnings, and the title/pause/game-over screens.
// Drawn on the full-resolution canvas (in logical coordinates) so text stays sharp.

const FONT = '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const BAR_X = 88;
const BAR_W = 140;
const HINT_FRAMES = 360; // touch hints show for the first 6 seconds of a run

const Hud = {
  pauseButton(viewW) {
    return { x: viewW - 46, y: 6, w: 40, h: 34 };
  },

  muteButton(viewW) {
    return { x: viewW - 88, y: 6, w: 40, h: 34 };
  },

  // Pixel-art parts go on the low-res buffer with the rest of the world.
  drawPixels(buf, game) {
    const lift = game.player.eatFrames > 0 ? -2 : 0;
    drawSprite(buf, 'meat', 8, 6 + lift, '#D85A30');
  },

  draw(ctx, game, world, viewW) {
    const ink = world.color('ink');
    const subtle = world.color('subtle');

    // Fullness bar
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = ink;
    ctx.textAlign = 'left';
    ctx.fillText('배부름', 40, 27);
    ctx.fillStyle = mixColor('#d3d1c7', '#444441', world.night);
    ctx.fillRect(BAR_X, 16, BAR_W, 13);
    const low = game.fullness < 30;
    const blink = Math.floor(game.frame / 10) % 2;
    const justHit = game.player.invincible > INVINCIBLE_FRAMES - 20;
    ctx.fillStyle = justHit || (low && blink) ? '#E24B4A' : low ? '#A32D2D' : '#639922';
    ctx.fillRect(BAR_X, 16, (BAR_W * game.fullness) / 100, 13);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.strokeRect(BAR_X, 16, BAR_W, 13);

    // Status words next to the bar
    let x = BAR_X + BAR_W + 12;
    ctx.font = `bold 13px ${FONT}`;
    if (low) {
      if (Math.floor(game.frame / 15) % 2) {
        ctx.fillStyle = '#E24B4A';
        ctx.fillText('배고파!', x, 28);
      }
      x += 58;
    }
    if (game.player.invincible > 0) {
      ctx.fillStyle = '#7F77DD';
      ctx.fillText(`무적 ${(game.player.invincible / 60).toFixed(1)}초`, x, 28);
      x += 76;
    }
    if (game.combo > 1 && game.frame - game.lastEatFrame < COMBO_FRAMES) {
      ctx.fillStyle = '#D85A30';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText(`콤보 x${game.combo}`, x, 28);
    }

    // Scores
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = subtle;
    ctx.fillText('HI ' + pad5(game.best), viewW - 158, 28);
    ctx.fillStyle = ink;
    ctx.fillText(pad5(game.score), viewW - 96, 28);
    ctx.textAlign = 'left';

    this.drawButtons(ctx, ink, viewW);

    // Touch hints at the start of a run and right after diving into the sea
    const hintFrames = game.mode === 'water' ? game.modeFrames : game.runFrames;
    if (hintFrames < HINT_FRAMES && game.mode === 'water') {
      const fade = Math.min(1, (HINT_FRAMES - hintFrames) / 60);
      ctx.globalAlpha = 0.8 * fade;
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('누르고 있으면 위로 헤엄! 떼면 가라앉아요', viewW / 2, VIEW_H - 14);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    } else if (hintFrames < HINT_FRAMES) {
      const fade = Math.min(1, (HINT_FRAMES - hintFrames) / 60);
      ctx.globalAlpha = 0.07 * fade;
      ctx.fillStyle = ink;
      ctx.fillRect(0, GROUND_Y + 14, viewW / 2 - 1, VIEW_H - GROUND_Y - 14);
      ctx.fillRect(viewW / 2 + 1, GROUND_Y + 14, viewW / 2, VIEW_H - GROUND_Y - 14);
      ctx.globalAlpha = (game.player.isDucking ? 0.85 : 0.5) * fade;
      ctx.font = `12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('누르고 있기 = 숙이기', viewW / 4, VIEW_H - 12);
      ctx.globalAlpha = 0.5 * fade;
      ctx.fillText('탭 = 점프', (viewW * 3) / 4, VIEW_H - 12);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  },

  // "바다로 풍덩!" / "다시 땅으로!" when switching between land and sea
  drawBanner(ctx, banner, viewW) {
    const t = banner.life / BANNER_FRAMES;
    ctx.globalAlpha = Math.min(1, t * 3);
    ctx.textAlign = 'center';
    ctx.font = `bold 30px ${FONT}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ffffff';
    const y = 110 - (1 - t) * 10;
    ctx.strokeText(banner.text, viewW / 2, y);
    ctx.fillStyle = '#185FA5';
    ctx.fillText(banner.text, viewW / 2, y);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  },

  drawButtons(ctx, ink, viewW, withPause = true) {
    ctx.fillStyle = ink;
    if (withPause) {
      const p = this.pauseButton(viewW);
      ctx.fillRect(p.x + 14, p.y + 9, 4, 15);
      ctx.fillRect(p.x + 23, p.y + 9, 4, 15);
    }

    // Speaker, crossed out when muted
    const m = this.muteButton(viewW);
    const cx = m.x + 13;
    const cy = m.y + 17;
    ctx.beginPath();
    ctx.moveTo(cx - 6, cy - 4);
    ctx.lineTo(cx - 2, cy - 4);
    ctx.lineTo(cx + 4, cy - 9);
    ctx.lineTo(cx + 4, cy + 9);
    ctx.lineTo(cx - 2, cy + 4);
    ctx.lineTo(cx - 6, cy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (Sound.muted) {
      ctx.moveTo(cx + 8, cy - 5);
      ctx.lineTo(cx + 16, cy + 5);
      ctx.moveTo(cx + 16, cy - 5);
      ctx.lineTo(cx + 8, cy + 5);
    } else {
      ctx.arc(cx + 5, cy, 6, -0.9, 0.9);
      ctx.moveTo(cx + 9, cy - 9);
      ctx.arc(cx + 5, cy, 10, -0.9, 0.9);
    }
    ctx.stroke();
  },

  drawFloatingTexts(ctx, texts) {
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'left';
    for (const t of texts) {
      ctx.globalAlpha = Math.min(1, t.life / 30);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  },

  // Blinking "!" at the right edge while a big obstacle is still off-screen.
  drawWarnings(ctx, entities, frame, viewW) {
    if (Math.floor(frame / 6) % 2 === 0) return;
    for (const e of entities) {
      if (!e.type.big || e.used || e.x <= viewW - 30) continue;
      const wy = Math.max(48, Math.min(GROUND_Y - 14, e.y + e.h / 2));
      ctx.fillStyle = '#E24B4A';
      ctx.beginPath();
      ctx.moveTo(viewW - 20, wy - 14);
      ctx.lineTo(viewW - 6, wy + 10);
      ctx.lineTo(viewW - 34, wy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', viewW - 20, wy + 8);
      ctx.textAlign = 'left';
    }
  },

  dim(ctx, world, viewW) {
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = world.color('sky');
    ctx.fillRect(0, 0, viewW, VIEW_H);
    ctx.globalAlpha = 1;
  },

  drawTitle(ctx, game, world, viewW) {
    const ink = world.color('ink');
    const cx = viewW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.font = `bold 40px ${FONT}`;
    ctx.fillText('디노 러너', cx, 92);
    ctx.font = `15px ${FONT}`;
    ctx.fillText('장애물은 피하고, 초식 공룡은 냠냠!', cx, 124);
    ctx.fillStyle = world.color('subtle');
    ctx.font = `13px ${FONT}`;
    ctx.fillText('오른쪽 탭 = 점프   ·   왼쪽 누르고 있기 = 숙이기', cx, 150);
    if (game.best > 0) ctx.fillText('최고 점수 ' + game.best, cx, 172);
    if (Math.floor(game.frame / 30) % 2 === 0) {
      ctx.fillStyle = ink;
      ctx.font = `bold 18px ${FONT}`;
      ctx.fillText('화면을 탭해서 시작!', cx, 212);
    }
    ctx.textAlign = 'left';
    this.drawButtons(ctx, ink, viewW, false);
  },

  drawPaused(ctx, world, viewW) {
    this.dim(ctx, world, viewW);
    ctx.fillStyle = world.color('ink');
    ctx.textAlign = 'center';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText('잠깐 멈춤', viewW / 2, VIEW_H / 2 - 6);
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = world.color('subtle');
    ctx.fillText('화면을 탭하면 계속해요', viewW / 2, VIEW_H / 2 + 22);
    ctx.textAlign = 'left';
  },

  drawGameOver(ctx, game, world, viewW) {
    this.dim(ctx, world, viewW);
    const ink = world.color('ink');
    const cx = viewW / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = ink;
    ctx.font = `bold 30px ${FONT}`;
    ctx.fillText('게임 끝!', cx, VIEW_H / 2 - 30);
    ctx.font = `15px ${FONT}`;
    ctx.fillText(game.overCause === 'hit' ? '부딪혀서 배가 텅 비었어요' : '배고파서 쓰러졌어요', cx, VIEW_H / 2 - 2);
    ctx.font = `bold 18px ${FONT}`;
    ctx.fillText('점수 ' + game.score, cx, VIEW_H / 2 + 26);
    if (game.newBest) {
      ctx.fillStyle = '#D85A30';
      ctx.font = `bold 14px ${FONT}`;
      ctx.fillText('새 최고 기록!', cx, VIEW_H / 2 + 48);
    }
    if (game.overFrames > GAME_OVER_TAP_DELAY && Math.floor(game.frame / 30) % 2 === 0) {
      ctx.fillStyle = world.color('subtle');
      ctx.font = `14px ${FONT}`;
      ctx.fillText('화면을 탭해서 다시 하기', cx, VIEW_H / 2 + 74);
    }
    ctx.textAlign = 'left';
  },
};

function pad5(n) {
  return String(Math.floor(n)).padStart(5, '0');
}
