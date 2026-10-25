// The recording player: slide, caption and cue, all driven by one clock.
// Also fills the numbers, the pace chart, the watch-back notes and the transcript.
(function () {
  var TOTAL = timeLines();
  var $ = function (id) { return document.getElementById(id); };
  var slot = $('slot'), cap = $('cap'), cue = $('cue'), seek = $('seek'), time = $('time');
  var playBtn = $('play'), speedBtn = $('speed');
  var now = 0, playing = false, speed = 1, last = 0, shownSlide = -1, shownLine = -1;
  var rows = [];

  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function lineAt(t) {
    for (var i = LINES.length - 1; i >= 0; i--) if (LINES[i].t <= t) return i;
    return 0;
  }
  function markFillers(parent, text) {
    var re = new RegExp(FILLERS.source, 'gi'), pos = 0, m;
    while ((m = re.exec(text))) {
      parent.appendChild(document.createTextNode(text.slice(pos, m.index)));
      var f = document.createElement('span'); f.className = 'filler'; f.textContent = m[0];
      parent.appendChild(f);
      pos = m.index + m[0].length;
    }
    parent.appendChild(document.createTextNode(text.slice(pos)));
  }

  function draw() {
    var i = lineAt(now), l = LINES[i];
    if (l.s !== shownSlide) { slot.replaceChildren(renderSlide(l.s)); shownSlide = l.s; }
    if (i !== shownLine) {
      cap.replaceChildren();
      if (l.who === 'p') { var w = document.createElement('span'); w.className = 'who'; w.textContent = 'A parent: '; cap.appendChild(w); }
      if (l.text) cap.appendChild(document.createTextNode(l.text));
      else cap.appendChild(document.createTextNode('(No one speaks.)'));
      var c = '';
      for (var k = i; k >= 0 && LINES[k].t > l.t - 15; k--) if (LINES[k].cue) { c = LINES[k].cue; break; }
      cue.textContent = c;
      rows.forEach(function (r, k) { r.classList.toggle('now', k === i); });
      shownLine = i;
    }
    seek.value = now;
    time.textContent = fmt(now) + ' / ' + fmt(TOTAL);
  }
  function tick(ts) {
    if (!playing) return;
    if (last) now += (ts - last) / 1000 * speed;
    last = ts;
    if (now >= TOTAL) { now = TOTAL; setPlaying(false); }
    draw();
    if (playing) requestAnimationFrame(tick);
  }
  function setPlaying(on) {
    playing = on; last = 0;
    playBtn.textContent = on ? 'Pause' : (now >= TOTAL ? 'Replay' : 'Play');
    if (on) requestAnimationFrame(tick);
  }
  function jump(t, play) { now = Math.max(0, Math.min(TOTAL, t)); draw(); if (play && !playing) setPlaying(true); }

  seek.max = TOTAL;
  playBtn.addEventListener('click', function () {
    if (!playing && now >= TOTAL) now = 0;
    setPlaying(!playing);
  });
  seek.addEventListener('input', function () { jump(parseFloat(seek.value)); });
  speedBtn.addEventListener('click', function () {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    speedBtn.textContent = 'Speed ' + speed + '×';
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlaying(false); });

  // Marks under the slider
  var marks = $('marks');
  LINES.forEach(function (l) {
    if (l.who === 'p' || (l.wait || 0) >= 3) {
      var m = document.createElement('span');
      if (l.who === 'p') m.className = 'q';
      m.style.left = ((l.who === 'p' ? l.t : l.t + l.speak) / TOTAL * 100) + '%';
      marks.appendChild(m);
    }
  });

  // Chapters
  [['Opening', 0], ['The vote', 5], ['How guessing works', 11], ['Locks and dials', 20], ['The sums', 27], ['Live demo', 33],
   ['Clever tricks', 39], ['Idea 1', 43], ['Idea 2', 49], ['My story', 53], ['Idea 3', 59], ['The bank question', 65], ['Tonight', 71], ['Ending', 78]]
    .forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = fmt(LINES[c[1]].t) + ' ' + c[0];
      b.addEventListener('click', function () { jump(LINES[c[1]].t, true); });
      $('chapters').appendChild(b);
    });

  // Numbers
  var words = 0, mine = 0, fillers = 0, waits = 0, turns = 0, fast = 0;
  LINES.forEach(function (l) {
    words += l.words;
    if (l.who === 'p') { turns++; return; }
    mine += l.words;
    fillers += (l.text.match(new RegExp(FILLERS.source, 'gi')) || []).length;
    if ((l.wait || 0) >= 3 && l.words) waits++;
  });
  var spoken = LINES.filter(function (l) { return l.words && l.who !== 'p'; });
  spoken.forEach(function (l) { if (l.wpm > 150) fast++; });
  [
    'Length: ' + fmt(TOTAL) + ' on the recording, from the first quiet moment to the last.',
    'Words: ' + words + ' in all, ' + mine + ' of them mine. That is ' + Math.round(words / TOTAL * 60) + ' words a minute on average, with pauses counted.',
    'Fillers: ' + fillers + ', about one every ' + Math.round(TOTAL / 60 / fillers * 10) / 10 + ' minutes. Two of them came in my two fastest stretches.',
    'Pauses of 3 seconds or more: ' + waits + ', not counting the 30 seconds of pair talk.',
    'Times a parent spoke: ' + turns + '. Two were questions I had not planned.',
    'Lines I said faster than 150 words a minute: ' + fast + ' of ' + spoken.length + '. All of them are in the opening or the bank answer.'
  ].forEach(function (s) { var li = document.createElement('li'); li.textContent = s; $('stats').appendChild(li); });

  // Pace chart: one dot per line I said, at its speaking speed, pauses left out.
  var NS = 'http://www.w3.org/2000/svg';
  function s(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
  var W = Math.max(300, Math.min(760, $('chart').clientWidth || 640)), H = 270, L = 36, R = 10, B = 230, top = 14, lo = 80, hi = 190;
  var y = function (v) { return B - (B - top) * (v - lo) / (hi - lo); };
  var x = function (t) { return L + (W - L - R) * t / TOTAL; };
  var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Dot chart of my speaking speed for each line, across the talk. Most lines sit between 120 and 150 words a minute. The opening and the bank answer sit above 150. The three key ideas sit below 120, on purpose. The table below has every number.' }, $('chart'));
  s('rect', { x: L, y: y(150), width: W - L - R, height: y(120) - y(150), class: 'ch-band' }, svg);
  [80, 100, 120, 150, 180].forEach(function (v) {
    s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'ch-grid' }, svg);
    s('text', { x: L - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'ch-axis' }, svg).textContent = v;
  });
  for (var m = 0; m <= TOTAL / 60; m += (W < 500 ? 4 : 2)) {
    s('text', { x: x(m * 60), y: B + 18, 'text-anchor': 'middle', class: 'ch-axis' }, svg).textContent = m + ':00';
  }
  s('text', { x: L, y: H - 2, class: 'ch-axis' }, svg).textContent = 'Minutes into the talk';
  var tbody = document.querySelector('#pace-table tbody');
  spoken.forEach(function (l) {
    var cx = x(l.t + l.speak / 2), cy = y(l.wpm);
    var first = l.text.split(/\s+/).slice(0, 6).join(' ') + '…';
    var label = fmt(l.t) + ': ' + l.wpm + ' words a minute. “' + first + '”';
    var dot = s('circle', { cx: cx, cy: cy, r: W < 500 ? 4.5 : 6, class: l.wpm > 150 ? 'ch-dot hot' : l.wpm < 120 ? 'ch-dot slow' : 'ch-dot', tabindex: 0, 'aria-label': label }, svg);
    function show() { $('tip').textContent = label; }
    dot.addEventListener('mouseenter', show); dot.addEventListener('focus', show);
    dot.addEventListener('click', function () { jump(l.t, false); show(); });
    var tr = document.createElement('tr');
    [fmt(l.t), l.wpm, first].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    tbody.appendChild(tr);
  });

  // Watch-back notes get a time button each.
  Array.prototype.forEach.call(document.querySelectorAll('#watch li'), function (li) {
    var l = LINES[parseInt(li.getAttribute('data-line'), 10)];
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn'; b.style.minHeight = '32px'; b.style.marginRight = '8px';
    b.textContent = fmt(l.t);
    b.setAttribute('aria-label', 'Play from ' + fmt(l.t));
    b.addEventListener('click', function () { jump(l.t, true); $('player').scrollIntoView({ behavior: 'smooth' }); });
    li.insertBefore(b, li.firstChild);
  });

  // Transcript
  LINES.forEach(function (l) {
    var li = document.createElement('li');
    var t = document.createElement('button');
    t.type = 'button'; t.className = 't'; t.textContent = fmt(l.t);
    t.setAttribute('aria-label', 'Play from ' + fmt(l.t));
    t.addEventListener('click', function () { jump(l.t, true); $('player').scrollIntoView({ behavior: 'smooth' }); });
    var body = document.createElement('div');
    if (l.text) {
      var p = document.createElement('span');
      if (l.who === 'p') { p.className = 'p'; p.textContent = 'Parent: ' + l.text; } else markFillers(p, l.text);
      body.appendChild(p);
    }
    if (l.cue) { var c = document.createElement('span'); c.className = 'c'; c.textContent = l.cue; body.appendChild(c); }
    li.appendChild(t); li.appendChild(body);
    $('lines').appendChild(li);
    rows.push(li);
  });

  draw();
})();
