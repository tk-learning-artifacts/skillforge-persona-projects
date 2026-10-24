// Switches the cross-section drawing between today and each phase.
(function () {
  var notes = [
    'Today: racks and a lamp post leave 1.1 m. At 1.40 pm, 41 people stepped off in 20 minutes.',
    'Phase 1: the space is the same, but half as many people pass at once.',
    'Phase 2: racks move to the verge, so 1.8 m is clear. Two people can pass a walking frame.',
    'Phase 3: a roof over the 138 m that has no shade today.'
  ];
  var groups = document.querySelectorAll('#section [data-show]');
  var buttons = document.querySelectorAll('[data-sec]');
  var note = document.getElementById('sec-note');
  function show(i) {
    Array.prototype.forEach.call(groups, function (g) {
      g.style.display = g.getAttribute('data-show').split(' ').indexOf(String(i)) >= 0 ? '' : 'none';
    });
    Array.prototype.forEach.call(buttons, function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-sec')) === i));
    });
    note.textContent = notes[i];
  }
  Array.prototype.forEach.call(buttons, function (b) {
    b.addEventListener('click', function () { show(Number(b.getAttribute('data-sec'))); });
  });
  show(0);
})();
