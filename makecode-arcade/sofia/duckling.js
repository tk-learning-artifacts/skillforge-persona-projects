// Duckling Round-Up on this page. Each rule matches a block in the MakeCode code on this page.
// Add ?starter to the address to play the starter project, with its 3 gaps.
(function () {
  'use strict';
  var STARTER = new URLSearchParams(location.search).has('starter');
  var $ = function (id) { return document.getElementById(id); };
  var e = new ArcadeLite.Engine({ canvas: $('screen'), data: DUCKS, sky: '#78dc52' });
  e.bindPad($('pad'));

  var SOUND = {
    found: [[988, 0.06], [1319, 0.12]],
    crash: [[160, 0.08, 'sawtooth'], [110, 0.12, 'sawtooth']],
    gate: [[523, 0.07], [659, 0.07], [784, 0.07], [1047, 0.14]],
    win: [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.2]],
    lose: [[392, 0.12], [330, 0.12], [262, 0.2]]
  };

  var level = 0, score = 0, life = 3, left = 0, timeLeft = 0, mama = null, state = 'title';

  function hud() {
    $('hud-life').textContent = 'Lives ' + life;
    $('hud-score').textContent = 'Found ' + score;
    $('hud-time').textContent = Math.ceil(Math.max(timeLeft, 0)) + ' s';
    $('hud-left').textContent = left + ' to find';
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
  function closeDialog() { $('dlg').hidden = true; e.paused = false; $('screen').focus({ preventScroll: true }); }

  // let mama = sprites.create(...); controller.moveSprite(mama, 60, 60)
  function newGame() {
    e.sprites = [];
    score = 0; life = 3;
    mama = e.create('DUCK', 'Player');
    startLevel(0);
  }

  function startLevel(n) {
    level = n;
    ['Food', 'Found', 'Enemy', 'Goal'].forEach(function (k) { e.destroyKind(k); });
    e.loadLevel(DUCKS.LEVELS[n]);
    e.placeOnTile(mama, e.tilesOfType('NEST')[0]);
    left = 0;
    e.tilesOfType('DUCKSPOT').forEach(function (spot) {
      var d = e.create('DUCKLING', 'Food');
      e.placeOnTile(d, spot);
      e.setTile(spot, 'GRASS');
      left += 1;
    });
    e.tilesOfType('MOWERSPOT').forEach(function (spot) {
      var m = e.create('MOWER', 'Enemy');
      e.placeOnTile(m, spot);
      e.setTile(spot, 'GRASS');
      m.vx = 30 + 15 * n;
      m.bounce = true;
    });
    e.tilesOfType('MOWERSPOTV').forEach(function (spot) {
      var m = e.create('MOWER', 'Enemy');
      e.placeOnTile(m, spot);
      e.setTile(spot, 'GRASS');
      m.vy = 30 + 15 * n;
      m.bounce = true;
    });
    e.tilesOfType('PONDSPOT').forEach(function (spot) {
      var p = e.create('POND', 'Goal');
      e.placeOnTile(p, spot);
      e.setTile(spot, 'GRASS');
    });
    // game.splash, then info.startCountdown(60 + 30 * n)
    timeLeft = 60 + 30 * n;
    state = 'splash';
    hud();
    dialog('Park ' + (n + 1), 'Find ' + left + ' ducklings', 'Go');
  }

  function openGate() {
    e.tilesOfType('GATE').forEach(function (spot) { e.setWall(spot, false); e.setTile(spot, 'GRASS'); });
    e.say = { sprite: mama, text: 'Gate open!', until: 1.5 };
    e.play(SOUND.gate);
    say('Gate open. Head for the pond.');
  }

  function gameOver(win, why) {
    state = 'over';
    e.play(win ? SOUND.win : SOUND.lose);
    dialog(win ? 'You win' : 'Game over', (why ? why + ' ' : '') + 'Ducklings found: ' + score + '.' + (STARTER ? ' This is the starter, so some rules are missing.' : ''), 'Play again');
  }

  e.onPressA = function () { if (!$('dlg').hidden) goButton(); };

  e.onUpdate = function (dt) {
    if (!mama) return;
    var k = e.keys;
    mama.vx = (k.right ? 60 : 0) - (k.left ? 60 : 0);
    mama.vy = (k.down ? 60 : 0) - (k.up ? 60 : 0);

    timeLeft -= dt;
    if (timeLeft <= 0) { hud(); gameOver(false, 'Time is up.'); return; }

    e.ofKind('Food').forEach(function (d) {
      if (STARTER || !e.overlaps(mama, d)) return;
      // Found a duckling: it follows you home.
      d.kind = 'Found';
      d.ghost = true;
      d.follow = mama; d.followSpeed = 50;
      score += 1;
      left -= 1;
      e.play(SOUND.found);
      say('Found one. ' + left + ' to go.');
      if (left === 0) openGate();
    });
    var hit = !STARTER && e.ofKind('Enemy').some(function (m) { return e.overlaps(mama, m); });
    if (hit) {
      life -= 1;
      e.shake = 0.3;
      e.play(SOUND.crash);
      say('A mower. Back to the nest. Lives left: ' + Math.max(life, 0) + '.');
      if (life <= 0) { hud(); gameOver(false, 'Out of lives.'); return; }
      e.placeOnTile(mama, e.tilesOfType('NEST')[0]);
    }
    var pond = e.ofKind('Goal')[0];
    if (pond && e.overlaps(mama, pond)) {
      if (level === 0) startLevel(1); else gameOver(true, 'Every duckling is home.');
      return;
    }
    hud();
    e.follow(mama);
  };

  function goButton() {
    if (state === 'title' || state === 'over') { newGame(); return; }
    state = 'play';
    closeDialog();
  }
  $('dlg-go').addEventListener('click', goButton);
  $('sound').addEventListener('click', function () {
    e.muted = !e.muted;
    this.setAttribute('aria-pressed', String(!e.muted));
    this.textContent = e.muted ? 'Sound: off' : 'Sound: on';
  });
  $('pause').addEventListener('click', function () {
    if (state !== 'play') return;
    dialog('Paused', 'The clock stops while you rest.', 'Carry on');
    state = 'splash';
  });
  e.onHide = function () { if (state === 'play') { dialog('Paused', 'You switched tabs, so I paused the game.', 'Carry on'); state = 'splash'; } };

  // A test hook for the page checks.
  window.ducklings = { startLevel: function (n) { if (!mama) newGame(); startLevel(n); }, engine: e,
    get state() { return { level: level, score: score, life: life, left: left, time: Math.round(timeLeft), state: state, x: mama && Math.round(mama.x), y: mama && Math.round(mama.y) }; } };

  if (STARTER) { $('mode').textContent = 'Starter project: 3 gaps to fill'; }
  e.loadLevel(DUCKS.LEVELS[0]);
  e.follow({ x: 80, y: 60 });
  left = e.tilesOfType('DUCKSPOT').length;
  timeLeft = 60;
  hud();
  dialog(STARTER ? 'Duckling Round-Up: starter' : 'Duckling Round-Up', STARTER ? 'Ducklings ignore you, mowers miss you, and the gate never opens. Those are your 3 gaps.' : 'Find every duckling. The gate opens when they are all with you. Dodge the mowers and get home to the pond.', 'Start');
  e.run();
})();
