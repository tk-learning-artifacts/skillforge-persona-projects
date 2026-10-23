// Prime Smash: numbers fall, and you split each one into primes before it lands.
// Three versions match the playtest rounds: ?v=1, ?v=2 and the final ?v=3 (default).
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  var VERSION = ({ '1': 1, '2': 2 })[params.get('v')] || 3;

  // What changed between versions, so the code reads like the playtest notes.
  var RULES = {
    1: { primes: [2, 3, 5, 7], wrongCosts: false, juice: false, trail: false, pause: false, speed: false, fall: 46, spawnEvery: 2.6, maxBlocks: 4,
         ramp: false, outline: false, summary: false, pool: function () { return pick(2, 4, 120, [2, 3, 5, 7]); } },
    2: { primes: [2, 3, 5, 7, 11], wrongCosts: true, juice: true, trail: false, pause: false, speed: false, fall: 22, spawnEvery: 4.5, maxBlocks: 3,
         ramp: false, outline: false, summary: false, pool: function () { return pick(3, 5, 240, [2, 3, 5, 7, 11]); } },
    3: { primes: [2, 3, 5, 7, 11], wrongCosts: true, juice: true, trail: true, pause: true, speed: true, fall: 14, spawnEvery: 6, maxBlocks: 3,
         ramp: true, outline: true, summary: true, pool: null }
  };
  var R = RULES[VERSION];

  // Final version: numbers grow with the level, so a new player starts small.
  function poolV3(level) {
    if (level === 1) return pick(2, 2, 30, [2, 3, 5]);
    if (level === 2) return Math.random() < 0.2 ? onePrime([5, 7, 11]) : pick(2, 3, 60, [2, 3, 5, 7]);
    if (level === 3) return Math.random() < 0.15 ? onePrime([7, 11]) : pick(3, 4, 120, [2, 3, 5, 7, 11]);
    return pick(3, 5, 240, [2, 3, 5, 7, 11]);
  }
  function onePrime(list) { return list[Math.floor(Math.random() * list.length)]; }
  // Multiply between min and max random primes, staying at or under the cap.
  function pick(min, max, cap, primes) {
    for (var tries = 0; tries < 50; tries++) {
      var k = min + Math.floor(Math.random() * (max - min + 1));
      var n = 1;
      for (var i = 0; i < k; i++) n *= primes[Math.floor(Math.random() * primes.length)];
      if (n <= cap && n > 3) return n;
    }
    return 12;
  }

  // Page elements
  var canvas = document.getElementById('screen');
  var ctx = canvas.getContext('2d');
  var pad = document.getElementById('pad');
  var live = document.getElementById('live');
  var scoreEl = document.getElementById('score');
  var heartsEl = document.getElementById('hearts');
  var levelEl = document.getElementById('level');
  var overlay = document.getElementById('overlay');
  var overTitle = document.getElementById('over-title');
  var overText = document.getElementById('over-text');
  var overList = document.getElementById('over-list');
  var startBtn = document.getElementById('start');
  var pauseBtn = document.getElementById('pause');
  var soundBtn = document.getElementById('sound');
  var speedSel = document.getElementById('speed');

  var W = 360, H = 420, FLOOR = H - 8;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Mark the current version link.
  document.querySelectorAll('[data-version]').forEach(function (a) {
    if (Number(a.getAttribute('data-version')) === VERSION) a.setAttribute('aria-current', 'true');
  });
  var verEl = document.getElementById('version-name');
  if (verEl) verEl.textContent = 'Version ' + VERSION + (VERSION === 3 ? ' (final)' : ' (playtest round ' + VERSION + ')');

  // Buttons for each prime, with a key hint.
  var KEYS = { 2: '2', 3: '3', 5: '5', 7: '7', 11: '1' };
  pad.style.gridTemplateColumns = 'repeat(' + R.primes.length + ', 1fr)';
  R.primes.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Split by ' + p);
    b.appendChild(document.createTextNode(String(p)));
    var s = document.createElement('small');
    s.textContent = 'key ' + KEYS[p];
    b.appendChild(s);
    b.addEventListener('click', function () { shoot(p); });
    pad.appendChild(b);
  });

  // Sizing for sharp drawing on any screen.
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();

  function colours() {
    var cs = getComputedStyle(document.documentElement);
    var g = function (n) { return cs.getPropertyValue(n).trim(); };
    return { screen: g('--screen'), ink: g('--screen-ink'), block: g('--block'), blockInk: g('--block-ink'),
             amber: '#f2c27a', red: '#f0a59b', accent: '#6fd3c9' };
  }
  var C = colours();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { C = colours(); });

  // Sound: short tones made in the browser, no files.
  var audio = null, soundOn = true;
  function tone(freq, dur, type) {
    if (!soundOn) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), gn = audio.createGain();
      o.type = type || 'square'; o.frequency.value = freq;
      gn.gain.setValueAtTime(0.08, audio.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
      o.connect(gn); gn.connect(audio.destination);
      o.start(); o.stop(audio.currentTime + dur);
    } catch (e) { soundOn = false; }
  }
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? 'Sound: on' : 'Sound: off';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  });

  // Game state
  var S;
  function reset() {
    S = { blocks: [], parts: [], score: 0, hearts: 3, level: 1, cleared: 0, t: 0, spawnT: 0,
          target: null, shake: 0, running: false, paused: false, over: false, done: [], misses: [], flash: null };
    hud();
  }
  function hud() {
    scoreEl.textContent = 'Score ' + S.score;
    heartsEl.textContent = 'Hearts ' + S.hearts + ' of 3';
    levelEl.textContent = 'Level ' + S.level;
  }
  function say(msg) { live.textContent = msg; }

  function spawn() {
    var n = R.pool ? R.pool() : poolV3(S.level);
    var w = Math.max(64, 22 + String(n).length * 18);
    var lanes = [0, 1, 2].filter(function (l) {
      return !S.blocks.some(function (b) { return b.lane === l && b.y < 120; });
    });
    if (!lanes.length) return;
    var lane = lanes[Math.floor(Math.random() * lanes.length)];
    var x = 20 + lane * 110 + (100 - w) / 2;
    S.blocks.push({ n: n, orig: n, factors: [], x: x, y: -50, w: w, h: 46, lane: lane, squash: 0 });
    if (!S.target) retarget();
  }
  function retarget() {
    var low = null;
    S.blocks.forEach(function (b) { if (!low || b.y > low.y) low = b; });
    S.target = low;
  }

  function fallSpeed() {
    var mult = R.speed ? (Number(speedSel.value) || 1) : 1;
    var base = R.fall + (R.ramp ? (S.level - 1) * 3 : 0);
    return base * mult;
  }

  // The core loop: choose a prime for the target block.
  function shoot(p) {
    if (!S.running || S.paused || S.over) return;
    var b = S.target;
    if (!b) { say('No block to split yet.'); return; }
    if (b.n % p === 0) {
      b.n = b.n / p;
      b.factors.push(p);
      if (R.juice) b.squash = 1;
      burst(b.x + b.w / 2, b.y + b.h / 2, 6, C.accent);
      tone(330 + p * 40, 0.08);
      if (b.n === 1) {
        var pts = 10 * b.factors.length;
        S.score += pts; S.cleared++;
        S.done.push(b.orig + ' = ' + written(b.factors));
        burst(b.x + b.w / 2, b.y + b.h / 2, 18, C.amber);
        tone(880, 0.15, 'triangle');
        S.blocks.splice(S.blocks.indexOf(b), 1);
        S.target = null; retarget();
        say(b.orig + ' = ' + written(b.factors) + '. Plus ' + pts + ' points.');
        if (R.ramp && S.cleared % 5 === 0 && S.level < 4) { S.level++; say('Level ' + S.level + '. Numbers get bigger.'); }
      } else {
        say(b.orig + ' split by ' + p + '. ' + b.n + ' left.');
      }
    } else if (R.wrongCosts) {
      S.hearts--;
      S.misses.push(b.n + ' ÷ ' + p + ' is not a whole number');
      S.flash = { text: b.n + ' ÷ ' + p + ' ✗', t: 1.2 };
      if (!reduceMotion.matches) S.shake = 0.3;
      tone(110, 0.25, 'sawtooth');
      say(p + ' does not go into ' + b.n + '. You lose a heart.');
      if (S.hearts <= 0) end();
    } else {
      tone(160, 0.05);
    }
    hud();
  }

  // Index form, like 2² × 3 × 7.
  var SUP = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷' };
  function written(factors) {
    var counts = {};
    factors.forEach(function (f) { counts[f] = (counts[f] || 0) + 1; });
    return Object.keys(counts).map(Number).sort(function (a, c) { return a - c; }).map(function (f) {
      return counts[f] > 1 ? f + (SUP[counts[f]] || '^' + counts[f]) : String(f);
    }).join(' × ');
  }

  function burst(x, y, k, col) {
    if (!R.juice || reduceMotion.matches) return;
    for (var i = 0; i < k; i++) {
      var a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
      S.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, life: 0.5 + Math.random() * 0.3, col: col });
    }
  }

  function step(dt) {
    S.t += dt;
    S.spawnT -= dt;
    var every = R.spawnEvery - (R.ramp ? (S.level - 1) * 0.7 : 0);
    if (S.spawnT <= 0 && S.blocks.length < R.maxBlocks) { spawn(); S.spawnT = every; }
    var v = fallSpeed();
    for (var i = S.blocks.length - 1; i >= 0; i--) {
      var b = S.blocks[i];
      b.y += v * dt;
      b.squash = Math.max(0, b.squash - dt * 5);
      if (b.y + b.h >= FLOOR) {
        S.blocks.splice(i, 1);
        S.hearts--;
        S.misses.push(b.orig + ' reached the ground with ' + b.n + ' still unsplit');
        if (R.juice && !reduceMotion.matches) S.shake = 0.35;
        tone(90, 0.3, 'sawtooth');
        say(b.orig + ' hit the ground. You lose a heart.');
        if (S.target === b) { S.target = null; retarget(); }
        hud();
        if (S.hearts <= 0) { end(); return; }
      }
    }
    for (var j = S.parts.length - 1; j >= 0; j--) {
      var q = S.parts[j];
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 160 * dt; q.life -= dt;
      if (q.life <= 0) S.parts.splice(j, 1);
    }
    if (S.shake > 0) S.shake -= dt;
    if (S.flash) { S.flash.t -= dt; if (S.flash.t <= 0) S.flash = null; }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function draw() {
    ctx.save();
    ctx.fillStyle = C.screen; ctx.fillRect(0, 0, W, H);
    if (S.shake > 0) ctx.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    // Ground line
    ctx.fillStyle = C.red; ctx.fillRect(0, FLOOR, W, 3);
    // Sparks go behind the blocks, so they never hide a number.
    S.parts.forEach(function (q) {
      ctx.globalAlpha = Math.max(0, q.life * 1.6);
      ctx.fillStyle = q.col; ctx.fillRect(q.x - 2.5, q.y - 2.5, 5, 5);
    });
    ctx.globalAlpha = 1;
    S.blocks.forEach(function (b) {
      var isT = b === S.target;
      var sq = b.squash * 0.15;
      var w = b.w * (1 + sq), h = b.h * (1 - sq), x = b.x - (w - b.w) / 2, y = b.y + (b.h - h);
      // Version 1 and 2 marked the target by colour only. Version 3 adds a thick outline and an arrow.
      ctx.fillStyle = isT && !R.outline ? '#e07a6c' : C.block;
      roundRect(x, y, w, h, 10); ctx.fill();
      if (isT && R.outline) {
        ctx.lineWidth = 4; ctx.strokeStyle = C.amber; roundRect(x - 4, y - 4, w + 8, h + 8, 13); ctx.stroke();
        ctx.fillStyle = C.amber;
        ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y - 20); ctx.lineTo(x + w / 2 + 9, y - 20); ctx.lineTo(x + w / 2, y - 9); ctx.closePath(); ctx.fill();
      }
      ctx.fillStyle = C.blockInk;
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(b.n), x + w / 2, y + h / 2 + 1);
      if (R.trail && b.factors.length) {
        ctx.fillStyle = C.ink; ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(b.orig + ' = ' + b.factors.join('×') + '×…', x + w / 2, y + h + 13);
      }
    });
    if (S.flash) {
      ctx.fillStyle = C.red; ctx.font = '700 22px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(S.flash.text, W / 2, 30);
    }
    ctx.restore();
  }

  var last = 0;
  function frame(ts) {
    if (!S.running || S.over) return;
    var dt = Math.min(0.05, (ts - (last || ts)) / 1000);
    last = ts;
    if (!S.paused) step(dt);
    draw();
    if (S.running && !S.over) requestAnimationFrame(frame);
  }

  function start() {
    reset();
    S.running = true; S.spawnT = 0.3;
    overlay.hidden = true;
    pauseBtn.disabled = false; pauseBtn.textContent = 'Pause';
    say('Game on. Split the block with the marker.');
    last = 0;
    requestAnimationFrame(frame);
    canvas.focus();
  }

  function end() {
    S.over = true; S.running = false;
    pauseBtn.disabled = true;
    draw();
    overTitle.textContent = 'Game over';
    overText.textContent = 'Score ' + S.score + '. You split ' + S.cleared + (S.cleared === 1 ? ' number.' : ' numbers.');
    while (overList.firstChild) overList.removeChild(overList.firstChild);
    // Only the final version shows what you split. Round 2 players could not recall a single one.
    if (R.summary) {
      S.done.slice(-6).forEach(function (d) { var li = document.createElement('li'); li.textContent = d; overList.appendChild(li); });
      S.misses.slice(-3).forEach(function (d) { var li = document.createElement('li'); li.textContent = 'Missed: ' + d; overList.appendChild(li); });
    }
    overList.hidden = !R.summary || !overList.children.length;
    startBtn.textContent = 'Play again';
    overlay.hidden = false;
    say('Game over. Score ' + S.score + '.');
    startBtn.focus();
  }

  // Tap a block to target it.
  canvas.addEventListener('pointerdown', function (e) {
    if (!S.running) return;
    var r = canvas.getBoundingClientRect();
    var x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    S.blocks.forEach(function (b) {
      if (x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 8 && y <= b.y + b.h + 8) { S.target = b; say('Target ' + b.n + '.'); }
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.target && (e.target.tagName === 'SELECT')) return;
    var map = { '2': 2, '3': 3, '5': 5, '7': 7, '1': 11 };
    if (map[e.key] && R.primes.indexOf(map[e.key]) >= 0 && S.running) { e.preventDefault(); shoot(map[e.key]); return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && S.running && S.blocks.length) {
      e.preventDefault();
      var sorted = S.blocks.slice().sort(function (a, c) { return a.x - c.x; });
      var i = sorted.indexOf(S.target);
      i = e.key === 'ArrowRight' ? (i + 1) % sorted.length : (i - 1 + sorted.length) % sorted.length;
      S.target = sorted[i]; say('Target ' + S.target.n + '.');
    }
    if ((e.key === 'p' || e.key === 'P') && S.running && R.pause) togglePause();
  });

  function togglePause() {
    if (!S.running) return;
    S.paused = !S.paused;
    pauseBtn.textContent = S.paused ? 'Resume' : 'Pause';
    say(S.paused ? 'Paused.' : 'Back in the game.');
  }
  pauseBtn.addEventListener('click', togglePause);
  startBtn.addEventListener('click', start);
  document.addEventListener('visibilitychange', function () { if (R.pause && document.hidden && S.running && !S.paused) togglePause(); });

  // Pause and speed arrived in version 3, after round 2.
  if (!R.pause) pauseBtn.hidden = true;
  if (!R.speed) { speedSel.hidden = true; document.querySelector('label[for="speed"]').hidden = true; }
  reset();
  draw();
  pauseBtn.disabled = true;

  // For screenshots and tests: ?demo=1 starts at once.
  if (params.get('demo') === '1') start();
  window.__primeSmash = { state: function () { return S; }, shoot: shoot, version: VERSION };
})();
