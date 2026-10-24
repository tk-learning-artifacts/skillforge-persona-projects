// Laser Slot mock-up: the paper version as tested, and the final version.
(function () {
  var PAPER = new URLSearchParams(location.search).get('v') === 'paper';
  var app = document.getElementById('app');

  // Made-up week. Slots run after school and are 30 minutes each.
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var TIMES = ['3:00', '3:30', '4:00'];
  var END = { '3:00': '3:30', '3:30': '4:00', '4:00': '4:30' };
  var TAKEN = { 'Monday 3:00': 1, 'Tuesday 4:00': 1, 'Wednesday 3:30': 1, 'Thursday 3:00': 1, 'Friday 3:30': 1 };
  var MATERIALS = PAPER
    ? [['ply', 'Plywood 3 mm'], ['pmma', 'PMMA 3 mm'], ['card', 'Card']]
    : [['ply', 'Plywood 3 mm'], ['pmma', 'Acrylic 3 mm (PMMA, also sold as Perspex)'], ['card', 'Card']];

  var s = { screen: 'home', slot: null, material: null, booking: null, trained: false, err: '', confirmCancel: false, msg: '' };

  document.querySelectorAll('.switch a').forEach(function (a) {
    if ((a.dataset.v === 'paper') === PAPER) a.setAttribute('aria-current', 'page');
  });
  document.getElementById('frame').classList.toggle('final', !PAPER);
  document.getElementById('v-note').textContent = PAPER
    ? 'The paper version, as my 5 testers saw it. I have kept its problems on purpose.'
    : 'The final version, with the fixes from testing. Everything here is made up.';

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function matName(id) { return MATERIALS.filter(function (m) { return m[0] === id; })[0][1]; }
  var LOGO = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h16M7 20V9l5-5 5 5v11" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 9v6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  var LASER = '<svg viewBox="0 0 40 40" aria-hidden="true"><rect x="3" y="10" width="34" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="3"/><path d="M8 16h24" stroke="currentColor" stroke-width="3"/><path d="M20 16v8" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2"/><circle cx="20" cy="26" r="2.5" fill="currentColor"/></svg>';
  var brand = '<p class="brandbar">' + LOGO + 'Kestrel Maker Lab</p>';

  // ---------- Final version ----------
  var F = {
    home: function () {
      var h = brand;
      if (s.booking) {
        var b = s.booking;
        h += '<div class="booking"><p class="label">✓ Your booking</p><dl>' +
          '<dt>Machine</dt><dd>Laser cutter</dd><dt>When</dt><dd>' + b.day + ', ' + b.time + ' to ' + END[b.time] + ' pm</dd>' +
          '<dt>Where</dt><dd>Maker Lab</dd><dt>Material</dt><dd>' + esc(matName(b.material)) + '</dd>' +
          '<dt>Bring</dt><dd>Your design file and your sheet</dd></dl>';
        h += s.confirmCancel
          ? '<div class="confirm-box"><p>Cancel ' + b.day + ' at ' + b.time + '?</p><div class="row"><button type="button" class="yes" data-act="cancel-yes">Yes, cancel</button><button type="button" class="no" data-act="cancel-no">Keep it</button></div></div>'
          : '<button type="button" class="secondary" data-act="cancel">Cancel booking</button>';
        h += '</div>';
      }
      h += '<h2 tabindex="-1">Book a machine</h2>' +
        '<button type="button" class="machine" data-go="safety">' + LASER + '<span><b>Laser cutter</b><span>30-minute slots after school</span></span></button>' +
        '<p class="muted">Only the laser cutter works in this mock-up.</p>';
      return h;
    },
    safety: function () {
      return brand + '<button type="button" class="back" data-go="home">← Back</button>' +
        '<h2 tabindex="-1">Have you done the laser cutter safety session?</h2>' +
        '<p class="muted">You must do it once before you book.</p>' +
        '<button type="button" class="primary" data-act="trained">Yes, I have</button>' +
        '<button type="button" class="secondary" data-go="untrained">Not yet</button>';
    },
    untrained: function () {
      return brand + '<button type="button" class="back" data-go="safety">← Back</button>' +
        '<h2 tabindex="-1">Do the safety session first</h2>' +
        '<p>It takes 30 minutes. The technician shows you how to run the cutter safely. Then you can book.</p>' +
        '<p><strong>Next sessions</strong></p><ul class="sessions"><li>Monday, 1:30 pm</li><li>Wednesday, 3:00 pm</li></ul>' +
        '<p class="muted">Sign up at the Maker Lab door. No booking is made yet.</p>' +
        '<button type="button" class="secondary" data-go="home">Back to start</button>';
    },
    slots: function () {
      var h = brand + '<button type="button" class="back" data-go="safety">← Back</button>' +
        '<h2 tabindex="-1">Pick a slot</h2><p class="muted">This week. Each slot is 30 minutes.</p>';
      DAYS.forEach(function (d) {
        h += '<p class="day">' + d + '</p><div class="slots">';
        TIMES.forEach(function (t) {
          var k = d + ' ' + t;
          h += TAKEN[k] || (s.booking && s.booking.day + ' ' + s.booking.time === k)
            ? '<div class="slot"><span>' + t + '</span><small>Taken</small></div>'
            : '<button type="button" class="slot" data-slot="' + k + '" aria-label="' + d + ' ' + t + ' pm, free">' + t + '<small>Free</small></button>';
        });
        h += '</div>';
      });
      return h;
    },
    material: function () {
      var h = brand + '<button type="button" class="back" data-go="slots">← Back to slots</button>' +
        '<p class="muted">' + s.slot.replace(' ', ', ') + ' pm</p>' +
        '<fieldset aria-describedby="mat-err"><legend tabindex="-1">What will you cut?</legend>';
      MATERIALS.forEach(function (m) {
        h += '<label class="choice"><input type="radio" name="mat" value="' + m[0] + '"' + (s.material === m[0] ? ' checked' : '') + '>' + esc(m[1]) + '</label>';
      });
      h += '</fieldset><p class="err" id="mat-err">' + esc(s.err) + '</p>' +
        '<div class="nope"><b>Not allowed in our lab</b><ul><li>PVC and vinyl. They give off a toxic gas when cut.</li><li>Foam. Some foams give off toxic gases too.</li></ul></div>' +
        '<p class="muted">Not sure what your sheet is? Ask the technician before you book.</p>' +
        '<button type="button" class="primary" data-act="mat-next">Next</button>';
      return h;
    },
    confirm: function () {
      var parts = s.slot.split(' ');
      return brand + '<button type="button" class="back" data-go="material">← Back</button>' +
        '<h2 tabindex="-1">Check and book</h2>' +
        '<dl class="summary"><dt>Machine</dt><dd>Laser cutter</dd><dd></dd>' +
        '<dt>When</dt><dd>' + parts[0] + ', ' + parts[1] + ' to ' + END[parts[1]] + ' pm</dd><dd><button type="button" data-go="slots" aria-label="Change the time">Change</button></dd>' +
        '<dt>Material</dt><dd>' + esc(matName(s.material)) + '</dd><dd><button type="button" data-go="material" aria-label="Change the material">Change</button></dd></dl>' +
        '<div class="safety-box"><strong>At the cutter</strong><ul class="sessions"><li>A trained adult is with you.</li><li>The extraction fan is on before you start.</li><li>Never leave the cutter while it runs.</li></ul></div>' +
        '<button type="button" class="primary" data-act="book">Book it</button>';
    }
  };

  // ---------- Paper version, as tested ----------
  var P = {
    home: function () {
      return brand + '<h2 tabindex="-1">Book a machine</h2>' +
        '<button type="button" class="primary" data-go="slots">Laser cutter</button>' +
        '<button type="button" class="secondary" data-go="menu">Menu</button>';
    },
    menu: function () {
      return brand + '<button type="button" class="back" data-go="home">&lt; Back</button><h2 tabindex="-1">Menu</h2>' +
        '<button type="button" class="secondary" data-go="mine">My bookings</button>' +
        '<button type="button" class="secondary" data-go="home">Help</button>';
    },
    mine: function () {
      var h = brand + '<button type="button" class="back" data-go="menu">&lt; Menu</button><h2 tabindex="-1">My bookings</h2>';
      if (!s.booking) return h + '<p>None.</p>';
      return h + '<div class="box" style="padding:10px">Laser cutter<br>' + s.booking.day.slice(0, 3) + ' ' + s.booking.time + '</div>' +
        '<button type="button" class="secondary" data-act="cancel-yes">Cancel</button>';
    },
    slots: function () {
      var h = brand + '<button type="button" class="back" data-go="home">&lt; Laser cutter</button><h2 tabindex="-1">Pick a slot</h2><div class="grid"><span></span>';
      DAYS.forEach(function (d) { h += '<span class="h">' + d.slice(0, 3) + '</span>'; });
      TIMES.forEach(function (t) {
        h += '<span>' + t + '</span>';
        DAYS.forEach(function (d) {
          var k = d + ' ' + t, taken = TAKEN[k] || (s.booking && s.booking.day + ' ' + s.booking.time === k);
          h += '<button type="button" class="' + (taken ? 'taken' : '') + '" data-pslot="' + k + '" aria-pressed="' + (s.slot === k) + '" aria-label="' + d + ' ' + t + '"></button>';
        });
      });
      h += '</div><p class="muted" style="margin-top:10px">Each slot is 30 minutes.</p>' +
        '<p class="err">' + esc(s.err) + '</p><button type="button" class="primary" data-act="p-slot-next">Next</button>';
      return h;
    },
    material: function () {
      var h = brand + '<button type="button" class="back" data-go="slots">&lt; Slots</button><fieldset><legend tabindex="-1">What will you cut?</legend>';
      MATERIALS.forEach(function (m) {
        h += '<label class="choice"><input type="radio" name="mat" value="' + m[0] + '"' + (s.material === m[0] ? ' checked' : '') + '>' + esc(m[1]) + '</label>';
      });
      return h + '</fieldset><p class="muted">Not on the list? Ask the technician.</p><p class="err">' + esc(s.err) + '</p>' +
        '<button type="button" class="primary" data-act="mat-next">Next</button>';
    },
    confirm: function () {
      var parts = s.slot.split(' ');
      return brand + '<button type="button" class="back" data-go="material">&lt; Material</button><h2 tabindex="-1">Check and book</h2>' +
        '<div class="box" style="padding:10px;margin-bottom:12px">Laser cutter<br>' + parts[0].slice(0, 3) + ', ' + parts[1] + ' pm<br>' + esc(matName(s.material)) + '</div>' +
        '<label class="tick"><input type="checkbox" id="p-trained"' + (s.trained ? ' checked' : '') + '> I have done the safety session</label>' +
        '<p class="err">' + esc(s.err) + '</p><button type="button" class="primary" data-act="p-book">Book it</button>';
    },
    done: function () {
      return brand + '<h2 tabindex="-1">Done</h2><button type="button" class="secondary" data-go="home">OK</button>';
    }
  };

  var V = PAPER ? P : F;
  function render(focus) {
    app.className = 'kapp' + (PAPER ? ' paper' : '');
    app.innerHTML = V[s.screen]() + '<p class="live" aria-live="polite">' + esc(s.msg) + '</p>';
    s.msg = '';
    if (focus) {
      var el = typeof focus === 'string' ? app.querySelector(focus) : app.querySelector('h2, legend');
      if (el) el.focus();
    }
  }
  function go(screen) { s.screen = screen; s.err = ''; s.confirmCancel = false; render(true); }

  app.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    var act = b.dataset.act;
    if (b.dataset.go) return go(b.dataset.go);
    if (b.dataset.slot) { s.slot = b.dataset.slot; s.material = null; return go('material'); }
    if (b.dataset.pslot) {
      if (b.classList.contains('taken')) return; // paper version: grey does nothing, and says nothing
      s.slot = b.dataset.pslot; s.err = ''; return render('[data-pslot="' + s.slot + '"]');
    }
    if (act === 'trained') return go('slots');
    if (act === 'p-slot-next') { if (!s.slot) { s.err = 'Pick a slot.'; return render('.primary'); } return go('material'); }
    if (act === 'mat-next') {
      var c = app.querySelector('input[name=mat]:checked');
      if (!c) { s.err = 'Choose a material first.'; return render('input[name=mat]'); }
      s.material = c.value; return go('confirm');
    }
    if (act === 'book' || act === 'p-book') {
      if (act === 'p-book') {
        s.trained = app.querySelector('#p-trained').checked;
        if (!s.trained) { s.err = 'You must do the safety session first.'; return render('#p-trained'); }
      }
      var p = s.slot.split(' ');
      s.booking = { day: p[0], time: p[1], material: s.material };
      s.slot = null;
      if (PAPER) return go('done');
      s.msg = 'Booked: ' + p[0] + ' at ' + p[1] + ' pm.';
      return go('home');
    }
    if (act === 'cancel') { s.confirmCancel = true; return render('.confirm-box .no'); }
    if (act === 'cancel-no') { s.confirmCancel = false; return render('[data-act=cancel]'); }
    if (act === 'cancel-yes') { s.booking = null; s.confirmCancel = false; s.msg = 'Booking cancelled.'; return render(PAPER ? '.back' : 'h2'); }
  });

  render(false);

  // ---------- Checks (final version only) ----------
  var area = document.getElementById('check-area');
  if (PAPER) {
    area.innerHTML = '<p>Paper has one colour: pencil. Switch to the <a href="prototype.html#checks">final version</a> to run the contrast and label checks.</p>';
    return;
  }
  var PAL = {
    light: { ink: '#1b1f24', ink2: '#414a55', muted: '#5b6470', ground: '#ffffff', surface: '#f2f4f7', brand: '#b23a0b', 'brand-soft': '#fdeee6',
      free: '#0e6b3d', 'free-soft': '#e2f4e9', taken: '#4b5563', 'taken-bg': '#e6e9ee', danger: '#a3271c', 'danger-soft': '#fbe9e7' },
    dark: { ink: '#eef1f5', ink2: '#c4cbd4', muted: '#9ea7b3', ground: '#14171b', surface: '#1e2329', brand: '#ff9e6e', 'brand-soft': '#3a2216',
      free: '#86dcaa', 'free-soft': '#15301f', taken: '#b9c1cc', 'taken-bg': '#2a3038', danger: '#ff9d92', 'danger-soft': '#3a1c19' }
  };
  var TEXT = [
    ['Body text', 'ink', 'ground', false], ['Text on a card', 'ink', 'surface', false], ['Small labels on a card', 'ink2', 'surface', false],
    ['Hints', 'muted', 'ground', false], ['Back links and "Change"', 'brand', 'ground', false], ['Button text', 'ground', 'brand', false],
    ['Chosen material', 'ink', 'brand-soft', false], ['"Free" on a slot', 'free', 'free-soft', false], ['"Taken" on a slot', 'taken', 'taken-bg', false],
    ['"Not allowed" box', 'danger', 'danger-soft', false], ['Booking card label', 'free', 'free-soft', false]
  ];
  var UI = [
    ['Free slot border', 'free', 'ground'], ['Taken slot border', 'taken', 'ground'], ['Material choice border, chosen', 'brand', 'brand-soft'],
    ['Cancel button border', 'danger', 'free-soft'], ['Main button edge', 'brand', 'ground']
  ];
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { return parseInt(hex.substr(i, 2), 16) / 255; })
      .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function ratio(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function row(ok, html) { return '<li><span class="' + (ok ? 'pass">Pass' : 'fail">Fail') + '</span><span>' + html + '</span></li>'; }
  function sw(c) { return '<span class="sw" style="background:' + c + '"></span>'; }
  function nameOf(el) {
    var n = el.getAttribute('aria-label') || el.textContent;
    return n.replace(/\s+/g, ' ').trim();
  }

  document.getElementById('run').addEventListener('click', function () {
    var out = '', fails = 0, total = 0;
    var mode = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    var live = getComputedStyle(app);
    var drift = Object.keys(PAL[mode]).filter(function (k) { return live.getPropertyValue('--k-' + k).trim().toLowerCase() !== PAL[mode][k]; });

    ['light', 'dark'].forEach(function (m) {
      var items = '';
      TEXT.forEach(function (p) {
        var r = ratio(PAL[m][p[1]], PAL[m][p[2]]), need = p[3] ? 3 : 4.5, ok = r >= need; total++; if (!ok) fails++;
        items += row(ok, sw(PAL[m][p[1]]) + sw(PAL[m][p[2]]) + ' ' + p[0] + ': ' + r.toFixed(2) + ':1 (needs ' + need + ':1)');
      });
      UI.forEach(function (p) {
        var r = ratio(PAL[m][p[1]], PAL[m][p[2]]), ok = r >= 3; total++; if (!ok) fails++;
        items += row(ok, sw(PAL[m][p[1]]) + sw(PAL[m][p[2]]) + ' ' + p[0] + ': ' + r.toFixed(2) + ':1 (needs 3:1)');
      });
      out += '<h3>Contrast, ' + m + ' mode' + (m === mode ? ' (what you see now)' : '') + '</h3><ul class="res">' + items + '</ul>';
    });

    // Visit every screen with a booking in place, then restore.
    var keep = JSON.stringify(s);
    var labels = '', targets = '', small = 0, measured = 0, colourOnly = 0;
    var tour = [['home', 'Start'], ['safety', 'Safety question'], ['untrained', 'Not yet'], ['slots', 'Slots'], ['material', 'Material'], ['confirm', 'Check and book'], ['cancel', 'Cancel']];
    s.booking = { day: 'Thursday', time: '3:30', material: 'ply' }; s.slot = 'Friday 4:00'; s.material = 'ply';
    tour.forEach(function (t) {
      s.screen = t[0] === 'cancel' ? 'home' : t[0]; s.confirmCancel = t[0] === 'cancel';
      render(false);
      app.querySelectorAll('input').forEach(function (el) {
        var ok = el.labels && el.labels.length && el.labels[0].textContent.trim(); total++; if (!ok) fails++;
        labels += row(!!ok, t[1] + ': input "' + esc(ok ? el.labels[0].textContent.trim() : el.name) + '" ' + (ok ? 'has a label' : 'has no label'));
      });
      app.querySelectorAll('button').forEach(function (el) {
        var n = nameOf(el), ok = /[A-Za-z]/.test(n); total++; if (!ok) fails++;
        labels += row(ok, t[1] + ': ' + (ok ? 'button "' + esc(n) + '" has a name' : 'a button has no name'));
      });
      app.querySelectorAll('button, label.choice').forEach(function (el) {
        var r = el.getBoundingClientRect(); if (!r.width) return; measured++;
        if (r.width < 24 || r.height < 24) { small++; targets += row(false, t[1] + ': "' + esc(nameOf(el)) + '" is ' + Math.round(r.width) + ' by ' + Math.round(r.height) + ' px'); }
      });
      app.querySelectorAll('.slot').forEach(function (el) { if (!/Free|Taken/.test(el.textContent)) colourOnly++; });
    });
    s = JSON.parse(keep); render(false);

    out += '<h3>Labels and names, every screen</h3><ul class="res">' + labels + '</ul>';
    total++; if (small) fails++;
    out += '<h3>Tap size, every screen</h3><ul class="res">' + row(!small, measured + ' targets measured. ' + (small ? small + ' are under 24 by 24 px.' : 'All are at least 24 by 24 px.')) + targets + '</ul>';
    total++; if (colourOnly) fails++;
    out += '<h3>Colour alone</h3><ul class="res">' + row(!colourOnly, colourOnly ? colourOnly + ' slots show their state by colour only.' : 'Every slot says "Free" or "Taken" in words.') + '</ul>';

    var head = '<p class="summary">' + (fails ? fails + ' of ' + total + ' checks fail.' : 'All ' + total + ' checks pass.') + '</p>';
    if (drift.length) head += '<p class="fail">The colours in this script differ from proto.css for: ' + drift.join(', ') + '</p>';
    document.getElementById('report').innerHTML = head + out;
  });
})();
