// Kopi Run on this page. Each rule matches a block in the MakeCode code below the game.
// Add ?starter to the address to play the starter project, with its 3 gaps.
(function () {
  'use strict';
  var STARTER = new URLSearchParams(location.search).has('starter');
  var $ = function (id) { return document.getElementById(id); };
  var e = new ArcadeLite.Engine({ canvas: $('screen'), data: KOPI, sky: '#87f2ff' });
  e.bindPad($('pad'));

  var SOUND = {
    jump: [[392, 0.05], [523, 0.05], [659, 0.06]],
    cup: [[988, 0.06], [1319, 0.12]],
    crash: [[160, 0.08, 'sawtooth'], [110, 0.12, 'sawtooth']],
    stomp: [[523, 0.05], [784, 0.08]],
    win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]]
  };

  var level = 0, score = 0, life = 3, bot = null, state = 'title', trail = [], showTrail = false;

  function hud() {
    $('hud-life').textContent = 'Lives ' + life;
    $('hud-score').textContent = 'Kopi ' + score;
    $('hud-level').textContent = 'Level ' + (level + 1);
  }
  function say(msg) { $('live').textContent = msg; }

  function dialog(title, text, button) {
    e.paused = true;
    $('dlg-title').textContent = title;
    $('dlg-text').textContent = text;
    $('dlg-go').textContent = button;
    $('dlg').hidden = false;
    $('dlg-go').focus({ preventScroll: true });
  }
  function closeDialog() {
    $('dlg').hidden = true;
    e.paused = false;
    $('screen').focus({ preventScroll: true });
  }

  // let bot = sprites.create(...); controller.moveSprite(bot, 80, 0); bot.ay = 350
  function newGame() {
    e.sprites = [];
    score = 0; life = 3;
    bot = e.create('BOT', 'Player');
    bot.ay = 350;
    startLevel(0);
  }

  function startLevel(n) {
    level = n;
    e.destroyKind('Food');
    e.destroyKind('Enemy');
    e.destroyKind('Goal');
    e.loadLevel(KOPI.LEVELS[n]);
    e.placeOnTile(bot, e.tilesOfType('DOOR')[0]);
    bot.vx = 0; bot.vy = 0;
    e.tilesOfType('CUPSPOT').forEach(function (spot) {
      var cup = e.create('CUP', 'Food');
      e.placeOnTile(cup, spot);
      e.setTile(spot, 'EMPTY');
    });
    e.tilesOfType('CROWSPOT').forEach(function (spot) {
      var crow = e.create('CROW', 'Enemy');
      e.placeOnTile(crow, spot);
      e.setTile(spot, 'EMPTY');
      crow.vx = 25 + 15 * n;
      crow.bounce = true;
    });
    e.tilesOfType('FLAGSPOT').forEach(function (spot) {
      var flag = e.create('FLAG', 'Goal');
      e.placeOnTile(flag, spot);
      e.setTile(spot, 'EMPTY');
    });
    trail = [];
    hud();
    state = 'splash';
    dialog('Level ' + (n + 1), n === 0 ? 'Grab the kopi. Jump the canal. Reach the flag.' : 'Faster crows. Wider gaps. Find the flag.', 'Go');
  }

  function backToDoor() {
    e.placeOnTile(bot, e.tilesOfType('DOOR')[0]);
    bot.vx = 0; bot.vy = 0;
    trail = [];
  }
  function loseLife(why) {
    life -= 1;
    e.shake = 0.3;
    e.play(SOUND.crash);
    say(why + ' Lives left: ' + Math.max(life, 0) + '.');
    hud();
    if (life <= 0) { gameOver(false); return; }
    backToDoor();
  }
  function gameOver(win) {
    state = 'over';
    if (win) e.play(SOUND.win);
    dialog(win ? 'You win' : 'Game over', 'Score: ' + score + (STARTER ? '. This is the starter, so some rules are missing.' : '.'), 'Play again');
  }

  e.onPressA = function () {
    if (!$('dlg').hidden) { goButton(); return; }
    if (e.paused || !bot) return;
    if (STARTER) {
      // GAP 1 in the starter: no ground check, so you can fly.
      bot.vy = -150;
      return;
    }
    if (bot.hit.bottom) {
      bot.vy = -150;
      e.play(SOUND.jump);
    }
  };

  e.onUpdate = function () {
    if (!bot) return;
    // controller.moveSprite(bot, 80, 0)
    bot.vx = (e.keys.right ? 80 : 0) - (e.keys.left ? 80 : 0);

    e.ofKind('Food').forEach(function (cup) {
      if (!STARTER && e.overlaps(bot, cup)) {
        cup.dead = true;
        score += 1;
        e.play(SOUND.cup);
        say('Kopi! Score ' + score + '.');
        hud();
      }
    });
    e.ofKind('Enemy').forEach(function (crow) {
      if (crow.dead || !e.overlaps(bot, crow)) return;
      if (!STARTER && bot.vy > 0 && bot.y + bot.h / 2 < crow.y) {
        crow.dead = true;
        bot.vy = -100;
        score += 3;
        e.play(SOUND.stomp);
        say('Crow scared off. Plus 3.');
        hud();
      } else {
        loseLife('A crow got you.');
      }
    });
    if (state === 'over') return;
    // game.onUpdate: is the tile under the bot's middle a canal tile?
    var col = Math.floor(bot.x / 16), row = Math.floor(bot.y / 16);
    if (e.map[row] && e.map[row][col] === 'WATER') { loseLife('Splash. Into the canal.'); return; }
    // The flag is a sprite of kind Goal.
    var goal = e.ofKind('Goal')[0];
    if (goal && !STARTER && e.overlaps(bot, goal)) {
      if (level === 0) startLevel(1); else gameOver(true);
      return;
    }
    if (showTrail) { trail.push([bot.x, bot.y + bot.h / 2]); if (trail.length > 90) trail.shift(); }
    e.follow(bot);
  };

  // Dots where the bot's feet were, one per frame. Close dots mean slow, far apart mean fast.
  e.afterDraw = function (g, cx, cy) {
    if (!showTrail) return;
    g.fillStyle = '#c3003e';
    trail.forEach(function (p, i) { if (i % 2 === 0) g.fillRect(Math.round(p[0] - cx), Math.round(p[1] - cy) - 1, 1, 1); });
  };

  function goButton() {
    if (state === 'title') { newGame(); return; }
    if (state === 'over') { newGame(); return; }
    state = 'play';
    closeDialog();
  }
  $('dlg-go').addEventListener('click', goButton);
  $('sound').addEventListener('click', function () {
    e.muted = !e.muted;
    this.setAttribute('aria-pressed', String(!e.muted));
    this.textContent = e.muted ? 'Sound: off' : 'Sound: on';
  });
  $('trail').addEventListener('change', function () { showTrail = this.checked; trail = []; });
  $('pause').addEventListener('click', function () {
    if (state !== 'play') return;
    dialog('Paused', 'Take a breath.', 'Carry on');
    state = 'splash';
  });
  e.onHide = function () { if (state === 'play') { dialog('Paused', 'You switched tabs, so I paused the game.', 'Carry on'); state = 'splash'; } };

  // A test hook for the page checks: jump straight to a level.
  window.kopiRun = { startLevel: function (n) { if (!bot) newGame(); startLevel(n); }, get state() { return { level: level, score: score, life: life, state: state, x: bot && bot.x, y: bot && bot.y }; }, engine: e };

  if (STARTER) { $('mode').textContent = 'Starter project: 3 gaps to fill'; document.body.classList.add('is-starter'); }
  e.loadLevel(KOPI.LEVELS[0]);
  e.follow({ x: 80, y: 80 });
  hud();
  dialog(STARTER ? 'Kopi Run: starter' : 'Kopi Run', STARTER ? 'Try it. You can fly, cups do nothing and the flag goes nowhere. Those are your 3 gaps.' : 'Arrow keys or the pad to move. A or Space to jump. Land on a crow to scare it off.', 'Start');
  e.run();
})();
