// Plays the storyboard frames one at a time, like a short film.
(function () {
  'use strict';
  var frames = Array.prototype.slice.call(document.querySelectorAll('#film .frame'));
  var i = 0, timer = null;
  var $ = function (id) { return document.getElementById(id); };
  $('film-controls').hidden = false;
  function show(n) {
    i = Math.max(0, Math.min(frames.length - 1, n));
    frames.forEach(function (f, k) { f.hidden = k !== i; });
    $('prog').value = i + 1;
    $('count').textContent = (i + 1) + ' of ' + frames.length;
  }
  function stop() { clearInterval(timer); timer = null; $('play').textContent = 'Play'; }
  function play() {
    if (i === frames.length - 1) show(0);
    $('play').textContent = 'Pause';
    timer = setInterval(function () {
      if (i >= frames.length - 1) stop(); else show(i + 1);
    }, 6000);
  }
  $('play').addEventListener('click', function () { if (timer) stop(); else play(); });
  $('prev').addEventListener('click', function () { stop(); show(i - 1); });
  $('next').addEventListener('click', function () { stop(); show(i + 1); });
  show(0);
})();
