// Crossing simulator. People wait at the kerb or arrive during the steady
// green man, walk across at their own speed, and either reach the far kerb
// in time or are still on the road when cars get green. Three signal modes:
// today's fixed timing, Green Man+ (a card tap adds time) and sensor-wait
// (an on-crossing detector holds the cars until the road is clear, capped).
(function () {
  'use strict';

  var CAP = 13;            // most extra seconds the sensor may add (matches Green Man+ maximum)
  var RUNS = 2000;         // cycles per mode in the comparison
  var $ = function (id) { return document.getElementById(id); };

  var params = { width: 14, steady: 8, seniors: 0.4, tap: 0.5, mode: 'today' };
  var MODE_NAMES = { today: 'Today', gmplus: 'Green Man+ (card tap)', sensor: 'Sensor waits' };

  // Seeded random numbers, so every mode can be run on the same people.
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function normal(r, mean, sd) {
    var u = 1 - r(), v = r();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function poisson(r, mean) {
    var l = Math.exp(-mean), k = 0, p = 1;
    do { k++; p *= r(); } while (p > l);
    return k - 1;
  }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

  // Green Man+ adds 3 to 13 s depending on width. LTA does not publish the
  // formula, so this straight line from 7 m to 24 m is my assumption.
  function gmExtra(width) { return Math.round(clamp(3 + (width - 7) * 10 / 17, 3, 13)); }

  // One signal cycle's people. Depends only on the seed and the settings,
  // never on the mode, so the comparison is fair.
  function makeCycle(seed, p) {
    var r = rng(seed), people = [];
    function add(start, atKerb) {
      var senior = r() < p.seniors;
      var speed = senior ? clamp(normal(r, 0.85, 0.2), 0.45, 1.4) : clamp(normal(r, 1.35, 0.2), 0.9, 2.0);
      var tapper = senior && atKerb && r() < p.tap;
      people.push({ start: start, speed: speed, senior: senior, tapper: tapper, up: r() < 0.5, lane: r(),
        finish: start + p.width / speed });
    }
    var waiting = Math.max(1, poisson(r, 4));
    for (var i = 0; i < waiting; i++) add(0.5 + r() * 2.5, true);
    var late = poisson(r, 1.5);
    for (var j = 0; j < late; j++) add(r() * p.steady, false);
    return people;
  }

  // Signal timings for a cycle in a mode.
  function timing(people, p, mode) {
    var flash = p.width;                       // 1 s of flashing green man per metre of road
    var gm = 0;
    if (mode === 'gmplus' && people.some(function (x) { return x.tapper; })) gm = gmExtra(p.width);
    var greenEnd = p.steady + flash + gm;
    var hold = 0;
    if (mode === 'sensor') {
      var last = people.reduce(function (m, x) { return Math.max(m, x.finish); }, 0);
      if (last > greenEnd) hold = Math.min(CAP, Math.ceil((last - greenEnd) * 2) / 2);
    }
    return { steady: p.steady, flashEnd: greenEnd, carsGreen: greenEnd + hold, added: gm + hold };
  }

  function runMode(p, mode, seed0) {
    var s = { all: 0, under: 0, over: 0, sAll: 0, sUnder: 0, sOver: 0, added: 0, extended: 0 };
    for (var i = 0; i < RUNS; i++) {
      var people = makeCycle(seed0 + i, p);
      var t = timing(people, p, mode);
      if (t.added > 0) s.extended++;
      s.added += t.added;
      people.forEach(function (x) {
        var stuck = x.finish > t.carsGreen + 1e-9;
        s.all++; if (stuck) s.sAll++;
        if (x.senior) { s.over++; if (stuck) s.sOver++; } else { s.under++; if (stuck) s.sUnder++; }
      });
    }
    return s;
  }

  // ---------- Settings ----------
  function bind(id, key, fmt, scale) {
    var el = $(id), out = $(id + '-out');
    function read() { params[key] = Number(el.value) / (scale || 1); out.textContent = fmt(Number(el.value)); }
    el.addEventListener('input', function () { read(); resetCycle(); clearResults(); });
    read();
  }
  bind('width', 'width', function (v) { return v + ' m'; });
  bind('steady', 'steady', function (v) { return v + ' s'; });
  bind('seniors', 'seniors', function (v) { return v + '%'; }, 100);
  bind('tap', 'tap', function (v) { return v + '%'; }, 100);

  var modeButtons = document.querySelectorAll('.modes button');
  modeButtons.forEach(function (b) {
    b.addEventListener('click', function () {
      params.mode = b.getAttribute('data-mode');
      modeButtons.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      resetCycle();
    });
  });

  // ---------- Animation ----------
  var canvas = $('crossing'), ctx = canvas.getContext('2d');
  var W = 640, H = 400, PX = 12.5;            // 12.5 px per metre fits 24 m in 300 px
  var seed = 1, cycle = null, t = 0, playing = false, last = 0, raf = 0;

  function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

  function resetCycle() {
    cancelAnimationFrame(raf); playing = false; t = 0;
    var people = makeCycle(seed, params);
    cycle = { people: people, timing: timing(people, params, params.mode) };
    $('play').textContent = 'Run one cycle';
    drawTimeline(); draw(); status();
  }

  function phaseAt(time) {
    var tm = cycle.timing;
    if (time < tm.steady) return 'steady';
    if (time < tm.flashEnd) return 'flash';
    if (time < tm.carsGreen) return 'hold';
    return 'cars';
  }

  function status() {
    var ph = phaseAt(t), label = {
      steady: 'Green man',
      flash: 'Flashing green man',
      hold: 'Red man. Cars held: someone is still crossing',
      cars: 'Red man. Cars: green'
    }[ph];
    $('sig').textContent = label;
    $('clock').textContent = t.toFixed(1) + ' s';
  }

  function drawTimeline() {
    var tm = cycle.timing, total = tm.carsGreen + 6;
    var segs = [['t-steady', tm.steady, 'Green man'], ['t-flash', tm.flashEnd - tm.steady, 'Flashing'],
      ['t-ext', tm.carsGreen - tm.flashEnd, 'Held'], ['t-cars', 6, 'Cars green']];
    var html = segs.filter(function (s) { return s[1] > 0; }).map(function (s) {
      return '<span class="' + s[0] + '" style="width:' + (100 * s[1] / total).toFixed(2) + '%">' + s[2] + '</span>';
    }).join('');
    $('timeline').innerHTML = html + '<i class="marker" id="marker"></i>';
  }

  function draw() {
    var tm = cycle.timing, roadH = params.width * PX, top = (H - roadH) / 2, bottom = top + roadH;
    var cx0 = 250, cx1 = 390;
    ctx.clearRect(0, 0, W, H);
    // pavements
    ctx.fillStyle = css('--kerb'); ctx.fillRect(0, 0, W, top); ctx.fillRect(0, bottom, W, H - bottom);
    // road
    ctx.fillStyle = css('--road'); ctx.fillRect(0, top, W, roadH);
    // lane lines
    var lanes = Math.max(2, Math.round(params.width / 3.5));
    ctx.strokeStyle = css('--road-line'); ctx.lineWidth = 2; ctx.setLineDash([16, 14]);
    for (var i = 1; i < lanes; i++) {
      var y = top + roadH * i / lanes;
      if (i === lanes / 2) { ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cx0 - 30, y); ctx.moveTo(cx1 + 30, y); ctx.lineTo(W, y); ctx.stroke(); ctx.setLineDash([16, 14]); continue; }
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cx0 - 30, y); ctx.moveTo(cx1 + 30, y); ctx.lineTo(W, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    // stop lines and crossing lines
    ctx.fillStyle = css('--zebra');
    ctx.fillRect(cx0 - 26, top, 4, roadH); ctx.fillRect(cx1 + 22, top, 4, roadH);
    ctx.fillRect(cx0, top, 3, roadH); ctx.fillRect(cx1 - 3, top, 3, roadH);
    // detector zone
    if (params.mode === 'sensor') {
      ctx.fillStyle = css('--accent'); ctx.globalAlpha = 0.18; ctx.fillRect(cx0 + 3, top, cx1 - cx0 - 6, roadH); ctx.globalAlpha = 1;
      ctx.fillStyle = css('--ink'); ctx.font = '600 18px system-ui, sans-serif';
      ctx.fillText('detector zone', cx0 + 8, top + 16);
    }
    // cars
    var ph = phaseAt(t), go = ph === 'cars' ? Math.min(1, (t - tm.carsGreen) / 1.5) : 0;
    ctx.fillStyle = '#d9dde3';
    for (var c = 0; c < lanes; c++) {
      var ly = top + roadH * (c + 0.5) / lanes - 9, leftward = c >= lanes / 2; // Singapore drives on the left
      var x = leftward ? cx1 + 34 : cx0 - 34 - 44;
      // cars creep up to the stop line only; they never drive into a person
      x = leftward ? x - go * 4 : x + go * 4;
      roundRect(x, ly, 44, 18, 5);
    }
    // people
    var stuckCount = 0;
    cycle.people.forEach(function (p, k) {
      var px = cx0 + 14 + p.lane * (cx1 - cx0 - 28);
      var walked = clamp((t - p.start) * p.speed, 0, params.width);
      var y0 = p.up ? bottom + 14 : top - 14, y1 = p.up ? top - 14 : bottom + 14;
      var y = t < p.start ? y0 : (walked >= params.width ? y1 : (p.up ? bottom - walked * PX : top + walked * PX));
      var onRoad = t >= p.start && walked < params.width;
      var stuck = onRoad && t >= tm.carsGreen;
      if (stuck) stuckCount++;
      if (!onRoad && walked >= params.width && t > p.finish + 2) ctx.globalAlpha = 0.35;
      ctx.fillStyle = p.senior ? css('--over') : css('--under');
      if (p.senior) ctx.fillRect(px - 7, y - 7, 14, 14);
      else { ctx.beginPath(); ctx.arc(px, y, 7, 0, Math.PI * 2); ctx.fill(); }
      if (p.tapper && params.mode === 'gmplus') { ctx.strokeStyle = css('--ink'); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, y, 11, 0, Math.PI * 2); ctx.stroke(); }
      ctx.globalAlpha = 1;
      if (stuck) {
        ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(px, y, 13, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#ffd34d'; ctx.font = '700 15px system-ui, sans-serif'; ctx.fillText('!', px + 14, y - 8);
      }
    });
    ctx.fillStyle = css('--ink'); ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillText(params.width + ' m of road', 8, top - 6 > 14 ? top - 6 : 14);
    var marker = $('marker');
    if (marker) marker.style.left = (100 * Math.min(t, tm.carsGreen + 6) / (tm.carsGreen + 6)) + '%';
    return stuckCount;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fill();
  }

  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    t += dt * Number($('speed').value);
    var end = cycle.timing.carsGreen + 6;
    if (t >= end) { t = end; playing = false; }
    draw(); status();
    if (playing) raf = requestAnimationFrame(frame);
    else { $('play').textContent = 'Next cycle'; report(); }
  }

  function report() {
    var tm = cycle.timing, n = cycle.people.length;
    var stuck = cycle.people.filter(function (x) { return x.finish > tm.carsGreen + 1e-9; });
    var olds = stuck.filter(function (x) { return x.senior; }).length;
    var msg = MODE_NAMES[params.mode] + '. ' + n + (n === 1 ? ' person' : ' people') + ' crossed. ';
    if (!stuck.length) msg += 'Everyone reached the kerb before cars got green.';
    else msg += stuck.length + ' still on the road when cars got green, ' + olds + ' of them aged 65 or over.';
    if (tm.added > 0) msg += ' The signal added ' + tm.added + ' s.';
    $('live').textContent = msg;
  }

  $('play').addEventListener('click', function () {
    if (playing) return;
    if (t > 0) { seed++; resetCycle(); }
    playing = true; last = performance.now(); $('play').textContent = 'Running…'; $('live').textContent = '';
    raf = requestAnimationFrame(frame);
  });

  // ---------- Comparison ----------
  function pct(a, b) { return b ? (100 * a / b).toFixed(1) : '0.0'; }
  function clearResults() { $('results').hidden = true; $('cmp-note').textContent = ''; }
  $('compare').addEventListener('click', function () {
    var modes = ['today', 'gmplus', 'sensor'], rows = modes.map(function (m) { return [m, runMode(params, m, 1000)]; });
    var best = Math.min.apply(null, rows.map(function (r) { return r[1].sAll / r[1].all; }));
    $('results-body').innerHTML = rows.map(function (r) {
      var s = r[1], isBest = Math.abs(s.sAll / s.all - best) < 1e-12;
      return '<tr><th scope="row">' + MODE_NAMES[r[0]] + '</th>' +
        '<td class="n' + (isBest ? ' best' : '') + '">' + pct(s.sAll, s.all) + '</td>' +
        '<td class="n">' + pct(s.sOver, s.over) + '</td>' +
        '<td class="n">' + pct(s.sUnder, s.under) + '</td>' +
        '<td class="n">' + pct(s.extended, RUNS) + '%</td>' +
        '<td class="n">' + (s.added / RUNS).toFixed(1) + '</td></tr>';
    }).join('');
    $('results').hidden = false;
    $('cmp-note').textContent = 'Ran ' + RUNS + ' cycles in each mode, with the same people each time.';
  });

  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', function () { draw(); });
  }
  resetCycle();
})();
