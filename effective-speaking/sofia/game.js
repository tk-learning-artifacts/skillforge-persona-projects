// The decoder from camp. Read a secret picture from its numbers, or draw your
// own and get its numbers to send to a friend.
(function () {
  var grid = document.getElementById('grid');
  var codes = document.getElementById('codes');
  var status = document.getElementById('status');
  var picks = document.getElementById('picks');
  var cells = [], state = [], target = null, mode = 'read', painting = null;

  for (var i = 0; i < 64; i++) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.i = i;
    b.setAttribute('aria-pressed', 'false');
    b.setAttribute('aria-label', 'Row ' + (Math.floor(i / 8) + 1) + ', square ' + (i % 8 + 1));
    grid.appendChild(b);
    cells.push(b);
    state.push(false);
  }
  var codeSpans = [];
  for (var r = 0; r < 8; r++) { var s = document.createElement('span'); codes.appendChild(s); codeSpans.push(s); }

  function rowString(r) { var out = ''; for (var c = 0; c < 8; c++) out += state[r * 8 + c] ? '#' : '.'; return out; }
  function set(i, on) {
    state[i] = on;
    cells[i].classList.toggle('on', on);
    cells[i].setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function refresh() {
    var done = 0;
    for (var r = 0; r < 8; r++) {
      var mine = encodeRow(rowString(r)).join(' ');
      if (mode === 'read') {
        var want = encodeRow(target.rows[r]).join(' ');
        codeSpans[r].textContent = want;
        var ok = mine === want;
        codeSpans[r].classList.toggle('ok', ok);
        if (ok) done++;
      } else {
        codeSpans[r].textContent = mine;
        codeSpans[r].classList.remove('ok');
      }
    }
    if (mode === 'read') {
      status.classList.toggle('win', done === 8);
      status.textContent = done === 8 ? 'You decoded it: ' + target.answer + '!' : done + ' of 8 rows match. Remember: the first number is always white.';
    } else {
      status.classList.remove('win');
      status.textContent = 'Your numbers are on the left. Read them to a friend, row by row.';
    }
  }
  function clear() { for (var i = 0; i < 64; i++) set(i, false); refresh(); }
  function choose(key, btn) {
    mode = 'read'; target = PICTURES[key];
    Array.prototype.forEach.call(picks.children, function (b) { b.setAttribute('aria-pressed', b === btn ? 'true' : 'false'); });
    clear();
  }

  Object.keys(PICTURES).forEach(function (key, n) {
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = PICTURES[key].name;
    b.addEventListener('click', function () { choose(key, b); });
    picks.appendChild(b);
  });
  var own = document.createElement('button');
  own.type = 'button';
  own.textContent = 'Draw your own';
  own.addEventListener('click', function () {
    mode = 'send';
    Array.prototype.forEach.call(picks.children, function (b) { b.setAttribute('aria-pressed', b === own ? 'true' : 'false'); });
    clear();
  });
  picks.appendChild(own);

  // Tap a square, or drag across several.
  grid.addEventListener('pointerdown', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    e.preventDefault();
    var i = +b.dataset.i;
    painting = !state[i];
    set(i, painting);
    refresh();
  });
  grid.addEventListener('pointermove', function (e) {
    if (painting === null) return;
    var hit = document.elementFromPoint(e.clientX, e.clientY);
    var b = hit && hit.closest && hit.closest('#grid button');
    if (b && state[+b.dataset.i] !== painting) { set(+b.dataset.i, painting); refresh(); }
  });
  document.addEventListener('pointerup', function () { painting = null; });
  grid.addEventListener('click', function (e) {
    // Keyboard presses arrive as clicks with no pointer down.
    if (e.detail !== 0) return;
    var b = e.target.closest('button');
    if (b) { set(+b.dataset.i, !state[+b.dataset.i]); refresh(); }
  });
  document.getElementById('clear').addEventListener('click', clear);
  document.getElementById('reveal').addEventListener('click', function () {
    if (mode !== 'read') return;
    for (var i = 0; i < 64; i++) set(i, target.rows[Math.floor(i / 8)][i % 8] === '#');
    refresh();
  });
  choose('cat', picks.children[1]);
})();
