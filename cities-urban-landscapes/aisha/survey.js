// Dot map, micro:bit survey chart and trial bars for the site analysis page.
// Every reading and count here is made up for this example project.
(function () {
  // A small seeded random, so the dot map is the same every time.
  var seed = 7;
  function rand() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var NS = 'http://www.w3.org/2000/svg';
  var layer = document.getElementById('dot-layer');
  function dots(n, cls, x0, y0, w, h) {
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (x0 + rand() * w).toFixed(1));
      c.setAttribute('cy', (y0 + rand() * h).toFixed(1));
      c.setAttribute('r', '5');
      c.setAttribute('class', cls);
      layer.appendChild(c);
    }
  }
  // 17 on the floor along the shaded back wall, 21 standing near the gate,
  // 8 on the two benches.
  dots(17, 'dot-floor', 70, 64, 300, 48);
  dots(15, 'dot-stand', 68, 150, 46, 120);
  dots(6, 'dot-stand', 150, 236, 200, 34);
  dots(4, 'dot-bench', 128, 205, 64, 10);
  dots(4, 'dot-bench', 248, 205, 64, 10);

  // Average of 60 readings per spot: sound 0 to 255, temperature in degrees C.
  var spots = ['Canteen', 'Hall foyer', 'Garden', 'Corner, front', 'Corner, under roof', 'Class walkway'];
  var data = {
    sound: [[142, 38, 61], [96, 30, 72], [54, 22, 41], [88, 25, 131], [80, 24, 118], [77, 35, 66]],
    temp: [[31.5, 31.0, 32.5], [30.0, 29.8, 30.5], [30.5, 31.5, 33.0], [31.0, 33.5, 35.5], [30.5, 31.0, 32.0], [30.0, 30.5, 31.5]]
  };
  var notes = {
    sound: ['Recess: the canteen wins, as everyone guessed.', 'Lesson time: every spot is quiet.',
      'Dismissal: the corner is now the loudest spot in school.'],
    temp: ['Recess: all spots within 1.5 degrees.', 'Lesson time: the sun reaches the front of the corner.',
      'Dismissal: the corner front is 3.5 degrees hotter than under its own roof.']
  };
  var m = 'sound', t = 2;
  var box = document.getElementById('survey');
  var note = document.getElementById('survey-note');
  function draw() {
    var vals = data[m].map(function (r) { return r[t]; });
    var lo = m === 'temp' ? 28 : 0, hi = m === 'temp' ? 36 : 160;
    var top = Math.max.apply(null, vals);
    box.innerHTML = spots.map(function (s, i) {
      var v = vals[i];
      var w = Math.max(2, (v - lo) / (hi - lo) * 100);
      return '<div class="bar-row"><span>' + s + '</span><div class="bar-track"><div class="bar-fill' +
        (v === top ? ' hot' : '') + '" style="width:' + w + '%"></div><span class="bar-val">' +
        (m === 'temp' ? v.toFixed(1) + ' °C' : v + ' / 255') + '</span></div></div>';
    }).join('') + (m === 'temp' ? '<p class="small">The temperature bars start at 28 °C, so small gaps show.</p>' : '');
    note.textContent = notes[m][t];
    Array.prototype.forEach.call(document.querySelectorAll('[data-m]'), function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-m') === m));
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-t')) === t));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-m]'), function (b) {
    b.addEventListener('click', function () { m = b.getAttribute('data-m'); draw(); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-t]'), function (b) {
    b.addEventListener('click', function () { t = Number(b.getAttribute('data-t')); draw(); });
  });
  draw();

  var trial = [
    ['On the floor', 17, 4, 50],
    ['Went to the gate', 12, 4, 50],
    ['Sound at the front', 131, 112, 160]
  ];
  document.getElementById('trial-bars').innerHTML = trial.map(function (r) {
    return '<h3>' + r[0] + '</h3>' +
      '<div class="bar-row"><span>Before</span><div class="bar-track"><div class="bar-fill hot" style="width:' + (r[1] / r[3] * 100) +
      '%"></div><span class="bar-val">' + r[1] + '</span></div></div>' +
      '<div class="bar-row"><span>Trial week</span><div class="bar-track"><div class="bar-fill after" style="width:' + (r[2] / r[3] * 100) +
      '%"></div><span class="bar-val">' + r[2] + '</span></div></div>';
  }).join('');
})();
