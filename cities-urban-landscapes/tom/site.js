// Map layers, count points and the time-slot bars on the site analysis page.
// All counts here are made up for this example project.
(function () {
  var map = document.getElementById('map');
  var today = document.getElementById('show-today');
  var proposal = document.getElementById('show-new');
  function layer(showNew) {
    map.classList.toggle('show-new', showNew);
    today.setAttribute('aria-pressed', String(!showNew));
    proposal.setAttribute('aria-pressed', String(showNew));
  }
  today.addEventListener('click', function () { layer(false); });
  proposal.addEventListener('click', function () { layer(true); });

  var points = [
    { name: 'Point 1: the side gate',
      lines: ['1.40 pm: 312 people came out in 20 minutes. 298 were students.',
        'Students leave in one wave. About 70 turn off to Block 1 before point 2.',
        'Proposal: two exit times, 10 minutes apart, by level.'] },
    { name: 'Point 2: the pinch point',
      lines: ['Bicycle racks and a lamp post leave 1.1 m clear.',
        '1.40 pm: 41 people stepped onto the grass or kerb to get past.',
        '9.30 am: 18 older residents and 2 people with walking aids passed.',
        'Proposal: move the 6 racks onto the verge, for 1.8 m clear.'] },
    { name: 'Point 3: the bus stop',
      lines: ['The shelter fits about 20 people standing.',
        'Peak crowd: 64 at 1.52 pm. About 44 waited in the sun or on the kerb.',
        'Proposal: student marshals now, and a marked queue lane if LTA agrees.'] }
  ];
  var info = document.getElementById('pt-info');
  function showPoint(i) {
    var p = points[i];
    info.innerHTML = '<p><strong>' + p.name + '</strong></p><ul class="tight">' +
      p.lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
  }
  Array.prototype.forEach.call(document.querySelectorAll('.pt'), function (c) {
    var i = Number(c.getAttribute('data-pt'));
    c.addEventListener('click', function () { showPoint(i); });
    c.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPoint(i); }
    });
  });
  showPoint(1);

  // Point 2 counts, 20 minutes, average of 2 days.
  var slots = [
    { time: '7.00 am', students: 132, adults: 9, older: 3, aids: 0, off: 6,
      note: 'Students arrive spread over 40 minutes, so the path copes.' },
    { time: '9.30 am', students: 0, adults: 14, older: 18, aids: 2, off: 0,
      note: 'The quiet hour. Most users are older residents walking to the market.' },
    { time: '1.40 pm', students: 226, adults: 6, older: 4, aids: 1, off: 41,
      note: 'Dismissal. 41 people stepped off the path in 20 minutes.' },
    { time: '4.30 pm', students: 58, adults: 15, older: 9, aids: 1, off: 2,
      note: 'CCA ends. A mix of students and residents, with room for both.' }
  ];
  var groups = [['students', 'Students'], ['adults', 'Adults'], ['older', 'Older'],
    ['aids', 'Walking aid, wheelchair or pram'], ['off', 'Stepped off']];
  var bars = document.getElementById('slot-bars');
  var note = document.getElementById('slot-note');
  var max = 240;
  function showSlot(i) {
    var s = slots[i];
    bars.innerHTML = groups.map(function (g) {
      var v = s[g[0]];
      return '<div class="bar-row"><span>' + g[1] + '</span><div class="bar-track">' +
        '<div class="bar-fill' + (g[0] === 'off' ? ' warn' : '') + '" style="width:' + (v / max * 100) + '%"></div>' +
        '<span class="bar-val">' + v + '</span></div></div>';
    }).join('');
    note.textContent = s.time + ': ' + s.note;
    Array.prototype.forEach.call(document.querySelectorAll('[data-slot]'), function (b) {
      b.setAttribute('aria-pressed', String(Number(b.getAttribute('data-slot')) === i));
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll('[data-slot]'), function (b) {
    b.addEventListener('click', function () { showSlot(Number(b.getAttribute('data-slot'))); });
  });
  document.getElementById('slot-table').innerHTML = slots.map(function (s) {
    return '<tr><td>' + s.time + '</td><td class="num">' + s.students + '</td><td class="num">' + s.adults +
      '</td><td class="num">' + s.older + '</td><td class="num">' + s.aids + '</td><td class="num">' + s.off + '</td></tr>';
  }).join('');
  showSlot(2);
})();
