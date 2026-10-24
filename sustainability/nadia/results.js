// Before and after charts. The data is made up (see the page) but every number
// in the text was worked out from these rows.
// Each row: [pupils present, items in the blue box, wrong items, general waste bag in grams]
var BEFORE = [[30,26,11,2850],[29,24,9,2780],[30,28,12,2990],[28,22,8,2620],[30,25,10,2900],
  [30,27,10,2810],[27,21,8,2560],[30,29,11,3010],[29,23,9,2700],[30,26,10,2880]];
var AFTER = [[30,34,3,2560],[30,31,2,2620],[29,33,4,2470],[30,36,3,2620],[28,30,2,2390],
  [30,35,4,2560],[30,32,2,2580],[29,33,3,2530],[30,37,4,2610],[30,34,2,2540]];

(function () {
  var NS = 'http://www.w3.org/2000/svg';
  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  var wrongPct = function (r) { return r[2] / r[1] * 100; };
  var gramsEach = function (r) { return r[3] / r[0]; };

  // One dot chart: before days on the left, after days on the right.
  function dotChart(svg, f, max, step, unit, goal, goalLabel) {
    var W = Math.round(Math.max(320, Math.min(640, svg.parentNode.clientWidth || 640))), H = 330, L = 58, R = 10, T = 20, B = 52;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var y = function (v) { return T + (H - T - B) * (1 - v / max); };
    for (var v = 0; v <= max; v += step) {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
      svg.appendChild(el('text', { x: L - 8, y: y(v) + 5, 'text-anchor': 'end' }, v + unit));
    }
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'axis' }));
    var half = (W - L - R) / 2;
    [[BEFORE, 'before', 'Before: 10 days'], [AFTER, 'after', 'After: 10 days']].forEach(function (set, s) {
      var x0 = L + s * half, gap = half / 11;
      var vals = set[0].map(f);
      vals.forEach(function (v, i) {
        var cx = x0 + gap * (i + 1), cy = y(v);
        if (s === 0) svg.appendChild(el('circle', { cx: cx, cy: cy, r: W < 500 ? 5 : 7, class: 'before' }));
        else svg.appendChild(el('rect', { x: cx - 6, y: cy - 6, width: 12, height: 12, class: 'after', transform: 'rotate(45 ' + cx + ' ' + cy + ')' }));
      });
      var m = mean(vals);
      svg.appendChild(el('line', { x1: x0 + gap * 0.5, x2: x0 + gap * 10.5, y1: y(m), y2: y(m), class: 'meanline', stroke: s ? 'var(--blue)' : 'var(--grey)' }));
      svg.appendChild(el('text', { x: x0 + half / 2, y: H - 26, 'text-anchor': 'middle', 'font-weight': '700' }, set[2]));
      svg.appendChild(el('text', { x: x0 + half / 2, y: H - 6, 'text-anchor': 'middle' }, 'mean ' + m.toFixed(1) + unit));
    });
    if (goal !== undefined) {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(goal), y2: y(goal), class: 'goalline' }));
      svg.appendChild(el('text', { x: L + 6, y: y(goal) + 22 }, goalLabel));
    }
    svg.appendChild(el('line', { x1: L + half, x2: L + half, y1: T, y2: y(0), class: 'axis', 'stroke-dasharray': '3 4' }));
  }

  var baseG = mean(BEFORE.map(gramsEach));
  dotChart(document.getElementById('chart-wrong'), wrongPct, 50, 10, '%', 15, 'goal: under 15%');
  dotChart(document.getElementById('chart-grams'), gramsEach, 120, 20, ' g', baseG * 0.9, 'goal: 10% less');

  // The data table.
  var tb = document.getElementById('data-rows');
  [['Before', BEFORE], ['After', AFTER]].forEach(function (set) {
    set[1].forEach(function (r, i) {
      var tr = document.createElement('tr');
      [set[0] + ' day ' + (i + 1), r[0], r[1], r[2], wrongPct(r).toFixed(1) + '%', (r[3] / 1000).toFixed(2), Math.round(gramsEach(r))].forEach(function (c) {
        var td = document.createElement('td'); td.textContent = c; tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
  });
})();
