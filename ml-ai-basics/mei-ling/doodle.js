// The doodle trainer. A drawing becomes a 20 x 20 grid of squares. To guess,
// the model finds the 5 taught drawings whose grids are closest, and they vote.
(function () {
  'use strict';
  var GRID = 20, FIT = 16, K = 5;
  var LABELS = ['sun', 'fish', 'house'];
  var NAMES = { sun: 'Sun', fish: 'Fish', house: 'House' };

  // Strokes are lists of [x, y] points on a 280 x 280 drawing area.
  function toGrid(strokes) {
    var pts = [];
    strokes.forEach(function (s) { s.forEach(function (p) { pts.push(p); }); });
    var out = new Array(GRID * GRID).fill(0);
    if (!pts.length) return out;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    pts.forEach(function (p) {
      x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]);
      x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]);
    });
    var side = Math.max(x1 - x0, y1 - y0, 20);
    var scale = FIT / side, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    var c = document.createElement('canvas');
    c.width = GRID; c.height = GRID;
    var g = c.getContext('2d', { willReadFrequently: true });
    g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#000'; g.fillStyle = '#000';
    strokes.forEach(function (s) {
      var m = s.map(function (p) { return [GRID / 2 + (p[0] - cx) * scale, GRID / 2 + (p[1] - cy) * scale]; });
      if (m.length === 1) { g.beginPath(); g.arc(m[0][0], m[0][1], 0.9, 0, Math.PI * 2); g.fill(); return; }
      g.beginPath(); g.moveTo(m[0][0], m[0][1]);
      for (var i = 1; i < m.length; i++) g.lineTo(m[i][0], m[i][1]);
      g.stroke();
    });
    var d = g.getImageData(0, 0, GRID, GRID).data;
    for (var i = 0; i < GRID * GRID; i++) out[i] = Math.round(d[i * 4 + 3] / 255 * 15);
    return out;
  }
  function pack(grid) { return grid.map(function (v) { return v.toString(16); }).join(''); }
  function unpack(hex) { return hex.split('').map(function (ch) { return parseInt(ch, 16); }); }
  function dist(a, b) { var s = 0; for (var i = 0; i < a.length; i++) { var t = a[i] - b[i]; s += t * t; } return s; }

  function guess(model, grid) {
    var near = model.examples.map(function (e) { return { e: e, d: dist(grid, e.grid) }; })
      .sort(function (a, b) { return a.d - b.d; }).slice(0, K);
    var votes = {}, total = {};
    LABELS.forEach(function (l) { votes[l] = 0; total[l] = 0; });
    near.forEach(function (n) { votes[n.e.label]++; total[n.e.label] += n.d; });
    var best = LABELS.slice().sort(function (a, b) { return votes[b] - votes[a] || total[a] - total[b]; })[0];
    return { best: best, votes: votes, near: near, k: near.length };
  }

  window.Doodle = { toGrid: toGrid, pack: pack, unpack: unpack, guess: guess, LABELS: LABELS };
  if (!document.getElementById('pad')) return;

  // ---------- the page ----------
  var pad = document.getElementById('pad');
  var pg = pad.getContext('2d');
  var seen = document.getElementById('seen');
  var live = document.getElementById('live');
  var strokes = [], drawing = null;
  var model = { name: '', examples: [] };
  var V1 = "Mei Ling's model, version 1", V2 = "Mei Ling's model, version 2";
  var dark = window.matchMedia('(prefers-color-scheme: dark)');

  function ink() { return dark.matches ? '#fff4d6' : '#2b2140'; }
  function say(t) { live.textContent = t; }

  function redraw() {
    pg.clearRect(0, 0, 280, 280);
    pg.lineWidth = 9; pg.lineCap = 'round'; pg.lineJoin = 'round';
    pg.strokeStyle = ink(); pg.fillStyle = ink();
    strokes.forEach(function (s) {
      if (s.length === 1) { pg.beginPath(); pg.arc(s[0][0], s[0][1], 4.5, 0, Math.PI * 2); pg.fill(); return; }
      pg.beginPath(); pg.moveTo(s[0][0], s[0][1]);
      for (var i = 1; i < s.length; i++) pg.lineTo(s[i][0], s[i][1]);
      pg.stroke();
    });
    paintGrid(seen, toGrid(strokes));
  }

  function paintGrid(canvas, grid) {
    var g = canvas.getContext('2d');
    var cell = canvas.width / GRID;
    g.fillStyle = dark.matches ? '#231c33' : '#fffdf6';
    g.fillRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < grid.length; i++) {
      if (!grid[i]) continue;
      g.fillStyle = dark.matches ? 'rgba(255,214,102,' + grid[i] / 15 + ')' : 'rgba(43,33,64,' + grid[i] / 15 + ')';
      g.fillRect((i % GRID) * cell, Math.floor(i / GRID) * cell, cell, cell);
    }
  }
  function thumb(grid, size, title) {
    var c = document.createElement('canvas');
    c.width = 40; c.height = 40; c.className = 'thumb';
    c.style.width = size + 'px'; c.style.height = size + 'px';
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', title);
    paintGrid(c, grid);
    return c;
  }

  function point(ev) {
    var r = pad.getBoundingClientRect();
    return [Math.round((ev.clientX - r.left) / r.width * 280), Math.round((ev.clientY - r.top) / r.height * 280)];
  }
  pad.addEventListener('pointerdown', function (ev) {
    ev.preventDefault(); pad.setPointerCapture(ev.pointerId);
    drawing = [point(ev)]; strokes.push(drawing); redraw();
  });
  pad.addEventListener('pointermove', function (ev) {
    if (!drawing) return;
    var p = point(ev), q = drawing[drawing.length - 1];
    if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 3) return;
    drawing.push(p); redraw();
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
    pad.addEventListener(t, function () { drawing = null; });
  });

  function counts() {
    var n = {}; LABELS.forEach(function (l) { n[l] = 0; });
    model.examples.forEach(function (e) { n[e.label]++; });
    return n;
  }

  function showClasses() {
    var n = counts();
    LABELS.forEach(function (l) {
      document.getElementById('n-' + l).textContent = n[l] + (n[l] === 1 ? ' drawing' : ' drawings');
      var box = document.getElementById('t-' + l);
      box.textContent = '';
      model.examples.forEach(function (e, i) {
        if (e.label === l) box.appendChild(thumb(e.grid, 34, NAMES[l] + ' drawing ' + (i + 1)));
      });
    });
    document.getElementById('model-name').textContent = model.name || 'Your own model';
    document.getElementById('model-size').textContent = model.examples.length + ' drawings taught';
  }

  function clearResult() {
    document.getElementById('result').hidden = true;
  }

  function showGuess(grid, where) {
    var n = counts();
    var short = LABELS.filter(function (l) { return n[l] < 3; });
    if (short.length) {
      say('Teach it at least 3 drawings of each thing first. Still short: ' + short.map(function (l) { return NAMES[l]; }).join(', ') + '.');
      return null;
    }
    var r = guess(model, grid);
    LABELS.forEach(function (l) {
      var pct = Math.round(r.votes[l] / r.k * 100);
      document.getElementById('bar-' + l).style.width = pct + '%';
      document.getElementById('pct-' + l).textContent = pct + '%';
    });
    var near = document.getElementById('near');
    near.textContent = '';
    r.near.forEach(function (x, i) {
      var f = document.createElement('figure');
      f.appendChild(thumb(x.e.grid, 44, 'Close drawing ' + (i + 1) + ': ' + NAMES[x.e.label]));
      var cap = document.createElement('figcaption');
      cap.textContent = NAMES[x.e.label];
      f.appendChild(cap);
      near.appendChild(f);
    });
    document.getElementById('verdict').textContent = 'I think it is a ' + NAMES[r.best].toLowerCase() + '.';
    document.getElementById('result').hidden = false;
    say((where || 'Your drawing') + ': ' + NAMES[r.best] + '. ' + r.votes[r.best] + ' of the ' + r.k + ' closest drawings said ' + NAMES[r.best] + '.');
    return r;
  }

  document.getElementById('clear').addEventListener('click', function () {
    strokes = []; redraw(); clearResult(); say('Cleared. Draw again.');
  });
  document.getElementById('undo').addEventListener('click', function () {
    strokes.pop(); redraw(); say('Took back your last line.');
  });
  document.getElementById('go').addEventListener('click', function () {
    if (!strokes.length) { say('Draw something first.'); return; }
    showGuess(toGrid(strokes));
  });
  LABELS.forEach(function (l) {
    document.getElementById('add-' + l).addEventListener('click', function () {
      if (!strokes.length) { say('Draw something first, then add it.'); return; }
      model.examples.push({ label: l, grid: toGrid(strokes) });
      if (model.name === V1 || model.name === V2) model.name += ', with your drawings';
      strokes = []; redraw(); clearResult(); showClasses();
      say('Added to ' + NAMES[l] + '. It now knows ' + counts()[l] + ' ' + NAMES[l].toLowerCase() + ' drawings.');
    });
    document.getElementById('undo-' + l).addEventListener('click', function () {
      for (var i = model.examples.length - 1; i >= 0; i--) {
        if (model.examples[i].label === l) { model.examples.splice(i, 1); break; }
      }
      showClasses(); say('Removed the last ' + NAMES[l].toLowerCase() + ' drawing.');
    });
  });

  function load(json, name) {
    model = {
      name: name || json.name || 'A model from a file',
      examples: json.examples.filter(function (e) { return LABELS.indexOf(e.label) >= 0 && e.px.length === GRID * GRID; })
        .map(function (e) { return { label: e.label, grid: unpack(e.px) }; })
    };
    showClasses(); clearResult(); clearTest();
  }
  document.getElementById('starter').addEventListener('click', function () {
    load(STARTER, V1); say('Loaded version 1: 12 suns, 12 fish and 12 houses.');
  });
  document.getElementById('fix').addEventListener('click', function () {
    load({ examples: STARTER.examples.concat(STARTER.fix) }, V2);
    say('Loaded version 2: version 1 plus 3 tall houses and 3 suns with no rays.');
  });
  document.getElementById('empty').addEventListener('click', function () {
    model = { name: '', examples: [] }; showClasses(); clearResult(); clearTest();
    say('The model is empty. Teach it 3 or more drawings of each thing.');
  });
  document.getElementById('save').addEventListener('click', function () {
    var out = {
      name: model.name || 'My doodle model', format: 'doodle-model 1',
      grid: GRID, labels: LABELS, k: K,
      examples: model.examples.map(function (e) { return { label: e.label, px: pack(e.grid) }; })
    };
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
    a.download = 'my-doodle-model.json';
    document.body.appendChild(a); a.click(); a.remove();
    say('Saved my-doodle-model.json to your Downloads folder.');
  });
  document.getElementById('open').addEventListener('change', function (ev) {
    var f = ev.target.files[0];
    if (!f) return;
    f.text().then(function (t) {
      var j = JSON.parse(t);
      if (!j.examples) throw new Error('no examples');
      load(j); say('Opened ' + f.name + '.');
    }).catch(function () { say('That file is not a doodle model.'); });
  });

  // The 15 new drawings that the model never saw.
  function clearTest() {
    document.getElementById('test-grid').textContent = '';
    document.getElementById('test-score').textContent = '';
  }
  document.getElementById('test').addEventListener('click', function () {
    var n = counts();
    if (LABELS.some(function (l) { return n[l] < 3; })) { say('Teach it at least 3 drawings of each thing first.'); return; }
    var box = document.getElementById('test-grid');
    box.textContent = '';
    var right = 0;
    STARTER.test.forEach(function (t, i) {
      var grid = toGrid(t.strokes);
      var r = guess(model, grid);
      var ok = r.best === t.label;
      if (ok) right++;
      var f = document.createElement('figure');
      f.className = ok ? 'ok' : 'bad';
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'test-pick';
      b.setAttribute('aria-label', 'Test drawing ' + (i + 1) + ', ' + t.note + '. Put it on the drawing pad.');
      b.appendChild(thumb(grid, 52, ''));
      b.addEventListener('click', function () {
        strokes = t.strokes.map(function (s) { return s.slice(); });
        redraw(); showGuess(grid, 'Test drawing ' + (i + 1));
        pad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      f.appendChild(b);
      var cap = document.createElement('figcaption');
      var a = document.createElement('span'); a.textContent = (i + 1) + '. ' + t.note;
      var g = document.createElement('strong');
      g.textContent = (ok ? 'Right: ' : 'Wrong: ') + NAMES[r.best].toLowerCase() + ' ' + Math.round(r.votes[r.best] / r.k * 100) + '%';
      cap.appendChild(a); cap.appendChild(g);
      f.appendChild(cap);
      box.appendChild(f);
    });
    var s = right + ' of ' + STARTER.test.length + ' right';
    document.getElementById('test-score').textContent = s + '. Tap a drawing to put it on the pad.';
    say('Test done: ' + s + '.');
  });

  dark.addEventListener('change', function () { redraw(); showClasses(); });
  load(STARTER, V1);
  redraw();
})();
