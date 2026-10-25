// NEA textile and leather waste, 2015 to 2025, in thousand tonnes.
// Source: NEA, Waste and recycling statistics 2015 to 2025.
(function () {
  var DATA = [
    { y: 2015, gen: 155, rec: 12, dis: 143, rate: 8 },
    { y: 2016, gen: 151, rec: 11, dis: 140, rate: 7 },
    { y: 2017, gen: 151, rec: 10, dis: 141, rate: 6 },
    { y: 2018, gen: 220, rec: 14, dis: 206, rate: 6 },
    { y: 2019, gen: 168, rec: 6, dis: 161, rate: 4 },
    { y: 2020, gen: 137, rec: 6, dis: 131, rate: 4 },
    { y: 2021, gen: 189, rec: 7, dis: 182, rate: 4 },
    { y: 2022, gen: 254, rec: 5, dis: 249, rate: 2 },
    { y: 2023, gen: 211, rec: 5, dis: 206, rate: 2 },
    { y: 2024, gen: 206, rec: 7, dis: 199, rate: 3 },
    { y: 2025, gen: 231, rec: 6, dis: 225, rate: 3 }
  ];
  var NS = 'http://www.w3.org/2000/svg';
  var host = document.getElementById('chart');
  var wrap = document.getElementById('chart-wrap');
  var tip = document.getElementById('tip');

  // The table view.
  var body = document.querySelector('#data-table tbody');
  DATA.forEach(function (d) {
    var tr = document.createElement('tr');
    [d.y, d.gen, d.rec, d.dis, d.rate + '%'].forEach(function (v, i) {
      var td = document.createElement('td');
      td.textContent = v;
      if (i) td.className = 'n';
      tr.appendChild(td);
    });
    body.appendChild(tr);
  });

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  // Bar with only its top corners rounded, so it sits flat on the baseline.
  function topRounded(x, y, w, h, r) {
    r = Math.min(r, h, w / 2);
    return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
      'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z';
  }

  function showTip(d, g) {
    tip.textContent = '';
    var h = document.createElement('div');
    h.textContent = d.y + ', thousand tonnes';
    tip.appendChild(h);
    [['Total made', d.gen, null], ['Disposed of', d.dis, 'var(--s-disposed)'], ['Recycled', d.rec + ' (' + d.rate + '%)', 'var(--s-recycled)']].forEach(function (row) {
      var line = document.createElement('div');
      if (row[2]) { var k = document.createElement('span'); k.className = 'k'; k.style.background = row[2]; line.appendChild(k); }
      var b = document.createElement('b'); b.textContent = row[1]; line.appendChild(b);
      line.appendChild(document.createTextNode(' ' + row[0]));
      tip.appendChild(line);
    });
    tip.hidden = false;
    var box = g.getBoundingClientRect();
    var wb = wrap.getBoundingClientRect();
    // Beside the bar, inside the plot: right of it, or left if there's no room.
    var left = box.right - wb.left + 4;
    if (left + tip.offsetWidth > wb.width - 4) left = box.left - wb.left - tip.offsetWidth - 4;
    tip.style.left = Math.max(4, left) + 'px';
    tip.style.top = (box.top - wb.top + 12) + 'px';
  }

  function draw() {
    host.textContent = '';
    var W = Math.max(300, host.clientWidth);
    var H = W < 480 ? 250 : 300;
    var m = { t: 22, r: 6, b: 26, l: 32 };
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var max = 300;
    var svg = el('svg', { class: 'chart', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H }, host);
    var yScale = function (v) { return m.t + ih - (v / max) * ih; };
    [0, 100, 200, 300].forEach(function (v) {
      el('line', { class: 'grid', x1: m.l, x2: W - m.r, y1: yScale(v), y2: yScale(v) }, svg);
      var t = el('text', { x: m.l - 6, y: yScale(v) + 4, 'text-anchor': 'end' }, svg);
      t.textContent = v;
    });
    var step = iw / DATA.length;
    var bw = Math.max(8, Math.min(34, step * 0.62));
    DATA.forEach(function (d, i) {
      var x = m.l + i * step + (step - bw) / 2;
      var g = el('g', { class: 'bar', tabindex: '0', role: 'img',
        'aria-label': d.y + ': ' + d.gen + ' thousand tonnes generated, ' + d.rec + ' recycled, ' + d.rate + ' percent' }, svg);
      // Recycled sits on the baseline; disposed stacks on top with a 2px gap.
      var recTop = yScale(d.rec);
      el('rect', { class: 'seg', x: x, y: recTop, width: bw, height: yScale(0) - recTop, fill: 'var(--s-recycled)' }, g);
      var disTop = yScale(d.rec + d.dis);
      el('path', { class: 'seg', d: topRounded(x, disTop, bw, recTop - 2 - disTop, 4), fill: 'var(--s-disposed)' }, g);
      el('rect', { class: 'hit', x: m.l + i * step, y: m.t, width: step, height: ih }, g);
      var yr = el('text', { x: x + bw / 2, y: H - 8, 'text-anchor': 'middle' }, svg);
      yr.textContent = W < 480 ? "'" + String(d.y).slice(2) : d.y;
      if (i === 0 || i === DATA.length - 1 || d.y === 2022) {
        var lab = el('text', { class: 'lbl', x: x + bw / 2, y: disTop - 6, 'text-anchor': 'middle' }, svg);
        lab.textContent = d.rate + '% rec.';
      }
      g.addEventListener('pointerenter', function () { showTip(d, g); });
      g.addEventListener('pointerleave', function () { tip.hidden = true; });
      g.addEventListener('focus', function () { showTip(d, g); });
      g.addEventListener('blur', function () { tip.hidden = true; });
    });
  }

  draw();
  var last = host.clientWidth;
  window.addEventListener('resize', function () {
    if (host.clientWidth !== last) { last = host.clientWidth; draw(); }
  });
})();
