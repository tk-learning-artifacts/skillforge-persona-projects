// Blue Bin Catch, browser version. It follows the Scratch scripts in blue-bin-catch.sb3:
// 30 frames a second, items fall 4 steps a frame, a new item every 0.5 to 1.2 seconds,
// and the game ends when "time left" reaches 0.
(function () {
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var live = document.getElementById('live');
  var startBtn = document.getElementById('start');
  var soundBtn = document.getElementById('sound');
  var W = 480, H = 360;

  var ITEMS = [
    { name: 'paper', file: 'paper', good: true, w: 56, h: 44, why: 'Clean paper goes in the blue bin.' },
    { name: 'can', file: 'can', good: true, w: 36, h: 54, why: 'Metal cans go in the blue bin.' },
    { name: 'bottle', file: 'bottle', good: true, w: 32, h: 62, why: 'Plastic bottles go in the blue bin.' },
    { name: 'glass jar', file: 'jar', good: true, w: 44, h: 52, why: 'Glass goes in the blue bin.' },
    { name: 'tissue', file: 'tissue', good: false, w: 48, h: 42, why: 'Tissue cannot be recycled, clean or dirty.' },
    { name: 'foam box', file: 'foam', good: false, w: 58, h: 42, why: 'Styrofoam does not go in the blue bin.' },
    { name: 'oily pizza box', file: 'pizza', good: false, w: 60, h: 44, why: 'Food-stained boxes go in the general bin.' }
  ];
  var IMG = {};
  ['title', 'play', 'end', 'bin', 'start'].concat(ITEMS.map(function (i) { return i.file; })).forEach(function (n) {
    var im = new Image(); im.src = 'assets/' + n + '.svg'; IMG[n] = im;
  });

  var state = 'title', backdrop = 'title';
  var score = 0, timeLeft = 30, frame = 0, nextSpawn = 0, secondTick = 0;
  var binX = 0, items = [], bubble = null, startShownAt = 0, startVisible = true;
  var keys = {}, soundOn = true, audio = null, paused = false;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }

  // Sounds made in the browser, close to the two .wav files in the project.
  function beep(kind) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      if (kind === 'pop') { o.type = 'sine'; o.frequency.setValueAtTime(500, t); o.frequency.linearRampToValueAtTime(1200, t + 0.16); }
      else { o.type = 'square'; o.frequency.setValueAtTime(140, t); }
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(kind === 'pop' ? 0.25 : 0.12, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'pop' ? 0.18 : 0.3));
      o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.32);
    } catch (e) { /* no sound is fine */ }
  }
  function say(text) { live.textContent = text; }

  function startGame() {
    if (state === 'play') return;
    state = 'play'; backdrop = 'play'; startVisible = false;
    score = 0; timeLeft = 30; items = []; bubble = null; frame = 0; secondTick = 0;
    nextSpawn = 0;
    say('Go. Catch paper, plastic, glass and metal.');
    canvas.focus();
  }
  function gameOver() {
    state = 'end'; backdrop = 'end'; items = [];
    bubble = { text: 'You scored ' + score, until: frame + 90 };
    startShownAt = frame + 90;
    say("Time's up. You scored " + score + '.');
  }

  function step() {
    frame++;
    if (keys.ArrowLeft) binX -= 9;
    if (keys.ArrowRight) binX += 9;
    binX = Math.max(-240, Math.min(240, binX));
    if (state === 'end' && !startVisible && frame >= startShownAt) startVisible = true;
    if (bubble && frame > bubble.until) bubble = null;
    if (state !== 'play') return;
    // Stage: wait 1 second, change time left by -1.
    if (++secondTick >= 30) { secondTick = 0; timeLeft--; if (timeLeft <= 0) { timeLeft = 0; gameOver(); return; } }
    // Item: create clone of myself, wait pick random 0.5 to 1.2 seconds.
    if (frame >= nextSpawn) {
      var kind = ITEMS[randInt(0, 6)];
      items.push({ kind: kind, x: randInt(-210, 210), y: 170 });
      nextSpawn = frame + Math.round(rand(0.5, 1.2) * 30);
    }
    // Each clone: change y by -4, then check if touching Bin.
    for (var i = items.length - 1; i >= 0; i--) {
      var it = items[i];
      it.y -= 4;
      if (touchingBin(it)) {
        if (it.kind.good) { score++; beep('pop'); say('Caught the ' + it.kind.name + '. ' + it.kind.why + ' Score ' + score + '.'); }
        else { score--; beep('buzz'); say('Oops, ' + it.kind.name + '. ' + it.kind.why + ' Score ' + score + '.'); }
        items.splice(i, 1);
      } else if (it.y < -170) items.splice(i, 1);
    }
  }
  // Scratch checks touching pixel by pixel. Here a box a little smaller than each picture does the job.
  function touchingBin(it) {
    var bw = 80, bh = 70, bx = binX, by = -125;
    var iw = it.kind.w * 0.75, ih = it.kind.h * 0.75;
    return Math.abs(it.x - bx) < (bw + iw) / 2 && Math.abs(it.y - by) < (bh + ih) / 2;
  }

  function sx(x) { return W / 2 + x; }
  function sy(y) { return H / 2 - y; }
  function drawImg(name, x, y, w, h) {
    var im = IMG[name];
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, sx(x) - w / 2, sy(y) - h / 2, w, h);
  }
  function monitor(label, value, y) {
    ctx.font = '600 12px system-ui, sans-serif';
    var lw = ctx.measureText(label).width, vw = Math.max(26, ctx.measureText(String(value)).width + 12);
    ctx.fillStyle = 'rgba(230,240,255,0.95)'; ctx.strokeStyle = '#c6d0dc';
    roundRect(5, y, lw + vw + 18, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#575e75'; ctx.fillText(label, 11, y + 15);
    ctx.fillStyle = '#ff8c1a'; roundRect(11 + lw + 6, y + 3, vw, 16, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(String(value), 11 + lw + 6 + vw / 2, y + 15); ctx.textAlign = 'left';
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawImg(backdrop, 0, 0, W, H);
    items.forEach(function (it) { drawImg(it.kind.file, it.x, it.y, it.kind.w, it.kind.h); });
    drawImg('bin', binX, -125, 96, 88);
    if (startVisible) drawImg('start', 0, -40, 150, 56);
    if (bubble) {
      ctx.font = '600 16px system-ui, sans-serif';
      var tw = ctx.measureText(bubble.text).width + 24, bx = Math.max(4, Math.min(W - tw - 4, sx(binX) + 20)), by = sy(-125) - 96;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8a94a6'; ctx.lineWidth = 2;
      roundRect(bx, by, tw, 34, 14); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#15211f'; ctx.fillText(bubble.text, bx + 12, by + 23); ctx.lineWidth = 1;
    }
    monitor('score', score, 5);
    monitor('time left', timeLeft, 32);
  }

  var last = 0, acc = 0;
  function loop(t) {
    if (!paused) {
      acc += Math.min(200, t - (last || t));
      while (acc >= 1000 / 30) { step(); acc -= 1000 / 30; }
      draw();
    }
    last = t;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function pointerToX(e) {
    var r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W - W / 2;
  }
  function pointerToY(e) {
    var r = canvas.getBoundingClientRect();
    return H / 2 - ((e.clientY - r.top) / r.height) * H;
  }
  canvas.addEventListener('pointermove', function (e) { binX = Math.max(-240, Math.min(240, pointerToX(e))); });
  canvas.addEventListener('pointerdown', function (e) {
    var x = pointerToX(e), y = pointerToY(e);
    binX = Math.max(-240, Math.min(240, x));
    if (startVisible && Math.abs(x) < 75 && Math.abs(y + 40) < 28) startGame();
  });
  canvas.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); }
    if ((e.key === ' ' || e.key === 'Enter') && startVisible) { startGame(); e.preventDefault(); }
  });
  canvas.addEventListener('keyup', function (e) { keys[e.key] = false; });
  canvas.addEventListener('blur', function () { keys = {}; });
  startBtn.addEventListener('click', function () {
    if (state === 'play') return;
    if (!startVisible) { startVisible = true; }
    startGame();
  });
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = 'Sound: ' + (soundOn ? 'on' : 'off');
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  });
  document.addEventListener('visibilitychange', function () { paused = document.hidden; });
})();
