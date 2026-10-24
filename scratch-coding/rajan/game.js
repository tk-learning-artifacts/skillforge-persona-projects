// Soft Landing, browser version. One step() is one Scratch frame, in the same order as the
// Lander's repeat until loop in soft-landing.sb3. Scratch runs about 30 frames a second.
(function () {
  var canvas = document.getElementById('stage');
  var ctx = canvas.getContext('2d');
  var live = document.getElementById('live');
  var traceBody = document.getElementById('trace');
  var W = 480, H = 360, FPS = 30;
  var GRAVITY = -0.05, THRUST = 0.15, FUEL = 80, SAFE = -2;

  var IMG = {};
  ['space', 'ground', 'pad', 'pad-lit', 'lander', 'wreck', 'puff'].forEach(function (n) {
    var im = new Image(); im.src = 'assets/' + n + '.svg'; IMG[n] = im;
  });

  var s = null, best = 0, running = false, slow = false, frameNo = 0;
  var keys = { up: false, left: false, right: false }, soundOn = true, audio = null;
  var trace = [];

  function rand(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
  // Scratch's variable monitor rounds numbers to 6 decimal places.
  function shown(v) { return typeof v === 'number' ? Number(v.toFixed(6)) : v; }

  function reset() {
    s = { x: rand(-180, 180), y: 150, vy: 0, fuel: FUEL, padX: rand(-170, 170), costume: 'lander', pad: 'pad', bubble: '', puffs: [], over: false };
    frameNo = 0; trace = []; renderTrace();
  }
  function greenFlag() {
    reset(); running = true;
    say('Flying. Hold the up arrow to fire the engine.');
    canvas.focus();
  }
  function stop() { running = false; keys.up = keys.left = keys.right = false; syncPads(); say('Stopped. Press the green flag to fly again.'); }

  function tone(kind) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      var t = audio.currentTime, g = audio.createGain();
      g.connect(audio.destination);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'chime' ? 0.6 : 0.45));
      var freqs = kind === 'chime' ? [660, 990] : [70, 95];
      freqs.forEach(function (f) { var o = audio.createOscillator(); o.type = kind === 'chime' ? 'sine' : 'sawtooth'; o.frequency.value = f; o.connect(g); o.start(t); o.stop(t + 0.6); });
    } catch (e) { /* no sound is fine */ }
  }
  function say(text) { live.textContent = text; }

  // Lander costume: feet 20 below the centre, 23 either side. Pad top is 4 above its centre.
  function touchingPad() { return Math.abs(s.x - s.padX) < 23 + 41 && s.y - 20 <= -114 + 4; }
  function touchingGround() { return s.y - 20 <= -120; }

  function step() {
    if (!running || s.over) return;
    frameNo++;
    var before = s.vy, burned = false;
    s.vy += GRAVITY;                                   // change speed y by gravity
    if (keys.up && s.fuel > 0) {                       // if key up pressed and fuel > 0
      s.vy += THRUST; s.fuel -= 1; burned = true;      //   change speed y by thrust, change fuel by -1
      s.puffs.push({ x: s.x, y: s.y - 26, ghost: 20, life: 8 }); // create clone of Puff
    }
    if (keys.left) s.x -= 2;
    if (keys.right) s.x += 2;
    s.y += s.vy;                                       // change y by speed y
    s.puffs.forEach(function (p) { p.y -= 2; p.ghost += 10; p.life--; });
    s.puffs = s.puffs.filter(function (p) { return p.life > 0; });
    trace.push({ f: frameNo, before: before, burned: burned, after: s.vy, y: s.y, fuel: s.fuel });
    if (trace.length > 6) trace.shift();
    renderTrace();
    if (touchingPad() || touchingGround()) land();     // repeat until touching Pad or Ground
  }
  function land() {
    s.over = true; running = false; keys.up = keys.left = keys.right = false; syncPads();
    if (touchingPad() && s.vy > SAFE) {
      s.pad = 'pad-lit'; tone('chime');
      s.bubble = 'Landed. Fuel left: ' + s.fuel;
      if (s.fuel > best) best = s.fuel;
      say('Landed at speed ' + bubbleNum(s.vy) + ', with ' + s.fuel + ' fuel left. Best: ' + best + '.');
    } else {
      s.costume = 'wreck'; tone('crash');
      s.bubble = 'Crashed at speed ' + Math.round(s.vy);
      say((touchingPad() ? 'Too fast. ' : 'Missed the pad. ') + 'Speed y was ' + bubbleNum(s.vy) + '. Safe is above ' + SAFE + '.');
    }
  }
  // Speech bubbles show non-whole numbers to 2 decimal places, as Scratch does.
  function bubbleNum(v) { return v % 1 !== 0 && Math.abs(v) >= 0.01 ? v.toFixed(2) : String(v); }

  function renderTrace() {
    var rows = trace.map(function (t) {
      return '<tr><td>' + t.f + '</td><td>' + shown(t.before) + '</td><td>' + (t.burned ? 'yes' : 'no') + '</td><td>' + shown(t.after) + '</td><td>' + shown(t.y) + '</td><td>' + t.fuel + '</td></tr>';
    });
    traceBody.innerHTML = rows.join('') || '<tr><td colspan="6">Press the green flag. The last 6 frames show here.</td></tr>';
  }

  function sx(x) { return W / 2 + x; }
  function sy(y) { return H / 2 - y; }
  function img(name, x, y, w, h, cx, cy, alpha) {
    var im = IMG[name];
    if (!im || !im.complete || !im.naturalWidth) return;
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    ctx.drawImage(im, sx(x) - cx, sy(y) - cy, w, h);
    ctx.globalAlpha = 1;
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function monitor(label, value, y) {
    ctx.font = '600 12px system-ui, sans-serif';
    var v = String(value), lw = ctx.measureText(label).width, vw = Math.max(26, ctx.measureText(v).width + 12);
    ctx.fillStyle = 'rgba(230,240,255,0.95)'; ctx.strokeStyle = '#c6d0dc';
    rr(5, y, lw + vw + 18, 22, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#575e75'; ctx.fillText(label, 11, y + 15);
    ctx.fillStyle = '#ff8c1a'; rr(17 + lw, y + 3, vw, 16, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(v, 17 + lw + vw / 2, y + 15); ctx.textAlign = 'left';
  }
  function draw() {
    ctx.clearRect(0, 0, W, H);
    img('space', 0, 0, W, H, 240, 180);
    img('ground', 0, -150, 480, 60, 240, 30);
    img(s.pad, s.padX, -114, 84, 14, 42, 7);
    s.puffs.forEach(function (p) { img('puff', p.x, p.y, 16, 16, 8, 8, 1 - p.ghost / 100); });
    img(s.costume, s.x, s.y, 48, 46, 24, 23);
    if (s.bubble) {
      ctx.font = '600 15px system-ui, sans-serif';
      var tw = ctx.measureText(s.bubble).width + 22, bx = Math.max(4, Math.min(W - tw - 4, sx(s.x) + 18)), by = Math.max(4, sy(s.y) - 62);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#8a94a6'; ctx.lineWidth = 2; rr(bx, by, tw, 32, 14); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#15211f'; ctx.fillText(s.bubble, bx + 11, by + 21);
    }
    monitor('speed y', shown(s.vy), 5);
    monitor('fuel', s.fuel, 32);
    monitor('best', best, 59);
    if (!running && !s.over && frameNo === 0) {
      ctx.fillStyle = 'rgba(11,19,36,0.7)'; rr(120, 150, 240, 40, 10); ctx.fill();
      ctx.fillStyle = '#e8eef7'; ctx.font = '600 16px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('Press the green flag', 240, 176); ctx.textAlign = 'left';
    }
  }

  var last = 0, acc = 0;
  function loop(t) {
    var interval = 1000 / (slow ? 5 : FPS);
    acc += Math.min(250, t - (last || t)); last = t;
    while (acc >= interval) { step(); acc -= interval; }
    draw();
    requestAnimationFrame(loop);
  }
  reset(); renderTrace();
  requestAnimationFrame(loop);

  // Keyboard, like Scratch's "key pressed?" blocks.
  var MAP = { ArrowUp: 'up', ArrowLeft: 'left', ArrowRight: 'right' };
  canvas.addEventListener('keydown', function (e) { if (MAP[e.key]) { keys[MAP[e.key]] = true; syncPads(); e.preventDefault(); } });
  canvas.addEventListener('keyup', function (e) { if (MAP[e.key]) { keys[MAP[e.key]] = false; syncPads(); } });
  canvas.addEventListener('blur', function () { keys.up = keys.left = keys.right = false; syncPads(); });

  // Touch pads: hold to fire or steer.
  var pads = document.querySelectorAll('[data-key]');
  function syncPads() { pads.forEach(function (b) { b.setAttribute('aria-pressed', String(keys[b.dataset.key])); }); }
  pads.forEach(function (b) {
    var on = function (e) { keys[b.dataset.key] = true; syncPads(); e.preventDefault(); };
    var off = function () { keys[b.dataset.key] = false; syncPads(); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
    b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') on(e); });
    b.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') off(); });
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  document.getElementById('flag').addEventListener('click', greenFlag);
  document.getElementById('stop').addEventListener('click', stop);
  var slowBtn = document.getElementById('slow');
  slowBtn.addEventListener('click', function () {
    slow = !slow; slowBtn.setAttribute('aria-pressed', String(slow));
    slowBtn.textContent = slow ? 'Slow motion: on' : 'Slow motion: off';
  });
  var soundBtn = document.getElementById('sound');
  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn; soundBtn.setAttribute('aria-pressed', String(soundOn));
    soundBtn.textContent = 'Sound: ' + (soundOn ? 'on' : 'off');
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && running) stop(); });
})();
