// Which bin? One item at a time, three big bin buttons, no timer.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var count = 6;
  var queue = [], pos = 0, right = 0, missed = [], answered = false, speakOn = false;
  var binKeys = ['blue', 'general', 'elsewhere'];
  var canSpeak = 'speechSynthesis' in window;
  if (!canSpeak) $('speak').hidden = true;

  // The six-item round keeps two of each bin, so every bin comes up.
  var SIX = ['paper', 'bottle', 'tissue', 'foam', 'battery', 'toy'];

  function say(text) {
    $('live').textContent = text;
    if (speakOn && canSpeak) {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  function byId(id) { return ITEMS.filter(function (it) { return it.id === id; })[0]; }

  // Build the three bin buttons once.
  binKeys.forEach(function (k, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'b-' + k;
    b.dataset.bin = k;
    var key = document.createElement('span'); key.className = 'key'; key.textContent = String(i + 1);
    var name = document.createElement('span'); name.className = 'bname'; name.textContent = BINS[k].name;
    var sub = document.createElement('span'); sub.className = 'bsub'; sub.textContent = BINS[k].sub;
    b.appendChild(key);
    b.appendChild(makeIcon(BINS[k].icon, 52));
    b.appendChild(name);
    b.appendChild(sub);
    b.addEventListener('click', function () { answer(k, b); });
    $('bins').appendChild(b);
  });

  function start(list) {
    queue = shuffle(list.slice());
    pos = 0; right = 0; missed = [];
    $('done').hidden = true;
    $('stage').hidden = false;
    show();
  }

  function show() {
    var it = queue[pos];
    answered = false;
    $('progress').textContent = 'Thing ' + (pos + 1) + ' of ' + queue.length;
    var pic = $('item-pic');
    while (pic.firstChild) pic.removeChild(pic.firstChild);
    pic.appendChild(makeIcon(it.id, 104));
    pic.classList.add('pop');
    setTimeout(function () { pic.classList.remove('pop'); }, 200);
    $('item-name').textContent = it.name;
    $('feedback').hidden = true;
    $('feedback').className = 'feedback';
    Array.prototype.forEach.call($('bins').children, function (b) { b.disabled = false; b.classList.remove('picked'); });
    say(it.name + '. Which bin?');
  }

  function answer(k, btn) {
    if (answered) return;
    answered = true;
    var it = queue[pos];
    var ok = k === it.bin;
    if (ok) right++; else missed.push(it);
    Array.prototype.forEach.call($('bins').children, function (b) { b.disabled = true; });
    btn.classList.add('picked');
    $('feedback').hidden = false;
    $('feedback').classList.add(ok ? 'yes' : 'no');
    $('verdict').textContent = ok ? 'Yes. ' + BINS[k].name + '.' : 'Not this time. It goes in: ' + BINS[it.bin].name + '.';
    $('why').textContent = it.why;
    $('next').textContent = pos + 1 < queue.length ? 'Next' : 'See how I did';
    say($('verdict').textContent + ' ' + it.why);
    $('next').focus();
  }

  function next() {
    if (!answered) return;
    pos++;
    if (pos < queue.length) { show(); $('bins').firstChild.focus(); return; }
    finish();
  }

  function finish() {
    $('stage').hidden = true;
    $('done').hidden = false;
    var total = queue.length;
    $('score').textContent = 'You sorted ' + right + ' of ' + total + ' right.';
    var list = $('missed');
    while (list.firstChild) list.removeChild(list.firstChild);
    missed.forEach(function (it) {
      var li = document.createElement('li');
      li.appendChild(makeIcon(it.id, 44));
      var t = document.createElement('span');
      t.textContent = it.name + ': ' + BINS[it.bin].name + '.';
      li.appendChild(t);
      list.appendChild(li);
    });
    $('retry').hidden = missed.length === 0;
    $('missed-head').hidden = missed.length === 0;
    var msg = $('score').textContent + (missed.length ? ' ' + missed.length + ' to try again.' : ' Every one.');
    say(msg);
    $('done').querySelector('button:not([hidden])').focus();
  }

  function fullList() { return count === 6 ? SIX.map(byId) : ITEMS.slice(); }

  $('next').addEventListener('click', next);
  $('retry').addEventListener('click', function () { start(missed); });
  $('restart').addEventListener('click', function () { start(fullList()); });

  document.querySelectorAll('[data-count]').forEach(function (b) {
    b.addEventListener('click', function () {
      count = Number(b.dataset.count);
      document.querySelectorAll('[data-count]').forEach(function (o) { o.setAttribute('aria-checked', String(o === b)); });
      start(fullList());
    });
  });

  $('speak').addEventListener('click', function () {
    speakOn = !speakOn;
    $('speak').setAttribute('aria-pressed', String(speakOn));
    if (!speakOn && canSpeak) window.speechSynthesis.cancel();
    else if (!$('stage').hidden) say(queue[pos].name + '. Which bin?');
  });
  $('big').addEventListener('click', function () {
    var on = document.body.classList.toggle('big');
    $('big').setAttribute('aria-pressed', String(on));
  });

  document.addEventListener('keydown', function (e) {
    if ($('stage').hidden) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    var n = ['1', '2', '3'].indexOf(e.key);
    if (n >= 0 && !answered) { answer(binKeys[n], $('bins').children[n]); e.preventDefault(); }
    else if (e.key === 'Enter' && answered && document.activeElement !== $('next')) { next(); e.preventDefault(); }
  });

  start(fullList());
})();
