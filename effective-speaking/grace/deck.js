// The slide deck: one slide at a time, arrow keys, notes and full screen.
(function () {
  var slot = document.getElementById('slot');
  var count = document.getElementById('count');
  var speaker = document.getElementById('speaker');
  var notesBtn = document.getElementById('notes');
  var thumbs = document.getElementById('thumbs');
  var deck = document.getElementById('deck');
  var at = 0;
  var thumbBtns = [];

  function show(i) {
    at = Math.max(0, Math.min(SLIDES.length - 1, i));
    slot.replaceChildren(renderSlide(at));
    count.textContent = 'Slide ' + (at + 1) + ' of ' + SLIDES.length;
    speaker.textContent = 'My note: ' + SLIDES[at].note;
    document.getElementById('prev').disabled = at === 0;
    document.getElementById('next').disabled = at === SLIDES.length - 1;
    thumbBtns.forEach(function (b, k) { b.setAttribute('aria-current', k === at ? 'true' : 'false'); });
  }

  SLIDES.forEach(function (s, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', 'Slide ' + (i + 1));
    b.appendChild(renderSlide(i));
    b.addEventListener('click', function () { show(i); deck.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    li.appendChild(b);
    thumbs.appendChild(li);
    thumbBtns.push(b);
  });

  document.getElementById('prev').addEventListener('click', function () { show(at - 1); });
  document.getElementById('next').addEventListener('click', function () { show(at + 1); });
  notesBtn.addEventListener('click', function () {
    var on = notesBtn.getAttribute('aria-pressed') !== 'true';
    notesBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    speaker.hidden = !on;
  });
  document.getElementById('full').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (deck.requestFullscreen) deck.requestFullscreen().catch(function () {});
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (e.key === ' ' && e.target.closest && e.target.closest('button, a')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); show(at + 1); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(at - 1); }
  });
  var start = parseInt(new URLSearchParams(location.search).get('s'), 10);
  show(isNaN(start) ? 0 : start - 1);
})();
