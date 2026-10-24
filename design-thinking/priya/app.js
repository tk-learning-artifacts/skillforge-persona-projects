// The Two-Minute Handover prototype. Version 1 is the nine-field paper form;
// version 2 is the three-tap flow. Both are timed from the first tap, and both
// end with what the cover trainer would read. Handovers are kept only in this
// browser's localStorage.
(function () {
  'use strict';
  var STEPS = [
    'Recap: what can the micro:bit sense?',
    'Make a variable called steps',
    'On shake, change steps by 1',
    'On button A, show steps',
    'On button B, set steps to 0',
    'Download, then walk 20 steps',
    'Compare counts with a partner',
    'Extension: show a tick at 100 steps'
  ];
  var TRIPS = [
    { key: 'flat', label: 'Flat batteries', count: true, advice: 'Bring spare AAA batteries.' },
    { key: 'missing', label: 'micro:bits missing', count: true, advice: 'Count the kit before you start.' },
    { key: 'logins', label: 'Slow Chromebook logins', advice: 'Start with an unplugged warm-up while they log in.' },
    { key: 'cables', label: 'USB cables missing', advice: 'Bring your own USB cables.' },
    { key: 'room', label: 'Room changed', advice: 'Check the room with the school office first.' }
  ];
  var LESSON = 'P5 Coding Club · Week 4: Step counter';
  var KEY = 'priya-handovers';

  var $ = function (id) { return document.getElementById(id); };
  var screen = $('screen');
  var version = 2;
  var s;
  var started = 0, stopped = 0, timer = null;

  function reset() {
    s = { page: 0, step: -1, behind: 0, trips: {}, counts: { flat: 0, missing: 0 }, note: '' };
    started = 0; stopped = 0;
    clearInterval(timer);
    $('clock').textContent = '0:00';
    $('clock').classList.remove('over');
    say('The clock starts at your first tap.');
  }
  function say(t) { $('live').textContent = t; }
  function fmt(ms) {
    var sec = Math.floor(ms / 1000);
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function tick() {
    var ms = (stopped || Date.now()) - started;
    $('clock').textContent = fmt(ms);
    $('clock').classList.toggle('over', ms > 120000);
    var mini = $('phone-clock');
    if (mini) mini.textContent = fmt(ms);
  }
  function startClock() {
    if (started) return;
    started = Date.now();
    timer = setInterval(tick, 250);
    say('Clock running. Pack-up takes about two minutes.');
  }
  function stopClock() {
    stopped = Date.now();
    clearInterval(timer);
    tick();
    return stopped - started;
  }
  function el(tag, attrs, text) {
    var e = document.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (text != null) e.textContent = text;
    return e;
  }
  function top() {
    var bar = el('div', { class: 'bar-top' });
    bar.appendChild(el('span', null, version === 2 ? 'Handover · v2' : 'Handover · v1 (paper)'));
    var dots = el('span', { class: 'dots', 'aria-hidden': 'true' });
    if (version === 2) for (var i = 0; i < 3; i++) dots.appendChild(el('i', { class: i <= s.page ? 'on' : '' }));
    bar.appendChild(dots);
    bar.appendChild(el('span', { id: 'phone-clock', 'aria-hidden': 'true' }, fmt(started ? (stopped || Date.now()) - started : 0)));
    return bar;
  }

  // Version 2
  function renderV2() {
    screen.textContent = '';
    screen.appendChild(top());
    if (s.page === 0) {
      screen.appendChild(el('h3', null, 'Where did most of the class stop?'));
      screen.appendChild(el('p', { class: 'q' }, LESSON + '. Tap the last step most pupils finished.'));
      var list = el('div', { class: 'choices', role: 'group', 'aria-label': 'Lesson steps' });
      STEPS.forEach(function (name, i) {
        list.appendChild(el('button', { type: 'button', 'aria-pressed': String(s.step === i), onclick: function () {
          startClock(); s.step = i; renderV2();
        } }, (i + 1) + '. ' + name));
      });
      screen.appendChild(list);
      nav(null, s.step < 0);
    } else if (s.page === 1) {
      screen.appendChild(el('h3', null, 'How many pupils did not finish step ' + (s.step + 1) + '?'));
      screen.appendChild(el('p', { class: 'q' }, 'A number only. No names: the cover trainer will ask the class.'));
      var st = el('div', { class: 'stepper' });
      st.appendChild(el('button', { type: 'button', 'aria-label': 'One fewer', onclick: function () { startClock(); s.behind = Math.max(0, s.behind - 1); renderV2(); } }, '−'));
      st.appendChild(el('output', { 'aria-live': 'polite' }, String(s.behind)));
      st.appendChild(el('button', { type: 'button', 'aria-label': 'One more', onclick: function () { startClock(); s.behind = Math.min(30, s.behind + 1); renderV2(); } }, '+'));
      screen.appendChild(st);
      screen.appendChild(el('p', { class: 'q' }, s.behind === 0 ? 'Everyone finished.' : s.behind + ' pupil' + (s.behind > 1 ? 's' : '') + ' will need a catch-up.'));
      screen.appendChild(el('div', { class: 'grow' }));
      nav(true, false);
    } else if (s.page === 2) {
      screen.appendChild(el('h3', null, 'What will trip up the next trainer?'));
      screen.appendChild(el('p', { class: 'q' }, 'Tap all that apply. Leave it empty if nothing will.'));
      var chips = el('div', { class: 'chips' });
      TRIPS.forEach(function (t) {
        chips.appendChild(el('button', { type: 'button', 'aria-pressed': String(!!s.trips[t.key]), onclick: function () {
          startClock(); s.trips[t.key] = !s.trips[t.key]; renderV2();
        } }, t.label));
      });
      screen.appendChild(chips);
      TRIPS.forEach(function (t) {
        if (!t.count || !s.trips[t.key]) return;
        var row = el('div', { class: 'stepper' });
        row.appendChild(el('button', { type: 'button', 'aria-label': 'One fewer', onclick: function () { s.counts[t.key] = Math.max(0, s.counts[t.key] - 1); renderV2(); } }, '−'));
        row.appendChild(el('output', null, String(s.counts[t.key])));
        row.appendChild(el('button', { type: 'button', 'aria-label': 'One more', onclick: function () { s.counts[t.key] = Math.min(40, s.counts[t.key] + 1); renderV2(); } }, '+'));
        row.appendChild(el('span', null, t.label.toLowerCase()));
        screen.appendChild(row);
      });
      screen.appendChild(el('label', { for: 'note2' }, 'One line, if you need it'));
      var note = el('input', { id: 'note2', maxlength: '80', placeholder: 'No pupil names', value: s.note });
      note.addEventListener('input', function () { startClock(); s.note = note.value; });
      screen.appendChild(note);
      screen.appendChild(el('div', { class: 'grow' }));
      nav(true, false, 'Hand over');
    } else {
      showCard(cardV2());
    }
  }
  function nav(back, nextDisabled, nextLabel) {
    var n = el('div', { class: 'nav' });
    if (back) n.appendChild(el('button', { type: 'button', onclick: function () { s.page--; renderV2(); } }, 'Back'));
    var next = el('button', { type: 'button', class: 'primary', onclick: function () {
      startClock(); s.page++;
      if (s.page === 3) finish(2);
      renderV2();
    } }, nextLabel || 'Next');
    if (nextDisabled) next.disabled = true;
    n.appendChild(next);
    screen.appendChild(n);
  }
  function cardV2() {
    var c = el('div', { class: 'handcard' });
    c.appendChild(el('p', { class: 'small', style: 'margin:0' }, 'Cover card · ' + LESSON));
    var start = s.step + 1 < STEPS.length ? 'Start at step ' + (s.step + 2) + ': ' + STEPS[s.step + 1] : 'They finished every step. Start Week 5.';
    c.appendChild(el('p', { class: 'start' }, start));
    var ul = el('ul');
    ul.appendChild(el('li', null, s.behind ? s.behind + ' pupil' + (s.behind > 1 ? 's' : '') + ' did not finish step ' + (s.step + 1) + '. Plan a catch-up table.' : 'Everyone finished step ' + (s.step + 1) + '.'));
    TRIPS.forEach(function (t) {
      if (!s.trips[t.key]) return;
      var n = t.count && s.counts[t.key] ? s.counts[t.key] + ' × ' : '';
      ul.appendChild(el('li', null, n + (n ? t.label.toLowerCase() : t.label) + '. ' + t.advice));
    });
    if (s.note.trim()) ul.appendChild(el('li', null, 'Note: ' + s.note.trim()));
    c.appendChild(ul);
    return c;
  }

  // Version 1: the paper form, nine fields.
  var V1 = ['Class', 'Date', 'Lesson', 'Where did you stop?', 'Who was absent?', 'Who is behind?', 'Kit problems', 'Behaviour notes', 'Plan for next lesson'];
  var v1vals = {};
  function renderV1() {
    screen.textContent = '';
    screen.appendChild(top());
    screen.appendChild(el('h3', { class: 'paper' }, 'Lesson handover'));
    var form = el('div', { class: 'v1form paper', style: 'overflow-y:auto;max-height:430px;padding-right:4px' });
    V1.forEach(function (f, i) {
      var id = 'v1f' + i;
      form.appendChild(el('label', { for: id }, (i + 1) + '. ' + f));
      var long = i >= 3;
      var input = el(long ? 'textarea' : 'input', { id: id });
      if (i === 5) input.setAttribute('placeholder', 'In the test, trainers wrote names here. Please don\'t.');
      input.value = v1vals[f] || '';
      input.addEventListener('input', function () { startClock(); v1vals[f] = input.value; });
      input.addEventListener('focus', startClock);
      form.appendChild(input);
    });
    screen.appendChild(form);
    var n = el('div', { class: 'nav' });
    n.appendChild(el('button', { type: 'button', class: 'primary', onclick: function () {
      startClock(); finish(1); renderV1Done();
    } }, 'Hand over'));
    screen.appendChild(n);
  }
  function renderV1Done() {
    var c = el('div', { class: 'handcard', style: 'border-color: var(--plum); background: var(--plum-soft)' });
    c.appendChild(el('p', { class: 'small', style: 'margin:0' }, 'What the cover trainer gets: all nine fields, in order.'));
    var filled = 0;
    V1.forEach(function (f) {
      var v = (v1vals[f] || '').trim();
      if (v) filled++;
      var row = el('p', { style: 'margin:4px 0;font-size:0.9rem' });
      row.appendChild(el('strong', null, f));
      row.appendChild(document.createTextNode(' ' + (v || '(blank)')));
      c.appendChild(row);
    });
    c.appendChild(el('p', { style: 'margin:6px 0 0;font-weight:700' }, filled + ' of 9 fields filled. Where does the cover trainer start?'));
    showCard(c);
  }

  function showCard(card) {
    screen.textContent = '';
    screen.appendChild(top());
    screen.appendChild(el('h3', null, 'Handed over in ' + fmt(stopped - started)));
    screen.appendChild(card);
    screen.appendChild(el('div', { class: 'grow' }));
    var n = el('div', { class: 'nav' });
    n.appendChild(el('button', { type: 'button', onclick: function () { v1vals = {}; reset(); render(); } }, 'Start again'));
    screen.appendChild(n);
  }

  function finish(v) {
    var ms = stopClock();
    var under = ms <= 120000;
    say((under ? 'Done in ' + fmt(ms) + ', inside pack-up.' : 'Done in ' + fmt(ms) + '. Pack-up was over at 2:00.') +
      (v === 2 ? '' : ' Now try version 2.'));
    var summary = v === 2
      ? (s.step + 1 < STEPS.length ? 'Start at step ' + (s.step + 2) : 'Start Week 5') + ', ' + s.behind + ' to catch up'
      : 'Nine-field form, ' + V1.filter(function (f) { return (v1vals[f] || '').trim(); }).length + ' filled';
    var list = load();
    list.unshift({ v: v, t: fmt(ms), summary: summary });
    store(list.slice(0, 6));
    renderSaved();
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function store(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: the list just won't persist */ } }
  function renderSaved() {
    var ul = $('saved');
    ul.textContent = '';
    var list = load();
    if (!list.length) ul.appendChild(el('li', null, 'None yet.'));
    list.forEach(function (h) { ul.appendChild(el('li', null, 'Version ' + h.v + ' · ' + h.t + ' · ' + h.summary)); });
  }

  function render() { if (version === 2) renderV2(); else renderV1(); }
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      version = Number(b.dataset.v);
      document.querySelectorAll('.tabs button').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      v1vals = {};
      reset(); render();
    });
  });
  $('clear').addEventListener('click', function () { store([]); renderSaved(); });
  reset(); render(); renderSaved();
})();
