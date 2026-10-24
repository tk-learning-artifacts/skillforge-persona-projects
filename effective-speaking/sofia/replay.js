// The replay: a moving plan of the camp circle, worked out from the time t,
// so the slider can jump anywhere. Also builds the talk-time strip, the
// watch-back notes and the transcript.
(function () {
  var TOTAL = timeLines();
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  function el(name, attrs, parent) { var e = document.createElementNS(NS, name); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function fmt(s) { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function ease(p) { p = Math.max(0, Math.min(1, p)); return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function lerp(a, b, p) { return [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p]; }

  var svg = $('scene');
  var C = 200, R = 165;
  var NAMES = { 5: 'N', 7: 'E', 9: 'W', 11: 'M', 13: 'A' };
  var WHO = { Nur: 5, Ethan: 7, 'Wei Ling': 9, Mia: 11, Aryan: 13 };
  var PIX = [14, 15, 0, 1, 2, 3, 4, 12, 10];
  var SHAPES = { T: '###.#..#.', X: '#.#.#.#.#' };
  function ring(deg, r) { var a = (deg - 90) * Math.PI / 180; return [C + r * Math.cos(a), C + r * Math.sin(a)]; }
  var home = []; for (var i = 0; i < 16; i++) home.push(ring(i * 22.5, R));
  var slot = function (k) { return [166 + (k % 3) * 34, 62 + Math.floor(k / 3) * 34]; };
  function pairPos(i) { var j = i % 2 ? i - 1 : i + 1; var m = lerp(home[i], home[j], 0.5); return lerp(home[i], m, 0.45); }
  function layout(mode, i) {
    if (mode === 'pix' && PIX.indexOf(i) >= 0) return slot(PIX.indexOf(i));
    if (mode === 'pairs') return pairPos(i);
    return home[i];
  }
  function spot(at) { return at === 'c' ? [C, 282] : ring(at, 118); }

  // Static parts
  el('rect', { x: 4, y: 4, width: 392, height: 392, rx: 22, class: 'sv-floor' }, svg);
  el('circle', { cx: C, cy: C, r: R, class: 'sv-ring' }, svg);
  var tape = el('g', { class: 'sv-tape' }, svg);
  for (var k = 0; k < 9; k++) { var p = slot(k); el('rect', { x: p[0] - 16, y: p[1] - 16, width: 32, height: 32, rx: 2 }, tape); }
  var mat = el('g', {}, svg);
  var cells = [];
  for (var r = 0; r < 8; r++) for (var c = 0; c < 8; c++) cells.push(el('rect', { x: 144 + c * 14, y: 150 + r * 14, width: 14, height: 14, class: 'sv-cell' }, mat));
  el('rect', { x: 144, y: 150, width: 112, height: 112, class: 'sv-mat' }, mat);
  el('text', { x: 360, y: 386, class: 'sv-small', 'text-anchor': 'middle' }, svg).textContent = 'Jun';
  el('rect', { x: 350, y: 352, width: 20, height: 20, rx: 4, class: 'sv-jun' }, svg);
  var kids = [];
  for (var i = 0; i < 16; i++) {
    var g = el('g', {}, svg);
    var halo = el('circle', { r: 17, class: 'sv-halo' }, g);
    var dot = el('circle', { r: 11, class: 'sv-kid' }, g);
    var card = el('rect', { x: -13, y: -13, width: 26, height: 26, rx: 3, class: 'sv-card' }, g);
    var label = el('text', { y: 5, 'text-anchor': 'middle', class: 'sv-name' }, g);
    label.textContent = NAMES[i] || '';
    kids.push({ g: g, halo: halo, dot: dot, card: card, label: label });
  }
  var me = el('g', {}, svg);
  var meHalo = el('circle', { r: 21, class: 'sv-halo sv-me-halo' }, me);
  el('path', { d: 'M0,-16 L15,0 L0,16 L-15,0 Z', class: 'sv-me' }, me);
  el('text', { y: 5, 'text-anchor': 'middle', class: 'sv-me-t' }, me).textContent = 'Me';

  function lineAt(t) { for (var i = LINES.length - 1; i >= 0; i--) if (LINES[i].t <= t) return i; return 0; }
  // The most recent line at or before index i that sets key, and the one before that.
  function lastWith(key, i, skip) {
    for (var k = i; k >= 0; k--) if (LINES[k][key] !== undefined && k !== skip) return k;
    return -1;
  }

  var cap = $('cap'), cue = $('cue'), seek = $('seek'), time = $('time');
  var now = 0, playing = false, speed = 1, last = 0, shown = -1, rows = [];

  function draw() {
    var i = lineAt(now), l = LINES[i];
    // Campers
    var g1 = lastWith('go', i), mode = g1 >= 0 ? LINES[g1].go : 'circle';
    var g0 = g1 >= 0 ? lastWith('go', g1 - 1) : -1, before = g0 >= 0 ? LINES[g0].go : 'circle';
    var pMove = g1 >= 0 ? ease((now - LINES[g1].t) / 2.5) : 1;
    var c1 = lastWith('card', i), shape = c1 >= 0 && c1 > g1 && mode === 'pix' ? SHAPES[LINES[c1].card] : '.........';
    kids.forEach(function (kid, n) {
      var pos = lerp(layout(before, n), layout(mode, n), pMove);
      kid.g.setAttribute('transform', 'translate(' + pos[0].toFixed(1) + ',' + pos[1].toFixed(1) + ')');
      var k = PIX.indexOf(n), asCard = mode === 'pix' && k >= 0 && pMove > 0.9;
      kid.card.style.display = asCard ? '' : 'none';
      kid.dot.style.display = asCard ? 'none' : '';
      kid.card.setAttribute('class', 'sv-card' + (asCard && shape[k] === '#' ? ' on' : ''));
      var talking = l.who === 'all' || l.who === 'Some campers' || WHO[l.who] === n;
      kid.halo.style.display = talking && now < l.t + l.speak + 0.6 ? '' : 'none';
    });
    // The mat
    var m1 = lastWith('mat', i), filled = 0;
    if (m1 >= 0) {
      var m0 = lastWith('mat', m1 - 1), from = m0 >= 0 ? LINES[m0].mat : 0, to = LINES[m1].mat, L = LINES[m1];
      filled = from + (to - from) * Math.max(0, Math.min(1, (now - L.t) / Math.max(1, L.d - 1)));
    }
    var picRows = PICTURES.ghost.rows;
    cells.forEach(function (cell, n) {
      var r = Math.floor(n / 8), c = n % 8;
      var on = r < Math.floor(filled + 0.001) || (r === Math.floor(filled) && c < (filled - r) * 8);
      cell.setAttribute('class', 'sv-cell' + (on && picRows[r][c] === '#' ? ' on' : ''));
    });
    // Me
    var a1 = lastWith('at', i), a0 = a1 >= 0 ? lastWith('at', a1 - 1) : -1;
    var to2 = spot(a1 >= 0 ? LINES[a1].at : 'c'), from2 = a0 >= 0 ? spot(LINES[a0].at) : to2;
    var mp = lerp(from2, to2, a1 >= 0 ? ease((now - LINES[a1].t) / 1.6) : 1);
    me.setAttribute('transform', 'translate(' + mp[0].toFixed(1) + ',' + mp[1].toFixed(1) + ')');
    meHalo.style.display = l.who === 's' && now < l.t + l.speak + 0.4 ? '' : 'none';
    // Words
    if (i !== shown) {
      cap.replaceChildren();
      var who = document.createElement('span');
      who.className = 'who who-' + (l.who === 's' ? 'me' : l.who === 'do' ? 'do' : 'kid');
      who.textContent = l.who === 's' ? 'Me' : l.who === 'all' ? 'Everyone' : l.who === 'do' ? 'Doing' : l.who;
      cap.appendChild(who);
      cap.appendChild(document.createTextNode(l.text || l.cue));
      var c = '';
      if (l.text) for (var k2 = i; k2 >= 0 && LINES[k2].t > l.t - 12; k2--) if (LINES[k2].cue && LINES[k2].text) { c = LINES[k2].cue; break; }
      cue.textContent = c;
      rows.forEach(function (row, n) { row.classList.toggle('now', n === i); });
      shown = i;
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
    $('play').textContent = on ? 'Pause' : (now >= TOTAL ? 'Replay' : 'Play');
    if (on) requestAnimationFrame(tick);
  }
  function jump(t, play) { now = Math.max(0, Math.min(TOTAL, t)); draw(); if (play && !playing) setPlaying(true); }
  function jumpTo(t) { jump(t, true); $('player').scrollIntoView({ behavior: 'smooth' }); }

  seek.max = TOTAL;
  $('play').addEventListener('click', function () { if (!playing && now >= TOTAL) now = 0; setPlaying(!playing); });
  seek.addEventListener('input', function () { jump(parseFloat(seek.value)); });
  $('speed').addEventListener('click', function () {
    speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
    $('speed').textContent = 'Speed ' + speed + '×';
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden && playing) setPlaying(false); });

  [['Freeze signal', 0], ['The promise', 9], ['Pixels', 15], ['Be the screen', 21], ['Mia’s X', 29], ['The counting rule', 34], ['Zero rows', 45], ['Buddy time', 55], ['Phones and faxes', 62], ['Colour', 67], ['The ghost', 71], ['Ending', 76]]
    .forEach(function (ch) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = fmt(LINES[ch[1]].t) + ' ' + ch[0];
      b.addEventListener('click', function () { jump(LINES[ch[1]].t, true); });
      $('chapters').appendChild(b);
    });

  // Who was talking: one strip, three kinds of time.
  var KIND = function (l) { return l.who === 's' ? 'me' : l.who === 'do' ? 'do' : 'kid'; };
  var sums = { me: 0, kid: 0, do: 0 };
  var strip = $('strip');
  var W = 600, H = 34;
  var ss = el('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', preserveAspectRatio: 'none', 'aria-label': 'A strip across the talk, coloured by who was talking. The numbers are listed beside it.' }, strip);
  LINES.forEach(function (l) {
    var kind = KIND(l);
    // My silences after a question count as the campers' time: they are thinking.
    var mine = kind === 'me' ? l.speak : 0, rest = l.d - mine;
    var x = W * l.t / TOTAL;
    sums.me += mine;
    sums[kind === 'kid' ? 'kid' : 'do'] += rest;
    if (mine) el('rect', { x: x, y: 0, width: W * mine / TOTAL, height: H, class: 'st-me' }, ss);
    if (rest > 0) el('rect', { x: x + W * mine / TOTAL, y: 0, width: W * rest / TOTAL, height: H, class: kind === 'kid' ? 'st-kid' : 'st-do' }, ss);
  });
  var pct = function (v) { return Math.round(v / TOTAL * 100); };
  $('k-me').textContent = fmt(sums.me) + ' (' + pct(sums.me) + '%)';
  $('k-kid').textContent = fmt(sums.kid) + ' (' + pct(sums.kid) + '%)';
  $('k-do').textContent = fmt(sums.do) + ' (' + pct(sums.do) + '%)';

  // Watch-back notes
  Array.prototype.forEach.call(document.querySelectorAll('#watch li'), function (li) {
    var l = LINES[parseInt(li.getAttribute('data-line'), 10)];
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'stamp'; b.textContent = fmt(l.t);
    b.setAttribute('aria-label', 'Play from ' + fmt(l.t));
    b.addEventListener('click', function () { jumpTo(l.t); });
    li.insertBefore(b, li.firstChild);
  });

  // Transcript, as a chat
  LINES.forEach(function (l) {
    var li = document.createElement('li');
    li.className = 'msg msg-' + KIND(l);
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'stamp'; b.textContent = fmt(l.t);
    b.setAttribute('aria-label', 'Play from ' + fmt(l.t));
    b.addEventListener('click', function () { jumpTo(l.t); });
    var who = document.createElement('span');
    who.className = 'msg-who';
    who.textContent = l.who === 's' ? 'Me' : l.who === 'all' ? 'Everyone' : l.who === 'do' ? 'Doing' : l.who;
    var body = document.createElement('p');
    body.textContent = l.text || l.cue;
    li.appendChild(b); li.appendChild(who); li.appendChild(body);
    if (l.text && l.cue) { var c = document.createElement('p'); c.className = 'msg-cue'; c.textContent = l.cue; li.appendChild(c); }
    $('lines').appendChild(li);
    rows.push(li);
  });

  draw();
})();
