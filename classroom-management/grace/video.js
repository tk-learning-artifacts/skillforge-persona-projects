// An animated video of one technique: proximity, the look, then a quiet word.
// Every frame is worked out from the time t, so the slider can jump anywhere.
(function () {
  var svg = document.getElementById('scene');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var END = 88;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  // keys: [[time, a, b, ...], ...]. Returns the values at time t.
  function track(keys, t) {
    if (t <= keys[0][0]) return keys[0].slice(1);
    for (var i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) {
        var a = keys[i - 1], b = keys[i], p = ease((t - a[0]) / (b[0] - a[0]));
        return a.slice(1).map(function (v, j) { return v + (b[j + 1] - v) * p; });
      }
    }
    return keys[keys.length - 1].slice(1);
  }
  function between(t, a, b) { return t >= a && t < b; }
  function fade(t, a, b, len) { // 0 to 1 to 0 over [a, b]
    len = len || 0.6;
    if (t < a || t > b) return 0;
    return Math.min(1, (t - a) / len, (b - t) / len);
  }

  // The room: whiteboard on the left wall, desks along the other three walls.
  el('rect', { x: 20, y: 20, width: 600, height: 360, rx: 10, class: 'sv-room' });
  el('rect', { x: 24, y: 120, width: 12, height: 160, class: 'sv-board' });
  el('text', { x: 44, y: 300, class: 'sv-small' }).textContent = 'Board';
  var seats = [];
  [150, 240, 330, 420, 510].forEach(function (x) {
    seats.push({ x: x, y: 98, sx: x - 20, sy: 30, sw: 40, sh: 22, wall: 'top' });
    seats.push({ x: x, y: 302, sx: x - 20, sy: 348, sw: 40, sh: 22, wall: 'bottom' });
  });
  [150, 200, 250].forEach(function (y) {
    seats.push({ x: 548, y: y, sx: 588, sy: y - 20, sw: 22, sh: 40, wall: 'right' });
  });
  var named = { '420,98': 'R', '240,302': 'H', '330,302': 'M' };
  var screens = {};
  seats.forEach(function (s) {
    if (s.wall === 'top') el('rect', { x: s.x - 34, y: 24, width: 68, height: 34, rx: 4, class: 'sv-desk' });
    if (s.wall === 'bottom') el('rect', { x: s.x - 34, y: 342, width: 68, height: 34, rx: 4, class: 'sv-desk' });
    if (s.wall === 'right') el('rect', { x: 582, y: s.y - 34, width: 34, height: 68, rx: 4, class: 'sv-desk' });
    var key = s.x + ',' + s.y;
    var g = el('g', {});
    var scr = el('rect', { x: s.sx, y: s.sy, width: s.sw, height: s.sh, rx: 3, class: 'sv-screen' }, g);
    // Code lines, or a play triangle when a game is open.
    var code = el('g', {}, g);
    var vert = s.wall === 'right';
    for (var i = 0; i < 3; i++) {
      if (vert) el('line', { x1: s.sx + 6 + i * 5, y1: s.sy + 7, x2: s.sx + 6 + i * 5, y2: s.sy + 22 + (i % 2) * 8, class: 'sv-code' }, code);
      else el('line', { x1: s.sx + 6, y1: s.sy + 6 + i * 5, x2: s.sx + 22 + (i % 2) * 10, y2: s.sy + 6 + i * 5, class: 'sv-code' }, code);
    }
    var game = el('path', { d: 'M' + (s.sx + s.sw / 2 - 6) + ' ' + (s.sy + s.sh / 2 - 7) + ' l13 7 l-13 7 z', fill: '#fff8e8' }, g);
    game.style.display = 'none';
    screens[key] = { rect: scr, code: code, game: game };
    el('circle', { cx: s.x, cy: s.y, r: 15, class: 'sv-kid' + (named[key] ? ' named' : '') });
    if (named[key]) {
      var tx = el('text', { x: s.x, y: s.y + 5, 'text-anchor': 'middle', class: 'sv-kidtext' });
      tx.textContent = named[key];
    }
  });

  // Chat dots between H and M, the path I walk, my sight lines, and me.
  var chat = el('g', {});
  el('rect', { x: 262, y: 252, width: 46, height: 26, rx: 13, class: 'sv-bubble' }, chat);
  var dots = [0, 1, 2].map(function (i) { return el('circle', { cx: 274 + i * 11, cy: 265, r: 3.5, fill: 'currentColor' }, chat); });
  chat.style.color = 'var(--ink)';
  var path = el('path', { d: 'M95 200 Q 300 200 420 138', class: 'sv-path' });
  var sight = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'sv-sight' });
  var me = el('g', {});
  var meDot = el('circle', { cx: 0, cy: 0, r: 20, class: 'sv-me' }, me);
  var meTx = el('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'sv-metext' }, me);
  meTx.textContent = 'Me';
  var bubble = el('g', {});
  var bRect = el('rect', { x: 0, y: 0, width: 10, height: 10, rx: 10, class: 'sv-bubble' }, bubble);
  var bText = el('text', { x: 0, y: 0, class: 'sv-bubble-text' }, bubble);
  var clock = el('text', { x: 320, y: 236, 'text-anchor': 'middle', class: 'sv-label' });
  clock.textContent = 'Two minutes later';

  // Title and end cards.
  var veil = el('g', {});
  el('rect', { x: 0, y: 0, width: 640, height: 400, class: 'sv-veil' }, veil);
  var vTitle = el('text', { x: 320, y: 150, 'text-anchor': 'middle', class: 'sv-title' }, veil);
  var vLines = [0, 1, 2, 3, 4, 5].map(function (i) { return el('text', { x: 320, y: 196 + i * 30, 'text-anchor': 'middle', class: 'sv-sub' }, veil); });

  var me_keys = [[0, 95, 200], [17, 95, 200], [22, 300, 172], [28, 420, 140], [40, 420, 140], [44, 330, 196],
    [54, 330, 196], [58, 285, 248], [64, 285, 248], [68, 450, 196], [71, 450, 196], [75, 285, 248]];

  function say(text, x, y) {
    var lines = text.split('|');
    while (bText.firstChild) bText.removeChild(bText.firstChild);
    var w = 0;
    lines.forEach(function (line, i) {
      var ts = document.createElementNS(NS, 'tspan');
      ts.setAttribute('x', 0); ts.setAttribute('dy', i ? 23 : 0);
      ts.textContent = line;
      bText.appendChild(ts);
      w = Math.max(w, line.length * 10);
    });
    var h = 16 + lines.length * 23;
    var bx = Math.max(28, Math.min(612 - w - 20, x - w / 2 - 10));
    var by = y - h - 30;
    if (by < 26) by = y + 30;
    bRect.setAttribute('x', bx); bRect.setAttribute('y', by);
    bRect.setAttribute('width', w + 20); bRect.setAttribute('height', h);
    bText.setAttribute('transform', 'translate(' + (bx + 10) + ',' + (by + 26) + ')');
    bubble.style.display = '';
  }

  var CAPS = [
    [0, 'Proximity, the look, then a quiet word. Lab 2, Sec 1, minute 22 of 60.'],
    [6, "I'm giving the Step 3 instructions. Most of the class is with me."],
    [10, 'Ravi has opened a game tab. His screen faces into the room, so I see it.'],
    [13, "I don't stop. Stopping would turn one student's game into everyone's show."],
    [17, 'I keep talking and walk towards him. My voice stays the same.'],
    [24, 'Kounin called this withitness. Students learn that I see the whole room.'],
    [30, 'I stand behind him and keep teaching. I say nothing to him.'],
    [33, 'He closes the tab. Most days, moving closer is all it takes.'],
    [36, "A small nod when he's back. Then I move away, so it stays small."],
    [40, "Now Hana and Mei are chatting. They haven't started Step 3."],
    [46, "I catch their eye and hold it for a second. That's the look."],
    [50, "They smile and carry on. The look didn't work, so I go up one step."],
    [54, "I go over and crouch, so we're at eye level. I keep my voice low."],
    [58, "I say their names, the task, and when I'll be back. No telling off."],
    [64, 'Then I walk away. Standing over them turns it into a contest.'],
    [70, 'Two minutes later, I come back, as I said I would.'],
    [75, "They're on Step 3. I thank them for the work and give the next step."],
    [80, "Smallest step first. Go up a step only if the one before didn't work."]
  ];
  var RUNGS = [[6, 17, 0], [17, 40, 1], [40, 54, 2], [54, 80, 3]];

  var cap = document.getElementById('cap');
  var slider = document.getElementById('seek');
  var timeEl = document.getElementById('time');
  var playBtn = document.getElementById('play');
  var capBtn = document.getElementById('captions');
  var rungs = Array.prototype.slice.call(document.querySelectorAll('#ladder li'));
  slider.max = END;

  function render(t) {
    // Screens.
    var ravi = screens['420,98'];
    var onGame = between(t, 10, 33);
    ravi.rect.setAttribute('class', 'sv-screen' + (onGame ? ' game' : ''));
    ravi.code.style.display = onGame ? 'none' : '';
    ravi.game.style.display = onGame ? '' : 'none';

    // Me.
    var p = track(me_keys, t);
    var r = between(t, 58, 64.5) ? 15 : 20;
    meDot.setAttribute('cx', p[0]); meDot.setAttribute('cy', p[1]); meDot.setAttribute('r', r);
    meTx.setAttribute('x', p[0]); meTx.setAttribute('y', p[1] + 5);

    path.style.opacity = fade(t, 16.5, 31, 1);
    // Sight lines: to Ravi at 13 to 16, to Hana and Mei at 46 to 51.
    var target = between(t, 13, 16.5) ? [420, 98] : between(t, 46, 51.5) ? [285, 290] : null;
    if (target) {
      sight.setAttribute('x1', p[0]); sight.setAttribute('y1', p[1]);
      sight.setAttribute('x2', target[0]); sight.setAttribute('y2', target[1]);
      sight.style.display = '';
    } else sight.style.display = 'none';

    var chatting = between(t, 40, 59.5);
    chat.style.display = chatting ? '' : 'none';
    if (chatting) dots.forEach(function (d, i) { d.setAttribute('cy', 265 - 3 * Math.max(0, Math.sin((t * 6) - i))); });

    bubble.style.display = 'none';
    if (between(t, 6, 22)) say('Step 3: add a loop,|then test it.', p[0] + 70, p[1]);
    else if (between(t, 22, 30)) say('...then test it with|five repeats.', p[0], p[1]);
    else if (between(t, 36, 39)) say('(nod)', p[0], p[1]);
    else if (between(t, 58, 64)) say("Hana, Mei: Step 3, please.|I'll check back in|two minutes.", p[0], p[1]);
    else if (between(t, 76, 80)) say('Thanks. Step 4 next.', p[0], p[1]);

    clock.style.opacity = fade(t, 69.5, 73.5);
    clock.style.display = between(t, 69.5, 73.5) ? '' : 'none';

    // Title and end cards.
    var v = t < 6 ? Math.min(1, (6 - t) / 0.8) : t >= 80 ? Math.min(1, (t - 80) / 0.8) : 0;
    veil.style.opacity = v;
    veil.style.display = v > 0 ? '' : 'none';
    var lines;
    if (t < 6) {
      vTitle.textContent = 'Proximity first';
      lines = ['Redirecting without stopping the lesson', 'Sec 1 coding, computer lab', 'About 90 seconds, captions below', '', '', ''];
    } else {
      vTitle.textContent = 'Smallest step first';
      lines = ['1. Scan and keep teaching', '2. Move closer', '3. The look, or a signal', '4. A quiet word: name, task, time', '5. An I-statement and a choice', '6. A talk after class'];
    }
    vLines.forEach(function (l, i) { l.textContent = lines[i]; });

    // Caption, ladder and clock.
    var c = CAPS[0][1];
    CAPS.forEach(function (k) { if (t >= k[0]) c = k[1]; });
    if (cap.textContent !== c) cap.textContent = c;
    rungs.forEach(function (li, i) {
      var on = RUNGS.some(function (rg) { return rg[2] === i && between(t, rg[0], rg[1]); });
      var done = t >= 80 || RUNGS.some(function (rg) { return rg[2] === i && t >= rg[1]; });
      li.className = on ? 'on' : done ? 'done' : '';
    });
    var s = Math.floor(t);
    timeEl.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) + ' / 1:28';
    slider.value = t;
  }

  var t = 0, playing = false, last = 0;
  function frame(now) {
    if (!playing) return;
    t += (now - last) / 1000;
    last = now;
    if (t >= END) { t = END; playing = false; setButton(); }
    render(t);
    if (playing) requestAnimationFrame(frame);
  }
  function setButton() { playBtn.textContent = playing ? 'Pause' : (t >= END ? 'Play again' : 'Play'); }
  function play() {
    if (t >= END) t = 0;
    playing = true; last = performance.now(); setButton();
    requestAnimationFrame(frame);
  }
  function pause() { playing = false; setButton(); }
  playBtn.addEventListener('click', function () { playing ? pause() : play(); });
  slider.addEventListener('input', function () { t = Number(slider.value); render(t); setButton(); });
  capBtn.addEventListener('click', function () {
    var on = capBtn.getAttribute('aria-pressed') !== 'true';
    capBtn.setAttribute('aria-pressed', String(on));
    capBtn.textContent = on ? 'Captions: on' : 'Captions: off';
    cap.hidden = !on;
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-at]'), function (b) {
    b.addEventListener('click', function () { t = Number(b.getAttribute('data-at')); render(t); setButton(); });
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });
  render(0);
})();
