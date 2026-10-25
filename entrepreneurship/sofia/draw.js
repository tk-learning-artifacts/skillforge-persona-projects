// Draw a Queue Quest card. No repeats until the pile runs out.
(function () {
  var slot = document.getElementById('slot');
  var live = document.getElementById('live');
  var drawBtn = document.getElementById('draw');
  var timerBtn = document.getElementById('timer-btn');
  var timerOut = document.getElementById('timer');
  var filter = 'all';
  var pile = [];
  var current = null;
  var tick = null;

  function allowed(c) {
    if (filter === 'young') return c.age === 4;
    if (filter === 'solo') return !!c.solo;
    return true;
  }

  function refill() {
    pile = QQ.CARDS.filter(allowed).slice();
    for (var i = pile.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pile[i]; pile[i] = pile[j]; pile[j] = t;
    }
  }

  function stopTimer() {
    if (tick) { clearInterval(tick); tick = null; }
    timerOut.textContent = '';
    timerBtn.textContent = current && current.timer ? 'Start ' + current.timer + '-second timer' : 'Start timer';
  }

  function draw() {
    if (!pile.length) refill();
    current = pile.pop();
    stopTimer();
    slot.innerHTML = QQ.face(current);
    timerBtn.hidden = !current.timer;
    var left = pile.length;
    live.textContent = current.name + '. ' + (left ? left + (left === 1 ? ' card' : ' cards') + ' left in this pile.' : 'That was the last one. The next draw shuffles the pile.');
  }

  timerBtn.addEventListener('click', function () {
    if (tick) { stopTimer(); return; }
    var left = current.timer;
    timerOut.textContent = left;
    timerBtn.textContent = 'Stop timer';
    tick = setInterval(function () {
      left -= 1;
      timerOut.textContent = left > 0 ? left : 'Time!';
      if (left <= 0) {
        clearInterval(tick); tick = null;
        timerBtn.textContent = 'Start ' + current.timer + '-second timer';
        live.textContent = 'Time is up.';
      }
    }, 1000);
  });

  document.querySelectorAll('[data-filter]').forEach(function (b) {
    b.addEventListener('click', function () {
      filter = b.getAttribute('data-filter');
      document.querySelectorAll('[data-filter]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      refill();
      live.textContent = pile.length + ' cards fit. Draw one.';
    });
  });

  drawBtn.addEventListener('click', draw);
  refill();
})();
