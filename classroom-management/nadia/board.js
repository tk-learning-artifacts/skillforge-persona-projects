// Now and Next board: a visual schedule with a shrinking timer for the class screen.
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  // Simple line icons, drawn in a 48 by 48 box with the current text colour.
  var ICONS = {
    hello: ['Say hello', '<circle cx="24" cy="16" r="8"/><path d="M10 42 q14 -22 28 0"/><path d="M38 10 l4 -4 M40 16 h6 M38 22 l4 4"/>'],
    watch: ['Watch me', '<path d="M4 24 q20 -20 40 0 q-20 20 -40 0 z"/><circle cx="24" cy="24" r="6"/>'],
    kit: ['Kit out', '<rect x="6" y="24" width="36" height="16" rx="3"/><rect x="16" y="12" width="16" height="14" rx="2"/>'],
    code: ['Code', '<path d="M16 14 l-10 10 l10 10 M32 14 l10 10 l-10 10 M27 10 l-6 28"/>'],
    swap: ['Swap and code', '<path d="M8 18 h28 l-6 -6 M40 30 h-28 l6 6"/>'],
    stretch: ['Brain break', '<circle cx="24" cy="10" r="5"/><path d="M24 16 v14 M24 30 l-8 12 M24 30 l8 12 M10 8 l14 12 l14 -12"/>'],
    test: ['Test', '<rect x="10" y="10" width="28" height="28" rx="4"/><path d="M17 25 l5 5 l9 -11"/>'],
    show: ['Show your learning', '<path d="M6 10 h36 v22 h-20 l-8 8 v-8 h-8 z"/>'],
    pack: ['Pack up', '<path d="M8 18 l16 -8 l16 8 v20 l-16 8 l-16 -8 z M8 18 l16 8 l16 -8 M24 26 v20"/>'],
    read: ['Read', '<path d="M24 12 q-8 -4 -18 -2 v28 q10 -2 18 2 q8 -4 18 -2 v-28 q-10 -2 -18 2 z M24 12 v28"/>']
  };
  var MY_LESSON = [
    ['hello', 'Say hello', 5], ['watch', 'Watch me', 7], ['kit', 'Kit out', 2], ['code', 'Code', 9],
    ['swap', 'Swap and code', 9], ['stretch', 'Brain break', 4], ['test', 'Test and improve', 14],
    ['show', 'Show your learning', 5], ['pack', 'Pack up', 5]
  ];

  function icon(key, cls) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 48 48');
    s.setAttribute('aria-hidden', 'true');
    if (cls) s.setAttribute('class', cls);
    s.innerHTML = '<g fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">' + ICONS[key][1] + '</g>';
    return s;
  }
  function load() {
    try { var v = JSON.parse(localStorage.getItem('nadia-board')); if (Array.isArray(v) && v.length) return v; } catch (e) { /* none saved */ }
    return MY_LESSON.map(function (s) { return s.slice(); });
  }
  function save() { try { localStorage.setItem('nadia-board', JSON.stringify(steps)); } catch (e) { /* private mode */ } }

  var steps = load();
  var current = 0, left = steps[0][2] * 60, running = false, lastTick = 0, warned = false;
  var soundOn = false, fast = false, audio = null;

  var $ = function (id) { return document.getElementById(id); };
  var nowIcon = $('now-icon'), nowWord = $('now-word'), nextIcon = $('next-icon'), nextWord = $('next-word');
  var digits = $('digits'), pie = $('pie'), warn = $('warn'), list = $('plan'), total = $('total'), live = $('live');
  var startBtn = $('start');

  function piePath(frac) {
    var cx = 100, cy = 100, r = 90;
    if (frac >= 0.999) return 'M' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 1 1 ' + (cx - 0.01) + ' ' + (cy - r) + ' Z';
    if (frac <= 0) return '';
    var a = frac * 2 * Math.PI;
    return 'M' + cx + ' ' + cy + ' L' + cx + ' ' + (cy - r) + ' A' + r + ' ' + r + ' 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + (cx + r * Math.sin(a)) + ' ' + (cy - r * Math.cos(a)) + ' Z';
  }
  function swapIcon(holder, key) {
    holder.innerHTML = '';
    holder.appendChild(icon(key, 'icon'));
  }
  function fmt(sec) {
    sec = Math.max(0, Math.ceil(sec));
    return Math.floor(sec / 60) + ':' + ('0' + (sec % 60)).slice(-2);
  }
  function chime(high) {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25].forEach(function (d, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.type = 'sine';
        o.frequency.value = (high ? 784 : 523) * (i ? 1.25 : 1);
        g.gain.setValueAtTime(0.0001, audio.currentTime + d);
        g.gain.exponentialRampToValueAtTime(0.2, audio.currentTime + d + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + d + 0.9);
        o.connect(g); g.connect(audio.destination);
        o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 1);
      });
    } catch (e) { /* no audio here */ }
  }

  function show() {
    var s = steps[current], n = steps[current + 1];
    swapIcon(nowIcon, s[0]);
    nowWord.textContent = s[1];
    if (n) { swapIcon(nextIcon, n[0]); nextWord.textContent = n[1]; }
    else { nextIcon.innerHTML = ''; nextWord.textContent = 'End of the lesson'; }
    digits.textContent = fmt(left);
    pie.setAttribute('d', piePath(left / (s[2] * 60)));
    var two = left <= 120 && left > 0;
    warn.className = 'nn-warn' + (two || left <= 0 ? ' on' : '');
    warn.textContent = left <= 0 ? 'Time is up. That is the end of the plan.' : two ? '2 minutes left. Finish your step.' : '';
    startBtn.textContent = running ? 'Pause' : 'Start';
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.className = i === current ? 'current' : i < current ? 'past' : '';
    });
  }
  function goTo(i) {
    current = Math.max(0, Math.min(steps.length - 1, i));
    left = steps[current][2] * 60;
    warned = false;
    live.textContent = 'Now: ' + steps[current][1] + '.';
    show();
  }
  function tick(now) {
    if (!running) return;
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    left -= dt * (fast ? 30 : 1);
    if (!warned && left <= 120) { warned = true; chime(false); live.textContent = '2 minutes left for ' + steps[current][1] + '.'; }
    if (left <= 0) {
      chime(true);
      if (current < steps.length - 1) goTo(current + 1);
      else { left = 0; running = false; live.textContent = 'The lesson plan is finished.'; }
    }
    show();
    if (running) requestAnimationFrame(tick);
  }

  function renderList() {
    list.innerHTML = '';
    steps.forEach(function (s, i) {
      var li = document.createElement('li');
      var ic = icon(s[0]);
      var sel = document.createElement('select');
      sel.setAttribute('aria-label', 'Picture for step ' + (i + 1));
      Object.keys(ICONS).forEach(function (k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = ICONS[k][0];
        if (k === s[0]) o.selected = true;
        sel.appendChild(o);
      });
      var name = document.createElement('input');
      name.type = 'text'; name.value = s[1]; name.maxLength = 30;
      name.setAttribute('aria-label', 'Words for step ' + (i + 1));
      var mins = document.createElement('input');
      mins.type = 'number'; mins.min = 1; mins.max = 60; mins.value = s[2];
      mins.setAttribute('aria-label', 'Minutes for step ' + (i + 1));
      var del = document.createElement('button');
      del.type = 'button'; del.textContent = '×';
      del.setAttribute('aria-label', 'Remove step ' + (i + 1));
      var cell = document.createElement('div');
      cell.style.display = 'grid'; cell.style.gap = '4px';
      cell.appendChild(name); cell.appendChild(sel);
      li.appendChild(ic); li.appendChild(cell); li.appendChild(mins); li.appendChild(del);
      sel.addEventListener('change', function () { s[0] = sel.value; li.replaceChild(icon(s[0]), li.firstChild); changed(i); });
      name.addEventListener('input', function () { s[1] = name.value || ICONS[s[0]][0]; changed(i, true); });
      mins.addEventListener('change', function () {
        s[2] = Math.max(1, Math.min(60, Math.round(Number(mins.value) || 1)));
        mins.value = s[2]; changed(i); renderTotal();
      });
      del.addEventListener('click', function () {
        if (steps.length < 2) return;
        steps.splice(i, 1);
        if (current >= steps.length) current = steps.length - 1;
        save(); renderList(); goTo(current);
      });
      list.appendChild(li);
    });
    renderTotal();
    show();
  }
  function renderTotal() {
    var sum = steps.reduce(function (n, s) { return n + (Number(s[2]) || 0); }, 0);
    total.textContent = 'Total: ' + sum + ' minutes, ' + steps.length + ' steps.';
  }
  function changed(i, textOnly) {
    save();
    if (i === current && !textOnly && !running) left = steps[current][2] * 60;
    show();
  }

  startBtn.addEventListener('click', function () {
    if (!running && left <= 0) goTo(current);
    running = !running;
    if (running) { lastTick = performance.now(); requestAnimationFrame(tick); }
    show();
  });
  $('next').addEventListener('click', function () { goTo(current + 1); });
  $('prev').addEventListener('click', function () { goTo(current - 1); });
  $('restart').addEventListener('click', function () { running = false; goTo(0); });
  $('add').addEventListener('click', function () { steps.push(['read', 'Read', 5]); save(); renderList(); });
  $('mine').addEventListener('click', function () {
    steps = MY_LESSON.map(function (s) { return s.slice(); });
    running = false; save(); renderList(); goTo(0);
  });
  $('sound').addEventListener('click', function (e) {
    soundOn = !soundOn;
    e.currentTarget.setAttribute('aria-pressed', String(soundOn));
    e.currentTarget.textContent = soundOn ? 'Chime: on' : 'Chime: off';
    if (soundOn) chime(false);
  });
  $('fast').addEventListener('click', function (e) {
    fast = !fast;
    e.currentTarget.setAttribute('aria-pressed', String(fast));
    e.currentTarget.textContent = fast ? 'Try it fast: on' : 'Try it fast: off';
  });
  $('big').addEventListener('click', function (e) {
    var on = !document.body.classList.contains('big-mode');
    document.body.classList.toggle('big-mode', on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Big screen: on' : 'Big screen: off';
    var el = document.documentElement;
    try {
      if (on && el.requestFullscreen) el.requestFullscreen().catch(function () {});
      else if (!on && document.fullscreenElement) document.exitFullscreen().catch(function () {});
    } catch (err) { /* full screen not allowed here */ }
  });
  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && document.body.classList.contains('big-mode')) $('big').click();
  });

  var freezeBtn = $('freeze'), freezeScreen = $('freeze-screen');
  function setFreeze(on) {
    if (on) running = false;
    freezeScreen.hidden = !on;
    document.body.classList.toggle('frozen', on);
    freezeBtn.setAttribute('aria-pressed', String(on));
    live.textContent = on ? 'Freeze. Hands up. Eyes on me.' : 'Now: ' + steps[current][1] + '.';
    if (on) $('unfreeze').focus(); else freezeBtn.focus();
    show();
  }
  freezeBtn.addEventListener('click', function () { setFreeze(freezeScreen.hidden); });
  $('unfreeze').addEventListener('click', function () { setFreeze(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !freezeScreen.hidden) setFreeze(false); });

  renderList();
  goTo(0);
})();
