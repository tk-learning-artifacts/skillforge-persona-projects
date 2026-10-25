// An animated video of the break card routine, with captions, a slides mode
// and an optional read-aloud. Every frame is worked out from the time t.
(function () {
  var svg = document.getElementById('scene');
  if (!svg) return;
  var NS = 'http://www.w3.org/2000/svg';
  var END = 90;

  function el(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function ease(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
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
  function show(e, on) { e.style.display = on ? '' : 'none'; }
  function piePath(cx, cy, r, frac) { // the part of a circle still to run
    if (frac >= 0.999) return 'M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z';
    if (frac <= 0) return '';
    var a = frac * 2 * Math.PI;
    var x = cx + r * Math.sin(a), y = cy - r * Math.cos(a);
    return 'M' + cx + ' ' + cy + ' L' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x + ' ' + y + ' Z';
  }
  // Desk cards: green circle with a tick, orange square with a ?, blue triangle with pause bars.
  function card(parent, x, y) {
    var g = el('g', {}, parent);
    var parts = {
      working: el('g', {}, g), help: el('g', {}, g), brk: el('g', {}, g)
    };
    el('circle', { cx: x, cy: y, r: 11, fill: '#2d6b33' }, parts.working);
    el('path', { d: 'M' + (x - 5) + ' ' + y + ' l3.5 4 l6.5 -8', fill: 'none', stroke: '#fff', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, parts.working);
    el('rect', { x: x - 10, y: y - 10, width: 20, height: 20, rx: 2, fill: '#b85c0a' }, parts.help);
    var q = el('text', { x: x, y: y + 6, 'text-anchor': 'middle', fill: '#fff', style: 'font: 700 16px Verdana, sans-serif' }, parts.help);
    q.textContent = '?';
    el('path', { d: 'M' + x + ' ' + (y - 12) + ' L' + (x + 12) + ' ' + (y + 9) + ' L' + (x - 12) + ' ' + (y + 9) + ' Z', fill: '#1d5fa6' }, parts.brk);
    el('path', { d: 'M' + (x - 3) + ' ' + (y - 1) + ' v7 M' + (x + 3) + ' ' + (y - 1) + ' v7', stroke: '#fff', 'stroke-width': 2.5 }, parts.brk);
    return function (kind) { for (var k in parts) show(parts[k], k === kind); };
  }

  // The room.
  el('rect', { x: 20, y: 20, width: 600, height: 360, rx: 10, class: 'n-room' });
  el('rect', { x: 150, y: 28, width: 330, height: 60, rx: 8, class: 'n-board' });
  el('text', { x: 166, y: 52, class: 'n-boardtext' }).textContent = 'Now: Code';
  el('text', { x: 166, y: 76, class: 'n-boardtext' }).textContent = 'Next: Brain break';
  el('circle', { cx: 446, cy: 58, r: 20, class: 'n-pie-bg' });
  var boardPie = el('path', { d: '', class: 'n-pie' });
  el('rect', { x: 496, y: 222, width: 116, height: 150, rx: 10, class: 'n-corner' });
  el('text', { x: 506, y: 244, class: 'n-label' }).textContent = 'Calm';
  el('text', { x: 506, y: 263, class: 'n-label' }).textContent = 'corner';
  el('ellipse', { cx: 552, cy: 318, rx: 38, ry: 26, class: 'n-bean' });

  var tables = [[110, 170], [260, 170], [410, 170], [110, 300], [260, 300], [410, 300]];
  tables.forEach(function (c) {
    el('rect', { x: c[0] - 46, y: c[1] - 22, width: 92, height: 44, rx: 8, class: 'n-table' });
    [[-24, -40], [24, -40], [-24, 40], [24, 40]].forEach(function (o, i) {
      if (c[0] === 260 && c[1] === 300 && i === 1) return; // Aliya's seat is drawn on her own
      el('circle', { cx: c[0] + o[0], cy: c[1] + o[1], r: 13, class: 'n-kid' });
    });
  });
  var helpCard = card(svg, 96, 170);
  var aliyaCard = card(svg, 284, 292);

  // Noise marks over some tables.
  var noise = [[250, 128], [100, 258], [400, 258], [420, 128]].map(function (n) {
    return el('path', { d: '', class: 'n-noise' });
  });
  var noiseAt = [[250, 128], [100, 258], [400, 258], [420, 128]];

  var path = el('path', { d: 'M284 260 Q 470 236 548 300', class: 'n-path' });
  var sight = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, class: 'n-sight' });

  // Aliya, her headphones and her timer.
  var aliya = el('g', {});
  var aDot = el('circle', { cx: 0, cy: 0, r: 13, class: 'n-kid a' }, aliya);
  var aTx = el('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'n-kidtext' }, aliya);
  aTx.textContent = 'A';
  var phones = el('path', { d: '', fill: 'none', stroke: 'var(--green)', 'stroke-width': 4, 'stroke-linecap': 'round' });
  var cornerPieBg = el('circle', { cx: 590, cy: 274, r: 14, class: 'n-pie-bg' });
  var cornerPie = el('path', { d: '', class: 'n-pie' });

  // Me.
  var me = el('g', {});
  var meDot = el('circle', { cx: 0, cy: 0, r: 19, class: 'n-me' }, me);
  var meTx = el('text', { x: 0, y: 5, 'text-anchor': 'middle', class: 'n-metext' }, me);
  meTx.textContent = 'Me';

  var bubble = el('g', {});
  var bRect = el('rect', { x: 0, y: 0, width: 10, height: 10, rx: 12, class: 'n-bubble' }, bubble);
  var bText = el('text', { x: 0, y: 0, class: 'n-bubbletext' }, bubble);

  var veil = el('g', {});
  el('rect', { x: 0, y: 0, width: 640, height: 400, class: 'n-veil' }, veil);
  var vTitle = el('text', { x: 320, y: 130, 'text-anchor': 'middle', class: 'n-title' }, veil);
  var vLines = [0, 1, 2, 3, 4].map(function (i) { return el('text', { x: 320, y: 184 + i * 34, 'text-anchor': 'middle', class: 'n-sub' }, veil); });

  var ME = [[0, 150, 222], [24, 150, 222], [36, 150, 222], [40, 345, 236], [58, 345, 236], [61, 345, 236], [64, 318, 236],
    [70, 318, 236], [74, 70, 116]];
  var AL = [[0, 284, 260], [34, 284, 260], [38, 470, 240], [42, 548, 304], [58, 548, 304], [60, 470, 240], [62, 284, 260]];

  function say(text, x, y) {
    var lines = text.split('|');
    while (bText.firstChild) bText.removeChild(bText.firstChild);
    var w = 0;
    lines.forEach(function (line, i) {
      var ts = document.createElementNS(NS, 'tspan');
      ts.setAttribute('x', 0); ts.setAttribute('dy', i ? 24 : 0);
      ts.textContent = line;
      bText.appendChild(ts);
      w = Math.max(w, line.length * 11.2);
    });
    var h = 18 + lines.length * 24;
    var bx = Math.max(26, Math.min(614 - w - 22, x - w / 2 - 11));
    var by = y - h - 28;
    if (by < 24) by = y + 28;
    bRect.setAttribute('x', bx); bRect.setAttribute('y', by);
    bRect.setAttribute('width', w + 22); bRect.setAttribute('height', h);
    bText.setAttribute('transform', 'translate(' + (bx + 11) + ',' + (by + 28) + ')');
    show(bubble, true);
  }

  var CAPS = [
    [0, 'The break card. A P5 micro:bit lesson, minute 25 of 60.'],
    [6, 'Pairs are coding a micro:bit step counter. The room is getting loud.'],
    [11, "I'm helping a pair at the first table. Their orange square asked for help."],
    [18, "Aliya turns her desk card to the blue triangle. It means \"I need a break\"."],
    [21, "She doesn't need to say anything or put up her hand."],
    [24, 'I see it from where I am. I give her a thumbs-up.'],
    [29, "That's the whole answer. No questions, and no \"are you sure?\""],
    [34, 'She walks to the calm corner. Her partner keeps coding.'],
    [42, 'She turns the five-minute timer and puts on headphones.'],
    [47, "I don't follow her. Hovering would turn a break into a talk."],
    [52, 'The timer shows her how long is left. Time runs fast in this video.'],
    [58, 'The timer runs out. She comes back to her seat.'],
    [62, 'I crouch beside her and show a First, Then card.'],
    [66, 'One small step to restart, not the whole task again.'],
    [70, "She turns her card back to the green circle. She's working."],
    [73, 'I write down the time of the break. Patterns tell me what to change.'],
    [78, 'The break routine: card, thumbs-up, timer, back, one small step.']
  ];
  var STEPS = [[18, 24, 0], [24, 34, 1], [34, 58, 2], [58, 62, 3], [62, 78, 4]];
  var SLIDES = [[0, 6], [6, 18], [18, 24], [24, 34], [34, 47], [47, 58], [58, 66], [66, 78], [78, 90]];

  var cap = document.getElementById('cap');
  var slider = document.getElementById('seek');
  var timeEl = document.getElementById('time');
  var playBtn = document.getElementById('play');
  var player = document.getElementById('player');
  var strip = Array.prototype.slice.call(document.querySelectorAll('#strip li'));
  var slideNo = document.getElementById('slide-no');
  slider.max = END;

  function captionAt(t) {
    var c = CAPS[0][1];
    CAPS.forEach(function (k) { if (t >= k[0]) c = k[1]; });
    return c;
  }

  function render(t) {
    var p = track(ME, t), a = track(AL, t);
    var crouch = between(t, 64, 70);
    meDot.setAttribute('cx', p[0]); meDot.setAttribute('cy', p[1]); meDot.setAttribute('r', crouch ? 15 : 19);
    meTx.setAttribute('x', p[0]); meTx.setAttribute('y', p[1] + 5);
    aDot.setAttribute('cx', a[0]); aDot.setAttribute('cy', a[1]);
    aTx.setAttribute('x', a[0]); aTx.setAttribute('y', a[1] + 5);

    helpCard(t < 16 ? 'help' : 'working');
    aliyaCard(t >= 18 && t < 70 ? 'brk' : 'working');

    var loud = t >= 5 && t < 34;
    noise.forEach(function (n, i) {
      show(n, loud);
      if (!loud) return;
      var x = noiseAt[i][0], y = noiseAt[i][1], k = Math.sin(t * 5 + i) * 3;
      n.setAttribute('d', 'M' + x + ' ' + y + ' q6 ' + (-6 - k) + ' 12 0 t12 0 M' + (x + 4) + ' ' + (y - 9) + ' q5 ' + (-5 + k) + ' 10 0');
    });
    path.style.opacity = between(t, 33, 43) ? 1 : 0;
    if (between(t, 24, 30)) {
      sight.setAttribute('x1', p[0]); sight.setAttribute('y1', p[1]);
      sight.setAttribute('x2', 284); sight.setAttribute('y2', 262);
      show(sight, true);
    } else show(sight, false);

    var inCorner = between(t, 42, 58);
    show(phones, inCorner);
    if (inCorner) phones.setAttribute('d', 'M' + (a[0] - 15) + ' ' + (a[1] + 2) + ' a15 15 0 0 1 30 0');
    show(cornerPieBg, inCorner); show(cornerPie, inCorner);
    if (inCorner) cornerPie.setAttribute('d', piePath(590, 274, 14, Math.max(0, 1 - (t - 42.5) / 15)));
    boardPie.setAttribute('d', piePath(446, 58, 20, Math.max(0.05, 0.7 - t / 140)));

    show(bubble, false);
    if (between(t, 26, 32)) say('(thumbs-up)', p[0] + 40, p[1]);
    else if (between(t, 64, 70)) say('First: plug in the battery.|Then: shake it 10 times.', p[0], p[1]);
    else if (between(t, 74, 78)) say('(notes: break, 10:25)', p[0] + 90, p[1]);

    var v = t < 6 ? Math.min(1, (6 - t) / 0.8) : t >= 78 ? Math.min(1, (t - 78) / 0.8) : 0;
    veil.style.opacity = v;
    show(veil, v > 0);
    var lines;
    if (t < 6) {
      vTitle.textContent = 'The break card';
      lines = ['From "I need a break" to back at work', 'P5 class, micro:bit lesson', 'About 90 seconds, captions below', '', ''];
    } else {
      vTitle.textContent = 'The break routine';
      lines = ['1. Turn your card to the blue triangle', '2. Wait for my thumbs-up', '3. Calm corner: turn the 5-minute timer', '4. When the timer runs out, come back', '5. First, Then: one small step'];
    }
    vLines.forEach(function (l, i) { l.textContent = lines[i]; });

    strip.forEach(function (li, i) {
      var on = STEPS.some(function (s) { return s[2] === i && between(t, s[0], s[1]); });
      var done = t >= 78 || STEPS.some(function (s) { return s[2] === i && t >= s[1]; });
      li.className = on ? 'on' : done ? 'done' : '';
    });
    var s = Math.floor(t);
    timeEl.textContent = Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2) + ' / 1:30';
    slider.value = t;
  }

  // Captions, read aloud, play and slides.
  var reading = false, lastSaid = '';
  var canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  var readBtn = document.getElementById('read');
  if (!canSpeak) { readBtn.disabled = true; readBtn.textContent = 'Read aloud: not on this browser'; }
  function speak(text) {
    if (!reading || !canSpeak || text === lastSaid) return;
    lastSaid = text;
    window.speechSynthesis.cancel();
    var u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB'; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }
  function setCaption(text) {
    if (cap.textContent !== text) cap.textContent = text;
    speak(text);
  }

  var t = 0, playing = false, last = 0, speed = 1, slide = 0;
  function frame(now) {
    if (!playing) return;
    t += (now - last) / 1000 * speed;
    last = now;
    if (t >= END) { t = END; playing = false; setButton(); }
    render(t);
    setCaption(captionAt(t));
    if (playing) requestAnimationFrame(frame);
  }
  function setButton() { playBtn.textContent = playing ? 'Pause' : (t >= END ? 'Play again' : 'Play'); }
  function play() {
    if (t >= END) t = 0;
    playing = true; last = performance.now(); setButton();
    requestAnimationFrame(frame);
  }
  function pause() { playing = false; setButton(); }
  function jump(to) { t = to; render(t); setCaption(captionAt(t)); setButton(); }

  playBtn.addEventListener('click', function () { playing ? pause() : play(); });
  slider.addEventListener('input', function () { jump(Number(slider.value)); });
  document.getElementById('speed').addEventListener('change', function (e) { speed = Number(e.target.value); });
  document.getElementById('captions').addEventListener('click', function (e) {
    var on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Captions: on' : 'Captions: off';
    cap.hidden = !on;
  });
  readBtn.addEventListener('click', function () {
    reading = !reading;
    readBtn.setAttribute('aria-pressed', String(reading));
    readBtn.textContent = reading ? 'Read aloud: on' : 'Read aloud: off';
    lastSaid = '';
    if (reading) speak(cap.textContent); else if (canSpeak) window.speechSynthesis.cancel();
  });

  function showSlide(i) {
    slide = Math.max(0, Math.min(SLIDES.length - 1, i));
    var r = SLIDES[slide];
    t = slide === SLIDES.length - 1 ? 85 : slide === 0 ? 1 : r[0] + (r[1] - r[0]) * 0.6;
    render(t);
    var text = CAPS.filter(function (c) { return c[0] >= r[0] && c[0] < r[1]; }).map(function (c) { return c[1]; }).join(' ');
    setCaption(text);
    slideNo.textContent = 'Slide ' + (slide + 1) + ' of ' + SLIDES.length;
    document.getElementById('prev').disabled = slide === 0;
    document.getElementById('next').disabled = slide === SLIDES.length - 1;
  }
  var slidesBtn = document.getElementById('slides');
  slidesBtn.addEventListener('click', function () {
    var on = !player.classList.contains('slides');
    pause();
    player.classList.toggle('slides', on);
    slidesBtn.setAttribute('aria-pressed', String(on));
    slidesBtn.textContent = on ? 'Slides: on' : 'Slides: off';
    if (on) showSlide(0); else jump(0);
  });
  document.getElementById('prev').addEventListener('click', function () { showSlide(slide - 1); });
  document.getElementById('next').addEventListener('click', function () { showSlide(slide + 1); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); });

  render(0);
  setCaption(captionAt(0));
})();
