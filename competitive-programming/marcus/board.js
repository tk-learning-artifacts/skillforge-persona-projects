// Sprint board: a countdown and a live ranking for the end-of-session sprint.
// A pair's score is the number of USACO test cases its best submission
// passes. Ties go to whoever reached that score first. Nothing is saved.
(function () {
  var PRESETS = [
    { id: 'w1', label: 'Week 1 sprint: The Bucket List', name: 'The Bucket List', url: 'http://www.usaco.org/index.php?page=viewproblem2&cpid=856', tests: 10 },
    { id: 'w2', label: 'Week 2 sprint: Daisy Chains', name: 'Daisy Chains', url: 'http://www.usaco.org/index.php?page=viewproblem2&cpid=1060', tests: 10 },
    { id: 'w3', label: 'Week 3 sprint: Counting Haybales', name: 'Counting Haybales', url: 'http://www.usaco.org/index.php?page=viewproblem2&cpid=666', tests: 10 },
    { id: 'w4', label: 'Week 4 sprint: Mooyo Mooyo', name: 'Mooyo Mooyo', url: 'http://www.usaco.org/index.php?page=viewproblem2&cpid=860', tests: 10 }
  ];
  var root = document.getElementById('board');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };

  var preset = PRESETS[0];
  var duration = 15 * 60;
  var elapsed = 0;
  var running = false;
  var lastTick = 0;
  var timerId = null;
  var pairs = [];

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function say(text) { $('board-live').textContent = text; }

  function makePairs(n) {
    var old = pairs;
    pairs = [];
    for (var i = 0; i < n; i++) {
      pairs.push({ name: old[i] ? old[i].name : 'Pair ' + (i + 1), tests: 0, at: null });
    }
  }

  function ranked() {
    var order = pairs.map(function (p, i) { return i; });
    order.sort(function (a, b) {
      var A = pairs[a], B = pairs[b];
      if (B.tests !== A.tests) return B.tests - A.tests;
      if (A.tests === 0) return a - b;
      return A.at - B.at;
    });
    var rank = {};
    order.forEach(function (idx, pos) {
      var prev = order[pos - 1];
      if (pos > 0 && pairs[prev].tests === pairs[idx].tests && (pairs[idx].tests === 0 || pairs[prev].at === pairs[idx].at)) {
        rank[idx] = rank[prev];
      } else {
        rank[idx] = pos + 1;
      }
    });
    return { order: order, rank: rank };
  }

  function renderClock() {
    var left = duration - elapsed;
    var clock = $('clock');
    clock.textContent = fmt(left);
    clock.classList.toggle('done', left <= 0);
    $('start').textContent = running ? 'Pause' : (elapsed > 0 && left > 0 ? 'Resume' : 'Start');
    $('start').disabled = left <= 0;
  }

  function renderPairs() {
    var list = $('pairs');
    var r = ranked();
    var over = elapsed >= duration;
    list.textContent = '';
    pairs.forEach(function (p, i) {
      var li = document.createElement('li');
      li.className = 'pair' + (p.tests === preset.tests ? ' full' : '');
      var rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = p.tests ? String(r.rank[i]) : '-';
      rank.setAttribute('aria-label', p.tests ? 'Rank ' + r.rank[i] : 'No score yet');
      var name = document.createElement('input');
      name.type = 'text';
      name.value = p.name;
      name.maxLength = 24;
      name.setAttribute('aria-label', 'Name of pair ' + (i + 1));
      name.addEventListener('change', function () { p.name = name.value.trim() || 'Pair ' + (i + 1); renderStandings(); });
      var time = document.createElement('span');
      time.className = 'time';
      time.textContent = p.at === null ? 'No passing tests yet' : 'Reached ' + fmt(p.at) + ' in';
      var tests = document.createElement('span');
      tests.className = 'tests';
      var minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.setAttribute('aria-label', 'One test fewer for ' + p.name);
      minus.disabled = p.tests === 0;
      var out = document.createElement('output');
      out.textContent = p.tests + '/' + preset.tests;
      var plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.setAttribute('aria-label', 'One more test passed for ' + p.name);
      plus.disabled = p.tests >= preset.tests || over;
      minus.setAttribute('data-i', i); minus.setAttribute('data-d', '-1');
      plus.setAttribute('data-i', i); plus.setAttribute('data-d', '1');
      minus.addEventListener('click', function () { change(i, -1); });
      plus.addEventListener('click', function () { change(i, 1); });
      tests.appendChild(minus); tests.appendChild(out); tests.appendChild(plus);
      li.appendChild(rank); li.appendChild(name); li.appendChild(time); li.appendChild(tests);
      list.appendChild(li);
    });
    renderStandings();
  }

  function renderStandings() {
    var r = ranked();
    var ol = $('standings');
    ol.textContent = '';
    if (!pairs.some(function (p) { return p.tests > 0; })) {
      var none = document.createElement('li');
      none.textContent = 'No scores yet.';
      ol.appendChild(none);
      return;
    }
    r.order.slice(0, 3).forEach(function (i) {
      if (!pairs[i].tests) return;
      var p = pairs[i];
      var li = document.createElement('li');
      li.textContent = p.tests ? p.name + ': ' + p.tests + ' of ' + preset.tests + ' tests, ' + fmt(p.at) + ' in' : p.name + ': no tests yet';
      ol.appendChild(li);
    });
  }

  function change(i, delta) {
    var p = pairs[i];
    var next = Math.min(preset.tests, Math.max(0, p.tests + delta));
    if (next === p.tests) return;
    p.tests = next;
    // A better score is stamped with the time now. Taking one back (a typo)
    // keeps the old time, unless the score drops to 0.
    if (delta > 0) p.at = Math.min(elapsed, duration);
    if (p.tests === 0) p.at = null;
    renderPairs();
    // The rows are rebuilt, so put keyboard focus back on the same button.
    var list = $('pairs');
    var same = list.querySelector('button[data-i="' + i + '"][data-d="' + delta + '"]');
    var other = list.querySelector('button[data-i="' + i + '"][data-d="' + (-delta) + '"]');
    if (same && !same.disabled) same.focus();
    else if (other && !other.disabled) other.focus();
    var r = ranked();
    say(p.name + ': ' + p.tests + ' of ' + preset.tests + ' tests' + (p.tests ? ', rank ' + r.rank[i] + '.' : '.'));
  }

  function tick(now) {
    if (!running) return;
    elapsed += (now - lastTick) / 1000;
    lastTick = now;
    if (elapsed >= duration) {
      elapsed = duration;
      running = false;
      renderClock();
      renderPairs();
      var r = ranked();
      var top = pairs[r.order[0]];
      say('Time. ' + (top.tests ? top.name + ' wins with ' + top.tests + ' of ' + preset.tests + ' tests.' : 'Nobody scored this time.'));
      return;
    }
    var before = $('clock').textContent;
    renderClock();
    if ($('clock').textContent !== before) {
      var left = Math.round(duration - elapsed);
      if (left === 60) say('One minute left.');
    }
    timerId = requestAnimationFrame(tick);
  }

  $('start').addEventListener('click', function () {
    if (running) {
      running = false;
      cancelAnimationFrame(timerId);
      say('Paused at ' + fmt(duration - elapsed) + ' left.');
    } else {
      running = true;
      lastTick = performance.now();
      say(elapsed > 0 ? 'Resumed.' : 'Go. ' + fmt(duration) + ' on the clock.');
      timerId = requestAnimationFrame(tick);
    }
    renderClock();
  });

  $('reset').addEventListener('click', function () {
    running = false;
    cancelAnimationFrame(timerId);
    elapsed = 0;
    pairs.forEach(function (p) { p.tests = 0; p.at = null; });
    renderClock(); renderPairs();
    say('Board cleared. Clock back to ' + fmt(duration) + '.');
  });

  $('preset').addEventListener('change', function () {
    preset = PRESETS.filter(function (p) { return p.id === $('preset').value; })[0];
    showPreset();
    $('reset').click();
  });
  $('minutes').addEventListener('change', function () {
    duration = parseInt($('minutes').value, 10) * 60;
    $('reset').click();
  });
  $('count').addEventListener('change', function () {
    makePairs(parseInt($('count').value, 10));
    renderPairs();
  });

  $('example').addEventListener('click', function () {
    running = false;
    cancelAnimationFrame(timerId);
    makePairs(8);
    $('count').value = '8';
    duration = 15 * 60;
    $('minutes').value = '15';
    var made = [[10, 371], [7, 512], [10, 655], [3, 140], [7, 430], [0, null], [10, 802], [5, 610]];
    pairs.forEach(function (p, i) { p.tests = made[i][0]; p.at = made[i][1]; });
    elapsed = duration;
    renderClock(); renderPairs();
    say('Example loaded: the sprint is over. These scores are made up.');
  });

  function showPreset() {
    var a = $('problem-link');
    a.textContent = preset.name;
    a.href = preset.url;
    $('problem-tests').textContent = preset.tests;
  }

  PRESETS.forEach(function (p) {
    var o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.label;
    $('preset').appendChild(o);
  });
  var q = new URLSearchParams(location.search);
  var want = PRESETS.filter(function (p) { return p.id === q.get('week'); })[0];
  if (want) { preset = want; $('preset').value = want.id; }
  makePairs(8);
  showPreset();
  renderClock();
  renderPairs();
  if (q.get('example') === '1') $('example').click();
})();
