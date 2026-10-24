// Calibration simulator. One made-up afternoon in a classroom: 240 minutes
// from when the room empties. Daylight comes through the windows; the lights
// are on for the first 70 minutes, and a cleaner switches them on for 15
// minutes later. Find a threshold that counts only the real lights.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var day = 'sunny', hood = false;

  function trueOn(t) { return t < 70 || (t >= 200 && t < 215); }
  // A small fixed random series, so the same day looks the same each time.
  var noise = [];
  var s = 11;
  for (var i = 0; i < 240; i++) { s = (s * 16807) % 2147483647; noise.push((s / 2147483647) - 0.5); }

  function daylight(t, d) {
    var base = d === 'sunny' ? 128 - t * 0.15 : 40 - t * 0.05;
    // Clouds pass on the sunny day.
    if (d === 'sunny' && ((t > 95 && t < 115) || (t > 160 && t < 170))) base -= 45;
    return Math.max(0, base + noise[t] * 14);
  }
  function reading(t) {
    var dl = daylight(t, day) * (hood ? 0.22 : 1);
    var lamp = trueOn(t) ? (hood ? 62 : 70) : 0;
    return Math.max(0, Math.min(255, Math.round(dl + lamp + noise[(t * 7) % 240] * 6)));
  }

  function el(tag, attrs, text) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function render() {
    var th = Number($('th').value);
    $('th-out').textContent = th;
    var svg = $('sim');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var W = Math.round(Math.max(330, Math.min(720, svg.parentNode.clientWidth || 720))), H = 300, L = 40, R = 8, T = 12, B = 36, max = 250;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    var x = function (t) { return L + (W - L - R) * t / 240; };
    var y = function (v) { return T + (H - T - B) * (1 - v / max); };
    // Shade the minutes the lights were really on.
    [[0, 70], [200, 215]].forEach(function (r) {
      svg.appendChild(el('rect', { x: x(r[0]), y: T, width: x(r[1]) - x(r[0]), height: y(0) - T, fill: 'var(--save-soft)' }));
    });
    for (var v = 0; v <= max; v += 50) {
      svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }));
      svg.appendChild(el('text', { x: L - 6, y: y(v) + 5, 'text-anchor': 'end' }, String(v)));
    }
    ['2 pm', '3 pm', '4 pm', '5 pm', '6 pm'].forEach(function (lab, i) {
      svg.appendChild(el('text', { x: x(i * 60), y: H - 12, 'text-anchor': i === 0 ? 'start' : i === 4 ? 'end' : 'middle' }, lab));
    });
    var hit = 0, falseOn = 0, missed = 0, d = '';
    for (var t = 0; t < 240; t++) {
      var r = reading(t), on = r > th, real = trueOn(t);
      if (on && real) hit++;
      if (on && !real) falseOn++;
      if (!on && real) missed++;
      d += (t ? 'L' : 'M') + x(t).toFixed(1) + ' ' + y(r).toFixed(1);
      if (on !== real) svg.appendChild(el('rect', { x: x(t), y: y(0) + 2, width: Math.max(1.5, x(1) - x(0)), height: 8, fill: 'var(--cup)' }));
    }
    svg.appendChild(el('path', { d: d, fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6 }));
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(th), y2: y(th), stroke: 'var(--cup)', 'stroke-width': 2.5, 'stroke-dasharray': '8 5' }));
    svg.appendChild(el('line', { x1: L, x2: W - R, y1: y(0), y2: y(0), class: 'axis' }));
    var counted = hit + falseOn, wrong = falseOn + missed;
    $('s-true').textContent = '85';
    $('s-counted').textContent = String(counted);
    $('s-wrong').textContent = String(wrong);
    var verdict = wrong <= 5 ? 'Good enough to use. ' : wrong <= 20 ? 'Close. ' : 'Not usable yet. ';
    $('sim-live').textContent = verdict + 'The sentinel counts ' + counted + ' minutes. The lights were really on for 85. ' + wrong + ' minutes are wrong.';
  }

  $('th').addEventListener('input', render);
  document.querySelectorAll('[data-day]').forEach(function (b) {
    b.addEventListener('click', function () {
      day = b.dataset.day;
      document.querySelectorAll('[data-day]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      render();
    });
  });
  $('hood').addEventListener('click', function () {
    hood = !hood;
    $('hood').setAttribute('aria-pressed', String(hood));
    $('hood').textContent = hood ? 'Hood: on' : 'Hood: off';
    render();
  });
  render();
})();
