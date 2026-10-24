// The waiting corner layout tool. The corner is 8 m by 6 m, drawn as a grid
// of 0.5 m squares: 16 across, 12 deep. Row 0 is the back wall.
(function () {
  var W = 16, H = 12, S = 30, OX = 30, OY = 24;
  var ROOF_ROWS = 4;               // the roof shades rows 0 to 3 at 1.40 pm
  var PILLARS = [[5, 3], [10, 3]];
  var GATE = [6, 9];               // left edge, rows 6 to 9
  var DOOR = [1, 3];               // right edge, rows 1 to 3
  var PEAK = 46;                   // most pupils we counted at 1.40 pm

  var TYPES = {
    bench: { label: 'Bench', w: 4, h: 1, seats: 4, blocks: true, cost: 400, fill: 'var(--kraft)' },
    sail: { label: 'Shade sail', w: 6, h: 4, blocks: false, cost: 2500, fill: 'var(--shade)' },
    planter: { label: 'Planter', w: 2, h: 2, blocks: true, cost: 150, fill: 'var(--green)' },
    rack: { label: 'Bag rack', w: 3, h: 1, blocks: true, cost: 90, fill: 'var(--blue-soft)' },
    board: { label: 'Bus board', w: 2, h: 1, blocks: false, wall: true, cost: 60, fill: 'var(--tape)' },
    bay: { label: 'Bus bay', w: 3, h: 2, blocks: false, cost: 75, fill: 'none' }
  };
  var PRESETS = {
    today: { name: 'Today', note: 'Two benches in the sun. Children sit on the floor under the roof instead.',
      items: [['bench', 3, 8], ['bench', 9, 8]] },
    a: { name: 'Group A: shade first', note: 'Group A put a sail over the gate side. Better, but one bench is still in the sun.',
      items: [['sail', 3, 6], ['bench', 4, 7], ['bench', 4, 9], ['bench', 9, 8]] },
    b: { name: 'Group B: bus bays', note: 'Group B moved the benches under the roof and added a bag rack. The wheelchair token got stuck.',
      items: [['bench', 1, 1], ['bench', 6, 1], ['bench', 11, 0], ['rack', 13, 4], ['bay', 1, 9], ['bay', 6, 9], ['board', 7, 0]] },
    final: { name: 'Final', note: 'The class plan: sail over the front, four shaded benches, bus board, bays and a clear path.',
      items: [['sail', 5, 7], ['bench', 6, 7], ['bench', 6, 10], ['bench', 1, 0], ['bench', 6, 0],
        ['board', 12, 0], ['rack', 12, 11], ['bay', 1, 9], ['bay', 12, 8]] }
  };

  var items = [];
  var tool = 'bench';
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.getElementById('plan');
  var note = document.getElementById('plan-note');

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function posts(it) {
    var t = TYPES[it.type];
    return [[it.x, it.y], [it.x + t.w - 1, it.y], [it.x, it.y + t.h - 1], [it.x + t.w - 1, it.y + t.h - 1]];
  }
  function blockedGrid() {
    var g = [];
    for (var y = 0; y < H; y++) { g.push([]); for (var x = 0; x < W; x++) g[y].push(false); }
    PILLARS.forEach(function (p) { g[p[1]][p[0]] = true; });
    items.forEach(function (it) {
      var t = TYPES[it.type];
      if (it.type === 'sail') posts(it).forEach(function (p) { g[p[1]][p[0]] = true; });
      if (!t.blocks) return;
      for (var y = it.y; y < it.y + t.h; y++) for (var x = it.x; x < it.x + t.w; x++) g[y][x] = true;
    });
    return g;
  }
  function shaded(x, y) {
    if (y < ROOF_ROWS) return true;
    return items.some(function (it) {
      var t = TYPES[it.type];
      return it.type === 'sail' && x >= it.x && x < it.x + t.w && y >= it.y && y < it.y + t.h;
    });
  }
  function fits(it) {
    var t = TYPES[it.type];
    if (it.x < 0 || it.y < 0 || it.x + t.w > W || it.y + t.h > H) return false;
    if (t.wall && it.y !== 0) return false;
    return true;
  }
  // Sails hang overhead and boards hang on the wall, so they only clash with their own kind.
  function layer(type) { return type === 'sail' || type === 'board' ? type : 'floor'; }
  function overlaps(a, b) {
    var ta = TYPES[a.type], tb = TYPES[b.type];
    if (layer(a.type) !== layer(b.type)) return false;
    return a.x < b.x + tb.w && b.x < a.x + ta.w && a.y < b.y + tb.h && b.y < a.y + ta.h;
  }
  function covers(it, x, y) {
    var t = TYPES[it.type];
    return x >= it.x && x < it.x + t.w && y >= it.y && y < it.y + t.h;
  }

  // Can a 3 by 3 square (1.5 m) get from the gate to the door?
  function route(g) {
    function free(bx, by) {
      if (bx < 0 || by < 0 || bx + 3 > W || by + 3 > H) return false;
      for (var y = by; y < by + 3; y++) for (var x = bx; x < bx + 3; x++) if (g[y][x]) return false;
      return true;
    }
    var start = [], seen = {}, prev = {};
    for (var by = GATE[0]; by + 2 <= GATE[1]; by++) if (free(0, by)) { start.push([0, by]); seen['0,' + by] = true; }
    var q = start.slice();
    while (q.length) {
      var c = q.shift();
      if (c[0] === W - 3 && c[1] === DOOR[0]) {
        var path = [c], k = c[0] + ',' + c[1];
        while (prev[k]) { path.unshift(prev[k]); k = prev[k][0] + ',' + prev[k][1]; }
        return path;
      }
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
        var n = [c[0] + d[0], c[1] + d[1]], key = n[0] + ',' + n[1];
        if (!seen[key] && free(n[0], n[1])) { seen[key] = true; prev[key] = c; q.push(n); }
      });
    }
    return null;
  }
  function turning(g) {
    for (var by = 0; by + 4 <= H; by++) for (var bx = 0; bx + 4 <= W; bx++) {
      var ok = true;
      for (var y = by; y < by + 4 && ok; y++) for (var x = bx; x < bx + 4; x++) if (g[y][x]) { ok = false; break; }
      if (ok) return [bx, by];
    }
    return null;
  }

  function check() {
    var g = blockedGrid();
    var seats = 0, shadeSeats = 0, cost = 0, board = false;
    var benchCells = {};
    items.forEach(function (it) {
      var t = TYPES[it.type];
      cost += t.cost;
      if (it.type === 'board') board = true;
      if (it.type !== 'bench') return;
      seats += t.seats;
      var all = true;
      for (var x = it.x; x < it.x + t.w; x++) { benchCells[x + ',' + it.y] = true; if (!shaded(x, it.y)) all = false; }
      if (all) shadeSeats += t.seats;
    });
    var standCells = 0;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) if (shaded(x, y) && !g[y][x]) standCells++;
    var standing = Math.floor(standCells / 2);
    return { g: g, seats: seats, shadeSeats: shadeSeats, standing: standing, cost: cost, board: board,
      route: route(g), turn: turning(g) };
  }

  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    el('title', {}).textContent = 'Plan of the waiting corner, 8 m by 6 m, in 0.5 m squares';
    el('rect', { x: OX, y: OY, width: W * S, height: H * S, fill: 'var(--floor)' });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      if (shaded(x, y)) el('rect', { x: OX + x * S, y: OY + y * S, width: S, height: S, 'class': 'shade' });
    }
    // walls, gate and door
    el('rect', { x: OX - 6, y: OY - 6, width: W * S + 12, height: 6, fill: 'var(--ink-2)' });
    el('rect', { x: OX - 6, y: OY, width: 6, height: GATE[0] * S, fill: 'var(--ink-2)' });
    el('rect', { x: OX - 6, y: OY + (GATE[1] + 1) * S, width: 6, height: (H - GATE[1] - 1) * S, fill: 'var(--ink-2)' });
    el('rect', { x: OX + W * S, y: OY + (DOOR[1] + 1) * S, width: 6, height: (H - DOOR[1] - 1) * S, fill: 'var(--ink-2)' });
    el('rect', { x: OX + W * S, y: OY, width: 6, height: DOOR[0] * S, fill: 'var(--ink-2)' });
    var gt = el('text', { x: 2, y: OY + (GATE[0] + 2) * S + 4, 'class': 'item-t' }); gt.textContent = 'GATE';
    gt.setAttribute('transform', 'rotate(-90 12 ' + (OY + (GATE[0] + 2) * S) + ')');
    var dt = el('text', { x: OX + W * S + 10, y: OY + (DOOR[0] + 1.5) * S, 'class': 'item-t' }); dt.textContent = 'DOOR';
    dt.setAttribute('transform', 'rotate(90 ' + (OX + W * S + 10) + ' ' + (OY + (DOOR[0] + 1.5) * S) + ')');
    PILLARS.forEach(function (p) { el('rect', { x: OX + p[0] * S + 4, y: OY + p[1] * S + 4, width: S - 8, height: S - 8, fill: 'var(--ink)' }); });
    items.forEach(function (it, i) {
      var t = TYPES[it.type];
      var r = el('rect', { x: OX + it.x * S + 2, y: OY + it.y * S + 2, width: t.w * S - 4, height: t.h * S - 4, rx: 3,
        fill: t.fill, 'class': 'item' });
      if (it.type === 'bay') { r.setAttribute('stroke-dasharray', '6 4'); r.setAttribute('stroke', 'var(--blue)'); r.setAttribute('stroke-width', '3'); }
      if (it.type === 'sail') {
        r.setAttribute('stroke-dasharray', '4 3');
        posts(it).forEach(function (p) { el('circle', { cx: OX + p[0] * S + S / 2, cy: OY + p[1] * S + S / 2, r: 6, fill: 'var(--ink)', 'class': 'item' }); });
      }
      var tx = el('text', { x: OX + it.x * S + (it.type === 'sail' ? 22 : 6), y: OY + it.y * S + (it.type === 'sail' ? 16 : Math.min(t.h, 1) * S / 2 + 4), 'class': 'item-t' });
      tx.textContent = t.label;
    });
    var res = check();
    if (res.route) {
      var pts = res.route.map(function (p) { return (OX + (p[0] + 1.5) * S) + ',' + (OY + (p[1] + 1.5) * S); });
      pts.unshift((OX - 4) + ',' + (OY + (res.route[0][1] + 1.5) * S));
      pts.push((OX + W * S + 4) + ',' + (OY + (res.route[res.route.length - 1][1] + 1.5) * S));
      el('polyline', { points: pts.join(' '), 'class': 'route' });
    }
    // The tap grid goes on top, so every tap lands on a square.
    var cells = el('g', {});
    for (var cy = 0; cy < H; cy++) for (var cx = 0; cx < W; cx++) {
      el('rect', { x: OX + cx * S, y: OY + cy * S, width: S, height: S, 'class': 'cell', 'data-x': cx, 'data-y': cy }, cells);
    }
    // scale bar
    el('line', { x1: OX, y1: OY + H * S + 22, x2: OX + 2 * S, y2: OY + H * S + 22, stroke: 'var(--ink)', 'stroke-width': 3 });
    var sb = el('text', { x: OX + 2 * S + 6, y: OY + H * S + 26, 'class': 'item-t' }); sb.textContent = '1 m. Each square is 0.5 m.';
    report(res);
  }

  function report(r) {
    var list = [
      [!!r.route, r.route ? 'A 1.5 m wide path runs from the gate to the door (green line).' : 'No 1.5 m wide path from the gate to the door. Something is in the way.'],
      [!!r.turn, r.turn ? 'There is a clear space 2 m across where a wheelchair can turn.' : 'Nowhere 2 m across is clear for a wheelchair to turn.'],
      [r.shadeSeats >= 16, r.shadeSeats + ' of ' + r.seats + ' seats are in shade at 1.40 pm. Our target is 16.'],
      [r.shadeSeats + r.standing >= PEAK, 'Shade for ' + (r.shadeSeats + r.standing) + ' pupils (seats plus standing room). We counted up to ' + PEAK + '.'],
      [r.board, r.board ? 'A bus board shows when each bus arrives.' : 'No bus board. Pupils will walk out to the gate to look.']
    ];
    document.getElementById('checks').innerHTML = list.map(function (c) {
      return '<li class="' + (c[0] ? 'ok' : 'bad') + '">' + (c[0] ? 'Yes: ' : 'Not yet: ') + c[1] + '</li>';
    }).join('');
    document.getElementById('cost').textContent = 'Estimated cost if you bought everything on the plan new: $' + r.cost.toLocaleString('en-SG') + '. Class estimates, not quotes.';
  }

  function load(key) {
    var p = PRESETS[key];
    items = p.items.map(function (a) { return { type: a[0], x: a[1], y: a[2] }; });
    note.textContent = p.name + '. ' + p.note;
    Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-preset') === key));
    });
    draw();
  }

  svg.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.hasAttribute('data-x')) return;
    var x = Number(t.getAttribute('data-x')), y = Number(t.getAttribute('data-y'));
    if (tool === 'remove') {
      // Take away floor things first, then boards, then sails.
      var order = ['floor', 'board', 'sail'];
      for (var k = 0; k < order.length; k++) {
        for (var i = items.length - 1; i >= 0; i--) {
          if (layer(items[i].type) === order[k] && covers(items[i], x, y)) {
            var gone = items.splice(i, 1)[0];
            note.textContent = 'Removed a ' + TYPES[gone.type].label.toLowerCase() + '.';
            draw();
            return;
          }
        }
      }
      note.textContent = 'Nothing to remove there.';
      return;
    }
    var it = { type: tool, x: x, y: TYPES[tool].wall ? 0 : y };
    if (!fits(it)) { note.textContent = 'That ' + TYPES[tool].label.toLowerCase() + ' does not fit there. Tap a square further from the right or bottom edge.'; return; }
    if (items.some(function (o) { return overlaps(o, it); })) { note.textContent = 'Something is already there.'; return; }
    items.push(it);
    note.textContent = 'Added a ' + TYPES[tool].label.toLowerCase() + '. Its top-left corner is on the square you tapped.';
    draw();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (b) {
    b.addEventListener('click', function () {
      tool = b.getAttribute('data-tool');
      Array.prototype.forEach.call(document.querySelectorAll('[data-tool]'), function (x) {
        x.setAttribute('aria-pressed', String(x === b));
      });
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-preset]'), function (b) {
    b.addEventListener('click', function () { load(b.getAttribute('data-preset')); });
  });
  document.getElementById('clear').addEventListener('click', function () {
    items = []; note.textContent = 'Empty corner. Add things from the list.'; draw();
  });
  load('today');
  window.__plan = { load: load, check: check };
})();
