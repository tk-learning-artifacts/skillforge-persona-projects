// The league table, chart and totals. Change the power settings and every
// number on the scoreboard is worked out again.
(function () {
  var GRID = 0.402; // kg CO2 per kWh, Singapore grid average for 2024 (NCCS, from EMA)
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var classes = Object.keys(LEAGUE);
  var periods = ['base', 'cup', 'after'];
  var names = { base: 'Baseline', cup: 'Cup', after: 'After' };
  var metric = 'kwh';

  function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function settings() {
    return { lightW: Number($('light-w').value), fanW: Number($('fan-w').value), fanH: Number($('fan-h').value) };
  }
  // kWh for one room, one afternoon.
  function kwh(p, s) { return mean(p.lights) / 60 * s.lightW / 1000 + mean(p.fans) * s.fanW / 1000 * s.fanH; }
  function value(c, period, s) {
    var p = LEAGUE[c][period];
    if (metric === 'lights') return mean(p.lights);
    if (metric === 'fans') return mean(p.fans);
    return kwh(p, s);
  }
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function td(text, cls) { var t = document.createElement('td'); t.textContent = text; if (cls) t.className = cls; return t; }
  function fmt(n, d) { return n.toFixed(d); }

  function render() {
    var s = settings();
    $('light-w-out').textContent = s.lightW + ' W';
    $('fan-w-out').textContent = s.fanW + ' W';
    $('fan-h-out').textContent = s.fanH + ' h';

    // League: ranked by the drop from each class's own baseline.
    var rows = classes.map(function (c) {
      var b = kwh(LEAGUE[c].base, s), u = kwh(LEAGUE[c].cup, s), a = kwh(LEAGUE[c].after, s);
      return { c: c, b: b, u: u, a: a, drop: (1 - u / b) * 100, keep: (1 - a / b) * 100,
        zero: LEAGUE[c].cup.lights.filter(function (x) { return x === 0; }).length };
    }).sort(function (x, y) { return y.drop - x.drop || y.zero - x.zero; });
    var tb = $('league-rows');
    while (tb.firstChild) tb.removeChild(tb.firstChild);
    rows.forEach(function (r, i) {
      var tr = document.createElement('tr');
      if (i === 0) tr.className = 'top';
      tr.appendChild(td(String(i + 1), 'rank'));
      tr.appendChild(td(r.c));
      tr.appendChild(td(fmt(r.b, 2)));
      tr.appendChild(td(fmt(r.u, 2)));
      tr.appendChild(td(fmt(r.drop, 0) + '%'));
      tr.appendChild(td(String(r.zero)));
      tr.appendChild(td(fmt(r.keep, 0) + '%'));
      tb.appendChild(tr);
    });

    // Totals for all 8 rooms.
    var tot = {};
    periods.forEach(function (p) { tot[p] = classes.reduce(function (t, c) { return t + kwh(LEAGUE[c][p], s); }, 0) * 5; });
    $('t-base').textContent = fmt(tot.base, 1) + ' kWh';
    $('t-cup').textContent = fmt(tot.cup, 1) + ' kWh';
    $('t-after').textContent = fmt(tot.after, 1) + ' kWh';
    $('t-co2').textContent = fmt((tot.base - tot.after) * GRID * 40, 0) + ' kg';
    $('t-cup-drop').textContent = fmt((1 - tot.cup / tot.base) * 100, 0) + '% less than baseline';
    $('t-after-drop').textContent = fmt((1 - tot.after / tot.base) * 100, 0) + '% less than baseline';
    $('live').textContent = 'Winner: ' + rows[0].c + ', ' + fmt(rows[0].drop, 0) + '% down. All rooms, cup weeks: ' + fmt((1 - tot.cup / tot.base) * 100, 0) + '% less energy.';

    drawChart(s);
  }

  function drawChart(s) {
    var svg = $('league-chart');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = Math.round(Math.max(330, Math.min(720, svg.parentNode.clientWidth || 720))), H = 300, L = 46, R = 6, T = 16, B = 34;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var max = 0;
    classes.forEach(function (c) { periods.forEach(function (p) { max = Math.max(max, value(c, p, s)); }); });
    var step = metric === 'lights' ? 30 : metric === 'fans' ? 1 : (max > 2 ? 0.5 : 0.25);
    var top = Math.ceil(max / step) * step;
    var y = function (v) { return T + (H - T - B) * (1 - v / top); };
    for (var v = 0; v <= top + 1e-9; v += step) {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
      svg.appendChild(el('text', { x: L - 6, y: y(v) + 5, 'text-anchor': 'end' }, metric === 'kwh' ? v.toFixed(2) : String(Math.round(v * 10) / 10)));
    }
    var slot = (W - L - R) / classes.length, bw = slot / 4.2;
    var fills = { base: 'var(--base)', cup: 'var(--cup)', after: 'url(#hatch)' };
    var defs = el('defs', {});
    var pat = el('pattern', { id: 'hatch', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' });
    pat.appendChild(el('rect', { width: 3, height: 6, fill: 'var(--after)' }));
    defs.appendChild(pat);
    svg.appendChild(defs);
    classes.forEach(function (c, i) {
      var x0 = L + slot * i + (slot - bw * 3) / 2;
      periods.forEach(function (p, j) {
        var v = value(c, p, s);
        var r = el('rect', { x: x0 + j * bw, y: y(v), width: bw - 2, height: Math.max(0, y(0) - y(v)), fill: fills[p] });
        if (p === 'after') { r.setAttribute('stroke', 'var(--after)'); r.setAttribute('stroke-width', 1.5); }
        r.appendChild(el('title', {}, c + ' ' + names[p] + ': ' + v.toFixed(metric === 'kwh' ? 2 : 1)));
        svg.appendChild(r);
      });
      svg.appendChild(el('text', { x: L + slot * i + slot / 2, y: H - 10, 'text-anchor': 'middle', 'font-weight': 700 }, c));
    });
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'axis' }));
    var units = { kwh: 'kWh per afternoon', lights: 'Lights-on minutes per afternoon', fans: 'Fans spinning at 3 pm' };
    $('chart-title').textContent = units[metric] + ', mean of 10 days, for each class';
  }

  ['light-w', 'fan-w', 'fan-h'].forEach(function (id) { $(id).addEventListener('input', render); });
  document.querySelectorAll('[data-metric]').forEach(function (b) {
    b.addEventListener('click', function () {
      metric = b.dataset.metric;
      document.querySelectorAll('[data-metric]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      drawChart(settings());
    });
  });
  $('reset').addEventListener('click', function () {
    $('light-w').value = 300; $('fan-w').value = 60; $('fan-h').value = 3; render();
  });
  render();
})();
